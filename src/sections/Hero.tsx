import { AppStoreBadge } from "../components/AppStoreBadge";
import { Container } from "../components/Container";
import { TestFlightLink } from "../components/TestFlightLink";
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
        </div>

        {/* DELIBERATE FAILURE — US-157 gate verification PR.
            Removed width / height attributes to provoke a CLS regression
            that should fail the Lighthouse cumulative-layout-shift assertion
            (maxNumericValue: 0.1) and the categories:performance >= 0.95
            assertion. This PR is expected to NEVER merge. */}
        <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <img
            src="/screenshots/hero-placeholder.png"
            alt="A screenshot of the FramePath app showing a scene card grid alongside the script."
            decoding="async"
            className="w-full rounded-2xl border border-graphite-800 shadow-2xl shadow-black/50"
          />
        </div>
      </Container>
    </section>
  );
};
