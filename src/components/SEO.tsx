// US-162 Sprint 29 Prompt 9 — per-page SEO metadata helper.
//
// Centralises the per-route `<title>` / `<meta name="description">` /
// `<link rel="canonical">` / `<meta property="og:*">` / `<meta
// name="twitter:card">` / OG image tags that every page in pages/ has
// been duplicating. Pages now render `<SEO ... />` instead of an
// inline <Head> block; site-wide metadata invariants live here.
//
// The OG image defaults to `/og/og-default.png` (1200×630), generated
// at build time by scripts/generate-og-images.mjs from the synced
// hero-mac screenshot. A future PR can extend `image` per route.

import Head from "next/head";

type SEOProps = {
  title: string;
  description: string;
  canonicalUrl: string;
  /** Override the default OG image (`/og/og-default.png`) for routes
   *  that ship a bespoke card. Absolute or root-relative paths both
   *  accepted; root-relative is normalised to absolute via SITE_ORIGIN. */
  image?: string;
  /** OG type — defaults to "website"; long-form content (privacy,
   *  help, features/{slug}) overrides to "article". */
  ogType?: "website" | "article";
  /** Twitter card layout — defaults to "summary_large_image" because
   *  every page ships a 1200×630 OG card. */
  twitterCard?: "summary" | "summary_large_image";
  /** Stop search engines from indexing this page (e.g.,
   *  /contact/thanks/). Defaults to false. */
  noindex?: boolean;
};

const SITE_ORIGIN = "https://framepath.fi";
const DEFAULT_OG_IMAGE = "/og/og-default.png";
const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";

const absolutise = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

export const SEO = ({
  title,
  description,
  canonicalUrl,
  image = DEFAULT_OG_IMAGE,
  ogType = "website",
  twitterCard = "summary_large_image",
  noindex = false,
}: SEOProps) => {
  const imageUrl = absolutise(image);
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex,follow" /> : null}
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content={OG_IMAGE_WIDTH} />
      <meta property="og:image:height" content={OG_IMAGE_HEIGHT} />
      <meta property="og:site_name" content="FramePath" />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
};
