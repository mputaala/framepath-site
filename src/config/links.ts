// Outbound URLs that appear in multiple places (hero, footer, future pages).
//
// APP_STORE_URL is the live universal listing (iOS + macOS under one app
// record), set when App Review approved 1.0.2 on both platforms
// (2026-07-16). It is deliberately region-neutral (no /<locale>/ segment) so
// Apple redirects each visitor to their own storefront. AppStoreBadge still
// carries "PLACEHOLDER" / "id0000000000" detection as a defensive backstop —
// harmless now that the URL is real.
//
// TESTFLIGHT_URL is the live public link for the FramePath external
// TestFlight group. Post-launch it powers a low-emphasis "try the beta"
// link for testers of upcoming versions, subordinate to the App Store badge.

export const APP_STORE_URL =
  "https://apps.apple.com/app/framepath/id6768684002";

export const TESTFLIGHT_URL =
  "https://testflight.apple.com/join/gVAx7M2E";
