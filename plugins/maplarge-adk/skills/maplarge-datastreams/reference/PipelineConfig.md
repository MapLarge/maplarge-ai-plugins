# MapLarge DataStream Pipeline Configuration Guide

> **Scope**: Reference for the **Pipeline Definition** JSON that goes into the **Pipeline tab** of the MapLarge on-ramp create/edit dialog. This document covers pipeline structure, data flow, parsers, transforms, committers, and practical examples.
> **Last updated**: 2026-10-08 (checked against `maplarge-api-server-git` Stable_Trunk 4ef1d0986b6)

---

## IMPORTANT: Two Separate Configs - Do NOT Combine

| UI Tab | What you generate | Documented in |
| -------- | ------------------ | --------------- |
| **Connector tab** | Flat JSON object with connector-specific properties | `ConnectorConfig.md` |
| **Pipeline tab** (this doc) | JSON object with `NumberOfWorkers` + `Steps` array | This file |

Do NOT wrap pipeline JSON in an on-ramp envelope. Do NOT include `connectorPluginName`, `connectorOptions`, `effectiveUserName`, or any other on-ramp-level fields. The UI handles those separately. User pastes your JSON into the **Pipeline tab** "Show JSON" editor. Connector is configured separately in the **Connector tab** (see `ConnectorConfig.md`).

---

## Table of Contents

