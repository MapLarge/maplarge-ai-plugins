---
name: adk-data-dev
description: MapLarge table, schema, sample-data, account/profile, and verification workflows for ADK extension work. Use when creating, inspecting, or verifying MapLarge tables for an extension, designing a schema from natural language, generating sample data, or enforcing runtime table schemas. Triggers on "create table", "table schema", "sample data", "CreateTables", "GetColumnInfo", "schema migration", "/adk-data-dev".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "MapLarge ADK CLI 1.0.90 (admin account list, query exec flags) verified live 2026-09-09 (ARC-41); server-side patterns @ 2026-08 import baseline"
---

# ADK Data Development

Covers MapLarge table work for ADK extensions: designing a schema from natural language,
schema-only tables, sample data, manifest `CreateTables`, and runtime-managed table schemas.
It excludes query authoring against those tables (`adk-query-dev`), the extension project
workflow around them (`adk-extension-dev`), the UI that displays them (`adk-raptor-dev`), and
table administration on a running server - CRUD verbs, permissions, exports - which belongs to
`maplarge-database`.

## Grounding

Run the bundled helpers from the plugin root. Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`):

```bash
node <plugin-root>/scripts/detect_maplarge_workspace.mjs --cwd "$PWD"
node <plugin-root>/scripts/check_adk_environment.mjs --cwd "$PWD"
```

Use workspace output to decide whether local extension files, `.adk/manifest.schema.json`, or only bundled docs are available. Do not invent account, table, column, profile, or server names.

## Data Rules

- Prefer workspace schema, existing query descriptors, `manifest.json`, and extension config files over generating a schema from scratch.
- Ask for missing schema details when the workspace does not provide enough information.
- If the user gives a server URL or profile, resolve it before table work; if neither is provided, use the current ADK profile when available, otherwise ask for the target profile.
- Treat ADK profiles as user-managed local state. Use existing profiles without editing saved credentials. Do not add or replace saved tokens without explicit user approval, and prefer password auth when supported.
- For a new table, present the intended table path, visibility, columns, types, and sample-row count before creating data.
- For schema-only tables, keep the output as a JSON schema mapping and do not generate CSV rows.
- For sample data, keep generated rows small and realistic. For large requested volumes, generate a small seed and explain that a script or import job should expand it.
- For locations in CSV-style uploads, prefer `Lat` and `Lng` `Double` columns. Use geometry types only when the target workflow explicitly expects geometry columns.
- Verify table creation or schema changes with the CLI or server API available in the workspace; report the table path and a minimal query example.

## Extension Schema Rules

- Use manifest `Accounts` and `CreateTables` for static install-time extension-owned tables.
- Do not rely only on manifest `CreateTables` when the real target table path comes from runtime config.
- For runtime-configured target tables, prefer server-side schema inspection with `GetExistingTable("<account>/<table>").GetColumnInfo()`.
- Use additive schema migration in install, update, or config-change lifecycle handlers when a required column may be missing.
- Fail fast if a required schema element is still missing after migration.

## Verification

Prefer the narrowest check that proves the table exists and has the expected shape:

```bash
maplarge admin account list -profile <profile> -outputTypes JSON
maplarge query exec -profile <profile> -input "<query-json-or-sql-request>" -outputTypes json
```

Use JSON query documents by default for ADK extension work. SQL-like examples are acceptable for quick operator-facing verification when the user asks for CLI commands.

## Examples

- "Design a table for delivery vehicles: id, plate, capacity, last known position" → present a
  schema-only JSON mapping and stop; no CSV rows, no invented account:

  ```json
  { "id": "Int32", "plate": "String", "capacity": "Double", "Lat": "Double", "Lng": "Double" }
  ```

  Then ask which account/table path it should live under rather than assuming one.
- "Create it under myaccount/Vehicles with a few sample rows" → present table path, visibility,
  columns, and sample-row count for confirmation first, create, then verify with the narrowest
  check: `maplarge query exec -profile <profile> -input '{"table":"myaccount/Vehicles","take":1}' -outputTypes json`.
- "My connector writes to whatever table the config names" → do not extend manifest
  `CreateTables`; inspect at runtime with `GetExistingTable("<account>/<table>").GetColumnInfo()`
  and migrate additively in the `Installed`/`ConfigUpdated` lifecycle handlers.

## Primary References

Read these when the task reaches their topic; skip them otherwise:

- [`../../docs/extension-reference.md`](../../docs/extension-reference.md) — when touching manifest `Accounts`/`CreateTables` or extension folder layout.
- [`../../docs/query-authoring.md`](../../docs/query-authoring.md) — before writing the verification query if no local example exists.
- [`../../docs/server-api-access.md`](../../docs/server-api-access.md) — when table work must go through a server API rather than the CLI.
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md) — when bundled docs and observed behavior disagree.
- [`../../docs/getting-started.md`](../../docs/getting-started.md) — only when the surrounding ADK setup is itself in question.

## Hand-offs

- Authoring or debugging the queries that read these tables: use `adk-query-dev`.
- Project setup, build, package, deploy, or lifecycle plumbing beyond schema: use `adk-extension-dev`.
- Table administration on a running server (deletes, permissions, exports, version pinning): use `maplarge-database`.
