---
name: adk-extension-dev
description: MapLarge ADK project setup, extension authoring, build/run, and package/deploy workflows without assuming a fixed local repo layout. Use when working on an ADK project or standalone extension repo, or when asked how to create, build, run, package, or deploy an ADK extension. Triggers on "adk project", "new extension", "maplarge adk build", "adk run", "package extension", "deploy extension", "update-version", "/adk-extension-dev".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "MapLarge ADK CLI 1.0.90 (adk new subcommands, package/deploy flags, update-version, run) verified live 2026-09-09 (ARC-42); server-side lifecycle/schema patterns @ 2026-08 import baseline"
---

# MapLarge ADK Extension Development

Covers the MapLarge ADK project workflow end to end: workspace grounding, project and extension
scaffolding, build and local run, versioning, and package/deploy via the CLI. It excludes the
inside of the work itself: query authoring belongs to `adk-query-dev`, UI composition (pages,
layouts, charts, dialogs) to `adk-raptor-dev`, table and sample-data design to `adk-data-dev`,
and config-preserving redeploys of installed extensions to `deploy-extension`.

## Grounding

Run the bundled helpers from the plugin root. Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`):

```bash
node <plugin-root>/scripts/detect_maplarge_workspace.mjs --cwd "$PWD"
node <plugin-root>/scripts/check_adk_environment.mjs --cwd "$PWD"
```

Use the JSON output to decide whether the user is in:

- an ADK project
- an extension repo
- a generic folder

If the environment check reports a CLI/project version mismatch for an ADK project, refresh that project with:

```bash
maplarge adk update-version
maplarge adk init -profile <current-profile>
```

If the user explicitly asks to update the MapLarge CLI, start with:

```bash
dotnet tool install -g MapLargeInc.CLI
```

Then refresh each relevant ADK project. If the global install reports that the current version was already installed, still run the project refresh steps for any ADK project whose reported CLI version is older than the installed CLI.

## Documentation precedence

Prefer sources in this order:

1. bundled docs in `./docs/`
2. published docs under [docs.maplarge.com](https://docs.maplarge.com/dashboard/ext/docportal/portal)
3. helper-reported local repo docs or source only when marked available and relevant

Do not assume the user has any MapLarge source checkout. Do not infer local repo paths from sibling folders or parent directory names.

Browse live docs when:

- CLI behavior, default ports, or current command flags are uncertain
- local bundled docs do not mention a default or error
- user asks whether docs/plugin guidance is accurate
- generated code depends on APIs not present in local examples

## Workflow rules

- Prefer current CLI syntax: `maplarge adk new project`, `maplarge adk new p`, `maplarge adk new extension`, `maplarge adk new e`, `maplarge adk new ext`, `maplarge adk new component`, `maplarge adk new c`, `maplarge adk new feature`, and `maplarge adk new f`.
- Treat `maplarge adk create-project` and `maplarge adk create-extension` as legacy compatibility commands only.
- Treat `.adk/` as the strongest signal that a folder is an ADK project root.
- Do not run `tsc` directly to build an ADK project. Use MapLarge CLI commands such as `maplarge adk build`, `maplarge adk run`, `maplarge adk package`, or `maplarge adk deploy` so ADK-managed build configuration and artifacts stay in the expected locations.
- Treat ADK profiles as user-managed local state. Do not edit profile files or add or replace saved tokens without explicit user approval. If credentials must be supplied and password auth is sufficient, use `-user`/`-password` instead of a token.
- For CLI upgrade requests on relevant ADK projects, run `dotnet tool install -g MapLargeInc.CLI`, then `maplarge adk update-version`, then `maplarge adk init -profile <current-profile>`.
- If the installed CLI version is newer than the ADK project's CLI version, run `maplarge adk update-version` and then re-run `maplarge adk init` with the current profile even when the global install step was already done earlier.
- To deploy a new ADK extension, use `maplarge adk deploy`; do not run a separate `package` step first unless the user asks for a package artifact.
- For `maplarge adk package` and `maplarge adk deploy`, include `-i <component>` by default so output gets an incremented version. Use `PRERELEASE` when the current version has a pre-release tag, otherwise use `PATCH` unless the user explicitly asks for `MINOR` or `MAJOR`. Never use bare `-i` — the CLI needs the component to know which part to bump.
- Do not manually edit `manifest.json` to change versions — the CLI derives the next version from what the server reports (`-seedVersion SERVER_INSTALLED` + `-i`), and a hand-edited manifest desynchronizes that comparison so later deploys mis-version. Never use `-overwrite` unless the user explicitly instructs you to overwrite an existing archive; silently replacing an already-built package hides versioning mistakes. Treat omitting `-i <component>` as an explicit exception, not the normal workflow. `-incrementVersion` is the same option as `-i`; prefer the short form for consistency with the examples below.
- If the user is in an extension repo without `.adk/`, explain that packaging and `adk run` usually require working from an ADK project root.
- When giving browser URLs, distinguish local `maplarge adk run` URLs, usually `https://localhost:8443`, from configured remote or deployed extension URLs; do not infer local run URLs from `maplarge adk config`.
- When redeploying an installed extension with user-managed config, preserve the full extension config object before deploy and restore it after install when the target server exposes a documented config API.
- For stale builds, clean only the affected `.adk/.build/<extension>/` cache and rebuild with `maplarge adk build`; refresh `.adk/lib/` and `.adk/types.d/` with `maplarge adk init`.
- Use `-localServerRoot` guidance only when local repo context is available or the user explicitly wants source-based internal setup.
- Prefer `maplarge adk new component` or `maplarge adk new feature` when the CLI/templates can scaffold the requested work.
- Keep default guidance customer-safe. Internal-only guidance should be clearly labeled.
- For runtime-configured target tables, do not rely only on manifest `CreateTables`. Prefer `systemContext.Database.GetExistingTable("<account>/<table>").GetColumnInfo()` for lightweight schema inspection, and use `TableBuilderProvider.GetMultiTableBuilder(...).CreateFixedSchemaTableBuilder(...).Flush()` for additive schema migration when a required column is missing.
- Prefer schema inspection over probe queries when checking whether a column exists, especially on connector startup paths.
- Run install/update/config-change schema enforcement in lifecycle handlers. In `core`, the relevant events are `LifeCycleEvents.Installed` and `LifeCycleEvents.ConfigUpdated`; use `LifeCycleEvents.ServerStartup` only when the extension must re-verify schema on boot.
- Fail fast when a required schema element is still missing after migration instead of continuing with degraded behavior.

