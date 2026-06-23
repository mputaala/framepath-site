import { describe, expect, it } from "vitest";

import { resolveSourcePath } from "../sync-content.mjs";

// Use a Posix-style absolute path so the test is platform-deterministic on the
// CI runner (Ubuntu) and the developer's Mac. The function under test calls
// path.resolve(), which on macOS / Linux normalises against the Posix root.
const FAKE_DEV_ROOT = "/tmp/fake-dev-repo";

describe("resolveSourcePath", () => {
  // US-155 AC #1: A source entry with '..' in the path is rejected.
  it("rejects a source containing '..'", () => {
    expect(() => resolveSourcePath(FAKE_DEV_ROOT, "../etc/passwd")).toThrow(
      /\.\./,
    );
  });

  it("rejects a deeper-nested '..' segment that still escapes the root", () => {
    expect(() =>
      resolveSourcePath(FAKE_DEV_ROOT, "Documentation/Policies/../../escape"),
    ).toThrow(/\.\./);
  });

  // US-155 AC #2: A source entry resolving to a parent of the dev-repo root
  // is rejected. The '..' guard above already catches the common form; this
  // case covers a hypothetical absolute path that would resolve into a
  // sibling-of-root location after path.resolve() is applied.
  it("rejects a source whose resolved path sits outside the root", () => {
    // path.resolve() treats a leading '/' as absolute, so this resolves to
    // '/etc/passwd' regardless of the supplied root.
    expect(() => resolveSourcePath(FAKE_DEV_ROOT, "/etc/passwd")).toThrow(
      /outside dev-repo root/,
    );
  });

  it("rejects a sibling-directory escape that shares the root's prefix", () => {
    // Root is /tmp/fake-dev-repo. If a naive `startsWith(root)` check were
    // used (without the trailing separator), the candidate
    // /tmp/fake-dev-repo-malicious/file would slip past. The separator suffix
    // in the production code prevents this.
    expect(() =>
      // Use path.resolve()-equivalent reasoning: the source must be relative,
      // so we construct one that, after resolve, lands outside.
      // Note: in practice the leading-slash path above already covers most of
      // this surface, but this test asserts the suffix-separator guard
      // explicitly with a hand-crafted target.
      resolveSourcePath("/tmp/fake-dev-repo", "/tmp/fake-dev-repo-malicious"),
    ).toThrow(/outside dev-repo root/);
  });

  // US-155 AC #3: A source entry resolving to a permitted path returns the
  // resolved absolute path.
  it("returns the absolute resolved path for a permitted source", () => {
    expect(resolveSourcePath(FAKE_DEV_ROOT, "Documentation/Policies")).toBe(
      "/tmp/fake-dev-repo/Documentation/Policies",
    );
  });

  it("returns the root itself when the source is the empty-segment '.'", () => {
    expect(resolveSourcePath(FAKE_DEV_ROOT, ".")).toBe("/tmp/fake-dev-repo");
  });

  it("returns the resolved path for a single Markdown-file source", () => {
    expect(
      resolveSourcePath(
        FAKE_DEV_ROOT,
        "Documentation/Guides/Apple Help Book.md",
      ),
    ).toBe("/tmp/fake-dev-repo/Documentation/Guides/Apple Help Book.md");
  });

  // Defensive cases.
  it("rejects an empty source", () => {
    expect(() => resolveSourcePath(FAKE_DEV_ROOT, "")).toThrow(/non-empty/);
  });

  it("rejects a non-string source", () => {
    // @ts-expect-error — deliberately wrong type.
    expect(() => resolveSourcePath(FAKE_DEV_ROOT, 42)).toThrow(/non-empty/);
  });
});
