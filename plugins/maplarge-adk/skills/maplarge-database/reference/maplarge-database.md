# MapLarge Database Interaction Reference

> Scope: how a **user** interacts with MapLarge tables — creating, querying, mutating, deleting, tagging, versioning, managing permissions. Covers the CLI, REST API, ProcessDirect, and the plugin (`IMLDatabase`) surface used by ADK extensions.
>
> **This is not a guide for writing database-internal code.** It is a guide for acting on tables from the outside: CLI commands, REST calls, ProcessDirect calls, and extension code.
>
> **Accuracy rule**: every factual claim below cites `file.cs:LINE`. If a capability is not in this doc, verify against code before asserting it exists.

---

## 1. Four surfaces — pick the right one

| Surface | When to use | Auth | Transport |
| --- | --- | --- | --- |
| **CLI** (`maplarge table …`, `maplarge admin …`, `maplarge query …`) | Interactive or scripted admin from your terminal | Profile (`-profile name`) → basic auth or bearer token | HTTPS → REST API |
| **REST API** `/restapi/v1/…` | External clients, HTTP tools (curl, Invoke-RestMethod), the CLI itself | `Authorization: Basic …` or `Authorization: Bearer <token>` | HTTPS |
| **ProcessDirect** `/Api/ProcessDirect` | JS client; anything REST doesn't cover; `table/*` verbs not exposed as REST routes | `aInfo=mluser:X;mlpass:Y` query param OR `Authorization: Bearer <token>` header | HTTPS, `?request={…json…}` |
| **Plugin API** (`IMLSystemContext.Database`, `.Permissions`) | Inside an ADK extension / plugin running in-process on the server | Implicit — plugin runs as server | In-process |

The CLI calls REST. REST internally calls ProcessDirect (`new ApiRequest { action = "table/…" }` → `ProcessRequestAsync`). ProcessDirect is the widest surface — REST covers a subset, CLI covers a subset of REST. When the CLI doesn't expose what you need, drop to REST; when REST doesn't expose what you need, drop to ProcessDirect.

### Don't reach for browser tools

When working through a browser session, **do not execute `fetch()` against `/Api/ProcessDirect` from a dashboard console** just because you already have an auth cookie there. Use CLI or shell-side HTTP (PowerShell `Invoke-RestMethod`, bash `curl`) — those are the right tools for table mutations. The browser is for UI verification, not for issuing data-write requests. Using the browser conflates debugging (which runs in a dashboard session) with data ops (which should be reproducible from any shell).

---

## 2. Auth details (verified)

### CLI profiles

Stored at `%APPDATA%\MapLargeCLI\maplarge.cli.config.json`. Create/update/list/delete via `maplarge config {create-profile|update-profile|list-profiles|delete-profile}`. Profile holds `server`, `user`, `password` OR `token`, `allowUntrustedCerts`, etc.

### REST auth

HTTP Basic: `Authorization: Basic base64(user:password)` — used by CLI (`DeleteRow.cs`).
Bearer token: `Authorization: Bearer <jwt>` — used by OAM-protected servers and CLI when token configured (`DeleteRow.cs`).

### ProcessDirect `aInfo`

Query-string format: `aInfo=mluser:USERNAME;mlpass:PASSWORD` OR `aInfo=mluser:USERNAME;mltoken:TOKEN`. Example:

```http
GET /Api/ProcessDirect?aInfo=mluser:<user>;mlpass:<password>&request={"action":"table/getactivetables"}
```

**OAM servers override `aInfo` with their own identity headers** — use client certs + `Authorization: Bearer <token>` instead; see the `maplarge-oam-auth` skill.

---

## 3. CLI command → REST endpoint map

All CLI `maplarge table *` / `admin *` / `query *` commands go through REST. Verified by reading the `maplarge-cli` source (`dotnet/cli/`).

### `maplarge table *`

| CLI subcommand | HTTP | Endpoint | CLI source |
| --- | --- | --- | --- |
| `list` | GET | `/restapi/v1/accounts/{account}/tables` | `table/List.cs` |
| `create` | POST | `/restapi/v1/accounts/{account}/tables/{table}` or `.../{table}/upload` | `table/CreateTable.cs` |
| `create-empty` | POST | `/restapi/v1/accounts/{account}/tables/{table}/empty` | `table/CreateEmpty.cs` |
| `export` | GET | `/restapi/v1/accounts/{account}/tables/{table}/versions/{version}/export?geoFormat=WKT&includePolicies=true&messageIdentifier=string` | `table/Export.cs` |
| `delete` | DELETE | `/restapi/v1/accounts/{account}/tables/{table}/versions` (deletes ALL versions) | `table/DeleteTableAllVersions.cs` |
| `delete-version` | DELETE | `/restapi/v1/accounts/{account}/tables/{table}/versions/{version}` | `table/DeleteVersion.cs` |
| `list-versions` | GET | `/restapi/v1/accounts/{account}/tables/{table}/versions` | `table/ListVersions.cs` |
| `get-version` | GET | `/restapi/v1/accounts/{account}/tables/{table}/versions/{version}` | `table/GetVersion.cs` |
| `active-version` | GET | `/restapi/v1/accounts/{account}/tables/{table}/versions/active` (read only — no CLI setter) | `table/ActiveVersion.cs` |
| **`delete-row`** | DELETE | `/restapi/v1/accounts/{account}/tables/{table}/rows` | `table/DeleteRow.cs` |
| **`truncate-rows`** | DELETE | `/restapi/v1/accounts/{account}/tables/{table}/rows` | `table/TruncateRows.cs` |
| `imports` | GET | `/restapi/v1/imports/{importId}` (poll import status by id) | `table/ImportStatus.cs` |
| `create-tag` | PUT | `/restapi/v1/accounts/{account}/tables/{table}/tags/{key}` | `table/CreateTag.cs` |
| `update-tag` | PUT | `/restapi/v1/accounts/{account}/tables/{table}/tags/{key}` | `table/UpdateTag.cs` |
| `delete-tag` | DELETE | `/restapi/v1/accounts/{account}/tables/{table}/tags/{key}` | `table/DeleteTag.cs` |
| `list-tags` | GET | `/restapi/v1/accounts/{account}/tables/{table}/tags` | `table/ListTags.cs` |
| `get-tag` | GET | `/restapi/v1/accounts/{account}/tables/{table}/tags/{key}` | `table/GetTag.cs` |

`export` hardcodes `geoFormat=WKT&includePolicies=true&messageIdentifier=string` — there are no CLI flags that override these (`table/Export.cs`). For other geo formats or without policies, call the REST endpoint directly.

`active-version` is GET-only. To **set** the active version, drop to ProcessDirect `table/setactivetable` (`TableModule.cs`) or `table/restore`.

### ⚠️ `delete-row` is `truncate-rows` — the whole-table footgun

`maplarge table delete-row` and `maplarge table truncate-rows` both send `DELETE /restapi/v1/accounts/{acct}/tables/{tbl}/rows` (`DeleteRow.cs`, `TruncateRows.cs`), which the REST controller maps to `table/truncatetable` (`TablesController.cs`). **Both clear the entire table.** There is no row-filtering parameter on the REST `/rows` route. If you need filtered row deletion you **cannot use the CLI** — drop to ProcessDirect `table/deletetablerows` (§5).

### `maplarge admin user *`

| Subcommand | HTTP | Endpoint |
| --- | --- | --- |
| `list` | GET | `/restapi/v1/users` |
| `create` | POST | `/restapi/v1/users` |
| `get` | GET | `/restapi/v1/users/{userID}` |
| `update` | PUT | `/restapi/v1/users/{userID}` |
| `delete` | DELETE | `/restapi/v1/users/{userID}` |

### `maplarge admin group *`

| Subcommand | HTTP | Endpoint |
| --- | --- | --- |
| `list` | GET | `/restapi/v1/accounts/{account}/groups` |
| `create` | POST | `/restapi/v1/accounts/{account}/groups` |
| `create-default` | POST | `/restapi/v1/accounts/{account}/groups/default` |
| `get` | GET | `/restapi/v1/accounts/{account}/groups/{groupIDOrName}` |
| `update` | PUT | `/restapi/v1/accounts/{account}/groups/{groupIDOrName}` |
| `delete` | DELETE | `/restapi/v1/accounts/{account}/groups/{groupIDOrName}` |
| `add-user` | POST | `/restapi/v1/users/{userId}/groups` |
| `remove-user` | DELETE | `/restapi/v1/users/{userID}/groups/{groupID}` |

### `maplarge admin account *`

| Subcommand | HTTP | Endpoint |
| --- | --- | --- |
| `list` | GET | `/restapi/v1/accounts` |
| `create` | POST | `/restapi/v1/accounts` |
| `get` | GET | `/restapi/v1/accounts/{accountIDOrCode}` |
| `update` | PUT | `/restapi/v1/accounts/{account}` |
| `delete` | DELETE | `/restapi/v1/accounts/{account}` |

### `maplarge query exec`

The CLI picks a different REST route based on `-lang`:

| `-lang` | HTTP | Endpoint |
| --- | --- | --- |
| `json` (default) | POST | `/restapi/v1/queries/result` |
| `sql` | POST | `/restapi/v1/sql/result` |

URL selection happens in `query/Execute.cs` (`GetQueryURL`). The request body differs per route: the JSON route takes a query-object, the SQL route takes a SQL string. Request dispatch: `query/Execute.cs`.

Flag reference (`query/Execute.cs` — flag definitions and argument validation):

