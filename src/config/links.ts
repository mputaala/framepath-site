// Outbound URLs that appear in multiple places (hero, footer, future pages).
//
// APP_STORE_URL is still a PLACEHOLDER pending Apple's App Store approval
// of the 1.0.2 submission (in App Review as of 2026-07-06). AppStoreBadge
// detects the "PLACEHOLDER" / "id0000000000" substrings and adds
// aria-disabled + click-suppression so users aren't misled.
//
// TESTFLIGHT_URL is the live public link for the FramePath external
// TestFlight group, provisioned during the 1.0.2 submission cycle
// (2026-07-06). Until Apple approves the beta build separately from the
// App Store submission, Apple's own TestFlight page communicates the
// "not yet accepting testers" state when a visitor taps the button —
// no site-side gating needed.

export const APP_STORE_URL =
  "https://apps.apple.com/app/framepath/id0000000000-PLACEHOLDER";

export const TESTFLIGHT_URL =
  "https://testflight.apple.com/join/gVAx7M2E";
