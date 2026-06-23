#!/usr/bin/env node
// US-155 + US-156 + US-158 — sync-content.
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
//   - image-allowlist     (US-158, Screenshots):
//       Reads config/screenshot-allowlist.json. For each entry:
//         1. Validates the entry's `source` resolves under the sync-allowlist
//            'screenshots-final' boundary via resolveSourcePath().
//         2. Loads the PNG via Sharp; reads native width / height.
//         3. Produces an AVIF (quality 50 then progressively higher quality
//            steps if room in budget), a WebP (quality 80), a re-encoded PNG
//            (Sharp compression level 9), and a 400w WebP thumbnail.
//         4. Enforces a per-asset 80 KB AVIF budget (configurable via
//            allowlist.avifBudgetBytes); fails the build on regression.
//         5. Writes outputs to <destination>/<id>.{avif,webp,png} +
//            <destination>/<id>.thumb.webp.
//         6. Accumulates an entry into <destination>/manifest.json mapping
//            id -> { avif, webp, png, thumb, width, height, alt, priority }.
//       Fails the build on missing sources, id collisions, AVIF budget
//       regressions, or write failures.
//   - markdown-directory-with-frontmatter-gate (US-159, Features):
//       For every *.md file under the source directory:
//         1. Parse YAML frontmatter via gray-matter.
//         2. STRICT gate — include only if `published === true` (the JS
//            literal Boolean). `published: "true"` (string),
//            `published: 1`, missing frontmatter all → excluded silently
//            (logged as SKIP). The gate is the marketing-review chokepoint
//            from Epic 30: never auto-publish a feature doc by default.
//         3. Slug from the source filename: lowercase + kebab-case
//            (`Story_Editor.md` → `story-editor`).
//         4. Body transforms (applied in order):
//             a. Strip everything between `<!-- marketing-skip -->` and
//                `<!-- /marketing-skip -->` (wraps internal-only sections
//                like User Story link lists or Sprint refs).
//             b. Strip lines beginning with `<!-- internal:`.
//             c. Strip deny-listed markdown links (anchor text retained).
//             d. Normalise CommonMark autolinks for MDX compatibility.
//         5. Frontmatter block: { title, summary, slug, sourceFile,
//            published: true }; title from frontmatter or first H1.
//         6. Write to <destination>/<slug>.mdx; fail on slug collision.
//       Clean-rebuild semantics: the destination is rm-rf'd at handler
//       start so a previously-published feature flipped to
//       published: false (or deleted upstream) disappears on the next
//       sync, not just for the current sync's writes.
//   - markdown-file        (US-160, Apple Help Book):
//       Reads a single .md source. Applies the standard body transform
//       chain (stripMarketingSkipSections → stripInternalComments →
//       stripDenyListedLinks → normaliseAutolinks → escapeMdxUnsafeAngles).
//       Renders frontmatter from { title (from H1), sourceFile } and
//       writes to <destination>. Also extracts an H2 list to
//       <destination-dir>/toc.json so the Help Book page's sticky TOC
//       component can render without re-parsing MDX at runtime. Slugs use
//       the same kebab-case algorithm as <h2> components on the page so
//       in-page anchors resolve.
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
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import sharp from "sharp";

const THIS_FILE = fileURLToPath(import.meta.url);
const SITE_REPO_ROOT = resolve(THIS_FILE, "..", "..");
const ALLOWLIST_PATH = resolve(SITE_REPO_ROOT, "config", "sync-allowlist.json");
const SCREENSHOT_ALLOWLIST_PATH = resolve(
  SITE_REPO_ROOT,
  "config",
  "screenshot-allowlist.json",
);

/** Default AVIF size budget per asset (US-158 AC); overridable by the
 * screenshot-allowlist's top-level `avifBudgetBytes`. */
export const DEFAULT_AVIF_BUDGET_BYTES = 80 * 1024;
/** Default thumbnail width; overridable by `thumbnailWidth` in the
 * screenshot-allowlist. */
