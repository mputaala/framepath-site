#!/usr/bin/env node
// US-155 + US-156 — sync-content.
//
// Reads config/sync-allowlist.json, resolves each entry's 'source' against the
// dev-repo checkout root, and applies the entry's `kind`-specific transform
// to copy / rewrite content into the site repo's build tree.
//
// Implemented transforms:
//   - markdown-directory  (US-156, Policies):
//       For every *.md file under the source directory:
//         1. Parse YAML frontmatter via gray-matter; if absent, synthesise
//            { title, effectiveDate } from the first H1 and the first line
//            matching `**Effective date:** ...`.
//         2. Strip lines beginning with `<!-- internal:` from the body.
//         3. Neutralise markdown links whose host is on the deny-list
//            (`*.cloudfunctions.net`, `console.firebase.google.com`,
//            `mputaala.github.io/Frame`) by replacing `[text](url)` with the
//            plain anchor text.
//         4. Compute a slug from the H1: kebab-case, dropping a trailing
//            ` Policy` suffix so `Privacy Policy` → `privacy` and
//            `Cookie Policy` → `cookie`.
//         5. Write to <destination>/<slug>.mdx with a regenerated frontmatter
//            block carrying { title, effectiveDate, slug, sourceFile }.
//       Fails the build with a non-zero exit if any allowlisted source is
//       missing / unreadable / empty, if two policies would produce the same
//       slug, or if the body is missing an H1 to derive the title.
//   - image-directory      (US-158, deferred): logged as PENDING.
//   - markdown-directory-with-frontmatter-gate (US-159, deferred): PENDING.
//   - markdown-file        (US-160, deferred): logged as PENDING.
//
// Usage:
//   node scripts/sync-content.mjs --dev-repo <path-to-dev-repo-checkout>
//
// Exit codes:
//   0 — every allowlist entry handled cleanly.
//   1 — a guard failed (path traversal, missing source, slug collision,
//       missing H1, empty file, write failure).
//   2 — CLI usage error or allowlist file unreadable.

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";

const THIS_FILE = fileURLToPath(import.meta.url);
const SITE_REPO_ROOT = resolve(THIS_FILE, "..", "..");
const ALLOWLIST_PATH = resolve(SITE_REPO_ROOT, "config", "sync-allowlist.json");

/* ─── path-traversal guard (US-155) ─────────────────────────────────────── */

export const resolveSourcePath = (devRepoRoot, source) => {
  if (typeof source !== "string" || source.length === 0) {
    throw new Error("allowlist 'source' must be a non-empty string");
  }
  if (source.includes("..")) {
    throw new Error(`allowlist 'source' contains '..' (rejected): ${source}`);
  }
  const absoluteRoot = resolve(devRepoRoot);
  const candidate = resolve(absoluteRoot, source);
  if (
    candidate !== absoluteRoot &&
    !candidate.startsWith(absoluteRoot + sep)
  ) {
    throw new Error(
      `allowlist 'source' resolves outside dev-repo root (rejected): ${source} -> ${candidate}`,
    );
  }
  return candidate;
};

/* ─── slug / link / frontmatter helpers (US-156) ────────────────────────── */

/**
 * Convert a policy H1 into a slug. Drops a trailing ` Policy` suffix before
 * kebab-casing so the canonical URLs land at `/privacy`, `/cookie`, etc.
 * (per US-156 Notes "`/privacy` is the canonical URL"). Letters are
 * lowercased; runs of non-alphanumerics collapse to a single dash; leading
 * and trailing dashes are trimmed.
 */
export const slugFromHeading = (heading) => {
  if (typeof heading !== "string" || heading.trim().length === 0) {
    throw new Error("slugFromHeading: heading must be a non-empty string");
  }
  const trimmed = heading.replace(/\s+Policy\s*$/i, "").trim();
  const base = trimmed.length > 0 ? trimmed : heading.trim();
  const slug = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length === 0) {
    throw new Error(`slugFromHeading: '${heading}' produced an empty slug`);
  }
  return slug;
};

