// MDX-only AppStoreBadge stub. Registered alongside Callout and Screenshot so
// the MDX whitelist is complete for the v1 MDX layer. Authored MDX that wants
// a richer App Store CTA (variant="black|white" per the US-156 AC) will be
// filled in by US-161 / US-162 when the conversion-surface story lands.
//
// For the v1 hero / footer App Store badge see
// src/components/AppStoreBadge.tsx — that is a hand-authored React component,
// not part of the MDX surface, and predates this stub.

import { AppStoreBadge as HeroAppStoreBadge } from "../AppStoreBadge";
import { APP_STORE_URL } from "../../config/links";

type AppStoreBadgeMdxProps = {
  /** "black" | "white" — currently unused; falls back to the v1 hero badge. */
  variant?: "black" | "white";
};

export const AppStoreBadge = ({ variant }: AppStoreBadgeMdxProps) => {
  // For now the stub simply re-renders the v1 hero badge. The variant prop is
  // accepted (matching the US-156 AC's documented shape) so authored MDX can
  // be future-proofed; the visual swap lands in US-161.
  void variant;
  return (
    <span className="my-6 inline-block">
      <HeroAppStoreBadge href={APP_STORE_URL} />
    </span>
  );
};
