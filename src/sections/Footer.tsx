import { Container } from "../components/Container";
import { EmailSignup } from "../components/EmailSignup";
import { APP_STORE_URL, TESTFLIGHT_URL } from "../config/links";

const CURRENT_YEAR = new Date().getFullYear();

export const Footer = () => {
  return (
    <footer className="py-16">
      <Container>
        <div className="flex flex-col items-start justify-between gap-12 md:flex-row md:items-end">
          {/* Wordmark + tagline + footer-variant newsletter signup. */}
          <div>
            <a
              href="/"
              aria-label="FramePath home"
              className="inline-flex items-baseline gap-1 text-2xl font-semibold tracking-extra-tight text-graphite-50"
            >
              FramePath
              <span aria-hidden="true" className="text-ember-500">
                .
              </span>
            </a>
            <p className="mt-3 max-w-xs text-sm text-graphite-300">
              A planning app for filmmakers.
            </p>
            <EmailSignup variant="footer" />
          </div>

          {/* Nav links */}
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
              <li>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-graphite-300 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                >
                  App Store
                </a>
              </li>
              <li>
                <a
                  href={TESTFLIGHT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-graphite-300 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                >
                  TestFlight
                </a>
              </li>
              <li>
                <a
                  href="/features/"
                  className="text-graphite-300 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="/help/"
                  className="text-graphite-300 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                >
                  Help
                </a>
              </li>
              <li>
                <a
                  href="/privacy/"
                  className="text-graphite-300 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/contact/"
                  className="text-graphite-300 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <hr className="my-10 border-graphite-800" />

        <p className="text-sm text-graphite-300">
          © {CURRENT_YEAR} Miikka Putaala. All rights reserved.
        </p>
      </Container>
    </footer>
  );
};
