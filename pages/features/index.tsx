// US-159 Sprint 29 Prompt 3 — Features index page.
//
// Lists every feature page synced into content/features/ from the dev repo's
// Documentation/Features/*.md docs whose frontmatter sets `published: true`.
// getStaticProps reads the directory at build time, parses frontmatter via
// gray-matter to extract { slug, title, summary }, and feeds the component.
// The list shape stays simple: a stacked card per feature with a link to
// /features/{slug}.

import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import type { GetStaticProps } from "next";
import Head from "next/head";

import { Container } from "../../src/components/Container";
import { Footer } from "../../src/sections/Footer";

type FeatureSummary = {
  slug: string;
  title: string;
  summary: string;
};

type FeaturesIndexProps = {
  features: FeatureSummary[];
};

const PAGE_TITLE = "Features · FramePath";
const PAGE_DESCRIPTION =
  "Three stages, one app — write your screenplay, plan the shoot, and run the shoot day from FramePath.";
const CANONICAL_URL = "https://framepath.fi/features/";

const FeaturesIndex = ({ features }: FeaturesIndexProps) => {
  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Head>
      <main className="py-16 sm:py-20">
        <Container className="max-w-4xl">
          <header className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold tracking-extra-tight text-graphite-50 sm:text-4xl">
              Features
            </h1>
            <p className="mt-4 text-pretty text-lg text-graphite-300">
              {PAGE_DESCRIPTION}
            </p>
          </header>

          {features.length === 0 ? (
            <p className="mt-12 text-center text-graphite-300">
              No features have been published yet. Check back soon.
            </p>
          ) : (
            <ul className="mt-12 grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature.slug}>
                  <a
                    href={`/features/${feature.slug}/`}
                    className="group block h-full rounded-2xl border border-graphite-800 bg-graphite-900/40 p-6 transition-colors hover:border-ember-500/60 focus-visible:border-ember-500/60"
                  >
                    <h2 className="text-xl font-semibold text-graphite-50 group-hover:text-ember-400 group-focus-visible:text-ember-400">
                      {feature.title}
                    </h2>
                    {feature.summary ? (
                      <p className="mt-3 text-pretty text-base text-graphite-300">
                        {feature.summary}
                      </p>
                    ) : null}
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ember-400">
                      Read more
                      <span aria-hidden="true">→</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
};

export const getStaticProps: GetStaticProps<FeaturesIndexProps> = async () => {
  const dir = path.join(process.cwd(), "content", "features");
  let fileNames: string[] = [];
  try {
    fileNames = await fs.readdir(dir);
  } catch {
    // content/features/ may not exist yet on a fresh clone before the first
    // sync; surface as empty rather than blocking the build.
    fileNames = [];
  }
  const features: FeatureSummary[] = [];
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".mdx")) continue;
    const raw = await fs.readFile(path.join(dir, fileName), "utf8");
    const parsed = matter(raw);
    const fm = parsed.data ?? {};
    if (fm.published !== true) continue;
    const slug =
      typeof fm.slug === "string" ? fm.slug : fileName.replace(/\.mdx$/, "");
    const title =
      typeof fm.title === "string" && fm.title.length > 0
        ? fm.title
        : slug;
    const summary = typeof fm.summary === "string" ? fm.summary : "";
    features.push({ slug, title, summary });
  }
  // Alphabetical by title — stable, predictable for crawl + screenshot.
  features.sort((a, b) => a.title.localeCompare(b.title));
  return { props: { features } };
};

export default FeaturesIndex;
