---
name: maplarge-database
description: >-
  Authoritative reference for interacting with MapLarge tables from the outside, across all four
  surfaces: the maplarge CLI, REST /restapi/v1, ProcessDirect /Api/ProcessDirect, and the
  in-process plugin API (IMLDatabase / IMLPermissions / IMLSystemContext). Covers reads, writes,
  queries, create/load/export, versions, tags, attributes, indexes, partitions,
  permissions/ownership/ACLs, row-level security, Central Syncing, external relational databases,
  the exact verb names, auth, and the footguns. Use for ANY table data, schema, version,
  permission, or metadata work, and BEFORE guessing a verb name, REST route, or permission quad.
  Triggers on "create table", "load table", "delete row", "truncate", "export table", "table
  versions", "table permissions", "getactivetables", "editmulti", "bulkupdate", "deletetablerows",
  "sqlquery", "ProcessDirect", "IMLDatabase", "Could not find permissions key", "Central Syncing",
  "connect to external relational database".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "MapLarge Server trunk 119ba585c6e (2026-08-26) source re-anchored + verbs verified live on Server 4.139 (docs host) 2026-09-09 (ARC-46); CLI @ 1.0.90"
---

# MapLarge Database Interaction Reference

Covers interacting with MapLarge tables from the outside across all four surfaces - the
`maplarge` CLI, REST `/restapi/v1`, ProcessDirect `/Api/ProcessDirect`, and the in-process
plugin API - including verbs, auth, permissions, versions, exports, and the footguns between
them. It excludes authoring the queries themselves (`adk-query-dev`), designing new tables and
sample data for an extension (`adk-data-dev`), streaming ingest pipelines
(`maplarge-datastreams`), and the extension build/deploy workflow (`adk-extension-dev`).

Before doing any MapLarge table data / schema / version / permission / metadata work — or before guessing a verb name, REST route, or permission quad — read the bundled reference: `reference/maplarge-database.md` (relative to this skill folder). It is the authoritative, source-cited reference for the CLI, REST, ProcessDirect, and plugin surfaces (each claim names its file and a greppable symbol). Read only the relevant sections (the table below maps tasks to headings); read the whole file only if the task spans many areas.

## When to read what

| Task | Sections to read |
| --- | --- |
| Pick the right surface (CLI vs REST vs ProcessDirect vs plugin) | §1 Four surfaces — pick the right one |
| Auth: CLI profiles, REST Basic/Bearer, ProcessDirect `aInfo`, OAM | §2 Auth details |
| Map a `maplarge table/admin/query` CLI command to its REST endpoint; CLI flags | §3 CLI command → REST endpoint map |
| Find the ProcessDirect `action` a REST table route delegates to | §4 REST → ProcessDirect verb map |
| Find the exact `table/*` verb for read/create/delete/query/version/tag/attr/index/partition | §5 ProcessDirect `table/*` action catalog |
| Build the request body for `editmulti`/`editrecord`/`bulkupdate`/`query`/`deletetablerows` (field shapes, PascalCase, MultiValues) | §5 → ProcessDirect request shape variations |
| Accounts/users/groups/permissions/extensions/cluster-config verbs | §5 → ProcessDirect `admin/*` companion catalog |
| Permissions, ownership, ACLs; "Could not find permissions key"; quad surprises (truncate=`~create`, etc.) | §6 Permissions, ownership, ACLs |
| Do database work from inside an ADK extension/plugin (query, mutate, tags, bulk import, RLS) | §7 Plugin API (`IMLDatabase`) |
| Concrete how-to: list tables, query, filtered delete, truncate, copy table between servers, tags, RLS | §8 Common recipes |
| Diagnose a symptom / error message | §9 Gotchas — consolidated |
| Verify a claim against source code (where to look) | §10 Authoritative source map |
| Central Syncing / RemoteSync / InterCluster replication (servers, table pairs, account pairs, SyncMode, forcesync) | §11 Central Syncing / RemoteSync |
| Connect to an external relational DB (Postgres/Aurora/Oracle) — DataStream connector vs query TVF vs external-table source | §12 Connecting to an external relational database |

## Key facts

- `maplarge table delete-row` and `truncate-rows` both hit `DELETE /…/rows` → `table/truncatetable` — **they clear the ENTIRE table.** Filtered row deletion is CLI-impossible; use ProcessDirect `table/deletetablerows` (§3, §5).
- `table/list` does NOT exist (only the permission key does). Use `table/getactivetables` or `table/getalltables`. "Could not find permissions key …" means the verb isn't registered, NOT a permission denial (§5, §6).
- In query actions (`table/query`, `sqlquery`), `table` inside the nested `query` object is a **string** (`"Account/TableName"`); for row mutations `table` is an object. Mind `/` vs `.` (§5, §9).
- `maplarge table export` effectively **requires `-version`** despite `--help`; omitting it gives "The given key was not present in the dictionary." Get it from `table active-version` (§3, §8, §9).
- Permission quads don't match verb English: `table/truncatetable` is `table~create~A`, `table/deletetablerows` is `table~delete~A` (a `table~edit` grant can't delete rows), several verbs need `admin~superuser`. Verify against `AuthPermissions.cs`, not the verb name (§6).
- `ApiRequest` JSON keys are parsed by a hand-rolled, case-sensitive **lowercase** switch — `"remoteAdapter"` is silently dropped; use `"remoteadapter"`. Grep `ApiRequest.cs` for `case "…"` when a field comes back null (§9).
- Direct **external relational DB** connection (Postgres/Aurora/Oracle) has three pull-and-materialize paths, no live federation/CDC: DataStream `RelationalDatabaseConnector` (copy-in, only one with incremental tracking), `RelationalDatabaseTableValuedFunction` (inline query read; raw conn string = credential exposure), and an external-table relational source (`[Explicit]`-tested, least-polished). All wrap `RelationalDatabaseQuery.ReadDataAsync` (§12).

## Examples

- "Delete the archived rows from MyAccount/Orders" → the CLI cannot do this;
  `maplarge table delete-row` would empty the whole table. Use ProcessDirect:
  `{"action":"table/deletetablerows","table":{"tableName":"MyAccount/Orders", …filter…}}` (§5, §8).
- "List the tables in my account" → CLI `maplarge table list -account MyAccount -profile <p>`,
  or ProcessDirect `{"action":"table/getactivetables"}` — never `table/list`, which is not a
  registered verb and fails with "Could not find permissions key" (§5).
- "Export MyAccount/Orders to CSV" → get the active version first
  (`maplarge table active-version …`), then `maplarge table export … -version <v>` — omitting
  `-version` fails with "The given key was not present in the dictionary." even though `--help`
  marks it optional (§3, §8).