/**
 * Markdown link deny-list (US-156 AC + Strategy doc §5.2). Each entry is a
 * predicate over a parsed URL. Defensive — the current Privacy Policy
 * contains none of these hosts. If a future edit accidentally introduces
 * one, the script strips the link and preserves the anchor text.
 */
const DENY_LIST = [
  (url) => /(^|\.)cloudfunctions\.net$/i.test(url.hostname),
  (url) => /^console\.firebase\.google\.com$/i.test(url.hostname),
  (url) =>
    /^mputaala\.github\.io$/i.test(url.hostname) &&
    /^\/Frame(\/|$)/.test(url.pathname),
];

const MARKDOWN_LINK_RE = /\[([^\]]*?)\]\(([^)\s]+?)\)/g;

/**
 * Replace any markdown link whose URL hits the deny-list with the plain
 * anchor text. URLs that don't parse (e.g., relative paths, mailto:,
 * fragment-only) are left alone — only absolute URLs with a hostname are
 * candidates.
 */
export const stripDenyListedLinks = (markdown) => {
  return markdown.replace(MARKDOWN_LINK_RE, (whole, text, urlString) => {
    let url;
    try {
      url = new URL(urlString);
    } catch {
      return whole;
    }
    if (DENY_LIST.some((pred) => pred(url))) {
      return text;
    }
    return whole;
  });
};

/**
 * Remove every line starting with `<!-- internal:` (after optional leading
 * whitespace). Used to scrub maintainer-internal notes the dev repo might
 * carry inline in published policies.
 */
export const stripInternalComments = (markdown) => {
  return markdown
    .split(/\r?\n/)
    .filter((line) => !/^\s*<!--\s*internal:/i.test(line))
    .join("\n");
};

/**
 * Extract the first H1 from a markdown body. Trims leading whitespace, picks
 * the first `^#\s+...` line. Returns null if none found.
 */
const findFirstH1 = (markdown) => {
  const match = markdown.match(/^\s*#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : null;
};

/**
 * Extract the first line matching `**Effective date:** ...`. Returns the
 * value after the colon (trimmed) or null.
 */
const findEffectiveDate = (markdown) => {
  const match = markdown.match(/^\s*\*\*Effective date:\*\*\s*(.+?)\s*$/im);
  return match ? match[1].trim() : null;
};

/**
 * Build a frontmatter block from the metadata. YAML-style with double-quoted
 * string values so colons / em-dashes inside titles or dates don't break the
 * parser when the MDX layer reads it back.
 */
const renderFrontmatter = (meta) => {
  const escape = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    lines.push(`${key}: "${escape(value)}"`);
  }
  lines.push("---", "");
  return lines.join("\n");
};

/* ─── markdown-directory transform (US-156, Policies) ───────────────────── */

const handleMarkdownDirectory = async ({
  entry,
  resolvedSource,
  siteRoot,
  slugRegistry,
}) => {
  let entries;
  try {
    entries = await readdir(resolvedSource, { withFileTypes: true });
  } catch (err) {
    throw new Error(
      `${entry.id ?? entry.source}: source directory unreadable: ${err.message}`,
    );
  }

  const mdFiles = entries
    .filter((d) => d.isFile() && extname(d.name).toLowerCase() === ".md")
    .map((d) => d.name)
    .sort();

  if (mdFiles.length === 0) {
    throw new Error(
      `${entry.id ?? entry.source}: no *.md files in ${resolvedSource}`,
    );
  }

  const destinationRoot = resolve(siteRoot, entry.destination);
  // Clean rebuild so a removed source file doesn't leave a stale .mdx behind.
  await rm(destinationRoot, { recursive: true, force: true });
  await mkdir(destinationRoot, { recursive: true });

  const written = [];
  for (const fileName of mdFiles) {
    const sourcePath = join(resolvedSource, fileName);
    let raw;
    try {
      raw = await readFile(sourcePath, "utf8");
    } catch (err) {
      throw new Error(`${fileName}: read failed: ${err.message}`);
    }
    if (raw.trim().length === 0) {
      throw new Error(`${fileName}: file is empty`);
    }

    const parsed = matter(raw);
    let { title, effectiveDate } = parsed.data ?? {};
    const body = parsed.content;

    if (!title) {
      title = findFirstH1(body);
    }
    if (!title) {
      throw new Error(
        `${fileName}: cannot derive title — no YAML frontmatter and no H1`,
      );
    }
    if (!effectiveDate) {
      effectiveDate = findEffectiveDate(body);
    }

    const slug = slugFromHeading(title);
    if (slugRegistry.has(slug)) {
      const other = slugRegistry.get(slug);
      throw new Error(
        `slug collision: '${slug}' produced by both ${other} and ${fileName}`,
      );
    }
    slugRegistry.set(slug, fileName);

    const cleanedBody = stripDenyListedLinks(stripInternalComments(body));

    const meta = {
      title,
      effectiveDate,
      slug,
      sourceFile: fileName,
    };
    const out = renderFrontmatter(meta) + cleanedBody.replace(/^\s+/, "");
    const destPath = join(destinationRoot, `${slug}.mdx`);
    await writeFile(destPath, out, "utf8");
    written.push({ slug, sourceFile: fileName, destination: destPath });
  }
  return written;
};

