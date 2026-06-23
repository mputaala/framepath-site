const createMDX = require("@next/mdx");

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // Use @mdx-js/react so the MDXProvider in pages/_app.tsx can inject the
    // component whitelist (Callout / Screenshot / AppStoreBadge) into MDX
    // content authored upstream of this codebase (i.e., synced from the dev
    // repo's Documentation/Policies/*.md by scripts/sync-content.mjs).
    providerImportSource: "@mdx-js/react",
    // Strip YAML frontmatter (`---\nkey: val\n---`) at the top of synced
    // MDX files so it doesn't render as a setext H2 (the second `---`
    // gets parsed as an H2 underline for the preceding `sourceFile: …`
    // line). The frontmatter is still read separately via gray-matter in
    // each page's getStaticProps when metadata is needed.
    remarkPlugins: [require("remark-frontmatter")],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Recognise .mdx files as routable pages alongside .ts / .tsx so the
  // dynamic /privacy entry point can either be a TSX shell that imports
  // content/policies/privacy.mdx (current shape) or, if the page ever moves
  // to a flat .mdx file, it'll resolve without further config.
  pageExtensions: ["ts", "tsx", "js", "jsx", "mdx"],

  // Anchor Turbopack/Webpack to this project root so Next.js doesn't pick up
  // a stray lockfile elsewhere in the developer's home directory.
  turbopack: {
    root: __dirname,
  },

  // Static export — required for GitHub Pages.
  output: "export",

  // GitHub Pages serves static files only — no image optimisation runtime.
  images: {
    unoptimized: true,
  },

  // Append a trailing slash so /privacy resolves as /privacy/index.html.
  trailingSlash: true,
};

module.exports = withMDX(nextConfig);
