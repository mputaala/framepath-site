// Configuration for the public forms shipped on framepath.fi.
//
// US-161 Sprint 29 Prompt 6 — Buttondown newsletter signup endpoint.
// The username here MUST match the Buttondown account provisioned by the
// user before the live verification step (sender identity: "FramePath
// <privacy@framepath.fi>", fallback "mputaala@me.com"). If the user picks
// a different Buttondown username, change this constant — every reference
// to the endpoint flows through it. The submit URL shape comes from
// Buttondown's "Embed signup form" documentation.
//
// Sprint 29 Prompt 7 (US-161) extends this file with the Formspree
// `CONTACT_FORM_ENDPOINT` constant.

export const BUTTONDOWN_USERNAME = "framepath";

export const BUTTONDOWN_EMBED_SUBSCRIBE_URL = `https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`;

/** Buttondown tag attached to every signup from the public site so the
 *  source can be segmented inside Buttondown. Matches the value disclosed
 *  in the Privacy Policy Section 5.5. */
export const BUTTONDOWN_SOURCE_TAG = "framepath.fi";