/* ─── entry dispatcher ──────────────────────────────────────────────────── */

const KIND_HANDLERS = {
  "markdown-directory": handleMarkdownDirectory,
};

const PENDING_KINDS = new Set([
  "image-directory", // US-158
  "markdown-directory-with-frontmatter-gate", // US-159
  "markdown-file", // US-160
]);

/* ─── main CLI ──────────────────────────────────────────────────────────── */

const parseArgs = (argv) => {
  const i = argv.indexOf("--dev-repo");
  if (i < 0 || !argv[i + 1]) {
    throw new Error("usage: sync-content.mjs --dev-repo <path>");
  }
  return { devRepoRoot: resolve(argv[i + 1]) };
};

const main = async (argv) => {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  let allowlist;
  try {
    const raw = await readFile(ALLOWLIST_PATH, "utf8");
    allowlist = JSON.parse(raw);
  } catch (err) {
    console.error(`failed to load ${ALLOWLIST_PATH}: ${err.message}`);
    process.exit(2);
  }

  const sources = Array.isArray(allowlist.sources) ? allowlist.sources : [];
  if (sources.length === 0) {
    console.error("allowlist must have a non-empty 'sources' array");
    process.exit(2);
  }

  console.log(`sync-content (US-155 + US-156).`);
  console.log(`  dev-repo root: ${opts.devRepoRoot}`);
  console.log(`  allowlist:     ${ALLOWLIST_PATH}`);
  console.log(`  sources:       ${sources.length}`);
  console.log("");

  const slugRegistry = new Map();
  let hadFailure = false;

  for (const entry of sources) {
    const label = entry.id ?? entry.source ?? "(unlabelled)";
    let resolvedSource;
    try {
      resolvedSource = resolveSourcePath(opts.devRepoRoot, entry.source);
    } catch (err) {
      console.error(`  REJECT ${label}: ${err.message}`);
      hadFailure = true;
      continue;
    }

    const handler = KIND_HANDLERS[entry.kind];
    if (handler) {
      try {
        const written = await handler({
          entry,
          resolvedSource,
          siteRoot: SITE_REPO_ROOT,
          slugRegistry,
        });
        for (const w of written) {
          console.log(
            `  WROTE  ${label}: ${w.sourceFile} -> ${w.destination} (slug: ${w.slug})`,
          );
        }
      } catch (err) {
        console.error(`  FAIL   ${label}: ${err.message}`);
        hadFailure = true;
      }
    } else if (PENDING_KINDS.has(entry.kind)) {
      console.log(
        `  PEND   ${label}: kind '${entry.kind}' not yet implemented (lands in a later story)`,
      );
    } else {
      console.error(`  FAIL   ${label}: unknown kind '${entry.kind}'`);
      hadFailure = true;
    }
  }

  if (hadFailure) {
    process.exit(1);
  }
  console.log("");
  console.log("sync-content complete.");
};

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === THIS_FILE;
if (invokedAsScript) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err.stack ?? err.message ?? err);
    process.exit(1);
  });
}
