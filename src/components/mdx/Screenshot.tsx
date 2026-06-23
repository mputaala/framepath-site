// MDX-only Screenshot stub. US-156 only registers it so the MDX layer has a
// seam to fill when US-158 lands the Sharp-driven AVIF / WebP / PNG image
// pipeline. The current Privacy Policy doesn't use this component; authored
// MDX referencing <Screenshot id="…"> before US-158 ships will render the
// placeholder below so the failure is obvious.

type ScreenshotProps = {
  id: string;
  /** Optional alt text override; defaults to a generic placeholder string. */
  alt?: string;
  /** Optional priority hint; ignored by the stub. */
  priority?: boolean;
};

export const Screenshot = ({ id, alt }: ScreenshotProps) => {
  return (
    <span
      role="img"
      aria-label={alt ?? `Screenshot placeholder for id "${id}" — replaced by US-158 image pipeline`}
      className="my-6 flex items-center justify-center rounded-lg border border-dashed border-graphite-600 bg-graphite-900/40 px-4 py-8 text-sm text-graphite-300"
    >
      <span>
        <code className="text-ember-400">&lt;Screenshot id=&quot;{id}&quot;&gt;</code>
        {" "}— rendering placeholder until US-158 lands the image pipeline.
      </span>
    </span>
  );
};
