import { useState } from "react";

import { Container } from "../components/Container";
import { TESTFLIGHT_URL } from "../config/links";

// Primary site navigation. Rendered once globally from pages/_app.tsx so it
// stays visible on every route (framepath-support#3 — a visitor asked for a
// stationary nav bar, "similar to Apple", instead of relying on the footer).
//
// Sticky (not fixed) so it participates in normal flow and never overlaps the
// page content — no body top-padding to maintain. The graphite/80 backdrop
// blur matches the in-app design language and keeps hero content legible as it
// scrolls underneath.

// Internal section links. Trailing slashes match the exported static routes
// (Next.js `trailingSlash: true`) so no client-side redirect hop on click.
const NAV_LINKS = [
  { href: "/features/", label: "Features" },
  { href: "/help/", label: "Help" },
  { href: "/contact/", label: "Contact" },
];

export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-graphite-800 bg-graphite-950/80 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Wordmark — mirrors the footer lockup. */}
          <a
            href="/"
            aria-label="FramePath home"
            className="inline-flex items-baseline gap-1 text-xl font-semibold tracking-extra-tight text-graphite-50"
            onClick={closeMenu}
          >
            FramePath
            <span aria-hidden="true" className="text-ember-500">
              .
            </span>
          </a>

          {/* Desktop nav. */}
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-x-8 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-graphite-300 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={TESTFLIGHT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-ember-500 px-4 py-1.5 text-sm font-medium text-graphite-950 transition-colors hover:bg-ember-400"
                >
                  TestFlight
                </a>
              </li>
            </ul>
          </nav>

          {/* Mobile menu toggle. */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-graphite-200 hover:text-ember-400 md:hidden"
          >
            {/* Simple hamburger / close glyph — swaps on open state. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-6 w-6"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {/* Mobile nav panel — only mounted (and in the a11y tree) when open. */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="border-t border-graphite-800 bg-graphite-950 md:hidden"
        >
          <Container>
            <ul className="flex flex-col gap-y-1 py-4 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={closeMenu}
                    className="block py-2 text-graphite-200 transition-colors hover:text-ember-400 focus-visible:text-ember-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <a
                  href={TESTFLIGHT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="inline-flex rounded-full bg-ember-500 px-4 py-1.5 font-medium text-graphite-950 transition-colors hover:bg-ember-400"
                >
                  TestFlight
                </a>
              </li>
            </ul>
          </Container>
        </nav>
      )}
    </header>
  );
};
