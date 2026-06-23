import { AppStoreBadge } from "../components/AppStoreBadge";
import { Container } from "../components/Container";
import { EmailSignup } from "../components/EmailSignup";
import { TestFlightLink } from "../components/TestFlightLink";
import { Screenshot } from "../components/mdx/Screenshot";
import { APP_STORE_URL, TESTFLIGHT_URL } from "../config/links";

// Tagline (US-154 AC: <= 60 chars). Current: 35 chars.
const TAGLINE = "Plan the shoot. Direct your story.";

// Sub-tagline (US-154 AC: <= 140 chars). Current: 119 chars.
const SUB_TAGLINE =
  "FramePath turns your screenplay into a structured shot list, storyboard, and shoot-day plan — built for indie filmmakers.";

export const Hero = () => {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-graphite-800 pb-24 pt-20 sm:pb-32 sm:pt-28"
    >
      {/* Subtle ember-tinted gradient anchored to the top, behind everything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-32 z-0 h-96 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(245,158,11,0.10),rgba(0,0,0,0))]"
      />

      <Container className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            id="hero-heading"
            className="text-balance text-4xl font-semibold tracking-extra-tight text-graphite-50 sm:text-5xl md:text-6xl"
          >
            {TAGLINE}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-graphite-300 sm:text-xl">
            {SUB_TAGLINE}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppStoreBadge href={APP_STORE_URL} />
            <TestFlightLink href={TESTFLIGHT_URL} />
          </div>

          {/* US-161 newsletter signup — embedded in the hero so the
              waitlist-conversion surface is one viewport away from the
              tagline. Footer carries a smaller variant for visitors who
              scroll past without converting. */}
          <EmailSignup variant="hero" />
        </div>

        {/* Hero screenshot. <Screenshot> bakes width / height from the
            manifest so the reserved layout box matches the source PNG's
            aspect ratio (CLS = 0 by construction). priority drives eager
            loading + fetchPriority="high" since this is the LCP candidate
            on the landing page. US-158 image pipeline serves the AVIF
            variant first, WebP second, PNG fallback last. */}
        <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <Screenshot
            id="hero-mac"
            priority
            className="w-full rounded-2xl border border-graphite-800 shadow-2xl shadow-black/50"
          />
        </div>
      </Container>
    </section>
  );
};
