// US-162 Sprint 29 Prompt 8 — cookieless analytics injector.
//
// Renders a deferred `<script>` tag pointing at Cloudflare Web Analytics'
// beacon, carrying the per-site token in `data-cf-beacon`. The beacon
// runs after page hydration (Next.js `Script` strategy="afterInteractive"),
// pings Cloudflare once per page view, and does NOT set cookies / store
// localStorage / fingerprint. Cloudflare aggregates server-side on
// framepath.fi's zone and exposes pageview + Core Web Vitals + referrer
// + country in the dashboard.
//
// Privacy posture: the deferred load means Cloudflare's beacon doesn't
// block render and doesn't appear in the critical request path. The
// Privacy Policy Section 5.X discloses Cloudflare as a processor; the
// Section 4 purposes table names the legitimate-interest lawful basis.
//
// The component renders nothing visible — it lives in `pages/_app.tsx`
// so the beacon ships site-wide.

import Script from "next/script";

import {
  CLOUDFLARE_ANALYTICS_TOKEN,
  CLOUDFLARE_BEACON_URL,
  isAnalyticsPlaceholder,
} from "../config/analytics";

export const Analytics = () => {
  if (isAnalyticsPlaceholder()) {
    // No-op until the user pastes a real Cloudflare beacon token into
    // src/config/analytics.ts. Avoids shipping a broken request that
    // would clutter DevTools / pad the byte budget.
    return null;
  }

  const beacon = JSON.stringify({ token: CLOUDFLARE_ANALYTICS_TOKEN });

  return (
    <Script
      id="cloudflare-web-analytics"
      strategy="afterInteractive"
      src={CLOUDFLARE_BEACON_URL}
      data-cf-beacon={beacon}
    />
  );
};