| Flag | Values | Required | Notes |
| --- | --- | --- | --- |
| `-profile` | profile name | with auth | Standard profile lookup |
| `-input` | query text (SQL or compact JSON) | exactly one of `-input` / `-inputFile` | JSON inputs must be single-quoted and whitespace-stripped |
| `-inputFile` | path to `.sql` / `.json` file | exactly one of `-input` / `-inputFile` | Read as UTF-8 |
| `-lang` | `json` (default) or `sql` | no | Only these two values are recognized — any other value falls through to the JSON route |
| `-outputTypes` | `json`, `table`, `csv` (default `table`); comma-separated for multiple | no | `geojson` is **not** a valid value here — that's a REST *export* format on `/tables/{…}/versions/{v}/export`, not a query output type |
| `-outputFile` | local file path | required if `-outputTypes` is `csv` or `json` | Omit for default `table` console output |
| `-server` / `-user` / `-password` / `-token` / `-timeout` / `-verbose` | — | no | Standard per-call overrides |

### CLI has NO permission / ACL / ownership commands

No `maplarge permission …`, no `maplarge table set-owner`, no `maplarge table grant`. To change table ownership or ACLs you must use the web admin UI or call ProcessDirect/REST directly. Group membership (`admin group add-user/remove-user`) is user-to-group, NOT a table-level permission grant.

---

## 4. REST → ProcessDirect verb map (table operations)

Originally mapped from `MapLarge.Server/Controllers/Rest/TablesController.cs`. **Source moved (re-verified 2026-09-09):** trunk has since restructured the REST layer into one operation class per route under `MapLarge.Engine/RestApi/Operations/Tables/` (e.g. `TruncateTableRows.cs` sets `action = "table/truncatetable"`). To verify a mapping, grep the route segment or the `action` string in that folder.

| REST route | Method | Internal `action` |
| --- | --- | --- |
| `/restapi/v1/accounts/{acct}/tables` | GET | `table/getactivetables` |
| `/restapi/v1/accounts/{acct}/tables/{name}` | GET | `table/gettableinformation` |
| `/restapi/v1/accounts/{acct}/tables/{name}` | POST | `table/createtable` (or variant) |
| `.../tables/{name}/synchronous` | POST | `table/createtablesynchronous` |
| `.../tables/{name}/upload` | POST | `table/createtablewithfilesasync` |
| `.../tables/{name}/uploadstream` | POST | `table/createtablefromstream` |
| `.../tables/{name}/uploadsynchronous` | POST | `table/createtablewithfilessynchronous` |
| `.../tables/{name}/empty` | POST | `table/createemptytable` |
| `.../tables/{name}/versions` | GET | `table/gettableversions` |
| `.../tables/{name}/versions` | DELETE | `table/deleteallversions` |
| `.../tables/{name}/versions/{ver}` | GET | `table/gettableinformation` |
| `.../tables/{name}/versions/{ver}` | DELETE | `table/deletetable` |
| `.../tables/{name}/versions/{ver}/export` | GET | `table/exporttable` |
| **`.../tables/{name}/rows`** | **DELETE** | **`table/truncatetable`** |

Note the bolded row — this is what the CLI's `delete-row` hits.

---

## 5. ProcessDirect `table/*` action catalog (verified)

Canonical source: `MapLarge.Engine/Unified/ProcessingModules/TableModule.cs` (the `switch` block in `Process`). Every verb registered there is listed below, grouped by purpose. To locate one, grep the quoted verb string or the handler method name in that file.

### Discovery / metadata read

| Verb | Handler |
| --- | --- |
| `getalltables` | `GetAllTablesAsync` |
| `getallremotetables` | `GetAllRemoteTablesAsync` |
| `getalltablesinternal` | `GetAllTablesInternalAsync` |
| `getallsqtables` | `GetAllSqTables` |
| `getactivetables` | `GetActiveTablesAsync` |
| `getactivetablesshort` | `GetActiveTablesShortAsync` |
| `getactivetableid` | `GetActiveTableIdAsync` |
| `gettableinformation` | `GetTableInformationAsync` |
| `gettableversions` | `GetTableVersionsAsync` |
| `doestableexist` | `DoesTableExist` |
| `gettablememoryinfo` | `GetTableMemoryInfoAsync` |
| `gettableloadstacktrace` | `GetTableLoadStackTrace` |
| `refreshtablemetadata` | `RefreshTableMetadataAsync` |
| `gettables` | `GetTablesAsync` |
| `getcolumns` | `GetColumnsAsync` |
| `gettablecolumns` | `GetTableColumnsAsync` |
| `gettablechecksums` | `GetTableChecksums` |
| `getrawtablesize` | `GetRawTableSize` |
| `getsuspecttables` | `CheckForSuspectTablesAsync` |

**`table/list` does NOT exist** — the permission quad `table~list` is registered in `AuthPermissions.cs` but no handler is wired. Calling it returns "Could not find permissions key table/list". Use `getactivetables` or `getalltables` instead. (This is an easy fail mode: two prior sessions assumed `table/list` existed because the permission key did.)

### Create (many flavors — pick by input shape)

| Verb | Handler | Input shape |
| --- | --- | --- |
| `createtable` | `CreateTableAsync` | Async create from remote/stream ref |
| `createtablesynchronous` | `CreateTableSynchronousAsync` | Sync, blocks |
| `createtablewithfilesasync` | `CreateTableWithFilesAsync` | Multipart file upload, async |
| `createtablewithfilessynchronous` | `CreateTableWithFilesSynchronousAsync` | Multipart file upload, sync |
| `createtablefromstream` | `CreateTableFromStreamAsync` | Streaming body |
| `createtablewithadapter` | `CreateTableWithAdapterAsync` | Via import adapter |
| `createemptytable` | `CreateEmptyTableAsync` | Schema only, no data |
| `getadaptermetadata` | `GetAdapterMetadata` | Inspect adapter before createtablewithadapter |
| `createshpjoinsynchronous` / `createshpjoinwithfilessynchronous` | shapefile join creates | — |
| `createtablefromjoinedfilessynchronous` | sync joined import | — |
| `pushchunk` / `reassemblechunks` | Chunked upload protocol | — |

### Destroy / truncate / quarantine

| Verb | Handler | What it does |
| --- | --- | --- |
| `deletetable` | `DeleteTableAsync` | Delete a specific version |
| `deleteallversions` (`VERB_DELETE_ALL_VERSIONS`) | `DeleteAllVersionsAsync` | Delete every version of a table |
| `truncatetable` (`VERB_TRUNCATE_TABLE`) | `TruncateTableAsync` | Efficiently clear all rows, keep schema. Permission quad is `table~create~A`, not `table~delete~A` (`AuthPermissions.cs` — registered via `$"table/{TableModule.VERB_TRUNCATE_TABLE}"`, so a plain-string grep for the verb misses it) |
| **`deletetablerows`** | **`DeleteTableRowsAsync`** | **Filtered row delete — the thing the CLI can't do** |
| `deletecolumns` | `DeleteColumnsAsync` | Drop columns |
| `deletepartition` | `DeletePartitionAsync` | Delete one partition (see partitioned-tables below; requires `admin~superuser` per `AuthPermissions.cs`) |
| `unloadtableversion` / `unloadallversions` | Unload from memory (not delete) | — |
| `quarantinetable` / `unquarantinetable` | Disable/re-enable access to a table | — |
| `redacthistory` | `RedactTableFromHistoryAsync` | Remove a prior version from history |
| `deletesqtable` | `DeleteSqTable` | Delete SQLite-backed table |
| `deletememorybehavior` | — | Delete memory-behavior override |

### `table/refreshtablemetadata` is unreachable

The switch at `TableModule.cs` dispatches on the string literal `"refreshtablemetadata"`, but the constant `VERB_REFRESH_TABLE_METADATA` at `TableModule.cs` is defined as `"refreshmeta"`, and the permission registration at `AuthPermissions.cs` uses the constant. Result: calling `table/refreshtablemetadata` fails auth with "Could not find permissions key" (the key registered is `table/refreshmeta`); calling `table/refreshmeta` passes auth but falls through the switch to "unknown verb". Both paths dead-end. Don't rely on this verb from an external caller — if metadata refresh is genuinely needed, reactivate the version via `table/setactivetable` or fix the switch literal first.

### Row-level mutation (filtered, targeted)

| Verb | Handler | Notes |
| --- | --- | --- |
| `bulkupdate` | `BulkUpdateTableRowsAsync` | **Update rows matching a WHERE clause** — sets a flat `string[]` of column values on every matched row. NOT a multi-row insert. Use `editmulti` for that. Requires transacted table. |
| `editmulti` | `UpdateMultiRowAsync` | **Multi-row insert/upsert** — use `MultiValues: string[][]` and `PrimaryKey`. This is the right verb for adding new rows. |
| `editrecord` | `UpdateMultiRowAsync` | Alias of `editmulti` (same handler); still batch-capable |
| `deletetablerows` | `DeleteTableRowsAsync` | Filtered delete (WHERE / row IDs) |
| `appendfromstream` | `AppendFromStreamAsync` | Stream rows into existing table |

**If you need to change specific rows, use one of these — not the REST `/rows` DELETE.**

### Query

| Verb | Handler | Notes |
| --- | --- | --- |
| `query` | `QueryAsync` | JSON query; params nest under `query` object |
| `multiquery` | `MultiQueryAsync` | Batch of queries in one call |
| `validatequery` | `ValidateQueryAsync` | Parse only |
| `sqlquery` | `SqlQueryAsync` | SQL string; params nest under `query` object |
| `sqlqueryvalidate` | `SqlQueryValidateAsync` | SQL parse only |
| `remotequery` (`VERB_REMOTE_QUERY`) | `RemoteQueryAsync` | Query remote cluster |
| `remotevalidatequery` | `RemoteValidateQueryAsync` | — |
| `remotegettable` | `RemoteGetTableAsync` | Materialize remote table |
| `exportmultiplequeries` | `ExportMultipleQueriesAsync` | Export several queries' results |
| `getbinarydata` | `GetImageFromBinaryColumnAsync` | Fetch blob from binary column |

### Versions / tags

| Verb | Handler |
| --- | --- |
| `setactivetable` | `SetActiveTableAsync` |
| `restore` | `RestoreTableVersionAsync` |
| `tagset` | `AddEditTableTagsAsync` (add AND edit) |
| `tagget` / `tagsearch` / `taglist` | Read tags |
| `tagdelete` | `DeleteTableTagAsync` |
| `rematerializetable` | `RematerialaizeSingleTableAsync` |

