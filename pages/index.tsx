import { SEO } from "../src/components/SEO";
import { StructuredData } from "../src/components/StructuredData";
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
      <SEO
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        canonicalUrl={CANONICAL_URL}
      />
      <StructuredData />
      <main>
        <Hero />
        <Features />
      </main>
      <Footer />
    </>
  );
};

export default Home;