export const DEFAULT_THUMBNAIL_WIDTH = 400;

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
 * Convert CommonMark autolinks (`<https://example.com>`) to explicit
 * markdown links (`[https://example.com](https://example.com)`). MDX
 * interprets `<…>` as the start of a JSX tag and chokes on the `/` inside
 * URLs, so any `<url>` autolink the dev-repo source uses must be expanded
 * before MDX compiles. Also covers `<mailto:…>`. Other `<…>` constructs
 * (HTML comments, `<Component>`, etc.) are left alone because they don't
 * match the protocol prefix.
 */
export const normaliseAutolinks = (markdown) => {
  return markdown.replace(
    /<((?:https?:\/\/|mailto:)[^>\s]+)>/gi,
    (_match, url) => `[${url}](${url})`,
  );
};

/**
 * Strip `<!-- Screenshot: ... -->` HTML-comment placeholders. The
 * dev-repo User Guide chapter docs use this pattern to mark a spot
 * where a real screenshot belongs ("<!-- Screenshot: Three-stage
 * workspace -->"); rendering them as visible HTML comments on the
 * marketing site would leak authoring notes. A future PR adds per-
 * chapter `<Screenshot id="…">` substitution; for now the placeholder
 * is removed and the surrounding italic caption is left to stand
 * alone.
 */
export const stripScreenshotPlaceholders = (markdown) => {
  return markdown
    .split(/\r?\n/)
    .filter((line) => !/^\s*<!--\s*Screenshot:/i.test(line))
    .join("\n");
};

/**
 * Strip every remaining `<!-- ... -->` HTML comment from the
 * markdown body. MDX 3 (under @next/mdx) does NOT support HTML
 * comments — the parser rejects the leading `<!` as the start of an
 * invalid JSX tag with the explicit hint that authors should use
 * MDX-style braces-slash-star comments instead. Marketing-skip /
 * internal / Screenshot markers are stripped by their dedicated
 * transforms upstream of this one; any HTML comment that survives to
 * this step is authoring commentary the public site shouldn't render
 * anyway. Multi-line non-greedy.
 */
export const stripAllHtmlComments = (markdown) => {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
};

/**
 * Escape `{` and `}` in prose so MDX doesn't try to parse them as JSX
 * expressions. The dev-repo User Guide chapter docs use brace
 * placeholders in italics — `*{Project Name}.fountain*`, `*{Name}*` —
 * which acorn rejects as invalid JS. Fenced code blocks are
 * deliberately exempted (inside a code block, `\{` would render as a
 * visible backslash).
 *
 * Implementation walks the markdown line by line, toggling a
 * `inFencedCode` flag on lines that start (or end) with the
 * triple-backtick fence. Outside fenced blocks, every `{` becomes
 * `\{` and every `}` becomes `\}`. Inside fenced blocks the line is
 * passed through verbatim.
 */
export const escapeMdxBraces = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  let inFencedCode = false;
  const out = [];
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFencedCode = !inFencedCode;
      out.push(line);
      continue;
    }
    if (inFencedCode) {
      out.push(line);
      continue;
    }
    out.push(line.replace(/[{}]/g, (c) => `\\${c}`));
  }
  return out.join("\n");
};

/**
 * Increase every heading level by one — `# X` → `## X`, `## X` →
 * `### X`, etc. Used by handleMarkdownDirectoryCollated so each
 * chapter file's H1 becomes a chapter-H2 in the collated output,
 * preserving a single top-level document hierarchy.
 *
 * H6 stays H6 (no H7 in HTML). H7+ shouldn't appear in the source.
 */
