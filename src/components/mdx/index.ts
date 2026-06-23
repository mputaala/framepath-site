// The MDX component whitelist for authored Markdown synced from the dev
// repo's Documentation/Policies/*.md (US-156) and later from Features/, the
// Help Book, etc. (US-159 / US-160).
//
// Why a whitelist: MDX's general feature set lets authored Markdown execute
// arbitrary JSX, which is a footgun when authoring is delegated to a non-
// engineer or to a future-attacker who gains commit access to the dev repo.
// By providing a closed map to MDXProvider and not setting
// useDynamicImport / unknown-tag passthrough, the only "components" available
// from inside MDX are:
//   - <Callout type="info|warning">…</Callout>
//   - <Screenshot id="…" />
//   - <AppStoreBadge variant="black|white" />
//   - standard prose elements (h1–h4, p, ul/ol/li, table, blockquote, code,
//     pre, a, strong, em) styled by the Tailwind Typography prose-invert
//     classes applied via <Prose>.
//
// Anything else (custom tags, arbitrary JSX) is silently dropped by MDX or
// rendered as plain text. Adding a new whitelist entry is a deliberate
// engineering act, reviewed in the corresponding US's PR.

import type { MDXComponents } from "mdx/types";

import { AppStoreBadge } from "./AppStoreBadge";
import { Callout } from "./Callout";
import { Screenshot } from "./Screenshot";

export const mdxComponents: MDXComponents = {
  Callout,
  Screenshot,
  AppStoreBadge,
};

// Re-export the individual components so future stories can import them
// directly (e.g., the Help Book index page rendering a <Callout> outside
// MDX context).
export { AppStoreBadge, Callout, Screenshot };
