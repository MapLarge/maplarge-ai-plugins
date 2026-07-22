---
name: adk-raptor-dev
description: Guide Claude through Raptor dashboard, page, layout, layer, chart, route, and view-model work for MapLarge ADK extensions.
---

# ADK Raptor Development

Use this skill whenever the user is building or editing a dashboard, page, layout, view model, route, dialog, chart, or layer for an ADK extension.

## Grounding

Run the bundled helpers from the plugin root. `${CLAUDE_PLUGIN_ROOT}` is set by Claude Code when the skill runs:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect_maplarge_workspace.mjs --cwd "$PWD"
node ${CLAUDE_PLUGIN_ROOT}/scripts/check_adk_environment.mjs --cwd "$PWD"
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
- Use Roboto typography. Do not introduce or import non-Roboto font families.
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
- When Raptor work needs deploy guidance for a new ADK extension, use `maplarge adk deploy`; do not run a separate `package` step first unless the user asks for a package artifact.
- When Raptor work needs package or deploy guidance, include `-i <component>` by default. Use `PRERELEASE` when the current version has a pre-release tag, otherwise use `PATCH` unless the user explicitly asks for `MINOR` or `MAJOR`. Never use bare `-i`, never manually edit `manifest.json` to change versions, and never use `-overwrite` unless explicitly instructed. Treat `-incrementVersion` as deprecated compatibility syntax.

## Documentation precedence

Prefer sources in this order:

1. bundled docs in `./docs/`
2. published docs under [docs.maplarge.com](https://docs.maplarge.com/dashboard/ext/docportal/portal)
3. helper-reported local repo docs or source only when marked available and relevant

Do not assume the user has any MapLarge source checkout. Do not infer local repo paths from sibling folders or parent directory names.

## Primary references

- [`../../docs/raptor-dashboard-patterns.md`](../../docs/raptor-dashboard-patterns.md)
- [`../../docs/raptor-cookbook.md`](../../docs/raptor-cookbook.md)
- [`../../docs/mockups.md`](../../docs/mockups.md)
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md)
- [`../../docs/troubleshooting.md`](../../docs/troubleshooting.md)
- [`../../docs/getting-started.md`](../../docs/getting-started.md)
- [`../../docs/local-repo-context.md`](../../docs/local-repo-context.md)
- [`../../docs/internal/internal-mode.md`](../../docs/internal/internal-mode.md)