### Export (format-specific)

`exporttable`, `exporttableascsv`, `exporttableasshapefile`, `exporttableasgridfloat`, `exporttableasnetcdf`, `exporttableaskml`, `exporttableasgeojson`, `exporttableassqlite`, `exporttableasgpkg`, `exporttableasdted`, `exporttableasmbtiles` — `TableModule.cs`. `downloadexported` retrieves a previously-generated export file.

### Attributes / visibility / schema hints

| Verb | Handler |
| --- | --- |
| `settablevisibility` | `SetTableVisibilityAsync` |
| `columnattributesget` / `columnattributesset` | — |
| `tableattributesget` / `tableattributesset` | — |
| `setpreload` / `getpreload` | Memory-preload config |
| `getmemorybehavior` / `setmemorybehavior` / `deletememorybehavior` | — |
| `setstrictness` | `SetStrictnessAsync` |
| `setPrimaryKey` (`VERB_SET_TABLE_PK`) | `SetTablePrimaryKeyAsync` |
| `locktable` / `unlocktable` | — |

### Indexes / constraints / partitions / external tables

Indexes: `createindex`, `dropindex`, `listindexes`, `listindextypes`, `listindexedtables` — `TableModule.cs`.

Constraints: `listconstraints`, `listconstrainttypes`, `createconstraint`, `dropconstraint` — `TableModule.cs`.

Partitioned tables: `setpartitionedtable`, `unsetpartitionedtable`, `purgehistoricdata`, `repartitiontable`, `deletepartition`, `declarepartitiontable`, `addtodeclaredpartitiontable`, `removefromdeclaredpartitiontable`, `listpartitionedtables`, `getpartitionedtables` — `TableModule.cs`.

External tables: `createexternaltable`, `editexternaltable`, `deleteexternaltable`, `listexternaltable`, and partitioned variants — `TableModule.cs`. For an external table backed by an **external relational database** (Postgres/Aurora/Oracle), see §12.3.

### Miscellaneous

Thumbnails (`getthumbnail`, `uploadthumbnail`), transacted import (`begintransactedimport`, `committransactedimport`, `rollbacktransactedimport`), tx/persistence conversion (`txconvert`, `txconvertall`, `txconvertallgetprogress`, `persistenceproviderconvertall`), parquet schema peek (`s3parquetschema`, `s3parquetgeometadata`, `httpparquetschema`, `httpparquetgeometadata`), utility (`pointstolinegrouped`, `drawcircles`, `createvideofromtable`, `joinsupport`, `convertrasterset`, `convertdiskimagery`, `changeimportsettings`, `streamstatus`, `streamingrewrite`, `checktableactivefile`, `checktables`, `setupcorruptedtable`, `getexpressionfunctions`, `gettablevaluedfunctions` — scattered through the same switch).

### ProcessDirect request shape variations

Root is always `{"action": "table/<verb>", ...}`. Sub-object nesting varies:

- **Queries** (`query`, `multiquery`, `sqlquery`): params nest under `"query": {...}`. Inside that object, `table` is a **string** (`"Account/TableName"`), not an object.

  ```json
  {"action":"table/query","query":{"table":"Account/TableName","take":100}}
  ```

- **Row mutations** — pick the right verb:
  - **`editmulti` / `editrecord`** — the multi-row insert/upsert verb. Uses `tableRequest.MultiValues ?? new[] { tableRequest.Values }` (`TableModule.cs` via `UpdateTableAsync`). Supply `PrimaryKey` for upsert semantics (update if PK matches, insert otherwise). Supply `RowId` to update by internal row id (mutually exclusive with `PrimaryKey`). With neither, behavior is insert-only-like — but note: **supplying a `PrimaryKey` with a `MultiValues` payload whose IDs don't match any existing row results in inserts**. In practice, for a plain append, set `PrimaryKey` to the PK column name anyway (e.g. `"id"`) and use fresh Guids — rows with non-matching PKs are inserted.
  - **`bulkupdate`** — *does not* do bulk insert. It's "update rows matching a WHERE clause, setting columns to values" (`ImportManager.Transacted.cs`: `BulkUpdateRowsByQueryTransactedAsync(tableHandle, QueryRequest qr, columnNames, columnValues, ...)`). The `qr.where` filters which rows to touch; `columnValues` is a **flat `string[]`** (one value per named column) applied to **every matched row**. Useful for "set status=archived where region=west", not for "insert these 17 new rows". Also requires the table be transacted (`TxDataHandle != null`; `TableModule.cs`).
  - **`appendfromstream`** — pure append of a stream (CSV/JSON) in the request body; needs `?tableBaseName=&account=` query params (`StreamAppenderOptions.cs`). Use when you have a file-shaped payload or want the datastream-style path.

  Request shape for `editmulti` maps to `TableRequest` (`MapLarge.Engine/Unified/Request/TableRequest.cs`). Relevant fields:
  - `TableName` — `"Account/TableName"`.
  - `PrimaryKey` — column name (string) used for upsert matching; single column or comma-separated composite.
  - `Columns: string[]` — names of columns being supplied.
  - `Values: string[]` — a **single row** as a flat array of strings.
  - `MultiValues: string[][]` — an **array of rows**, each row being an array of strings. **Use this for more than one row.** Sending multiple rows via `Values` fails with cryptic type errors (e.g. "Invalid DateTime value: U at index 0") because the server reads it positionally as a single flat row.
  - All values must be sent as **strings** even for non-string types (Guids, DateTimes, doubles). Serialize `42.5` as `"42.5"`, use ISO-8601 for DateTime, lowercase hex `Guid.ToString()` for Guids.
  - Field names are **PascalCase** (`TableName`, `Columns`, `MultiValues`, `PrimaryKey`) — case matters.
  - Example payload for inserting 2 rows via `editmulti`:

    ```json
    {
      "action": "table/editmulti",
      "table": {
        "TableName": "acme/events",
        "PrimaryKey": "id",
        "Columns": ["id", "ts", "label"],
        "MultiValues": [
          ["b0f6...", "2026-04-20T12:00:00Z", "alpha"],
          ["9c32...", "2026-04-20T12:05:00Z", "beta"]
        ]
      }
    }
    ```

  - **Known quirk (verify before relying on):** a session that inserted 15 rows via `editmulti` with `PrimaryKey="id"` observed 30 rows in the table afterwards (exactly 2x). Possibly a delete-then-insert upsert path writing history + current versions, or a retry on a transacted commit. If you need an exact row count, either (a) use `appendfromstream` instead, or (b) verify count with a post-insert `SELECT COUNT` and adjust the caller.
- **Creates / simple deletes**: params may sit on root or under `"remote"` (for remote refs).

When in doubt, read the handler and the `TableRequest` model definition at `MapLarge.Engine/Unified/Request/TableRequest.cs`.

### ProcessDirect `admin/*` companion catalog

Users who manage accounts, groups, users, resource permissions, and extensions reach these through the **admin module** (`AdminModule.cs`), not `table/*`. The CLI's `maplarge admin …` subcommands hit REST, which in turn calls these verbs. Payloads generally nest under the `admin` field of `ApiRequest`.

Identity / discovery:

| Verb | Handler |
| --- | --- |
| `whoami` | `WhoAmI` |
| `version` | `Version` |
| `getaccounts` / `listaccounts` | `GetAccounts` (aliases) |
| `getaccountinformation` | `GetAccountInformation` |
| `listusers` / `getuserinformation` | `ListUsers` / `GetUserInformation` |
| `listgroups` / `getgroupinformation` | `ListGroups` / `GetGroupInformation` |
| `getallpermissionkeys` | `GetAllPermissionKeys` — enumerate every permission quad the server knows about |

Account / user / group mutations (most emit `transactionId`): `createaccount` / `createaccountsbulk` / `editaccount` / `deleteaccount`, `updateisorganization`, `updateorganizationdefaultpermissions`, `creategroup` / `creategroupsbulk` / `editgroup` / `deletegroup`, `createdefaultgroups`, `cleanuporphangroups`, `createuser` / `createusersbulk` / `edituser` / `editusersbulk` / `deleteuser`, `addusertogroups` / `removeuserfromgroups` / `removeuserfromallgroups`.

Resources, permissions, favorites: `getresource` / `getresources` / `getresourcemodel`, `createorgetresource` / `updateresource` / `deleteresource`, `updateresourcefolder` / `deleteresourcefolder` / `settempresourcefolder` / `unsettempresourcefolder`, `listfoldercontents`, `getresourcepermissions` / `getresourcepermissionsmulti`, **`adjustresourcepermissions`** (grant/revoke resource-level permissions — tables, layers, etc.), `addfavorite` / `removefavorite`.

Extensions (ADK lifecycle): `pushextension` / `installextension` / `uninstallextension`, `deleteextension` / `deleteextensions`, `enableextension` / `disableextension`, `listextensions` / `downloadextension` / `getextensions` / `getextensionpaths`, `downloadextensionconfig` / `getextensionconfigschema` / `updateextensionconfig`, `getextensionmanifest`, `getextensiondependencyreport` / `getserverextensiondependencyreport`.

Cluster / config / ops (admin-only, read this section when asked about server config changes): `getclusterconfigs` / `setclusterconfigs` / `getclusterconfighistory`, `getlocalconfigs` / `setlocalconfig`, `changeconfigsetting`, `recycleapp` / `stopapp` / `stopallapp`, `takesnapshot` / `restoreassnapshot` / `replicatesnapshot` / `purgeclusternode`, `voidtransaction`.

Remote endpoints (used by ExternalServices-style integrations): the `VERB_LIST_ENDPOINTS` / `VERB_TEST_ENDPOINT` / `VERB_CREATE_ENDPOINT` / `VERB_UPDATE_ENDPOINT` / `VERB_DELETE_ENDPOINT` constants in `AdminModule.cs`.

