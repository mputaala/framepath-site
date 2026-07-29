// Temporary beta-program announcement banner.
//
// Lives above <Hero /> in pages/index.tsx during the FramePath 1.1 beta
// window. Removed in US-240 (beta close-out) when 1.1 ships on the App Store.
//
// Activation steps:
//   1. Confirm src/config/links.ts TESTFLIGHT_URL is the live 1.1 external
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

const WHATS_NEW_URL = "/features/what-s-new-in-1-1/";

export const BetaBanner = () => {
  return (
    <div
      role="region"
      aria-label="FramePath 1.1 beta"
      className="border-b border-graphite-700 bg-graphite-900 py-4"
    >
      <Container>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-semibold text-ember-400">
              FramePath 1.1 is in beta now.
            </p>
            <p className="mt-0.5 text-sm text-graphite-300">
              If you&apos;re in pre-production and want to help shape the first
              major update, install the beta on your iPhone, iPad, or Mac via
              TestFlight.
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
              What&apos;s in 1.1 →
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
};
