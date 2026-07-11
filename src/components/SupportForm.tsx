// Bet 4 Stage 4 — Public support form on framepath.fi/support.
//
// Unlike the Formspree ContactForm, this form talks to FramePath's own
// support backend: it POSTs JSON to the `submit_feedback_http` Cloud
// Function (europe-west1), which validates, rate-limits, and files a GitHub
// issue in mputaala/framepath-support. The function grants CORS to the
// framepath.fi origins so the static site can call it directly (there is no
// server/API-route proxy on a static export).
//
// JS is required for this path — the endpoint consumes JSON and returns
// JSON, so there is no meaningful native-form fallback. When JS is disabled,
// or the endpoint URL is still the build-time placeholder, the component
// degrades to an email escape hatch (support@framepath.fi), mirroring the
// ContactForm placeholder behaviour so a visitor is never stranded.
//
// hCaptcha is intentionally not wired yet: the backend already enforces a
// 5/hour + 20/day rolling rate limit per IP, which is the baseline abuse
// defence for launch. A captcha can be added later without changing this
// component's shape.
//
// No cookies: this component never reads or writes document.cookie.

import { useId, useState, type FormEvent } from "react";

import {
  SUBMIT_FEEDBACK_URL,
  isSupportEndpointPlaceholder,
} from "../config/forms";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type Category = "bug_report" | "feature_request" | "help";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "bug_report", label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "help", label: "Help / question" },
];

const SUMMARY_MAX = 120;
const DETAILS_MAX = 4000;

const inputClasses =
  "mt-2 w-full rounded-md border border-graphite-700 bg-graphite-900 px-3 py-2 text-sm text-graphite-50 placeholder:text-graphite-500 focus-visible:border-ember-500 focus-visible:outline-none";
const labelClasses = "block text-sm font-medium text-graphite-50";

const EmailFallback = () => (
  <p className="mt-2">
    In the meantime, please email{" "}
    <a
      href="mailto:support@framepath.fi"
      className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
    >
      support@framepath.fi
    </a>{" "}
    and we'll respond within five working days.
  </p>
);

export const SupportForm = () => {
  const categoryId = useId();
  const summaryId = useId();
  const detailsId = useId();
  const emailId = useId();
  const errorId = useId();

  const [category, setCategory] = useState<Category>("bug_report");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const placeholder = isSupportEndpointPlaceholder();

  if (placeholder) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-graphite-700 bg-graphite-900/40 p-6 text-sm text-graphite-300"
      >
        <p className="font-semibold text-graphite-50">
          The support form is being provisioned.
        </p>
        <EmailFallback />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-ember-500/40 bg-graphite-900/40 p-8 text-center"
      >
        <h2 className="text-2xl font-semibold tracking-extra-tight text-graphite-50">
          Thanks — we've got it.
        </h2>
        <p className="mt-4 text-base text-graphite-300">
          Your message reached us and we'll reply by email within five working
          days. No account needed — just watch your inbox.
        </p>
      </div>
    );
  }

  const canSubmit =
    summary.trim().length > 0 &&
    details.trim().length > 0 &&
    email.trim().length > 0 &&
    status !== "submitting";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch(SUBMIT_FEEDBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          summary: summary.trim(),
          details: details.trim(),
          reply_email: email.trim(),
          submission_id: crypto.randomUUID(),
          locale:
            typeof navigator !== "undefined" ? navigator.language : undefined,
        }),
      });

      if (response.ok) {
        setStatus("success");
        return;
      }

      if (response.status === 429) {
        setErrorMessage(
          "You've sent a few messages recently. Please wait a little while and try again, or email support@framepath.fi.",
        );
      } else if (response.status === 400) {
        setErrorMessage(
          "Something in the form looked off. Check your email address and message, then try again.",
        );
      } else {
        setErrorMessage(
          "We couldn't send your message just now. Please try again shortly, or email support@framepath.fi.",
        );
      }
      setStatus("error");
    } catch {
      setErrorMessage(
        "We couldn't reach the server. Please check your connection and try again, or email support@framepath.fi.",
      );
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor={categoryId} className={labelClasses}>
          What can we help with?
        </label>
        <select
          id={categoryId}
          value={category}
          onChange={(event) => setCategory(event.target.value as Category)}
          className={inputClasses}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={summaryId} className={labelClasses}>
          Summary
        </label>
        <input
          id={summaryId}
          type="text"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
          maxLength={SUMMARY_MAX}
          aria-required="true"
          className={inputClasses}
          placeholder="A one-line summary"
        />
      </div>

      <div>
        <label htmlFor={detailsId} className={labelClasses}>
          Details
        </label>
        <textarea
          id={detailsId}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          required
          rows={6}
          maxLength={DETAILS_MAX}
          aria-required="true"
          className={`${inputClasses} motion-safe:transition-colors motion-safe:duration-150`}
          placeholder="Tell us what happened, what you expected, or what you'd like to see."
        />
      </div>

      <div>
        <label htmlFor={emailId} className={labelClasses}>
          Your email
        </label>
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          aria-required="true"
          className={inputClasses}
          placeholder="you@example.com"
        />
      </div>

      {status === "error" && (
        <p id={errorId} role="alert" className="text-sm text-ember-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        className="inline-flex items-center justify-center rounded-md bg-ember-500 px-5 py-2 text-sm font-semibold text-graphite-950 transition-colors hover:bg-ember-400 focus-visible:bg-ember-400 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-150"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>

      <p className="text-xs text-graphite-400">
        Your message and email address are used only to answer you and are
        filed as a support ticket. See our{" "}
        <a
          href="/privacy/"
          className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
        >
          Privacy Policy
        </a>{" "}
        for details.
      </p>
    </form>
  );
};