**Use this companion list when a question is about users/groups/accounts/permissions/extensions — don't grep `TableModule.cs` for them, they live in `AdminModule.cs`.**

---

## 6. Permissions, ownership, ACLs

### The "Could not find permissions key" trap

Permission registration lives in `MapLarge.Engine/Unified/Auth/AuthPermissions.cs`. Permission-check dispatch lives in `AuthManager.cs` — specifically the `Permissions.TryGetValue(completeAction, out entry)` / `if (entry == null) GenerateAuthDeclinedOrThrow("Could not find permissions key " + completeAction)` block. The error message means the action verb **isn't registered in the permissions dictionary** — not that the user lacks permission. Actual permission-denied emits a different message from `GenerateAuthDeclined` further down the method.

Example: `table~list` is a registered permission quad but there is no handler for the verb `list` in `TableModule.cs` — the permission dictionary knows about it, the dispatcher does not.

### What can be granted at the table level

Permission quads exist for `table~query`, `table~edit` (covers `editmulti`/`editrecord`/`bulkupdate`), `table~delete` (covers most row-destructive actions), `table~create`, `table~list`, and others — `AuthPermissions.cs`. Grants are applied to users or groups against table URNs.

### Permission-quad surprises — don't assume the quad from the verb name

Several verbs are registered against quads that don't match their English-language intent. These are the traps that a `table~edit` or `table~delete` grant **won't** cover:

| Verb | Registered quad |
| --- | --- |
| `table/truncatetable` | `table~create~A` |
| `table/refreshmeta` | `table~create~A` |
| `table/setstrictness` | `table~create~A` |
| `table/createindex` / `dropindex` | `table~create~A` |
| `table/upload` | `admin~superuser` |
| `table/locktable` / `unlocktable` | `admin~superuser` |
| `table/getsuspecttables` / `setupcorruptedtable` | `admin~superuser` |
| `table/rematerializetable` | `admin~superuser` |
| `table/deletepartition` | `admin~superuser` |
| `table/getrawtablesize` | `admin~superuser` |

Rule of thumb that emerges: destructive-but-reversible-as-schema-change is `~create`, anything diagnostic/risky-at-cluster-level is `~superuser`. A regular data-editor grant (`table~edit~A`) reaches `editmulti` / `editrecord` / `bulkupdate` (`AuthPermissions.cs`) but not truncate, not upload, not locking, and **not `deletetablerows`** — filtered row deletion is registered under `table~delete~A`, so a role that can update rows cannot also delete them without a separate grant. If you're implementing a role and testing it, verify against the actual registrations in `AuthPermissions.cs`, not against the verb name.

### Setting permissions / changing ownership

**Not exposed via CLI.** **Not exposed as a dedicated `table/*` ProcessDirect verb.** There is no `table/setowner` or `table/grant` action in `TableModule.cs`. Resource-level permission management runs through the **admin module** (e.g., `admin/adjustresourcepermissions`) and account-level admin endpoints, or via the web admin UI. If a future task requires setting table ACLs from code, grep `Unified/ProcessingModules/` for `adjustresourcepermissions` and for a `permission/*` or `acl/*` module before assuming one doesn't exist — but none surfaced in `TableModule.cs` itself.

For **row-level filtering** (not grant-level permissions), plugins have a first-class surface — see `IMLDatabaseRowLevelSecurityProvider` in §7.

### Plugin API permission surface

Two interfaces on `IMLSystemContext` are relevant:

`IMLPermissions` (`MapLarge.PluginDependencies/Api/Permissions/IMLPermissions.cs` in the `plugin-dependencies` SDK) — check-only:

| Member | Purpose |
| --- | --- |
| `bool UserIsGrantedAccessToUrn(MLUser, string urn, IMLResourceGrantPermissionFlags)` | Check Read/Write/Share on a URN |
| `string BuildResourceUrn(string accountCode, string resourceType, string resourceName)` | Build URN (typically `resourceType="table"`) |
| `IEnumerable<IMLAccount> GetUserAccounts(MLUser)` | Accounts user belongs to |
| `bool IsUserAdmin(MLUser)` | Global admin check |
| `bool IsUserAccountAdmin(MLUser, string accountCode)` | Account-level admin check |

`IMLDatabaseRowLevelSecurityProvider` (accessed via `context.RowLevelSecurityProvider`) — **write-capable** for row-level security policies. Covered in §7.

For **resource-grant-style** permissions (user/group × resource × read/write/share), the plugin API is check-only — plugins that need to set those grants must self-call REST via `context.Cluster.Address` + `context.Util.CreateManagedHttpClient()`, same pattern as `ForceRunRecurringJobAsync`.

---

## 7. Plugin API (`IMLDatabase`) — database operations from inside an extension

Path: `MapLarge.PluginDependencies/Api/Database/` in the `plugin-dependencies` SDK. Access via `context.Database` where `context: IMLSystemContext` (`IMLSystemContext.cs`).

### Query / materialize (`IMLDatabase.cs`)

| Method | Purpose |
| --- | --- |
| `IMLQueryResult ExecuteQuery(string query)` | Sync SQL, column-oriented result |
| `IMLQueryResult ExecuteQuery(string, CancellationToken, Action<double> onProgress, bool rawValues)` | + cancel, progress, raw-value mode |
| `IMLQueryResult ExecuteQuery(IMLQueryRequest, …)` | Sync, query-object form |
| `Task<IMLQueryResult> ExecuteQueryAsync(string)` / `(IMLQueryRequest, …)` | Async variants |
| `IMLFilteredTable MaterializeQuery(string)` / `(IMLQueryRequest, MLImportOptions, …)` | Return as row-iterable view |
| `Task<IMLFilteredTable> MaterializeQueryAsync(string)` | Async materialize |
| `Task<IList<IMLFilteredTable>> MaterializeQueriesAsync(IList<MLQueryToMaterialize>)` | Batch materialize |
| `IMLFilteredTable GetExistingTable(string name)` | Open for read (metadata access) |
| `IMLValidateQueryResult ValidateQuery(string)` | Parse-only |

Return types:

- `IMLQueryResult` — column-oriented: `GetColumn(name)`, `GetTotal(name)`, `RowCount`.
- `IMLFilteredTable` — row-iterable: `ForEachRow`, `ForEachRowAsync`, `GetColumn<T>(name)`, metadata via `GetColumnInfo(name, includeSimpleTotals)`, properties `Name`, `Account`, `Version`, `FullTablePath`, `Schema` (`IMLFilteredTable.cs`).

No true streaming — `ExecuteQuery`/`MaterializeQuery` return in-memory objects.

### Mutations (`IMLTableOperation.cs`, chained via `Database.TableOperations.OnTable(opts)`)

| Operation | Chain |
| --- | --- |
| Create empty (schema only) | `.WithSchema(schema).CreateEmptyTable()` |
| Insert rows | `.WithSchema().AddRow(object[])` / `.AddRows(IEnumerable<object[]>)` |
| Delete specific rows (by PK match) | `.WithSchema().DeleteRow(object[])` / `.DeleteRows(rows)` |
| Delete rows matching query | `.WithQuery(queryStr).DeleteRows().Execute()` |
| Upsert (update-or-append) | `.WithQuery(queryStr).UpdateOrAppendRows().Execute()` |
| Set visibility | `.SetTableVisibilityAsync(MLTableVisibility)` — Private / PublicUnlisted / Public |
| Delete all versions | `.DeleteAllTableVersionsAsync()` |

There is no explicit `Truncate` — emulate with `WithQuery("").DeleteRows()` or use `DeleteAllTableVersionsAsync`. No `AlterSchema`, no add/drop column.

### Tags (`IMLTableOperation.cs`)

`GetTableTag`, `GetTableTags`, `AddOrEditTableTags`, `DeleteTableTags`, `DeleteAllTableTags`, `ReplaceTableTagsAsync`.

### Bulk import (`IMLMultiTableBuilder.cs`)

`context.TableBuilderProvider.GetMultiTableBuilder(MLImportOptions)` — note that `TableBuilderProvider` is a property on `IMLSystemContext` directly (`IMLSystemContext.cs`), not under `Database`. From the multi-builder: `CreateFixedSchemaTableBuilder` / `CreateVariableSchemaTableBuilder` / `CreateBatchTableBuilder`. Row-level `AddRow(object[])` / `AddRow(IDictionary<string,object>)` on `IMLTableBuilder`. `Flush()` commits. `ImportZipBatchAndFlush(fileName, options)` for zip-of-files ingestion.

### Row-level security (`IMLDatabaseRowLevelSecurityProvider`)

Accessed via `context.RowLevelSecurityProvider` (`IMLSystemContext.cs`). This is the **only write-capable security surface in the plugin API** — plugins can create, update, and delete row-level security policies against tables without having to self-call REST.

Interface (`Api/Database/RowLevelSecurity/IMLDatabaseRowLevelSecurityProvider.cs`):

| Method | Purpose |
| --- | --- |
| `Task UpsertAsync(IMLDatabaseRowLevelSecurityPolicy policy)` | Create or update a policy |
| `Task DeleteAsync(IMLDatabaseRowLevelSecurityPolicy policy)` | Delete a single policy |
| `IMLAccountPolicy GetPolicyForAccountName(string account)` | Retrieve the policy currently applied to an account |
| `Task DeletePolicyAsync(string account)` | Drop all policies for an account |

Policy shape (`IMLDatabaseRowLevelSecurityPolicy.cs`):

| Field | Purpose |
| --- | --- |
| `long ID` | Policy identifier |
| `string Account` | Which account the policy belongs to |
| `bool AdminBypass` | If true, admins skip this filter |
| `string Name` | Policy name |
| `string Where` | SQL-ish filter applied to rows |
| `HashSet<string> TableNames` | Tables the policy applies to |
| `List<string> ExemptGroupNames` | Groups excluded from filtering |

