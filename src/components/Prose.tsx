import type { ReactNode } from "react";

type ProseProps = {
  children: ReactNode;
  className?: string;
};

// Tailwind Typography wrapper for Markdown-driven MDX pages. Lands in US-154
// per the story's Acceptance Criteria so US-156 doesn't need to install
// Tailwind Typography during the sync-script work. Inert for the v1 hero
// pages — only referenced by app/privacy and the Help Book once those land.
//
// Uses the "invert" prose variant for legibility on the graphite background.
// Accent + headings are coloured against the ember + graphite-50 palette.
export const Prose = ({ children, className = "" }: ProseProps) => {
  return (
    <div
      className={[
        "prose prose-invert max-w-none",
        "prose-headings:text-graphite-50",
        "prose-p:text-graphite-100",
        "prose-strong:text-graphite-50",
        "prose-a:text-ember-400 hover:prose-a:text-ember-300",
        "prose-code:text-ember-300",
        "prose-blockquote:border-l-ember-500 prose-blockquote:text-graphite-200",
        "prose-hr:border-graphite-700",
        "prose-table:text-graphite-100",
        "prose-th:text-graphite-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};
