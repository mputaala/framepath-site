// US-158 Sprint 29 Prompt 2 — the live <Screenshot id="…" /> component.
//
// Reads the build-time manifest written by scripts/sync-content.mjs (the
// stub at public/screenshots/manifest.json is overwritten on every sync;
// see the file's own header comment). Each id maps to a four-variant
// asset set (AVIF / WebP / PNG / 400 w thumbnail) plus native dimensions
// and alt text from config/screenshot-allowlist.json.
//
// Render strategy:
//   <picture>
//     <source srcSet={avif} type="image/avif" />
//     <source srcSet={webp} type="image/webp" />
//     <img src={png} width height alt loading decoding fetchPriority />
//   </picture>
// Browsers pick the first supported source (Chrome / Safari / Firefox all
// support AVIF in 2026). The PNG fallback is the universal cover.
//
// Width / height are baked in from the manifest so the reserved layout box
// matches the natural aspect ratio — CLS = 0 by construction (US-154 AC).
//
// Priority:
//   - `priority` prop true       → loading="eager", fetchPriority="high"
//   - allowlist `priority: true` → same default (hero use case)
//   - everything else            → loading="lazy", fetchPriority="auto"

import manifestJson from "../../../public/screenshots/manifest.json";

type ManifestEntry = {
  avif: string;
  webp: string;
  png: string;
  thumb: string;
  width: number;
  height: number;
  alt: string;
  priority?: boolean;
  sourceFile?: string;
  avifQuality?: number;
  avifBytes?: number;
};

const screenshotManifest = manifestJson as Record<string, ManifestEntry>;

type ScreenshotProps = {
  /** Logical screenshot id from config/screenshot-allowlist.json. */
  id: string;
  /** Override the allowlist-baked alt text (rare — usually let the
   *  manifest's alt win since it's the single source of truth). */
  alt?: string;
  /** Force eager loading + fetchPriority high. Defaults to whatever the
   *  allowlist entry's `priority` field declares. */
  priority?: boolean;
  /** Optional CSS classes — defaults to a neutral MDX-friendly box. */
  className?: string;
};

export const Screenshot = ({
  id,
  alt,
  priority,
  className,
}: ScreenshotProps) => {
  const entry = screenshotManifest[id];
  if (!entry) {
    // Sync hasn't run, or the id is wrong. Surface loud + accessible
    // rather than rendering a broken image.
    return (
      <span
        role="img"
        aria-label={`Missing screenshot manifest entry: ${id}`}
        className="my-6 flex items-center justify-center rounded-lg border border-dashed border-graphite-600 bg-graphite-900/40 px-4 py-8 text-sm text-graphite-300"
      >
        <span>
          <code className="text-ember-400">
            &lt;Screenshot id=&quot;{id}&quot;&gt;
          </code>{" "}
          — id not in manifest. Run{" "}
          <code className="text-ember-400">
            node scripts/sync-content.mjs --dev-repo dev-content
          </code>
          .
        </span>
      </span>
    );
  }
  const eager = priority ?? entry.priority ?? false;
  return (
    <picture>
      <source srcSet={entry.avif} type="image/avif" />
      <source srcSet={entry.webp} type="image/webp" />
      <img
        src={entry.png}
        alt={alt ?? entry.alt}
        width={entry.width}
        height={entry.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        className={
          className ?? "my-6 w-full rounded-lg border border-graphite-800"
        }
      />
    </picture>
  );
};
