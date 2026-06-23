# Contributing to `framepath-site`

The public marketing site for [FramePath](https://framepath.fi). Authoring is via Markdown in the private dev repo (`mputaala/Frame`); the site is a Next.js static export driven by `scripts/sync-content.mjs` that pulls an allowlisted slice of the dev repo at build time. This document records the in-repo conventions that aren't enforced automatically.

## Action SHA pinning is mandatory

Every third-party GitHub Action referenced from a workflow under `.github/workflows/` **must be pinned to a commit SHA**, never a tag or branch name. The pinning SHA is recorded alongside the action invocation in a comment that names the resolved tag.

**Allowed**:

```yaml
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0  # v7.0.0
```

**Not allowed**:

```yaml
- uses: actions/checkout@v7
- uses: actions/checkout@main
- uses: actions/checkout@v7.0.0  # tag references can be retroactively moved
```

The pin guards against an upstream tag being silently re-pointed (e.g., a maintainer retagging `v7` after a compromised commit lands in the action's repo). The exit cost of pinning is one extra line of comment; the entry cost of a tag-pinned compromise is everything in `permissions:` for the affected workflow.

Dependabot is configured to open weekly PRs against `github-actions` — when a PR proposes a bump, the SHA in the comment moves with it. Review the diff before merging.

This rule applies equally to the dev repo's `mputaala/Frame/.github/workflows/sync-trigger.yml` and to any future workflows added here.

## Workflow `permissions:` must be explicit and minimum

Every workflow declares a top-level `permissions:` block. The default `GITHUB_TOKEN` scope dropped to `contents: read` in 2023-02; any other capability must be requested explicitly. The current matrix:

| Workflow | Top-level `permissions:` | Why |
|---|---|---|
| `.github/workflows/publish.yml` | `{ contents: read, pages: write, id-token: write }` | Deploys to GitHub Pages; OIDC for the Pages deploy. |
| `.github/workflows/lighthouse.yml` | `{ contents: read, pull-requests: write }` | Posts a Lighthouse summary as a PR comment. |

If a new workflow needs an elevated permission, declare it at the **job** level rather than the workflow level when only one job needs it. Per-job elevation limits blast radius if the workflow gains additional jobs later.

## Branch protection invariants

`main` is protected. The current rules:

- Pull requests required (`required_approving_review_count: 0` for the solo developer; rule is still a PR-shape gate).
- Linear history enforced. Use `gh pr merge --rebase` (or the GitHub UI's "Rebase and merge").
- Force pushes disabled.
- Deletions disabled.
- `build` and `deploy` from `publish.yml` are required status checks.
- `lighthouse-ci` from `lighthouse.yml` is a required status check (US-157).

Changing branch protection is done via the GitHub UI or the `repos/{owner}/{repo}/branches/main/protection` API. Record any change in the Sprint Log of the active sprint.

## Local development quickstart

```bash
# Mirror what the deploy workflow does: sync the dev-repo content first,
# then build the static export.
ln -s /path/to/your/clone/of/Frame dev-content   # one-time symlink
node scripts/sync-content.mjs --dev-repo dev-content
npm ci
npm run build
npx serve out -l 4173
```

`content/` and `dev-content` are in `.gitignore` — never commit either. The dev-repo content is the single source of truth.

## Adding a new MDX surface

When a future story (US-159, US-160, …) adds a new source kind to the allowlist:

1. Add the entry to `config/sync-allowlist.json` with `id` / `source` / `kind` / `destination` / `notes`.
2. Register the new `kind` in `scripts/sync-content.mjs` (`KIND_HANDLERS` map).
3. Cover the new transform's path-validation + edge cases with vitest tests in `scripts/__tests__/sync-content.test.mjs`.
4. If the surface uses any MDX component not yet in the whitelist, register it in `src/components/mdx/index.ts`. Do not allow arbitrary JSX through; the whitelist is the security boundary for authored Markdown.
5. Add page-weight budgets to `budgets.json` for the new route and document the rationale in the PR description.
