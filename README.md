# framepath-site

Public marketing site for [FramePath](https://framepath.fi), the screenplay-to-shot-list app for filmmakers.

## Status

Sprint 28 placeholder. The Vivid Labs Next.js template, hand-authored hero / features / footer, and the content-sync pipeline land across Epic 30 (US-154 through US-162).

## Authoring model

Authored content lives in the private development repository [`mputaala/Frame`](https://github.com/mputaala/Frame) under `Documentation/`. An allowlisted slice is pulled into this repo on merges to the dev repo's `main` branch via the cross-repo dispatch wiring landed in US-155, transformed to MDX by `scripts/sync-content.mjs` (US-156 onwards), and rendered through the Next.js static export.

**Direction of trust:** the dev repo holds a dispatch-only token for this repo; this repo holds a read-only fine-grained token for the dev repo, scoped to the four allowlisted paths only. Neither side can write to the other.

## Local development

Not applicable in this Sprint 28 placeholder. The Next.js scaffold lands in US-154.

## Deploy

Hosted on GitHub Pages from the `main` branch via `.github/workflows/deploy.yml`. Custom domain via `CNAME` + DNS at the registrar.
