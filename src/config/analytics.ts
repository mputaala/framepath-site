// US-162 Sprint 29 Prompt 8 — cookieless analytics configuration.
//
// Provider: Cloudflare Web Analytics. Free tier, no cookies, no fingerprint,
// no IP retention, no cross-site tracking. Loaded as a deferred third-party
// script (~5 KiB) from `static.cloudflareinsights.com`.
//
// User flow to provision (owed at the verification step):
//   1. Sign in to Cloudflare dashboard.
//   2. Analytics → Web Analytics → "Add a site".
//   3. Enter "framepath.fi" — Cloudflare issues a beacon token.
//   4. Paste the token into CLOUDFLARE_ANALYTICS_TOKEN below.
//   5. Push; the Analytics component injects the deferred snippet.
//
// While the token is the placeholder, the Analytics component renders
// NOTHING — no script tag, no network request, no measurement. Safer
// degradation than emitting an invalid token (which Cloudflare's beacon
// rejects with a 4xx anyway, but at least no broken request shows up in
// the Network tab during dev).

export const CLOUDFLARE_ANALYTICS_TOKEN = "PLACEHOLDER_ANALYTICS_TOKEN";

export const CLOUDFLARE_BEACON_URL =
  "https://static.cloudflareinsights.com/beacon.min.js";

export const isAnalyticsPlaceholder = () =>
  CLOUDFLARE_ANALYTICS_TOKEN.includes("PLACEHOLDER");
