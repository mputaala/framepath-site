// Secondary outbound CTA — TestFlight beta-invite link. Apple does not
// publish an official "TestFlight badge" the way the App Store has one, so
// we render a styled <a> matching the hero's visual rhythm. The text alone
// disambiguates the destination for screen readers; no separate icon-only
// affordance.

type TestFlightLinkProps = {
  /** External TestFlight join URL. Placeholder permitted pre-public-beta. */
  href: string;
  className?: string;
};

export const TestFlightLink = ({ href, className = "" }: TestFlightLinkProps) => {
  const isPlaceholder = href.includes("PLACEHOLDER");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // Matches visible text exactly so axe / Lighthouse's
      // label-content-name-mismatch rule passes.
      aria-label="Join the TestFlight beta"
      aria-disabled={isPlaceholder ? "true" : undefined}
      className={[
        "inline-flex h-14 items-center justify-center rounded-xl border border-graphite-600 bg-transparent px-6 text-base font-semibold text-graphite-50",
        "transition-colors hover:border-ember-400 hover:text-ember-400 focus-visible:border-ember-400 focus-visible:text-ember-400",
        isPlaceholder ? "cursor-not-allowed opacity-80" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={isPlaceholder ? (e) => e.preventDefault() : undefined}
    >
      Join the TestFlight beta
    </a>
  );
};
