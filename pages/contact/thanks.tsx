// US-213 (Sprint 49) — /contact/thanks/ has migrated with /contact.
//
// This was the Formspree post-submit landing page; the Formspree contact form
// is superseded by /support (which confirms inline, needing no thanks page).
// Kept as a redirect rather than deleted so an old bookmark or a stale search
// result never 404s. Same static-export meta-refresh pattern as /contact/.

import Head from "next/head";

import { Container } from "../../src/components/Container";

const REDIRECT_TARGET = "/support/";
const CANONICAL_URL = "https://framepath.fi/support/";

const ContactThanksRedirectPage = () => (
  <>
    <Head>
      <title>Support · FramePath</title>
      <meta httpEquiv="refresh" content={`0; url=${REDIRECT_TARGET}`} />
      <link rel="canonical" href={CANONICAL_URL} />
    </Head>
    <main className="py-16 sm:py-20">
      <Container className="max-w-2xl text-center">
        <p className="text-base text-graphite-300">
          This page has moved.{" "}
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

export default ContactThanksRedirectPage;
