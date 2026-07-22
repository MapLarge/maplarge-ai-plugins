---
name: maplarge-database
description: >-
  Authoritative reference for interacting with MapLarge tables from the outside — across all four surfaces (the `maplarge` CLI, REST `/restapi/v1`, ProcessDirect `/Api/ProcessDirect`, and the in-process plugin API `IMLDatabase` / `IMLPermissions` / `IMLSystemContext`). Covers table reads, writes, queries, create/load/export, versions, tags, attributes, indexes, partitions, permissions/ownership/ACLs, row-level security, Central Syncing / InterCluster replication, the exact verb/method names, auth, and the footguns. Use when doing ANY table data, schema, version, permission, or metadata work — reading, writing, querying, importing, exporting, deleting, or granting — in any MapLarge repo, and BEFORE guessing a verb name, REST route, or permission quad.
  Triggers on: "table query", "table/query", "getactivetables", "table list", "table/list", "list tables", "create table", "createtable", "create-empty", "createemptytable", "load table", "upload table", "import table", "appendfromstream", "editmulti", "editrecord", "bulkupdate", "insert rows", "upsert", "delete row", "delete-row", "deletetablerows", "truncate", "truncate-rows", "truncatetable", "delete table", "deleteallversions", "delete columns", "drop column", "alter schema", "table versions", "list-versions", "active-version", "setactivetable", "restore version", "table tags", "tagset", "create-tag", "table attributes", "column attributes", "settablevisibility", "table visibility", "set primary key", "createindex", "dropindex", "constraints", "partitioned table", "deletepartition", "external table", "export table", "exporttable", "export csv", "export geojson", "export shapefile", "geoFormat", "table export -version", "copy table between servers", "snapshot table", "table query take", "sql query", "sqlquery", "query exec", "-lang sql", "ProcessDirect", "aInfo", "mluser mlpass", "ApiRequest", "TableModule", "AdminModule", "TablesController", "permissions key", "Could not find permissions key", "permission quad", "AuthPermissions", "AuthManager", "table~edit", "table~delete", "table~create", "admin~superuser", "table permissions", "table ownership", "set owner", "grant access", "adjustresourcepermissions", "resource permissions", "ACL", "row-level security", "RowLevelSecurityProvider", "IMLDatabase", "IMLPermissions", "IMLSystemContext", "context.Database", "ExecuteQuery", "MaterializeQuery", "IMLFilteredTable", "TableOperations", "OnTable", "TableBuilderProvider", "multi table builder", "whoami", "admin/version", "getallpermissionkeys", "admin account", "admin group", "admin user", "create account", "create group", "create user", "extensions admin", "installextension", "Central Syncing", "RemoteSync", "intercluster", "SyncedTablePair", "SyncedAccountPair", "SyncMode", "forcesync", "setsyncmode", "setfilter", "setqueryoverride", "Central server", "Edge", "replication", "table metadata", "refreshmeta", "table checksums", "memory behavior", "preload", "suspect tables", "quarantine table", "connect to relational database", "direct database connection", "external relational database", "Aurora", "Aurora PostgreSQL", "PostgreSQL", "Postgres", "Npgsql", "Oracle database", "RelationalDatabaseConnector", "RelationalDatabaseTableValuedFunction", "ExternalRelationalDatabaseSource", "RelationalDatabaseEndpoint", "table valued function", "TVF", "query external database", "ADO.NET provider", "connection string"
---

# MapLarge Database Interaction Reference

Before doing any MapLarge table data / schema / version / permission / metadata work — or before guessing a verb name, REST route, or permission quad — read the bundled reference: `${CLAUDE_PLUGIN_ROOT}/skills/maplarge-database/reference/maplarge-database.md`. It is the authoritative, `file:line`-cited reference for the CLI, REST, ProcessDirect, and plugin surfaces. Read only the relevant sections (the table below maps tasks to headings); read the whole file only if the task spans many areas.

## When to read what

| Task | Sections to read |
|---|---|
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
