// US-159 Sprint 29 Prompt 3 — dynamic Feature page.
//
// Reads content/features/{slug}.mdx at build time, serialises via
// next-mdx-remote so the dynamic route can host an arbitrary number of
// feature pages without a static import per slug, and renders inside the
// shared <Prose> wrapper that the Privacy Policy already uses.
//
// Strict gate: the build also re-checks `frontmatter.published === true`
// here even though sync-content.mjs already filtered on its way in. Defence
// in depth — a bad sync output would still 404 rather than render.

import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import type { GetStaticPaths, GetStaticProps } from "next";
import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";

import { Container } from "../../src/components/Container";
import { Prose } from "../../src/components/Prose";
import { SEO } from "../../src/components/SEO";
import { mdxComponents } from "../../src/components/mdx";
import { Footer } from "../../src/sections/Footer";

type FeaturePageProps = {
  title: string;
  summary: string;
  slug: string;
  source: MDXRemoteSerializeResult;
};

const FEATURES_DIR = () => path.join(process.cwd(), "content", "features");

const FeaturePage = ({ title, summary, slug, source }: FeaturePageProps) => {
  const pageTitle = `${title} · FramePath`;
  const canonicalUrl = `https://framepath.fi/features/${slug}/`;
  const description = summary || `${title} on FramePath.`;
  return (
    <>
      <SEO
        title={pageTitle}
        description={description}
        canonicalUrl={canonicalUrl}
        ogType="article"
      />
      <main className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <Prose>
            <MDXRemote {...source} components={mdxComponents} />
          </Prose>
        </Container>
      </main>
      <Footer />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = FEATURES_DIR();
  let fileNames: string[] = [];
  try {
    fileNames = await fs.readdir(dir);
  } catch {
    fileNames = [];
  }
  const paths: { params: { slug: string } }[] = [];
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".mdx")) continue;
    const raw = await fs.readFile(path.join(dir, fileName), "utf8");
    const parsed = matter(raw);
    if (parsed.data?.published !== true) continue;
    const slug =
      typeof parsed.data.slug === "string"
        ? parsed.data.slug
        : fileName.replace(/\.mdx$/, "");
    paths.push({ params: { slug } });
  }
  // `fallback: false` so unknown slugs produce a real 404 (the E2E
  // verification flips published: false on one of three docs and expects the
  // page to 404 on the next deploy).
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<
  FeaturePageProps,
  { slug: string }
> = async (ctx) => {
  const slug = ctx.params?.slug;
  if (!slug) {
    return { notFound: true };
  }
  const dir = FEATURES_DIR();
  let fileNames: string[] = [];
  try {
    fileNames = await fs.readdir(dir);
  } catch {
    return { notFound: true };
  }
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".mdx")) continue;
    const raw = await fs.readFile(path.join(dir, fileName), "utf8");
    const parsed = matter(raw);
    const fm = parsed.data ?? {};
    if (fm.published !== true) continue;
    const fileSlug =
      typeof fm.slug === "string" ? fm.slug : fileName.replace(/\.mdx$/, "");
    if (fileSlug !== slug) continue;
    const source = await serialize(parsed.content, {
      // No remark / rehype plugins — keep the MDX surface narrow to match
      // @next/mdx's default. Adding plugins is a deliberate decision in a
      // future story.
      parseFrontmatter: false,
    });
    return {
      props: {
        title:
          typeof fm.title === "string" && fm.title.length > 0
            ? fm.title
            : slug,
        summary: typeof fm.summary === "string" ? fm.summary : "",
        slug,
        source,
      },
    };
  }
  return { notFound: true };
};

export default FeaturePage;
