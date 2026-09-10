---
name: adk-query-dev
description: MapLarge query authoring for ADK extensions with JSON-first output across front-end, API, and CLI paths, fluent API as a secondary option, and SQL-like syntax only when explicitly requested or clearly more appropriate. Use when building or editing MapLarge queries, query descriptors, or extension data access code. Triggers on "maplarge query", "query document", "IQuery", "query descriptor", "query json", "take", "/adk-query-dev".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "MapLarge Server 4.139 (docs host) 2026-09-09: /restapi/v1/queries/result JSON documents + take<=0 unbounded verified live (ARC-43); ADK CLI 1.0.90"
---

# ADK Query Development

Covers authoring and debugging MapLarge queries for ADK extensions: JSON query documents,
the fluent API, SQL-like syntax, and where each belongs across client data access,
Raptor-driven views, server endpoints, and shared query descriptors. It excludes the
surrounding workflow: project setup, build, and deploy belong to `adk-extension-dev`; UI
composition around the query to `adk-raptor-dev`; table creation and schema design to
`adk-data-dev`; and server-side table administration (CRUD verbs, permissions, exports) to
`maplarge-database`.

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
- When query work needs deploy guidance for a new ADK extension, use `maplarge adk deploy`; do not run a separate `package` step first unless the user asks for a package artifact — deploy packages internally, so a standalone package run just produces a second artifact that can drift from what actually shipped.
- When query work needs package or deploy guidance, include `-i <component>` by default so the output gets a deliberate version increment. Use `PRERELEASE` when the current version has a pre-release tag, otherwise use `PATCH` unless the user explicitly asks for `MINOR` or `MAJOR`. Never use bare `-i` (the CLI needs the component to know which part to bump), never manually edit `manifest.json` to change versions (it desynchronizes the server-installed-version comparison), and never use `-overwrite` unless explicitly instructed. `-incrementVersion` is the long-form alias of `-i`; prefer the short form.

## Documentation precedence

Prefer sources in this order:

1. bundled docs in `./docs/`
2. the relevant DocPortal docs under [docs.maplarge.com](https://docs.maplarge.com/dashboard/ext/docportal/portal)
3. helper-reported local repo docs or source, especially configured `core`, when marked available and relevant

Do not use the public `maplarge.com` developer pages as the source of truth for query behavior. Do not assume the user has any MapLarge source checkout. Do not infer local repo paths from sibling folders or parent directory names.

## Examples

- "Show me the 10 closest bus stops by name from ml_samples/Miami_Busstops" → a JSON query
  document, not SQL:

  ```json
  { "table": "ml_samples/Miami_Busstops", "take": 10, "sqlselect": ["StopName", "XY"] }
  ```

  JSON is the canonical form even though the ask sounds like a one-liner SQL would cover.
- "Give me a cheap sanity check that the table is reachable, no data" → `take: 1`, never
  `take: 0` — any `take` below 1 is unbounded, so `take: 0` silently returns the full table
  (verified live: 5,595 rows back on a 5,595-row table).
- "Filter to stops on an avenue" → add a `where` clause group to the same document:

  ```json
  { "table": "ml_samples/Miami_Busstops", "take": 5,
    "where": [[ { "col": "StopName", "test": "Contains", "value": "AVE" } ]],
    "sqlselect": ["StopName"] }
  ```

## Primary references

Read these when the task reaches their topic; skip them otherwise:

- [`../../docs/query-authoring.md`](../../docs/query-authoring.md) — before drafting any query without a nearby local example (IQuery patterns, take semantics, common mistakes).
- [`../../docs/server-api-access.md`](../../docs/server-api-access.md) — when the query must be executed through a server API rather than client code.
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md) — when bundled docs and observed behavior disagree.
- [`../../docs/troubleshooting.md`](../../docs/troubleshooting.md) — when a query or build fails with an unexplained error.
- [`../../docs/getting-started.md`](../../docs/getting-started.md) — only when the surrounding ADK setup is itself in question.
- [`../../docs/local-repo-context.md`](../../docs/local-repo-context.md) — only when the user has MapLarge source checkouts wired in.
- [`../../docs/internal/internal-mode.md`](../../docs/internal/internal-mode.md) — only when the user explicitly enables internal mode (MapLarge employees).

## Hand-offs

- Project setup, build, package, or deploy beyond the rules above: use `adk-extension-dev`.
- The view, chart, or dashboard consuming the query: use `adk-raptor-dev`.
- Creating tables, designing schema, or loading sample data: use `adk-data-dev`.
- Table administration on a running server (CRUD verbs, permissions, exports): use `maplarge-database`.
