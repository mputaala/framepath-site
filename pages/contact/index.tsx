// US-161 Sprint 29 Prompt 7 — /contact page.
//
// Static page hosting the ContactForm. Submission flow:
//   user → fills form → POST to Formspree → Formspree validates +
//   filters + delivers to mailbox → 302 to /contact/thanks/.
//
// No JS required for the submit path; the form's native action
// attribute carries the work. The page therefore renders identically
// with JavaScript enabled or disabled, satisfying the prompt's no-JS
// fallback AC.

import { Container } from "../../src/components/Container";
import { ContactForm } from "../../src/components/ContactForm";
import { SEO } from "../../src/components/SEO";
import { Footer } from "../../src/sections/Footer";

const PAGE_TITLE = "Contact · FramePath";
const PAGE_DESCRIPTION =
  "Questions about FramePath, press enquiries, or feedback — send us a note.";
const CANONICAL_URL = "https://framepath.fi/contact/";

const ContactPage = () => {
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
              Contact
            </h1>
            <p className="mt-4 text-pretty text-base text-graphite-300">
              Questions about FramePath, press enquiries, or feedback. We answer most messages within five working days.
            </p>
          </header>

          <div className="mt-10">
            <ContactForm />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
};

export default ContactPage;
