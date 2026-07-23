// mputaala/Frame#534 — the online Help section is retired.
//
// The in-app User Guide (US-212 native reader + US-217 rendering, FramePath
// 1.1) and the macOS Apple Help Book now cover every platform, so the synced
// /help collation is no longer published. GitHub Pages serves a static
// export, so a true HTTP 301 is not available; this page is the standard
// static-hosting equivalent — an instant <meta http-equiv="refresh">, a
// rel=canonical consolidating search signals on /support/, and a visible
// fallback link for user agents that ignore meta refresh (same pattern as
// the /contact → /support/ migration in US-213).

import Head from "next/head";

import { Container } from "../src/components/Container";

const REDIRECT_TARGET = "/support/";
const CANONICAL_URL = "https://framepath.fi/support/";

const HelpRedirectPage = () => (
  <>
    <Head>
      <title>Support · FramePath</title>
      <meta httpEquiv="refresh" content={`0; url=${REDIRECT_TARGET}`} />
      <link rel="canonical" href={CANONICAL_URL} />
    </Head>
    <main className="py-16 sm:py-20">
      <Container className="max-w-2xl text-center">
        <p className="text-base text-graphite-300">
          The online guide has moved into the FramePath app — open the User
          Guide from the in-app Help &amp; Info screen. Need a hand?{" "}
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

export default HelpRedirectPage;
