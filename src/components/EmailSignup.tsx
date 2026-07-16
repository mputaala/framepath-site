// US-161 Sprint 29 Prompt 6 — Newsletter signup component.
//
// Submits to Buttondown's embed-subscribe endpoint. Buttondown's standard
// double-opt-in flow then emails the subscriber to confirm — only after
// they click the link in that email is the subscription active. The
// privacy disclosure in Privacy_Policy.md Section 5.5 already documents
// this two-step shape.
//
// Two submit paths exist:
//   1. JS-enabled (default): onSubmit intercepts, fetch()es the endpoint
//      with mode: "no-cors" (Buttondown doesn't expose CORS), and shows
//      the in-place success state without navigating. mode: "no-cors"
//      makes the response opaque — *we cannot tell whether Buttondown
//      accepted the submission*, only whether the request reached the
//      network. Issue mputaala/Frame#290 hit this trade-off head-on: a
//      404 from a missing Buttondown account looked identical to a 202
//      "queued for DOI" in the client. The success copy below therefore
//      hedges deliberately — it tells the visitor what *should* happen,
//      provides an unambiguous timeout window, and surfaces an email
//      escape hatch so silent provider failures don't strand them.
//   2. JS-disabled fallback: the form's native `action` + `target="_blank"`
//      sends the POST to Buttondown directly, which returns Buttondown's
//      hosted success / error page in a new tab. The framepath.fi page
//      stays as-is.
//
// Consent: the checkbox is REQUIRED. The submit button is `aria-disabled`
// + visually disabled until the box is checked AND a non-empty email is
// entered. Article 6(1)(a) consent is captured here; the Privacy Policy
// names this exact mechanism.
//
// No cookies: this component never reads or writes document.cookie, and
// fetch() to a third-party origin with mode: "no-cors" does not give
// Buttondown access to first-party cookies. The Cross-cutting "no cookies"
// AC holds.
//
// Spam handling: Buttondown's own filtering + double-opt-in flow are the
// primary defence. The Sprint 29 Prompt 6 first-draft also embedded a
// classic honey-pot input, but it dropped Lighthouse Accessibility from
// 1.0 → 0.98 (the hidden input had no associated label even with
// aria-hidden + tabIndex=-1 + off-screen positioning). Removed; if a real
// abuse rate appears, revisit with a labelled honey-pot or a tighter
// per-IP rate-limit at Buttondown's side.
//
// prefers-reduced-motion: success / error state transitions only animate
// inside `motion-safe:` Tailwind variants.

import { useId, useState, type FormEvent } from "react";

import {
  BUTTONDOWN_EMBED_SUBSCRIBE_URL,
  BUTTONDOWN_SOURCE_TAG,
} from "../config/forms";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type EmailSignupProps = {
  /** Tweaks copy + spacing for the hero vs the footer surface. The
   *  underlying form + consent semantics are identical. */
  variant?: "hero" | "footer";
};

const HERO_HEADLINE = "Stay in the loop.";
const HERO_BLURB =
  "Get an occasional email on new features and behind-the-scenes notes. No spam, no other lists, no third-party tracking.";
const FOOTER_HEADLINE = "Newsletter";
const FOOTER_BLURB =
  "Occasional product updates. Unsubscribe with one click.";

const CONSENT_LABEL_PREFIX = "I agree to receive the FramePath newsletter — product updates and the occasional behind-the-scenes note. I can unsubscribe any time via the link in every email. See the ";
const CONSENT_LABEL_LINK_TEXT = "Privacy Policy";
const CONSENT_LABEL_SUFFIX = " for details.";

