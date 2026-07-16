// Secondary outbound CTA — TestFlight beta-invite link. Apple does not
// publish an official "TestFlight badge" the way the App Store has one, so
// we render a styled <a>. The text alone disambiguates the destination for
// screen readers; no separate icon-only affordance.
//
// Two variants:
//   - "button" (default): a bordered pill matching the hero's visual rhythm.
//   - "link": a low-emphasis text link. Used post-launch, where the App Store
//     badge is the primary download and the beta is a subordinate option for
//     testers of upcoming versions.

type TestFlightLinkProps = {
  /** External TestFlight join URL. Placeholder permitted pre-public-beta. */
  href: string;
  /** Visual emphasis. Defaults to the bordered button. */
  variant?: "button" | "link";
  className?: string;
};

export const TestFlightLink = ({
  href,
  variant = "button",
  className = "",
}: TestFlightLinkProps) => {
  const isPlaceholder = href.includes("PLACEHOLDER");

  // Visible text differs by emphasis; keep aria-label matching it exactly so
  // axe / Lighthouse's label-content-name-mismatch rule passes.
  const label =
    variant === "link" ? "Try the beta on TestFlight" : "Join the TestFlight beta";

  const variantClasses =
    variant === "link"
      ? "inline-flex items-center text-sm text-graphite-400 underline-offset-4 hover:text-ember-400 hover:underline focus-visible:text-ember-400"
      : "inline-flex h-14 items-center justify-center rounded-xl border border-graphite-600 bg-transparent px-6 text-base font-semibold text-graphite-50 transition-colors hover:border-ember-400 hover:text-ember-400 focus-visible:border-ember-400 focus-visible:text-ember-400";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      aria-disabled={isPlaceholder ? "true" : undefined}
      className={[
        variantClasses,
        isPlaceholder ? "cursor-not-allowed opacity-80" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={isPlaceholder ? (e) => e.preventDefault() : undefined}
    >
      {label}
    </a>
  );
};
