# Extension Reference

High-signal reference for the parts of ADK extension authoring that come up most often in Claude Code sessions. Use the published doc portal for deeper API coverage.

## Typical Layout

```text
my-extension/
├── manifest.json
├── client/
│   ├── init.ts
│   ├── views/
│   ├── view-models/
│   ├── data/
│   ├── layers/
│   └── _static/
├── server/
│   └── MyExtension/
│       └── MyExtension.csproj
├── playwright/
└── ci/
```

Common rules:

- `manifest.json` is the extension entrypoint.
- `client/` holds TypeScript, views, assets, and optional UI tests.
- `server/` is optional. Use it for .NET plugins, endpoints, jobs, table-valued functions, and other server-side logic.
- `playwright/` and `ci/` are optional but commonly packaged with internal extension workflows.

## Manifest Basics

Most extensions start with these fields:

| Field            | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `Name`           | Stable extension identifier                                |
| `Version`        | Extension version                                          |
| `FriendlyName`   | Display name                                               |
| `Description`    | Short summary                                              |
| `MinCoreVersion` | Minimum required MapLarge Core version                     |
| `MaxCoreVersion` | Optional maximum supported MapLarge Core version           |
| `Plugins`        | Server DLLs to load, if the extension has server-side code |

Client-only extensions may omit `Plugins`.

## Dependencies

Use `Dependencies` when one extension requires another to load first:

```json
"Dependencies": [
  { "Extension": "geo-editor" }
]
```

Client code can then import dependency modules with `ext/<extension-name>/...` paths.

## Accounts and Tables

Use `Accounts` to declare table namespaces:

```json
"Accounts": [
  { "Name": "myaccount", "Description": "Primary data account" }
]
```

Use `CreateTables` for tables the platform should create on install:

```json
"CreateTables": [
  {
    "Account": "myaccount",
    "Name": "myTable",
    "Visibility": 2,
    "AlwaysCreate": false,
    "Columns": [
      { "Name": "id", "Type": "Guid" },
      { "Name": "name", "Type": "String" }
    ],
    "PKColumns": ["id"]
  }
]
```

`CreateTables` is not enough when the real target table path is resolved from extension config at runtime. In that case, the extension should resolve the effective `<account>/<table>` path itself and enforce schema against that table in server code.

Use `ImportTables` for seed or reference data loaded from a file or URL:

```json
"ImportTables": [
  {
    "Account": "myaccount",
    "Name": "seedData",
    "Visibility": 0,
    "AlwaysCreate": false,
    "ImportURI": "_data/seed.csv"
  }
]
```

Notes:

- `Account` can be one of your extension accounts or `_system` for platform-level internal tables.
- `Visibility` is often expressed as either an integer or a named value, depending on the extension and platform version.
- `AlwaysCreate` should be used carefully because it changes startup and upgrade behavior.

## Documentation and Packaging

Useful manifest sections beyond the core fields:

- `Documentation`: register markdown, PDF, link, or folder entries for the Doc Portal
- `ReleaseNotes`: point to a bundled release-notes document
- `PackageFolders`: include extra folders in the packaged output when needed
- `Resources`: declare packaged or remote resources associated with extension accounts
- `Config`: point to bundled config and schema files
- `JSBundles`: register additional JavaScript bundles and optional type declarations
- `ETLWorkflows`: package ETL workflow definitions
- `Groups`: declare account group/role metadata

Use these when the extension ships docs, tests, or bundled assets that need to survive packaging.

## Client-Side Notes

Common client entry points:

- `init.ts` for side-effect registration and dependency setup
- `views/` plus `view-models/` for UI composition
- `data/` for schemas, descriptors, queries, and data sources
- `layers/` for map layers and map-specific presentation

Keep dependency imports explicit. If the extension depends on another extension for shared descriptors, controls, or setup, `init.ts` is usually the safest place for those side-effect imports.

## Server-Side Notes

Add a `server/` project when the extension needs:

- custom REST endpoints
- scheduled jobs
- data stream connectors or transforms
- table-valued functions
- direct server-side database access

If the extension ships a server assembly, make sure the built DLL name appears in `Plugins`.

## Runtime Schema Enforcement

For runtime-configured target tables, prefer lightweight schema inspection over probe queries:

```csharp
using System.Linq;

var table = systemContext.Database.GetExistingTable(tablePath)
    ?? throw new Exception($"Required table '{tablePath}' was not found.");

bool hasStatusColumn = table.GetColumnInfo().Any(c => c.Name == "status");
```

`GetExistingTable("<account>/<table>")` returns an `IMLFilteredTable`, and `GetColumnInfo()` lets the extension enumerate columns without running a data query. Prefer this over `SELECT some_column ...` probes, especially on connector startup paths.

When a required column is missing on an existing table, a practical migration path is a fixed-schema builder plus `Flush()`:

```csharp
using System.Linq;
using MapLarge.PluginDependencies.Api.Import;

static async Task EnsureStatusColumnAsync(IMLSystemContext systemContext, string tablePath) {
    var table = systemContext.Database.GetExistingTable(tablePath)
        ?? throw new Exception($"Required table '{tablePath}' was not found.");

    if (table.GetColumnInfo().Any(c => c.Name == "status")) {
        return;
    }

    var parts = tablePath.Split('/', 2);
    if (parts.Length != 2) {
        throw new Exception($"Expected '<account>/<table>' but got '{tablePath}'.");
    }

    var importOptions = new MLImportOptions {
        Account = parts[0],
        Table = parts[1],
    };

    using var multiBuilder = systemContext.TableBuilderProvider.GetMultiTableBuilder(importOptions);
    multiBuilder.CreateFixedSchemaTableBuilder(
        new MLSchema(new[] {
            new MLColumnInfo { Name = "status", Type = MLColumnType.String },
        }),
        importOptions);
    await multiBuilder.Flush();

    var migrated = systemContext.Database.GetExistingTable(tablePath)
        ?? throw new Exception($"Table '{tablePath}' was not found after migration.");
    if (!migrated.GetColumnInfo().Any(c => c.Name == "status")) {
        throw new Exception($"Required column 'status' is still missing from '{tablePath}'.");
    }
}
```

Recommended pattern:

- resolve the effective configured table path
- inspect schema with `GetExistingTable(...).GetColumnInfo()`
- run a fixed-schema migration when a required column is missing
- re-check the schema
- fail fast if the required schema element is still absent

Lifecycle handlers are the right place for this when install, upgrade, or config changes can alter the effective target table. In `core`, `LifeCycleEvents.Installed` and `LifeCycleEvents.ConfigUpdated` are the relevant extension events to handle; use `LifeCycleEvents.ServerStartup` as well when the extension must re-verify schema on boot.

## Canonical References

- [ADK docs portal](https://docs.maplarge.com/dashboard/ext/docportal/portal)
- [MapLarge CLI guide](https://docs.maplarge.com/dashboard/ext/docportal/portal/MapLargeCLI)

## Common Manifest Gotchas

- `Name` must match the extension folder and package identity expected by ADK tooling.
- `Documentation[].Resources[].Path` is served under `/ext/<extension-name>/...`.
- `CreateTables` column names should match client/server model casing conventions intentionally.
- Do not rely on manifest `CreateTables` alone when the actual target table path comes from runtime config.
- For server extensions, `Plugins` must include the built plugin DLL name.
- Changing an extension folder name requires checking:
  - `manifest.json`
  - `client/home.ts`
  - generated declarations in `.adk/types.d`
  - route IDs and public dashboard IDs
  - docs paths under `/ext/<extension>/...`
