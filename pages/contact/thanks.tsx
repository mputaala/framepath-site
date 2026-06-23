// US-161 Sprint 29 Prompt 7 — /contact/thanks/ static success page.
//
// Where Formspree redirects after a successful POST via the `_next`
// hidden form field. Pure static HTML — no client state, no JS-driven
// success messaging, no cookies. Lands the user back on framepath.fi
// with confirmation that the message went through.
//
// Linked from /contact via the form's `_next` attribute; not linked
// anywhere else in the site nav (footer / hero / etc.) — visiting
// /contact/thanks/ directly without having submitted is a no-op the
// page handles by simply rendering the static success copy. A
// `noindex` meta tag keeps search engines from surfacing it as a
// stand-alone destination.

import Head from "next/head";

import { Container } from "../../src/components/Container";
import { Footer } from "../../src/sections/Footer";

const PAGE_TITLE = "Message sent · FramePath";
const PAGE_DESCRIPTION =
  "Your message was delivered. We'll respond within five working days.";
const CANONICAL_URL = "https://framepath.fi/contact/thanks/";

const ContactThanksPage = () => {
  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Head>
      <main className="py-16 sm:py-20">
        <Container className="max-w-2xl">
          <div className="mx-auto max-w-xl rounded-2xl border border-ember-500/40 bg-graphite-900/40 p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-extra-tight text-graphite-50 sm:text-3xl">
              Thanks — your message is on its way.
            </h1>
            <p className="mt-4 text-base text-graphite-300">
              We received your message and will respond within five working days. If you need a faster reply, email{" "}
              <a
                href="mailto:support@framepath.fi"
                className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
              >
                support@framepath.fi
              </a>
              .
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-graphite-600 px-5 py-2 text-sm font-semibold text-graphite-50 transition-colors hover:border-ember-400 hover:text-ember-400 focus-visible:border-ember-400 focus-visible:text-ember-400"
              >
                Back to home
              </a>
              <a
                href="/features/"
                className="inline-flex items-center justify-center rounded-md bg-ember-500 px-5 py-2 text-sm font-semibold text-graphite-950 transition-colors hover:bg-ember-400 focus-visible:bg-ember-400"
              >
                Browse features
              </a>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
};

export default ContactThanksPage;
