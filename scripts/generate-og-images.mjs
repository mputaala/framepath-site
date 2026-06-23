#!/usr/bin/env node
// US-162 Sprint 29 Prompt 9 — 1200×630 Open Graph card generator.
//
// Reads `public/screenshots/hero-mac.png` (produced by the US-158
// Sharp pipeline) and renders a 1200×630 social-share card by:
//   1. Centring the hero screenshot inside a graphite-toned canvas.
//   2. Overlaying the FramePath wordmark + tagline as SVG text.
//
// Output: `public/og/og-default.png` — referenced as the default OG
// image from every public route's <head>. A future PR can extend this
// script with per-route variants (per-feature card, contact card, etc.)
// without changing the SEO component contract.
//
// Invocation:
//   node scripts/generate-og-images.mjs
//
// Why Sharp not Puppeteer / svg-to-png CLI: Sharp is already a build
// dependency from US-158; a server-side SVG composite + PNG encode is
// fast (<100 ms per card on CI) and produces a deterministic 1200×630
// PNG without spinning up a headless browser.

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const THIS_FILE = fileURLToPath(import.meta.url);
const SITE_REPO_ROOT = resolve(THIS_FILE, "..", "..");
const HERO_SOURCE = join(
  SITE_REPO_ROOT,
  "public",
  "screenshots",
  "hero-mac.png",
);
const OG_OUTPUT_DIR = join(SITE_REPO_ROOT, "public", "og");
const OG_DEFAULT_OUTPUT = join(OG_OUTPUT_DIR, "og-default.png");

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Graphite-tone background as a Sharp `create` input. Matches the
 *  Tailwind graphite-950 colour used elsewhere in the site so the OG
 *  card visually continues the framepath.fi palette. */
const BACKGROUND = {
  create: {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    channels: 3,
    background: { r: 17, g: 17, b: 19 }, // graphite-950 ≈ #111113
  },
};

/** Inline SVG text overlay for the wordmark + tagline. SVG sits as the
 *  top layer; Sharp composites with `gravity: "northwest"` + an offset
 *  so the text aligns with the screenshot below.
 *
 *  Font stack picks a system sans (San Francisco / Segoe UI / Roboto)
 *  so we don't ship a webfont with the build. Sharp's librsvg renderer
 *  uses fontconfig — system fonts work in CI's Ubuntu base image. */
const wordmarkSvg = () => {
  const w = OG_WIDTH;
  const h = OG_HEIGHT;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <style>
    .wordmark { fill: #f5f5f6; font-family: "SF Pro Display","Inter","Segoe UI","Roboto","Helvetica","Arial",sans-serif; font-weight: 700; }
    .dot { fill: #f59e0b; }
    .tagline { fill: #d4d4d8; font-family: "SF Pro Display","Inter","Segoe UI","Roboto","Helvetica","Arial",sans-serif; font-weight: 600; }
    .domain { fill: #71717a; font-family: "SF Mono","Menlo","Consolas","monospace"; font-weight: 500; }
  </style>
  <text x="64" y="120" class="wordmark" font-size="84">FramePath<tspan class="dot">.</tspan></text>
  <text x="64" y="190" class="tagline" font-size="40">Plan the shoot. Direct your story.</text>
  <text x="64" y="${h - 48}" class="domain" font-size="28">framepath.fi</text>
</svg>`;
};

/** Composite the wordmark + a downscaled hero screenshot onto the
 *  graphite background. Hero is downscaled to ~520px wide, padded with
 *  a subtle border, and anchored to the right side of the card. */
const buildDefaultOgCard = async () => {
  let heroBuffer;
  try {
    heroBuffer = await sharp(HERO_SOURCE)
      .resize({ width: 520, withoutEnlargement: true })
      .toBuffer();
  } catch (err) {
    throw new Error(
      `generate-og-images: hero source unreadable at ${HERO_SOURCE}: ${err.message}`,
    );
  }
  const heroMeta = await sharp(heroBuffer).metadata();
  const heroWidth = heroMeta.width ?? 520;
  const heroHeight = heroMeta.height ?? 325;

  const composited = await sharp(BACKGROUND)
    .composite([
      // Hero screenshot — right-anchored, vertically centred.
      {
        input: heroBuffer,
        left: OG_WIDTH - heroWidth - 64,
        top: Math.round((OG_HEIGHT - heroHeight) / 2),
      },
      // SVG text overlay (full-canvas).
      {
        input: Buffer.from(wordmarkSvg()),
        left: 0,
        top: 0,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return composited;
};

const main = async () => {
  await mkdir(OG_OUTPUT_DIR, { recursive: true });
  try {
    await access(HERO_SOURCE);
  } catch {
    console.log(
      `generate-og-images (US-162): hero screenshot not yet synced at ${HERO_SOURCE}; skipping. (Run scripts/sync-content.mjs first.)`,
    );
    return;
  }
  const defaultCard = await buildDefaultOgCard();
  await writeFile(OG_DEFAULT_OUTPUT, defaultCard);
  console.log(
    `generate-og-images (US-162): wrote og-default.png (${defaultCard.length} bytes) -> ${OG_DEFAULT_OUTPUT}`,
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