Concrete implementation is `MLDatabaseRowLevelSecurityPolicy` (`MLDatabaseRowLevelSecurityPolicy.cs`) — that's the class you instantiate and pass to `UpsertAsync`.

Distinction from `IMLPermissions`: `IMLPermissions` answers *"can this user invoke this verb on this resource?"* (grant-style, binary). `IMLDatabaseRowLevelSecurityProvider` answers *"which rows does this user actually see when reading this table?"* (row-level, filter-based, set at the account level for N tables at once). Both can apply simultaneously.

### Gaps in plugin API — fall back to HTTP self-call

Operations not on the plugin API; use `context.Util.CreateManagedHttpClient()` against `context.Cluster.Address`:

- List tables in an account (no enumeration API).
- Get table owner / enumerate users with access.
- Set resource-grant permissions (grant-style ACLs for users/groups). *Row-level security is handled natively via `RowLevelSecurityProvider` — see above.*
- Alter schema (add/drop columns on an existing table).

Pattern: `context.Util.CreateManagedHttpClient(context.Util.CreateManagedHttpClientOptions())`, then POST/GET to `$"{context.Cluster.Address}/restapi/v1/..."` or `/Api/ProcessDirect`.

---

## 8. Common recipes

### List all tables in an account

```bash
maplarge table list -account MyAccount -profile local
```

Or REST: `GET /restapi/v1/accounts/MyAccount/tables`.
Or ProcessDirect: `{"action":"table/getactivetables"}` (most compact) or `table/getactivetablesshort` for a short listing.

### Discovery one-liners (accounts, users, groups, extensions, identity)

CLI-first lookups. All of these hit REST under the hood but the CLI form is the fast path:

```bash
maplarge admin account list -profile local            # list all accounts
maplarge admin user list -profile local               # list all users
maplarge admin group list -account MyAccount -profile local
maplarge admin extension list -profile local          # installed extensions
```

Identity / server version (no CLI subcommand — use ProcessDirect directly):

```json
{"action":"admin/whoami"}
{"action":"admin/version"}
```

Enumerate every permission quad the server recognizes (useful when deciding which grant to apply):

```json
{"action":"admin/getallpermissionkeys"}
```

### ProcessDirect call from PowerShell

When REST or CLI doesn't cover the verb, this is the transport. `aInfo` is URL-encoded; `request` is a JSON string, also URL-encoded:

```powershell
$server = 'https://localhost:54062'   # your target server
$user   = '<user>'
$pass   = '<password>'

$action = @{
    action = 'table/deletetablerows'
    table  = @{
        tableName = 'MyAccount/MyTable'
        where     = "status = 'archived'"
    }
} | ConvertTo-Json -Compress -Depth 10

$aInfo   = [System.Web.HttpUtility]::UrlEncode("mluser:$user;mlpass:$pass")
$request = [System.Web.HttpUtility]::UrlEncode($action)

$response = Invoke-RestMethod -Uri "$server/Api/ProcessDirect?aInfo=$aInfo&request=$request" `
    -Method Get -SkipCertificateCheck
