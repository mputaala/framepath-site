#!/usr/bin/env node
// US-162 Sprint 29 Prompt 9 — sitemap.xml generator.
//
// Lists every static route on framepath.fi that should be discoverable
// via search engines. Static routes are hardcoded; the per-feature routes
// are derived at build time by reading the synced content/features/*.mdx
// files that scripts/sync-content.mjs writes (US-159). The thank-you
// page is excluded — it carries `noindex,follow` and shouldn't appear in
// the sitemap either.
//
// `lastmod` for static routes uses the build timestamp; per-feature
// routes use the source MDX file's mtime so a feature edit on the dev
// repo bumps that feature's lastmod independently. Search engines treat
// lastmod as a hint for re-crawl frequency.
//
// Invocation:
//   node scripts/generate-sitemap.mjs
// Writes:
//   public/sitemap.xml

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);
const SITE_REPO_ROOT = resolve(THIS_FILE, "..", "..");
const FEATURES_DIR = join(SITE_REPO_ROOT, "content", "features");
const OUTPUT_PATH = join(SITE_REPO_ROOT, "public", "sitemap.xml");

const SITE_ORIGIN = "https://framepath.fi";

/** Static routes always present in the sitemap. Ordered by priority
 *  hint (1.0 → 0.5). */
const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/features/", priority: 0.8, changefreq: "weekly" },
  { path: "/support/", priority: 0.5, changefreq: "yearly" },
  { path: "/privacy/", priority: 0.5, changefreq: "yearly" },
];

/** Format a Date as ISO-8601 with no millisecond precision, matching
 *  the sitemap.org W3C-datetime sub-format the spec recommends. */
const isoDate = (d) => d.toISOString().split(".")[0] + "Z";

const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const collectFeatureRoutes = async () => {
  let fileNames = [];
  try {
    fileNames = await readdir(FEATURES_DIR);
  } catch {
    return [];
  }
  const entries = [];
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".mdx")) continue;
    const filePath = join(FEATURES_DIR, fileName);
    let lastmod;
    try {
      const st = await stat(filePath);
      lastmod = st.mtime;
    } catch {
      lastmod = new Date();
    }
    // Defence in depth: re-check the file's published frontmatter (the
    // sync handler already filters, but a corrupt content/features/
    // directory shouldn't leak unpublished pages into the sitemap).
    let isPublished = false;
    let slug = fileName.replace(/\.mdx$/, "");
    try {
      const raw = await readFile(filePath, "utf8");
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const fm = fmMatch[1];
        isPublished = /\bpublished:\s*true\b/.test(fm);
        const slugMatch = fm.match(/^slug:\s*"([^"]+)"/m);
        if (slugMatch) slug = slugMatch[1];
      }
    } catch {
      continue;
    }
    if (!isPublished) continue;
    entries.push({
      path: `/features/${slug}/`,
      priority: 0.7,
      changefreq: "monthly",
      lastmod,
    });
  }
  // Stable order: alphabetical by path so the sitemap is reviewable.
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
};

const buildSitemap = (routes) => {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const route of routes) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(SITE_ORIGIN + route.path)}</loc>`);
    if (route.lastmod) {
      lines.push(`    <lastmod>${isoDate(route.lastmod)}</lastmod>`);
    }
    if (route.changefreq) {
      lines.push(`    <changefreq>${route.changefreq}</changefreq>`);
    }
    if (route.priority !== undefined) {
      lines.push(`    <priority>${route.priority.toFixed(1)}</priority>`);
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n") + "\n";
};

const main = async () => {
  const now = new Date();
  const featureRoutes = await collectFeatureRoutes();
  const allRoutes = [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: now })),
    ...featureRoutes,
  ];
  const xml = buildSitemap(allRoutes);
  await writeFile(OUTPUT_PATH, xml, "utf8");
  console.log(
    `generate-sitemap (US-162): wrote ${allRoutes.length} routes -> ${OUTPUT_PATH}`,
  );
};

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === THIS_FILE;
if (invokedAsScript) {
  main().catch((err) => {
    console.error(err.stack ?? err.message ?? err);
    process.exit(1);
  });
}
