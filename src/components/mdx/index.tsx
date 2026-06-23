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
//
// US-160 (Apple Help Book): the standard `h2` element gets an override that
// generates a kebab-case `id` from the heading text and prepends a `#`
// anchor link. The same slug algorithm runs in scripts/sync-content.mjs
// (slugifyHeadingText) so the toc.json the page reads at build time maps
// 1:1 onto the rendered heading ids. The override applies globally — every
// MDX-rendered surface (privacy, features, help) gets anchor-linkable H2s.

import type { MDXComponents } from "mdx/types";
import type { HTMLAttributes, ReactNode } from "react";

import { AppStoreBadge } from "./AppStoreBadge";
import { Callout } from "./Callout";
import { Screenshot } from "./Screenshot";

const extractText = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => extractText(child)).join("");
  }
  if (node && typeof node === "object" && "props" in node) {
    const propsChildren = (node as { props: { children?: ReactNode } }).props
      .children;
    return extractText(propsChildren);
  }
  return "";
};

const slugifyHeading = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const H2WithAnchor = ({
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) => {
  const text = extractText(children);
  const id = slugifyHeading(text);
  // scroll-margin-top reserves vertical breathing room when the browser
  // scrolls a freshly-clicked anchor into view (matches the sticky TOC's
  // approximate top offset). The `#` link is always visible at low opacity
  // — covers touch devices that have no hover state.
  return (
    <h2 id={id || undefined} {...rest} className="scroll-mt-24">
      {id ? (
        <a
          href={`#${id}`}
          aria-label={`Permalink to "${text}"`}
          className="mr-2 text-graphite-500 no-underline opacity-70 transition-opacity hover:text-ember-400 hover:opacity-100 focus-visible:text-ember-400 focus-visible:opacity-100"
        >
          #
        </a>
      ) : null}
      {children}
    </h2>
  );
};

export const mdxComponents: MDXComponents = {
  Callout,
  Screenshot,
  AppStoreBadge,
  h2: H2WithAnchor,
};

// Re-export the individual components so future stories can import them
// directly (e.g., the Help Book index page rendering a <Callout> outside
// MDX context).
export { AppStoreBadge, Callout, Screenshot };
