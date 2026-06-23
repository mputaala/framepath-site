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
//      makes the response opaque, so we treat "fetch resolved without
//      throwing" as "submission accepted" — Buttondown will email or
//      not as it sees fit; the user sees the same "check your inbox"
//      copy either way.
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

const HERO_HEADLINE = "Be there at launch.";
const HERO_BLURB =
  "Get a single email when FramePath ships on the App Store. No spam, no other lists, no third-party tracking.";
const FOOTER_HEADLINE = "Newsletter";
const FOOTER_BLURB =
  "One email at launch. Unsubscribe with one click.";

const CONSENT_LABEL_PREFIX = "I agree to receive the FramePath newsletter — launch updates and the occasional behind-the-scenes note. I can unsubscribe any time via the link in every email. See the ";
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
      // Buttondown's embed endpoint does not expose CORS headers. We
      // submit no-cors and treat a non-throwing fetch as a successful
      // hand-off — Buttondown's own double-opt-in email is what actually
      // confirms the subscription. The user sees the same "check your
      // inbox" copy regardless of whether the address is fresh or a
      // re-submit (Buttondown is the source of truth on duplicates).
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
          Check your inbox.
        </p>
        <p className="mt-2 text-sm text-graphite-300">
          We sent you a confirmation email — click the link inside to finish signing up. No subscription is active until you confirm.
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
        <h3
          className={
            variant === "hero"
              ? "text-lg font-semibold text-graphite-50"
              : "text-sm font-semibold uppercase tracking-[0.18em] text-graphite-50"
          }
        >
          {variant === "hero" ? HERO_HEADLINE : FOOTER_HEADLINE}
        </h3>
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
