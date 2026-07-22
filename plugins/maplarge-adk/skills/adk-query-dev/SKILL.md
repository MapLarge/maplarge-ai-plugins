---
name: adk-query-dev
description: Guide Claude through MapLarge query authoring for ADK extensions with JSON-first output across front-end, API, and CLI paths, fluent API as a secondary option, and SQL-like syntax only when explicitly requested or clearly more appropriate.
---

# ADK Query Development

Use this skill whenever the user is building or editing MapLarge queries for an ADK extension, including client data access, Raptor-driven views, server endpoints, or shared query descriptors.

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

If the environment check reports that the installed CLI version is newer than the ADK project's CLI version, refresh the ADK project before query-focused build or run work:

```bash
maplarge adk update-version
maplarge adk init -profile <current-profile>
```

Then look for the nearest relevant schema, descriptor, or existing query JSON in the workspace before drafting a new query. Check likely extension paths first, such as `client/data/`, `client/layers/`, `client/view-models/`, and server code that returns query documents.

## Query rules

- Treat MapLarge JSON query documents as the canonical output format in most cases, including front-end code, requests sent through running server APIs, and CLI flows that accept query documents.
- The fluent API can be used when it better matches nearby code, but treat it as secondary to JSON unless the user asks for it.
- Use SQL-like syntax only when the user explicitly asks for SQL or when it is clearly more appropriate than JSON or the fluent API.
- If multiple forms are shown, present the JSON form first and label any fluent or SQL-like form as secondary.
- Do not switch to SQL just because the query is being executed through a REST endpoint, a pre-REST `/Remote/` action, or a CLI wrapper.
- Do not invent columns, functions, or table names. Ask for schema details when the workspace does not provide them.
- Prefer adapting nearby extension queries or descriptors over generating a query shape from scratch.
- Prefer the bundled lowercase `IQuery` patterns in `query-authoring.md` when no local example is available.
- Use `account/table` for active table paths. Treat `account/table/version` as a fixed version reference, and do not treat `_sq_...` subquery cache tables as durable schema.
- Treat any `take` value less than `1` as unbounded. `take: 0` does not mean "return zero rows".
- If the goal is only to inspect server-side table schema or check whether a column exists, prefer `systemContext.Database.GetExistingTable(...).GetColumnInfo()` over issuing a probe query.
- Do not run `tsc` directly to build or verify an ADK project while doing query work. Use `maplarge adk build` or other `maplarge adk ...` commands so ADK-generated config, declarations, and source-map outputs stay under CLI control.
- Treat ADK profiles as user-managed local state. Do not edit profile files or add or replace saved tokens without explicit user approval. If credentials must be supplied and password auth is sufficient, use `-user`/`-password` instead of a token.
- If the user explicitly asks to update the MapLarge CLI for the current ADK work, start with `dotnet tool install -g MapLargeInc.CLI` and then refresh each relevant ADK project with `maplarge adk update-version` and `maplarge adk init -profile <current-profile>`.
- When query work needs deploy guidance for a new ADK extension, use `maplarge adk deploy`; do not run a separate `package` step first unless the user asks for a package artifact.
- When query work needs package or deploy guidance, include `-i <component>` by default. Use `PRERELEASE` when the current version has a pre-release tag, otherwise use `PATCH` unless the user explicitly asks for `MINOR` or `MAJOR`. Never use bare `-i`, never manually edit `manifest.json` to change versions, and never use `-overwrite` unless explicitly instructed. Treat `-incrementVersion` as deprecated compatibility syntax.

## Documentation precedence

Prefer sources in this order:

1. bundled docs in `./docs/`
2. the relevant DocPortal docs under [docs.maplarge.com](https://docs.maplarge.com/dashboard/ext/docportal/portal)
3. helper-reported local repo docs or source, especially configured `core`, when marked available and relevant

Do not use the public `maplarge.com` developer pages as the source of truth for query behavior. Do not assume the user has any MapLarge source checkout. Do not infer local repo paths from sibling folders or parent directory names.

## Primary references

- [`../../docs/query-authoring.md`](../../docs/query-authoring.md)
- [`../../docs/server-api-access.md`](../../docs/server-api-access.md)
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md)
- [`../../docs/troubleshooting.md`](../../docs/troubleshooting.md)
- [`../../docs/getting-started.md`](../../docs/getting-started.md)
- [`../../docs/local-repo-context.md`](../../docs/local-repo-context.md)
- [`../../docs/internal/internal-mode.md`](../../docs/internal/internal-mode.md)
