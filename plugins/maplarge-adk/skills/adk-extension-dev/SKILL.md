---
name: adk-extension-dev
description: Guide Claude through MapLarge ADK project setup, extension authoring, build/run, and package/deploy workflows without assuming a fixed local repo layout.
---

# MapLarge ADK Extension Development

Use this skill whenever the user is working on a MapLarge ADK project, a standalone extension repo, or asking how to create, build, run, package, or deploy an ADK extension.

## Grounding

Run the bundled helpers from the plugin root. `${CLAUDE_PLUGIN_ROOT}` is set by Claude Code when the skill runs:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect_maplarge_workspace.mjs --cwd "$PWD"
node ${CLAUDE_PLUGIN_ROOT}/scripts/check_adk_environment.mjs --cwd "$PWD"
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
- For `maplarge adk package` and `maplarge adk deploy`, include `-i <component>` by default so output gets an incremented version. Use `PRERELEASE` when the current version has a pre-release tag, otherwise use `PATCH` unless the user explicitly asks for `MINOR` or `MAJOR`. Never use bare `-i`.
- Do not manually edit `manifest.json` to change versions. Never use `-overwrite` unless the user explicitly instructs you to overwrite an existing version. Treat omitting `-i <component>` as an explicit exception, not the normal workflow. Treat `-incrementVersion` as deprecated compatibility syntax; prefer `-i <component>`.
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
- When the task is primarily about authoring or debugging a MapLarge query document, use `adk-query-dev` instead of handling query design here.
- When the task is primarily about dashboards, layouts, pages, routes, charts, dialogs, or layers, use `adk-raptor-dev` instead of handling UI composition here.
- When the task is primarily about table design, sample data, account/profile selection, or schema verification, use `adk-data-dev`.

## Primary references

- [`../../docs/getting-started.md`](../../docs/getting-started.md)
- [`../../docs/workspace-detection.md`](../../docs/workspace-detection.md)
- [`../../docs/adk-workflows.md`](../../docs/adk-workflows.md)
- [`../../docs/extension-reference.md`](../../docs/extension-reference.md)
- [`../../docs/raptor-dashboard-patterns.md`](../../docs/raptor-dashboard-patterns.md)
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md)
- [`../../docs/troubleshooting.md`](../../docs/troubleshooting.md)
- [`../../docs/local-repo-context.md`](../../docs/local-repo-context.md)
- [`../../docs/internal/internal-mode.md`](../../docs/internal/internal-mode.md)
