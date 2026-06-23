// Allow TypeScript to type-check .mdx imports as React components.
// `@next/mdx` compiles them to JSX modules at build time; this ambient
// declaration just teaches tsc what the import shape looks like.
declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
}
