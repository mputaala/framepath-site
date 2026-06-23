// US-161 Sprint 29 Prompt 7 — Public contact form on framepath.fi/contact.
//
// Plain HTML form. No JS submit handler — the form POSTs natively to
// Formspree's `https://formspree.io/f/{FORM_ID}` endpoint, Formspree
// processes the submission server-side (Akismet spam filter + honeypot
// rejection + delivery to the configured mailbox), then returns an HTTP
// 302 redirect to the URL in the `_next` hidden field. The user lands
// on /contact/thanks/ on framepath.fi.
//
// JS-disabled fallback is the SAME path — the no-JS browser handles the
// native form submit identically. The prompt's "verify no-JS fallback
// works" check is satisfied by construction here; there's no JS to
// disable.
//
// Honeypot: `_gotcha` is Formspree's documented honeypot field. We render
// it with `display: none` (not `position: absolute; left: -9999px`) so it
// is removed from the accessibility tree entirely — bots that fill every
// field still fill it; assistive tech never sees it; and Lighthouse's
// a11y label check doesn't flag a hidden labelless input (the lesson
// from US-161 Prompt 6 PR #24).
//
// Akismet: enabled by default for paid Formspree plans and recommended
// for free plans via the dashboard toggle. Filtering happens server-
// side; no client work required.
//
// Cookies: this component never reads or writes document.cookie. Formspree
// may set cookies on the formspree.io origin during the POST + redirect,
// but those are scoped to formspree.io and never appear on framepath.fi.
// The cross-cutting "no cookies on framepath.fi" AC holds.

import {
  FORMSPREE_CONTACT_ENDPOINT,
  FORMSPREE_CONTACT_THANKS_URL,
  isFormspreePlaceholder,
} from "../config/forms";

const SUBJECT_LINE = "Contact form submission — framepath.fi";

export const ContactForm = () => {
  const placeholder = isFormspreePlaceholder();

  if (placeholder) {
    // Friendly degradation when the Formspree form id is still the
    // placeholder — better than a 404 / spam-trap silent fail.
    return (
      <div
        role="status"
        className="rounded-2xl border border-graphite-700 bg-graphite-900/40 p-6 text-sm text-graphite-300"
      >
        <p className="font-semibold text-graphite-50">
          The contact form is being provisioned.
        </p>
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
      </div>
    );
  }

  return (
    <form
      action={FORMSPREE_CONTACT_ENDPOINT}
      method="POST"
      acceptCharset="UTF-8"
      noValidate
      className="space-y-5"
    >
      {/* Hidden fields:
            _subject  — sets the email subject Formspree forwards under.
            _next     — full URL Formspree 302s the browser to after a
                        successful submit. Keeps the user on framepath.fi.
            _gotcha   — honeypot. display:none keeps it out of the
                        accessibility tree. */}
      <input type="hidden" name="_subject" value={SUBJECT_LINE} />
      <input
        type="hidden"
        name="_next"
        value={FORMSPREE_CONTACT_THANKS_URL}
      />
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none" }}
      />

      <div>
        <label
          htmlFor="contact-name"
          className="block text-sm font-medium text-graphite-50"
        >
          Your name
          <span className="ml-1 text-xs font-normal text-graphite-400">
            (optional)
          </span>
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          autoComplete="name"
          className="mt-2 w-full rounded-md border border-graphite-700 bg-graphite-900 px-3 py-2 text-sm text-graphite-50 placeholder:text-graphite-500 focus-visible:border-ember-500 focus-visible:outline-none"
          placeholder="Jane Director"
        />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-graphite-50"
        >
          Your email
        </label>
        <input
          id="contact-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          aria-required="true"
          className="mt-2 w-full rounded-md border border-graphite-700 bg-graphite-900 px-3 py-2 text-sm text-graphite-50 placeholder:text-graphite-500 focus-visible:border-ember-500 focus-visible:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-graphite-50"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          aria-required="true"
          className="mt-2 w-full rounded-md border border-graphite-700 bg-graphite-900 px-3 py-2 text-sm text-graphite-50 placeholder:text-graphite-500 focus-visible:border-ember-500 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-150"
          placeholder="Tell us about your shoot, your question, or what brought you here."
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-ember-500 px-5 py-2 text-sm font-semibold text-graphite-950 transition-colors hover:bg-ember-400 focus-visible:bg-ember-400 motion-safe:transition-colors motion-safe:duration-150"
      >
        Send message
      </button>

      <p className="text-xs text-graphite-400">
        We use{" "}
        <a
          href="https://formspree.io/legal/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
        >
          Formspree
        </a>{" "}
        to deliver this message. See our{" "}
        <a
          href="/privacy/"
          className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
        >
          Privacy Policy
        </a>{" "}
        for how we handle your details.
      </p>
    </form>
  );
};