$response
```

For large payloads, POST the `request` as the body instead of on the query string. Bearer-token auth: drop `aInfo` and add `-Headers @{Authorization = "Bearer $token"}`.

### Query rows

```bash
maplarge query exec -profile local -input "SELECT * FROM Account.TableName LIMIT 10" -lang sql -outputTypes json -outputFile out.json
```

ProcessDirect equivalent: `{"action":"table/query","query":{"table":"Account/TableName","take":10}}` — note `/` not `.` inside the `query` string, and `table` is a string here.

### Delete rows matching a filter

**Cannot be done via CLI.** ProcessDirect:

```json
{"action":"table/deletetablerows","table":{"tableName":"Account/TableName", …filter…}}
```

Read `TableModule.cs` → `DeleteTableRowsAsync` for the exact parameter shape, or `Unified/ProcessingModules/` helpers for schema, before writing the call.

### Truncate a table (keep schema)

CLI: `maplarge table truncate-rows` (or `delete-row` — same thing). REST: `DELETE /restapi/v1/accounts/{acct}/tables/{tbl}/rows`. ProcessDirect: `{"action":"table/truncatetable", …}`.

### Delete an entire table (all versions)

CLI: `maplarge table delete -table Account/Name …`. REST: `DELETE /restapi/v1/accounts/{acct}/tables/{tbl}/versions`. ProcessDirect: `{"action":"table/deleteallversions", …}`.

### Change table visibility (Public / Private / Unlisted)

No CLI. ProcessDirect `table/settablevisibility` (`TableModule.cs`). Or plugin: `IMLTableOperation.SetTableVisibilityAsync(MLTableVisibility)`.

### Change table ownership

**No direct CLI or `table/*` ProcessDirect verb.** Use the web admin UI or admin module endpoints (check `Unified/ProcessingModules/` for account/permission admin verbs).

### Create table from data / file

- Small inline data: `maplarge table create` → POST `/restapi/v1/accounts/{acct}/tables/{tbl}`.
- File upload: `maplarge table create` with file args → POST `.../upload`.
- Empty with schema: `maplarge table create-empty` → POST `.../empty`.

### Copy a table from one server to another (snapshot)

Use case: pull a remote dev/prod table onto your local dev server. **All three paths below work** — pick the one that fits.

**Option A — CLI export + create-table** (simplest end-to-end). Verified 2026-05-18 against a 15,576-row, 24-column source table with WKT geometry: roundtripped to a new table with matching row count, column count, and sample data.

```bash
# 1. Find the active version on the source (CLI export REQUIRES -version even though --help doesn't say so)
maplarge table active-version -account SrcAccount -table SrcTable -profile remote

# 2. Export to CSV (note: -version is effectively required; omitting it gives the opaque
#    "The given key was not present in the dictionary.")
maplarge table export -account SrcAccount -table SrcTable -version <activeVersion> \
    -outputPath ./table.csv -profile remote

# 3. Create the new table on the destination from that CSV
maplarge table create-table -account DstAccount -table-name DstTable \
    -local-file-paths ./table.csv -profile local
```

**Option B — REST export endpoint directly** (when scripting outside the CLI). Returns CSV with WKT geometry column.

```powershell
# Active version
$active = Invoke-RestMethod -Headers $headers -SkipCertificateCheck `
    -Uri "https://remote/restapi/v1/accounts/SrcAccount/tables/SrcTable/versions/active"
$ver = $active.activeVersion.version

# Pull the CSV
Invoke-WebRequest -Headers $headers -SkipCertificateCheck `
    -Uri "https://remote/restapi/v1/accounts/SrcAccount/tables/SrcTable/versions/$ver/export?geoFormat=WKT&includePolicies=true&messageIdentifier=string" `
    -OutFile ./table.csv

# Then import via CLI as in Option A step 3, or POST to /tables/{tbl}/upload.
```

**Option C — Central Syncing** — see §11 (Admin → Central Syncing). Better than A/B when you need ongoing replication, large tables (binary chunked transfer is faster than CSV), whole-account sync, or tables with derived columns CSV can't express.

**Don't use** `maplarge query exec -outputTypes csv` as the "export" half. The query response uses a `data + allGeo` split that doesn't round-trip cleanly, and any derived/computed column is flattened to a value with no schema info. Use the dedicated `/export` path.

### Get/set tags (metadata key-value pairs on tables)

CLI: `maplarge table {create-tag|update-tag|delete-tag|list-tags|get-tag}`. ProcessDirect: `table/{tagset|tagget|tagdelete|tagsearch|taglist}`.

### Check if current user can read/write a table (from a plugin)

`context.Permissions.UserIsGrantedAccessToUrn(user, context.Permissions.BuildResourceUrn(account, "table", tableName), flags)`.

### Apply row-level filtering to a table (from a plugin)

Construct an `MLDatabaseRowLevelSecurityPolicy` with `Account`, `Name`, `Where` (SQL-style filter), `TableNames`, optional `ExemptGroupNames`, and `AdminBypass`, then call `context.RowLevelSecurityProvider.UpsertAsync(policy)`. Delete by passing the same policy object to `DeleteAsync`, or wipe all policies for an account with `DeletePolicyAsync(account)`.

### Accidental truncate recovery

Versioned tables preserve the last-active-version snapshot in history. `maplarge table list-versions` to see versions, then `maplarge table active-version` / ProcessDirect `table/setactivetable` / `table/restore` to roll back. Non-versioned or partitioned tables may not recover.

---

## 9. Gotchas — consolidated

| Symptom | Cause | Fix |
| --- | --- | --- |
| `maplarge table delete-row` emptied my table | CLI's `delete-row` calls the same `DELETE /rows` route as `truncate-rows`, which maps to `table/truncatetable` | For filtered delete, use ProcessDirect `table/deletetablerows` |
| `maplarge table export` fails with "The given key was not present in the dictionary." | `-version` is effectively required even though `--help` doesn't mark it REQUIRED. The CLI's internal active-version lookup fails opaquely. | Pass `-version <activeVersion>` explicitly. Get it via `maplarge table active-version` or `GET /restapi/v1/.../versions/active`. Full recipe in §8 → "Copy a table from one server to another". |
| "Could not find permissions key table/list" | `table/list` is not a registered verb (only the permission-key is) | Use `table/getactivetables` or `getalltables` |
| "Could not find permissions key table/X" for a real verb | The action isn't in the permissions dictionary — not a permission denial | Check `AuthPermissions.cs` and the `AuthManager.cs` missing-key block before assuming RBAC denial |
| `table/refreshtablemetadata` always fails auth; `table/refreshmeta` falls through to "unknown verb" | The switch literal in `TableModule.cs` disagrees with the `VERB_REFRESH_TABLE_METADATA` constant and the `AuthPermissions.cs` registration built from it | Don't rely on this verb from an external caller |
| `table~edit` grant can't truncate, can't lock, can't upload | Those verbs are registered against `table~create` or `admin~superuser` quads, not `~edit` or `~delete` | Use §6 permission-quad-surprises table; verify against `AuthPermissions.cs`, not the verb name |
| `-lang json` query works, `-lang sql` hits a different URL | CLI picks `/queries/result` vs `/sql/result` based on lang (`Execute.cs`) | Expected — check which endpoint you're hitting if debugging |
| `table/query` with `"table": {...}` returns schema error | In query actions, `table` inside the nested `query` object is a **string** (`"Account/TableName"`) | For row mutations, `table` is an object — check the verb's expected shape |
| Sub-request field comes back null on the server even though you sent it | `ApiRequest` uses a hand-rolled `JsonReader` switch with **lowercase literal** property names (`ApiRequest.cs`) — `"remoteadapter"` is recognized, `"remoteAdapter"` / `"RemoteAdapter"` / `"remote_adapter"` are silently dropped | Lowercase the JSON key. When uncertain of the exact key for a sub-object, grep `ApiRequest.cs` for `case "..."` to see what the parser accepts |
| OAM server ignores `aInfo` | OAM deployments strip it | Use client cert + Bearer token; see the `maplarge-oam-auth` skill |
| Plugin can't enumerate tables / can't set resource-grant permissions | `IMLDatabase` / `IMLPermissions` don't expose these | Self-call REST via `context.Util.CreateManagedHttpClient()`. Row-level security IS exposed — use `context.RowLevelSecurityProvider` |
| `context.Database.TableBuilders` doesn't compile | The provider is on `IMLSystemContext`, not `Database` | Use `context.TableBuilderProvider` (`IMLSystemContext.cs`) |
| Expected a `truncate` on `IMLTableOperation`, not there | API has no dedicated Truncate | `WithQuery("").DeleteRows().Execute()` or `DeleteAllTableVersionsAsync()` |
| CLI profile change didn't take effect | Profile cached in ADK project config | Update the relevant `.adk/.www/maplarge.adk.config.json` or `%APPDATA%\MapLargeCLI\maplarge.cli.config.json` |

---

## 10. Authoritative source map (for re-verification)

| Question | Open |
| --- | --- |
| Does a ProcessDirect `table/*` verb exist? | `MapLarge.Engine/Unified/ProcessingModules/TableModule.cs` |
| Does a ProcessDirect `admin/*` verb exist? | `MapLarge.Engine/Unified/ProcessingModules/AdminModule.cs` |
| What REST route does the CLI hit? | `maplarge-cli/dotnet/cli/{table,admin,query}/*.cs` |
| What ProcessDirect action does a REST route delegate to? | `MapLarge.Engine/RestApi/Operations/Tables/*.cs` — one class per route; each sets `action = "table/<verb>"` (moved from the retired `MapLarge.Server/Controllers/Rest/TablesController.cs`, 2026-09) |
| Is this permission key registered? | `MapLarge.Engine/Unified/Auth/AuthPermissions.cs` |
| How is a permission failure vs missing-key resolved? | `MapLarge.Engine/Unified/Auth/AuthManager.cs` |
| What JSON property name does the request parser expect? | `MapLarge.Engine/Unified/Request/ApiRequest.cs` — grep for `case "…":` in the reader switch (hand-rolled, case-sensitive lowercase) |
| What can a plugin do with tables? | `MapLarge.PluginDependencies/Api/Database/*.cs` (in the `plugin-dependencies` SDK) |
| What can a plugin do with permissions? | `…\Api\Permissions\IMLPermissions.cs` |
| What does `IMLSystemContext` give me? | `…\Api\IMLSystemContext.cs` |
| What about Central Syncing / RemoteSync (Admin → Central Syncing)? | See §11 — separate intercluster surface, not part of `table/*`. |

**Rule when this doc and code disagree: code wins.** Update this doc.

**Drift note (2026-09-09, ARC-46/ARC-54):** citations were re-verified against trunk `119ba585c6e` (2026-08-26) and then converted from `file:line` to symbol anchors — the verb string, handler method, permission registration, or interface member named alongside each file. To resolve one, grep the named symbol in the cited file. Known structural drift since the original write: the REST controller layer moved wholesale to `MapLarge.Engine/RestApi/Operations/` (one class per route, each setting its `action` string). Verbs and permission quads were re-verified unchanged.

---

## 11. Central Syncing / RemoteSync (Admin → Central Syncing)

> Reached from the left-nav: **Admin → Central Syncing**, URL `/dashboard/repo/RemoteSync/Management`. Dashboard registration at `MapLarge.Server/src/intercluster/repo/RemoteSync/Management.ts`; UI controls under `MapLarge.Server/src/intercluster/controls/admin/RemoteSync/`.

This page is **not** a generic table-editing surface. It is the configuration UI for **InterCluster** — MapLarge's table-replication system between two MapLarge servers. The local server is the **Edge**; the remote server it talks to is the **Central**. The page lists Central Servers you've registered, the SyncedTablePairs (table-on-edge ↔ table-on-central), and SyncedAccountPairs (all tables in an account, synced as a group). The data-mutation side effect is that an active sync pair *replicates rows* between the two servers — so a `forcesync` or `setsyncmode` here can change row counts on the remote (and, for Pull / Full mode, on the local) server.

### When to use Central Sync vs CLI export/import

For a one-shot table snapshot from server A to server B, **CLI `maplarge table export` + `create-table` is simpler** (see §8 → "Copy a table from one server to another"). Reach for Central Sync when you need:

- **Ongoing replication** — keep two tables converged, not just a point-in-time copy
- **Whole-account sync** — auto-create pairs for every table in an account (SyncedAccountPair)
- **Large tables** — `forcesync` uses MLZ4-compressed chunked binary transport (`ConsensusBinary`), more efficient than CSV for big payloads
- **Derived/computed columns** — CSV can't express them; Central Sync replicates the underlying schema
- **Persistent config** — re-sync is a single button click after initial setup

One discovery gap worth flagging: Central Sync is the right answer to several common needs ("get me production data on my dev box, keep it fresh"), but is **not** discoverable from CLI `--help` text. Surfacing this here is part of why this section exists.

### 11.1 Topology and concepts

| Concept | What it is | Persistence (server-side) |
| --- | --- | --- |
| **Central Server** | A remote MapLarge cluster the edge can talk to. Holds URL, auth provider, credentials, nice name, tag-handling behavior. | `CentralServer` (`MapLarge.Engine/InterCluster/Persistence/CentralServer.cs`) |
| **SyncedTablePair** | An edge table paired with a central table, with `SyncMode` + optional `Filter` / `PushFilter` / `QueryOverride` / `TagsToIgnore`. | `SyncedTablePair` (`Persistence/SyncedTablePair.cs`) |
| **SyncedAccountPair** | An edge account paired with a central account; auto-creates table pairs for every table in the account. | `SyncedAccountPair` (`Persistence/SyncedAccountPair.cs`) |
| **BandwidthLimit** | Per-server or per-pair throttle (bytes/period). | `BandwidthLimitDto` |
| **InterClusterRole** | Server role that lets a peer cluster call `intercluster/*` verbs on this server (`ValidRoleNames.INTERCLUSTER_ROLE`). | — |

### 11.2 SyncMode values

`MapLarge.Engine/InterCluster/SyncMode.cs` — `[Flags]`:

| Value | Meaning |
| --- | --- |
| `None = 0` | No replication; pair record retained for tracking only. |
| `Push = 1` | Edge pushes its changes to Central. Central may have *more* if written by other paths. |
| `Pull = 2` | Edge pulls changes from Central. Edge-side edits are not pushed back. |
| `Full = Push \| Pull = 3` | Bidirectional. Edge and Central converge. |
| `Once = 4` | One-shot sync (combinable as flag). |

### 11.3 Which surfaces are available

| Surface | Coverage | Notes |
| --- | --- | --- |
| **Admin UI** (`/dashboard/repo/RemoteSync/Management`) | Full CRUD over servers, pairs, sync, filters; bulk operations | Uses ProcessDirect under the hood (`_Services.ts`). |
| **REST API** `/restapi/v1/intercluster/...` | Servers, table pairs, account pairs, bandwidth limits; force-sync per pair | `InterclusterServersController.cs`, `InterclusterTablePairsController.cs`, `InterclusterAccountPairsController.cs`, `InterclusterBandwidthLimitsController.cs` |
| **ProcessDirect** `intercluster/*` | Widest — includes `setsyncmode`, `setfilter`, `setpushfilter`, `setqueryoverride`, `settagstoignore`, `setinactive`, `resettrackingbyserver`, `enabledisablesync`, etc. | `InterClusterModule.cs` |
| **CLI** | **None** — no `maplarge intercluster …` subcommands exist | Drop to REST or ProcessDirect. |
| **Plugin API** | Not exposed via `IMLSystemContext` | If a plugin needs to drive sync, self-call REST. |

### 11.4 ProcessDirect `intercluster/*` action catalog

Routed in `InterClusterModule.cs` (`switch (uParams.actionVerb)`); the `VERB_*` string constants live in the same file. Permission keys in `AuthPermissions.cs` (grep `intercluster`).

#### Servers (CRUD on Central Server registrations)

| Verb | Purpose | Permission | Handler |
| --- | --- | --- | --- |
| `intercluster/listservers` | List all registered Central Servers | `intercluster~getserver~O` | `ListServersAsync` |
| `intercluster/getserver` | Get one by id | `intercluster~getserver~O` | `GetServerAsync` |
| `intercluster/addserver` | Register a Central Server (validates credentials before persist) | `intercluster~server` | `AddServerAsync` |
| `intercluster/updateserver` | Full replace | `intercluster~server` + role | `UpdateServerAsync` |
| `intercluster/updateserverpartial` | Patch by id (only non-empty fields applied) | `intercluster~server` + role | `UpdateServerPartialAsync` |
| `intercluster/deleteserver` | Remove server registration | `intercluster~server` + role | `DeleteServerAsync` |
| `intercluster/getuniqueid` | This edge's unique id | `intercluster~test` | `GetUniqueID` |
| `intercluster/edgeinfo` | Nice name + unique id | `admin~superuser` | `GetEdgeInfo` |
| `intercluster/test` | Test reachability | `intercluster~test` | `TestAsync` |
| `intercluster/exportconfiguration` | Export full intercluster config | `admin~superuser` + role | — |
| `intercluster/resetrepos` | Wipe local intercluster repos | `admin~superuser` + role | `ResetReposAsync` |
| `intercluster/healthcheck` | Run server-to-server health check | `admin~superuser` + role | `HealthCheckAsync` |
| `intercluster/enabledisablesync` | Toggle the whole intercluster subsystem | `admin~superuser` | — |

#### Table pairs (read + mutate)

| Verb | Purpose | Permission | Handler |
| --- | --- | --- | --- |
| `intercluster/getsyncedtablepairs` | All pairs visible to caller | `intercluster~pread~A` + role | `GetSyncedTablePairsAsync` |
| `intercluster/getsyncedtablepairsbyserver` | Pairs for one Central + tables on that Central | `intercluster~pread~A` + role | — |
| `intercluster/getedgeandcentraltables` | Tables present on edge AND on central, with pair info | `intercluster~pread~A` + role | — |
| `intercluster/getsyncedtablepair` | One pair by id (deprecated path) | `intercluster~pread~A` + role | — |
| `intercluster/getsyncedtablepairwithhistory` | One pair + status history | `intercluster~pread~A` + role | — |
| `intercluster/getsyncedtablepairswithhistory` | Many pairs + status history | `intercluster~pread~A` + role | — |
| `intercluster/addsyncedtablepair` | Create a table-pair; accepts `interclusterBulk` for bulk | `intercluster~pwrite~A` + role | `AddSyncedTablePairAsync` |
| `intercluster/updatesyncedtablepair` | Update pair (bulk via `interclusterBulk`) | `intercluster~pwrite~A` + role | — |
| `intercluster/deletesyncedtablepair` | Delete pair (config only; does **not** delete table data); bulk via `SyncedTablePairIdList` | `intercluster~pwrite~A` + role | `DeleteSyncedTablePairAsync` |
| `intercluster/setsyncmode` | Change `SyncMode` on a pair | `intercluster~pwrite~A` + role | `SetSyncModeAsync` |
| `intercluster/setinactive` | Pause/resume a pair (`Inactive` bool); bulk-capable | `intercluster~pwrite~A` + role | `SetInactiveAsync` |
| `intercluster/setfilter` | Edge-side WHERE applied when pulling | `intercluster~pwrite~A` + role | `SetFilterAsync` |
| `intercluster/setpushfilter` | Edge-side WHERE applied when pushing | `intercluster~pwrite~A` + role | `SetPushFilterAsync` |
| `intercluster/setqueryoverride` | Override the pull query entirely (validated as a real query) | `intercluster~pwrite~A` + role | `SetQueryOverrideAsync` |
| `intercluster/settagstoignore` | Tag-list whose changes shouldn't trigger sync | `intercluster~pwrite~A` + role | `SetTagsToIgnoreAsync` |
| `intercluster/forcesync` | Immediately run sync for a pair; optional `ResetTracking`, `WaitForSync`, `CanPause` | `intercluster~run~A` + role | `ForceSyncAsync` |
| `intercluster/resettrackingbyserver` | Clear sync-tracking state for an entire Central (next sync re-checks everything) | `intercluster~create~A` + role | `ResetTrackingByServerAsync` |
| `intercluster/ensuresync` | Mobile/desktop helper — wait until current sync drains | (n/a) | — |

#### Account pairs

| Verb | Purpose | Permission | Handler |
| --- | --- | --- | --- |
| `intercluster/getsyncedaccountpairs` | All account pairs visible | `intercluster~pread~A` + role | — |
| `intercluster/getsyncedaccountpairsbyserver` | By Central server | `intercluster~pread~A` + role | — |
| `intercluster/getsyncedaccountpairwithhistory` | One pair + status history | `intercluster~pread~A` + role | — |
| `intercluster/addsyncedaccountpair` | Create account pair (auto-creates table pairs for each table) | `intercluster~pwrite~A` + role | — |
| `intercluster/updatesyncedaccountpair` | Update | `intercluster~pwrite~A` + role | — |
| `intercluster/deletesyncedaccountpair` | Delete account pair (config only) | `intercluster~pwrite~A` + role | — |
| `intercluster/setaccountsyncinactive` | Pause/resume account-level sync | `intercluster~pwrite~A` + role | `SetAccountSyncInactiveAsync` |

#### Bandwidth limits

| Verb | Purpose | Permission |
| --- | --- | --- |
| `intercluster/getbandwidthlimit` / `getbandwidthlimits` | Read | `intercluster~pread~A` + role |
| `intercluster/addbandwidthlimit` / `updatebandwidthlimit` / `deletebandwidthlimit` | Write | `intercluster~pwrite~A` + role |

**Server-to-server transport** (used by Central ↔ Edge wire calls, not the UI directly — listed for completeness): `gettabledata`, `gettabledatastart`, `gettabledataready`, `gettabledataend`, `gettabledatareleasefile`, `pushtabledata`, `getpushpreferences`, `preparepush`, `pushtabledatachunked`, `completechunkedpush`, `pushimportresult`, `getlatestversion`, `getlatestversionmany`, `gettables`, `pushlogs`. Permissions are mostly `table~export~A` (pull side) or `table~create~A` (push side). Source: `AuthPermissions.cs`.

### 11.5 REST → ProcessDirect map (intercluster)

| REST | ProcessDirect | Controller |
| --- | --- | --- |
| `GET /restapi/v1/intercluster/servers` | `intercluster/listservers` | `InterclusterServersController.cs` |
| `GET /restapi/v1/intercluster/servers/{id}` | `intercluster/getserver` | `InterclusterServersController.cs` |
| `POST /restapi/v1/intercluster/servers` | `intercluster/addserver` | `InterclusterServersController.cs` |
| `PUT /restapi/v1/intercluster/servers/{id}` | `intercluster/updateserverpartial` (**not** `updateserver`) | `InterclusterServersController.cs` |
| `DELETE /restapi/v1/intercluster/servers/{id}` | `intercluster/deleteserver` | `InterclusterServersController.cs` |
| `GET /restapi/v1/intercluster/servers/{server}/tablepairs` | `intercluster/getsyncedtablepairsbyserver` | `InterclusterTablePairsController.cs` |
| `GET .../tablepairs/synchronized` | `intercluster/getsyncedtablepairsbyserver` (filtered to those with a real pair id) | `InterclusterTablePairsController.cs` |
| `GET .../tablepairs/{id}` | `intercluster/getsyncedtablepair` | `InterclusterTablePairsController.cs` |
| `POST .../tablepairs` | `intercluster/addsyncedtablepair` | `InterclusterTablePairsController.cs` |
| `DELETE .../tablepairs/{id}` | `intercluster/deletesyncedtablepair` | `InterclusterTablePairsController.cs` |
| `POST .../tablepairs/{id}/sync` | `intercluster/forcesync` | `InterclusterTablePairsController.cs` |
| `GET /restapi/v1/intercluster/servers/{server}/accountpairs` | `intercluster/getsyncedaccountpairsbyserver` | `InterclusterAccountPairsController.cs` |
| `GET .../accountpairs/{id}` | `intercluster/getsyncedaccountpairwithhistory` | `InterclusterAccountPairsController.cs` |
| `POST .../accountpairs` | `intercluster/addsyncedaccountpair` | `InterclusterAccountPairsController.cs` |
| `DELETE .../accountpairs/{id}` | `intercluster/deletesyncedaccountpair` | `InterclusterAccountPairsController.cs` |
| `GET /restapi/v1/intercluster/bandwidthlmits` *(sic — typo in route)* | `intercluster/getbandwidthlimits` | `InterclusterBandwidthLimitsController.cs` |
| `POST /restapi/v1/intercluster/bandwidthlmits` | `intercluster/addbandwidthlimit` | `InterclusterBandwidthLimitsController.cs` |
| `PUT .../bandwidthlmits/{id}` | `intercluster/updatebandwidthlimit` | `InterclusterBandwidthLimitsController.cs` |
| `DELETE .../bandwidthlmits/{id}` | `intercluster/deletebandwidthlimit` | `InterclusterBandwidthLimitsController.cs` |

REST has **no** routes for `setsyncmode`, `setinactive`, `setfilter`, `setpushfilter`, `setqueryoverride`, `settagstoignore`, `resettrackingbyserver`, or any of the bulk variants. For those, call ProcessDirect.

### 11.6 Bulk operations

The ProcessDirect request shape supports a top-level `interclusterBulk` array (instead of `intercluster`) on several verbs — `addsyncedtablepair`, `updatesyncedtablepair`, `setinactive`, `deletebandwidthlimit`. For deletes, `intercluster.SyncedTablePairIdList` is the bulk-id list on a single request (`DeleteSyncedTablePairAsync`). The admin UI uses these via `bulkUpsertTableSyncPair`, `bulkSetTableInactive`, `bulkDeleteSyncedPair` in `_Services.ts`.

### 11.7 Data-mutation impact — what actually changes rows

Most intercluster verbs only mutate the **intercluster config repo** (sync-pair metadata). The ones that mutate **table data** — directly or indirectly — are:

| Verb | Data impact |
| --- | --- |
| `intercluster/forcesync` | Triggers an immediate replication run for one pair. Push modes copy edge → central; Pull modes copy central → edge; `ResetTracking=true` re-sends everything from scratch. Can add, update, or delete rows on the destination. |
| `intercluster/setsyncmode` | Changing from `None`/`Push` to `Pull`/`Full` will, on next sync tick, start *writing rows to the edge*. Be deliberate. |
| `intercluster/resettrackingbyserver` | Clears tracking for an entire Central; next sync re-replicates the full table content for every pair on that server. |
| `intercluster/pushtabledata` / `intercluster/pushtabledatachunked` | Server-to-server: edge → central row push (used internally by sync; permission `table~create~A`). |
| `intercluster/gettabledatastart` (and friends) | Server-to-server: pull pipeline (permission `table~export~A`). |
| `intercluster/addsyncedaccountpair` with `ExecuteImmediately=true` | Auto-creates table pairs *and* kicks off initial sync — first-time pulls can write large amounts of data to the edge. |

`intercluster/deletesyncedtablepair` and `deletesyncedaccountpair` **do not** delete the underlying table data on either side. They remove the sync configuration only. To delete the table data, use the regular `table/*` surface (§5).

### 11.8 Gotchas

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Where's the CLI for intercluster?" | There isn't one. | Use REST or ProcessDirect; the admin UI is the only ergonomic option for routine ops. |
| `PUT /intercluster/servers/{id}` doesn't replace fields I left out | REST PUT maps to **`updateserverpartial`**, which only overwrites non-empty fields (`InterClusterModule.cs`). | To wipe a field, use ProcessDirect `intercluster/updateserver` with the full server object. |
| 404 on `/restapi/v1/intercluster/bandwidthlmits` looks like a typo | It *is* a typo (`bandwidthlmits` not `bandwidthlimits`) baked into the route literal — `InterclusterBandwidthLimitsController.cs`. | Use the route as written. |
| Deleted a sync pair and now the central data is gone too | Won't happen from `deletesyncedtablepair`. If central rows vanished, look at the pair's `SyncMode` and `forcesync` history — Pull/Full mode + edge-side deletes will propagate to central before the pair is removed. | Check the pair's status history (`getsyncedtablepairwithhistory`) before deleting. |
| `forcesync` returned `"Sync started"` but nothing happened | It's fire-and-forget unless `WaitForSync=true`. Watch the pair's status history for completion. | Poll `getsyncedtablepairwithhistory`. |
| Need the `interclusterRole` to call something the admin UI handles silently | Many `intercluster/*` verbs require both an account-quad permission **and** the server-level `interclusterRole` (`AuthPermissions.cs`). | Either grant the role to the calling user, or call from a user that has it (typically a peer-server identity). |
| Setting `SyncMode=None` to "stop a runaway sync" didn't stop it fast enough | `setsyncmode` only changes config; it doesn't cancel an in-flight sync. | Use `intercluster/setinactive` with `Inactive=true`, then `setsyncmode`. |
| Changes to a SyncedTablePair filter took effect on next pull but not retroactively | Filters apply going forward. Already-replicated rows are not retracted. | If you need to drop those rows, mutate the destination table directly (§5). |

### 11.9 Authoritative source map (intercluster additions to §10)

| Question | Open |
| --- | --- |
| Does `intercluster/*` verb X exist? | `MapLarge.Engine/Unified/ProcessingModules/InterClusterModule.cs` — the `switch (uParams.actionVerb)` dispatch and the `VERB_*` string constants |
| What permission does `intercluster/*` verb X require? | `MapLarge.Engine/Unified/Auth/AuthPermissions.cs` |
| What ProcessDirect action does an `/intercluster/...` REST route delegate to? | `MapLarge.Server/Controllers/Rest/Intercluster{Servers,TablePairs,AccountPairs,BandwidthLimits}Controller.cs` |
| What does the admin UI actually call? | `MapLarge.Server/src/intercluster/controls/admin/RemoteSync/_Services.ts` (each function names the ProcessDirect verb) |
| Persistence shape (CentralServer / SyncedTablePair / SyncedAccountPair) | `MapLarge.Engine/InterCluster/Persistence/*.cs` |
| SyncMode enum + descriptions | `MapLarge.Engine/InterCluster/SyncMode.cs` |
| Server-to-server wire protocol (push/pull/chunked) | `MapLarge.Engine/InterCluster/DataMover.cs`, `ServerToServer/InterClusterConnector.cs` |

---

## 12. Connecting to an external relational database (Postgres / Aurora / Oracle)

> "Direct database connection to a relational database" (e.g. Amazon Aurora PostgreSQL). Support is **very basic**: every path is **pull-and-materialize**, not a federated live link or CDC. All three wrap the same core — `MLUtil.RelationalDatabase.RelationalDatabaseQuery.ReadDataAsync(provider, connectionString, sql)` — so any ADO.NET provider works. Providers verified in tests: **`Npgsql`** (Postgres → Aurora is wire-compatible) and **`Oracle.ManagedDataAccess.Client`**.

There are **two canonical entry points** plus a third, de-emphasized variant.

### 12.1 DataStream `RelationalDatabaseConnector` (ingest — copies rows in)

Polling on-ramp that copies query results into a **native MapLarge table** on a schedule. The **only** relational path with incremental tracking (`{TRACKING}` column → `SQLDateTracker`/`SQLIntegerTracker`). Connector config keys: `Provider`, `ConnectionString`, `Query` or `Queries` (named dict → routing keys), `TrackingColumnName`, `PollingFrequencyMS`. Full config is owned by the **`maplarge-datastreams`** skill (`reference/ConnectorConfig.md` → *RelationalDatabaseConnector*) — don't duplicate it here. Use when you want a physical, synced copy resident in MapLarge.

### 12.2 `RelationalDatabaseTableValuedFunction` (query — inline live read)

A table-valued function used as a **query source**; runs the SQL live and feeds rows into the query pipeline (so you can `SELECT` / join / run geo+expression functions over the result inline). Source: `MapLarge.Engine/Query/TableValuedFunctions/RelationalDatabaseTableValuedFunction.cs`.

- Registered name: **`RelationalDatabaseTableValuedFunction`**. Params: `provider`, `connectionString`, `sql`, plus optional **`asof`** (cache-buster).
- Results are **LRU-cached** (`InMemoryDatabase.cs`, `TVFCache`, capacity 10); bump `asof` to force a fresh pull.
- Invoked as a query source via `QueryTable.function` = `QueryTableFunction{account, name, param}` (`MapLarge.Engine/Unified/QueryParts/QueryTable.cs`; "exactly one of `name`/`query`/`function`"). Tests drive it through the internal `QueryRequestBuilder` — **the exact external `table/query` JSON for a `function` source is not verified here** (verify before quoting a wire example).
- ⚠️ **Credential exposure:** the connection string is a **raw query parameter**, so it lands in query bodies and logs. (The endpoint-backed path in §12.3 encrypts it instead.)

### 12.3 External Table with relational source (persisted twin of the TVF)

A registered external table backed by a saved SQL query. Functionally the same materialize-once behavior as the TVF, but persisted with a table name and an encrypted endpoint. **Least-polished of the three** — tested only by an `[Explicit]` PostGIS-container test (`MapLarge.IntegrationTests/Tests/Engine/Database/ExternalTableFixture.cs` `CreateRelationalDatabaseExternalTableAsync`), not in normal CI; both TVF and external-relational tests are `[Explicit]`.

- **Endpoint:** `RelationalDatabaseRemoteEndpoint` (`type = "RelationalDatabaseEndpoint"`), payload `Provider`, encrypted payload `ConnectionString` (`MapLarge.Engine/RemoteEndpoints/RelationalDatabaseRemoteEndpoint.cs`). Managed via the admin remote-endpoint verbs (`VERB_*_ENDPOINT`, see §5 admin catalog).
- **Source plugin:** `ExternalRelationalDatabaseSource` (config `{ "sql": "…" }`, `…/Database/External/Source/ExternalRelationalDatabaseSource.cs`). **Parser plugin:** `ExternalRelationalDatabaseParser` — a no-op forwarder to the source (`…/Database/External/Parser/ExternalRelationalDatabaseParser.cs`).
- **Verbs (ProcessDirect):** `createexternaltable`, `editexternaltable`, `deleteexternaltable`, `listexternaltable`, `externaltableschema` (`TableModule.External.cs`; +partitioned variants). Schema can be auto-discovered (samples ≤1000 rows, `TableModule.External.cs`).
- **REST routes** (`…/RestApi/Operations/ExternalTables/ExternalTableOperation.cs`): `POST /externaltables`, `PUT /externaltables/{id}`, `DELETE /externaltables/{id}`, `GET /externaltables` (all) / `GET /accounts/{account}/externaltables` (per-account), `GET /externaltables/{id}`, `POST /externaltables/schema` (discover).

### 12.4 Which to use

| Need | Path |
| --- | --- |
| Physical synced copy in MapLarge; incremental loads | §12.1 DataStream connector (only path with `{TRACKING}`) |
| Ad-hoc "reach into Aurora now," join against live result | §12.2 TVF |
| Named, persisted live-backed table with encrypted creds | §12.3 External Table relational source (least-exercised) |

### 12.5 Authoritative source map (additions to §10)

| Question | Open |
| --- | --- |
| Shared execution core (all three paths) | `MLUtil.RelationalDatabase.RelationalDatabaseQuery.ReadDataAsync` (MLUtil package) |
| TVF params / caching | `MapLarge.Engine/Query/TableValuedFunctions/RelationalDatabaseTableValuedFunction.cs`; `InMemoryDatabase.cs` |
| External relational source/parser | `MapLarge.Engine/Database/External/{Source/ExternalRelationalDatabaseSource,Parser/ExternalRelationalDatabaseParser}.cs` |
| Relational remote endpoint shape | `MapLarge.Engine/RemoteEndpoints/RelationalDatabaseRemoteEndpoint.cs` |
| External-table verbs / REST routes | `MapLarge.Engine/Unified/ProcessingModules/TableModule.External.cs`; `…/RestApi/Operations/ExternalTables/` |
| Worked tests (both `[Explicit]`) | `…/Tests/Engine/Query/TableValuedFunctions/RelationalDatabaseTVFFixture.cs`; `…/Tests/Engine/Database/ExternalTableFixture.cs` |
| DataStream connector config | See the **`maplarge-datastreams`** skill → `ConnectorConfig.md` *RelationalDatabaseConnector* |
