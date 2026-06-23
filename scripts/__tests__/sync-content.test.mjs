import { describe, expect, it } from "vitest";
import sharp from "sharp";

import matter from "gray-matter";

import {
  buildImageVariants,
  DEFAULT_AVIF_BUDGET_BYTES,
  DEFAULT_THUMBNAIL_WIDTH,
  encodeAvifWithinBudget,
  escapeMdxUnsafeAngles,
  extractH2Toc,
  isPublishedTrue,
  normaliseAutolinks,
  renderFrontmatter,
  resolveSourcePath,
  slugFromFilename,
  slugFromHeading,
  slugifyHeadingText,
  stripDenyListedLinks,
  stripInternalComments,
  stripMarketingSkipSections,
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

/* ─── US-158 image pipeline ─────────────────────────────────────────────── */

/**
 * Synthesise a deterministic test PNG. Using Sharp's create-from-pixel
 * factory so the test doesn't need a committed binary fixture. The default
 * 200x100 solid background compresses to ~well under 1 KB AVIF; the
 * noiseScale option produces an image that won't compress as aggressively
 * so the budget-guard test has teeth.
 */
const makeFakePng = async ({ width = 200, height = 100, noise = false } = {}) => {
  if (!noise) {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();
  }
  // Pseudo-random pixel data; defeats compression so AVIF output gets large.
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 1234567;
  for (let i = 0; i < pixels.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    pixels[i] = seed & 0xff;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
};

describe("DEFAULT_AVIF_BUDGET_BYTES (US-158)", () => {
  it("is 80 KB per the Sprint 29 Prompt 1 AC", () => {
    expect(DEFAULT_AVIF_BUDGET_BYTES).toBe(80 * 1024);
  });
});

describe("DEFAULT_THUMBNAIL_WIDTH (US-158)", () => {
  it("is 400px per the Sprint 29 Prompt 1 AC", () => {
    expect(DEFAULT_THUMBNAIL_WIDTH).toBe(400);
  });
});

describe("encodeAvifWithinBudget (US-158)", () => {
  it("returns a buffer + quality when the source fits the budget", async () => {
    const png = await makeFakePng({ width: 200, height: 100 });
    const result = await encodeAvifWithinBudget(png, DEFAULT_AVIF_BUDGET_BYTES);
    expect(result).not.toBeNull();
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeLessThanOrEqual(DEFAULT_AVIF_BUDGET_BYTES);
    expect(result.quality).toBeGreaterThanOrEqual(20);
    expect(result.quality).toBeLessThanOrEqual(60);
  });

  it("prefers the highest quality that fits — solid-fill PNG returns the first ladder rung", async () => {
    const png = await makeFakePng({ width: 200, height: 100 });
    const result = await encodeAvifWithinBudget(png, DEFAULT_AVIF_BUDGET_BYTES);
    expect(result.quality).toBe(60);
  });

  it("returns null when even the lowest-quality step exceeds an absurdly tight budget", async () => {
    const png = await makeFakePng({ width: 200, height: 100 });
    // 100-byte budget is below any AVIF header, so even quality=20 overshoots.
    const result = await encodeAvifWithinBudget(png, 100);
    expect(result).toBeNull();
  });
});

describe("buildImageVariants (US-158)", () => {
  it("produces avif/webp/png/thumb buffers + native dimensions", async () => {
    const png = await makeFakePng({ width: 640, height: 320 });
    const v = await buildImageVariants(png, {
      budgetBytes: DEFAULT_AVIF_BUDGET_BYTES,
      thumbnailWidth: DEFAULT_THUMBNAIL_WIDTH,
      id: "test-asset",
    });
    expect(v.avif).toBeInstanceOf(Buffer);
    expect(v.webp).toBeInstanceOf(Buffer);
    expect(v.png).toBeInstanceOf(Buffer);
    expect(v.thumb).toBeInstanceOf(Buffer);
    expect(v.width).toBe(640);
    expect(v.height).toBe(320);
    expect(v.avif.length).toBeLessThanOrEqual(DEFAULT_AVIF_BUDGET_BYTES);
    expect(v.avifQuality).toBeGreaterThanOrEqual(20);
  });

  it("throws a budget-regression error when the source can't fit the AVIF budget", async () => {
    const png = await makeFakePng({ width: 256, height: 256 });
    await expect(
      buildImageVariants(png, {
        budgetBytes: 100,
        thumbnailWidth: DEFAULT_THUMBNAIL_WIDTH,
        id: "too-dense",
      }),
    ).rejects.toThrow(/budget regression/i);
  });

  it("downsizes the thumbnail to at most `thumbnailWidth`", async () => {
    const png = await makeFakePng({ width: 1200, height: 800 });
    const v = await buildImageVariants(png, {
      budgetBytes: DEFAULT_AVIF_BUDGET_BYTES,
      thumbnailWidth: 400,
      id: "thumb-test",
    });
    const meta = await sharp(v.thumb).metadata();
    expect(meta.width).toBeLessThanOrEqual(400);
  });

  it("preserves the source PNG dimensions in the avif / webp / png outputs", async () => {
    const png = await makeFakePng({ width: 800, height: 600 });
    const v = await buildImageVariants(png, {
      budgetBytes: DEFAULT_AVIF_BUDGET_BYTES,
      thumbnailWidth: 400,
      id: "dims-test",
    });
    const avifMeta = await sharp(v.avif).metadata();
    const webpMeta = await sharp(v.webp).metadata();
    const pngMeta = await sharp(v.png).metadata();
    expect(avifMeta.width).toBe(800);
    expect(webpMeta.width).toBe(800);
    expect(pngMeta.width).toBe(800);
  });
});

/* ─── US-159 features pipeline ──────────────────────────────────────────── */

describe("isPublishedTrue (US-159 strict frontmatter gate)", () => {
  it("returns true only for the literal Boolean true", () => {
    expect(isPublishedTrue(true)).toBe(true);
  });

  it("rejects the string 'true' (marketing-review bypass guard)", () => {
    expect(isPublishedTrue("true")).toBe(false);
  });

  it("rejects the string 'True' / 'TRUE'", () => {
    expect(isPublishedTrue("True")).toBe(false);
    expect(isPublishedTrue("TRUE")).toBe(false);
  });

  it("rejects the number 1", () => {
    expect(isPublishedTrue(1)).toBe(false);
  });

  it("rejects null, undefined, and false", () => {
    expect(isPublishedTrue(null)).toBe(false);
    expect(isPublishedTrue(undefined)).toBe(false);
    expect(isPublishedTrue(false)).toBe(false);
  });

  it("rejects truthy strings, objects, and arrays", () => {
    expect(isPublishedTrue("yes")).toBe(false);
    expect(isPublishedTrue({})).toBe(false);
    expect(isPublishedTrue([])).toBe(false);
  });
});

describe("slugFromFilename (US-159)", () => {
  it("converts a snake_case markdown filename to kebab-case", () => {
    expect(slugFromFilename("Story_Editor.md")).toBe("story-editor");
  });

  it("converts a multi-word snake_case filename", () => {
    expect(slugFromFilename("AI_Shot_Generation.md")).toBe(
      "ai-shot-generation",
    );
  });

  it("handles a single-word filename", () => {
    expect(slugFromFilename("Storyboard.md")).toBe("storyboard");
  });

  it("strips a .mdx extension as well as .md", () => {
    expect(slugFromFilename("Storyboard.mdx")).toBe("storyboard");
  });

  it("lowercases mixed-case filenames", () => {
    expect(slugFromFilename("MixedCase.md")).toBe("mixedcase");
  });

  it("collapses runs of punctuation into single dashes", () => {
    expect(slugFromFilename("Story___Editor.md")).toBe("story-editor");
  });

  it("rejects an empty filename", () => {
    expect(() => slugFromFilename("")).toThrow(/non-empty/);
  });

  it("rejects a filename that produces an empty slug", () => {
    expect(() => slugFromFilename("---.md")).toThrow(/empty slug/);
  });
});

describe("escapeMdxUnsafeAngles (US-159 MDX compatibility)", () => {
  it("escapes `<1 s` to `&lt;1 s` (number after <)", () => {
    expect(escapeMdxUnsafeAngles("delivery (<1 s)")).toBe("delivery (&lt;1 s)");
  });

  it("escapes `<24 hours` to `&lt;24 hours`", () => {
    expect(escapeMdxUnsafeAngles("rotate <24 hours")).toBe(
      "rotate &lt;24 hours",
    );
  });

  it("escapes `<` followed by space", () => {
    expect(escapeMdxUnsafeAngles("a < b")).toBe("a &lt; b");
  });

  it("leaves `<Component>` JSX alone (letter after <)", () => {
    expect(escapeMdxUnsafeAngles("<Callout type=\"info\">hi</Callout>")).toBe(
      "<Callout type=\"info\">hi</Callout>",
    );
  });

  it("leaves HTML comments alone (`<!--`)", () => {
    expect(escapeMdxUnsafeAngles("<!-- regular comment -->")).toBe(
      "<!-- regular comment -->",
    );
  });

  it("leaves closing tags alone (`</foo>`)", () => {
    expect(escapeMdxUnsafeAngles("</Callout>")).toBe("</Callout>");
  });

  it("leaves `<$var>` style template starts alone", () => {
    expect(escapeMdxUnsafeAngles("<$placeholder>")).toBe("<$placeholder>");
  });

  it("leaves `<_underscore>` style starts alone", () => {
    expect(escapeMdxUnsafeAngles("<_internal>")).toBe("<_internal>");
  });
});

describe("renderFrontmatter (US-159 Boolean / number type fidelity)", () => {
  it("renders a Boolean true as a YAML Boolean, not a quoted string", () => {
    const out = renderFrontmatter({ published: true });
    expect(out).toContain("published: true");
    expect(out).not.toContain('published: "true"');
  });

  it("renders a Boolean false as a YAML Boolean", () => {
    const out = renderFrontmatter({ published: false });
    expect(out).toContain("published: false");
    expect(out).not.toContain('published: "false"');
  });

  it("round-trips a Boolean through gray-matter as the literal JS Boolean", () => {
    const md = renderFrontmatter({ published: true }) + "# Body\n";
    const parsed = matter(md);
    expect(parsed.data.published).toBe(true);
    expect(typeof parsed.data.published).toBe("boolean");
  });

  it("round-trips Boolean false through gray-matter as the literal JS Boolean", () => {
    const md = renderFrontmatter({ published: false }) + "# Body\n";
    const parsed = matter(md);
    expect(parsed.data.published).toBe(false);
    expect(typeof parsed.data.published).toBe("boolean");
  });

  it("keeps string values quoted (colon-safe)", () => {
    const out = renderFrontmatter({ title: "Privacy: Policy" });
    expect(out).toContain('title: "Privacy: Policy"');
  });

  it("renders finite numbers unquoted", () => {
    const out = renderFrontmatter({ version: 1 });
    expect(out).toContain("version: 1");
    expect(out).not.toContain('version: "1"');
  });

  it("skips undefined / null entries", () => {
    const out = renderFrontmatter({ title: "x", empty: undefined, nothing: null });
    expect(out).toContain("title:");
    expect(out).not.toContain("empty:");
    expect(out).not.toContain("nothing:");
  });
});

describe("stripMarketingSkipSections (US-159)", () => {
  it("removes a single marketing-skip block including the markers", () => {
    const md = [
      "# Story Editor",
      "",
      "Marketing copy.",
      "",
      "<!-- marketing-skip -->",
      "## User Stories",
      "",
      "- [US-049](../path)",
      "<!-- /marketing-skip -->",
      "",
      "More marketing copy.",
    ].join("\n");
    const out = stripMarketingSkipSections(md);
    expect(out).not.toContain("User Stories");
    expect(out).not.toContain("US-049");
    expect(out).not.toContain("marketing-skip");
    expect(out).toContain("Marketing copy.");
    expect(out).toContain("More marketing copy.");
  });

  it("removes multiple marketing-skip blocks", () => {
    const md = [
      "Visible 1.",
      "<!-- marketing-skip -->",
      "Hidden 1.",
      "<!-- /marketing-skip -->",
      "Visible 2.",
      "<!-- marketing-skip -->",
      "Hidden 2.",
      "<!-- /marketing-skip -->",
      "Visible 3.",
    ].join("\n");
    const out = stripMarketingSkipSections(md);
    expect(out).not.toContain("Hidden 1.");
    expect(out).not.toContain("Hidden 2.");
    expect(out).toContain("Visible 1.");
    expect(out).toContain("Visible 2.");
    expect(out).toContain("Visible 3.");
  });

  it("tolerates whitespace inside the markers", () => {
    const md = "Visible.\n<!--    marketing-skip   -->\nHidden.\n<!--   /marketing-skip   -->\nVisible.";
    const out = stripMarketingSkipSections(md);
    expect(out).not.toContain("Hidden.");
  });

  it("is non-greedy across multiple blocks", () => {
    const md = "<!-- marketing-skip -->A<!-- /marketing-skip -->Keep<!-- marketing-skip -->B<!-- /marketing-skip -->";
    const out = stripMarketingSkipSections(md);
    expect(out).toBe("Keep");
  });

  it("leaves ordinary HTML comments alone", () => {
    const md = "<!-- regular comment --> visible";
    expect(stripMarketingSkipSections(md)).toBe(md);
  });

  it("returns input unchanged when there are no marketing-skip blocks", () => {
    const md = "# Title\n\nBody.";
    expect(stripMarketingSkipSections(md)).toBe(md);
  });
});

/* ─── US-160 Help Book TOC ──────────────────────────────────────────────── */

describe("slugifyHeadingText (US-160)", () => {
  it("kebab-cases a heading with spaces", () => {
    expect(slugifyHeadingText("Adding Visuals")).toBe("adding-visuals");
  });

  it("lowercases mixed-case headings", () => {
    expect(slugifyHeadingText("File Structure Reference")).toBe(
      "file-structure-reference",
    );
  });

  it("collapses punctuation runs into single dashes", () => {
    expect(slugifyHeadingText("Updating, Help — Content")).toBe(
      "updating-help-content",
    );
  });

  it("trims leading and trailing dashes", () => {
    expect(slugifyHeadingText("  Purpose  ")).toBe("purpose");
  });

  it("returns empty for punctuation-only headings", () => {
    expect(slugifyHeadingText("---")).toBe("");
  });

  it("throws on a non-string input", () => {
    expect(() => slugifyHeadingText(42)).toThrow(/string/);
  });
});

describe("extractH2Toc (US-160)", () => {
  it("returns one entry per H2 in document order", () => {
    const md = [
      "# Help",
      "",
      "## Purpose",
      "",
      "Body.",
      "",
      "## Adding Visuals",
      "",
      "### 1. Prepare the image",
      "",
      "## Updating Help Content",
      "",
    ].join("\n");
    const toc = extractH2Toc(md);
    expect(toc).toEqual([
      { title: "Purpose", slug: "purpose" },
      { title: "Adding Visuals", slug: "adding-visuals" },
      { title: "Updating Help Content", slug: "updating-help-content" },
    ]);
  });

  it("ignores H1 and H3 lines", () => {
    const md = "# H1\n\n### H3\n\n## H2";
    expect(extractH2Toc(md)).toEqual([{ title: "H2", slug: "h2" }]);
  });

  it("suffixes a numeric counter on slug collision", () => {
    const md = ["## Setup", "", "## Setup", "", "## Setup"].join("\n");
    expect(extractH2Toc(md)).toEqual([
      { title: "Setup", slug: "setup" },
      { title: "Setup", slug: "setup-2" },
      { title: "Setup", slug: "setup-3" },
    ]);
  });

  it("returns [] when no H2 is present", () => {
    expect(extractH2Toc("# Only H1\n\nBody.")).toEqual([]);
  });

  it("skips an H2 whose title slugifies to empty", () => {
    const md = "## ---\n\n## Real Heading";
    expect(extractH2Toc(md)).toEqual([
      { title: "Real Heading", slug: "real-heading" },
    ]);
  });
});
