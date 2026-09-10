---
name: adk-raptor-dev
description: Raptor dashboard, page, layout, layer, chart, route, dialog, and view-model work for MapLarge ADK extensions. Use when building or editing extension dashboard UI, wiring routes and pages, or composing view models. Triggers on "dashboard", "raptor page", "view model", "layout", "route", "dialog", "layer", "RSScriptor", "/adk-raptor-dev".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "MapLarge ADK CLI 1.0.90 (new/run/package/deploy flags) verified live 2026-09-09 (ARC-44); Raptor patterns @ 2026-08 import baseline"
---

# ADK Raptor Development

Covers composing Raptor dashboard UI in ADK extensions: pages, layouts, routes, view models,
dialogs, layers, and wiring charts into views. It excludes per-control and per-chart option
detail - the `raptor` skill owns the control catalog and binding reference, and the `echarts`
skill owns chart series and option shapes - as well as the queries feeding the UI
(`adk-query-dev`) and the project build/deploy workflow beyond the rules below
(`adk-extension-dev`).

## Grounding

Run the bundled helpers from the plugin root. Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`):

```bash
node <plugin-root>/scripts/detect_maplarge_workspace.mjs --cwd "$PWD"
node <plugin-root>/scripts/check_adk_environment.mjs --cwd "$PWD"
```

Use the JSON output to confirm whether the user is in:

- an ADK project
- an extension repo
- a generic folder

If the environment check reports that the installed CLI version is newer than the ADK project's CLI version, refresh the ADK project before page, route, or run/debug work:

```bash
maplarge adk update-version
maplarge adk init -profile <current-profile>
```

Then look for the nearest module entrypoint, layout, page, view-model, and layer files before drafting a new dashboard structure.

## What to Inspect First

For coding tasks in an existing extension, inspect in this order:

1. `client/home.ts` for dashboard registration, routes, pages, and model keys
2. existing `client/views/**` files for local RSScriptor style
3. existing `client/view-models/**` files for state/update patterns
4. `manifest.json` for extension name and registered resources
5. configured core source only when behavior is unclear

## Raptor rules

- Treat bundled dashboard and route patterns as the default baseline for new code.
- Build dashboard UI with Raptor primitives first: layouts, pages, view models, bindings, charts, DataGrid, dialogs, layers, and platform classes.
- Avoid custom layout systems, injected HTML, and broad CSS. Add custom CSS only for small gaps that Raptor or platform classes do not cover.
- Preserve MapLarge dashboard chrome, spacing, and interaction patterns unless the user explicitly authorizes a different direction.
- Use Roboto typography. Do not introduce or import non-Roboto font families — the platform chrome renders in Roboto, so a foreign family makes the extension read as un-themed inside the product and drifts from every neighboring dashboard.
- Keep dashboard setup close to the module entrypoint.
- Prefer CLI component templates for new Raptor pages and view models when available, then wire them into the local module pattern.
- Add layouts before pages and pages before view models.
- For feasibility questions, distinguish work possible in existing dashboard/editor controls from work that needs a custom ADK extension.
- For async chart data, remember that `traverseRaptorChart` is initial-render oriented; update the chart instance after data arrives.
- For DataGrid rows with actions, colors, or computed labels, prefer a custom row view model over ad hoc view logic.
- For dynamic colors, bind `attr.style` to a view-model string when boolean style bindings are too limited.
- For table metadata, reuse existing server-cache helpers or local extension patterns before adding new API calls.
- For dashboard date/time work, prefer Luxon. Use `import { DateTime } from "luxon"` in new module-based TypeScript, use `ml.luxon.DateTime` in legacy namespaced code, older ADK projects, or existing Raptor examples, apply user timezone/preferences for display, and treat Moment as legacy interop only.
- Use published docs for API coverage, but keep generated code aligned with the bundled ADK patterns in this plugin.
- When local extension code exists, use it only as supplemental context, not as a required dependency.
- Do not run `tsc` directly to build or verify an ADK project during Raptor work. Use `maplarge adk build`, `maplarge adk run`, `maplarge adk package`, or `maplarge adk deploy` so ADK-managed TypeScript outputs are generated in the expected locations.
- Treat ADK profiles as user-managed local state. Do not edit profile files or add or replace saved tokens without explicit user approval. If credentials must be supplied and password auth is sufficient, use `-user`/`-password` instead of a token.
- If the user explicitly asks to update the MapLarge CLI for the current ADK work, start with `dotnet tool install -g MapLargeInc.CLI` and then refresh each relevant ADK project with `maplarge adk update-version` and `maplarge adk init -profile <current-profile>`.
- When Raptor work needs deploy guidance for a new ADK extension, use `maplarge adk deploy`; do not run a separate `package` step first unless the user asks for a package artifact — deploy packages internally, so a standalone package run just produces a second artifact that can drift from what actually shipped.
- When Raptor work needs package or deploy guidance, include `-i <component>` by default so the output gets a deliberate version increment. Use `PRERELEASE` when the current version has a pre-release tag, otherwise use `PATCH` unless the user explicitly asks for `MINOR` or `MAJOR`. Never use bare `-i` (the CLI needs the component to know which part to bump), never manually edit `manifest.json` to change versions (it desynchronizes the server-installed-version comparison), and never use `-overwrite` unless explicitly instructed. `-incrementVersion` is the long-form alias of `-i`; prefer the short form.

## Documentation precedence

Prefer sources in this order:

1. bundled docs in `./docs/`
2. published docs under [docs.maplarge.com](https://docs.maplarge.com/dashboard/ext/docportal/portal)
3. helper-reported local repo docs or source only when marked available and relevant

Do not assume the user has any MapLarge source checkout. Do not infer local repo paths from sibling folders or parent directory names.

## Examples

- "Add a fleet-status page to my dashboard" → scaffold with the CLI where templates exist
  (`maplarge adk new component ...`), register the route and page in `client/home.ts`, add the
  layout, then the page, then its view model, all with Raptor primitives — no hand-rolled HTML
  layout or broad CSS.
- "The chart renders empty until I click something" → `traverseRaptorChart` binds at initial
  render; when data arrives async, update the chart instance after the fetch resolves rather
  than re-traversing or forcing a full page refresh.
- "Build it so I can check the page" → `maplarge adk run` (local URL is usually
  `https://localhost:8443`), never a direct `tsc` — the CLI owns TypeScript outputs, declarations,
  and source maps, and a raw `tsc` run scatters them where the ADK server will not pick them up.

## Primary references

Read these when the task reaches their topic; skip them otherwise:

- [`../../docs/raptor-dashboard-patterns.md`](../../docs/raptor-dashboard-patterns.md) — before drafting any new dashboard structure (registration, routes, model keys).
- [`../../docs/raptor-cookbook.md`](../../docs/raptor-cookbook.md) — when a specific composition (dialog flows, grid actions, layer wiring) needs a worked pattern.
- [`../../docs/mockups.md`](../../docs/mockups.md) — when translating a visual mockup into Raptor structure.
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md) — when bundled docs and observed behavior disagree.
- [`../../docs/troubleshooting.md`](../../docs/troubleshooting.md) — when a build or run fails with an unexplained error.
- [`../../docs/getting-started.md`](../../docs/getting-started.md) — only when the surrounding ADK setup is itself in question.
- [`../../docs/local-repo-context.md`](../../docs/local-repo-context.md) — only when the user has MapLarge source checkouts wired in.
- [`../../docs/internal/internal-mode.md`](../../docs/internal/internal-mode.md) — only when the user explicitly enables internal mode (MapLarge employees).

## Hand-offs

- Which control to use and its exact bindings or options: use the `raptor` skill's control catalog.
- Chart series shapes, ECharts options, or chart debugging beyond wiring: use the `echarts` skill.
- The query feeding the view: use `adk-query-dev`.
- Build, package, deploy, or CLI/project versioning beyond the rules above: use `adk-extension-dev`.
