import type { ReactNode } from "react";

type CalloutVariant = "info" | "warning";

type CalloutProps = {
  type?: CalloutVariant;
  children: ReactNode;
};

const VARIANT_STYLES: Record<CalloutVariant, { border: string; bg: string; ring: string; iconBg: string; iconText: string }> = {
  info: {
    border: "border-l-graphite-600",
    bg: "bg-graphite-900/60",
    ring: "ring-graphite-800",
    iconBg: "bg-graphite-700",
    iconText: "text-graphite-100",
  },
  warning: {
    border: "border-l-ember-500",
    bg: "bg-ember-950/30",
    ring: "ring-ember-900/40",
    iconBg: "bg-ember-500",
    iconText: "text-graphite-950",
  },
};

const ICON: Record<CalloutVariant, ReactNode> = {
  info: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 5.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zm-1 4v6h2v-6h-2z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M12 2L1 21h22L12 2zm0 6l8 14H4l8-14zm-1 4v5h2v-5h-2zm0 6.5v1.5h2v-1.5h-2z" />
    </svg>
  ),
};

const LABEL: Record<CalloutVariant, string> = {
  info: "Note",
  warning: "Important",
};

// MDX-only Callout block. Authored Markdown can wrap a paragraph or short list
// in <Callout type="warning">…</Callout> to surface it visually. The closed
// component whitelist in src/components/mdx/index.ts is what enforces that
// only this and the two stubs are reachable from authored Markdown — the rest
// of MDX's arbitrary-JSX surface is denied by omission.
export const Callout = ({ type = "info", children }: CalloutProps) => {
  const v = VARIANT_STYLES[type];
  return (
    <aside
      role="note"
      className={[
        "my-6 flex gap-3 rounded-lg border-l-4 px-4 py-3 ring-1 ring-inset",
        v.border,
        v.bg,
        v.ring,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={["mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full", v.iconBg, v.iconText].join(" ")}
      >
        {ICON[type]}
      </span>
      <div className="min-w-0 flex-1">
        <span className="sr-only">{LABEL[type]}:</span>
        {children}
      </div>
    </aside>
  );
};