- [What a Pipeline Does](#what-a-pipeline-does)
- [Pipeline Structure](#pipeline-structure)
- [Step Types](#step-types)
- [Runtime Data Model & Defensive Patterns](#runtime-data-model--defensive-patterns)
- [Geometry Column Naming - How the Import Engine Names Geo Columns](#geometry-column-naming---how-the-import-engine-names-geo-columns)
- [JSONDisassemblerStreamTransform (Stream Transform)](#jsondisassemblerstreamtransform-stream-transform)
- [Parsers: How Data Gets Interpreted](#parsers-how-data-gets-interpreted)
  - [JSON Parser](#json-parser-jsonpipelineparser)
  - [XML Parser](#xml-parser-xmlparser)
  - [Delimited Text Parser](#delimited-text-parser-delimitedtextparser)
  - [Avro Parser](#avro-parser-avroparser)
  - [Other Parsers](#other-parsers)
- [How Nested Data Gets Flattened](#how-nested-data-gets-flattened)
- [Record Transforms](#record-transforms) - FieldNameTransform, ExpressionTransform, DelimitedToWKTTransform, CrsTransform, ExtendRecordTransform, EnsureFieldsTransform, SkipRecordTransform, SplitDelimitedTransform, EmbeddedJsonTransform, TableLookupTransform, RegexTransform, FieldTrackingTransform, LineToWKTTransform, Geometry Transforms, Additional Transforms
- [Stream Transforms](#stream-transforms) - MultipleJsonStreamSplitTransform, ContextVariableStreamTransform, WaitForTransactionTransform, Download/Archive Transforms
- [InterchangeTransform Plugins](#interchangetransform-plugins) - CreateTrackLinesTransform, TableRecordIDCachingTransform, TableRecordIDLookupTransform
- [Committers](#committers) - CoalescingPipelineCommitter, InvokeRampCommitter, DMLStatementCommitter, ChangeSetCoalescingPipelineCommitter, Event Bus Committers, and more
- [TransactionNotifier Plugins](#transactionnotifier-plugins) - DefaultChannelTransactionNotifier, SimpleTransactionNotifier
- [Export Pipeline Components](#export-pipeline-components) - Serializers, Observers
- [Transitions and Conditional Routing](#transitions-and-conditional-routing)
- [Well-Known vs Ad-Hoc Pipelines](#well-known-vs-ad-hoc-pipelines)
- [Message Context System](#message-context-system)
- [Complete Pipeline Examples](#complete-pipeline-examples) - including [Cursor Pagination with HttpPollingConnector](#example-5-cursor-pagination-with-httppollingconnector)
- [Data Selection Cheat Sheet](#data-selection-cheat-sheet)
- [Available Connectors](#available-connectors)

---

## What a Pipeline Does

A pipeline takes raw data from a connector (Kafka messages, S3 files, HTTP responses, database rows, etc.) and turns it into rows in a MapLarge table. You define the pipeline as a JSON object with a `NumberOfWorkers` count and a `Steps` array. Each step does one job - parse bytes into records, transform records, or commit records to a table - and transitions route data from one step to the next.

The simplest pipeline is two steps: a **Parser** that converts the incoming bytes into flat records, and a **Committer** that writes those records to a table. Between them you can add any number of **RecordTransforms** to rename fields, compute new fields, convert coordinates to geometry, filter out bad records, or enrich records from lookup tables. Before the parser, you can add **StreamTransforms** to download files from S3, unzip archives, or extract subtrees from JSON envelopes.

Steps execute in the order defined by their transitions, not their position in the array. Multiple workers process messages in parallel. Property **names** in the JSON are case-insensitive and unknown names are silently ignored, so a misspelled option does nothing. **Values** are case-sensitive: `StepName`, `ToStep`, `Application`, `PluginName`, output keys, context scopes and parameter names.

Saving the ramp only checks that the pipeline is valid JSON. Plugin names, step types, transitions and option values are checked when the ramp starts; a problem faults the ramp, and that fault is not retried.

---

## Pipeline Structure

This is the JSON structure that gets pasted into the **Pipeline tab** "Show JSON" editor:

```json
{
    "NumberOfWorkers": 10,
    "Steps": [
        {
            "StepName": "ParseIt",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "JsonPipelineParser",
            "Options": { },
            "Transitions": [
                {
                    "ToStep": "TransformIt",
                    "SourceOutputKey": "DEFAULT",
                    "TargetInputKey": "DEFAULT"
                }
            ]
        }
    ]
}
```

### Key Fields

| Field | Purpose |
| ------- | --------- |
| `NumberOfWorkers` | How many messages the ramp processes at once, on each node that runs it. Each worker runs one whole message through all steps. 0 or omitted = a quarter of the CPU cores (at least 1); the UI writes 1. No upper limit. With more than one worker, messages can finish out of order and every step's plugin instance is shared by all workers |
| `Steps[]` | List of processing stages (execution order determined by transitions, not array position). An empty list fails with *No steps included in pipeline!* |
| `StepName` | Unique, case-sensitive name used by transitions. A duplicate fails at ramp start (*An item with the same key has already been added*) |
| `Type` | The category of step - determines how the pipeline invokes the plugin (see [Step Types](#step-types) below). Case-insensitive; omitted means `StreamTransform` |
| `Application` | `MapLargeCore` for built-in plugins, or the extension's name for plugins an extension adds. Case-sensitive (`maplargecore` fails with *Extension maplargecore is not installed*) |
| `PluginName` | The specific plugin within that category - each `Type` has multiple plugins to choose from (see tables below). Case-sensitive |
| `Options` | Plugin-specific JSON configuration. Omitted = all defaults. A text option whose whole value is an ISO 8601 date-time (`"2024-01-01T00:00:00Z"`) reaches the plugin in the server's local date format (`01/01/2024 00:00:00`) |
| `Transitions[]` | Where output goes next (routing) |

---

## Step Types

The `PipelineStepType` enum defines these stages:

**Import Pipeline Steps:**

| Type | Input -> Output | Purpose |
| ------ | ----------------- | --------- |
| **StreamTransform** | bytes -> bytes | Modify raw stream before parsing (unzip, download from S3, split JSON) |
| **Parser** | bytes -> records | Convert raw data into flat records |
| **RecordTransform** | record -> record | Modify individual records (rename fields, convert coords, compute expressions) |
| **InterchangeTransform** | batch -> batch | Modify entire batches of records |
| **Committer** | records -> database | Persist records to MapLarge tables |
| **StreamCommitter** | bytes -> database | Commit raw streams directly |
| **TransactionNotifier** | (post-commit) | Send notifications after successful commit |

**Export Pipeline Steps (Off Ramps):**

| Type | Purpose |
| ------ | --------- |
| **RecordObserver** | Entry point for export. It does **not** watch tables: it passes on records pushed to the off-ramp by an Alert/Trigger workflow's **OffRamp** action or by `datastream/testofframp` |
| **Serializer** | Convert records to output format (JSON, CSV, etc.) |
| **ExportConnector** | Send serialized data to external system (HTTP, NATS, file, etc.) |
| **RecordAccumulator** | Reserved. No plugin exists, and a step of this type is silently dropped from the pipeline |

### Valid Import Transition Order

```text
StreamTransform      -> StreamTransform | Parser | StreamCommitter
Parser               -> RecordTransform | InterchangeTransform | Committer
RecordTransform      -> RecordTransform | InterchangeTransform | Committer
InterchangeTransform -> InterchangeTransform | Committer
Committer            -> TransactionNotifier
StreamCommitter      -> TransactionNotifier
```

### Valid Export Transition Order

```text
RecordObserver  -> RecordTransform | Serializer
RecordTransform -> RecordTransform | Serializer
Serializer      -> ExportConnector | StreamTransform
StreamTransform -> StreamTransform | ExportConnector
```

Minimum import: **Parser → Committer**. Can skip parsing: **StreamTransform → StreamCommitter**, or a lone **StreamCommitter**, or (with a record-oriented connector) a lone **Committer**. Typical export: **RecordObserver → Serializer → ExportConnector**.

How these rules are enforced:

- They are checked when the ramp starts, not when it is saved: *Transition from X (type) to Y (type) is not allowed.*
- Only the step **types** are checked, so a step can point at itself. Avoid cycles: a cycle reachable from a parser hangs the worker.
- A `StreamCommitter → TransactionNotifier` transition is accepted but **never runs** (stream committers don't call notifiers).
- A committer uses only the **first** matching notifier transition, and its notifier transitions must use the `DEFAULT` output key with no guard that can fail. Otherwise the commit step fails *before* writing (see [TransactionNotifier Plugins](#transactionnotifier-plugins)).
- The export rules are hard-coded separately from the import rules. The Pipeline tab's step tree only offers import targets, so wire off-ramp transitions with **Show JSON**.

Every step with no incoming transition is a **start step**, and each message is delivered to every start step. On-ramp start steps must be a StreamTransform, Parser or StreamCommitter (record-oriented connectors may also start at a RecordTransform, InterchangeTransform or Committer); off-ramp start steps must be a RecordObserver. If every step has an incoming transition, nothing runs and no error is reported.

Which steps may be last:

| Step | With no matching transition |
| ------ | ----------------------------- |
| StreamTransform | Output is dropped silently |
| Parser, RecordTransform, InterchangeTransform, RecordObserver, Serializer | The message fails with *Could not transition to &lt;key&gt; - no such transition, or no transition guards matched!* (a parser must also reach a committer) |
| Committer, StreamCommitter, TransactionNotifier, ExportConnector | May be last |

### How `Type` and `PluginName` Relate

`Type` is the category; `PluginName` is the specific plugin. Each plugin only works with one type - e.g., `"Type": "Parser"` + `"PluginName": "FieldNameTransform"` fails when the ramp starts with *No plugin MapLargeCore/FieldNameTransform for interface …IMLImportParser*. See the tables above for valid Type/PluginName combinations.

---

## Runtime Data Model & Defensive Patterns

This section establishes the core mental model for how data flows through pipelines. Understanding this upfront is essential for building pipelines that handle real-world, variable-schema data reliably.

### Records Are Schema-Less Bags of Name-Value Pairs

At runtime, every record is an `MLFlattenedRecord` - a flat, ordered list of `MLFlattenedField` objects. Each field has a `Name` (string) and a `Value` (object, almost always a string). **There is no schema contract.** Different records in the same stream can have completely different sets of fields.

**Key implications:**

- A field may be present on one record and entirely absent on the next
- Field values from parsers are strings - type detection happens later (at commit time via `VariableSchemaAccumulator`). A few steps emit typed values: `ExpressionTransform` (for result types it doesn't convert, or with `SkipStringConversion: true`) and the image steps (`FetchImageFromS3Transform`, `VideoToTableDataTransform`, `TiledImageryParser`). `CoalescingPipelineCommitter` accepts only strings; use `ChangeSetCoalescingPipelineCommitter` for typed values
- Field lookup is by name (linear scan through the list), not by index
- **Duplicate field names are legal** - `ExtendRecordTransform` creates them deliberately. `CoalescingPipelineCommitter` keeps the **first** occurrence, so appending a field cannot override an existing one
- The same pipeline step can succeed for one record and fail for the next, depending on which fields are present

### The Failure Model: Fail-Fast Per Message

**When a pipeline step throws an exception:**

- The **entire message** fails - all records from that message are lost (no partial commit by the steps that had not run yet; committers that already ran keep their data)
- The exception is logged and the pipeline moves on to the next message. The message is not retried; whether it is read again is up to the connector
- Quota exceptions (account size limit exceeded) fault the entire ramp
- Exception: with the ramp's **Eager Processing** setting on, a record transform that throws skips that record instead of failing the message

**When a RecordTransform returns `null`:**

- The record is **silently skipped** (dropped from the pipeline)
- A skip counter is incremented and reported in the process log
- Other records in the same message continue processing normally

This means one bad record can take down an entire message worth of good records unless you add defensive steps.

### Absent Fields vs Null-Valued Fields

This distinction is critical and a common source of confusion:

| Scenario | Field in record? | Value | `SkipRecordTransform` NotExists? | `ExpressionTransform` behavior |
| ---------- | ----------------- | ------- | ---------------------------------- | ------------------------------- |
| Field never existed | No | N/A | Matches (drops record) | Throws `"Unable to find field"` |
| `ExtendRecordTransform` stubbed it | Yes | The specified value (an empty `Value` produces **null**, not `""`) | Does NOT match | Uses the value |
| `EnsureFieldsTransform` stubbed it | Yes | `""` | Does NOT match | Uses `""` |
| Geometry transform with `FailOnMissingParameters: false` | No | N/A | Matches (field absent) | Throws `"Unable to find field"` (field was never added) |

**Why this matters:** Geometry transforms (`EllipseToWKTTransform`, `SectorToWKTTransform`, `ECEFTransform`) with `FailOnMissingParameters: false` return the **original record unchanged** - the output field is **not added at all**. Downstream `SkipRecordTransform` with `NotExists` on the output field **will** match (the field is absent). However, it is still best practice to filter **before** the geometry transform to drop records missing the required **input** fields (lat, lng, axis, etc.), so you can set `FailOnMissingParameters: true` and guarantee valid WKT downstream.

### Defensive Toolkit Decision Framework

Choose your strategy based on what should happen to records with missing data:

**Strategy 1a - Keep all records, let ExpressionTransform handle missing fields:**
→ Set `TreatMissingFieldsAsEmpty: true` on `ExpressionTransform`. Missing fields then read as an **empty string** inside the expression (not null): test them with `IsEmpty(f)`, not `IsNull(f)` or `f == null`, and note that `Nvl()`/`Coalesce()` will not substitute for them. `ToDouble("")` gives 0.

**Strategy 1b - Keep all records, fill defaults (safe):**
→ Use `EnsureFieldsTransform` before the transform that needs the field. Adds missing fields with empty string values. Does NOT create duplicates (case-insensitive HashSet check). Safe to use before `ExpressionTransform`.

**Strategy 1c - Keep all records, fill defaults (legacy):**
→ Use `ExtendRecordTransform` before the transform that needs the field. Adds a field with a default value.
→ **Trap:** Creates a duplicate if the field already exists. The committer keeps the **first** value (so the stub never overrides real data), and the duplicate **crashes ExpressionTransform** (`ToDictionary()` on input fields throws on duplicate keys, including names that differ only by case). Prefer `EnsureFieldsTransform` instead.

**Strategy 2 - Drop bad records early:**
→ Use `SkipRecordTransform` **before** transforms that need specific fields. Use `NotExists` to check for absent fields, `Equals`/`NotEquals` to check values.
→ **Trap:** `NotExists` checks field **name** presence only - it does not detect null-valued fields. Only use it to filter truly absent fields. The value conditions are null-safe; what fails the message is a missing `Condition`, or `EqualsAny`/`NotEqualsAny` without a `Value`. The `Not…` conditions never drop a record that lacks the field - pair them with `NotExists`.

**Strategy 3 - Let geometry transforms be lenient:**
→ Set `FailOnMissingParameters: false` (default) on `EllipseToWKTTransform`, `SectorToWKTTransform`, `ECEFTransform`. They return the record unchanged (output field not added) and continue.
→ Set `IgnoreErrors: true` on `TableLookupTransform` (with `DefaultFetchColumnValues` set - it is required then). On a lookup **error** the record gets the defaults; when no row matches, the record passes on **without** the fetch fields.

**Strategy 4 - Route different record shapes to different branches:**
→ Use `TransitionGuard` on message **context** properties (not record fields). Guards check context values set by `PropertiesToPromote` or connector metadata.
→ For per-record routing based on field values, use **broadcasting** (multiple transitions without guards) + `SkipRecordTransform` in each branch.

### Common Traps

1. **ExpressionTransform + duplicate fields** - `ExtendRecordTransform` creates duplicates if the field already exists. `ExpressionTransform` calls `ToDictionary()` on **input** record fields, which crashes on duplicate names. **Fix:** Use `EnsureFieldsTransform` instead (no duplicates), or set `TreatMissingFieldsAsEmpty: true` on `ExpressionTransform` to avoid field stubbing entirely. Legacy workaround: place `SkipRecordTransform` before `ExtendRecordTransform` to drop records that already have the field.

2. **Geometry output field is absent, not null** - Geometry transforms with `FailOnMissingParameters: false` return the record unchanged - the output field is **not added**. `SkipRecordTransform`'s `NotExists` on the output field **will** match. However, filtering on **input** fields (lat, lng, etc.) before the geometry transform is still the recommended approach - it lets you set `FailOnMissingParameters: true` so downstream steps can safely assume valid WKT.

3. **TransitionGuard on missing context** - Guards throw `ArgumentOutOfRangeException` if the context property doesn't exist or is empty. **Fix:** Always ensure context properties are populated (via `PropertiesToPromote` on an earlier step or via connector metadata) before guarded transitions.

4. **Expression syntax pitfalls** - Strings can use single or double quotes (`'hello'` or `"hello"`; inside pipeline JSON a double-quoted literal is written `\"hello\"`). `+` concatenates whenever **either** side is a string, so on parser output (text) `price + 1` gives `"51"` and `price > 100` compares text - convert with `ToDouble()` first. Every field an expression references must exist (or set `TreatMissingFieldsAsEmpty`), whichever branch runs. `cond ? a : b` evaluates only the chosen branch (use it to guard division and parsing); `Iif(cond, a, b)` evaluates both.

5. **One bad record kills the entire message** - A single record with unexpected fields can throw an exception in a transform, which fails the entire message (all records lost). Always guard transforms that reference optional fields, especially when processing heterogeneous data sources.

---

## Geometry Column Naming - How the Import Engine Names Geo Columns

**The committer does not rename geometry columns on its own.** The field name on the record when it reaches the committer becomes the column name, with two exceptions (both in `CoalescingPipelineCommitter` only):

1. **`SplitWKTIfNeeded`** - When one column holds mixed geometry types in a flush, OR `ForceSplitWKT` is set, the import engine renames the geo column and splits data into separate tables. This happens at flush time, **before** the commit.
2. **Synthetic XY column** - When a latitude column and a longitude column are detected by name, a new `"XY"` column is added. Names are lower-cased and trimmed of spaces and `_` first; latitude matches `lat`, `latitude` or any name containing `latitude`, longitude matches `lng`, `lon`, `long`, `longitude` or any name containing `longitude`. It is skipped when a column named `XY` (or already typed as a point) exists. Original lat/lng columns are preserved.

Some pipeline steps write geometry columns by default: `EllipseToWKTTransform`, `SectorToWKTTransform` and `LOBToWKTTransform` write (and **overwrite**) an `XY` point column unless `CreateXYColumn: false`, and `ArcGisGeometryTransform` writes points to a field named `geometry`.

### Processing Layers

**Layer 1 - Parser output:** The JSON parser preserves the parent JSON key name for GeoJSON→WKT conversions (e.g., `{"geometry": {"type":"Point",...}}` → field `geometry`). No hardcoded names. **Source:** `JsonParser.cs:318-325`.

**Layer 1b - Legacy file import only:** `JsonToCsvFlattenerNetcore` hardcodes `"WKT"` as the column name (`JsonToCsvFlattenerNetcore.cs:247`). Does NOT apply to DataStream pipelines. If you see a column named `WKT` that you didn't create, the data was imported via the legacy path.

**Layer 2 - Pipeline transforms (your control):**

| Transform | Default output field | Configurable via |
| ----------- | --------------------- | ----------------- |
| `EllipseToWKTTransform` | `"EllipseWKT"`, plus `"XY"` (center) | `OutputShapeField`, `CreateXYColumn`/`CenterPointColumnName` |
| `SectorToWKTTransform` | `"SectorWKT"`, plus `"XY"` (center) | `OutputShapeField`, `CreateXYColumn`/`CenterPointColumnName` |
| `LOBToWKTTransform` | `"BearingWKT"`, plus `"XY"` (origin) | `OutputLineField`, `CreateXYColumn`/`CenterPointColumnName` |
| `LineToWKTTransform` | `"BearingWKT"` | `OutputLineField` |
| `LatitudeAndLongitudeToWKTTransform` | `"WKT"` | `OutputFieldName` |
| `ECEFTransform` | `"XY"`, `"Altitude"` | `OutputPointField`, `OutputAltitudeField` |
| `DelimitedToWKTTransform` | The source field's name (the source field is replaced) | `OutputName` |
| `CrsTransform` | Source name + `OutputPostFix` | `OutputPostFix` |
| `SimplifyTransform` | Your chosen name | `OutputFieldName` |
| `ArcGisGeometryTransform` | `"geometry"` for points; the source name for lines and polygons | No |
| `RemoveInnerRingsTransform` | `GeoColumn` (rewritten in place) | `GeoColumn` |
| `CreateTrackLinesTransform` | `"track_Segment"` / `"track_Path"`, `"prev_{PointField}"` | `OutputFieldPrefix`, `LagFieldPrefix` |
| `GeoFieldNameTransform` | Dynamic (see below) | `GeoColumn`, `TableName` |
| `EmbeddedJsonTransform` | Parent JSON key name | No |
| `FieldNameTransform` | Your chosen name | `RenameFields` |

**Layer 3 - VariableSchemaAccumulator (commit time):** Normalizes column names via `StringUtils.AlphaNumeric()` (character cleanup only). Detects column types but does **NOT rename**. Creates synthetic `"XY"` column from lat/lng if no XY exists.

**Layer 4 - SplitWKTIfNeeded (at flush time, before the commit):** Only triggers when `ForceSplitWKT` is set or one column holds mixed geometry types in the flush. Splits data into separate tables (`{table}Point`, `{table}Poly`, `{table}Line`, `{table}Multipoint`) and renames the geometry column:

- Points → `"XY"` | Polygons → the new table's name (e.g., `"sensorsPoly"`) | Lines → the new table's name (e.g., `"sensorsLine"`)
- Only the geometry column with the most types survives the split; other geometry columns are dropped.

**Source:** `StringImport.cs:1398-1408`

**What actually triggers the split:** `SplitWKTIfNeededAsync` runs when **either** mixed geometry was detected in the data (`ImportInformation.MultiWkt`) **or** `ForceSplitWKT` is set (`StringImport.cs:1295`). For DataStream on-ramps the `MultiWkt` path is reached automatically from `CoalescingPipelineCommitter` (`VariableSchemaAccumulator.cs:292`), so **mixed geometry splits with no configuration at all**. The decision is made per flush, so a feed that sometimes mixes geometry types writes mixed flushes to the split tables and single-type flushes to `{table}`. `ForceSplitWKT` only matters when you want the split on data that was *not* auto-detected as mixed; it is implicit for ArcGIS imports and scheduled dataset auto-imports, and user-selectable for manual file imports.

**Setting `ForceSplitWKT` on a DataStream committer:** it is a `FileImportOptions` property, not an `MLImportOptions` one, so it goes inside `ExtendedConfigJson`. There is no `Options` sub-object on an `ImportTables` entry:

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "acct", "Table": "tbl",
        "ExtendedConfigJson": "{\"ForceSplitWKT\":true}"
    }
}
```

**Keeping mixed geometry in ONE table:** set `MultiGeoTable` (also a `FileImportOptions` property) instead. `SplitWKTIfNeededAsync` then short-circuits to `SplitWKTSingleTable` (`StringImport.cs:1264`), which keeps a single table and splits the geo *column* into one column per geometry type, named `{originalColumn}_{ColumnType}` - `WKT_XY`, `WKT_Poly`, `WKT_Line`, `WKT_Multipoint` - each populated only on its own rows. `MultiGeoTable` acts only when a split is triggered.

### Canonical Geo Column Names

Used by `GeoFieldNameTransform` (`GeoColumnName.GetGeoColumnName()`):

| Geometry type | Canonical name |
| -------------- | --------------- |
| POINT | `XY` |
| MULTIPOINT | `WKT` |
| LINESTRING / MULTILINESTRING | `{tableName}_Line` |
| POLYGON / MULTIPOLYGON | `{tableName}` (same as table name) |
| Anything else (`GEOMETRYCOLLECTION`, `POINT Z`, empty, non-WKT) | an **empty** name - filter these records out first |

`GeoFieldNameTransform` is **optional** - not auto-injected. Add it explicitly for canonical naming, or use any field name - the import engine detects geometry type regardless of column name.

Transform output (e.g., `EllipseToWKTTransform`'s `OutputShapeField`) is NOT renamed downstream unless a split runs (mixed geometry in a flush, or `ForceSplitWKT`).

The only other column-name "normalization" is `StringUtils.AlphaNumeric()`: by default every character other than a letter or digit becomes `_` (with server setting `colNameNonAlphaToUnderscore=false` they are removed instead). There is no de-duplication, so `a.b` and `a_b` collide. Apart from the split and `GeoFieldNameTransform`, no layer renames columns based on content inspection.

---

## JSONDisassemblerStreamTransform (Stream Transform)

Optional step for extracting JSON subtrees or promoting properties to message context before parsing:

```json
{
    "StepName": "DisassembleJSON",
    "Type": "StreamTransform",
    "Application": "MapLargeCore",
    "PluginName": "JSONDisassemblerStreamTransform",
    "Options": {
        "Roots": [ { "OutputKey": "Body", "Path": "$" } ],
        "PropertiesToPromote": [ ]
    },
    "Transitions": [
        { "ToStep": "YourParserStepName", "SourceOutputKey": "Body" }
    ]
}
```

Place before your `Parser` step. Two configurable arrays - `Roots` and `PropertiesToPromote`. **`Roots` is required in practice:** the step emits only the roots it matches, so with no roots (or no match) nothing is emitted and the step still reports success. `PropertiesToPromote` only writes into the context of roots that contain the property. Each root is emitted on its own `OutputKey`, never on `DEFAULT`, so transitions need a matching `SourceOutputKey`.

### `Roots` - Extract JSON Subtrees

Each entry matches a JSON path, producing a separate output stream identified by `OutputKey`. Match `OutputKey` to `SourceOutputKey` in transitions.

**Single root** (extract a payload **object** from an envelope):

```json
"Roots": [
    { "OutputKey": "JsonForImport", "Path": "$.payload", "Transpose": false }
]
```

Only JSON **objects** can be roots. If `payload` is an array, `$.payload` matches nothing; use `$.payload[*]` to emit each element as its own message, or root `$` plus the parser's `RecordRootPath: "$.payload[*]"`.

**Multiple roots** (route different subtrees separately; here `events` is an array of objects and `metadata` an object):

```json
"Roots": [
    { "OutputKey": "Events",   "Path": "$.events[*]", "Transpose": false },
    { "OutputKey": "Metadata", "Path": "$.metadata",  "Transpose": false }
],
...
"Transitions": [
    { "ToStep": "ParseEvents",   "SourceOutputKey": "Events" },
    { "ToStep": "ParseMetadata", "SourceOutputKey": "Metadata" }
]
```

Root entry properties:

- `Path`: path of the objects to extract (`$` = the whole document when it is an object, `$.data` = the `data` object, `$[*]` = each object in a top-level array). This is **not** full JSONPath: `$`, `.` and `*` are stripped and the rest is compared to the property path with array indexes ignored, case-sensitively. No `..` or filters. `$` does not match a top-level array.
- `OutputKey`: Identifies this output stream - match to `SourceOutputKey` in transitions (case-sensitive). Required.
- `Transpose`: For a root at depth 1 whose properties are column arrays, rewrite it as an array of row objects under the root's name, so the parser can use `RecordRootPath: "$.<name>[*]"`. Ignored at other depths (default `false`).

Only matched objects are forwarded, each as its own message; everything else is discarded. Nested roots are emitted inner first, and the outer root still contains the inner content.

### `PropertiesToPromote` - Extract Values into Message Context

Pulls values from JSON into message context metadata for use by downstream steps (transition guards, transforms) without creating table columns.

```json
"PropertiesToPromote": [
    { "Path": "$.event_type", "Scope": "streaming_msg", "Name": "record_type" },
    { "Path": "$.s3Key",      "Scope": "s3",            "Name": "key" }
]
```

- `Path`: Dot-notation path from document root (e.g., `content.nextCursor`). Leading `$` and `.` are stripped automatically, and array indexes are ignored when matching
- `Scope`: Context namespace (e.g., `streaming_msg`, `s3`, `__cursor`, or any custom name). Must not be blank or `System`
- `Name`: Property name within that scope
- Values: booleans become `True`/`False`, date-like strings become ISO 8601, JSON `null` is never promoted, and if a path matches more than once the last value wins
- Promoted values **stay in** the emitted JSON (scalars are still written to every open root's stream)
- Access downstream via `scope:name` (e.g., `streaming_msg:record_type`)
- **Promotion targets a cloned context.** Each root gets `RootWrapper(..., context.Clone(), ...)`, and promoted values are set on the open roots' clones only, which are then passed to `AcceptAsync`. Steps downstream of that output see them. **The connector does not** - it reads the original message context, so `HttpPollingConnector` cursor/offset pagination values promoted here are invisible to it (pagination stops after page 1, verified live 2026-10-01). Promote pagination values in the parser instead.
- A property is promoted only onto roots that **contain it and are still open** when it is read. With root `$` everything qualifies; with `$.features[*]`, a top-level property outside the array is never promoted onto those feature outputs.

> **Important: the parser's `PropertiesToPromote` is NOT scoped to `RecordRootPath`.** (This is about the parser option of the same name, not the disassembler's, which is scoped to roots as described above.) Parser promotion operates on the **full JSON document** during traversal. The parser calls `PromoteIfNeeded()` for every scalar value regardless of whether it's inside or outside `RecordRootPath`. This is critical for cursor pagination where the cursor is at a different level than records. See [Cursor Pagination with HttpPollingConnector](#example-5-cursor-pagination-with-httppollingconnector).

**Both `Roots` and `PropertiesToPromote` can be used together:**

```json
{
    "StepName": "OpenEnvelope",
    "Type": "StreamTransform",
    "Application": "MapLargeCore",
    "PluginName": "JSONDisassemblerStreamTransform",
    "Options": {
        "Roots": [
            { "OutputKey": "Envelope", "Path": "$", "Transpose": false }
        ],
        "PropertiesToPromote": [
            { "Path": "$.message_type", "Scope": "streaming_msg", "Name": "msg_type" }
        ]
    },
    "Transitions": [
        { "ToStep": "ParsePayload", "SourceOutputKey": "Envelope" }
    ]
}
```

with the parser step `ParsePayload` using `"RecordRootPath": "$.payload[*]"`. Given an incoming message like:

```json
{ "message_type": "alert", "timestamp": "2025-01-01", "payload": [{"id": 1}, {"id": 2}] }
```

- The `$` root forwards the whole envelope (a root must be an object, so `$.payload`, an array, would match nothing)
- `PropertiesToPromote` stores `"alert"` as `streaming_msg:msg_type` in the context that travels with that root (the value also stays in the JSON)
- The parser's `RecordRootPath` turns each `payload` element into a record, so `timestamp` and `message_type` don't become columns

If the promoted value is only needed after parsing (by transforms or later guards), the parser's own `PropertiesToPromote` does the same in one step. Use the disassembler when a transition guard must pick **which parser** gets the message: guards on the disassembler's outgoing transitions see the values it promoted.

---

## Parsers: How Data Gets Interpreted

Two main config concerns: (1) which objects become records (`RecordRootPath`/`MultipleRoots`), (2) which fields to keep and how nested values are stored (`ExcludePaths`; `IncludePaths` for XML only; `PathActions` to stringify or pivot; `SimplifyColumnNames` for naming). Parsers cannot rename individual fields - use `FieldNameTransform`.

Every output key a parser emits (`DEFAULT`, or each `MultipleRoots` `OutputKey`) needs a matching transition, otherwise the message fails with *Could not transition to &lt;key&gt;*.

### JSON Parser (`JsonPipelineParser`)

Streaming token-by-token parser (not loading full document into memory, except that `IncludeParentProperties` holds records until their parents close). One JSON document per message; split NDJSON or concatenated JSON first with `MultipleJsonStreamSplitTransform`. Uses path matching for record selection.

#### RecordRootPath

| RecordRootPath | What It Selects |
| ---------------- | ---------------- |
| `"$"` | Entire document = 1 record (when the document is an object) |
| `"$[*]"` | Each element of a top-level array = 1 record per element |
| `"$.items[*]"` | Each element of the `items` array |
| `"$.data.records[*]"` | Nested array elements |
| `"$.envelopes[*].events[*]"` | Doubly-nested arrays |
| (not set, and no `MultipleRoots`) | Same as `"$"`. A document whose top level is an **array** then yields **zero records and no error** - use `"$[*]"` |

Internally, the path is converted to regex via `JsonPathToRegex()` and matched against the current JSON path during streaming. `*` matches exactly one property name or array index; there is no recursive descent (`..`) and no filters. Only **objects** become records, so a path to an array without `[*]`, or to an array of plain values, yields nothing. Setting `RecordRootPath` makes `MultipleRoots` ignored.

#### MultipleRoots - Different Record Types from One Document

```json
"MultipleRoots": [
    {
        "Path": "$.wells[*]",
        "OutputKey": "wells",
        "IncludeParentProperties": 1
    },
    {
        "Path": "$.wells[*].measurements[*]",
        "OutputKey": "measurements",
        "IncludeParentProperties": 2
    }
],
"SimplifyColumnNames": true
```

| Property | Purpose |
| ---------- | --------- |
| `Path` | Path to the record objects (same syntax as `RecordRootPath`). Required. If an object matches several roots, the first entry wins |
| `OutputKey` | Output key for this root's records; each key needs a transition with that `SourceOutputKey` (usually to the committer, with a matching `TargetInputKey` / `ImportTables` key). A root with no `OutputKey` never emits records |
| `IncludeParentProperties` | Copy values from up to N enclosing levels into this root's records (denormalization). Records are held until those levels close, and child records are emitted together with their parent record, so the **parent's** setting also decides which values a child can still receive |
| `ParentKeyProperty` | Set on a **child** root nested inside another root. When the parent is emitted, the parent's property of this name is copied into each child as `<child>_<name>`; if the parent has no such property, a generated id is written to both |

**Example with IncludeParentProperties** (the configuration above):

Input:

```json
{
    "project": "Drilling",
    "wells": [
        {
            "well_id": "W1",
            "measurements": [
                { "depth": 100, "temp": 25.5 },
                { "depth": 200, "temp": 30.1 }
            ]
        }
    ]
}
```

Output:

- `wells` table: `well_id="W1", project="Drilling"`
- `measurements` table: `depth=100, temp=25.5, well_id="W1", project="Drilling"` (parent fields copied down)

With `IncludeParentProperties` left at 0 on `wells`, each well is emitted as soon as it closes - before `project` is known to its children - so `project` would not reach `measurements`.

#### ExcludePaths / IncludePaths

```json
"ExcludePaths": ["$.metadata", "$.internal.debug", "$.features[*].properties.type"]
```

- `ExcludePaths`: Matching paths are skipped along with everything under them. Each entry is a path pattern turned into an anchored regex, so `"type"` matches only a **top-level** `type` property, not one at any level
- `IncludePaths`: **XML and WFS parsers only.** Element text is kept only if its path *contains* one of the entries (a substring match, where `*` is a literal character). The JSON, YAML, Avro and Protobuf parsers and `EmbeddedJsonTransform` ignore it, so it cannot be used to whitelist JSON fields

#### PathActions

Controls per-path handling within a record. `Path` is matched against the object's **full path from the document root**, so for records under `$[*]` a `metadata` object inside each element is `$[*].metadata`:

```json
"Options": {
    "RecordRootPath": "$[*]",
    "PathActions": [
        {
            "Path": "$[*].metadata",
            "ColumnName": "metadata_blob",
            "ObjectHandling": "StringifyOnly"
        }
    ]
}
```

**ObjectHandling options:**

| Mode | Behavior |
| ------ | ---------- |
| `ParseOnly` (default) | Flatten nested object into separate columns: `user_name`, `user_age` |
| `StringifyOnly` | Store the entire subtree as one JSON text column named `ColumnName` (`metadata_blob="{\"key\":\"val\"}"`); nothing under it becomes a column. Also works on a property holding an array |
| `ParseAndStringify` | Both: flattened columns AND a JSON text column |
| `Pivot` | Special: converts an array of key-value objects into columns (see below) |

`ColumnName` only names the JSON text column created by a stringify mode; it does not rename anything else. The first matching action wins. The XML parser honors `Pivot` only.

**Keeping a JSON blob with unknown keys as one column.** Without a `StringifyOnly` action, every property inside a nested object becomes its own column and every element of an array of objects gets numbered columns, so a blob whose keys vary between messages adds columns on every poll (and a table never drops columns). Stringify the blob, then pull out specific values with `ExpressionTransform` and `GetJSONPathValue(blob_column, '$.path')`, which returns an empty string when the path isn't present.

##### The Pivot Pattern

```json
"PathActions": [
    {
        "Path": "$.measurements[*]",
        "ObjectHandling": "Pivot",
        "PivotName": "type",
        "PivotValue": "value"
    }
]
```

`Path` must match the element **objects** to pivot. `PivotName` and `PivotValue` are both required. `"PivotValue": "*"` instead turns every other property into a column named `<pivotNameValue>_<property>`.

Input:

```json
{
    "sensor_id": "S1",
    "measurements": [
        { "type": "Temperature", "value": 25.5 },
        { "type": "Pressure", "value": 1013 }
    ]
}
```

Output: One record with `sensor_id="S1", Temperature=25.5, Pressure=1013` (array pivoted into columns named by `type` field).

#### ProcessJsonNulls

```json
"ProcessJsonNulls": true
```

- `false` (default): JSON `null` values are silently skipped (field not created)
- `true`: a property set to `null` creates a field with empty string value. Nulls inside arrays are always dropped

#### SimplifyColumnNames

```json
"SimplifyColumnNames": true
```

- `false` (default): Uses full nested path - `user_profile_name`
- `true`: Uses only leaf name - `name`. When leaf names collide, every colliding name gets one more parent level (`profile_name`, `product_name`), repeated until they differ. Names are fixed once chosen (until the ramp restarts), so a field first seen alone keeps its short name and a later colliding field can produce two columns with the same name

#### GeoJSON Auto-Detection

Automatic - objects with `type` and `coordinates` are converted to WKT, named after the containing property. E.g., `{"location": {"type": "Point", "coordinates": [-73.98, 40.75]}}` → `location = "POINT (-73.98 40.75)"`. Other members (`bbox`, `crs`) are dropped and coordinates are never swapped. A geometry at the document root, or as an element of a top-level array, has no property name and fails the message.

#### Full JSON Parser Config

```text
TreeParserConfig:
  RecordRootPath       string       Single root path (disables MultipleRoots)
  MultipleRoots        array        Multiple root configs
  SimplifyColumnNames  bool         Use leaf names only
  ExcludePaths         string[]     Exclude path patterns
  IncludePaths         string[]     XML/WFS only: keep element text whose path contains an entry
  PathActions          array        Stringify or pivot per path
  ColumnActions        map          Obsolete form of PathActions (keyed by column name; no pivot)
  PropertiesToPromote  array        Extract values to context
  AttributeBasedNames  map          XML/WFS only: use an attribute's value in column names
  SwapAxisOrder        bool         XML/WFS only: swap X/Y in GML-to-WKT conversion (default false)

JsonParserConfig (extends TreeParserConfig):
  ProcessJsonNulls     bool         Create fields for null values
```

The JSON parser accepts but ignores `IncludePaths`, `AttributeBasedNames` and `SwapAxisOrder`.

---

### XML Parser (`XmlParser`)

Same option model as the JSON parser, with these differences:

- **A root is required.** Without `RecordRootPath` or `MultipleRoots` the XML parser emits nothing.
- Paths are `/`-separated local element names from the document root, without namespace prefixes (`/catalog/product`), matched **exactly** and case-sensitively. They are not XPath (no `//`, no predicates). Only `PathActions` paths are patterns, where `*` matches one element.
- `IncludePaths` keeps element text whose path *contains* an entry (`*` is literal there); attributes are always kept.
- No stringify modes and no `ProcessJsonNulls`; `PathActions` supports `Pivot` only.
- CDATA text is dropped, a DTD is rejected, and one root element is allowed per message.

#### Record Root Selection

```json
"MultipleRoots": [
    { "Path": "/root/product", "OutputKey": "products" },
    { "Path": "/root/product/variant", "OutputKey": "variants", "IncludeParentProperties": 20 }
]
```

#### Attribute Handling

XML attributes become columns automatically, named `<element>_<attribute>` (the attribute's namespace prefix is kept, e.g. `…_gml:id`; `xmlns*` and `*:nil` attributes are skipped):

```xml
<product id="P1" category="Electronics">
    <name>Laptop</name>
</product>
```

With `SimplifyColumnNames: true` this becomes `id="P1"`, `category="Electronics"`, `name="Laptop"`. Without it, names carry the path from the document root, including the root and record elements (`catalog_product_id`, …).

#### AttributeBasedNames - Use Attribute Values in Column Names

```json
"AttributeBasedNames": {
    "/track/dynamics": "cs"
}
```

```xml
<dynamics cs="COORD"><x>10</x><y>20</y></dynamics>
<dynamics cs="SPEED"><value>50</value></dynamics>
```

Becomes: `dynamics_COORD_x=10`, `dynamics_COORD_y=20`, `dynamics_SPEED_value=50` (the attribute itself is also kept as a column, e.g. `dynamics_COORD_cs`). The attribute value also becomes a path segment for descendants (`/track/dynamics/COORD/x`).

Without this, column name collisions occur since both elements are named `dynamics`.

#### Include/Exclude Paths

```json
"ExcludePaths": ["/nitsRoot/product", "/nitsRoot/message/ConfidentialityInformation"],
"IncludePaths": ["/nitsRoot/message/track"]
```

- `ExcludePaths`: exact element paths; the element, its attributes and its subtree are skipped. To drop a GML geometry, exclude its parent element.
- `IncludePaths`: element **text** is kept only if its path *contains* one of the entries. It is a plain substring match, so `*` is a literal character (`"/nitsRoot/message/track/*"` keeps nothing). Attributes and GML geometry are never filtered by it.

#### Automatic GML to WKT Conversion

```xml
<gml:Point><gml:pos>40.75 -73.98</gml:pos></gml:Point>
```

With `"SwapAxisOrder": true` this becomes `POINT(-73.98 40.75)`; without it, the coordinates stay in document order (`POINT(40.75 -73.98)`).

- Only elements in the **GML 3.2** namespace (`http://www.opengis.net/gml/…`) are converted. GML 2 and 3.1.1 (`http://www.opengis.net/gml`, no trailing slash) are not, so their coordinates arrive as text columns.
- Converted shapes: Point, LineString (`pos`, `posList` or `coordinates`) and Envelope (as a rectangular polygon). 2D only.
- **Polygon is not supported in practice**: GML 3.2 polygons are not converted and can shift the nesting of the rest of the document.

---

### Delimited Text Parser (`DelimitedTextParser`)

Every row is a record - no root path concept.

```json
"Options": {
    "Delimiter": ",",
    "SkipRows": 0,
    "KeepNewLine": false,
    "ExplicitColumnHeaders": null
}
```

| Option | Purpose |
| -------- | --------- |
| `Delimiter` | Column separator: exactly **one** character (`,`, `;`, `\|`; a tab is written `"\t"` in JSON). Anything longer, empty or null silently falls back to a comma |
| `SkipRows` | Skip N rows before the header row (or before the first data row when `ExplicitColumnHeaders` is set). Blank lines count |
| `KeepNewLine` | `true` keeps line breaks inside quoted values; `false` (default) **removes** them (they are not replaced with a space) |
| `ExplicitColumnHeaders` | Override: provide column names manually. The first non-skipped row is then data, so add `SkipRows: 1` if the file also has a header row |

Quoting: a field is quoted only if `"` is its first character, and `""` inside quotes is a literal quote. Values are not trimmed. Rows shorter than the header are padded with `""` (with `ExplicitColumnHeaders`, the missing trailing fields are left out); values beyond the header count are dropped. A blank line in the middle of the file produces a record of empty strings, and an unterminated quote fails with *Unexpected End of File*.

**With headers in data (default):**

```csv
name,age,city
John,30,NYC
Jane,25,LA
```

2 records, columns from row 1.

**With ExplicitColumnHeaders (no header row in data):**

```json
"ExplicitColumnHeaders": ["name", "age", "city"]
```

```csv
John,30,NYC
Jane,25,LA
```

2 records, columns from config.

---

### Avro Parser (`AvroParser`)

Reads an Avro **object container file** (with its embedded schema); bare single datums and the Confluent wire format are not supported. Every top-level Avro record becomes one MapLarge record. Nested records (including one inside a nullable union) are flattened with underscore-joined names. Arrays, maps, bytes, enums and fixed values are written with .NET `ToString()` (e.g. `System.Object[]`), so **arrays of records are not usable**; nulls become `""`. No record root selection: `RecordRootPath`'s value is ignored, and `MultipleRoots` may have at most one entry (only its `OutputKey` is used). Of the tree-parser options only `SimplifyColumnNames` has an effect.

---

### YAML Parser (`YamlPipelineParser`)

Loads the whole YAML document into memory, converts it to JSON, then delegates to the JSON parser, so the JSON parser's options and behavior apply (`IncludePaths`, `AttributeBasedNames` and `SwapAxisOrder` have no effect). A top-level YAML list needs `RecordRootPath: "$[*]"`. **Plugin name is `YamlPipelineParser`, NOT `YamlParser`.**

```json
{
    "StepName": "ParseYAML",
    "Type": "Parser",
    "Application": "MapLargeCore",
    "PluginName": "YamlPipelineParser",
    "Options": {
        "RecordRootPath": "$[*]",
        "SimplifyColumnNames": true
    },
    "Transitions": [{ "ToStep": "CommitRecords" }]
}
```

---

### LiteralParser - Store Raw Message as a Single Field

Reads entire message as UTF-8 string, emits one record with one field. No parsing applied.

```json
"Options": {
    "Column": "raw_message"
}
```

- **`Column`** - Output field name. Set it: it is not validated, and a missing name produces a field with no name. One record per message; the whole body is held in memory.

---

### MessageContextParser - Records from Metadata Instead of Body

Ignores message body; produces a record from message context metadata.

```json
"Options": {
    "ExtendedFields": [
        { "ColumnName": "s3_key", "Value": "{S3Connector:Key}" },
        { "ColumnName": "bucket", "Value": "{S3Connector:Bucket}" }
    ],
    "ConvertContextToColumns": false,
    "ContextScopeFilter": null
}
```

- **`ExtendedFields`** - Array of explicit column/value pairs. `Value` supports `{scope:property}` context references (dates come out as ISO 8601 UTC). A value with no placeholder but containing a colon is read as one bare `scope:name` lookup, so a literal like `http://…` or `12:30` becomes null. The Options editor can't build these items; use Show JSON
- **`ConvertContextToColumns`** - When `true`, every context value with a two-part `scope::property` key becomes a column named by the **property only** (the scope is dropped, so names can collide). Sensitive values are masked as `*****`
- **`ContextScopeFilter`** - When `ConvertContextToColumns` is true, only context keys whose whole `scope::property` text contains this substring (case-sensitive) are included

---

### KeyValuePairParser - Property-File Style Messages

Splits each line on a delimiter to extract key-value pairs; all pairs combined into one record.

```json
"Options": {
    "Delimiter": "=",
    "PreserveWhiteSpace": true
}
```

- **`Delimiter`** (required) - String used to split each line into key and value
- **`PreserveWhiteSpace`** - When `false`, trims whitespace from both key and value (default `true`)
- Lines not containing the delimiter are silently skipped, and repeated keys produce repeated fields
- The line is split on **every** delimiter: the value is the text between the first and second delimiter, and anything after a second delimiter is dropped (`url=http://x?a=b` gives `http://x?a`)

---

### Other Parsers

| PluginName | Format | Notes |
| ------------ | -------- | ------- |
| `WfsGmlParser` | OGC WFS GML | `XmlParser` plus built-in roots for WFS GetFeature responses (`/FeatureCollection/member`; `featureMember` for WFS 1.1.0). Takes the tree-parser options plus `OutputKey` (default `DEFAULT`, not shown in the Options editor). As a step it assumes WFS 2.0; for a 1.1.0 response set `RecordRootPath: "/FeatureCollection/featureMember"`. GML limits as for `XmlParser` |
| `ProtobufParser` | Protocol Buffers | Compiles a `.proto` contract at runtime. Options: `MessageType` (full generated C# type name, required), `ProtocolBuffersContractFilePath` or `ProtocolBuffersContractUrl`, `ProtocolBuffersBaseImportPath`, `AdditionalMetadataReferences`, plus `SimplifyColumnNames` and `PropertiesToPromote`. One record per message; repeated fields get numbered columns. After the first parse the contract is saved as a DataStream resource named after `MessageType`, which then overrides the file/URL. Needs `protoc` on the server |
| `GtfsFeedParser` | GTFS-realtime | Parses a binary `FeedMessage` into keys `TRIP_UPDATES`, `STOP_TIME_UPDATES`, `VEHICLE_POSITIONS`, `CARRIAGE_DETAILS`, `SERVICE_ALERTS`. No options. **Give every key a transition**: a missing one silently stops the rest of the feed |
| `TleDataParser` | Satellite TLEs | Three-line element sets → `identifier`, `line1`, `line2`; `ParseTleFields: true` also decodes every orbital element. Without it a trailing newline fails the message |
| `LASWellLogParser` | Well log data | LAS 2.0 → one record per depth sample: `WellboreID` (from option `WellBoreId`, a context template) plus one column per curve |
| `RasterParser` | Raster imagery | Runs the raster importer on the stream. `FileExtension` must include the dot (`.tif`, `.xyz`, `.grib2`, `.nexrad`); TIFF also needs `"FileImportOptions": { "Imagery": {} }` |
| `TiledImageryParser` | XYZ tiled images | Needs `tile:x`/`tile:y`/`tile:z` in context. Options `Column` (default `Image`), `ImageryFormat`, `ImageQuality` - **default 0 is the lowest JPEG quality**. Emits an image object, so commit with `ChangeSetCoalescingPipelineCommitter` |
| `GdeltMasterListParser` | GDELT master list | Downloads newer files and emits **seven** keys, each needing a transition: `EVENTS`, `MENTIONS`, `GKG`, `EVENTS_files`, `MENTIONS_files`, `GKG_files`, `UNCLASSIFIED_files`. Set `StartDate` (tracking is not saved between polls, so every poll restarts from it) and `MaxParallel` |
| `GdeltEventFileParser` | GDELT events | One events file (ZIP/TSV) → key `EVENTS` |
| `GdeltMentionsFileParser` | GDELT mentions | One mentions file → key `MENTIONS`; fetches each mentioned page (one HTTP request per row) |
| `GdeltGkgFileParser` | GDELT GKG | One GKG file → key `GKG` |
| `GdeltLinksFileParser` | GDELT social links file | One gzip social-links file → key `SOCIALLINKS`; fetches each linked page |
| `GdeltSocialLinksListParser` | GDELT social links list | Downloads newer social-links files → keys `SOCIALLINKS`, `SOCIALLINKS_files`, `UNCLASSIFIED_files` |
| `ObjectDetectionParser` | Video frames | Runs YOLOv5 object detection on `VideoConnector` frames. Options: `ModelURL` (required), `ModelType` (`YoloV5S`, `YoloV5P5`, `YoloV5P6` default, `YoloV5S_F16`), `ShapeWKT` (image footprint). Emits `Frame`, `FrameId`, `Label`, `Score`, `Location` |
| `VideoToMediaDataParser` | Video segments | Reads `VideoConnector` segment context and emits one record with a `videoData` media value. No config |
| `PassThroughParser` | N/A | For connectors that already produce records - no parsing needed. **Auto-injected; you normally never write this step yourself** (see below) |

### Record-Oriented Connectors - Omit the Parser Step

Some connectors emit `MLFlattenedRecord`s directly instead of a byte stream. They are marked with `IMLRecordOrientedConnector`:

| Connector | Notes |
| --------- | ----- |
| `WfsConnector` | Parses GML internally with `WfsGmlParser`; the `Parsing` block on the **connector** config configures it |
| `RelationalDatabaseConnector` | Rows come back already flattened |

For these, `RampWrapper` passes `connectorProducesRecords: true` (`RampWrapper.cs:209`) and the engine injects a `PassThroughParser` ahead of the first step (`IOPipeline.cs:451-474`). The pipeline may therefore **start at a `Committer`, `RecordTransform`, or `InterchangeTransform`** - a `Parser` step is not required. Adding one does no harm: when a connector delivers records, a parser step never parses them, it only routes them.

The injected parser routes **only `DEFAULT`**. If the connector emits records under other keys (`RelationalDatabaseConnector` uses its `Queries` names; `WfsConnector` uses `Parsing.OutputKey`), declare your own parser step with one transition per key, otherwise those records fail with *Could not transition to &lt;key&gt;*. A committer-only pipeline is valid and normal:

```json
{
    "NumberOfWorkers": 1,
    "Steps": [
        {
            "StepName": "Commit",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "ImportTables": {
                    "DEFAULT": { "Account": "acct", "Table": "tbl", "Append": false }
                }
            }
        }
    ]
}
```

---

## How Nested Data Gets Flattened

JSON, XML, and Avro parsers all flatten the same way.

### Default Underscore-Joined Names

```json
{ "user": { "profile": { "name": "John", "age": 30 } } }
```

Becomes: `user_profile_name="John"`, `user_profile_age=30`. Names join the path from the document root; records under `$.features[*]` get a `features_` prefix, records under `$[*]` none. There is no character cleanup at this stage (the committer later turns non-alphanumeric characters into `_`).

### SimplifyColumnNames = true

Uses leaf names only: `name="John"`, `age=30`. On collision, every colliding name gets one more parent level: `user_name="John"`, `product_name="Widget"`.

### Arrays

Arrays of **plain values are not numbered**: inside a record they become one space-separated value, and nested arrays become `(1 2,3 4)`:

```json
{ "tags": ["red", "blue", "green"] }
```

Becomes: `tags="red blue green"`

Numbered suffixes appear when one name gets several values within a record - an array of **objects**, or a repeated XML element:

```json
{ "items": [ { "name": "a" }, { "name": "b" } ] }
```

Becomes: `items_name1="a"`, `items_name2="b"`. The set of columns therefore changes with the array length, which is why a large nested object or array kept inside a record can produce thousands of columns.

### Renaming Columns

A parser cannot rename individual fields. `PathActions[].ColumnName` only names the JSON text column created by a stringify mode. Rename with `FieldNameTransform` after the parser.

### JSON Value Formatting

Numbers are written as parsed (`180.0` becomes `180`), booleans as `True`/`False`, and ISO-looking date strings are reformatted (`2020-09-08T14:22:34Z` becomes `2020-09-08T14:22:34.0000000Z`). If an object repeats a key, the last value wins.

---

## Record Transforms

Steps with `"Type": "RecordTransform"`, placed between parser and committer. `Options` vary by plugin.

### FieldNameTransform - Rename/Filter Fields

```json
"Options": {
    "ExcludeFields": ["id", "_internal"],
    "IncludeFields": ["name", "age", "location"],
    "RenameFields": {
        "old_name": "new_name",
        "firstName": "given_name"
    }
}
```

- **`ExcludeFields`** - Array of field names to remove from the record. Checked first, so it wins over `IncludeFields`
- **`IncludeFields`** - If non-empty, only these fields are kept (whitelist mode), matched by their **original** (pre-rename) names. Null or `[]` keeps everything minus excludes
- **`RenameFields`** - Dictionary mapping old field names to new names. The field keeps its position; renaming onto an existing name creates a duplicate
- All name matching is exact and case-sensitive

### ExpressionTransform - Compute New Fields

Uses MapLarge's query expression engine (`DotNetExpTranslator` parses, the Query Engine v2 builder compiles) - a small **C#-like expression language**, not SQL or JavaScript. It is the same language as Query Engine v2 calculated columns. [Available Functions](#available-functions-verified-against-source) below lists the common ones.

#### Expression Syntax Rules

- **Field references:** bare names for names made of letters, digits and `_` - `first_name`. Any other name is written `@[my field]`; names containing `.` or `/` cannot be referenced. Fields named `null`, `true`, `false`, `over`, `partition`, `by`, `order`, `asc`, `desc`, `and`, `between` or `where` also need `@[...]`. `[first_name]` alone is a parse error
- **Field names are case-sensitive** on servers with the default `caseSensitiveSchema=false` (the setting is applied backwards). `Name` for a field called `name` fails with *Unable to find field*, or with `TreatMissingFieldsAsEmpty` silently reads an empty string
- **Field values are text** when they come from a parser. There is no automatic text → number or text → date conversion in function arguments: write `Round(ToDouble(price), 2)`, `FormatDateTime(ParseDateString(ts), 'yyyy-MM-dd')`
- **String literals:** single or double quotes - `'hello'` or `"hello"` (inside pipeline JSON, write a double-quoted literal as `\"hello\"`). There are no escape sequences: a backslash is kept as typed, which suits regular expressions. Use double quotes for text containing `'`
- **`+` concatenation:** joins text whenever **either** side is a string (`'id-' + 5` is `id-5`), so on a text field `price + 1` gives `"51"`. Comparing two texts is alphabetical and case-sensitive (`"9" > "100"` is true), and comparing a text field with a number does not compile - convert first
- **Operators:** `== = != <> < <= > >=` (`=` is equality), `&&` `||` `!`. Both sides of `&&`/`||` are always evaluated. `&` and `|` bind more tightly than comparisons, so use `&&`/`||`. No `^` (use `Pow`), no `??`, no casts
- **Conditional:** `cond ? a : b` evaluates only the chosen branch - use it to guard division or parsing. `Iif(cond, a, b)` evaluates **both** branches first and returns null for a null condition
- **Missing and null fields** read as an empty string (with `TreatMissingFieldsAsEmpty`), so `IsNull(f)` and `f == null` are false; test with `IsEmpty(f)`
- **Every expression sees the incoming record.** An expression cannot use another output of the same step; chain a second `ExpressionTransform`. Give each step **unique output names**: compiled expressions are cached per worker by output name across all steps, so two steps producing `label` can run the first step's expression
- **Not available:** aggregate functions (`Median`, `StdDev`, …) do not compile; analytic functions (`Lag`, `Rank`, `OVER (…)`, and the **one-argument** forms of `Sum`, `Count`, `Max`, `Min`) fail on every record; query parameters (`@name`), subqueries and permission functions (`UserHas…`) fail
- **Adding a capture timestamp:** use `ExtendRecordTransform` with `"AddTimestamp": true` (adds `_ml_capture_timestamp`). `AddTimestamp` in a committer's `ExtendedConfigJson` has **no effect** in DataStream pipelines. Use `UtcNow()`/`CreateTimestamp()` in ExpressionTransform when you need the time in a calculation
- **Errors:** *Invalid expression … Unexpected Characters* (syntax), *Unable to find field for expression variable* (missing field), *method 'X' doesn't exist*, *no overloaded version of method 'X' exists for the following argument types* (usually text passed where a number or date is expected)

#### Available Functions (verified against source)

**IMPORTANT:** Function names are **case-insensitive** (`toupper(x)` works). `Now()` does not exist - use `UtcNow()`. `IsNullOrEmpty()`/`IsNotNullOrEmpty()` work only on JSON values; for text use `IsEmpty()`/`IsNotEmpty()`. A selection of commonly used functions follows; the HTML reference lists all of them.

**Type Conversions:**
`ToString(value)`, `ToInt(value)`, `ToLong(value)`, `ToDouble(value)`, `ToFloat(value)`. Invalid or empty text converts to **0**, not null. `ToInt`/`ToLong` of a double round half to even (banker's rounding). Parsing uses the server's culture

**Conditional:**
`Iif(condition, ifTrue, ifFalse)` - evaluates both branches. The ternary `condition ? ifTrue : ifFalse` evaluates only the chosen one

**Null Handling:**
`IsNull(value)` / `IsNotNull(value)` - for values that can really be null (function results such as `RegexMatch`); record fields are never null here. `Nvl(value, default)` - returns default if null. `NullIf(value, nullCondition)` - returns null if value matches nullCondition. `Coalesce(v1, v2, ...)` - first value that is assigned and not the type's default (`0`, `false` and `Guid.Empty` are skipped, `""` is not), so on text fields use `IsEmpty(a) ? b : a`

**String Functions:**

| Function | Description |
| ---------- | ------------- |
| `IsEmpty(text)` | True if string is null or empty. **Use this, not `IsNullOrEmpty()`** |
| `IsNotEmpty(text)` | True if string is not null and not empty. **Use this, not `IsNotNullOrEmpty()`** |
| `Contains(text, search, insensitive)` | True if text contains search string (`insensitive` defaults to `true` - case-insensitive by default) |
| `StartsWith(text, search, caseSensitive)` | True if text starts with search (caseSensitive defaults to true) |
| `EndsWith(text, search, caseSensitive)` | True if text ends with search |
| `Replace(text, find, replacement, ignoreCase)` | Replace occurrences (`ignoreCase` defaults to `false`) |
| `Trim(text, characters)` | Remove leading/trailing whitespace, or specific `characters` if provided (default: whitespace) |
| `SubString(text, start, length)` | Extract substring |
| `IndexOf(text, search, startIndex)` | Position of search in text (`startIndex` defaults to `0`; returns -1 if not found) |
| `StrLength(text)` | Character count |
| `ToUpper(text)` / `ToLower(text)` | Case conversion |
| `Split(text, delimiter, ...)` | Split on one or more **single-character** delimiters. Returns a multi-value result, not text: read an element with `Subscript(Split(x, ','), 0)` (0-based) |
| `Like(text, pattern)` | SQL-style wildcards (`%`, `_`); optional `caseSensitive` (default true) |
| `IsMatchRegex(value, pattern, matchCase)` | .NET regex match, returns true/false |
| `ContainsAny(text, v1, v2, ...)` | True if text contains any of the provided values (case-insensitive) |
| `ContainsAll(text, v1, v2, ...)` | True if text contains all of the provided values (case-insensitive) |
| `PadLeft(number, totalWidth, paddingChar)` | Left-pad a number (int or double) to specified width with the given character |
| `LastIndexOf(text, search)` | Position of last occurrence of search in text (-1 if not found) |
| `CountOf(text, search, caseSensitive)` | Count occurrences of search in text (caseSensitive is required) |
| `Equals(text1, text2, caseSensitive)` | String equality check (`caseSensitive` defaults to `true`; use `Equals(a, b, false)` for case-insensitive) |
| `RegexMatch(text, pattern)` | Return first regex match; no match returns null (written as null) |
| `RegexMatches(text, pattern, delimiter)` | Return all regex matches joined by delimiter (default `","`) |
| `RegexReplace(text, pattern, replacement)` | Replace regex matches (`$1`, `${name}`) |
| `RegexReplace2(input, pattern, output)` | Replace using named capture groups in output template |
| `GetJSONPathValue(text, path)` | Parse JSON **text** and return the first value at a JSONPath (`'$.owner.name'`, `'$.tags[0]'`, filters like `"$.metrics[?(@.type=='severity')].value"`). Returns `""` when the path is missing or the text isn't JSON. The way to pull chosen values out of a stringified JSON blob |
| `FromJSON(text)` | Parse JSON text into **one multi-value object** (it does not add columns). Read a property with e.g. `SubscriptDouble(FromJSON(payload), 'lat')`. Invalid JSON fails the message |
| `FromCSV(text)` / `FromCSV(text, delim)` | Parse CSV text into one multi-value object with parts named `_0`, `_1`, … (the column-names argument can't be written: there are no array literals) |
| `ToCSV(values...)` | Combine values into CSV string |
| `MatchAndMapDelimited(match, matchIn, delim1, mapTo, delim2)` | Find `match` in delimited `matchIn` list (exact, case-sensitive; only the first character of each delimiter is used), return value at same index from `mapTo` list. Returns empty string if no match; fails if `mapTo` has fewer entries than the match position |
| `ReverseContainsAll(text, delim, words...)` | True if all elements of delimited `text` appear in `words` |
| `RangeMatch(value, ranges)` | True if an **integer** value falls within comma-delimited `a-b` ranges like `'1-10,20-25'` (single values in the list are ignored) |
| `EqualsAny(value, v1, v2, ...)` | True if value matches any of the provided values (exact for text) |
| `EqualsNone(value, v1, v2, ...)` | True if value matches none of the provided values |
| `Choose(index, v1, v2, ...)` | Return value at 1-based index position; an index of 0 or less fails the message, past the end returns the default |
| `SearchCSV(haystack, needle)` | Find `needle` in CSV `haystack`, return 0-based index (-1 if not found). `[CacheIndex]` auto-injected |
| `ContainsCSV(haystack, needle)` | Check if CSV `haystack` contains `needle`. Returns 1 (found) or 0 (not found). Overloads for string, int, and long needle. `[CacheIndex]` auto-injected |
| `StringSplitLength(value, separator, excludeEmpty)` | Count of parts after splitting `value` on `separator`. `excludeEmpty` controls whether empty entries are excluded |
| `RangesOverlap(ranges1, ranges2)` | True if two numeric range strings overlap (e.g., `RangesOverlap('1-10,20-25', '8-15')`) |
| `RangesEnumerate(ranges, strictAlphaMatching)` | Enumerate all values in a range string as comma-separated list (`strictAlphaMatching` defaults to `true`) |
| `CollapseToRanges(values)` | Collapse a comma-separated list of values into range notation (e.g., `'1,2,3,5,6'` → `'1-3,5-6'`) |
| `MultiValueEquals(val1, val2)` | Multi-value equality check between two strings |
| `ColorHash(input, alpha)` | Deterministic ARGB color from string, returned as `"A-R-G-B"` dash-separated string. `alpha` defaults to 255 |
| `Compare(a, b)` | Generic comparison with null handling: negative, zero or positive (for text, not limited to -1/1) |

**Numeric/Math:**
`Floor(value)` and `Ceiling(value)` (both return an **int**), `Round(value, decimalDigits)` (digits required; rounds half to even), `Pow(value, exponent)`, `Sqrt(value)`, `Max(v1, v2, ...)` and `Min(v1, v2, ...)` (two or more arguments - the one-argument form is the analytic version and fails), `Clamp(value, min, max)`, `Rand()` (0-1 double), `Rand(min, max)` (int), `NearestInt(value, step)` (truncates toward zero to a multiple of `step`; it does not round), `FormatNumber(value, format)`, `Threshold(value, t1, t2, ...)` (returns `t1` unless `value > t2`, then advances while `value` exceeds the next threshold, in list order), `StdDeviations(value, mean, stddev)` (absolute number of standard deviations from mean), `NormalizeAngle(angle)` (normalize to -180..180). `Math.Abs(…)`, `Math.Sqrt(…)` and `Math.PI` are also available (case-sensitive); the library itself has no `Abs`, `Log`, `Sin` or `Cos`. Avoid `CDF(value, mean, stdev)`: it is not a normal CDF (it never returns less than 0.5)

**Date/Time:** every date function takes a date value, not text. Parser fields are text, so wrap them: `ParseDateString(f)`, `FromUnixTimeSeconds(ToLong(f))`, `FromUnixTimeMilliseconds(ToLong(f))`.

| Function | Description |
| ---------- | ------------- |
| `UtcNow()` | Current UTC time as DateTimeOffset. **`Now()` does NOT exist** |
| `CreateTimestamp()` | Current UTC time as ISO 8601 string |
| `FormatDateTime(date, format)` | Format date using .NET format string (server culture) |
| `ParseDateString(value, ignoreInvalid, format)` | Parse text to a date. Both extra arguments are optional. Invalid text **fails the message** unless `ignoreInvalid` is true (then null, written as `1000-01-01T00:00:00+00:00`). `format` is an exact, culture-invariant format |
| `SecondsBetween(date1, date2)` | `date2 - date1` in seconds |
| `TotalDays(date1, date2)` / `TotalHours(...)` / `TotalMinutes(...)` / `TotalSeconds(...)` / `TotalMilliseconds(...)` | `date1 - date2` in the specified unit (note the opposite sign to `SecondsBetween`) |
| `TotalDays(date)` / `TotalHours(date)` / `TotalMilliseconds(date)` / etc. | `date - UtcNow()` (negative for past dates) |
| `GetUnixTime(date)` | Convert to Unix timestamp |
| `FromUnixTimeSeconds(seconds)` / `FromUnixTimeMilliseconds(ms)` | Convert from Unix timestamp (a `long`; text needs `ToLong`) |
| `AddMilliseconds(date, ms)` / `AddTimeSpan(date, timespan)` | Date arithmetic (`ms` is an int; `AddTimeSpan` also accepts text like `'01:30:00'`) |
| `Days(n)` / `Hours(n)` / `Minutes(n)` / `Seconds(n)` | Create TimeSpan values |
| `TruncateToYear(date)` / `TruncateToMonth(...)` / `TruncateToDay(...)` / `TruncateToHour(...)` / `TruncateToMinute(...)` / `TruncateToSecond(...)` | Truncate date to period |
| `WeekOfYear(date)` | Week number |
| `ToDayOfWeek(date)` | Day name |
| `ToTimeZone(date, tz)` / `ToLocalTime(date, tz)` / `ForceToTimeZone(date, tz)` | Time zone conversion; `tz` is an IANA id such as `'America/New_York'` (an unknown id fails). `ToTimeZone` keeps the instant; the other two reinterpret the wall-clock time in that zone |
| `GetLaterTimestamp(time1, time2)` | Return the later of two timestamps |
| `RoundTimeUp(date, span)` / `RoundTimeDown(date, span)` / `RoundTimeToNearest(date, span)` | Round time to interval |
| `TimeRangeOverlap(start1, end1, start2, end2)` | True if two date ranges overlap |
| `IsWithin(date1, date2, range)` | True if two dates fall within the given timespan; `range` must be a TimeSpan (`Minutes(5)`, `ToTimeSpan('00:05:00')`), not text |
| `DaysInMonth(year, month)` | Number of days in the given month (both args are integers) |
| `FormatTimeSpan(span)` | Format a TimeSpan as a readable string |
| `ToTimeSpan(string)` | Parse a string to a TimeSpan; invalid text fails the message |
| `InterpolateTime(time, start, end)` | Fraction `(time - start) / (end - start)` as a double (not a time); `start == end` fails |
| `FormatHour(hour)` | Format hour (0-23) as string (e.g., `"12a"`, `"2p"`) |
| `FormatDayOfWeek(day)` | Format day-of-week number as string (e.g., `"Sun"`, `"Mon"`, `"Thurs"`) |
| `CalculateSunAltitude(position, datetime)` | Sun altitude angle for a geographic point at a given time. `position` must be `GeoPointDouble` - wrap WKT strings with `PointFromWKT()` first |
| `CalculateLightStage(position, datetime)` | Light stage (`"Day"`, `"Twilight"`, or `"Night"`) for a geographic point at a given time. Same `PointFromWKT()` requirement as `CalculateSunAltitude` |

**Unit Conversion:**
`ConvertUnit(value, fromUnit, toUnit)` - convert between units by abbreviation (e.g., `ConvertUnit(ToDouble(distance), 'mi', 'km')`). The value must be numeric; costs about 1 ms per call

**GUID:**
`CreateGuid()` (returns a Guid object, which is **not** converted to text on output - use `CreateGuidAsString()` for a text column), `CreateGuidAsString()` (returns string), `CreateEmptyGuid()`, `GuidOffset(guid1, guid2)` (deterministic only for version-1, time-based GUIDs; for other GUIDs the result changes between server restarts and nodes)

**JSON:**
`GetJSONPathValue(text, path)` works on JSON **text** (see the string table above). The other JSON functions need a JSON value: `GetJSONPathValues(json, path)` (returns multiple matches), `GetJSONPathValueAsInt64(json, path)`, `GetJSONPathValueAsDouble(json, path)`, `GetJSONPathValueAsBoolean(json, path)`, `GetJSONPathValueAsDateTimeUtc(json, path)`, `IsNullOrEmpty(json)` / `IsNotNullOrEmpty(json)`. Convert text first with `StringToJSON(str)`: `GetJSONPathValueAsDouble(StringToJSON(payload), '$.a.b')`

```json
"Options": {
    "Expressions": {
        "full_name": "first_name + ' ' + last_name",
        "primary_key": "id + '@' + ToString(num)",
        "label_with_date": "name + '_' + ToString(timestamp)",
        "age_in_years": "Floor(TotalDays(UtcNow(), ParseDateString(birth_date)) / 365.25)"
    },
    "SkipStringConversion": false,
    "OverwriteFieldNames": true
}
```

- **`Expressions`** - Dictionary where keys are output field names and values are expression strings. Reference record fields by bare name (e.g., `first_name`, not `[first_name]`). Every expression sees the incoming record, not the outputs of the other expressions
- **`OverwriteFieldNames`** - Default `false`. When the output name already exists (case-insensitive): `true` replaces the first matching field in place; `false` appends a new field with a number added (e.g., `fieldName1`)
- **`SkipStringConversion`** - When `false` (default), numbers and booleans become text (`True`/`False`), dates become ISO 8601 and geometry becomes WKT; other result types (Guid, TimeSpan, multi-value results, JSON) are kept as objects. When `true`, every result keeps its native type. `CoalescingPipelineCommitter` accepts only text, so non-text results need `ChangeSetCoalescingPipelineCommitter`. A null result is stored as the type's default (`0`, `""`, `False`, or `1000-01-01T00:00:00+00:00` for dates)
- **`TreatMissingFieldsAsEmpty`** - When `true`, a field the expression references but the record lacks reads as an **empty string** instead of throwing `"Unable to find field"` (it is not added to the record). `IsEmpty(f)` is true and `IsNull(f)` is false; `ToDouble(f)` gives 0 (default: `false`)

#### Regex and Pattern Matching in ExpressionTransform

`IsMatchRegex(value, regexPattern, matchCase)` applies a .NET regular expression and returns `true`/`false`. This is available directly in `ExpressionTransform` - you do NOT need a separate `RegexTransform` step for pattern matching.

**Example - Match GUID pattern and filter/flag records:**

```json
"Options": {
    "Expressions": {
        "IsGuid": "IsMatchRegex(my_id_field, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', false)"
    },
    "SkipStringConversion": false
}
```

This creates a field `IsGuid` with value `"True"` or `"False"`. You can then use a `SkipRecordTransform` downstream to filter on it, or use it directly as a column.

**Example - Extract or validate multiple patterns in one step:**

```json
"Options": {
    "Expressions": {
        "IsGuid": "IsMatchRegex(record_id, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', false)",
        "IsEmail": "IsMatchRegex(email, '^[^@]+@[^@]+\\.[^@]+$', false)",
        "HasPrefix": "StartsWith(name, 'SENSOR_')",
        "SensorType": "Like(category, 'TYPE_%_ACTIVE')"
    }
}
```

#### Delimited String Functions - MatchAndMapDelimited, ReverseContainsAll

##### MatchAndMapDelimited - Map a Single Value via Positional Lookup

`MatchAndMapDelimited(match, matchIn, delimiter1, mapTo, delimiter2)` finds `match` in the `matchIn` delimited list, returns the value at the same index from the `mapTo` delimited list. Both lists are aligned by position. Returns empty string if no match.

**Example 1 - Status code to label:**

```text
MatchAndMapDelimited(status, '1|2|3', '|', 'Active|Pending|Closed', '|')
```

Input `status` = `"2"` → matchIn `["1","2","3"]` → index 1 → mapTo `["Active","Pending","Closed"]` → **`"Pending"`**

**Example 2 - Numeric code to WABCD label:**

```text
MatchAndMapDelimited(code, '7|4|5', '|', 'SABCD-F|SABCD-U|WABCD', '|')
```

Input `code` = `"4"` → index 1 → **`"SABCD-U"`**

**Example 3 - No match returns empty string:**

```text
MatchAndMapDelimited(region, 'US,EU,AP', ',', 'Americas,Europe,Asia-Pacific', ',')
```

Input `region` = `"AF"` → not found → **`""`**

The two delimiters can be different characters - `delimiter1` splits `matchIn`, `delimiter2` splits `mapTo`. In practice they're usually the same.

##### ReverseContainsAll - Check Token Subset Membership

`ReverseContainsAll(text, delim, words...)` splits `text` by `delim` and checks that **every token** appears in `words`. Think of it as: "is the token set from `text` a subset of `words`?"

**Examples with `text` = `"7 4 5"`, `delim` = `" "`:**

| Expression | Result | Why |
| --- | --- | --- |
| `ReverseContainsAll(field, ' ', '7')` | **false** | `"4"` not in words |
| `ReverseContainsAll(field, ' ', '7', '4')` | **false** | `"5"` not in words |
| `ReverseContainsAll(field, ' ', '7', '4', '5')` | **true** | all tokens found |
| `ReverseContainsAll(field, ' ', '7', '4', '5', '9')` | **true** | all tokens found (extra words OK) |
| `ReverseContainsAll(field, ' ', '11')` | **false** | exact match per token - `"7"` ≠ `"11"` |

Empty string returns `true` (no tokens to check). Matching is exact per token, not substring.

##### Mapping a Multi-Token Delimited String to Labels

A common need: map a space-delimited field like `"7 4 5"` to a semicolon-joined label string like `"SABCD-F;SABCD-U;WABCD"`.

**ExpressionTransform cannot split-map-rejoin a variable-length token list.** There is no loop, array map, or join function. The best workaround is regex word-boundary matching with conditional concatenation:

```json
"Options": {
    "Expressions": {
        "labels": "(IsMatchRegex(codes, '(^| )6( |$)', true) ? 'SABCD-E;' : '') + (IsMatchRegex(codes, '(^| )7( |$)', true) ? 'SABCD-F;' : '') + (IsMatchRegex(codes, '(^| )4( |$)', true) ? 'SABCD-U;' : '') + (IsMatchRegex(codes, '(^| )5( |$)', true) ? 'WABCD;' : '') + (IsMatchRegex(codes, '(^| )11( |$)', true) ? 'SABCD-K;' : '')"
    },
    "SkipStringConversion": false
}
```

**Results:**

| Input `codes` | Output `labels` | Notes |
| --- | --- | --- |
| `"6"` | `"SABCD-E;"` | Single match |
| `"7 4 5"` | `"SABCD-F;SABCD-U;WABCD;"` | Three matches |
| `"11 7 4 5"` | `"SABCD-F;SABCD-U;WABCD;SABCD-K;"` | `11` matches correctly, doesn't false-match `1` |
| `"17"` | `""` | `7` does NOT false-match inside `17` - regex boundaries work |

**Why not simpler alternatives?**

- `Contains(codes, '7')` - substring match, so `Contains('17', '7')` = true (wrong)
- `Replace()` chains - `Replace('11', '1', 'X')` corrupts multi-digit codes
- `MatchAndMapDelimited()` - maps a single value only, not a multi-token string
- `Split()` - splits the string but there's no way to iterate/map/rejoin results

**Limitations of the regex approach:**

1. **Trailing semicolon** - every match appends `';'`, no `TrimEnd()` available in expressions
2. **Output order is hardcoded** - determined by expression order, not input order. `"5 4 7"` and `"7 4 5"` produce identical output
3. **Every code must be hardcoded** - new codes require updating the expression
4. **Expression gets long fast** - each code adds ~50 characters; unwieldy past ~20 codes

**Better alternatives if limitations matter:**

- Do the mapping at **query time** instead - same functions available plus JOINs
- Use a **custom RecordTransform plugin** for proper split-map-rejoin
- **Pre-normalize the source data** - one record per code instead of a delimited list

#### Geo Functions Available in ExpressionTransform

The expression engine has full access to MapLarge's geospatial functions. Most work on geometry objects - WKT string fields must be converted first using `ShapeFromWKT()`, `LineFromWKT()`, or `PointFromWKT()`. (`GeoDistance` also has overloads that take WKT text directly.)

##### WKT Conversion Functions (String → Geometry)

These functions convert WKT strings (e.g., output from `EllipseToWKTTransform`) into typed geometry objects that other geo functions can operate on:

| Function | Input | Returns | Description |
| ---------- | ------- | --------- | ------------- |
| `ShapeFromWKT(wkt_field, splitDateLine)` | WKT string (POLYGON, MULTIPOLYGON) | `ShapeSetDouble` | Convert WKT polygon/multipolygon to a shape object (`splitDateLine` optional, default true) |
| `LineFromWKT(wkt_field, splitDateLine)` | WKT string (LINESTRING, MULTILINESTRING) | `LineSetDouble` | Convert WKT line to a line object (`splitDateLine` optional, default true) |
| `PointFromWKT(wkt_field)` | WKT string (POINT) | `GeoPointDouble` | Convert WKT point to a point object |

> **`GeoFromWKT` is NOT available in ExpressionTransform.** The pipeline uses `QueryEngine.Expressions` where `GeoFromWKT` is private. Use `ShapeFromWKT()`, `LineFromWKT()`, or `PointFromWKT()` instead.

##### Measurement Functions

| Function | Description | Returns |
| ---------- | ------------- | --------- |
| `Area(shape)` | Geodesic area of a polygon | `double` (km²) |
| `Buffer(line_or_shape, radiusMeters)` | Buffer a geometry by a distance | shape geometry |
| `GeoDistance(a, b, unit)` | Geodesic distance between geometries (points, lines, shapes, or WKT text) | `double` (unit: `'m'` default, `'km'`, `'mi'`, `'nmi'`) |
| `DistanceBetween(p1, p2, unit)` | Distance between two points | `double` (unit: `'M'`, `'K'` default, `'N'`) |
| `CreateCircle(point, diameter, unit)` | Create a circle polygon. The second argument is a **diameter** (unit default `'m'`) | shape geometry |
| `CreateCircleWithRadius(point, radius, unit)` | Create a circle polygon from a radius | shape geometry |

##### Using Area() in ExpressionTransform

`Area()` requires `ShapeSetDouble`, not a string. WKT fields must be converted with `ShapeFromWKT()` first:

| Expression | Works? | Why |
| --- | --- | --- |
| `Area(EllipseWKT)` | **No** | `Area()` has no `string` overload - fails with *no overloaded version of method 'Area' exists for the following argument types* |
| `Area(GeoFromWKT(EllipseWKT))` | **No** | `GeoFromWKT` is private in the QueryEngine expression scope - not callable |
| `Area(ShapeFromWKT(EllipseWKT))` | **Yes** | `ShapeFromWKT` converts WKT string to `ShapeSetDouble`, which `Area()` accepts |

**Example - Compute area from an ellipse WKT field in the pipeline:**

```json
{
    "StepName": "ComputeArea",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "ExpressionTransform",
    "Options": {
        "Expressions": {
            "AreaKmSq": "Area(ShapeFromWKT(EllipseWKT))",
            "AreaNmiSq": "Area(ShapeFromWKT(EllipseWKT)) * 0.291553"
        },
        "SkipStringConversion": false
    }
}
```

> `Area()` returns km². Multiply by `0.291553` to convert to nmi² (since 1 km = 0.539957 nmi, and 0.539957² ≈ 0.291553).

**At query time** (after import), `ShapeFromWKT()` is not needed - the column is already typed:

```sql
SELECT *, Area(geometry_ellipse) AS AreaKmSq, Area(geometry_ellipse) * 0.291553 AS AreaNmiSq FROM MyAccount.MyTable
```

In SQL, tables are written `account.table`; `account/table` fails with *SQL Syntax Error: '/'*.

**Example - Distance between two points:**

```json
"Options": {
    "Expressions": {
        "DistNmi": "GeoDistance(StartPoint, EndPoint, 'nmi')"
    }
}
```

### DelimitedToWKTTransform - Delimited Coordinate String to WKT Geometry

Converts a delimited coordinate string field (e.g., `"40.75,-73.98"`) to WKT. For single-string coordinates, not separate lat/lon columns.

```json
"Options": {
    "Fields": ["position"],
    "Coordinates": ["y", "x"],
    "WKTName": "Point",
    "OutputName": "geometry",
    "Delimiters": [",", " "],
    "ExpandExtents": false
}
```

- **`Fields`** - Array of record field names (exact, case-sensitive) to apply this transform to. Each field's string value is split on delimiters and parsed as coordinates. Without it the step does nothing
- **`Coordinates`** - Defines the **axis role** of each value in one tuple (default: `["x", "y"]`). Use `["y", "x"]` when the field has latitude before longitude (e.g., `"40.75,-73.98"` where 40.75 is lat). Only lowercase `x` and `y` are used; any other entry (`"z"`, `"m"`, `"_"`) marks a value to skip, so output is always 2D
- **`WKTName`** - WKT geometry type: `"Point"`, `"LineString"`, or `"Polygon"` (case-insensitive). Required; anything else fails the message with *Non allowed WKT type*
- **`OutputName`** - Name of the output WKT field. The source field is **always removed** (replaced in place); without `OutputName` the WKT keeps the source field's name
- **`Delimiters`** - Array of delimiter strings to split on (default: `[",", " "]`); empty parts are dropped
- **`ExpandExtents`** - When `true`, `WKTName` is `"Polygon"` and exactly two coordinates parsed, treat them as opposite corners and output a rectangle (default: `false`). Antimeridian handling covers only 0–360-style input (second longitude above 180) and produces a two-ring POLYGON, not a MULTIPOLYGON
- Polygons are not closed automatically (the first point is not repeated), `Point` uses only the first tuple, leftover values are ignored, and a non-numeric value fails the message

### CrsTransform - Coordinate Reference System Conversion

Reprojects geometry fields between CRS. Supports WKT strings and complex coordinate fields (`lon|lat` or `lon|lat|z`).

```json
"Options": {
    "Transformers": {
        "geometry": [
            {
                "InputCrs": "epsg:4326",
                "OutputCrs": "epsg:3857",
                "OutputPostFix": "_3857"
            }
        ],
        "lon|lat": [
            {
                "InputCrs": "epsg:4326",
                "OutputCrs": "epsg:27700",
                "OutputPostFix": "_27700"
            }
        ]
    }
}
```

**`Transformers`** - Dictionary (a JSON **object**, as above - the Options editor shows it as an array, but an array fails to load) where each key is a field name (or complex field like `lon|lat|z`) and each value is an array of CRS conversion rules:

- **`InputCrs`** - Input coordinate system (e.g., `"epsg:4326"` for WGS84). Required. `epsg:NNNN` is the tested form; other PROJ definitions should work
- **`OutputCrs`** - Output coordinate system (e.g., `"epsg:3857"` for Web Mercator). Required
- **`OutputPostFix`** - Suffix appended to the input field name for the output (e.g., `"_3857"` → `geometry_3857`). Without it the output has the same name as the input, creating a duplicate field

**Field name formats:** Simple (`"geometry"` = WKT string), complex (`"lon|lat"` = pipe-separated numeric fields), 3D (`"lon|lat|z"`). Names match case-insensitively. Multiple conversions per field are supported; original is preserved. Order must be **lon-lat** (x first). Composite outputs are written as numbers, not text, so the lat/lng geometry transforms can't consume them.

No output is produced when a composite field is missing, when the point is exactly (0, 0), or when the WKT can't be parsed. A new PROJ transformer is built for every rule on every record (slow on high-volume feeds), and errors surface as *Unidentified problem occurred when performing CrsTransform* with the cause in the inner exception.

### ExtendRecordTransform - Add Fields Not in the Incoming Data

```json
"Options": {
    "ExtendedFields": [
        { "ColumnName": "source_system", "Value": "kafka-prod" },
        { "ColumnName": "ramp", "Value": "{Ramp:RampId}" },
        { "ColumnName": "pipeline_version", "Value": "v2.1" }
    ],
    "AddContextProperties": false,
    "SensitiveDataHandling": "Mask",
    "AddTimestamp": true
}
```

**`ExtendedFields`** - An array of columns to add to every record:

- `ColumnName`: The column name to add
- `Value`: A literal string (`"kafka-prod"`), a **record field reference** using `{field:columnName}` syntax, a **message context reference** using `{scopename:valueid}` syntax (e.g., `"{Ramp:RampId}"`, or a connector value such as `"{S3Connector:Key}"`), or any combination of these in one string. An empty `Value` produces **null**, not `""`

**Substitution order** (`ExtendRecordTransform.cs:33-34`): `{field:...}` references resolve first against the incoming record, then `{scope:name}` references resolve against the message context. A `{field:...}` reference that matches no column on the record is left in place by the first pass and then resolved by the second pass as context scope `field`, so a typo ends up as an **empty string**, without an error.

**The colon trap:** if the value, after `{field:}` substitution, contains a colon but no `{scope:name}` placeholder, the whole value is treated as a context lookup and usually becomes **null**. Literal URLs, times and ISO dates (typed or copied from a field) therefore don't survive. Scope and property names inside braces may contain only letters, digits and `_`.

**`AddContextProperties`** - When `true`, copies all message context properties as columns on the record, named `Scope::Name` (stored as `Scope__Name`). `SensitiveDataHandling` controls how sensitive values appear: `Mask` (default, `*****`), `Include` or `Omit`.

**`AddTimestamp`** - When `true`, adds an `_ml_capture_timestamp` column with the current UTC time in ISO 8601 format.

#### Stubbing Missing Fields

Place `ExtendRecordTransform` **before** transforms that need a field to guarantee it exists with a default. If the field already exists, a duplicate is created; `CoalescingPipelineCommitter` keeps the **first** value, so the stub never replaces real data.

**Transforms that throw on missing fields:**

| Transform | Error When Field Missing | Fix |
| ----------- | ------------------------ | ----- |
| **ExpressionTransform** | `"Unable to find field for expression variable '{name}'"` - throws for ANY referenced field, even inside `Iif()` or ternary expressions. | Set `TreatMissingFieldsAsEmpty: true`, or stub fields with `EnsureFieldsTransform` (preferred) or `ExtendRecordTransform` |
| **MagneticDeclinationTransform** | `InvalidOperationException` from `.First()` - crashes if WKT, lat, lng, altitude, or time fields are missing. No graceful fallback. | Stub all input fields |
| **TableLookupTransform** | `"TableLookupTransform - Key Field {item} not found in incoming record. (ramp: …) (msg: …)"` - throws unless `IgnoreErrors: true` (which also requires `DefaultFetchColumnValues`) | Stub key fields, or set `IgnoreErrors: true` |
| **DMLStatementCommitter** | `"Could not find message field {name}"` - throws if any `{field:name}` placeholder references a missing field, failing every message in that batch | Stub all fields referenced in `StatementTemplate` |
| **EllipseToWKTTransform** | `"Ellipse not fully parameterized"` - throws only when `FailOnMissingParameters: true` | Set `FailOnMissingParameters: false`, or stub fields |
| **SectorToWKTTransform** | `"Sector not fully parameterized"` - same pattern | Same fix |
| **ECEFTransform** | `"ECEF not fully parameterized"` - same pattern | Same fix |

**Example - Stub fields before ExpressionTransform:**

```json
{
    "StepName": "StubMissingFields",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "ExtendRecordTransform",
    "Options": {
        "ExtendedFields": [
            { "ColumnName": "enterprise", "Value": "" },
            { "ColumnName": "enterprise_url", "Value": "" },
            { "ColumnName": "optional_metric", "Value": "0" }
        ]
    },
    "Transitions": [{ "ToStep": "ComputeFields" }]
},
{
    "StepName": "ComputeFields",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "ExpressionTransform",
    "Options": {
        "Expressions": {
            "has_enterprise": "IsNotEmpty(enterprise) ? 'yes' : 'no'"
        }
    }
}
```

> **Caveat: Duplicate field names.** If the field already exists, `ExtendRecordTransform` creates a duplicate. Most transforms use the first occurrence, and `CoalescingPipelineCommitter` keeps the first value. But **ExpressionTransform crashes on duplicates** (`ToDictionary()` on input fields throws `ArgumentException`). **Preferred alternatives:** Use `EnsureFieldsTransform` (no duplicates) or set `TreatMissingFieldsAsEmpty: true` on `ExpressionTransform`. Legacy workaround: use `SkipRecordTransform` first to drop records that already have the field.

### EnsureFieldsTransform - Stub Missing Fields Without Duplicates

Ensures that specified fields exist on every record. If a field is missing, it is added with an empty string value. If the field already exists, it is **not** duplicated (uses case-insensitive HashSet check). This is the preferred alternative to `ExtendRecordTransform` when you need to guarantee field presence before `ExpressionTransform`.

```json
"Options": {
    "Fields": ["agency", "shelter_type", "ridership", "ada_accessible"]
}
```

- **`Fields`** - Array of field names to ensure exist on each record (required: leaving it out fails every record). Missing fields are added with empty string values, in the configured order; existing fields are left unchanged.

**Example - Safe field stubbing before ExpressionTransform:**

```json
{
    "StepName": "EnsureOptionalFields",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "EnsureFieldsTransform",
    "Options": {
        "Fields": ["enterprise", "enterprise_url", "optional_metric"]
    },
    "Transitions": [{ "ToStep": "ComputeFields" }]
},
{
    "StepName": "ComputeFields",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "ExpressionTransform",
    "Options": {
        "Expressions": {
            "has_enterprise": "IsNotEmpty(enterprise) ? 'yes' : 'no'"
        }
    }
}
```

Unlike `ExtendRecordTransform`, this will not crash `ExpressionTransform` with duplicate field names.

### SkipRecordTransform - Conditionally Drop Records

Drops records where **any** condition is true:

```json
"Options": {
    "SkipWhen": [
        { "FieldName": "status", "Condition": "Equals", "Value": "deleted" },
        { "FieldName": "geometry", "Condition": "NotExists" }
    ]
}
```

| Condition | Drops the record when... | Comparison |
| ----------- | -------------------------- | ------------ |
| `Exists` | The field exists on the record | - |
| `NotExists` | The field does NOT exist on the record | - |
| `Equals` | The field exists and its value equals `Value` | exact, case-sensitive |
| `NotEquals` | The field exists and its value differs from `Value` | exact, case-sensitive |
| `EqualsAny` | The field exists and its value equals one of the comma-separated items in `Value` | case-insensitive; items are not trimmed |
| `NotEqualsAny` | The field exists and its value equals none of the items | case-insensitive; items are not trimmed |
| `Contains` | The field exists and its value contains `Value` | case-insensitive; ignored when `Value` is empty |
| `NotContains` | The field exists and its value does not contain `Value` | case-insensitive; ignored when `Value` is empty |

- `SkipWhen` is required: leaving it out fails every record. `FieldName` is matched case-sensitively (the first of duplicate names is used).
- `Condition` names are case-insensitive. An unknown name is ignored; a missing one fails the message. `Exists`/`NotExists` do not use `Value`; `EqualsAny`/`NotEqualsAny` require it.
- The `Not…` conditions never drop a record that lacks the field. Add a `NotExists` condition to drop those too.
- Write `"Value": "deleted,archived"`, not `"deleted, archived"`: the items are not trimmed, so the space becomes part of the second item.

### SplitDelimitedTransform - Split One Field into Multiple Columns

```json
"Options": {
    "FieldNames": ["location"],
    "Delimiters": [","],
    "OutputNames": ["city", "country"],
    "SuffixOutput": false
}
```

The original field is removed and the new fields take its place.

- **`FieldNames`** - Array of field names to split (case-sensitive)
- **`Delimiters`** - Array of delimiter strings to split on (default: `[" ", ","]`). Empty parts are dropped; parts are not trimmed
- **`OutputNames`** - Names for the resulting columns, applied in order. If there are more tokens than names, extra tokens are dropped; unused names are not created. If null, generates names like `location_1`, `location_2`
- **`SuffixOutput`** - When `true` and `OutputNames` is set, each part is named `{Field}{OutputName}` with no separator (e.g., `locationcity`). The original field is still removed
- The value must be a string: a null or non-string value fails the message

### EmbeddedJsonTransform - Parse JSON Inside a String Field

Parses a JSON string field and expands its properties into separate record columns.

```json
"Options": {
    "FieldToExpand": "payload_json",
    "ReplaceMesage": false,
    "UseLastRecord": false,
    "SimplifyColumnNames": true
}
```

- **`FieldToExpand`** - The field name containing the embedded JSON string (case-sensitive). Without it the step does nothing; a record that lacks the field passes on unchanged
- **`ReplaceMesage`** - When `true`, replaces the entire record with only the fields from the embedded JSON. When `false` (default), appends the parsed fields to the existing record. (Note: the property name has a typo - `Mesage` not `Message` - this is how it appears in the source code. `ReplaceMessage` is silently ignored)
- **`UseLastRecord`** - When the embedded JSON parses to multiple records, use the last one instead of the first (default `false`). Nested objects are yielded before their parents. Only one record is ever output
- The JSON parser options `RecordRootPath`, `MultipleRoots`, `SimplifyColumnNames`, `PathActions`, `ColumnActions`, `ExcludePaths`, `ProcessJsonNulls` and `PropertiesToPromote` apply to the embedded JSON. `IncludePaths`, `SwapAxisOrder` and `AttributeBasedNames` appear in the Options editor but do nothing here
- Invalid JSON fails the message. JSON that yields no record (empty, a scalar, or an array without `"RecordRootPath": "$[*]"`) silently drops the record when `ReplaceMesage` is `true`, and fails the message when it is `false`

#### GeoJSON String to WKT Conversion

Internally creates a `JsonParser`, so GeoJSON auto-detection converts `type`+`coordinates` objects to geometry automatically - but only when the geometry sits **under a property**. A field holding a bare geometry (`{"type": "Point", "coordinates": [...]}`) fails the message with *Value cannot be null. (Parameter 'key')*, because the converted geometry has no property name to use as its column name. Wrap it first:

```json
{
    "StepName": "WrapGeoJson",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "ExpressionTransform",
    "Options": {
        "Expressions": { "geojson_wrapped": "'{\"geometry\": ' + geojson_column + '}'" }
    },
    "Transitions": [{ "ToStep": "ConvertGeoJson" }]
},
{
    "StepName": "ConvertGeoJson",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "EmbeddedJsonTransform",
    "Options": {
        "FieldToExpand": "geojson_wrapped",
        "ReplaceMesage": false,
        "RecordRootPath": "$"
    },
    "Transitions": [{ "ToStep": "NextStep" }]
}
```

This appends a `geometry` field (a point column for the example above). `ReplaceMesage: false` keeps the existing fields, including the two text copies of the GeoJSON; drop them with a `FieldNameTransform` `ExcludeFields` step if they aren't wanted. For a GeoJSON **string held in a field**, this is the only way to convert it in a pipeline (no dedicated transform or expression function exists); GeoJSON objects in the payload itself are converted by the JSON parser.

### TableLookupTransform - Enrich Records from an Existing Table (LUT)

Full lookup table (JOIN at ingest time) - status code mappings, reference data enrichment, any key→value translation.

```json
"Options": {
    "LookupAccount": "reference_data",
    "LookupTable": "state_codes",
    "KeyColumns": ["code"],
    "KeyFields": ["field:state_abbrev"],
    "FetchColumns": { "full_name": "state_name", "region": "us_region" },
    "DefaultFetchColumnValues": { "full_name": "Unknown", "region": "Unknown" },
    "IgnoreErrors": true
}
```

- **`LookupAccount`** / **`LookupTable`** - The MapLarge table to look up against. The active version is read for every record
- **`KeyColumns`** - Column names in the lookup table that form the lookup key. They must be exactly the table's **primary-key** columns (case-sensitive), listed in the table's key order; any mismatch fails every record, even with `IgnoreErrors`. Composite keys are supported
- **`KeyFields`** - One value per key column, by position. `field:FieldName` reads a record field (case-sensitive); any other text is a literal key value. Values are converted to the key column's type; Guid and DateTime keys do not work
- **`FetchColumns`** - Dictionary mapping lookup table column names (keys) to output field names (values) for the columns to retrieve. Date values come back in the server's culture format (`10/6/2023 12:30:47 PM -04:00`), not ISO 8601
- **`DefaultFetchColumnValues`** - Used only when a lookup **fails** (missing table, missing column, missing key field, index error) and `IgnoreErrors` is `true` - **not** when no row matches. Keys are the **source column names** (the keys of `FetchColumns`). A fetch column that has a default is written under its **source** column name; one without a default is written under its output name with `""`. It must be present (`{}` is fine) when `IgnoreErrors` is `true`
- **`IgnoreErrors`** - When `true`, a failed lookup returns the record with the defaults above. When `false` (default), it fails the message

**No match is not an error.** When the key finds no row, the record passes on **without** the fetch fields (an Info line is logged), even if `DefaultFetchColumnValues` is set. Stub the fields with `EnsureFieldsTransform` if later steps need them.

**The table is checked once**, on the first record after the ramp starts. The lookup needs the table's primary-key index, and only the first matching row is used.

**Example - Status code LUT:**

```json
"Options": {
    "LookupAccount": "reference_data",
    "LookupTable": "status_codes",
    "KeyColumns": ["status_id"],
    "KeyFields": ["field:status"],
    "FetchColumns": { "status_label": "status_name" },
    "DefaultFetchColumnValues": { "status_label": "Unknown" },
    "IgnoreErrors": true
}
```

A status that isn't in the table passes on without `status_name`. The default `Unknown` only appears when the lookup **fails** (for example, the table is missing), and then under the source name `status_label`.

**Missing table behavior:** With `IgnoreErrors: true`, a **nonexistent lookup table** doesn't fail the message: every record passes through with the defaults described above. Because the table is checked only once, on the first record after the ramp starts, lookups stay disabled **until the ramp is restarted**, even after the table is created (for example by this pipeline's own committer). Without `IgnoreErrors`, every message fails until the restart.

**Example - Per-record freshness filtering (skip unchanged records):**

Look up each record's last committed `modified` value in the target table, and skip records that haven't changed. Useful when the source API doesn't support server-side "modified since" filtering. If a single high-water mark is enough (only records newer than anything seen before), `FieldTrackingTransform` is simpler.

```json
{
    "StepName": "lookupExisting",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "TableLookupTransform",
    "Options": {
        "LookupAccount": "myaccount",
        "LookupTable": "my_target_table",
        "KeyColumns": ["id"],
        "KeyFields": ["field:id"],
        "FetchColumns": { "modified": "existing_modified" },
        "DefaultFetchColumnValues": {},
        "IgnoreErrors": true
    },
    "Transitions": [{ "ToStep": "stubExisting" }]
},
{
    "StepName": "stubExisting",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "EnsureFieldsTransform",
    "Options": { "Fields": ["existing_modified"] },
    "Transitions": [{ "ToStep": "compareModified" }]
},
{
    "StepName": "compareModified",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "ExpressionTransform",
    "Options": {
        "Expressions": {
            "is_newer": "existing_modified == '' ? 'true' : (GetUnixTime(ParseDateString(modified)) > GetUnixTime(ParseDateString(existing_modified)) ? 'true' : 'false')"
        }
    },
    "Transitions": [{ "ToStep": "filterOld" }]
},
{
    "StepName": "filterOld",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "SkipRecordTransform",
    "Options": {
        "SkipWhen": [
            { "FieldName": "is_newer", "Condition": "Equals", "Value": "false" }
        ]
    },
    "Transitions": [{ "ToStep": "dropWorkFields" }]
},
{
    "StepName": "dropWorkFields",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "FieldNameTransform",
    "Options": { "ExcludeFields": ["existing_modified", "is_newer"] },
    "Transitions": [{ "ToStep": "commit" }]
}
```

How each case reaches `compareModified` with an `existing_modified` field:

- **Table missing** (first run): the lookup fails, and `IgnoreErrors` with an empty `DefaultFetchColumnValues` writes `existing_modified = ""`, so every record passes and the committer creates the table. Restart the ramp after the first run so lookups start working.
- **New id** (no row): the lookup adds nothing, and `EnsureFieldsTransform` adds `existing_modified = ""`, so the record passes.
- **Known id**: `existing_modified` holds the stored date in the server's culture format. Both values are parsed and compared as Unix seconds, so the time zone and format differences (and the milliseconds the lookup drops) don't matter.

The committer (`commit`) should use `PrimaryKeyColumns: ["id"]` with `Append: true` to upsert. Comparing the raw strings (`modified > existing_modified`) does **not** work: `>` on two strings is a string comparison, and the stored date doesn't come back in ISO 8601. Verified end to end on a local server: unchanged ids were skipped, changed ids updated, new ids inserted.

### RegexTransform - Apply Regex Patterns to Fields

```json
"Options": {
    "Transformers": {
        "phone_number": {
            "Pattern": "(\\d{3})(\\d{3})(\\d{4})",
            "Replacement": "($1) $2-$3"
        },
        "full_name": {
            "Pattern": "^(\\w+) (\\w+)$",
            "Replacement": "$2, $1",
            "NewProperty": "name_last_first",
            "DefaultIfNoRegexMatch": "UNKNOWN"
        }
    }
}
```

**`Transformers`** - Dictionary (a JSON **object**, as above - the Options editor shows it as an array, but an array stops the ramp from starting) where each key is a field name (case-insensitive) and each value defines the regex rule:

- **`Pattern`** - .NET regular expression to match (case-sensitive, no timeout). Required; checked when the ramp starts
- **`Replacement`** - Replacement string (supports capture groups: `$1`, `$2`, `${name}`). Every match is replaced. Required
- **`NewProperty`** - If set, writes the result to a new field with this name (inserted just before the original) and keeps the original
- **`DefaultIfNoRegexMatch`** - Value to use when the pattern doesn't match the input. When empty (the default), a non-matching value passes through unchanged
- A null field value fails the message; a missing field is skipped

### FieldTrackingTransform - Deduplicate / Incremental Import

Tracks a field value and skips records not greater than the last seen value (high water mark).

```json
"Options": {
    "TrackingFieldName": "last_modified",
    "DateFormatString": "yyyy-MM-dd'T'HH:mm:ss.fffZ",
    "DateTimeGracePeriodSeconds": 300,
    "TrackOnlyDoNotFilter": false
}
```

- **`TrackingFieldName`** - The field to track (a date, integer, or decimal). Write it in the **same case as the data**: if the cases differ, every record passes. Records without the field pass and leave the mark alone
- **`DateFormatString`** - Exact .NET date format for the value and the stored mark. If omitted, values are compared as dates if both parse, then as integers, then as decimals
- **`DateTimeGracePeriodSeconds`** - Dates only. Applies to both record rejection and high-water-mark updates. Records are rejected if `currentDate + gracePeriod <= lastDate`. Also only updates the tracked high water mark when the new value exceeds the previous by this many seconds. Prevents rapid updates from near-identical timestamps (default: 0)
- **`TrackOnlyDoNotFilter`** - When `true`, tracks the value but does not skip records. Useful if you want to observe the field's progression without filtering (default: `false`)

The mark is stored per ramp (system table `ramp_field_tracking`) after each successful message, so it survives restarts. One ramp has one mark, so don't use two tracking steps in one pipeline. Equal values are dropped (with no grace period), and a null value resets the mark. With several workers the mark can move backwards; use `NumberOfWorkers: 1` when order matters.

### Geometry Transforms

Convert domain-specific geometry representations to WKT. Only needed when data is not GeoJSON or GML (those are auto-detected by parsers).

#### LatitudeAndLongitudeToWKTTransform - Lat/Lng Columns to POINT WKT

Builds a single `POINT` WKT from two numeric columns.

```json
"Options": {
    "LatitudeField": "lat",
    "LongitudeField": "lon",
    "OutputFieldName": "WKT"
}
```

| Option | Default | Purpose |
| -------- | --------- | --------- |
| `LatitudeField` | `null` | Source column holding latitude |
| `LongitudeField` | `null` | Source column holding longitude |
| `OutputFieldName` | `"WKT"` | Column the POINT is written to |

If either field is absent or fails `double.TryParse`, the record is returned **unchanged** - no output column is added and no error is raised. Filter upstream with `SkipRecordTransform` if you need to guarantee a geometry.

Note the commit-time alternative: `VariableSchemaAccumulator` already synthesizes an `"XY"` column when it recognizes lat/lng columns *by name* (`lat`/`latitude`, `lng`/`lon`/`long`/`longitude`). Reach for this transform when your columns are named something else, or when you want the WKT under a specific name.

#### EllipseToWKTTransform - Geodesic Ellipse Parameters to WKT Polygon

Generates an ellipse polygon (MULTIPOLYGON WKT) from center, axes, and orientation. It is computed on a sphere of radius 6,371 km, not the WGS84 ellipsoid. Antimeridian crossing is handled automatically.

```json
"Options": {
    "CenterLatitudeField": "lat",
    "CenterLongitudeField": "lng",
    "MajorAxisField": "semi_major",
    "MinorAxisField": "semi_minor",
    "OrientationAngleField": "orientation",
    "OutputShapeField": "EllipseWKT",
    "AngleType": "Degrees",
    "AngleOffset": 0,
    "AxisScale": 2,
    "AxisUnits": "m",
    "StepSizeDegrees": 4,
    "OrientationOrigin": "CWN",
    "FailOnMissingParameters": false,
    "Adaptive": false,
    "CreateXYColumn": false
}
```

**The axis fields take full axis lengths**, and the code halves them to get the semi-axes. The example's fields hold semi-axes, so it sets `AxisScale: 2`. Without it the ellipse comes out at half the intended width and height, a quarter of the area (verified: semi-axes of 1000 m and 500 m give 0.39 km² with `AxisScale: 1` and the correct 1.57 km² with `AxisScale: 2`).

- **`CenterLatitudeField`** / **`CenterLongitudeField`** - Record fields for the center point (alternatively use `CenterWKTField` for a WKT point; malformed WKT there fails the message even when `FailOnMissingParameters` is `false`)
- **`MajorAxisField`** / **`MinorAxisField`** - Record fields for the **full** lengths of the axis along the orientation and the perpendicular axis. Can be the same field for a circle
- **`OrientationAngleField`** - Record field for the rotation angle (optional; missing or non-numeric means 0)
- **`OutputShapeField`** - Name of the output WKT column (default: `"EllipseWKT"`), appended to the record
- **`AngleType`** - `"Degrees"` or `"Radians"` (default: `"Degrees"`); the unit of the orientation field and of `AngleOffset`
- **`AngleOffset`** - Added to the orientation before any radian conversion, so it is in `AngleType` units (default: 0)
- **`OrientationOrigin`** - `"CWN"` (clockwise from North) or `"CCWE"` (counter-clockwise from East) (default: `"CWN"`). Exact uppercase; anything else fails the message
- **`AxisUnits`** - Unit for axis values, case-sensitive: `"m"` (meters), `"km"` (kilometers), `"mi"` (miles), `"nmi"` or `"nm"` (nautical miles), `"ft"` (feet), `"yd"` (yards), `"in"` (inches), `"cm"` (centimeters). Default: `"m"`. `"M"`, `"KM"` or `"NM"` fail the message with *Unknown units*
- **`AxisScale`** - Multiplier applied to both axis values (default: 1)
- **`StepSizeDegrees`** - Angular step for polygon point generation (default: 4, meaning ~90 points around the ellipse). Values ≤ 0 become 1
- **`Adaptive`** - When `true`, starts from 4 points and adds points only where the curve needs them, until each corner is within `StepSizeDegrees` of straight. `StepSizeDegrees` must then be between 0 and 180, exclusive
- **`FailOnMissingParameters`** - When `true`, the message fails (*Ellipse not fully parameterized*) if the center or an axis is missing or not numeric. When `false` (default), returns the record **unchanged** - the `OutputShapeField` is **not added** to the record (see [Absent Fields vs Null-Valued Fields](#absent-fields-vs-null-valued-fields))
- **`CreateXYColumn`** / **`CenterPointColumnName`** - By default the center is also written as `POINT(lng lat)` to a field named `XY`, **replacing any `XY` already on the record**. Set `CreateXYColumn: false` to keep it, or `CenterPointColumnName` to use another name
- Input values must be strings, as parsers produce them. A numeric value from an upstream transform fails the message
- **Antimeridian handling is automatic** - polygons crossing ±180° longitude are split into valid sub-polygons. No extra configuration needed

> **Handling missing output fields downstream.** When `FailOnMissingParameters: false` and parameters are missing, the record is returned unchanged - the output field is **not added**. Downstream transforms that reference the output field will throw (e.g., `ExpressionTransform` throws "Unable to find field").
>
> **Solutions:**
>
> **Option A (recommended) - Filter before transform:** `SkipRecordTransform` BEFORE `EllipseToWKTTransform` drops records missing input fields. Then set `FailOnMissingParameters: true` so downstream steps can safely assume valid WKT.
>
> ```json
> {"StepName": "RequireEllipseInputs", "Type": "RecordTransform", "PluginName": "SkipRecordTransform",
>  "Options": {"SkipWhen": [
>      {"FieldName": "lat", "Condition": "NotExists"},
>      {"FieldName": "lng", "Condition": "NotExists"},
>      {"FieldName": "semi_major", "Condition": "NotExists"},
>      {"FieldName": "semi_minor", "Condition": "NotExists"}
>  ]}},
> {"StepName": "BuildEllipse", "Type": "RecordTransform", "PluginName": "EllipseToWKTTransform",
>  "Options": {"CenterLatitudeField": "lat", "CenterLongitudeField": "lng", "MajorAxisField": "semi_major", "MinorAxisField": "semi_minor", "AxisScale": 2, "OutputShapeField": "geometry_ellipse", "FailOnMissingParameters": true}},
> {"StepName": "ComputeArea", "Type": "RecordTransform", "PluginName": "ExpressionTransform",
>  "Options": {"Expressions": {"AreaKmSq": "Area(ShapeFromWKT(geometry_ellipse))"}}}
> ```
>
> **Option B - Stub the output field after the transform:** `EnsureFieldsTransform` **after** `EllipseToWKTTransform` adds `geometry_ellipse = ""` only to records that didn't get an ellipse, so no duplicates are created. Guard downstream expressions against the empty value with `?:`, which short-circuits (`Iif()` and `&&` don't). Verified: records without axes get `AreaKmSq = 0` and the message succeeds.
>
> ```json
> {"StepName": "BuildEllipse", "Type": "RecordTransform", "PluginName": "EllipseToWKTTransform",
>  "Options": {"CenterLatitudeField": "lat", "CenterLongitudeField": "lng", "MajorAxisField": "semi_major", "MinorAxisField": "semi_minor", "AxisScale": 2, "OutputShapeField": "geometry_ellipse", "FailOnMissingParameters": false}},
> {"StepName": "StubEllipse", "Type": "RecordTransform", "PluginName": "EnsureFieldsTransform",
>  "Options": {"Fields": ["geometry_ellipse"]}},
> {"StepName": "ComputeArea", "Type": "RecordTransform", "PluginName": "ExpressionTransform",
>  "Options": {"Expressions": {"AreaKmSq": "geometry_ellipse == '' ? 0.0 : Area(ShapeFromWKT(geometry_ellipse))"}}}
> ```
>
> Don't stub with `ExtendRecordTransform` **before** the transform: the ellipse is then appended as a second `geometry_ellipse` field, the committer keeps the first (empty) one, and every ellipse is lost.
>
> **Option C - `FailOnMissingParameters: true`:** Strictest. Missing fields fail the entire message. Only use when all records have required fields.
>
> **Option D - Query-time Area:** Skip pipeline `ExpressionTransform`; after import, `Area()` works directly: `SELECT *, Area(geometry_ellipse) AS AreaKmSq FROM MyAccount.MyTable`

#### LOBToWKTTransform - Geodesic Line of Bearing to WKT LineString

Generates a LINESTRING from start point, bearing, and distance, computed on a sphere of radius 6,371 km. Lines that cross the antimeridian become `MULTILINESTRING`.

```json
"Options": {
    "StartLatitudeField": "lat",
    "StartLongitudeField": "lng",
    "BearingField": "bearing",
    "DistanceField": "range",
    "OutputLineField": "BearingWKT",
    "AngleType": "Degrees",
    "AngleOffset": 0,
    "DistanceScale": 1,
    "DistanceUnits": "m",
    "UseGreatCircle": true,
    "Steps": 20,
    "CreateXYColumn": false
}
```

- **`StartLatitudeField`** / **`StartLongitudeField`** - Record fields for the start point (alternatively use `StartWKTField`)
- **`BearingField`** - Record field for the bearing angle, clockwise from north (required). Missing or non-numeric passes the record on unchanged
- **`DistanceField`** - Record field for the line distance (optional - if missing or non-numeric, the distance is `DistanceScale` itself, 1 m by default, with no error)
- **`OutputLineField`** - Name of the output WKT column (default: `"BearingWKT"`), appended to the record
- **`AngleType`** / **`AngleOffset`** - Unit of the bearing (`"Degrees"` default, or `"Radians"`); the offset is added before any radian conversion
- **`UseGreatCircle`** - When `true` (default), follows the great circle with `Steps` segments. When `false`, produces a simple two-point line
- **`Steps`** - Number of great-circle segments (default: 20). Not shown in the Options editor; add it with Show JSON
- **`DistanceUnits`** - Unit for distance values, case-sensitive: `"m"` (meters), `"km"` (kilometers), `"mi"` (miles), `"nmi"` or `"nm"` (nautical miles), `"ft"` (feet), `"yd"` (yards), `"in"`, `"cm"`. Default: `"m"`
- **`DistanceScale`** - Multiplier applied to distance values (default: 1)
- **`CreateXYColumn`** / **`CenterPointColumnName`** - By default the origin is also written as `POINT(lng lat)` to `XY`, **replacing any `XY` already on the record**. Set `CreateXYColumn: false` to keep it

#### SectorToWKTTransform - Geodesic Sector/Wedge to WKT Polygon

Generates a MULTIPOLYGON sector (pie slice) from center, diameter, orientation, and sector angle, computed on a sphere of radius 6,371 km. Reuses ellipse logic; antimeridian splitting automatic.

```json
"Options": {
    "CenterLatitudeField": "lat",
    "CenterLongitudeField": "lng",
    "DiameterField": "range",
    "OrientationAngleField": "direction",
    "SectorAngleField": "beam_width",
    "OutputShapeField": "SectorWKT",
    "AngleType": "Degrees",
    "OrientationOrigin": "CWN",
    "DiameterUnits": "m",
    "DiameterScale": 2,
    "StepSizeDegrees": 4,
    "FailOnMissingParameters": false,
    "CreateXYColumn": false
}
```

- **`SectorAngleField`** - Record field for the full width of the wedge; it spans orientation ± half of this (e.g., 90 = quarter circle, 360 = full circle). Required
- **`DiameterField`** - Record field for the **diameter** of the circle the wedge is cut from, so the sector's range is **half** this value. The example's `range` field holds a range (radius), so it sets `DiameterScale: 2`; without it the sector reaches only half the range (verified: a `DiameterField` value of 1000 m gives a 500 m radius)
- **`AngleOffset`** - Unlike the ellipse, added **after** the radian conversion, so it is always in degrees
- There is no `Adaptive` option. All other options (`AngleType`, `OrientationOrigin`, `DiameterUnits`, `StepSizeDegrees`, `FailOnMissingParameters`, `CreateXYColumn`) work the same as in `EllipseToWKTTransform`, including writing the center to `XY` by default

#### ECEFTransform - Earth-Centered Earth-Fixed XYZ to Lat/Lng

Converts ECEF coordinates (common in satellite and radar data) into a lat/lng WKT point plus an altitude field.

```json
"Options": {
    "XField": "ecef_x",
    "YField": "ecef_y",
    "ZField": "ecef_z",
    "Unit": "m",
    "OutputPointField": "XY",
    "OutputAltitudeField": "Altitude",
    "FailOnMissingParameters": false
}
```

- **`XField`** / **`YField`** / **`ZField`** - Record fields for the ECEF coordinates (all three required)
- **`Unit`** - `"m"` or `"km"`, any case (default: `"m"`). Anything else fails the message
- **`OutputPointField`** - Name of the output WKT point column (default: `"XY"`). Appended, so an existing field with the same name becomes a duplicate
- **`OutputAltitudeField`** - Name of the output column for the height above the WGS84 ellipsoid, in meters (default: `"Altitude"`)
- **`FailOnMissingParameters`** - When X, Y or Z is missing or not numeric: `true` fails the message (*ECEF not fully parameterized*); `false` (default) passes the record on unchanged

#### ArcGisGeometryTransform - ArcGIS Geometry Fields to WKT

Zero-config (`"Options": {}`). Auto-detects ArcGIS geometry fields by suffix (case-insensitive):

| Field suffix | Output WKT type |
| ------------- | ----------------- |
| `geometry_x` + `geometry_y` | `POINT (x y)` |
| `geometry_paths` / `geometry_line` | `LINESTRING` |
| `geometry_points` | `MULTIPOINT` |
| `geometry_rings` | `POLYGON` |
| `geometry_polyline` | `MULTILINESTRING` |
| `geometry_polygon` | `MULTIPOLYGON` |

Multiple geometry types per record supported. Non-geometry fields pass through. The parser must keep full nested names (`SimplifyColumnNames: false`) so the suffixes survive. Matched source fields are removed and the WKT fields appended at the end. Matching is *ends with*, so `target_geometry_x` also matches. A lone `geometry_x` or `geometry_y` (without its pair) is dropped and no point is produced. `rings` and `points` produce valid WKT; `paths` produces a double-parenthesized body.

#### SimplifyTransform - Reduce Geometry Point Count

Applies Douglas-Peucker simplification to polygon or line geometries to reduce point count.

```json
"Options": {
    "Transformers": {
        "boundary_wkt": [
            {
                "FieldType": "shapeset",
                "OutputFieldName": "boundary_simplified",
                "Tolerance": 0.001,
                "DoNotOverSimplify": true
            }
        ]
    }
}
```

- **`Transformers`** - Dictionary (a JSON **object**, although the Options editor shows an array) where each key is a geometry field name (exact) and the value is an array of simplification rules. A missing field logs a warning and is skipped
- **`FieldType`** - `"shapeset"` for polygons, `"lineset"` for lines (case-insensitive). Required
- **`OutputFieldName`** - Name of the output field (can be same as input to overwrite). Required
- **`Tolerance`** - Maximum distance points can deviate from the original line (units depend on input CRS - degrees for WGS84, meters for projected). Default 1.0; must be greater than 0
- **`DoNotOverSimplify`** - `shapeset` only. When `true` and the result would have 6 or fewer points, halves the tolerance and retries, but only while the tolerance is above 0.1 - so with degree-scale tolerances like the example's `0.001` it never takes effect (default: `false`)
- **`lineset` truncates every output coordinate to a whole number**, so lon/lat lines snap to whole degrees. Use it only with projected (meter) coordinates
- Errors are reported as *Unidentified problem occurred when performing SimplifyTransform*

#### LineToWKTTransform - Two Points to WKT LineString

Constructs a LINESTRING (MULTILINESTRING if crossing dateline) from two endpoints. Optionally interpolates great-circle arc points. Like LOBToWKTTransform but uses explicit start/end instead of bearing+distance.

```json
"Options": {
    "StartLatitudeField": "prev_lat",
    "StartLongitudeField": "prev_lng",
    "EndLatitudeField": "curr_lat",
    "EndLongitudeField": "curr_lng",
    "OutputLineField": "TrackSegment",
    "UseGreatCircle": true,
    "Steps": 20
}
```

- **`StartLatitudeField`** / **`StartLongitudeField`** - Record fields for the start point (alternatively use `StartWKTField` for a WKT POINT string)
- **`EndLatitudeField`** / **`EndLongitudeField`** - Record fields for the end point
- **`OutputLineField`** - Name of the output WKT column (default: `"BearingWKT"`)
- **`UseGreatCircle`** - When `true` (default), interpolates points along the great-circle arc. When `false`, produces a simple two-point line
- **`Steps`** - Number of great-circle segments, giving `Steps + 1` points (default: 20, only used when `UseGreatCircle` is `true`). Not shown in the Options editor; add it with Show JSON
- `StartWKTField` malformed WKT fails the message. There is no end-point WKT option
- Antimeridian handling automatic (produces MULTILINESTRING). Missing or unparseable coordinates pass the record through unchanged
- Typical use: AIS/radar track segments from previous+current positions

#### RemoveInnerRingsTransform - Strip Polygon Holes

Removes inner rings (holes) from polygon WKT geometry, leaving only the outer boundary. Modifies the field in-place.

```json
"Options": {
    "GeoColumn": "boundary",
    "Method": "ShapeSet"
}
```

- **`GeoColumn`** - Name of the field containing polygon WKT, case-insensitive (if null/empty, the step does nothing). A null field value fails the message
- **`Method`** - `"ShapeSet"` (default): finds holes by geometry, handles POLYGON and MULTIPOLYGON, and always writes `MULTIPOLYGON(...)`. `"WktExtractor"`: POLYGON only, keeps the first ring, and fails the message on any other type

### Additional Record Transforms

These transforms cover more specialized use cases:

#### TableFieldNameTransform - Dynamic Field Renames from a Lookup Table

Renames record fields using a mapping stored in a MapLarge table. The lookup is cached and refreshed when the table version changes.

```json
"Options": {
    "LookupAccount": "config",
    "LookupTable": "field_mappings",
    "SourceColumn": "original_name",
    "RenameColumn": "mapped_name"
}
```

- **`LookupAccount`** / **`LookupTable`** (required) - MapLarge table containing the rename mappings
- **`SourceColumn`** (required) - String column in the lookup table holding original field names. Fields whose names match a value exactly are renamed in place
- **`RenameColumn`** (required) - String column in the lookup table holding desired new field names
- All four properties are validated when the ramp starts; missing values throw immediately
- Duplicate source names in the table fail every record

**Use at most one TableFieldNameTransform per server.** Its configuration is stored in a static field, so every instance (in any pipeline) uses the most recently loaded configuration.

Use this when field rename mappings need to be managed through the MapLarge UI rather than by editing pipeline config JSON.

#### GeoFieldNameTransform - Rename Geo Column to MapLarge Canonical Format

Optional transform. Renames geo column per the canonical naming table in [Geometry Column Naming](#geometry-column-naming---how-the-import-engine-names-geo-columns).

```json
"Options": {
    "TableName": "my_table",
    "GeoColumn": "geometry"
}
```

- **`TableName`** (required) - Table name (supports `{scope:property}` syntax). Used to derive canonical geo column name. Blank makes the step do nothing
- **`GeoColumn`** (required) - Current geo field name (case-insensitive match). Blank makes the step do nothing

| WKT type of the value | Field renamed to |
| --- | --- |
| `POINT` | `XY` |
| `MULTIPOINT` | `WKT` |
| `LINESTRING`, `MULTILINESTRING` | `{TableName}_Line` |
| `POLYGON`, `MULTIPOLYGON` | `{TableName}` |
| anything else (`GEOMETRYCOLLECTION`, `POINT Z`, empty, non-WKT) | an empty name - filter these out first |

**Important:** Renaming is **per-record** based on WKT type inspection. Mixed geometry types produce different column names per record - separate geometry types first with `SkipRecordTransform` or `TransitionGuard`. A null value fails the message, and a record that already has a field with the canonical name ends up with duplicate names.

#### HttpEncodeTransform - URL-Encode Field Values

URL-encodes configured values - context values or literals - and adds them as new columns. Values reference context variables using `{scope:name}` syntax; it **cannot** encode existing record fields (there is no `{field:...}` support).

```json
"Options": {
    "ConvertFields": [
        { "ColumnName": "encoded_key", "Value": "{S3Connector:Key}" }
    ]
}
```

- **`ConvertFields`** - Array of `{ColumnName, Value}` pairs. Each `Value` is resolved as a template, URL-encoded (lowercase escapes, `+` for spaces) and stored in `ColumnName`. A literal containing a colon becomes null (the colon trap)
- The step **always** also appends every non-sensitive context property as a `Scope::Name` field. This can't be turned off and adds columns to every record

#### MagneticDeclinationTransform - Compute Magnetic Variation

Calculates the magnetic declination (true north vs magnetic north) for a geographic point at a specific time using the World Magnetic Model (WMM). Requires a pre-loaded WMM coefficient table in MapLarge.

```json
"Options": {
    "MagneticModelTable": "admin/wmm_coefficients",
    "InputLatField": "lat",
    "InputLngField": "lng",
    "InputTimeField": "timestamp",
    "OutputField": "Declination"
}
```

- **`MagneticModelTable`** (required) - MapLarge table (`account/table`) containing WMM spherical harmonic coefficients. Create it by importing a NOAA `WMM.COF` file renamed to `*.wmm`. Checked when the ramp starts
- **`InputWktField`** - WKT POINT field for location (mutually exclusive with lat/lng fields)
- **`InputLatField`** / **`InputLngField`** - Separate lat/lng fields (mutually exclusive with `InputWktField`)
- **`InputTimeField`** - Timestamp field: a date string or Unix time in seconds or milliseconds (if omitted, uses the time the record is processed)
- **`InputAltitudeField`** - Altitude in meters (if omitted, computes at sea level)
- **`OutputField`** - Output column name (default: `"Declination"`); degrees, positive east
- **`MagneticModelName`** - Specific model name, for example `WMM-2020` (if blank, uses the model with the latest release date on or before the record's time)
- A configured input field that is missing from a record **fails the whole message** - stub or filter first
- The model is rebuilt from the table for every record, so expect low throughput

#### HtmlSourceTransform

Fetches the web page whose URL is in a record field (one HTTP GET per record) and stores its HTML, title, summary and retrieval time. Niche use case for web scraping within a pipeline.

```json
"Options": {
    "LinkColumn": "url",
    "SourceColumn": "html",
    "TitleColumn": "title",
    "SummaryColumn": "summary"
}
```

- **`LinkColumn`** / **`SourceColumn`** (both needed) - Field holding an absolute URL (empty values are skipped), and the field that receives the full HTML body
- **`TitleColumn`** - Receives `<title>`, else `og:title`, else the first `<h1>`
- **`SummaryColumn`** - Receives the meta description, else `og:description` (only when found)
- **`RetrievedColumn`** - Receives the UTC fetch time on a 2xx response (default: `"retrieved_timestamp"`)
- Non-2xx responses add nothing. Errors are logged and the record passes on

#### FetchImageFromS3Transform - Fetch S3 Images into Records

Downloads one NITF (`.ntf`) image per record from AWS S3, converts it to a geo-registered JPEG or PNG, and appends it as an image field. Only NITF files are supported.

```json
"Options": {
    "Bucket": "my-imagery-bucket",
    "Key": "$message:image_key",
    "Region": "us-east-1",
    "BoundingBox": "extent_wkt",
    "OutputColumnName": "Image"
}
```

- **`Bucket`** (required), **`Key`**, **`Region`**, **`AccessKey`**, **`SecretKey`**, **`KMSKey`** - Resolved as S3 references: `$messageKey` (the connector's `S3Connector:Key`), `$message:FieldName` (a **record field** in this transform), a bare `scope:name`, or a literal with no colon. Braces such as `{s3:key}` resolve to an **empty string**. A bucket given as an S3 URI has its scheme prefix stripped
- Leave `AccessKey` and `SecretKey` empty to use the server's IAM role. `AccessKeyPath`/`SecretKeyPath` read the keys from files; `RequesterPays`, `Anonymous`, `ServiceUrl` (S3-compatible endpoint) and `UseHttp` are also available
- **`BoundingBox`** - **Name of a record field** holding a 4–5 point polygon (top-left, top-right, bottom-right, bottom-left) to place the image. Without it, the NITF's own bounds are used
- **`OutputColumnName`** - Name of the image field (default: `"Image"`)
- **`ImageryConfig`** - Only `ResolutionCmPerPx`, `ImageryFormat` (`PNG`, otherwise JPEG) and `ImageQuality` are read. If you set `ImageryConfig`, set `ImageQuality` too; it otherwise defaults to 0
- The image field is a typed object, so commit with `ChangeSetCoalescingPipelineCommitter`

Niche - for satellite/aerial imagery pipelines where each record references an S3 image object.

#### VideoToTableDataTransform

Converts the current video frame (context value `video:frame`, from a `VideoConnector`) into a geo-registered JPEG image field. Config has only `ShapeWKT`: the footprint polygon, corners in top-left, top-right, bottom-right, bottom-left order; without it a placeholder footprint centered on 0,0 is used. Output column is hardcoded as `"frame"`, and it needs a committer that accepts typed values (`ChangeSetCoalescingPipelineCommitter`). Errors are logged and the record passes on without `frame`. Niche - for video frame ingestion pipelines.

---

## Stream Transforms

Operate on raw byte streams (`"Type": "StreamTransform"`). Typically placed before a parser.

| Plugin | Purpose |
| -------- | --------- |
| `JSONDisassemblerStreamTransform` | Extract JSON subtrees, promote properties to context |
| `MultipleJsonStreamSplitTransform` | Split concatenated JSON objects (see below) |
| `ContextVariableStreamTransform` | Transform context variables (see below) |
| `WaitForTransactionTransform` | Hold the message until a table version or cluster transaction has been applied on this node, then pass the stream on unchanged. Config: `TableId` (`account/table/version`, a template such as `{m:acct}/{m:tbl}/{m:ver}`; takes precedence), `TransactionNumber`, `TimeoutMs` (0 = one hour), `FailBehavior` (`Continue` proceeds silently after an invalid id, timeout or error; `Abort` fails the message). Continues immediately if that version or a later one is already active. With neither id set, the message fails |

**Download Transforms** - Fetch data from remote storage when the connector delivers a reference (key, path, URL) rather than the data itself. Several of them **don't** accept `{scope:name}` placeholders - check the resolution rule for each:

| Plugin | Purpose |
| -------- | --------- |
| `DownloadFromS3Transform` | Fetch one object from AWS S3 or an S3-compatible store (`ServiceUrl`). Options (`Bucket`, `Key`, `Region`, keys, `KMSKey`) are S3 references: a bare `scope:name` such as `S3Connector:BucketName`, `$messageKey` (= `S3Connector:Key`), `$message:<JSONPath>` into the incoming JSON body, or a literal **with no colon**. `{scope:name}` braces resolve to an empty string, and nothing is looked up implicitly - name every value. Leave both keys blank to use the server's IAM role. `DeleteAfterConsume` deletes the object without waiting for downstream steps, so a later failure loses it |
| `DownloadFromAzureTransform` | Download a blob from a **fixed** Azure account and container: `StorageConnectionString` and `PartitionId` (the container) are literals; `Blob` is a template resolved per message. Errors are swallowed without a log entry |
| `DownloadFromGCSTransform` | Download the object named by `GoogleCloudStorageConnector:Name`. `Bucket` and `KeyFile` are bare `scope:name` references, `$message:<JSONPath>`, or literals; `Anonymous` for public objects. The whole object is buffered in memory |
| `DownloadFromStorageGridTransform` | Plain, **unauthenticated** HTTP GET of a URL taken from the message (for example a pre-signed StorageGRID or S3 URL); it does not sign requests. `EndpointUrl` must be a bare `scope:name`, `$message:<JSONPath>` or `$messageKey` - a literal `https://` URL contains a colon and fails. `NoVerifySsl: "true"` skips TLS validation. `DeleteAfterConsume` is not read, and the HTTP status isn't checked (an error page flows downstream as data) |
| `DownloadFromSFTPTransform` | Open the remote file named by `SFTPConnector:OriginalFileName`. `Host`, `Port`, `Username`, `Password` are bare `scope:name` references or literals (the connector copies its values into context only when its `CopyConfigToMessage` is true). The other SFTP connector options appear in the editor but do nothing here. Opens a new SFTP connection per message |
| `WebDownloadTransform` | HTTP GET of `UriKey`, resolved as a template: it must be a bare `scope:name` (e.g. `raster:url`) or text with at least one placeholder (`https://host/{msg:id}.csv`) - a plain literal URL fails (colon trap). `HeaderParameters` and `QueryParameters` values are templates. `HandleDownloadFailures: true` drops failed downloads quietly instead of failing the message. Writes `download:file-name`, `download:file-ext` and `download:content-type` to context |

**Archive/Compression Transforms** - Extract or decompress archives. `UnzipTransform` and `UntarTransform` both support `IncludeRegexes` and `ExcludeRegexes` arrays for filtering entries (case-sensitive, unanchored):

| Plugin | Purpose |
| ------ | ------- |
| `UnzipTransform` | Decompress ZIP files. Config: `IncludeRegexes[]`, `ExcludeRegexes[]`, matched against each entry's **file name** (not its folder path). Each matching entry emitted as a separate message; the entry name is not added to the context. Folder entries have empty names and are emitted as empty messages unless an include pattern skips them. **Known issue below** |
| `GUnzipTransform` | Decompress gzip streams (gzip only; put it before `UntarTransform` for `.tar.gz`). **Known issue below** |
| `UntarTransform` | Extract uncompressed TAR archives. Config: `IncludeRegexes[]`, `ExcludeRegexes[]`, matched against each entry's **full path** inside the archive. Each matching entry emitted as a separate message; the entry name is not added to the context |

> **Known issue - `UnzipTransform` and `GUnzipTransform`:** on current builds both fail with *Stream was not readable.* when the ramp's **Eager Processing** setting is off (the default): the step's input is closed before the next step reads the decompressed stream. Reproduced on a local server. Turning Eager Processing on should avoid it (not tested). `UntarTransform` is not affected.

**Other Stream Transforms:**

| Plugin | Purpose |
| -------- | --------- |
| `AzureBlobStreamTransform` | Download the blob named by an upstream `AzureStorageConnector` message. Needs the connector's `CopyConfigToMessage: true` (that's how the connection details reach the context). Errors are swallowed without a log entry |
| `PassThroughStreamTransform` | No-op pass-through (a fan-out point for several transitions, or a placeholder start step) |
| `GeoFileInfoStreamTransform` | Extract geospatial metadata via GDAL (`gdalinfo`/`ogrinfo`). The message body must be a local file path (`AttachedFilesystemConnector` in file-name mode). Config: `PathRules` (regex→command mapping), `InfoOnlyMode`. Outputs JSON metadata array |
| `FileSetMetadataTransform` | Accumulate multi-file sets (e.g., satellite imagery bands), run `gdalinfo` when complete, inject metadata into import options. Needs GDAL; single node only. Niche - for Sentinel/Copernicus multi-band imagery |
| `GcsParquetStreamTransform` | Read a Parquet/GeoParquet object from Google Cloud Storage (`GoogleCloudStorageConnector:Bucket`, `:Name`, `:KeyFile` in context; a key file is required) and re-emit it as CSV, one message per row group, for a `DelimitedTextParser`. Config: `FileImportOptions` (only schema-directive types and `SplitAtDateLine` are read), `GeoTypes` (column → geometry type; a non-empty map turns geometry auto-detection off). Run with `NumberOfWorkers: 1` |
| `BandsToVisibleImageTransform` | Merge three band files of one image (arriving as separate messages) into one RGB GeoTIFF with GDAL. Post-processing for satellite imagery; single node only |

### MultipleJsonStreamSplitTransform - Split Concatenated JSON

Splits concatenated or newline-delimited JSON (e.g., `{"a":1}{"b":2}`, NDJSON) into individual messages, or pulls out nested objects by exact path.

```json
"Options": {
    "IncludeRoots": []
}
```

- **`IncludeRoots`** - Empty/null = emit every top-level object or array whole (arrays are **not** split into elements; top-level scalars are skipped). Otherwise emit only containers whose exact path is listed, for example `assets.green`: no `$`, no wildcards, case-sensitive. Each emitted document is buffered in memory and forwarded as a separate message with a copy of the context.

### ContextVariableStreamTransform - Transform Context Variables

Transforms message context variables (URL-encode, regex replace, token extraction).

```json
"Options": {
    "Transformations": [
        {
            "Input": "{S3Connector:Key}",
            "OutputScope": "work",
            "OutputName": "encoded_key",
            "Transform": "urlencode"
        },
        {
            "Input": "{streaming_msg:topic}",
            "OutputScope": "routing",
            "OutputName": "category",
            "Transform": "extracttoken",
            "Delimiter": ".",
            "TokenIndex": 1,
            "DefaultIfNoMatch": "unknown"
        },
        {
            "Input": "{S3Connector:Key}",
            "OutputScope": "work",
            "OutputName": "filename",
            "Transform": "replace",
            "Pattern": "^.*/([^/]+)$",
            "Replacement": "$1",
            "DefaultIfNoMatch": "unknown"
        }
    ]
}
```

The `streaming_msg:topic` value in the second item is one that an earlier step promoted (for example with `JSONDisassemblerStreamTransform`'s `PropertiesToPromote`).

- **`Input`** - Value to transform, resolved as a template: `{scope:name}` placeholders, a bare `scope:name`, or a literal with no colon
- **`OutputScope`** / **`OutputName`** - Where to store result (required; the scope must not be blank or `System`)
- **`Transform`** (case-insensitive):
  - `urlencode` - form-style encoding (spaces become `+`)
  - `interpolate` - stores the resolved `Input` as-is, so it copies or combines values
  - `extracttoken` - `Delimiter` (ordinal; whitespace-only makes the output empty), `TokenIndex` (zero-based; negative gives an empty result), `DefaultIfNoMatch` (used when the index is past the last token)
  - `replace` - `Pattern` (.NET regex, case-sensitive), `Replacement` (`$1`, `${name}`; must not be blank, or the output is empty), `DefaultIfNoMatch` (used when nothing matches)
  - Anything else fails with *Unrecognized transformation*
- `extracttoken` and `replace` fail the message when `Input` resolves to null
- Transformations run sequentially (later entries can reference earlier results). Empty or missing `Transformations` makes the step a pure pass-through

---

## InterchangeTransform Plugins

InterchangeTransforms operate on entire batches of records (the `IMLImportInterchange` object) rather than individual records, so they can relate records to each other. They sit between RecordTransforms and Committers, in import pipelines only.

- An interchange is the batch of records one message sends to a committer, each record tagged with a table key: the `TargetInputKey` of the transition that brought it in (default `DEFAULT`). The keys an interchange transform writes must match the committer's `ImportTables` keys exactly.
- Records reach an interchange transform only when **exactly one Committer step** is downstream of the parser. Use one committer with several `ImportTables` entries.
- All interchange steps in a message share one batch, so each one sees the others' records.

### CreateTrackLinesTransform - Generate Line Segments from Points

Groups the point records of one message by an id, orders them by time, and creates a line record for each consecutive pair (or one path per id with `Summarize`), with distance, duration, heading and speed. Useful for GPS, AIS or radar tracks.

| Property | Type | Default | Purpose |
| ---------- | ------ | --------- | --------- |
| `SourceTableKey` | string | | Interchange key of the point records (the `TargetInputKey` of the transition into this step). Required |
| `TargetTableKey` | string | | Interchange key for the generated records. Must be an `ImportTables` key, or the commit fails with *Table … unknown to coalescer!* Required |
| `IDField` | string | | Field that groups points into tracks (e.g., vehicle ID). Points without an id are left out of tracks |
| `TimeField` | string | | Field used to order points within each track |
| `TimeIsNumeric` | bool | `false` | When `true`, reads the time as an integer number of .NET ticks (100 ns). For Unix seconds also set `TimeFactorSeconds: 10000000`; for Unix milliseconds `10000`. When `false`, the time is parsed as a date |
| `PointField` | string | | Field containing a `POINT (x y)` WKT. Other geometry types and 3D points are ignored |
| `KeepSourceTable` | bool | `true` | Also pass the point records on under their own key |
| `DistanceFactorMeters` | double | `1` | Multiplier **from meters** to the output distance unit (0.001 for km, 0.000621371 for miles) |
| `TimeFactorSeconds` | double | `1` | Multiplier **from seconds** to the output time unit (1/3600 for hours) |
| `Summarize` | bool | `false` | Replace the per-segment records with one summary record per id |
| `OutputFieldPrefix` | string | `"track_"` | Prefix for the computed fields |
| `LagFieldPrefix` | string | `"prev_"` | Prefix for previous-point fields |
| `KeepFields` | string[] | `null` | Source fields to copy onto generated records. Empty copies all fields |

| Mode | Fields on each generated record |
| --- | --- |
| Segment (default): one record per consecutive pair of points | `track_Segment` (2-point LINESTRING), `track_Duration`, `track_Distance`, `track_Heading` (degrees from north), `track_Velocity`, `prev_{PointField}`, `prev_{TimeField}`, then the later point's fields |
| `Summarize: true`: one record per track id | `track_Path` (LINESTRING wrapped in literal double quotes), `track_TotalDuration`, `track_TotalDistance`, `track_AvgVelocity`, then the first point's fields |

Only points within one message are linked; there is no join to the previous message's last point. Distances and headings use a sphere of radius 6,371 km.

### TableRecordIDCachingTransform - Cache Domain IDs

Gives every record a new MapLarge row id (`_ml_row_id`, added as the first field) and remembers it in an in-memory cache under the record's key values. A later message can then find those rows with `TableRecordIDLookupTransform` - for example to delete them - before a table query would see them.

| Property | Type | Purpose |
| ---------- | ------ | --------- |
| `KeyFields` | string[] | Fields whose values form the cache key (exact names, exact text). Required |
| `AccountCode` | string | Account of the target table (`{scope:name}` placeholders work). Together with `TableName` it must equal the table's id exactly |
| `TableName` | string | Target table name |
| `DomainIDCacheName` | string | Cache namespace. The lookup step must use the same name |
| `OutputKey` | string | Interchange key for all records (its own key when blank), matched against the committer's `ImportTables`. It is **not** a transition key |

The cache lives in server memory: it is shared by every ramp on the node, never expires, and is lost on restart.

### TableRecordIDLookupTransform - Look Up Record IDs

For each record, finds the `_ml_row_id` of every existing row whose key columns equal the record's key fields, from the table index and/or the cache filled by `TableRecordIDCachingTransform`. It emits **only** generated records - one per matching row, holding `_ml_row_id` (plus the input fields with `RetainFields`) - normally committed with `Delete: true` to remove those rows. Unmatched inputs produce nothing.

| Property | Type | Default | Purpose |
| ---------- | ------ | --------- | --------- |
| `KeyFields` | string[] | | Record fields forming the key, converted to the key columns' types |
| `Tables` | TableInfo[] | | Tables to search, in order (see below) |
| `RetainFields` | bool | `false` | Copy the input fields onto each output record |
| `DomainIDCacheName` | string | | Also return ids remembered in this cache |
| `UseTableLookup` | bool | `true` | `false` skips the table index and uses the cache only. The table and an exact-match index on the key columns must still exist |

**TableInfo properties:**

| Property | Type | Purpose |
| ---------- | ------ | --------- |
| `Account` | string | Account (`{scope:name}` placeholders allowed) |
| `Name` | string | Table name (placeholders allowed) |
| `KeyColumns` | string[] | Columns matched to `KeyFields` by position |
| `OutputKey` | string | Interchange key for this table's results; must be an `ImportTables` key (not a transition key) |

The table data is loaded for every message, once per listed table.

---

## Committers

### CoalescingPipelineCommitter (Most Common)

```json
"Options": {
    "MaxFlushDelayMS": 15000,
    "TargetBackingFileRecordCount": 1000,
    "UseBackingFilePersistence": true,
    "FaultPipelineOnFailedTransaction": true,
    "ImportTables": {
        "DEFAULT": {
            "Account": "analytics",
            "Table": "events",
            "Append": true,
            "Partition": {
                "PartitionColumns": ["date:week"]
            }
        }
    }
}
```

The general-purpose table writer. It gathers rows from many messages into per-table buffers (backed by local files) and writes each batch as one transaction, with column types detected from the text values.

| Option | Default | Purpose |
| -------- | --------- | --------- |
| `MaxFlushDelayMS` | 15000 | Flush everything pending when no message has arrived for this long. Also, a message arriving more than this long after the previous flush started triggers a flush regardless of row count. `-1` turns the idle flush off |
| `TargetBackingFileRecordCount` | 1 | Flush once this many **rows** (summed over all tables) are pending and no flush is running. It's a minimum, not a cap: the flush takes everything pending. The default of 1 flushes after nearly every message |
| `UseBackingFilePersistence` | true | Write pending rows to files under `<data>/Imports/Coalescer/<pipeline>_<step>/` and replay them when the ramp starts. `false` keeps them in memory only, so a crash loses rows that were already acknowledged |
| `FaultPipelineOnFailedTransaction` | true | Fault the ramp when a flush throws. A transaction that completes with a failure status is reported but does not fault. Rows from a failed flush are not retried |
| `UseInlinePayloadOptimization` | false | Build small batches in memory (estimated payload ≤ 4,096 bytes, no geometry split) instead of through the regular payload builder. The server can turn this on for all ramps |

**Flush triggers:** `TargetBackingFileRecordCount` rows pending, `MaxFlushDelayMS` of idle time (or a message arriving that long after the last flush started), or the ramp stopping (which flushes pending rows).

**Tuning:** High-volume: large record count (1000+), moderate delay (15000ms). Low-latency: small count (1-10), small delay (1000-5000ms).

**ImportTables** maps input keys to table configs. Keys correspond to `TargetInputKey` values from transitions, matched exactly and case-sensitively; a record with an unknown key fails with *Table &lt;key&gt; unknown to coalescer!*. Use `"DEFAULT"` for single-table pipelines.

Behaviors to know:

- **Acknowledgement comes before the database commit:** a message counts as done when its rows are buffered (and flushed to the backing file).
- **Values must be strings.** A typed value (number, boolean, binary) fails the message. Use `ChangeSetCoalescingPipelineCommitter` for typed or binary data.
- **Duplicate field names:** when a record has two fields with the same name, the **first** value is kept.
- Column names are cleaned: characters other than letters and digits become `_` (so `a.b` and `a_b` collide).
- A point column `XY` is added automatically when columns named like `lat`/`latitude` and `lng`/`lon`/`long`/`longitude` exist and there is no `XY` column.
- A flush in which one column holds mixed geometry types is split into `{table}Point`, `{table}Line` and `{table}Poly` tables (see `ForceSplitWKT` and `MultiGeoTable` in ExtendedConfigJson).
- All tables in a flush share one transaction, so one table's error fails them all.
- Ramps that use the same well-known pipeline share one backing folder, and a starting ramp replays everything in it.

#### MLImportOptions - Table Config Properties

Each entry in `ImportTables` is an `MLImportOptions` object, used by the three table committers (`CoalescingPipelineCommitter`, `ChangeSetCoalescingPipelineCommitter`, `FixedSchemaBatchCommitter`). Here are all available properties:

| Property | Type | Default | Description |
| ---------- | ------ | --------- | ------------- |
| `Account` | string | required | Target account code. `{scope:name}` context placeholders work in the two coalescing committers (resolved per message, then cleaned to letters, digits, `_` and `-`). A `{{ACCOUNT}}` pipeline parameter also works, since parameters are substituted into the whole pipeline JSON first |
| `Table` | string | required | Target table name. Same placeholder rules as `Account` |
| `Append` | bool | false | `true`: create the table if needed, then append (or upsert when there is a primary key). `false`: **create a new table version holding only this commit's rows, on every commit** (every flush, message or batch). Leave it `false` only for snapshot feeds |
| `Delete` | bool | false | Delete existing rows whose primary key matches the incoming rows. Needs `PrimaryKeyColumns` and an existing table. Overrides `Append` |
| `PrimaryKeyColumns` | string[] | null | Column(s) forming the primary key for upsert/delete/dedup behavior (see below). Use the stored (cleaned) column names |
| `Visibility` | enum | `Private` | Table visibility: `Private`, `PublicUnlisted`, `Public` (see [MLTableVisibility](#mltablevisibility)). Applied only when the commit creates the table |
| `Partition` | object | null | Partitioning config with retention (see [MLPartitionInfo](#mlpartitioninfo)). Overrides a `Partition` in ExtendedConfigJson |
| `SchemaDirectives` | array | null | Per-column type overrides (see [SchemaDirectives](#schemadirectives---column-type-coercion)). Any value, even `[]`, replaces the schema settings from ExtendedConfigJson (including `ExplicitColumnTypes`) |
| `TableTags` | array | null | Tags written to the table on every commit (see [MLImportTableTag](#mlimporttabletag)). Not supported by `FixedSchemaBatchCommitter` |
| `ExtendedConfigJson` | string | null | JSON **string** of `FileImportOptions` for advanced import settings (see below). Wins over `ExtendedConfig` |
| `ExtendedConfig` | object | null | The same options as a JSON **object**. The Options editor lists only ten properties, but any ExtendedConfigJson option is accepted |
| `WaitTimeoutMS` | int | 0 | Not used by the DataStream committers, and it overwrites any `WaitTimeoutMS` in ExtendedConfigJson |
| `FileTypeHandler`, `ImportItems` | | null | Not used by the DataStream committers |

#### Primary Key and Deduplication Behavior

When `PrimaryKeyColumns` is set, the import engine checks incoming rows against existing rows in the table. The behavior depends on additional flags:

| Configuration | When PK already exists | When PK is new | Use case |
| -------------- | ---------------------- | ---------------- | ---------- |
| `Append: true` (no PK) | N/A - no PK checking | Always inserts | Simple append, duplicates allowed |
| `Append: true` + `PrimaryKeyColumns` | **Replaces** the existing row (upsert) | Inserts | Default upsert - always keep latest |
| `Append: true` + `PrimaryKeyColumns` + `InsertOnly: true` | **Silently discards** the incoming row | Inserts | Skip duplicates - only insert new PKs |
| `Append: true` + `PrimaryKeyColumns` + `UpdateOnly: true` | Updates the existing row | **Discards** the new row | Only update existing rows, never insert new |
| `Delete: true` + `PrimaryKeyColumns` | **Deletes** the existing row | Nothing | Remove rows by key |
| `Append: false` | The table is replaced by a new version holding only the commit's rows | | Snapshot feeds only |

- Within one batch, the last row with a given key wins.
- **Primary keys are sticky** on default server settings: once a table is created with a key, every later write must supply the same key columns or it fails.
- **New columns** are added, with nulls for existing rows (rejected under `Strict`). Missing columns are filled with nulls unless `RequireAllColumns` is set.
- **Type changes:** a narrower value is stored in the existing type (an integer into a String or Double column), and a wider one widens the column. Any other change, such as text arriving for a DateTime column, keeps the old type and **stores null for that batch's values, with no error**. Pin types with `ExplicitColumnTypes` when a feed can be sparse.
- **Type detection** (`CoalescingPipelineCommitter`) looks at each flush's text values in the order Int32, Int64, Double, DateTime, Guid, WKT geometry, String. `,`, `$` and `%` are stripped from numbers, and a column that is empty throughout the flush becomes String.

**Example - Upsert (default PK behavior):**

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "myaccount",
        "Table": "tasks",
        "Append": true,
        "PrimaryKeyColumns": ["task_id"]
    }
}
```

If a row with `task_id = "ABC-123"` already exists, it is **replaced** with the incoming row.

**Example - Insert-only (skip if PK exists):**

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "myaccount",
        "Table": "tasks",
        "Append": true,
        "PrimaryKeyColumns": ["task_id"],
        "ExtendedConfigJson": "{\"InsertOnly\": true}"
    }
}
```

If a row with `task_id = "ABC-123"` already exists, the incoming row is **silently discarded**. Only rows with new PKs are inserted.

**Example - Composite primary key:**

```json
"PrimaryKeyColumns": ["source_system", "record_id"]
```

Multiple columns can form the PK. A row is considered a duplicate only if **all** PK columns match.

#### ExtendedConfigJson - Advanced Import Options

JSON string deserialized into `FileImportOptions` (MapLarge's file-import options, about 150 properties) at commit time. Most of those properties only matter to file imports. These are the ones the DataStream committers actually use:

| Property | Committers | Effect |
| ---------- | ------------ | -------- |
| `InsertOnly` | all | With a primary key, discard incoming rows whose key already exists |
| `UpdateOnly` | all | With a primary key, discard incoming rows whose key does not exist yet |
| `SchemaStrictness` | all | `Permissive` (default), `StrictByColumnAllowNewColumns`, `StrictAllowNewColumns`, `Strict`. The stricter of this and the table's stored level applies |
| `RequireAllColumns` | all | Fail when a batch lacks a column the table has |
| `UniqueConstraints` | all | Column sets that must be unique, e.g. `[["a","b"]]` |
| `PkUpdateConstraints` | all | Replace an existing row only when a test passes (for example the incoming timestamp is newer) |
| `EnablePerRowOperations` | all | With a primary key and an Int32 `_ml_row_operation` column: per-row upsert or delete |
| `Indexes`, `Constraints`, `SuppressIndexDetectionOnImport` | all | Create indexes; a `NotNull` constraint; skip index carry-over |
| `Ephemeral` | all | Apply the change locally instead of through cluster consensus |
| `Partition` | all | Raw partition tag; used only when `ImportTables.Partition` is not set |
| `ExplicitColumnTypes` | Coalescing | Column → type (`XY`, `Poly`, `Line`, `Multipoint`, `Int32`, `Int64`, `Double`, `String`, `DateTime`, `Guid`, `Json`). Can force geometry types |
| `CoerceColumnsToStrictSchema` | Coalescing | With a strict level, force existing column types on new data |
| `ForceSplitWKT`, `MultiGeoTable` | Coalescing | Always split geometry into per-type tables; or keep one table with one geometry column per type |
| `SplitAtDateLine`, `HoleMode`/`HoleModeStr`, `CentroidMode` | Coalescing | Geometry handling |
| `IgnorePartitioning` | ChangeSet; Coalescing on its in-memory path | Skip partitioning |

**Not used by any DataStream committer** (they only affect file imports): `AddTimestamp`, `AddSourceFileColumn`, `PrimaryKeyAppend`, `SwapCoordinates`, `SimplifyColumnNames`, `ReplicationFactor`, `WaitForFullReplication`, `ForceGeocode`, and every parsing option (JSON/XML/CSV roots, headers, delimiters). For a capture time, use `ExtendRecordTransform` with `AddTimestamp: true`, which appends `_ml_capture_timestamp` to each record.

`IgnoreColsWithNoDirective` and `DoNotImport` directives make the flush fail rather than dropping columns. Drop columns with `FieldNameTransform.ExcludeFields` instead.

**Example - Insert-only with a pinned date type:**

```json
"ExtendedConfigJson": "{\"InsertOnly\": true, \"ExplicitColumnTypes\": {\"reading_time\": \"DateTime\"}}"
```

**`ExtendedConfigJson` vs `ExtendedConfig`:** `ExtendedConfigJson` is a **string** containing escaped JSON. The sibling `ExtendedConfig` takes the same options as a plain JSON object - `"ExtendedConfig": { "InsertOnly": true }` - and is easier to read and edit. When both are set, `ExtendedConfigJson` wins.

#### MLPartitionInfo

Set via `Partition` property on `MLImportOptions`:

| Property | Type | Default | Description |
| ---------- | ------ | --------- | ------------- |
| `PartitionColumns` | string[] | null | Each entry is `column[:method[:args]]`. Methods: none (one partition per distinct value), `hour`, `day`, `week`, `month`, `year` (date columns), `hash[:N]` (default 10), `digest`, `first1`, `s2_poly[:level]` (shapes), `bbox:size` (points). E.g. `"date:week"`, `"timestamp:day"`. A misspelled method on a date column silently makes one partition per distinct timestamp. At most 250 partitions can be written at once |
| `RetentionTime` | TimeSpan string | `"00:00:00"` (never) | Drop partitions that ended more than this long ago (e.g., `"30.00:00:00"` = 30 days). Only `:hour`, `:day` and `:week` partitions are purged |
| `ExpireFromEnd` | bool | false | Measure the retention back from the end of the **newest** partition instead of from now. The oldest partitions are still the ones removed |
| `DefaultPartitionCount` | int? | null | Queries that don't filter on the first partition column read only this many partitions. It does **not** create partitions |
| `DefaultPartitionAscending` | bool | false | Read those default partitions oldest first instead of newest first |

The property names must be spelled as above (case doesn't matter): an unknown name such as `partitionCols` is silently ignored, leaving the table unpartitioned. TimeSpan values are strings in `d.hh:mm:ss` form. The Options editor shows them as objects (Ticks, Days, …), but that form fails to load, and a bare number such as `"5"` means five days.

**Example - Time-partitioned table with 90-day retention:**

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "analytics",
        "Table": "sensor_readings",
        "Append": true,
        "Partition": {
            "PartitionColumns": ["timestamp:day"],
            "RetentionTime": "90.00:00:00",
            "ExpireFromEnd": false
        }
    }
}
```

**Example - Weekly partitions (no expiration):**

```json
"Partition": {
    "PartitionColumns": ["event_date:week"]
}
```

#### SchemaDirectives - Column Type Coercion

Force column types at commit time. **SchemaDirectives cannot rename columns** (see `DestColumn` below). Each directive is an `MLDirectiveInfo`:

| Property | Type | Description |
| ---------- | ------ | ------------- |
| `SrcColumn` | string | Column the directive applies to (case-insensitive, after column-name cleanup) |
| `DestType` | MLColumnType | Force this type. Works in `CoalescingPipelineCommitter` only, and only for `Int32`, `Int64`, `Double`, `String`, `DateTime`, `Guid`, `Json`, `Line` and `Multipoint`. `Point`, `Shape` and `Imagery` have **no effect**; use `ExplicitColumnTypes` (`XY`, `Poly`) in ExtendedConfigJson for geometry |
| `DestColumn` | string | **Not applied.** Committers don't rename columns; use `FieldNameTransform` |
| `Directive` | enum | `Remap`. `Constant` has no effect in DataStream committers |
| `ColValue` | string | Not used |

**Example - Retype columns at commit:**

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "analytics",
        "Table": "events",
        "Append": true,
        "SchemaDirectives": [
            { "SrcColumn": "evt_timestamp", "DestType": "DateTime", "Directive": "Remap" },
            { "SrcColumn": "record_count", "DestType": "Int64", "Directive": "Remap" }
        ]
    }
}
```

Remember that setting `SchemaDirectives` at all (even `[]`) replaces the schema settings from ExtendedConfigJson, including `ExplicitColumnTypes`. To force a geometry type as well, put every type in `ExplicitColumnTypes` instead.

**Renames:** use `FieldNameTransform` before the committer. It's the only way to rename a column in a pipeline, and the new names are visible to downstream steps (ExpressionTransform, SkipRecordTransform, etc.).

#### MLColumnType - Supported Column Types

These are the values the `DestType` enum accepts, representing the column types supported by the MapLarge database. In DataStream schema directives only `Int32`, `Int64`, `Double`, `String`, `DateTime`, `Guid`, `Json`, `Line` and `Multipoint` take effect (see above):

| Type | Description |
| ------ | ------------- |
| `Unknown` | Internal default (value 0) - do not specify in config; listed for completeness |
| `Int32` | 32-bit integer |
| `Int64` | 64-bit integer |
| `Double` | 64-bit floating point |
| `String` | Text string |
| `DateTime` | Date and time (stored as DateTimeOffset) |
| `Guid` | UUID/GUID |
| `Point` | Geographic point (lat/lng) |
| `Line` | Geographic line (polyline) |
| `Shape` | Geographic polygon/multipolygon |
| `Multipoint` | Multiple geographic points |
| `Raster` | Raster/grid data |
| `Imagery` | Image data |
| `Binary` | Raw binary data |
| `Json` | JSON document |
| `Graph` | Graph/network data |
| `NERF` | Neural radiance field |
| `Recurrence` | Recurrence pattern |
| `Media` | Media content |

#### MLTableVisibility

Controls who can see the imported table. Applied only when the commit creates the table:

| Value | Description |
| ------- | ------------- |
| `Private` | Only visible to the owning user (default - enum value 0, no explicit initializer on `MLImportOptions.Visibility`) |
| `PublicUnlisted` | Accessible but not shown in table listings |
| `Public` | Visible to all users with account access |

#### MLImportTableTag

Tags are key-value metadata pairs written to the table on every commit. Useful for categorization, filtering, and automation. Not supported by `FixedSchemaBatchCommitter`.

| Property | Type | Description |
| ---------- | ------ | ------------- |
| `Key` | string | Tag key (e.g., `"source"`, `"environment"`, `"pipeline"`) |
| `Value` | string | Tag value (e.g., `"kafka-feed"`, `"production"`, `"geo-enrichment"`) |
| `Resource` | string | Ignored |

**Example:**

```json
"TableTags": [
    { "Key": "source", "Value": "nats-feed" },
    { "Key": "environment", "Value": "production" },
    { "Key": "data_classification", "Value": "UNCLASSIFIED" }
]
```

### Multiple Tables from One Committer

```json
"ImportTables": {
    "EVENTS":   { "Account": "test", "Table": "gdelt_events",   "Append": true },
    "MENTIONS": { "Account": "test", "Table": "gdelt_mentions", "Append": true }
}
```

### InvokeRampCommitter - Forward Records to Another Pipeline

Forwards records to a different ramp instead of writing to a table. Use for pipeline chaining.

```json
"Options": {
    "RampName": "secondary-enrichment-pipeline"
}
```

- **`RampName`** - Name of the target ramp to invoke: exact, case-sensitive, unique across on-ramps and off-ramps. Used only when `RampId` is empty
- **`RampId`** - ID of the target ramp to invoke. Wins over `RampName` whenever set
- Set one of them; with neither, the ramp won't start

The invoking message's context reaches the target ramp as one object under `Ramp:InvokingRampContext`. Internally calls `ProcessPushedRecordAsync` **per record**, awaiting each push. Requirements:

- Target connector must implement `IMLAcceptsPushedRecords`; otherwise throws `"connector does not support dynamic invocation."` In core that is only `HttpPollingConnector`, `ArcGISRestConnector`, `WfsConnector` and `FileSystemConnector`
- Target ramp must be **running** (won't start automatically), **on the same server node**
- The target connector needs `PushedRecordIsConfig: true` or a `PushedDataMapping` (which maps record fields to connector config, e.g., URL → `EndPoint`); otherwise every push fails. `RunInAcceptingMode: true` stops it polling on its own
- Records already pushed are not undone if a later push fails

#### Pattern: Conditionally Invoke Another Ramp Based on Record Field Values

Use **broadcasting** (transitions without guards) + **SkipRecordTransform** to filter, then `InvokeRampCommitter` for the subset. Avoids `TransitionGuard` limitations (message context only, throws on missing/empty properties).

```text
Parser → Transforms → [broadcast to both paths]
                         ├→ CommitAll (saves all 300K records)
                         └→ FilterEnterprise (SkipRecordTransform drops non-enterprise)
                              → InvokeRampCommitter → Ramp 2 (fetches enterprise URLs)
```

**Ramp 1 Pipeline (main ingest):**

```json
{
    "NumberOfWorkers": 10,
    "Steps": [
        {
            "StepName": "Parse",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "JsonPipelineParser",
            "Options": { "RecordRootPath": "$.records[*]" },
            "Transitions": [{ "ToStep": "SetRoutingFlag" }]
        },
        {
            "StepName": "SetRoutingFlag",
            "Type": "RecordTransform",
            "Application": "MapLargeCore",
            "PluginName": "ExpressionTransform",
            "Options": {
                "Expressions": {
                    "has_enterprise": "IsNotEmpty(enterprise) ? 'yes' : 'no'"
                },
                "TreatMissingFieldsAsEmpty": true
            },
            "Transitions": [
                { "ToStep": "CommitAll" },
                { "ToStep": "FilterEnterprise" }
            ]
        },
        {
            "StepName": "CommitAll",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "ImportTables": {
                    "DEFAULT": {
                        "Account": "myaccount",
                        "Table": "all_tasks",
                        "Append": true,
                        "PrimaryKeyColumns": ["task_id"]
                    }
                }
            }
        },
        {
            "StepName": "FilterEnterprise",
            "Type": "RecordTransform",
            "Application": "MapLargeCore",
            "PluginName": "SkipRecordTransform",
            "Options": {
                "SkipWhen": [
                    { "FieldName": "has_enterprise", "Condition": "Equals", "Value": "no" }
                ]
            },
            "Transitions": [{ "ToStep": "SendToEnterprise" }]
        },
        {
            "StepName": "SendToEnterprise",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "InvokeRampCommitter",
            "Options": {
                "RampName": "enterprise-detail-fetcher"
            }
        }
    ]
}
```

**Ramp 2 Connector Config (enterprise detail fetcher - HttpPollingConnector in accepting mode):**

```json
{
    "EndPoint": "https://placeholder-required.example.com",
    "RunInAcceptingMode": true,
    "PushedDataMapping": [
        {
            "Source": { "Type": "Record", "FieldName": "enterprise_url" },
            "Destination": { "Type": "Config", "ConfigProperty": "EndPoint" }
        }
    ]
}
```

**Key points:**

- Broadcasting sends data to ALL targets (both `CommitAll` and `FilterEnterprise` receive every record). The two committers run one after another for each message, with no transaction spanning them
- `TreatMissingFieldsAsEmpty` keeps a record without an `enterprise` field from failing the whole message (it evaluates as `'no'`)
- `SkipRecordTransform` filters per-record (vs `TransitionGuard` which is per-message)
- `PushedDataMapping` maps record fields to connector config (e.g., URL → `EndPoint`)
- Ramp 2 must be running before Ramp 1; `EndPoint` placeholder required even in accepting mode
- Each record = one fetch (1,000 matching records = 1,000 HTTP requests)

#### TransitionGuard vs SkipRecordTransform for Conditional Routing

| Mechanism | Operates On | Best For | Limitation |
| ----------- | ------------ | ---------- | ------------ |
| `TransitionGuard` | Message context (set before/during parsing) | Routing different message types (e.g., Kafka topic routing) | A missing or empty context property fails the message |
| `SkipRecordTransform` | Record field values | Filtering records within a single message | Only drops records - cannot route to different paths by itself |
| **Broadcasting + SkipRecordTransform** | Record field values | Conditional per-record routing to different committers | Requires duplicate processing (all records flow through both paths initially) |

### DMLStatementCommitter - Execute SQL Statements Per Record

Executes one MapLarge SQL statement per record (UPDATE, DELETE or INSERT against existing tables) with field value substitution.

```json
"Options": {
    "StatementTemplate": "INSERT INTO myaccount.sensor_readings (sensor_id, reading, source) VALUES ('{field:sensor_id}', {field:reading}, '{streaming_msg:topic}');"
}
```

- **`StatementTemplate`** - One DML statement with placeholders:
  - `{field:columnName}` - substitutes a value from the record
  - `{scope:varName}` - substitutes a value from the message context (here a value an earlier step promoted)
- **Tables are written `account.table`.** `account/table` fails with *SQL Syntax Error: '/'* (verified for INSERT and DELETE)
- Values are inserted as raw text, so quote strings yourself (`'{field:id}'`). **Nothing is escaped:** a value containing `'` breaks the statement, and record data can change the SQL. Use only with trusted data
- A missing field fails with *Could not find message field X*; a missing context value with *Could not find context property*. Either fails every message in the batch
- Null record values become empty text. Dates from `{field:}` are ISO 8601; dates from context are not
- A trailing semicolon is added if missing. A template that produces more than one statement commits and then fails the message
- Statements from all messages queued at the same moment run as one atomic batch; each message waits for its batch. Runs as the ramp's effective user

### ChangeSetCoalescingPipelineCommitter - Atomic Commits with Blob Support

For binary blob columns (Binary, Raster, Image, NERF, Vector, Media). Atomic synchronous commits. Supports per-message append/delete switching via context property.

```json
"Options": {
    "MaxInstructionsPerChangeSet": -1,
    "ImportTables": {
        "DEFAULT": {
            "Account": "imagery",
            "Table": "satellite_tiles",
            "Append": true,
            "AppendOrDeleteContextProperty": "streaming_msg:operation"
        }
    }
}
```

- **`MaxInstructionsPerChangeSet`** - If > 0, commits early once a change set holds this many instructions (default: `-1` = no limit). It only splits multi-table messages; change sets never span messages
- **`AppendOrDeleteContextProperty`** - Chooses the operation per message from a context value: a `{scope:name}` template, a bare `scope:name` (as above), or a literal. Values (case-insensitive): `"append"`, `"update"`, `"upsert"` (all mean upsert) or `"delete"`. Anything else fails the message
- If a typed schema is present in the message context under `schema:<ImportTables key>` (set by plugin code), uses exact typed columns. Otherwise text values are type-detected and other values mapped by their .NET type; a null value, a boolean or a `DateTime` value fails the message
- All of the message's rows, across its tables, are committed before the step finishes
- Keys in `ImportTables` must be valid MapLarge names (letters, digits, `_`, `-`)
- Ignores `SchemaDirectives`, `ExplicitColumnTypes`, `ForceSplitWKT`, `MultiGeoTable` and `SplitAtDateLine`

### FixedSchemaBatchCommitter - Pre-Defined Schema Batch Commits

A batching committer that requires a pre-defined schema in the message context (`schema:<key>` for every `ImportTables` key, on every message). It acknowledges messages before committing in the background, so it requires the upstream connector to re-send anything lost (`Ramp:missingMessagesWillBeResent` must be `true`). In core, only `S3Connector` (with a process-log filter whose `AutoAppendToTable` is false) sets that flag, and only plugin code supplies `schema:*` - this committer is mainly for extension authors.

```json
"Options": {
    "MaxMessagesPerChangeSet": 5,
    "ImportTables": {
        "DEFAULT": { "Account": "data", "Table": "fixed_table", "Append": true }
    }
}
```

- **`MaxMessagesPerChangeSet`** - Batch size: **messages** accumulated before commit (default: `5`)
- **`MaxTimeBeforeFlush`** - When the queue is idle, commit an open batch this long after the last commit (default: `"00:05:00"`). Write TimeSpans as `"hh:mm:ss"` strings; a bare `"5"` means 5 days
- **`QueueFullWaitDelay`** - How long to wait between retries while 100 messages are queued (default: `"00:00:05"`)
- **`QueueEmptyWaitDelay`** - Poll interval while the queue is empty (default: `"00:00:01"`)
- `Account` and `Table` are used as written (no placeholders); `TableTags`, `SchemaDirectives`, `RetentionTime` and `DefaultPartitionCount` are ignored
- Any background error faults the ramp. Rows not yet committed when the ramp stops are discarded

### FileImportPipelineCommitter - File-Based Import (Stream Committer)

Writes stream to temp file, imports via `ImportManager`. Supports ZIP auto-detection, context substitution for table/account names, and schema directives.

```json
"Options": {
    "Account": "analytics",
    "Table": "imported_data",
    "Append": false,
    "ExtendedConfig": "{connector:importOptions}"
}
```

- **`Account`** / **`Table`** (required) - Target table. Both are resolved as templates (`{scope:name}` placeholders, a bare `scope:name`, or a literal). In `Table`, characters other than letters, digits, `_` and `-` become `_`
- **`TableVisibility`** - `Private` (default), `PublicUnlisted` or `Public` (case-sensitive; anything else becomes Private). Ignored for archives
- **`Append`** - Archives only: `false` (default) creates the table, `true` appends. **Plain files always append**
- **`PrimaryKeyColumns`** - Primary key passed to the import
- **`FileImportOptions`** - Full import options object (schema directives, column types, etc.). Required unless `ExtendedConfig` resolves; use `{}` for defaults. Constant-value schema directives can take `{scope:name}` placeholders
- **`ExtendedConfig`** - JSON string, or a `{scope:property}` reference to context holding that JSON. When it resolves it **replaces** `FileImportOptions`. A one-property JSON such as `{"SkipHeaderRows":1}` looks like a reference and is ignored
- **`FileNameProperty`** / **`FileExtProperty`** / **`ContentTypeProperty`** - Template values for file naming. `FileNameProperty` is ignored if it contains `< > : " / \ | ? * %`; `FileExtProperty` is appended as written, so include the dot (`.csv`)
- **`MetaDataMessageProperty`** - Bare `scope:name` of a context list of field names; matching empty constant-value directives are filled from context
- File naming, later steps winning: `data` → S3 key (`S3Connector:Key`) → SFTP file name → `FileNameProperty`; then `FileExtProperty` is appended; if there is still no extension, one comes from `ContentTypeProperty` (`application/octet-stream` maps to `.zip`) or `.bin`, which no importer handles
- Errors on individual files inside an archive are logged, not reported; the step still succeeds. Never calls TransactionNotifiers

This is a **StreamCommitter** (step type `StreamCommitter`), not a record-based committer.

### Event Bus Committers

Two variants for publishing to MapLarge's Event Bus (live layers / VFB):

**`PublishToEventBusCommitter`** (stream-based) - Reads the raw stream as a JSON string and publishes it as one event. The body should be valid JSON, since filtering subscribers parse it. Fire-and-forget: the publish is not awaited.

**`PublishRecordToEventBusCommitter`** (record-based) - Publishes each record as a flat JSON event. Numbers in text form are published as JSON numbers (`"00123"` becomes `123`) and booleans as JSON booleans. Automatically synthesizes a WKT `POINT(lng lat)` `XY` field if `Latitude`/`Longitude` columns exist but no `XY` column. A null field value fails the message. Preferred when you need geo synthesis or replacement key logic.

Both use the same config structure:

```json
"Options": {
    "Destinations": {
        "DEFAULT": {
            "Account": "live",
            "Table": "events_layer",
            "Replace": true,
            "EventLifetimeSec": 300,
            "PrimaryKeyColumns": ["event_id"]
        }
    }
}
```

- **`Destinations`** keys are matched against each record's `TargetInputKey`; an unknown key fails with *Destination … unknown*
- **`Account`** / **`Table`** - `Table` is the publisher name subscribers listen to; subscribers need query permission on `Account/Table`
- **`Replace`** - `true`: a newer undelivered event with the same key replaces the older one in each subscriber's queue. `false` (default): events queue in order and expire. In the stream committer, which has no key, `true` makes each event replace the previous undelivered one for that publisher
- **`EventLifetimeSec`** - Seconds until an undelivered event expires (only when `Replace` is false). **`0` or less - including the default `-1` - uses the server default of 5 seconds**; there is no "never expire" value
- **`PrimaryKeyColumns`** - Fields whose values (joined with no separator) form the replacement key. Record committer only

### Other Committers

| Plugin | Type | Purpose |
| -------- | ------ | --------- |
| `PublishToMessageBusCommitter` | StreamCommitter | Publishes raw stream bytes (not the context) to an internal message box (a partitioned `Account/BoxName` table read by internal consumers). Config: `ProducerName`, `Destinations` dict of `{Account, BoxName}`. The box must already exist when the ramp starts; no API creates one. For internal server-to-server pub/sub |
| `StreamCommitingRowDeleter` | StreamCommitter | Deletes one row per message from an existing table by primary key, taken from the context property `Scope:PkPath` (a string, or an array holding one row's composite key). Config: `Account`, `Table`, `PrimaryKeyColumns[]` (empty uses the table's own key), `Scope`, `PkPath`; `OperationPath` is not read, so every message deletes. **Run it with `NumberOfWorkers: 1`**: the key is kept in a field shared by all workers, so with more workers a message can delete another message's row. For CDC (change-data-capture) delete propagation |
| `VFSCommitter` | Record | Registers one pointer entry per record in MapLarge's Virtual File System (a path plus tags, not file content). Config: `PathColumnName` (paths ending in a separator are skipped), `AccountColumnName` - a context reference written `scope::name` with a **double colon**, not a column (empty or malformed means account `unknown`), and `ContextItemsForTags` (sensitive values are included, so don't list secrets). Path segments may contain only letters, digits, spaces and `.-_~!@#$%^&()+=[]{};` - any other character (including `:`, `,`, `?`) fails the whole message. For S3/blob storage listing pipelines |

---

## TransactionNotifier Plugins

Post-commit steps (`"Type": "TransactionNotifier"`). They run inside a record `Committer` after it has written a batch (the committer waits for them), and are the only step type allowed to follow one. The engine also accepts a transition from a `StreamCommitter` to a notifier, but stream committers never call notifiers, so it has no effect.

| Plugin | Purpose |
| ------ | ------- |
| `DefaultChannelTransactionNotifier` | Sends the commit details (transaction number, time, status, affected tables) to the `Default` message channel of one Alert/Trigger workflow, without requiring a database trigger to be defined. Config: `WorkflowId` - the GUID of a loaded workflow that has a `Default` channel. Not a GUID: an error is logged on every commit; no matching workflow: nothing happens. Errors are logged and don't fail the message |
| `SimpleTransactionNotifier` | **Test stub** - "Simple implementation to test notifications". Delays 100 ms and stores the `MLTransactionInfo` on a property for assertions. Empty config. Not for production use |

Attach a notifier with a transition on the committer step that leaves out `SourceOutputKey` (or sets it to `DEFAULT`) and has no guard, as below. A notifier transition with another output key, or a guard that doesn't match, makes the commit step fail **before anything is written**. Only the first matching notifier transition is used. The Pipeline tab's tree editor can't assign the TransactionNotifier type, so add notifier steps with **Show JSON**.

```json
{
    "StepName": "Notify",
    "Type": "TransactionNotifier",
    "Application": "MapLargeCore",
    "PluginName": "DefaultChannelTransactionNotifier",
    "Options": { "WorkflowId": "<workflow id>" }
}
```

---

## Export Pipeline Components

Pattern: **RecordObserver → RecordTransform* → Serializer → StreamTransform* → ExportConnector**. Record transforms are the same as import. The Pipeline tab's tree editor only knows the import rules, so wire off-ramp transitions with **Show JSON**. The off-ramp editor lists only on-ramp pipelines, so an off-ramp's pipeline has to be ad hoc.

### Serializers (`"Type": "Serializer"`)

| PluginName | Config | Purpose |
| ------------ | -------- | --------- |
| `JsonRecordSerializer` | (none) | Serializes all pushed record lists to compact JSON: `{"<key>":[{"Fields":[{"Name":"ID","Value":1},…]},…]}`. Non-ASCII and HTML characters are escaped as `\uXXXX`; dates are ISO 8601 |
| `DelimitedTextSerializer` | (none) | Produces CSV: a header row from the first record's field names, then one line per record. Exactly one record list (more fails with *Only a single record list is supported*). The `Delimiter` option shown in the editor is **not used** - output is always comma-separated. Later records are written in their own field order, without aligning to the header, and a null field value fails the message |
| `TemplatingSerializer` | `Template` or `WellKnownTemplate` | Renders records against a Handlebars template for arbitrary output formats (JSON, XML, CoT, text, etc.). `Template` = inline string (`\n` and `\t` become a newline and a tab; `""` becomes `"`), `WellKnownTemplate` = server-stored resource ID/name, re-read for every message. Exactly one must be set (both: the ramp won't start; neither: every message fails). Each record list is an array named by its key: `{{#each OffRampAction}}{{{ID}}}{{/each}}`; `context.<name>` holds the invocation parameters. `{{x}}` HTML-escapes its output, so use `{{{x}}}` for raw values. Custom helpers: `{{#isMatch a b}}…{{/isMatch}}`, `{{#propertyValues obj "col1,col2" 2}}{{/propertyValues}}`. **Prefer `WellKnownTemplate`**: a `{{wkr …}}` reference anywhere in the pipeline runs the whole definition through Handlebars at ramp start, which mangles inline templates, and `{{NAME}}` parameter substitution also touches them |

Two export connectors fed directly from one serializer share a single stream, and the first one closes it. To fan out, put a stream transform such as `PassThroughStreamTransform` in between, so each branch gets its own copy.

### Observers (`"Type": "RecordObserver"`)

| PluginName | Purpose |
| ---------- | ------- |
| `PushedRecordObserver` | The first step of every off-ramp pipeline, and the off-ramp's "connector". It does **not** watch tables or table changes: it passes on records pushed to the off-ramp, either by an Alert/Trigger workflow's **OffRamp** action (records arrive under the key `OffRampAction`) or by the `datastream/testofframp` API. Both require the off-ramp to be running. Writes `Ramp:RecordCount`. No config; it must have a transition |

### Export Connectors (`"Type": "ExportConnector"`)

Credentials in these options are stored as clear text, so pass them in as pipeline parameters where you can.

| PluginName | Purpose |
| ------------ | --------- |
| `FileSystemExportConnector` | Write each message to the file at `Path`. The file is **overwritten by every message**, the folder must exist, and each node writes its own local file |
| `HttpExportConnector` | **POST** each message to `EndPoint` (POST only, no Content-Type header). `AuthenticationType`: `None`, `ApiKeyInHeaders`, `ApiKeyInUrl` (appends `name=value`, not URL-encoded), `Basic`. HTTP error responses (4xx/5xx) never fail the message - they're only reported as warnings - and `IgnoreErrors` (default `true`) also swallows network failures after one retry, which can't resend the body |
| `NATSExportConnector` | Publish each message to `Subject` on `Endpoint` (`CredentialsPath`, `SecureConnection` optional). Opens a new connection for every message |
| `SNSExportConnector` | Publish each message as text to `TopicArn`, using `AccessKey`/`SecretKey` (no fallback to the server's default credentials). `MessageGroupId` is **never sent**, so FIFO topics don't work |

`RecordAccumulator` is also accepted as a step type, but no plugin exists and such a step is silently ignored.

---

## Transitions and Conditional Routing

### Basic Transition

```json
"Transitions": [{ "ToStep": "NextStep" }]
```

### With Input/Output Keys

```json
"Transitions": [
    {
        "SourceOutputKey": "EVENTS",
        "TargetInputKey": "EVENTS",
        "ToStep": "CommitAll"
    },
    {
        "SourceOutputKey": "MENTIONS",
        "TargetInputKey": "MENTIONS",
        "ToStep": "CommitAll"
    }
]
```

> **CRITICAL: Transition key values are CASE-SENSITIVE.** The `SourceOutputKey` and `TargetInputKey` values are matched using ordinal (case-sensitive) string comparison - both in the pipeline's `OutputHandlers` dictionary and in the committer's `ImportTables` dictionary (`StringComparer.Ordinal`). The `TargetInputKey` value must **exactly match** the corresponding key in the committer's `ImportTables` dictionary. For example, if `ImportTables` has a key `"DEFAULT"`, the transition must use `"TargetInputKey": "DEFAULT"` - not `"default"`, `"Default"`, or any other casing. A case mismatch causes a `DataStreamException: Table <key> unknown to coalescer!` at runtime, which silently kills the message processing. In cursor pagination scenarios, this manifests as **only fetching 1 page** because the pipeline failure prevents the connector from reading the cursor value.
>
> When `SourceOutputKey` or `TargetInputKey` is **omitted or null**, the engine defaults to `MLDataStreamConstants.DEFAULT_TRANSITION` which is `"DEFAULT"` (all caps). However, if you explicitly set the value to `"default"` (lowercase), the null-coalescing fallback does NOT apply - the lowercase value is used as-is.

### Conditional Routing with TransitionGuard

Route different record types to different steps based on message context:

```json
"Transitions": [
    {
        "ToStep": "CommitTypeA",
        "TransitionGuard": {
            "ContextScope": "streaming_msg",
            "ContextProperty": "record_type",
            "CompareTo": "TypeA"
        }
    },
    {
        "ToStep": "CommitTypeB",
        "TransitionGuard": {
            "ContextScope": "streaming_msg",
            "ContextProperty": "record_type",
            "NotEqualTo": "TypeA"
        }
    }
]
```

**TransitionGuard properties:** `ContextScope`, `ContextProperty` (case-sensitive), `CompareTo` (exact, case-insensitive), `NotEqualTo` (case-insensitive), `Contains` (case-insensitive), `ContextMask` (instead of scope and property: a template with `{scope:name}` references, or a bare `scope:name`). Only the first of `CompareTo`, `NotEqualTo` and `Contains` that is set is used; with none set, the guard never passes.

**Important:** A missing or empty context value fails the message with *Could not find context property matching path scope:property*. Ensure population via `PropertiesToPromote` or connector metadata. Guards test the message context, not record fields - to route records by field values, use broadcasting plus `SkipRecordTransform` (see the InvokeRampCommitter pattern).

**Evaluation and broadcasting:** Unguarded transitions are taken first, then guarded ones, each in the order written. **Every** matching transition is followed, so multiple transitions without guards send data to **all** targets. (A committer's notifier is the exception: only the first match is used.) Fan-out branches get their own copy of a byte stream; branches after a parser share the same records.

**Editor limits:** the Pipeline tab's guard editor offers only scope, property and `CompareTo`, and saving from the tree drops `NotEqualTo`, `Contains` and `ContextMask`. Use Show JSON for those, and avoid going back to the tree afterwards.

**Other rules:** `ToStep` must name an existing step exactly (otherwise *Could not find transition target* stops the ramp). A disallowed type pair stops the ramp with *Transition from X (type) to Y (type) is not allowed*; only the types are checked, so avoid cycles, which hang the worker. Every step with no incoming transition is a start step, and each message is delivered to every start step.

---

## Well-Known vs Ad-Hoc Pipelines

**Ad-Hoc:** Inline with On Ramp, single-use. **Well-Known:** a saved, named definition (the Pipelines tab) that many ramps share; each ramp references it by id, supplies `{{PARAM_NAME}}` values, and runs its own copy:

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "{{TARGET_ACCOUNT}}",
        "Table": "{{TARGET_TABLE}}",
        "Append": true
    }
}
```

`{{NAME}}` parameters are plain text replacement over the whole definition before it is read, so they work in any option, in well-known and ad-hoc pipelines alike:

- **Where values come from:** the ramp's Parameters list (shown for well-known pipelines after Refresh Parameters), the REST `pipelineParameters` map, or a subgraph test's `PipelineParameters`
- **Matching** is exact and case-sensitive. A placeholder with no value stays in the text as written
- **Quoting:** put the placeholder inside a JSON string (`"{{TABLE}}"`); an unquoted placeholder can't be saved. `"{{LIMIT}}"` still works for numeric options, because `"12"` converts to 12
- **No escaping:** a value containing `"` or `\` breaks the JSON and the ramp won't start
- **Lists:** a value written like `["a","b"]` replaces a whole quoted placeholder `"{{COLS}}"` with that array
- **Stored format:** a JSON object of strings (`{"KEY": "value"}`). The older `KEY=VALUE|KEY2=VALUE2` form is still read; pairs whose value contains `=` are dropped
- **No date tokens:** `{now}`, `{today}`, `{now-30d}` work only inside `HttpPollingConnector` settings, not in pipeline parameters

Well-known pipeline behavior:

- Editing a well-known pipeline does not change ramps that are already running; restart them
- If the referenced pipeline is deleted, the ramp silently falls back to its own (usually empty) definition and faults with *No steps included in pipeline!*
- `{{wkr name}}` (or `{{wellKnownResource name}}`) inserts the text of a saved DataStream resource when the ramp starts. When a definition uses one, the whole definition is run through Handlebars, so `{{this}}`, dotted paths and block helpers elsewhere in it are removed or rejected

---

## Message Context System

Scoped key-value metadata store (`IMLMessageContext`) carried with each message, allowing steps to pass data without modifying records.

### IMLMessageContext Interface

| Member | Description |
| -------- | ------------- |
| `IMLSystemContext SystemContext` | Access to the full system context (logger, database, jobs, etc.) |
| `this[string scope, string propertyName]` | Get a context value by scope and property name |
| `SetProperty(scope, propertyName, value, sensitive)` | Set a context value. `sensitive=true` masks the value in logs |
| `GetValues(SensitiveDataHandling)` | Enumerate all context values with optional sensitive data handling |

**Sensitive data handling options** (`SensitiveDataHandling` enum):

- `Mask` - Replace sensitive values with `"*****"` in output
- `Include` - Include sensitive values as-is
- `Omit` - Exclude sensitive values entirely

### How Context Values Are Populated

1. **Connector** - auto-adds source metadata (for example `S3Connector:Key`, Kafka topic and offset). Connection details such as credentials are copied in only when the connector's `CopyConfigToMessage` / `CopyS3ConfigToMessage` option is on
2. **`PropertiesToPromote`** - on `JSONDisassemblerStreamTransform` or parser steps
3. **`ContextVariableStreamTransform`** - derives new values from existing ones
4. **Pipeline handler** - `CreateMessageContext()` creates fresh context per message
5. **The engine** - `Message:MessageId`, `Message:StepName` (during record transforms, the parser step's name), `Ramp:RampId`, `Ramp:TrackingField` / `Ramp:TrackingValue` (see `FieldTrackingTransform`), `Message:RecordCount` (set after parsing, so not visible to the message's own record transforms), and `Ramp:InvokingRampContext` (in a ramp invoked by `InvokeRampCommitter`)

Values are organized as `scope:property` (e.g., `streaming_msg:record_type`). The scope `System` is reserved: writing to it fails.

### Where Context Values Are Used

`TransitionGuard`, `ExtendRecordTransform` (`{scope:name}` in Value), `DMLStatementCommitter` (`{scope:varName}` placeholders), `ContextVariableStreamTransform`, `InvokeRampCommitter` (passes the full context as one object under `Ramp:InvokingRampContext`), `ImportTables` Account/Table in the coalescing committers, and stream transforms. Stream transforms read only the values their options name - `DownloadFromS3Transform` does not look anything up implicitly, so write `"Region": "S3Connector:Region"`.

Plugins don't all resolve context values the same way:

| Rule | Accepted forms | When the value is missing | Used by |
| ------ | ---------------- | --------------------------- | --------- |
| **Template** | `{scope:name}` placeholders inside text (several allowed). With no placeholder, a value containing a colon is read as one bare `scope:name` lookup. Otherwise the value is a literal | Placeholder: empty text. Bare lookup: null | Most options that take context: stream-transform property names, `WebDownloadTransform`, `WaitForTransactionTransform`, `ExtendRecordTransform`, `HttpEncodeTransform`, `GeoFieldNameTransform`, `FileImportPipelineCommitter`, `TransitionGuard.ContextMask`, and Account/Table in the coalescing committers |
| **Reference** | A bare `scope:name` (any value with a colon) or a literal (no colon). No braces | Null | `DownloadFromSFTPTransform` |
| **S3 reference** | A bare `scope:name`; `$messageKey` (= `S3Connector:Key`); `$message:<path>` (a JSONPath into the message body, or a record field in `FetchImageFromS3Transform`); or a literal with no colon. No braces | Empty text | `DownloadFromS3Transform`, `DownloadFromStorageGridTransform`, `FetchImageFromS3Transform` |
| **GCS reference** | As S3 reference, without `$messageKey` | Empty text | `DownloadFromGCSTransform` |
| **Record field** | `{field:Name}` inside text | Resolved as context scope `field` (usually empty) | `ExtendRecordTransform` values, `DMLStatementCommitter` (which fails instead) |
| **Key field** | `field:Name` (no braces); any other value is a literal | The step fails, or uses defaults with `IgnoreErrors` | `TableLookupTransform.KeyFields` |
| **Double-colon reference** | `scope::name` | Account becomes `unknown` or the step fails | `VFSCommitter.AccountColumnName` |

**The colon trap.** Under the template and reference rules, any value that contains a colon but no `{scope:name}` placeholder is treated as a context lookup. A literal URL (`https://…`), a time (`12:30`), an ISO date or an ARN therefore resolves to null or empty. Put such values in context and reference them, or include at least one placeholder in the text.

**Placeholder syntax:** in `{scope:name}`, scope and name may contain only letters, digits and `_`, and both are case-sensitive. A property name with a hyphen (such as `download:file-name`) can only be read with a bare reference. Values are converted with the server's culture settings, so dates read through a template are not ISO 8601. There is no escaping and no default-value syntax.

**Date-like option values are rewritten.** A text option whose whole value is an ISO 8601 date-time, such as `"2024-01-01T00:00:00Z"`, reaches the plugin in the server's local date format (`01/01/2024 00:00:00`). This affects literal values in options like `DefaultFetchColumnValues`, `ExtendedFields` and guard `CompareTo`.

### Pipeline Metadata Storage

The pipeline message handler (`IMLDataStreamMessageHandler`) also provides persistent metadata storage that survives restarts:

| Method | Description |
| -------- | ------------- |
| `StoreMetadataAsync(key, value)` | Store a persistent key-value pair (e.g., cursor position, last processed ID) |
| `GetMetadataAsync(key)` | Retrieve a stored value |

This is how connectors like `HttpPollingConnector` persist tracking state (last poll URL and dates, POST tracking value) between ramp restarts. Pagination cursors are **not** persisted; they live only for the duration of one poll.

---

## Complete Pipeline Examples

### Example 1: JSON from Kafka with Coordinate Transform

```json
{
    "NumberOfWorkers": 10,
    "Steps": [
        {
            "StepName": "ParseJSON",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "JsonPipelineParser",
            "Options": {
                "RecordRootPath": "$.records[*]",
                "SimplifyColumnNames": true,
                "ExcludePaths": ["$.metadata", "$.internal"]
            },
            "Transitions": [
                { "ToStep": "MakeGeometry", "TargetInputKey": "DEFAULT" }
            ]
        },
        {
            "StepName": "MakeGeometry",
            "Type": "RecordTransform",
            "Application": "MapLargeCore",
            "PluginName": "DelimitedToWKTTransform",
            "Options": {
                "Fields": ["position"],
                "Coordinates": ["y", "x"],
                "WKTName": "Point",
                "OutputName": "geometry"
            },
            "Transitions": [
                { "ToStep": "CleanFields", "TargetInputKey": "DEFAULT" }
            ]
        },
        {
            "StepName": "CleanFields",
            "Type": "RecordTransform",
            "Application": "MapLargeCore",
            "PluginName": "FieldNameTransform",
            "Options": {
                "ExcludeFields": ["_internal", "debug_flag"],
                "RenameFields": { "evt_id": "event_id", "evt_time": "timestamp" }
            },
            "Transitions": [
                { "ToStep": "CommitEvents", "TargetInputKey": "DEFAULT" }
            ]
        },
        {
            "StepName": "CommitEvents",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "MaxFlushDelayMS": 15000,
                "TargetBackingFileRecordCount": 1000,
                "UseBackingFilePersistence": true,
                "ImportTables": {
                    "DEFAULT": {
                        "Account": "analytics",
                        "Table": "events",
                        "Append": true,
                        "Partition": { "PartitionColumns": ["timestamp:week"] }
                    }
                }
            }
        }
    ]
}
```

### Example 2: Envelope Stripping with Conditional Routing

```json
{
    "NumberOfWorkers": 10,
    "Steps": [
        {
            "StepName": "OpenEnvelope",
            "Type": "StreamTransform",
            "Application": "MapLargeCore",
            "PluginName": "JSONDisassemblerStreamTransform",
            "Options": {
                "Roots": [{ "OutputKey": "Envelope", "Path": "$" }],
                "PropertiesToPromote": [
                    { "Path": "$.message_type", "Scope": "streaming_msg", "Name": "msg_type" }
                ]
            },
            "Transitions": [
                { "ToStep": "ParsePayload", "SourceOutputKey": "Envelope" }
            ]
        },
        {
            "StepName": "ParsePayload",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "JsonPipelineParser",
            "Options": { "RecordRootPath": "$.payload[*]", "SimplifyColumnNames": true },
            "Transitions": [
                {
                    "ToStep": "CommitAlerts",
                    "TransitionGuard": {
                        "ContextScope": "streaming_msg",
                        "ContextProperty": "msg_type",
                        "CompareTo": "alert"
                    }
                },
                {
                    "ToStep": "CommitTelemetry",
                    "TransitionGuard": {
                        "ContextScope": "streaming_msg",
                        "ContextProperty": "msg_type",
                        "CompareTo": "telemetry"
                    }
                }
            ]
        },
        {
            "StepName": "CommitAlerts",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "MaxFlushDelayMS": 5000,
                "TargetBackingFileRecordCount": 100,
                "ImportTables": {
                    "DEFAULT": { "Account": "ops", "Table": "alerts", "Append": true }
                }
            }
        },
        {
            "StepName": "CommitTelemetry",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "MaxFlushDelayMS": 15000,
                "TargetBackingFileRecordCount": 5000,
                "ImportTables": {
                    "DEFAULT": { "Account": "ops", "Table": "telemetry", "Append": true }
                }
            }
        }
    ]
}
```

For a message like `{"message_type": "alert", "payload": [{"id": "1", "sev": "high"}, ...]}`:

- The disassembler's root is the whole document (`$`), because a value is promoted only into roots that **enclose** it - `$.message_type` is outside a `$.payload` root. A root path must also point at objects: `$.payload` (an array) would match nothing, and every message would silently produce no records.
- The parser then picks the records with `RecordRootPath: "$.payload[*]"`; `SimplifyColumnNames` names the columns `id` and `sev` instead of `payload_id` and `payload_sev`.
- A message whose `message_type` is neither `alert` nor `telemetry` matches no transition and fails with *Could not transition to DEFAULT*; one with no `message_type` fails at the guard (*Could not find context property*).

Verified on a local server: the alert message's two records were committed to the alerts table.

### Example 3: S3 File Download with XML Parsing

```json
{
    "NumberOfWorkers": 5,
    "Steps": [
        {
            "StepName": "DownloadFromS3",
            "Type": "StreamTransform",
            "Application": "MapLargeCore",
            "PluginName": "DownloadFromS3Transform",
            "Options": {
                "Bucket": "S3Connector:BucketName",
                "Key": "$messageKey",
                "Region": "S3Connector:Region",
                "AccessKey": "S3Connector:AccessKey",
                "SecretKey": "S3Connector:SecretKey"
            },
            "Transitions": [
                { "ToStep": "ParseXML" }
            ]
        },
        {
            "StepName": "ParseXML",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "XmlParser",
            "Options": {
                "MultipleRoots": [
                    {
                        "Path": "/data/tracks/track",
                        "OutputKey": "tracks",
                        "IncludeParentProperties": 5
                    }
                ],
                "ExcludePaths": ["/data/metadata"],
                "SimplifyColumnNames": true,
                "AttributeBasedNames": { "/data/tracks/track/dynamics": "cs" }
            },
            "Transitions": [
                { "ToStep": "CommitTracks", "SourceOutputKey": "tracks", "TargetInputKey": "DEFAULT" }
            ]
        },
        {
            "StepName": "CommitTracks",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "MaxFlushDelayMS": 10000,
                "TargetBackingFileRecordCount": 500,
                "UseBackingFilePersistence": true,
                "ImportTables": {
                    "DEFAULT": { "Account": "geo", "Table": "tracks", "Append": true }
                }
            }
        }
    ]
}
```

The `S3Connector` delivers an empty stream plus context; `DownloadFromS3Transform` fetches the object. Its options are bare `scope:name` references (no braces) and `$messageKey` (= `S3Connector:Key`); nothing is looked up implicitly. The connector always writes `S3Connector:BucketName` and `S3Connector:Key`, but writes `Region`, `AccessKey` and `SecretKey` only when its `CopyS3ConfigToMessage` option is `true`. Alternatively, leave both keys blank to use the server's IAM role and give `Region` as a literal such as `"us-east-1"`.

### Example 4: Multiple Output Tables from One Parser

```json
{
    "NumberOfWorkers": 10,
    "Steps": [
        {
            "StepName": "ParseGDELT",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "GdeltMasterListParser",
            "Options": { "StartDate": "2026-10-01T00:00:00Z", "CatchupSpan": "06:00:00", "MaxParallel": 4 },
            "Transitions": [
                { "SourceOutputKey": "EVENTS",             "TargetInputKey": "EVENTS",   "ToStep": "CommitAll" },
                { "SourceOutputKey": "MENTIONS",           "TargetInputKey": "MENTIONS", "ToStep": "CommitAll" },
                { "SourceOutputKey": "GKG",                "TargetInputKey": "GKG",      "ToStep": "CommitAll" },
                { "SourceOutputKey": "EVENTS_files",       "TargetInputKey": "FILES",    "ToStep": "CommitAll" },
                { "SourceOutputKey": "MENTIONS_files",     "TargetInputKey": "FILES",    "ToStep": "CommitAll" },
                { "SourceOutputKey": "GKG_files",          "TargetInputKey": "FILES",    "ToStep": "CommitAll" },
                { "SourceOutputKey": "UNCLASSIFIED_files", "TargetInputKey": "FILES",    "ToStep": "CommitAll" }
            ]
        },
        {
            "StepName": "CommitAll",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "MaxFlushDelayMS": 15000,
                "TargetBackingFileRecordCount": 1000,
                "ImportTables": {
                    "EVENTS":   { "Account": "gdelt", "Table": "events",   "Append": true },
                    "MENTIONS": { "Account": "gdelt", "Table": "mentions", "Append": true },
                    "GKG":      { "Account": "gdelt", "Table": "gkg",      "Append": true },
                    "FILES":    { "Account": "gdelt", "Table": "files_processed", "Append": true }
                }
            }
        }
    ]
}
```

`GdeltMasterListParser` emits **seven** output keys, and each needs a transition or the message fails with *Could not transition to &lt;key&gt;*: the row keys `EVENTS`, `MENTIONS`, `GKG`, and `EVENTS_files`, `MENTIONS_files`, `GKG_files`, `UNCLASSIFIED_files` (one record per file processed). Here the four file keys share one log table. Several transitions can deliver into the same `TargetInputKey`.

Set `StartDate`: without it the parser reads the entire GDELT history, and because tracking is not saved between polls, every poll starts again there. Set `MaxParallel` explicitly too: the default (a third of the CPU count) is 0 on 1–2 core servers, which fails.

### Example 5: Cursor Pagination with HttpPollingConnector

This example shows how to page through a REST API that returns data like:

```json
{
    "content": {
        "nextCursor": "eyJpZCI6MTAwfQ==",
        "tasks": [
            {"taskId": "abc-001", "status": "open", "assignee": "alice"},
            {"taskId": "abc-002", "status": "closed", "assignee": "bob"}
        ]
    }
}
```

The cursor (`content.nextCursor`) is **outside** the record root (`content.tasks[*]`). This is the most common API pagination pattern - and `PropertiesToPromote` handles it correctly because it operates on the full document, not scoped to `RecordRootPath`.

**Connector config** (paste into the **Connector tab**):

```json
{
    "EndPoint": "https://api.example.com/v1/tasks",
    "DoNotTrack": true,
    "CursorParameterName": "cursor",
    "CursorContextScope": "__cursor",
    "CursorContextKey": "__value",
    "PaginationDelayMs": 200,
    "PollingFrequencyMS": 300000
}
```

**Pipeline config** (paste into the **Pipeline tab**):

```json
{
    "NumberOfWorkers": 5,
    "Steps": [
        {
            "StepName": "ParseTasks",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "JsonPipelineParser",
            "Options": {
                "MultipleRoots": [
                    { "Path": "$.content.tasks[*]", "OutputKey": "tasks" }
                ],
                "PropertiesToPromote": [
                    {
                        "Path": "content.nextCursor",
                        "Scope": "__cursor",
                        "Name": "__value"
                    }
                ]
            },
            "Transitions": [{ "ToStep": "Commit", "SourceOutputKey": "tasks" }]
        },
        {
            "StepName": "Commit",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "ImportTables": {
                    "DEFAULT": {
                        "Account": "myaccount",
                        "Table": "tasks",
                        "Append": true,
                        "PrimaryKeyColumns": ["taskId"]
                    }
                }
            }
        }
    ]
}
```

> **`RecordRootPath` works the same as `MultipleRoots` here, and `$.`-prefixed paths work the same as dot-notation.** The parser normalizes `$.content.nextCursor` and `content.nextCursor` identically (`TrimStart('$', '.')`), and promotion is independent of how records are rooted. Verified live 2026-10-01: `"RecordRootPath": "$.items[*]"` + `"Path": "$.nextPageToken"` paged through every page. If promotion "isn't working," the cause is one of the troubleshooting items below, not the root style.

**How the pagination loop works:**

1. **First request:** Connector sends `GET https://api.example.com/v1/tasks` (no cursor parameter)
2. **Parser traverses full document:** Encounters `content.nextCursor` → promotes `"eyJpZCI6MTAwfQ=="` to context as `__cursor::__value`. Then encounters `content.tasks[*]` → emits 2 records.
3. **Connector reads cursor:** After the pipeline processes the page, the connector reads `ctx["__cursor", "__value"]` → gets `"eyJpZCI6MTAwfQ=="`
4. **Next request:** Connector sends `GET https://api.example.com/v1/tasks?cursor=eyJpZCI6MTAwfQ==`
5. **Repeat** until the API returns no `nextCursor` (null/empty) or the cursor is unchanged

**Key points:**

- `CursorParameterName` must match the API's query parameter name
- `CursorContextScope`/`CursorContextKey` must exactly match `PropertiesToPromote`'s `Scope`/`Name` (names are arbitrary; double-underscore convention avoids collisions)
- Fresh context per page; cursor flows via local variable, not across contexts - and is **not saved between polls** (each poll restarts at page 1; dedupe with `PrimaryKeyColumns` plus `Append: true`, which upserts)
- Keep `Append: true`: with `Append: false` (the default) every commit replaces the table with only that commit's rows, so the table would end up holding just the last page or two (verified on a local server)
- Cursor values can be any string (opaque tokens with `-_+/=` work; GET values are URL-encoded)
- POST pagination: use `{{CURSOR_VALUE}}` in `PostPayload` (see `ConnectorConfig.md`)
- `PaginationDelayMs` adds delay between requests to avoid rate limiting

#### Troubleshooting: Pagination stops after 1 page

If pagination only fetches 1 page, check these in order:

1. **`TargetInputKey` case mismatch (most common):** The `TargetInputKey` value in transitions must **exactly match** the key in the committer's `ImportTables` dictionary (case-sensitive, ordinal comparison). If `ImportTables` has `"DEFAULT"` but the transition has `"default"`, the committer throws `DataStreamException: Table default unknown to coalescer!`. This kills `ProcessMessageAsync`, so the connector never reads the cursor from context, and pagination stops. **Fix:** Use `"DEFAULT"` (all caps) for both, or omit `TargetInputKey` entirely to use the default.

2. **`PropertiesToPromote` path mismatch:** The `Path` value is matched against the full Newtonsoft JSON path during traversal. Leading `$` and `.` are stripped automatically, so `"$.content.nextCursor"`, `".content.nextCursor"`, and `"content.nextCursor"` all work. But the path must exactly match what the JSON reader produces - e.g., `"content.nextCursor"` not `"content.next_cursor"`.

3. **Scope/Key mismatch:** The connector's `CursorContextScope` + `CursorContextKey` must match `PropertiesToPromote`'s `Scope` + `Name` exactly. If these don't match, the connector reads `null` from context and stops.

4. **A cloning stream transform sits before the parser:** `JSONDisassemblerStreamTransform` (root wrappers clone the context), `MultipleJsonStreamSplitTransform`, `GeoFileInfoStreamTransform`, and the Parquet DB transforms all pass a `Clone()` of the context downstream. A cursor promoted by any of them, or by a parser after one, lands on the clone, and the connector reads `null`. Put the cursor promotion on a parser that receives the connector's context directly.

5. **API returns cursor inside the record array:** If the cursor is inside `RecordRootPath` (e.g., each task object has a `cursor` field), `PropertiesToPromote` still works - the parser promotes it for every record it encounters. The connector reads the last-promoted value after the pipeline completes.

**Troubleshooting: the cursor parameter is sent as numbers (`1, 3, 5, 7...`) instead of the token**

`OffsetParameterName` is set on the connector (often named like the cursor, e.g. `"pageToken"`). Offset mode takes precedence over cursor mode, ignores every `Cursor*` setting, and, with nothing promoted, advances by the parser's record count. Remove `OffsetParameterName`/`OffsetStartValue`/`PageSize`/`RecordCount*` and set `CursorParameterName`. The token being non-numeric is not the problem.

> **Do not use `JSONDisassemblerStreamTransform` to promote the cursor.** It is not needed, because parser `PropertiesToPromote` operates on the full document (not scoped to `RecordRootPath`), and it does not work, because the disassembler promotes into a cloned context the connector never reads. Use the disassembler only for splitting messages into multiple sub-streams.
>
> **JSON property order affects `AddContextProperties`, NOT pagination.** If the cursor appears AFTER the record array in JSON, `ExtendRecordTransform` with `AddContextProperties: true` won't show it as a column (not yet in context when records were transformed). But **pagination still works** because the connector reads cursor after `ProcessMessageAsync` completes. Don't use `AddContextProperties` column presence to test promotion.

**Combining pagination with tracking:** pagination works within a poll; tracking works between polls. For GET, the only cross-poll bookmark is the day-granularity `{year1}`/`{month1}`/`{day1}` placeholders (see `ConnectorConfig.md`), and relative tokens like `{now-1h}` are a rolling window, not a bookmark. With `DoNotTrack: false`, the connector **skips any poll whose URL equals the previous poll's URL**. Because validation does not catch this when pagination is configured, the URL must contain a placeholder that changes between polls; otherwise only the first poll ever runs. The example below works because `{now-1h}` (formatted to the second) changes every poll:

```json
{
    "EndPoint": "https://api.example.com/v1/tasks?modifiedSince={now-1h}",
    "DateSubstitutionFormat": "yyyy-MM-ddTHH:mm:ssZ",
    "DoNotTrack": false,
    "CursorParameterName": "cursor",
    "CursorContextScope": "__cursor",
    "CursorContextKey": "__value",
    "PaginationDelayMs": 200,
    "PollingFrequencyMS": 300000
}
```

Add `FieldTrackingTransform` to the pipeline if using POST-based tracking (see `ConnectorConfig.md` for POST tracking details).

---

### Example 6: WFS with No Parser Step (Record-Oriented Connector)

> Before copying this for a real WFS source: `WfsConnector`
> silently loses polygon geometry from GML 3 services, so this shape is only safe for point/line layers.

`WfsConnector` implements `IMLRecordOrientedConnector`, so the engine injects a `PassThroughParser` and the pipeline starts directly at the committer. This is the complete pair of configs for pulling one feature type into one table - note there is **no `Parser` step**, and no parser options anywhere in the pipeline (GML parsing is configured by the `Parsing` block on the *connector*).

**Connector tab:**

```json
{
    "EndPoint": "https://geoserver.example.com/ows",
    "Features": ["ns:buildings"],
    "Hits": 100,
    "IgnoreErrors": false,
    "SrsName": "EPSG:4326",
    "DoNotTrack": true,
    "Parsing": {
        "SimplifyColumnNames": true,
        "SwapAxisOrder": true
    }
}
```

`Version` is deliberately absent so the connector auto-detects it from GetCapabilities. `Hits: 100` caps the first run. `IgnoreErrors: false` makes a service-side `ows:ExceptionReport` fault the ramp instead of logging quietly and leaving you with an empty table. No `CronExpression` or `PollingFrequencyMS` means this is a one-time run.

**Pipeline tab:**

```json
{
    "NumberOfWorkers": 1,
    "Steps": [
        {
            "StepName": "Commit",
            "Type": "Committer",
            "Application": "MapLargeCore",
            "PluginName": "CoalescingPipelineCommitter",
            "Options": {
                "MaxFlushDelayMS": 15000,
                "TargetBackingFileRecordCount": 1000,
                "ImportTables": {
                    "DEFAULT": {
                        "Account": "myaccount",
                        "Table": "buildings",
                        "Append": false
                    }
                }
            }
        }
    ]
}
```

**Reading the first run.** Geometry arrives as WKT text in a column derived from the GML element path (just `WKT` with `SimplifyColumnNames: true`). Check three things before scaling up:

1. **How many tables were created.** One means the geometry is uniform. Two or three (e.g. `buildings`, `buildingsLine`) means the source holds mixed geometry and `SplitWKTIfNeeded` fanned it out - set `MultiGeoTable` via `ExtendedConfigJson` if you need it kept in one table.
2. **Whether the geometry column is populated**, and whether points plot in the right hemisphere. If they are transposed, flip `SwapAxisOrder` and re-run - with `Append: false` the run simply replaces the table.
3. **Row count vs. expectation.** On a WFS 1.1.0 service paging is disabled entirely, so `Hits` is the only limit and the whole response arrives at once.

**Going incremental.** Once the shape is right, add a schedule and a watermark to the connector and switch the committer to append:

```json
{
    "CronExpression": "0 3 * * *",
    "DoNotTrack": false,
    "TrackingDateField": "last_modified",
    "Hits": -1
}
```

`TrackingDateField` must name a real date column from `DescribeFeatureType`. It generates a CQL `after` filter plus a `sortBy`, and advances the watermark from the newest value actually seen in the returned records.

---

## Data Selection Cheat Sheet

| Question | JSON Parser | XML Parser | YAML Parser | CSV Parser | Avro |
| ---------- | ------------- | ------------ | ------------- | ------------ | ------ |
| **PluginName** | `JsonPipelineParser` | `XmlParser` | `YamlPipelineParser` | `DelimitedTextParser` | `AvroParser` |
| **Where do records start?** | `RecordRootPath` or `MultipleRoots` (a top-level array needs `$[*]`) | `RecordRootPath` or `MultipleRoots` with `/`-separated element paths (not XPath); a root is required | Same as JSON (converts YAML to JSON first) | Every row | Every Avro record |
| **How to exclude data?** | `ExcludePaths` | `ExcludePaths` (exact element paths) | `ExcludePaths` | N/A | N/A |
| **How to include only specific data?** | `ExcludePaths` (no `IncludePaths` support) | `IncludePaths` and `ExcludePaths` | `ExcludePaths` (no `IncludePaths` support) | N/A | N/A |
| **How are nested structures handled?** | Flattened with `_` joins; arrays of plain values become one space-separated value | Flattened with `_` joins | Flattened with `_` joins | N/A (flat) | Flattened with `_` joins |
| **How to keep nested as blob?** | `PathActions` with `StringifyOnly` | N/A | `PathActions` with `StringifyOnly` | N/A | N/A |
| **How to pivot key/value lists into columns?** | `PathActions` with `Pivot` | `PathActions` with `Pivot` | `PathActions` with `Pivot` | N/A | N/A |
| **How to control column names?** | `SimplifyColumnNames` (`PathActions.ColumnName` only names a stringified column) | `SimplifyColumnNames`, `AttributeBasedNames` | `SimplifyColumnNames` | Headers or `ExplicitColumnHeaders` | Schema field names |
| **How to extract metadata?** | `PropertiesToPromote` (on parser or on `JSONDisassemblerStreamTransform` step) | `PropertiesToPromote` on the parser (`/a/b` for text, `/a/b:attr` for an attribute) | `PropertiesToPromote` | N/A | N/A |
| **How to split one message into multiple tables?** | `MultipleRoots` with different `OutputKey`s | `MultipleRoots` with different `OutputKey`s | `MultipleRoots` with different `OutputKey`s | N/A | N/A |
| **Auto geometry detection?** | GeoJSON -> WKT | GML 3.2 Point, LineString and Envelope -> WKT (no polygons) | GeoJSON -> WKT | N/A | N/A |

For every parser, keep or drop fields with `FieldNameTransform` (`IncludeFields`/`ExcludeFields`) and rename them with `FieldNameTransform.RenameFields` - parsers can't rename individual fields.

---

## Available Connectors

Configs documented in `ConnectorConfig.md`. **Two plugins use spaces in names:** `"ArcGIS Rest Connector"` and `"Tiled Imagery Connector"`.

### Push/Subscribe Connectors (Listen for incoming data)

| PluginName | Source |
| ------------ | -------- |
| `KafkaConnector` | Kafka topics |
| `NATSConnector` | NATS Core |
| `NATSJetStreamConnector` | NATS JetStream |
| `PulsarConnector` | Apache Pulsar |
| `MQTTConnector` | MQTT servers |
| `ActiveMQConnector` | ActiveMQ |
| `SQSConnector` | AWS SQS queues |
| `WebSocketMessageConnector` | WebSocket connections |
| `PushedMessageConnector` | HTTP push (accepts messages pushed over HTTP) |
| `VideoConnector` | Video streams |

### Polling Connectors (Check periodically)

| PluginName | Source |
| ------------ | -------- |
| `S3Connector` | AWS S3 objects |
| `AzureStorageConnector` | Azure Storage blobs |
| `GoogleCloudStorageConnector` | Google Cloud Storage |
| `ElasticsearchConnector` | Elasticsearch indices |
| `HttpPollingConnector` | HTTP endpoints (CRON support) |
| `RelationalDatabaseConnector` | Database queries |
| `SFTPConnector` | SFTP servers |
| `WfsConnector` | WFS services |
| `ArcGIS Rest Connector` | ArcGIS Feature Servers (**note: has spaces in plugin name**) |

### Long-Running Connectors

| PluginName | Source |
| ------------ | -------- |
| `FileSystemConnector` | Local filesystem monitoring |
| `AttachedFilesystemConnector` | Monitored filesystem with indexing |
| `Tiled Imagery Connector` | WMTS/XYZ tile services (**note: has spaces in plugin name**) |

### Export Connectors (Off Ramps)

| PluginName | Destination |
| ------------ | ------------- |
| `FileSystemExportConnector` | Local filesystem (one file, overwritten by every message) |
| `HttpExportConnector` | HTTP POST |
| `NATSExportConnector` | NATS publish |
| `SNSExportConnector` | AWS SNS topics (FIFO topics don't work) |