export const shiftHeadingsByOne = (markdown) => {
  return markdown.replace(/^(#{1,5})(\s+)/gm, "$1#$2");
};

/**
 * Escape `<` characters that MDX would otherwise try to parse as the start
 * of a JSX tag but cannot — e.g. `<1 s` (a number after `<`), `<24h` etc.
 * A valid JSX tag name starts with a letter, `$`, or `_`; HTML comments
 * start with `<!`; closing tags start with `</`. Anything else after `<`
 * is a prose `<` that needs escaping to `&lt;` so MDX compiles.
 *
 * Must run AFTER normaliseAutolinks so the `<url>` autolinks have already
 * been expanded into `[url](url)` markdown links and don't get caught
 * here. Safe to run before / after the other body transforms because they
 * operate on different lexical surfaces.
 */
export const escapeMdxUnsafeAngles = (markdown) => {
  return markdown.replace(/<(?![a-zA-Z_$!/])/g, "&lt;");
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
 * parser when the MDX layer reads it back. Booleans + numbers emit unquoted
 * so gray-matter parses them as their native type — required by US-159
 * which depends on `published: true` round-tripping as the JS literal
 * Boolean (the strict gate in pages/features/[slug].tsx + getStaticProps).
 */
export const renderFrontmatter = (meta) => {
  const escape = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") {
      lines.push(`${key}: ${value ? "true" : "false"}`);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: "${escape(value)}"`);
    }
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

    const cleanedBody = escapeMdxBraces(
      escapeMdxUnsafeAngles(
        normaliseAutolinks(
          stripDenyListedLinks(stripAllHtmlComments(stripInternalComments(body))),
        ),
      ),
    );

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

/* ─── markdown-directory-with-frontmatter-gate (US-159, Features) ───────── */

/**
 * Strip everything between `<!-- marketing-skip -->` and `<!-- /marketing-skip
 * -->` (inclusive of the markers). Used in dev-repo feature docs to wrap
 * internal-only sections — the User Stories link list, dev-tooling notes,
 * Sprint references — so the synced marketing surface omits them. Multi-line,
 * non-greedy.
 */
export const stripMarketingSkipSections = (markdown) => {
  return markdown.replace(
    /<!--\s*marketing-skip\s*-->[\s\S]*?<!--\s*\/marketing-skip\s*-->/g,
    "",
  );
};

/**
 * Convert a feature filename (e.g., `Story_Editor.md`, `01 Write.md`)
 * into a kebab-case slug (`story-editor`, `write`). Used by the
 * published-gate handler. A leading two-digit prefix followed by
 * whitespace (the editorial-order pattern the Documentation/Marketing
 * docs use — `01 Write.md`, `02 Plan.md`, `03 Shoot.md`) is stripped
 * BEFORE kebab-casing so the resulting slug doesn't carry the
 * authoring sequence into the URL.
 */
export const slugFromFilename = (filename) => {
  if (typeof filename !== "string" || filename.trim().length === 0) {
    throw new Error("slugFromFilename: filename must be a non-empty string");
  }
  const base = filename
    .replace(/\.(mdx?|MDX?)$/, "")
    .replace(/^\d{2}\s+/, "");
  const slug = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length === 0) {
    throw new Error(
      `slugFromFilename: '${filename}' produced an empty slug`,
    );
  }
  return slug;
};

/**
 * True only when `value` is literally the JavaScript Boolean `true`. The
 * string "true", the number 1, etc. all return false. This is the
 * frontmatter gate's strictness requirement — accidentally publishing a
 * feature because someone wrote `published: "true"` is a marketing-review
 * bypass.
 */
export const isPublishedTrue = (value) => value === true;

const handleMarkdownDirectoryWithFrontmatterGate = async ({
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
    // Empty source dir is allowed for the features gate — it just means
    // nothing has been promoted to marketing yet. Logged for visibility.
    console.log(
      `  EMPTY  ${entry.id ?? entry.source}: no *.md files in ${resolvedSource}`,
    );
  }

  const destinationRoot = resolve(siteRoot, entry.destination);
  // Clean rebuild so a feature flipped to published: false (or deleted)
  // doesn't leave a stale .mdx behind.
  await rm(destinationRoot, { recursive: true, force: true });
  await mkdir(destinationRoot, { recursive: true });

  const written = [];
  const excluded = [];
  for (const fileName of mdFiles) {
    const sourcePath = join(resolvedSource, fileName);
    let raw;
    try {
      raw = await readFile(sourcePath, "utf8");
    } catch (err) {
      throw new Error(`${fileName}: read failed: ${err.message}`);
    }
    if (raw.trim().length === 0) {
      // Empty file isn't an error here — just skip it.
      excluded.push({ fileName, reason: "empty file" });
      continue;
    }

    const parsed = matter(raw);
    const fm = parsed.data ?? {};

    if (!isPublishedTrue(fm.published)) {
      excluded.push({
        fileName,
        reason: `published gate (value: ${JSON.stringify(fm.published)})`,
      });
      continue;
    }

    const title = fm.title ?? findFirstH1(parsed.content);
    if (!title) {
      throw new Error(
        `${fileName}: published feature missing title — no frontmatter title and no H1 in body`,
      );
    }

    const summary = typeof fm.summary === "string" ? fm.summary.trim() : "";

    const slug = slugFromFilename(fileName);
    if (slugRegistry.has(slug)) {
      const other = slugRegistry.get(slug);
      throw new Error(
        `slug collision: '${slug}' produced by both ${other} and ${fileName}`,
      );
    }
    slugRegistry.set(slug, fileName);

    const cleanedBody = escapeMdxBraces(
      escapeMdxUnsafeAngles(
        normaliseAutolinks(
          stripDenyListedLinks(
            stripAllHtmlComments(
              stripInternalComments(
                stripMarketingSkipSections(parsed.content),
              ),
            ),
          ),
        ),
      ),
    );

    const meta = {
      title,
      summary,
      slug,
      sourceFile: fileName,
      published: true,
    };
    const out = renderFrontmatter(meta) + cleanedBody.replace(/^\s+/, "");
    const destPath = join(destinationRoot, `${slug}.mdx`);
    await writeFile(destPath, out, "utf8");
    written.push({ slug, sourceFile: fileName, destination: destPath });
  }

  for (const x of excluded) {
    console.log(`  SKIP   ${entry.id ?? entry.source}: ${x.fileName} (${x.reason})`);
  }
  return written;
};

/* ─── markdown-file transform (US-160, Help Book) ───────────────────────── */

/**
 * Convert a heading text into a kebab-case slug. Must match the algorithm
 * the page's <h2> component uses so the toc.json slugs and the rendered
 * heading ids align (otherwise the in-page anchor + active-section
 * highlighting break).
 */
export const slugifyHeadingText = (text) => {
  if (typeof text !== "string") {
    throw new Error("slugifyHeadingText: input must be a string");
  }
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
};

/**
 * Extract every H2 heading from a markdown body. Returns an array of
 * `{ title, slug }` ordered by appearance. Slugs are unique by appending
 * a numeric suffix on collision (`adding-visuals`, `adding-visuals-2`, …).
 */
export const extractH2Toc = (markdown) => {
  const items = [];
  const seen = new Map();
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (!match) continue;
    const title = match[1].trim();
    if (title.length === 0) continue;
    const base = slugifyHeadingText(title);
    if (base.length === 0) continue;
    const count = seen.get(base) ?? 0;
    const slug = count === 0 ? base : `${base}-${count + 1}`;
    seen.set(base, count + 1);
    items.push({ title, slug });
  }
  return items;
};

const handleMarkdownFile = async ({
  entry,
  resolvedSource,
  siteRoot,
}) => {
  let raw;
  try {
    raw = await readFile(resolvedSource, "utf8");
  } catch (err) {
    throw new Error(
      `${entry.id ?? entry.source}: source unreadable: ${err.message}`,
    );
  }
  if (raw.trim().length === 0) {
    throw new Error(`${entry.id ?? entry.source}: source file is empty`);
  }

  const parsed = matter(raw);
  const fm = parsed.data ?? {};
  const title = fm.title ?? findFirstH1(parsed.content);
  if (!title) {
    throw new Error(
      `${entry.id ?? entry.source}: cannot derive title — no YAML frontmatter and no H1`,
    );
  }

  const cleanedBody = escapeMdxBraces(
    escapeMdxUnsafeAngles(
      normaliseAutolinks(
        stripDenyListedLinks(
          stripAllHtmlComments(
            stripInternalComments(stripMarketingSkipSections(parsed.content)),
          ),
        ),
      ),
    ),
  );

  const destPath = resolve(siteRoot, entry.destination);
  const destDir = dirname(destPath);
  // Clean rebuild so a deleted upstream source doesn't leave a stale .mdx
  // or toc.json behind.
  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  const meta = {
    title,
    sourceFile: basename(resolvedSource),
  };
  const out = renderFrontmatter(meta) + cleanedBody.replace(/^\s+/, "");
  await writeFile(destPath, out, "utf8");

  const tocItems = extractH2Toc(cleanedBody);
  const tocPath = join(destDir, "toc.json");
  await writeFile(
    tocPath,
    JSON.stringify({ items: tocItems }, null, 2) + "\n",
    "utf8",
  );

  return [
    {
      slug: basename(destPath, ".mdx"),
      sourceFile: basename(resolvedSource),
      destination: `${destPath} (+ ${tocItems.length}-entry toc.json)`,
    },
  ];
};

/* ─── markdown-directory-collated transform (US-160 fix mputaala/Frame#282) */

/**
 * Collate every chapter file in a directory (filename matches
 * `^\d{2}\s+.+\.md$`, e.g. `01 Welcome to FramePath.md`) into a single
 * MDX page, sorted by the leading two-digit prefix. Each chapter's H1
 * is demoted to H2 so the resulting page has one document-level
 * hierarchy (the page itself supplies the visual H1; the chapter
 * titles become anchored H2s the HelpTOC sidebar picks up).
 *
 * This is the production target for the /help route after issue
 * mputaala/Frame#282 surfaced that the previous `markdown-file` source
 * (`Documentation/Guides/Apple Help Book.md`) was an internal authoring
 * guide, not user-facing content.
 *
 * Transforms applied per chapter (in order):
 *   1. stripMarketingSkipSections
 *   2. stripInternalComments
 *   3. stripScreenshotPlaceholders  (drops `<!-- Screenshot: … -->`)
 *   4. stripDenyListedLinks
 *   5. normaliseAutolinks
 *   6. escapeMdxUnsafeAngles
 *   7. shiftHeadingsByOne          (H1 → H2 etc.)
 *
 * Output frontmatter: `{ title: "User Guide", sourceFiles: [...] }`.
 * toc.json is generated from the resulting H2 list — i.e. the chapter
 * titles.
 */
const handleMarkdownDirectoryCollated = async ({
  entry,
  resolvedSource,
  siteRoot,
}) => {
  let entries;
  try {
    entries = await readdir(resolvedSource, { withFileTypes: true });
  } catch (err) {
    throw new Error(
      `${entry.id ?? entry.source}: source directory unreadable: ${err.message}`,
    );
  }

  const chapterFileRe = /^(\d{2})\s+(.+)\.md$/i;
  const chapters = entries
    .filter((d) => d.isFile() && chapterFileRe.test(d.name))
    .map((d) => {
      const match = d.name.match(chapterFileRe);
      return { fileName: d.name, order: parseInt(match[1], 10) };
    })
    .sort((a, b) => a.order - b.order);

  if (chapters.length === 0) {
    throw new Error(
      `${entry.id ?? entry.source}: no chapter-shaped *.md files in ${resolvedSource} (expected filenames like "01 Welcome.md")`,
    );
  }

  const destPath = resolve(siteRoot, entry.destination);
  const destDir = dirname(destPath);
  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  const collatedSections = [];
  const sourceFiles = [];
  for (const { fileName } of chapters) {
    const sourcePath = join(resolvedSource, fileName);
    let raw;
    try {
      raw = await readFile(sourcePath, "utf8");
    } catch (err) {
      throw new Error(`${fileName}: read failed: ${err.message}`);
    }
    if (raw.trim().length === 0) continue;

    const parsed = matter(raw);
    const cleaned = shiftHeadingsByOne(
      escapeMdxBraces(
        escapeMdxUnsafeAngles(
          normaliseAutolinks(
            stripDenyListedLinks(
              stripAllHtmlComments(
                stripScreenshotPlaceholders(
                  stripInternalComments(
                    stripMarketingSkipSections(parsed.content),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    collatedSections.push(cleaned.trim());
    sourceFiles.push(fileName);
  }

  const meta = {
    title: "User Guide",
    sourceFiles: sourceFiles.join(", "),
  };
  const body = collatedSections.join("\n\n");
  const out = renderFrontmatter(meta) + body + "\n";
  await writeFile(destPath, out, "utf8");

  const tocItems = extractH2Toc(body);
  const tocPath = join(destDir, "toc.json");
  await writeFile(
    tocPath,
    JSON.stringify({ items: tocItems }, null, 2) + "\n",
    "utf8",
  );

  return [
    {
      slug: basename(destPath, ".mdx"),
      sourceFile: `${chapters.length} chapter files`,
      destination: `${destPath} (+ ${tocItems.length}-entry toc.json)`,
    },
  ];
};

/* ─── image-allowlist transform (US-158, Screenshots) ───────────────────── */

/**
 * Produce an AVIF buffer that fits under `budgetBytes`. Sharp's AVIF encoder
 * has a per-call `quality` parameter; we try a descending ladder, picking the
 * highest-quality variant that fits the budget. If even the lowest-quality
 * step exceeds the budget, returns null so the caller can fail the build
 * with a clear "this PNG is too dense for the budget — revisit the source"
 * message rather than silently shipping a too-large asset.
 */
export const encodeAvifWithinBudget = async (pngBuffer, budgetBytes) => {
  const qualityLadder = [60, 50, 40, 35, 30, 25, 20];
  let best = null;
  for (const quality of qualityLadder) {
    const candidate = await sharp(pngBuffer)
      .avif({ quality, effort: 4 })
      .toBuffer();
    if (candidate.length <= budgetBytes) {
      // Higher quality first — accept the first that fits.
      best = { buffer: candidate, quality };
      break;
    }
  }
  return best;
};

/**
 * Build the four output variants for one screenshot. Returns
 * `{ avif: Buffer, webp: Buffer, png: Buffer, thumb: Buffer,
 *    width: number, height: number, avifQuality: number }` or throws if
 * the AVIF budget cannot be met.
 */
export const buildImageVariants = async (
  pngBuffer,
  { budgetBytes, thumbnailWidth, id },
) => {
  const meta = await sharp(pngBuffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(
      `${id}: source PNG has no decodable dimensions (width=${meta.width}, height=${meta.height})`,
    );
  }
  const avifResult = await encodeAvifWithinBudget(pngBuffer, budgetBytes);
  if (!avifResult) {
    throw new Error(
      `${id}: AVIF budget regression — even quality=20 exceeds ${budgetBytes} bytes for source ${meta.width}x${meta.height}. Reduce the source dimensions or raise the budget with a deliberate justification recorded in the Sprint Log.`,
    );
  }
  const webp = await sharp(pngBuffer).webp({ quality: 80 }).toBuffer();
  const png = await sharp(pngBuffer)
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  const thumb = await sharp(pngBuffer)
    .resize({ width: thumbnailWidth, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  return {
    avif: avifResult.buffer,
    avifQuality: avifResult.quality,
    webp,
    png,
    thumb,
    width: meta.width,
    height: meta.height,
  };
};

const handleImageAllowlist = async ({
  entry,
  resolvedSource,
  siteRoot,
  devRepoRoot,
  slugRegistry,
}) => {
  let raw;
  try {
    raw = await readFile(SCREENSHOT_ALLOWLIST_PATH, "utf8");
  } catch (err) {
    throw new Error(
      `${entry.id}: screenshot allowlist unreadable at ${SCREENSHOT_ALLOWLIST_PATH}: ${err.message}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${entry.id}: screenshot allowlist JSON parse failed: ${err.message}`);
  }
  const screenshots = Array.isArray(parsed.screenshots) ? parsed.screenshots : [];
  if (screenshots.length === 0) {
    throw new Error(`${entry.id}: screenshot allowlist has no 'screenshots' entries`);
  }
  const budgetBytes =
    typeof parsed.avifBudgetBytes === "number" && parsed.avifBudgetBytes > 0
      ? parsed.avifBudgetBytes
      : DEFAULT_AVIF_BUDGET_BYTES;
  const thumbnailWidth =
    typeof parsed.thumbnailWidth === "number" && parsed.thumbnailWidth > 0
      ? parsed.thumbnailWidth
      : DEFAULT_THUMBNAIL_WIDTH;

  const destinationRoot = resolve(siteRoot, entry.destination);
  await mkdir(destinationRoot, { recursive: true });

  const manifest = {};
  const written = [];
  for (const ss of screenshots) {
    const { id, source, alt } = ss;
    const priority = ss.priority === true;
    if (typeof id !== "string" || id.length === 0) {
      throw new Error(
        `screenshot allowlist entry missing 'id': ${JSON.stringify(ss)}`,
      );
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error(
        `screenshot allowlist 'id' must be kebab-case (a-z, 0-9, -): '${id}'`,
      );
    }
    if (typeof alt !== "string" || alt.trim().length === 0) {
      throw new Error(`${id}: screenshot allowlist entry needs a non-empty 'alt'`);
    }
    if (slugRegistry.has(id)) {
      const other = slugRegistry.get(id);
      throw new Error(
        `id collision: '${id}' produced by both ${other} and ${source}`,
      );
    }
    slugRegistry.set(id, source);

    // Two-stage path resolution: (1) source resolves under devRepoRoot at
    // all (defence against ../etc/passwd-style escapes), (2) source resolves
    // under the sync-allowlist 'screenshots-final' boundary (defence against
    // an allowlist that names a path outside the intended directory range).
    const candidate = resolveSourcePath(devRepoRoot, source);
    if (!candidate.startsWith(resolvedSource + sep) && candidate !== resolvedSource) {
      throw new Error(
        `${id}: source resolves outside the sync-allowlist 'screenshots-final' boundary: ${source} -> ${candidate}`,
      );
    }

    let pngBuffer;
    try {
      pngBuffer = await readFile(candidate);
    } catch (err) {
      throw new Error(`${id}: source PNG read failed at ${candidate}: ${err.message}`);
    }

    let variants;
    try {
      variants = await buildImageVariants(pngBuffer, {
        budgetBytes,
        thumbnailWidth,
        id,
      });
    } catch (err) {
      throw new Error(err.message);
    }

    const avifPath = join(destinationRoot, `${id}.avif`);
    const webpPath = join(destinationRoot, `${id}.webp`);
    const pngPath = join(destinationRoot, `${id}.png`);
    const thumbPath = join(destinationRoot, `${id}.thumb.webp`);
    await writeFile(avifPath, variants.avif);
    await writeFile(webpPath, variants.webp);
    await writeFile(pngPath, variants.png);
    await writeFile(thumbPath, variants.thumb);

    manifest[id] = {
      avif: `/screenshots/${id}.avif`,
      webp: `/screenshots/${id}.webp`,
      png: `/screenshots/${id}.png`,
      thumb: `/screenshots/${id}.thumb.webp`,
      width: variants.width,
      height: variants.height,
      alt,
      priority,
      sourceFile: basename(candidate),
      avifQuality: variants.avifQuality,
      avifBytes: variants.avif.length,
    };
    written.push({
      slug: id,
      sourceFile: basename(candidate),
      destination: `${avifPath} (+webp +png +thumb)`,
    });
  }

  const manifestPath = join(destinationRoot, "manifest.json");
  await writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  return written;
};

/* ─── entry dispatcher ──────────────────────────────────────────────────── */

const KIND_HANDLERS = {
  "markdown-directory": handleMarkdownDirectory,
  "image-allowlist": handleImageAllowlist,
  "markdown-directory-with-frontmatter-gate":
    handleMarkdownDirectoryWithFrontmatterGate,
  "markdown-file": handleMarkdownFile,
  "markdown-directory-collated": handleMarkdownDirectoryCollated,
};

const PENDING_KINDS = new Set([
  // No deferred kinds remaining — all four allowlist sources are live.
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

  console.log(`sync-content (US-155 + US-156 + US-158 + US-159 + US-160).`);
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
          devRepoRoot: opts.devRepoRoot,
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
