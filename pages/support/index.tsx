// Bet 4 Stage 4 — /support page.
//
// Hosts the SupportForm, which POSTs to FramePath's own support backend
// (submit_feedback_http → GitHub issue in mputaala/framepath-support). This
// is the functional support page referenced by the App Store Connect Support
// URL (App Review Guideline 1.5). The Formspree-backed /contact page remains
// as an email-first fallback until it is consolidated here.

import { Container } from "../../src/components/Container";
import { SEO } from "../../src/components/SEO";
import { SupportForm } from "../../src/components/SupportForm";
import { Footer } from "../../src/sections/Footer";

const PAGE_TITLE = "Support · FramePath";
const PAGE_DESCRIPTION =
  "Get help with FramePath — report a bug, request a feature, or ask a question. We reply by email within five working days.";
const CANONICAL_URL = "https://framepath.fi/support/";

const SupportPage = () => {
  return (
    <>
      <SEO
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        canonicalUrl={CANONICAL_URL}
      />
      <main className="py-16 sm:py-20">
        <Container className="max-w-2xl">
          <header className="mx-auto max-w-xl text-center">
            <h1 className="text-3xl font-semibold tracking-extra-tight text-graphite-50 sm:text-4xl">
              Support
            </h1>
            <p className="mt-4 text-pretty text-base text-graphite-300">
              Report a bug, request a feature, or ask a question. We read every
              message and reply by email within five working days. You can also
              email{" "}
              <a
                href="mailto:support@framepath.fi"
                className="text-ember-400 underline hover:text-ember-300 focus-visible:text-ember-300"
              >
                support@framepath.fi
              </a>{" "}
              directly.
            </p>
          </header>

          <div className="mt-10">
            <SupportForm />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
};

export default SupportPage;
