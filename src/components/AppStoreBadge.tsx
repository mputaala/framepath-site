// Apple App Store outbound badge — inline SVG so no third-party image
// request leaks from the page (Lighthouse Best Practices + privacy posture).
// Apple's brand guidelines permit this rendering: black pill, white text +
// Apple logo, "Download on the App Store" copy.
//
// The href is a deliberate placeholder until the App Store listing goes live
// (US-154 AC permits a placeholder; the Sprint 28 Log records the deferred
// real URL). The corresponding real URL lands when App Review approves the
// submission App Store Connect tail of Sprint 18 produces.

type AppStoreBadgeProps = {
  /** External URL to the App Store listing. Placeholder permitted pre-launch. */
  href: string;
  className?: string;
};

export const AppStoreBadge = ({ href, className = "" }: AppStoreBadgeProps) => {
  const isPlaceholder = href.includes("PLACEHOLDER") || href.includes("id0000000000");

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // Matches the visible text exactly so axe / Lighthouse's
      // label-content-name-mismatch rule passes. Disabled state is conveyed
      // separately via aria-disabled + the styled appearance.
      aria-label="Download on the App Store"
      aria-disabled={isPlaceholder ? "true" : undefined}
      className={[
        "inline-flex h-14 items-center gap-3 rounded-xl bg-graphite-50 px-5 text-graphite-950",
        "transition-colors hover:bg-white focus-visible:bg-white",
        isPlaceholder ? "cursor-not-allowed opacity-80" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={isPlaceholder ? (e) => e.preventDefault() : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-7 w-7"
        fill="currentColor"
      >
        <path d="M17.05 12.04c-.03-2.99 2.45-4.43 2.56-4.5-1.4-2.04-3.57-2.32-4.34-2.35-1.85-.19-3.6 1.09-4.54 1.09-.95 0-2.39-1.06-3.93-1.03-2.02.03-3.88 1.17-4.92 2.97-2.1 3.65-.54 9.06 1.51 12.02 1 1.45 2.19 3.08 3.74 3.02 1.5-.06 2.07-.97 3.88-.97 1.81 0 2.32.97 3.91.94 1.61-.03 2.64-1.48 3.63-2.94 1.14-1.68 1.61-3.31 1.63-3.4-.04-.02-3.13-1.2-3.16-4.85zM14.05 3.69c.83-1 1.39-2.39 1.23-3.78-1.2.05-2.65.8-3.5 1.8-.77.89-1.44 2.31-1.26 3.66 1.34.1 2.7-.68 3.53-1.68z" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {/* Trailing space inside this span so the textContent of the
              outer <a> reads "Download on the App Store" — with the space
              that the aria-label has. Without it, the two adjacent
              flex-children render as "Download on theApp Store" in the
              accessibility tree, which axe's label-content-name-mismatch
              rule flags as a divergence from the aria-label. */}
          {"Download on the "}
        </span>
        <span className="text-xl font-semibold tracking-extra-tight">
          App Store
        </span>
      </span>
    </a>
  );
};
