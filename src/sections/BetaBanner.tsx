// Temporary beta-program announcement banner.
//
// Lives above <Hero /> in pages/index.tsx. Originally the FramePath 1.1 beta
// announcement; since 2026-10-24 it announces FramePath 1.2 (released on the
// App Store) and keeps the TestFlight link for people who want upcoming
// builds. Update the copy and WHATS_NEW_URL for each release, or remove it.
//
// Activation steps:
//   1. Confirm src/config/links.ts TESTFLIGHT_URL is the live external
//      TestFlight group link (from ASC → TestFlight → Groups → Public Link).
//   2. Add <BetaBanner /> to pages/index.tsx above <Hero /> (see that file).
//   3. Merge this PR → site rebuilds → banner is live.
//
// Reversal (US-240):
//   1. Remove <BetaBanner /> and its import from pages/index.tsx.
//   2. Delete this file.
//   3. Revert Hero eyebrow to "Now on the App Store".

import { Container } from "../components/Container";
import { TestFlightLink } from "../components/TestFlightLink";
import { TESTFLIGHT_URL } from "../config/links";

const WHATS_NEW_URL = "/features/what-s-new-in-1-2/";

export const BetaBanner = () => {
  return (
    <div
      role="region"
      aria-label="FramePath 1.2 release"
      className="border-b border-graphite-700 bg-graphite-900 py-4"
    >
      <Container>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-semibold text-ember-400">
              FramePath 1.2 is out now.
            </p>
            <p className="mt-0.5 text-sm text-graphite-300">
              Send a whole project as one file, give every project a logline
              and a thumbnail, and keep long shot lists within reach. Want to
              try upcoming builds early? Join the beta on your iPhone, iPad, or
              Mac via TestFlight.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <TestFlightLink
              href={TESTFLIGHT_URL}
              variant="button"
              className="whitespace-nowrap"
            />
            <a
              href={WHATS_NEW_URL}
              className="whitespace-nowrap text-sm text-graphite-300 underline-offset-4 hover:text-ember-400 hover:underline focus-visible:text-ember-400"
            >
              What&apos;s in 1.2 →
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
};
