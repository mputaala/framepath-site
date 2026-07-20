// US-213 (Sprint 49) — /contact has migrated to /support.
//
// The Formspree-backed contact form is superseded by the /support form, which
// posts into FramePath's own support backend (submit_feedback_http). GitHub
// Pages serves a static export, so a true HTTP 301 is not available; this
// page is the standard static-hosting equivalent — an instant
// <meta http-equiv="refresh">, a rel=canonical consolidating search signals
// on /support/, and a visible fallback link for user agents that ignore meta
// refresh. The Header/Footer nav and the sitemap point straight at /support/.

import Head from "next/head";

import { Container } from "../../src/components/Container";

const REDIRECT_TARGET = "/support/";
const CANONICAL_URL = "https://framepath.fi/support/";

const ContactRedirectPage = () => (
  <>
    <Head>
      <title>Support · FramePath</title>
      <meta httpEquiv="refresh" content={`0; url=${REDIRECT_TARGET}`} />
      <link rel="canonical" href={CANONICAL_URL} />
    </Head>
    <main className="py-16 sm:py-20">
      <Container className="max-w-2xl text-center">
        <p className="text-base text-graphite-300">
          Our contact page has moved.{" "}
          <a
            href={REDIRECT_TARGET}
            className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
          >
            Continue to Support
          </a>
          .
        </p>
      </Container>
    </main>
  </>
);

export default ContactRedirectPage;
