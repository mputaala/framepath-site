import type { GetStaticProps } from "next";

import PrivacyContent from "../content/policies/privacy.mdx";
import { Container } from "../src/components/Container";
import { SEO } from "../src/components/SEO";
import { Footer } from "../src/sections/Footer";
import { Prose } from "../src/components/Prose";

type PrivacyPageProps = {
  description: string;
};

const PAGE_TITLE = "Privacy Policy · FramePath";
const CANONICAL_URL = "https://framepath.fi/privacy/";

const PrivacyPage = ({ description }: PrivacyPageProps) => {
  return (
    <>
      <SEO
        title={PAGE_TITLE}
        description={description}
        canonicalUrl={CANONICAL_URL}
        ogType="article"
      />
      <main className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <Prose>
            <PrivacyContent />
          </Prose>
        </Container>
      </main>
      <Footer />
    </>
  );
};

// Pull a description out of the synced MDX at build time. The MDX itself is
// imported above as a React component; here we read the raw file in
// getStaticProps so we can derive a <meta name="description"> from the body's
// first paragraph (≤160 characters per the US-156 AC). Doing it here keeps
// sync-content.mjs free of metadata-extraction concerns.
export const getStaticProps: GetStaticProps<PrivacyPageProps> = async () => {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const matter = (await import("gray-matter")).default;

  const mdxPath = path.join(
    process.cwd(),
    "content",
    "policies",
    "privacy.mdx",
  );
  const raw = await readFile(mdxPath, "utf8");
  const { content } = matter(raw);

  // Skip everything up to the first paragraph after the H1. A paragraph is a
  // run of non-blank lines; we collapse internal newlines into spaces so the
  // description reads cleanly in social-share previews.
  const lines = content.split(/\r?\n/);
  let i = 0;
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
  // Strip markdown decorations and collapse whitespace.
  const raw160 = paraLines
    .join(" ")
    .replace(/[*_>`#]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const description =
    raw160.length > 157 ? `${raw160.slice(0, 157).trimEnd()}…` : raw160;

  return { props: { description } };
};

export default PrivacyPage;
