// US-160 Sprint 29 Prompt 4 — the Help Book page at /help.
//
// Reads the synced content/help/index.mdx (statically imported, same
// pattern as pages/privacy.tsx) and surfaces it inside <Prose> with a
// sticky-on-desktop <HelpTOC> populated from content/help/toc.json. The
// H2 anchor links + scroll-margin-top come from the H2 component override
// in src/components/mdx/index.tsx, applied via MDXProvider in _app.tsx.
//
// The static import lets Next.js compile the MDX at build time and ship
// the rendered HTML straight to GitHub Pages — no runtime serialise like
// /features uses, since the Help Book is a single fixed slug.

import type { GetStaticProps } from "next";

import HelpContent from "../content/help/index.mdx";
import { Container } from "../src/components/Container";
import { HelpTOC, type HelpTocItem } from "../src/components/HelpTOC";
import { Prose } from "../src/components/Prose";
import { SEO } from "../src/components/SEO";
import { Footer } from "../src/sections/Footer";

type HelpPageProps = {
  description: string;
  tocItems: HelpTocItem[];
};

const PAGE_TITLE = "Help · FramePath";
const CANONICAL_URL = "https://framepath.fi/help/";

const HelpPage = ({ description, tocItems }: HelpPageProps) => {
  return (
    <>
      <SEO
        title={PAGE_TITLE}
        description={description}
        canonicalUrl={CANONICAL_URL}
        ogType="article"
      />
      <main className="py-16 sm:py-20">
        <Container className="max-w-6xl">
          <div className="lg:grid lg:grid-cols-[minmax(0,_1fr)_240px] lg:gap-12">
            <article>
              <Prose>
                <HelpContent />
              </Prose>
            </article>
            <aside className="mt-12 lg:mt-0">
              <HelpTOC items={tocItems} />
            </aside>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
};

// Pull a description out of the synced MDX at build time, mirroring the
// pattern from pages/privacy.tsx. Skips the H1 + any blank lines, then
// grabs the first paragraph for the meta description.
export const getStaticProps: GetStaticProps<HelpPageProps> = async () => {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const matter = (await import("gray-matter")).default;

  const mdxPath = path.join(process.cwd(), "content", "help", "index.mdx");
  const raw = await readFile(mdxPath, "utf8");
  const { content } = matter(raw);

  const lines = content.split(/\r?\n/);
  let i = 0;
  while (
    i < lines.length &&
    (lines[i].trim().length === 0 || lines[i].startsWith("#"))
  ) {
    i++;
  }
  // Skip blockquote / metadata lines (Apple Help Book.md opens with a
  // `> **Audience**: …` line that doesn't belong in the description).
  while (i < lines.length && lines[i].trim().startsWith(">")) {
    i++;
  }
  while (
    i < lines.length &&
    (lines[i].trim().length === 0 || lines[i].startsWith("#"))
  ) {
    i++;
  }
  const paraLines: string[] = [];
  while (i < lines.length && lines[i].trim().length > 0) {
    paraLines.push(lines[i]);
    i++;
  }
  const raw160 = paraLines
    .join(" ")
    .replace(/[*_>`#]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const description =
    raw160.length > 157 ? `${raw160.slice(0, 157).trimEnd()}…` : raw160;

  // Read the TOC via fs at build time rather than via static import — the
  // toc.json file is gitignored alongside content/ and only appears once
  // sync-content.mjs has run. A static import would fail TypeScript on a
  // fresh clone before the first sync.
  let tocItems: HelpTocItem[] = [];
  try {
    const tocPath = path.join(process.cwd(), "content", "help", "toc.json");
    const tocRaw = await readFile(tocPath, "utf8");
    const parsedToc = JSON.parse(tocRaw) as { items?: HelpTocItem[] };
    if (Array.isArray(parsedToc.items)) {
      tocItems = parsedToc.items;
    }
  } catch {
    tocItems = [];
  }

  return { props: { description, tocItems } };
};

export default HelpPage;