## Examples

- "Create a Reports extension in my ADK project and put it on the dev server" →
  `maplarge adk new extension Reports`, implement, then
  `maplarge adk deploy -e Reports -profile dev -i PATCH -install`.
  No separate `package` step, no bare `-i`, no `-overwrite`, and no direct `tsc` anywhere in the
  chain. Add `-seedVersion SERVER_INSTALLED` only on redeploys, where the server has an installed
  version to look up.
- "I updated the MapLarge CLI; my project now warns about a version mismatch" →
  `dotnet tool install -g MapLargeInc.CLI`, then in each affected project
  `maplarge adk update-version` followed by `maplarge adk init -profile <current-profile>`.
  Both project steps run even if the global install reported the version was already current.
- "Package Reports for a customer drop, it has a pre-release tag" →
  `maplarge adk package -e Reports -i PRERELEASE -outputFolder ./dist` — `PRERELEASE` because the
  current version carries a pre-release tag; `PATCH` would jump it to a release version.

## Primary references

Read these when the task reaches their topic; skip them otherwise:

- [`../../docs/getting-started.md`](../../docs/getting-started.md) — first contact with a machine that has never run the ADK.
- [`../../docs/workspace-detection.md`](../../docs/workspace-detection.md) — when the grounding scripts' JSON output needs interpreting.
- [`../../docs/adk-workflows.md`](../../docs/adk-workflows.md) — before running a multi-step workflow (new project, run, package, deploy) you have not done this session.
- [`../../docs/extension-reference.md`](../../docs/extension-reference.md) — when touching `manifest.json` fields or extension folder layout.
- [`../../docs/raptor-dashboard-patterns.md`](../../docs/raptor-dashboard-patterns.md) — only for quick orientation before handing UI work to `adk-raptor-dev`.
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md) — when bundled docs and live behavior disagree.
- [`../../docs/troubleshooting.md`](../../docs/troubleshooting.md) — when a CLI command fails with an error the rules above do not explain.
- [`../../docs/local-repo-context.md`](../../docs/local-repo-context.md) — only when the user has MapLarge source checkouts and wants them wired in.
- [`../../docs/internal/internal-mode.md`](../../docs/internal/internal-mode.md) — only when the user explicitly enables internal mode (MapLarge employees).

## Hand-offs

- Authoring or debugging a MapLarge query document: use `adk-query-dev`.
- Dashboards, layouts, pages, routes, charts, dialogs, or layers: use `adk-raptor-dev`.
- Table design, sample data, account/profile selection, or schema verification: use `adk-data-dev`.
- Redeploying an installed extension whose server-side config must survive: use `deploy-extension`.
