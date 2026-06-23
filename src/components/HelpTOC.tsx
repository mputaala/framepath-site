// US-160 Sprint 29 Prompt 4 — sticky-on-desktop / collapsible-on-mobile
// table-of-contents for the Help Book.
//
// - Items come from content/help/toc.json, written at sync time by
//   scripts/sync-content.mjs handleMarkdownFile. Each entry has the same
//   kebab-case slug the page's <h2> components apply as their id, so the
//   `href="#slug"` anchors land on the right section.
// - On lg+ screens the nav is `position: sticky` near the top of the
//   viewport; on smaller screens it collapses behind a button that toggles
//   the list open/closed.
// - Active section highlight uses IntersectionObserver — the rootMargin
//   skews observation toward the top half of the viewport so the active
//   entry corresponds to "what the reader is currently looking at" rather
//   than "what just left the viewport".
// - Keyboard nav: button has `aria-expanded` + `aria-controls`; links are
//   plain `<a href>` so Tab order is natural and Enter / Return follows.

import { useEffect, useState } from "react";

export type HelpTocItem = {
  title: string;
  slug: string;
};

type HelpTOCProps = {
  items: HelpTocItem[];
};

export const HelpTOC = ({ items }: HelpTOCProps) => {
  const [activeSlug, setActiveSlug] = useState<string>(items[0]?.slug ?? "");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible.length > 0 && visible[0].target.id) {
          setActiveSlug(visible[0].target.id);
        }
      },
      // Pulls the "active" zone to the top-third of the viewport so the
      // highlighted entry matches what the user is actually reading.
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    const targets: Element[] = [];
    for (const item of items) {
      const el = document.getElementById(item.slug);
      if (el) {
        observer.observe(el);
        targets.push(el);
      }
    }
    return () => {
      for (const el of targets) {
        observer.unobserve(el);
      }
      observer.disconnect();
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
    >
      {/* Mobile / tablet: button toggles a collapsible list. */}
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        aria-expanded={isMobileOpen}
        aria-controls="help-toc-list"
        className="flex w-full items-center justify-between rounded-md border border-graphite-800 bg-graphite-900/40 px-4 py-3 text-left text-sm font-semibold text-graphite-50 transition-colors hover:border-ember-500/60 focus-visible:border-ember-500/60 lg:hidden"
      >
        On this page
        <span aria-hidden="true" className="text-graphite-400">
          {isMobileOpen ? "▲" : "▼"}
        </span>
      </button>
      <ul
        id="help-toc-list"
        className={`${isMobileOpen ? "block" : "hidden"} mt-3 space-y-1 lg:mt-0 lg:block`}
      >
        <li className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-graphite-400 lg:block">
          On this page
        </li>
        {items.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <li key={item.slug}>
              <a
                href={`#${item.slug}`}
                onClick={() => setIsMobileOpen(false)}
                aria-current={isActive ? "true" : undefined}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-graphite-900 font-semibold text-ember-400"
                    : "text-graphite-300 hover:text-graphite-50"
                }`}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
