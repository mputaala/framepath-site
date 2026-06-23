// US-162 Sprint 29 Prompt 9 — schema.org JSON-LD for the hero.
//
// Emits a single `SoftwareApplication` JSON-LD block describing
// FramePath. Google's Rich Results Test + Schema Markup Validator
// both check for this on the canonical landing URL; passing both is
// in the US-162 AC.
//
// The block is rendered inside a `<script type="application/ld+json">`
// tag — Next.js' Head doesn't accept that tag (which would force a
// stringified body); the component instead renders it inline below
// the hero so it's part of the static HTML. Search-crawlers parse
// JSON-LD wherever it appears in the document.

import { useId } from "react";

type StructuredDataProps = {
  /** Optional override of the default JSON-LD payload — typically only
   *  used for non-hero pages that need a different schema.org type
   *  (e.g., Article on /privacy if we ever add that). */
  payload?: Record<string, unknown>;
};

const DEFAULT_SOFTWARE_APPLICATION = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FramePath",
  applicationCategory: "MultimediaApplication",
  applicationSubCategory: "Film production planning",
  operatingSystem: "iOS 18, iPadOS 18, macOS 15",
  description:
    "FramePath turns your screenplay into a structured shot list, storyboard, and shoot-day plan — built for indie filmmakers.",
  url: "https://framepath.fi/",
  image: "https://framepath.fi/og/og-default.png",
  author: {
    "@type": "Person",
    name: "Miikka Putaala",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/PreOrder",
    description:
      "Free download with optional FramePath Pro subscription for AI shot generation and storyboard drawing.",
  },
};

export const StructuredData = ({ payload }: StructuredDataProps) => {
  const id = useId();
  const body = JSON.stringify(payload ?? DEFAULT_SOFTWARE_APPLICATION);
  return (
    <script
      id={id}
      type="application/ld+json"
      // dangerouslySetInnerHTML is the correct React pattern here —
      // JSON-LD is data, not HTML, and React's JSX text node would
      // escape characters Google's parser doesn't expect. The payload
      // is a JSON.stringify() of an object we control, so there's no
      // injection surface.
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
};
