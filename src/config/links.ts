// Outbound URLs that appear in multiple places (hero, footer, future pages).
// PLACEHOLDER values until the App Store / TestFlight listings go live —
// Sprint 28 Log records the deferred real URLs. Both rendering components
// (AppStoreBadge, TestFlightLink) detect the "PLACEHOLDER" substring and
// add aria-disabled + click-suppression so users aren't misled.

export const APP_STORE_URL =
  "https://apps.apple.com/app/framepath/id0000000000-PLACEHOLDER";

export const TESTFLIGHT_URL =
  "https://testflight.apple.com/join/PLACEHOLDER";
