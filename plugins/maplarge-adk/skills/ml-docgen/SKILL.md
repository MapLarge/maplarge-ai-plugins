---
name: ml-docgen
description: Work on or run "ml-docgen", the MapLarge ADK config-documentation generator. It produces a Swagger-style reference (Markdown + self-contained HTML) for an extension's config.json, built from the extension's TypeScript config interfaces and real config.json examples. Use when extending/debugging the tool, adding it to a new repo or location, regenerating extension config docs, or onboarding a new ADK extension into it. The tool is a standalone Node/TypeScript CLI that can be checked out at any path; locate it by its package.json name "ml-docgen".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "ml-docgen CLI @ 2026-08 import baseline; manifest Config-block claims re-verified against live ADK extension repos 2026-09-09 (ARC-51)"
---

# ml-docgen

A standalone Node + TypeScript CLI that generates a per-extension **configuration reference**
(`config-reference.md` + self-contained `config-reference.html`) for MapLarge ADK extensions,
derived from the extension's TypeScript config types and its actual `config.json`. This skill
covers running the tool, onboarding an extension into it, and changing the tool itself. It does
not cover authoring the extension's `config.json`, schema, or manifest (that is `adk-extension-dev`),
deploying the extension afterward (`deploy-extension`), or what the config values mean to the
server at runtime.

Read `reference/ml-docgen-reference.md` (relative to this skill folder) for the full architecture, algorithms, and design
decisions before making non-trivial changes. This file is the quick orientation.

## Where it lives

- It is a standalone Node/TypeScript CLI, distributed independently of any one extension
  workspace and checked out at whatever path your team keeps it (often a `tools/` subfolder).
  Don't assume a fixed path — locate it by its `package.json` (`"name": "ml-docgen"`).
- It is decoupled from any one extension — it builds its own TypeScript `Program` from the
  **consuming repo's root `tsconfig.json`**, so it must run from inside a checkout of an ADK
  extensions repo (the one with `extensions/<Name>/...` and a root `tsconfig.json`).

## Quickstart

```bash
cd <tool-dir>            # wherever ml-docgen is checked out
npm install              # once (only dep tree: typescript + tsx)
npm run ml-docgen -- MyExtension         # one extension
npm run ml-docgen -- Reports Inventory   # several
npm run ml-docgen -- --all               # every extension with a manifest
```

In CI: `npm ci && npm run ml-docgen -- --all`. Non-interactive; exits non-zero on failure.

Output is written to `extensions/<Name>/docs/config-reference.{md,html}` so it packages with
the extension.

## Examples

- "The config docs for Reports are stale, regenerate them" →
  `cd <tool-dir>` then `npm run ml-docgen -- Reports`. The files land in
  `extensions/Reports/docs/config-reference.{md,html}`; never hand-edit them, they are derived output.
- "Onboard the new Inventory extension into the config docs" → add
  `"Config": { ..., "DocRootType": "IInventoryConfig" }` to `extensions/Inventory/manifest.json`
  (matching the literal root shape of its config.json), then `npm run ml-docgen -- Inventory`.
- "I added JSDoc to a shared config interface but the dependent extension's docs don't show it" →
  rebuild the owning extension first (`maplarge adk build`) so `.adk/types.d/_<Ext>.d.ts`
  regenerates, then rerun ml-docgen for the dependent.

## How an extension opts in

In `extensions/<Name>/manifest.json`:

```json
"Config": { "PathToConfig": "config/config.json", "PathToSchema": "config/config.schema.json", "DocRootType": "IMyExtensionConfig" }
```

`DocRootType` must name the interface whose shape matches the **root of config.json** — note
this can be a wrapper object (e.g. `{ MyExt: IMyExtConfig }`), not the inner interface. Falls
back to the convention `I<Name without punctuation>Config` if omitted.

## Module map (src/)

- `index.ts` — CLI: arg parsing, build Program once, per-extension generate, write files.
- `manifest.ts` — read manifest, resolve `DocRootType` + transitive dependencies.
- `extract.ts` — TS Compiler API: find root type, traverse fields, JSDoc/`//` comments,
  scope rules, subtype index, model dedup.
- `outline.ts` — containment tree + "Shared Types" forest for nav/index ordering.
- `examples.ts` — parallel walk of config.json + type tree to attach real examples.
- `render.ts` — Markdown and self-contained HTML renderers (nav, sections, CSS, script).
- `model.ts` — the IR (`DocModel` / `DocType` / `DocField`).

## Top gotchas

- **Stale `.d.ts`:** dependency-extension types resolve to the ADK-generated
  `.adk/types.d/_<Ext>.d.ts`, which is only refreshed by a build (`mlcomp` / `maplarge adk
  build`). New JSDoc on a shared/dependency type won't appear in a *dependent's* docs until
  that file regenerates. Own-extension types reflect source immediately.
- **`//` comments are stripped** from generated `.d.ts`; only `/** */` JSDoc survives. Prefer
  JSDoc on shared config interfaces.
- Comment fidelity, scope (which types expand vs stay opaque), subtypes, and the Shared Types
  rule all have specific logic — when a type or comment you expected is missing or misplaced in
  the output, read `reference/ml-docgen-reference.md` before patching the tool.
