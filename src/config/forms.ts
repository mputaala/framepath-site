// Configuration for the public forms shipped on framepath.fi.
//
// US-161 Sprint 29 Prompt 6 — Buttondown newsletter signup endpoint.
// US-161 Sprint 29 Prompt 7 — Formspree contact-form endpoint + the
// static thank-you-page URL that Formspree redirects to after a
// successful submit via the `_next` hidden field.
//
// Both endpoint constants are the chokepoints — flip the username /
// form id here if the user picks different handles in the Buttondown /
// Formspree dashboards. Sender identity in Buttondown is "FramePath
// <privacy@framepath.fi>" (fallback "mputaala@me.com"); destination
// mailbox in Formspree is privacy@framepath.fi (forwarded to
// mputaala@me.com), matching the disclosure in Privacy Policy Section
// 5.5 / 5.6.

export const BUTTONDOWN_USERNAME = "framepath";

export const BUTTONDOWN_EMBED_SUBSCRIBE_URL = `https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`;

/** Buttondown tag attached to every signup from the public site so the
 *  source can be segmented inside Buttondown. Matches the value disclosed
 *  in the Privacy Policy Section 5.5. */
export const BUTTONDOWN_SOURCE_TAG = "framepath.fi";

/** Formspree form identifier — set in the Formspree dashboard. The form
 *  ID is the URL-safe identifier in the dashboard URL; the actual
 *  destination mailbox is configured server-side at Formspree and is
 *  NOT visible in the form action attribute. Replace this placeholder
 *  with the real form ID before the verification step. */
export const FORMSPREE_FORM_ID = "PLACEHOLDER_FORM_ID";

export const FORMSPREE_CONTACT_ENDPOINT = `https://formspree.io/f/${FORMSPREE_FORM_ID}`;

/** Where Formspree redirects after a successful submit (via the `_next`
 *  hidden form field). Must be an absolute URL on framepath.fi for the
 *  redirect to land back on our site rather than Formspree's hosted
 *  thank-you. */
export const FORMSPREE_CONTACT_THANKS_URL =
  "https://framepath.fi/contact/thanks/";

/** Returns true when the Formspree form id is still the placeholder. The
 *  page renders a deliberate "form-not-yet-provisioned" notice in that
 *  case so a visitor doesn't experience a broken submit silently. */
export const isFormspreePlaceholder = () =>
  FORMSPREE_FORM_ID.includes("PLACEHOLDER");

// --------------------------------------------------------------------------- //
// Support form — submit_feedback_http Cloud Function (Bet 4 Stage 4).
//
// The /support form POSTs JSON directly to the FramePath support Cloud
// Function (`submit_feedback_http`, region europe-west1), which creates a
// GitHub issue in mputaala/framepath-support. Because framepath.fi is a
// static export there is no server / API-route proxy, so the function grants
// CORS to the framepath.fi origins directly.
//
// The deployed URL is injected at build time via NEXT_PUBLIC_SUBMIT_FEEDBACK_URL
// (NEXT_PUBLIC_ so it is inlined into the static bundle). Until it is set the
// placeholder triggers a graceful "being provisioned" notice on the page —
// like the Formspree placeholder path — so a visitor never hits a silent
// broken submit.
// --------------------------------------------------------------------------- //

export const SUBMIT_FEEDBACK_URL =
  process.env.NEXT_PUBLIC_SUBMIT_FEEDBACK_URL ??
  "PLACEHOLDER_SUBMIT_FEEDBACK_URL";

/** Returns true when the support endpoint URL is still the placeholder. */
export const isSupportEndpointPlaceholder = () =>
  SUBMIT_FEEDBACK_URL.includes("PLACEHOLDER");