export const EmailSignup = ({ variant = "hero" }: EmailSignupProps) => {
  const inputId = useId();
  const consentId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const canSubmit =
    consent && email.trim().length > 0 && status !== "submitting";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("tag", BUTTONDOWN_SOURCE_TAG);
      // Buttondown's embed endpoint does not expose CORS headers, so the
      // response is opaque. A non-throwing fetch only proves the request
      // hit the network — not that Buttondown accepted it. The success
      // copy reflects that uncertainty; see the preamble for the full
      // rationale (mputaala/Frame#290).
      await fetch(BUTTONDOWN_EMBED_SUBSCRIBE_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again or email mputaala@me.com.";
      setErrorMessage(message);
    }
  };

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={
          variant === "hero"
            ? "mx-auto mt-10 max-w-md rounded-2xl border border-ember-500/40 bg-graphite-900/40 p-6 text-left motion-safe:transition-colors motion-safe:duration-200"
            : "mt-3 max-w-sm rounded-xl border border-ember-500/40 bg-graphite-900/40 p-4 text-left motion-safe:transition-colors motion-safe:duration-200"
        }
      >
        <p className="text-sm font-semibold text-graphite-50">
          Submission received.
        </p>
        <p className="mt-2 text-sm text-graphite-300">
          Buttondown should email you a confirmation link within a few minutes — click it to finish signing up. No subscription is active until you confirm. If nothing arrives within five minutes, please email{" "}
          <a
            href="mailto:mputaala@me.com"
            className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
          >
            mputaala@me.com
          </a>
          .
        </p>
      </div>
    );
  }

  const inputClasses =
    "w-full rounded-md border border-graphite-700 bg-graphite-900 px-3 py-2 text-sm text-graphite-50 placeholder:text-graphite-500 focus-visible:border-ember-500 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-150";

  const submitClasses = `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold motion-safe:transition-colors motion-safe:duration-150 ${
    canSubmit
      ? "bg-ember-500 text-graphite-950 hover:bg-ember-400 focus-visible:bg-ember-400"
      : "cursor-not-allowed bg-graphite-800 text-graphite-500"
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      action={BUTTONDOWN_EMBED_SUBSCRIBE_URL}
      method="POST"
      target="_blank"
      noValidate
      className={
        variant === "hero"
          ? "mx-auto mt-10 max-w-md text-left"
          : "mt-3 max-w-sm text-left"
      }
    >
      <div className="mb-3">
        {variant === "hero" ? (
          // <p> not <h-N>: avoids the H1 → H3 heading-order skip that
          // Lighthouse a11y flagged when the EmailSignup was first
          // shipped under the hero (PR #24 / US-161 Prompt 6 history).
          // Sprint 29 Prompt 9 (PR #27) extended the same fix to the
          // footer variant — on minimal pages like /contact the footer
          // signup lives directly after the page H1 with no intermediate
          // H2, so the H3 form headline reintroduced the same skip
          // there. Styled <p> reads identically to a sighted user; the
          // headline is for visual hierarchy, not document structure.
          <p className="text-lg font-semibold text-graphite-50">
            {HERO_HEADLINE}
          </p>
        ) : (
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-graphite-50">
            {FOOTER_HEADLINE}
          </p>
        )}
        <p className="mt-1 text-sm text-graphite-300">
          {variant === "hero" ? HERO_BLURB : FOOTER_BLURB}
        </p>
      </div>

      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-required="true"
          aria-invalid={status === "error" ? "true" : undefined}
          aria-describedby={status === "error" ? errorId : undefined}
          className={`${inputClasses} sm:flex-1`}
        />
        <button
          type="submit"
          aria-disabled={!canSubmit}
          disabled={!canSubmit}
          className={submitClasses}
        >
          {status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2">
        <input
          id={consentId}
          type="checkbox"
          name="consent"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-required="true"
          className="mt-1 h-4 w-4 cursor-pointer rounded border-graphite-700 bg-graphite-900 text-ember-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
        />
        <label
          htmlFor={consentId}
          className="text-xs text-graphite-300"
        >
          {CONSENT_LABEL_PREFIX}
          <a
            href="/privacy/"
            className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
          >
            {CONSENT_LABEL_LINK_TEXT}
          </a>
          {CONSENT_LABEL_SUFFIX}
        </label>
      </div>

      {/* Buttondown source-tag — sent on no-JS submit too so dual-path
          subscribers are equally identifiable in the Buttondown UI. */}
      <input type="hidden" name="tag" value={BUTTONDOWN_SOURCE_TAG} />

      {status === "error" ? (
        <p
          id={errorId}
          role="alert"
          className="mt-3 text-sm text-ember-300"
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
};
