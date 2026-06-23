import { describe, expect, it } from "vitest";

import {
  normaliseAutolinks,
  resolveSourcePath,
  slugFromHeading,
  stripDenyListedLinks,
  stripInternalComments,
} from "../sync-content.mjs";

// Use a Posix-style absolute path so the test is platform-deterministic on the
// CI runner (Ubuntu) and the developer's Mac. The function under test calls
// path.resolve(), which on macOS / Linux normalises against the Posix root.
const FAKE_DEV_ROOT = "/tmp/fake-dev-repo";

describe("resolveSourcePath (US-155 path-traversal guards)", () => {
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

  it("rejects a source whose resolved path sits outside the root", () => {
    expect(() => resolveSourcePath(FAKE_DEV_ROOT, "/etc/passwd")).toThrow(
      /outside dev-repo root/,
    );
  });

  it("rejects a sibling-directory escape that shares the root's prefix", () => {
    expect(() =>
      resolveSourcePath("/tmp/fake-dev-repo", "/tmp/fake-dev-repo-malicious"),
    ).toThrow(/outside dev-repo root/);
  });

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

  it("rejects an empty source", () => {
    expect(() => resolveSourcePath(FAKE_DEV_ROOT, "")).toThrow(/non-empty/);
  });

  it("rejects a non-string source", () => {
    // @ts-expect-error — deliberately wrong type.
    expect(() => resolveSourcePath(FAKE_DEV_ROOT, 42)).toThrow(/non-empty/);
  });
});

describe("slugFromHeading (US-156)", () => {
  it("drops the trailing ' Policy' suffix from 'Privacy Policy'", () => {
    expect(slugFromHeading("Privacy Policy")).toBe("privacy");
  });

  it("drops trailing ' Policy' from a longer phrase", () => {
    expect(slugFromHeading("Acceptable Use Policy")).toBe("acceptable-use");
  });

  it("kebab-cases multi-word headings without a Policy suffix", () => {
    expect(slugFromHeading("Terms and Conditions")).toBe("terms-and-conditions");
  });

  it("lowercases mixed-case input", () => {
    expect(slugFromHeading("Cookie Policy")).toBe("cookie");
  });

  it("collapses runs of punctuation into single dashes", () => {
    expect(slugFromHeading("Privacy / Policy")).toBe("privacy");
  });

  it("trims leading and trailing dashes that fall out of normalisation", () => {
    expect(slugFromHeading("  Privacy Policy  ")).toBe("privacy");
  });

  it("falls back to the full heading when stripping ' Policy' empties it", () => {
    // 'Policy' on its own — the strip leaves an empty string, so the
    // implementation falls back to the original input. 'Policy' kebab-cases
    // to 'policy', which is what we want a hypothetical solo-named policy
    // to produce rather than throwing.
    expect(slugFromHeading("Policy")).toBe("policy");
  });

  it("rejects an empty heading", () => {
    expect(() => slugFromHeading("")).toThrow(/non-empty/);
  });

  it("rejects a heading that produces an empty slug after normalisation", () => {
    expect(() => slugFromHeading("---")).toThrow(/empty slug/);
  });
});

describe("stripInternalComments (US-156)", () => {
  it("removes lines that start with `<!-- internal:`", () => {
    const md = [
      "# Privacy",
      "",
      "<!-- internal: see Firestore rules at users/{uid} -->",
      "Body line.",
    ].join("\n");
    expect(stripInternalComments(md)).not.toContain("internal:");
    expect(stripInternalComments(md)).toContain("Body line.");
  });

  it("preserves ordinary HTML comments", () => {
    const md = "# Title\n\n<!-- regular comment -->\nBody";
    expect(stripInternalComments(md)).toContain("<!-- regular comment -->");
  });

  it("tolerates leading whitespace before the marker", () => {
    const md = "   <!-- internal: indented -->\nBody";
    expect(stripInternalComments(md)).toBe("Body");
  });

  it("does not strip lines where 'internal:' appears mid-line", () => {
    const md = "Refer to the internal: docs.";
    expect(stripInternalComments(md)).toBe(md);
  });
});

describe("normaliseAutolinks (US-156 — MDX compatibility)", () => {
  it("expands an https autolink to an explicit markdown link", () => {
    expect(normaliseAutolinks("See <https://example.com/path>.")).toBe(
      "See [https://example.com/path](https://example.com/path).",
    );
  });

  it("expands an http autolink", () => {
    expect(normaliseAutolinks("<http://example.com>")).toBe(
      "[http://example.com](http://example.com)",
    );
  });

  it("expands a mailto autolink", () => {
    expect(normaliseAutolinks("Contact <mailto:foo@bar.com>.")).toBe(
      "Contact [mailto:foo@bar.com](mailto:foo@bar.com).",
    );
  });

  it("leaves HTML comments alone", () => {
    expect(normaliseAutolinks("<!-- regular comment -->")).toBe(
      "<!-- regular comment -->",
    );
  });

  it("leaves component-like tags alone", () => {
    expect(normaliseAutolinks("<Callout type=\"info\">hi</Callout>")).toBe(
      "<Callout type=\"info\">hi</Callout>",
    );
  });

  it("handles multiple autolinks on one line", () => {
    expect(
      normaliseAutolinks("Refs: <https://a.com>, <https://b.com>"),
    ).toBe(
      "Refs: [https://a.com](https://a.com), [https://b.com](https://b.com)",
    );
  });
});

describe("stripDenyListedLinks (US-156)", () => {
  it("strips a *.cloudfunctions.net link, preserving anchor text", () => {
    const md = "See the [ask_claude function](https://us-central1-myproj.cloudfunctions.net/ask_claude).";
    expect(stripDenyListedLinks(md)).toBe("See the ask_claude function.");
  });

  it("strips a console.firebase.google.com link", () => {
    const md = "Open the [Firebase console](https://console.firebase.google.com/project/foo).";
    expect(stripDenyListedLinks(md)).toBe("Open the Firebase console.");
  });

  it("strips a mputaala.github.io/Frame link", () => {
    const md = "See the [dev repo](https://mputaala.github.io/Frame/docs).";
    expect(stripDenyListedLinks(md)).toBe("See the dev repo.");
  });

  it("leaves an mputaala.github.io link to a non-Frame path alone", () => {
    const md = "See [my blog](https://mputaala.github.io/blog).";
    expect(stripDenyListedLinks(md)).toBe(md);
  });

  it("leaves an arbitrary external link alone", () => {
    const md = "See [Apple](https://www.apple.com/legal/privacy/).";
    expect(stripDenyListedLinks(md)).toBe(md);
  });

  it("leaves relative links alone (no parseable URL)", () => {
    const md = "See the [section](#contact) below.";
    expect(stripDenyListedLinks(md)).toBe(md);
  });

  it("leaves mailto: links alone", () => {
    const md = "Email [us](mailto:privacy@framepath.fi).";
    expect(stripDenyListedLinks(md)).toBe(md);
  });

  it("handles multiple links in the same paragraph", () => {
    const md = [
      "See [Apple](https://www.apple.com/) and the",
      "[old debug page](https://us-central1-x.cloudfunctions.net/debug)",
      "before reporting.",
    ].join(" ");
    const out = stripDenyListedLinks(md);
    expect(out).toContain("[Apple](https://www.apple.com/)");
    expect(out).toContain("old debug page");
    expect(out).not.toContain("cloudfunctions.net");
  });
});
