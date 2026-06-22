const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Anchor Turbopack/Webpack to this project root so Next.js doesn't pick up
  // a stray lockfile elsewhere in the developer's home directory.
  turbopack: {
    root: __dirname,
  },

  // Static export — required for GitHub Pages.
  // Replaces the dynamic Next.js server runtime with a pre-rendered out/
  // directory that the deploy workflow uploads as the Pages artefact.
  output: "export",

  // GitHub Pages serves static files only — no image optimisation runtime.
  // The image pipeline that lands in US-158 produces AVIF / WebP / PNG
  // triplets at build time via Sharp, not via next/image at request time.
  images: {
    unoptimized: true,
  },

  // Append a trailing slash to every route so each page becomes /path/index.html
  // (e.g. /privacy/ -> /privacy/index.html). GitHub Pages serves these without
  // any rewrite rules; without trailingSlash the build still works but URLs
  // like /privacy without the slash 404 on the default Pages configuration.
  trailingSlash: true,
};

module.exports = nextConfig;
