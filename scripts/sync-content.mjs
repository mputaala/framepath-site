#!/usr/bin/env node
// US-155 / Sprint 28 — sync-content stub.
//
// Loads config/sync-allowlist.json from the site repo, resolves each entry's
// 'source' against the dev-repo checkout root, asserts that no entry contains
// '..' or resolves outside the dev-repo root, and LOGS what would be copied.
// Does NOT yet copy anything — the actual transform-and-write steps land in
// US-156 (policies), US-158 (screenshots), US-159 (features), US-160 (help).
//
// Usage:
//   node scripts/sync-content.mjs --dev-repo <path-to-dev-repo-checkout>
//
// Exit codes:
//   0 — every allowlist entry resolved cleanly inside the dev-repo root.
//   1 — at least one entry failed the path-traversal / outside-root guard.
//   2 — CLI usage error or allowlist file unreadable.

import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);
const SITE_REPO_ROOT = resolve(THIS_FILE, "..", "..");
const ALLOWLIST_PATH = resolve(SITE_REPO_ROOT, "config", "sync-allowlist.json");

/**
 * Resolve an allowlist 'source' against a dev-repo root, asserting that the
 * result stays strictly inside the root.
 *
 * The two guards are independent and both required:
 *   1. A '..' segment anywhere in the input string is rejected outright,
 *      even if the resolved path happens to land inside the root. This
 *      catches inputs like 'subdir/../allowed' that look benign but rely
 *      on path-traversal semantics.
 *   2. After resolve(), the candidate must be the root itself or sit under
 *      `root + path.sep`. Comparing with the separator suffix prevents
 *      cousin-directory escapes like `/dev-content-evil/secret` slipping
 *      past a root of `/dev-content`.
 *
 * @param {string} devRepoRoot Absolute path to the checked-out dev repo.
 * @param {string} source Allowlist entry's 'source' field (repo-relative).
 * @returns {string} The absolute resolved path.
 * @throws {Error} If the source contains '..' or resolves outside the root.
 */
export const resolveSourcePath = (devRepoRoot, source) => {
  if (typeof source !== "string" || source.length === 0) {
    throw new Error("allowlist 'source' must be a non-empty string");
  }
  if (source.includes("..")) {
    throw new Error(`allowlist 'source' contains '..' (rejected): ${source}`);
  }
  const absoluteRoot = resolve(devRepoRoot);
  const candidate = resolve(absoluteRoot, source);
  if (
    candidate !== absoluteRoot &&
    !candidate.startsWith(absoluteRoot + sep)
  ) {
    throw new Error(
      `allowlist 'source' resolves outside dev-repo root (rejected): ${source} -> ${candidate}`,
    );
  }
  return candidate;
};

const parseArgs = (argv) => {
  const i = argv.indexOf("--dev-repo");
  if (i < 0 || !argv[i + 1]) {
    throw new Error("usage: sync-content.mjs --dev-repo <path>");
  }
  return { devRepoRoot: resolve(argv[i + 1]) };
};

const main = async (argv) => {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  let allowlist;
  try {
    const raw = await readFile(ALLOWLIST_PATH, "utf8");
    allowlist = JSON.parse(raw);
  } catch (err) {
    console.error(`failed to load ${ALLOWLIST_PATH}: ${err.message}`);
    process.exit(2);
  }

  const sources = Array.isArray(allowlist.sources) ? allowlist.sources : [];
  if (sources.length === 0) {
    console.error("allowlist must have a non-empty 'sources' array");
    process.exit(2);
  }

  console.log(`sync-content: stub run (US-155).`);
  console.log(`  dev-repo root: ${opts.devRepoRoot}`);
  console.log(`  allowlist:     ${ALLOWLIST_PATH}`);
  console.log(`  sources:       ${sources.length}`);

  let hadFailure = false;
  for (const entry of sources) {
    const label = entry.id ?? entry.source ?? "(unlabelled)";
    try {
      const resolved = resolveSourcePath(opts.devRepoRoot, entry.source);
      console.log(`  PERMIT ${label}: ${entry.source} -> ${resolved}`);
    } catch (err) {
      console.error(`  REJECT ${label}: ${err.message}`);
      hadFailure = true;
    }
  }

  if (hadFailure) {
    process.exit(1);
  }
  console.log("sync-content stub complete — nothing copied. US-156 onwards lands the actual transforms.");
};

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === THIS_FILE;
if (invokedAsScript) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err.stack ?? err.message ?? err);
    process.exit(1);
  });
}
