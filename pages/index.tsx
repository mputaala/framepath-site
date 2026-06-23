import Head from "next/head";

import { Features } from "../src/sections/Features";
import { Footer } from "../src/sections/Footer";
import { Hero } from "../src/sections/Hero";

const PAGE_TITLE = "FramePath — Plan the shoot. Direct your story.";
const PAGE_DESCRIPTION =
  "FramePath turns your screenplay into a structured shot list, storyboard, and shoot-day plan — built for indie filmmakers on iPad and Mac.";
const CANONICAL_URL = "https://framepath.fi/";

const Home = () => {
  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={CANONICAL_URL} />
        {/* OpenGraph / Twitter — minimum baseline; US-162 lands the
            full SEO + social-card pass with a real preview image. */}
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <main>
        <Hero />
        {/* DELIBERATE FAILURE — US-157 gate verification PR.
            Empty <button> with no accessible name to trip Lighthouse's
            button-name audit (axe-core rule). NEVER MERGE. */}
        <button type="button" className="hidden">
          {/* intentionally empty */}
        </button>
        <Features />
      </main>
      <Footer />
    </>
  );
};

export default Home;
