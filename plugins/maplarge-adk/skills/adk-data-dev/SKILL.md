---
name: adk-data-dev
description: Guide Claude through MapLarge table, schema, sample-data, account/profile, and verification workflows for ADK extension work without assuming internal systems.
---

# ADK Data Development

Use this skill when the user wants to create, inspect, verify, or reason about MapLarge tables for an ADK extension, including natural-language table design, schema-only tables, sample data, extension `CreateTables`, or runtime-managed table schemas.

## Grounding

Run the bundled helpers from the plugin root. `${CLAUDE_PLUGIN_ROOT}` is set by Claude Code when the skill runs:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect_maplarge_workspace.mjs --cwd "$PWD"
node ${CLAUDE_PLUGIN_ROOT}/scripts/check_adk_environment.mjs --cwd "$PWD"
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

## Primary References

- [`../../docs/extension-reference.md`](../../docs/extension-reference.md)
- [`../../docs/query-authoring.md`](../../docs/query-authoring.md)
- [`../../docs/server-api-access.md`](../../docs/server-api-access.md)
- [`../../docs/source-of-truth.md`](../../docs/source-of-truth.md)
- [`../../docs/getting-started.md`](../../docs/getting-started.md)
