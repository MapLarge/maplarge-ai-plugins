# MapLarge DataStream Pipeline Configuration Guide

> **Scope**: Reference for the **Pipeline Definition** JSON that goes into the **Pipeline tab** of the MapLarge on-ramp create/edit dialog. This document covers pipeline structure, data flow, parsers, transforms, committers, and practical examples.
> **Last updated**: 2026-03-27

---

## IMPORTANT: Two Separate Configs — Do NOT Combine

| UI Tab | What you generate | Documented in |
|--------|------------------|---------------|
| **Connector tab** | Flat JSON object with connector-specific properties | `ConnectorConfig.claude.md` |
| **Pipeline tab** (this doc) | JSON object with `NumberOfWorkers` + `Steps` array | This file |

Do NOT wrap pipeline JSON in an on-ramp envelope. Do NOT include `connectorPluginName`, `connectorOptions`, `effectiveUserName`, or any other on-ramp-level fields. The UI handles those separately. User pastes your JSON into the **Pipeline tab** "Show JSON" editor. Connector is configured separately in the **Connector tab** (see `ConnectorConfig.claude.md`).

---

## Table of Contents

- [What a Pipeline Does](#what-a-pipeline-does)
- [Pipeline Structure](#pipeline-structure)
- [Step Types](#step-types)
- [Runtime Data Model & Defensive Patterns](#runtime-data-model--defensive-patterns)
- [Geometry Column Naming — How the Import Engine Names Geo Columns](#geometry-column-naming--how-the-import-engine-names-geo-columns)
- [JSONDisassemblerStreamTransform (Stream Transform)](#jsondisassemblerstreamtransform-stream-transform)
- [Parsers: How Data Gets Interpreted](#parsers-how-data-gets-interpreted)
  - [JSON Parser](#json-parser-jsonpipelineparser)
  - [XML Parser](#xml-parser-xmlparser)
  - [Delimited Text Parser](#delimited-text-parser-delimitedtextparser)
  - [Avro Parser](#avro-parser-avroparser)
  - [Other Parsers](#other-parsers)
- [How Nested Data Gets Flattened](#how-nested-data-gets-flattened)
- [Record Transforms](#record-transforms) — FieldNameTransform, ExpressionTransform, DelimitedToWKTTransform, CrsTransform, ExtendRecordTransform, EnsureFieldsTransform, SkipRecordTransform, SplitDelimitedTransform, EmbeddedJsonTransform, TableLookupTransform, RegexTransform, FieldTrackingTransform, LineToWKTTransform, Geometry Transforms, Additional Transforms
- [Stream Transforms](#stream-transforms) — MultipleJsonStreamSplitTransform, ContextVariableStreamTransform, Download/Archive Transforms
- [InterchangeTransform Plugins](#interchangetransform-plugins) — CreateTrackLinesTransform, TableRecordIDCachingTransform, TableRecordIDLookupTransform
- [Committers](#committers) — CoalescingPipelineCommitter, InvokeRampCommitter, DMLStatementCommitter, ChangeSetCoalescingPipelineCommitter, Event Bus Committers, and more
- [Export Pipeline Components](#export-pipeline-components) — Serializers, Observers
- [Transitions and Conditional Routing](#transitions-and-conditional-routing)
- [Well-Known vs Ad-Hoc Pipelines](#well-known-vs-ad-hoc-pipelines)
- [Message Context System](#message-context-system)
- [Complete Pipeline Examples](#complete-pipeline-examples) — including [Cursor Pagination with HttpPollingConnector](#example-cursor-pagination-with-httppollingconnector)
- [Data Selection Cheat Sheet](#data-selection-cheat-sheet)
- [Available Connectors](#available-connectors)

---

## What a Pipeline Does

A pipeline takes raw data from a connector (Kafka messages, S3 files, HTTP responses, database rows, etc.) and turns it into rows in a MapLarge table. You define the pipeline as a JSON object with a `NumberOfWorkers` count and a `Steps` array. Each step does one job — parse bytes into records, transform records, or commit records to a table — and transitions route data from one step to the next.

The simplest pipeline is two steps: a **Parser** that converts the incoming bytes into flat records, and a **Committer** that writes those records to a table. Between them you can add any number of **RecordTransforms** to rename fields, compute new fields, convert coordinates to geometry, filter out bad records, or enrich records from lookup tables. Before the parser, you can add **StreamTransforms** to download files from S3, unzip archives, or extract subtrees from JSON envelopes.

Steps execute in the order defined by their transitions, not their position in the array. Multiple workers process messages in parallel. Property names in the JSON are case-insensitive.

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
|-------|---------|
| `NumberOfWorkers` | Parallel processing threads (e.g., 10 workers dequeue messages concurrently) |
| `Steps[]` | List of processing stages (execution order determined by transitions, not array position) |
| `StepName` | Unique name for routing via transitions |
| `Type` | The category of step — determines how the pipeline invokes the plugin (see [Step Types](#step-types) below) |
| `PluginName` | The specific plugin within that category — each `Type` has multiple plugins to choose from (see tables below) |
| `Options` | Plugin-specific JSON configuration |
| `Transitions[]` | Where output goes next (routing) |

---

## Step Types

The `PipelineStepType` enum defines these stages:

**Import Pipeline Steps:**

| Type | Input -> Output | Purpose |
|------|-----------------|---------|
| **StreamTransform** | bytes -> bytes | Modify raw stream before parsing (unzip, download from S3, split JSON) |
| **Parser** | bytes -> records | Convert raw data into flat records |
| **RecordTransform** | record -> record | Modify individual records (rename fields, convert coords, compute expressions) |
| **InterchangeTransform** | batch -> batch | Modify entire batches of records |
| **Committer** | records -> database | Persist records to MapLarge tables |
| **StreamCommitter** | bytes -> database | Commit raw streams directly |
| **TransactionNotifier** | (post-commit) | Send notifications after successful commit |

**Export Pipeline Steps (Off Ramps):**

| Type | Purpose |
|------|---------|
| **RecordObserver** | Entry point for export — observes table changes and emits records |
| **Serializer** | Convert records to output format (JSON, CSV, etc.) |
| **ExportConnector** | Send serialized data to external system (HTTP, NATS, file, etc.) |
| **RecordAccumulator** | Accumulate records before serialization |

### Valid Import Transition Order

```
StreamTransform      -> StreamTransform | Parser | StreamCommitter
Parser               -> RecordTransform | InterchangeTransform | Committer
RecordTransform      -> RecordTransform | InterchangeTransform | Committer
InterchangeTransform -> InterchangeTransform | Committer
Committer            -> TransactionNotifier
StreamCommitter      -> TransactionNotifier
```

### Valid Export Transition Order

```
RecordObserver  -> RecordTransform | Serializer
RecordTransform -> RecordTransform | Serializer
Serializer      -> ExportConnector | StreamTransform
StreamTransform -> StreamTransform | ExportConnector
```

Minimum import: **Parser → Committer**. Can skip parsing: **StreamTransform → StreamCommitter**. Typical export: **RecordObserver → Serializer → ExportConnector**.

### How `Type` and `PluginName` Relate

`Type` is the category; `PluginName` is the specific plugin. Each plugin only works with one type — e.g., `"Type": "Parser"` + `"PluginName": "FieldNameTransform"` would fail. See the tables above for valid Type/PluginName combinations.

---

## Runtime Data Model & Defensive Patterns

This section establishes the core mental model for how data flows through pipelines. Understanding this upfront is essential for building pipelines that handle real-world, variable-schema data reliably.

### Records Are Schema-Less Bags of Name-Value Pairs

At runtime, every record is an `MLFlattenedRecord` — a flat, ordered list of `MLFlattenedField` objects. Each field has a `Name` (string) and a `Value` (object, almost always a string). **There is no schema contract.** Different records in the same stream can have completely different sets of fields.

**Key implications:**

- A field may be present on one record and entirely absent on the next
- All field values are strings at pipeline time — type detection happens later (at commit time via `VariableSchemaAccumulator`)
- Field lookup is by name (linear scan through the list), not by index
- **Duplicate field names are legal** — `ExtendRecordTransform` creates them deliberately; committers resolve them (last value wins)
- The same pipeline step can succeed for one record and fail for the next, depending on which fields are present

### The Failure Model: Fail-Fast Per Message

**When a pipeline step throws an exception:**
- The **entire message** fails — all records from that message are lost (no partial commit)
- The exception is logged and the pipeline moves on to the next message
- Quota exceptions (account size limit exceeded) fault the entire ramp

**When a RecordTransform returns `null`:**
- The record is **silently skipped** (dropped from the pipeline)
- A skip counter is incremented and reported in the process log
- Other records in the same message continue processing normally

This means one bad record can take down an entire message worth of good records unless you add defensive steps.

### Absent Fields vs Null-Valued Fields

This distinction is critical and a common source of confusion:

| Scenario | Field in record? | Value | `SkipRecordTransform` NotExists? | `ExpressionTransform` behavior |
|----------|-----------------|-------|----------------------------------|-------------------------------|
| Field never existed | No | N/A | Matches (drops record) | Throws `"Unable to find field"` |
| `ExtendRecordTransform` stubbed it | Yes | `""` (or specified default) | Does NOT match | Uses the default value |
| Geometry transform with `FailOnMissingParameters: false` | No | N/A | Matches (field absent) | Throws `"Unable to find field"` (field was never added) |

**Why this matters:** Geometry transforms (`EllipseToWKTTransform`, `SectorToWKTTransform`, `ECEFTransform`) with `FailOnMissingParameters: false` return the **original record unchanged** — the output field is **not added at all**. Downstream `SkipRecordTransform` with `NotExists` on the output field **will** match (the field is absent). However, it is still best practice to filter **before** the geometry transform to drop records missing the required **input** fields (lat, lng, axis, etc.), so you can set `FailOnMissingParameters: true` and guarantee valid WKT downstream.

### Defensive Toolkit Decision Framework

Choose your strategy based on what should happen to records with missing data:

**Strategy 1a — Keep all records, let ExpressionTransform handle missing fields:**
→ Set `TreatMissingFieldsAsEmpty: true` on `ExpressionTransform`. Missing fields resolve as `null`. Wrap arithmetic expressions with `Nvl()` or `ToDouble()` to handle nulls.

**Strategy 1b — Keep all records, fill defaults (safe):**
→ Use `EnsureFieldsTransform` before the transform that needs the field. Adds missing fields with empty string values. Does NOT create duplicates (case-insensitive HashSet check). Safe to use before `ExpressionTransform`.

**Strategy 1c — Keep all records, fill defaults (legacy):**
→ Use `ExtendRecordTransform` before the transform that needs the field. Adds a field with a default value.
→ **Trap:** Creates a duplicate if the field already exists. This is safe for committers (last value wins) but **crashes ExpressionTransform** (`ToDictionary()` on input fields throws on duplicate keys). Prefer `EnsureFieldsTransform` instead.

**Strategy 2 — Drop bad records early:**
→ Use `SkipRecordTransform` **before** transforms that need specific fields. Use `NotExists` to check for absent fields, `Equals`/`NotEquals` to check values.
→ **Trap:** `NotExists` checks field **name** presence only — it does not detect null-valued fields. Only use it to filter truly absent fields. Additionally, value-checking conditions (`Equals`, `NotEquals`, `EqualsAny`, `NotEqualsAny`) call `.Value.ToString()` without null-guarding — a field with a null value will throw `NullReferenceException`.

**Strategy 3 — Let geometry transforms be lenient:**
→ Set `FailOnMissingParameters: false` (default) on `EllipseToWKTTransform`, `SectorToWKTTransform`, `ECEFTransform`. They return the record unchanged (output field not added) and continue.
→ Set `IgnoreErrors: true` on `TableLookupTransform`. Returns the record with empty strings for missing lookup columns.

**Strategy 4 — Route different record shapes to different branches:**
→ Use `TransitionGuard` on message **context** properties (not record fields). Guards check context values set by `PropertiesToPromote` or connector metadata.
→ For per-record routing based on field values, use **broadcasting** (multiple transitions without guards) + `SkipRecordTransform` in each branch.

### Common Traps

1. **ExpressionTransform + duplicate fields** — `ExtendRecordTransform` creates duplicates if the field already exists. `ExpressionTransform` calls `ToDictionary()` on **input** record fields, which crashes on duplicate names. **Fix:** Use `EnsureFieldsTransform` instead (no duplicates), or set `TreatMissingFieldsAsEmpty: true` on `ExpressionTransform` to avoid field stubbing entirely. Legacy workaround: place `SkipRecordTransform` before `ExtendRecordTransform` to drop records that already have the field.

2. **Geometry output field is absent, not null** — Geometry transforms with `FailOnMissingParameters: false` return the record unchanged — the output field is **not added**. `SkipRecordTransform`'s `NotExists` on the output field **will** match. However, filtering on **input** fields (lat, lng, etc.) before the geometry transform is still the recommended approach — it lets you set `FailOnMissingParameters: true` so downstream steps can safely assume valid WKT.

3. **TransitionGuard on missing context** — Guards throw `ArgumentOutOfRangeException` if the context property doesn't exist or is empty. **Fix:** Always ensure context properties are populated (via `PropertiesToPromote` on an earlier step or via connector metadata) before guarded transitions.

4. **Expression syntax pitfalls** — String literals must use single quotes (`'hello'`, not `"hello"`). `+` only concatenates when both sides are strings — use `ToString()` on non-string fields first. `Iif()` and ternary expressions resolve **all** field references before evaluation — they don't short-circuit, so missing fields still throw even in the "else" branch.

5. **One bad record kills the entire message** — A single record with unexpected fields can throw an exception in a transform, which fails the entire message (all records lost). Always guard transforms that reference optional fields, especially when processing heterogeneous data sources.

---

## Geometry Column Naming — How the Import Engine Names Geo Columns

**The pipeline does not automatically rename geometry columns.** The field name on the record when it reaches the committer becomes the column name, with two exceptions:
1. **`SplitWKTIfNeeded`** — When mixed geometry types are detected OR `ForceSplitWKT` is set, the import engine renames the geo column and splits data into separate tables (post-commit).
2. **Synthetic XY column** — When lat/lng columns are detected by name pattern (`lat`/`latitude`, `lng`/`lon`/`long`/`longitude`), a new `"XY"` column is added. Original lat/lng columns are preserved.

### Processing Layers

**Layer 1 — Parser output:** The JSON parser preserves the parent JSON key name for GeoJSON→WKT conversions (e.g., `{"geometry": {"type":"Point",...}}` → field `geometry`). No hardcoded names. **Source:** `JsonParser.cs:318-325`.

**Layer 1b — Legacy file import only:** `JsonToCsvFlattenerNetcore` hardcodes `"WKT"` as the column name (`JsonToCsvFlattenerNetcore.cs:247`). Does NOT apply to DataStream pipelines. If you see a column named `WKT` that you didn't create, the data was imported via the legacy path.

**Layer 2 — Pipeline transforms (your control):**

| Transform | Default output field | Configurable via |
|-----------|---------------------|-----------------|
| `EllipseToWKTTransform` | `"EllipseWKT"` | `OutputShapeField` |
| `SectorToWKTTransform` | `"SectorWKT"` | `OutputShapeField` |
| `ECEFTransform` | `"XY"`, `"Altitude"` | `OutputPointField`, `OutputAltitudeField` |
| `GeoFieldNameTransform` | Dynamic (see below) | `GeoColumn`, `TableName` |
| `EmbeddedJsonTransform` | Parent JSON key name | No |
| `FieldNameTransform` | Your chosen name | `RenameFields` |

**Layer 3 — VariableSchemaAccumulator (commit time):** Normalizes column names via `StringUtils.AlphaNumeric()` (character cleanup only). Detects column types but does **NOT rename**. Creates synthetic `"XY"` column from lat/lng if no XY exists.

**Layer 4 — SplitWKTIfNeeded (post-commit):** Only triggers when `ForceSplitWKT` is set or mixed geometry types exist. Splits data into separate tables and renames:
- Points → `"XY"` | Polygons → new table name (e.g., `"sensorsPoly"`) | Lines → new table name (e.g., `"sensorsLine"`) | No geometry → `"WKT"`

**Source:** `StringImport.cs:1398-1408`

**When ForceSplitWKT is set:** ArcGIS imports (always), scheduled dataset auto-imports (always), manual file imports (if user sets it), DataStream on-ramps (only if set in committer's `ImportTables.DEFAULT.Options.ForceSplitWKT`).

### Canonical Geo Column Names

Used by MapLarge's APIs and `GeoFieldNameTransform` (`GeoColumnName.GetGeoColumnName()`):

| Geometry type | Canonical name |
|--------------|---------------|
| POINT | `XY` |
| MULTIPOINT | `WKT` |
| LINESTRING / MULTILINESTRING | `{tableName}_Line` |
| POLYGON / MULTIPOLYGON | `{tableName}` (same as table name) |

`GeoFieldNameTransform` is **optional** — not auto-injected. Add it explicitly for canonical naming, or use any field name — the import engine detects geometry type regardless of column name.

Transform output (e.g., `EllipseToWKTTransform`'s `OutputShapeField`) is NOT renamed downstream unless `ForceSplitWKT` is active.

The only column name "normalization" is `StringUtils.AlphaNumeric()` (strips non-alphanumeric chars). No layer renames columns based on content inspection.

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
        "Roots": [ ],
        "PropertiesToPromote": [ ]
    },
    "Transitions": [
        { "ToStep": "YourParserStepName", "SourceOutputKey": "DEFAULT" }
    ]
}
```

Place before your `Parser` step. Two configurable arrays — `Roots` and `PropertiesToPromote` — can be used independently or together.

### `Roots` — Extract JSON Subtrees

Each entry matches a JSON path, producing a separate output stream identified by `OutputKey`. Match `OutputKey` to `SourceOutputKey` in transitions.

**Single root** (extract payload from envelope):

```json
"Roots": [
    { "OutputKey": "JsonForImport", "Path": "$.payload", "Transpose": false }
]
```

**Multiple roots** (route different subtrees separately):

```json
"Roots": [
    { "OutputKey": "Events",   "Path": "$.events",   "Transpose": false },
    { "OutputKey": "Metadata", "Path": "$.metadata", "Transpose": false }
],
...
"Transitions": [
    { "ToStep": "ParseEvents",   "SourceOutputKey": "Events" },
    { "ToStep": "ParseMetadata", "SourceOutputKey": "Metadata" }
]
```

Root entry properties:
- `Path`: JSONPath to extract (`$` = whole doc, `$.data` = `data` property, `$[*]` = each array element)
- `OutputKey`: Identifies this output stream — match to `SourceOutputKey` in transitions
- `Transpose`: Convert column-oriented JSON to row-oriented (default `false`)

Only matched paths are forwarded; everything else is discarded.

### `PropertiesToPromote` — Extract Values into Message Context

Pulls values from JSON into message context metadata for use by downstream steps (transition guards, transforms) without creating table columns.

```json
"PropertiesToPromote": [
    { "Path": "$.event_type", "Scope": "streaming_msg", "Name": "record_type" },
    { "Path": "$.s3Key",      "Scope": "s3",            "Name": "key" }
]
```

- `Path`: Dot-notation path from document root (e.g., `content.nextCursor`). Leading `$` and `.` are stripped automatically
- `Scope`: Context namespace (e.g., `streaming_msg`, `s3`, `__cursor`, or any custom name)
- `Name`: Property name within that scope
- Promoted values are **removed** from JSON before reaching the parser
- Access downstream via `scope:name` (e.g., `streaming_msg:record_type`)

> **Important: `PropertiesToPromote` is NOT scoped to `RecordRootPath`.** Promotion operates on the **full JSON document** during traversal. The parser calls `PromoteIfNeeded()` for every scalar value regardless of whether it's inside or outside `RecordRootPath`. This is critical for cursor pagination where the cursor is at a different level than records. See [Cursor Pagination with HttpPollingConnector](#example-cursor-pagination-with-httppollingconnector).

**Both `Roots` and `PropertiesToPromote` can be used together:**

```json
{
    "StepName": "OpenEnvelope",
    "Type": "StreamTransform",
    "Application": "MapLargeCore",
    "PluginName": "JSONDisassemblerStreamTransform",
    "Options": {
        "Roots": [
            { "OutputKey": "Payload", "Path": "$.payload", "Transpose": false }
        ],
        "PropertiesToPromote": [
            { "Path": "$.message_type", "Scope": "streaming_msg", "Name": "msg_type" }
        ]
    },
    "Transitions": [
        { "ToStep": "ParsePayload", "SourceOutputKey": "Payload" }
    ]
}
```

Given an incoming message like:
```json
{ "message_type": "alert", "timestamp": "2025-01-01", "payload": [{"id": 1}, {"id": 2}] }
```

- `Roots` extracts `[{"id": 1}, {"id": 2}]` and forwards it to the parser
- `PropertiesToPromote` stores `"alert"` in the message context as `streaming_msg:msg_type`
- `"timestamp"` and `"message_type"` are discarded — only `payload` reaches the parser

---

## Parsers: How Data Gets Interpreted

Two main config concerns: (1) which objects become records (`RecordRootPath`/`MultipleRoots`), (2) which fields to keep/rename (`ExcludePaths`, `IncludePaths`, `PathActions`, `SimplifyColumnNames`).

### JSON Parser (`JsonPipelineParser`)

Streaming token-by-token parser (not loading full document into memory). Uses path matching for record selection.

#### RecordRootPath

| RecordRootPath | What It Selects |
|----------------|----------------|
| `"$"` | Entire document = 1 record |
| `"$[*]"` | Each element of a top-level array = 1 record per element |
| `"$.items[*]"` | Each element of the `items` array |
| `"$.data.records[*]"` | Nested array elements |
| `"$.envelopes[*].events[*]"` | Doubly-nested arrays |

Internally, the path is converted to regex via `JsonPathToRegex()` and matched against the current JSON path during streaming.

#### MultipleRoots — Different Record Types from One Document

```json
"MultipleRoots": [
    {
        "Path": "$.wells[*]",
        "OutputKey": "wells"
    },
    {
        "Path": "$.wells[*].measurements[*]",
        "OutputKey": "measurements",
        "IncludeParentProperties": 20,
        "ParentKeyProperty": "well_id"
    }
]
```

| Property | Purpose |
|----------|---------|
| `Path` | JSONPath to the record elements |
| `OutputKey` | Routes to different committer input keys (different tables) |
| `IncludeParentProperties` | Copy N levels of parent fields into child records (for denormalization) |
| `ParentKeyProperty` | Field to use as foreign key linking parent <-> child. If property exists on parent, uses its value; otherwise generates a GUID |

**Example with IncludeParentProperties:**

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
- `wells` table: `well_id="W1"`
- `measurements` table: `depth=100, temp=25.5, well_id="W1", project="Drilling"` (parent fields copied down)

#### ExcludePaths / IncludePaths

```json
"ExcludePaths": ["$.metadata", "$.internal.debug", "type"],
"IncludePaths": ["$.features[*].properties.*"]
```

- `ExcludePaths`: Matching paths are completely skipped. Converted to regex internally (`"type"` matches at any level)
- `IncludePaths`: If set, **only** matching paths are included. If empty/null, all paths included (minus excludes)
- **Note:** In the JSON parser, `IncludePaths` is NOT implemented — only `ExcludePaths` works. In the XML parser, both work independently

#### PathActions

Controls per-path handling within a record:

```json
"Options": {
    "RecordRootPath": "$[*]",
    "PathActions": [
        {
            "Path": "$.metadata",
            "ColumnName": "metadata_blob",
            "ObjectHandling": "StringifyOnly"
        }
    ]
}
```

**ObjectHandling options:**

| Mode | Behavior |
|------|----------|
| `ParseOnly` (default) | Flatten nested object into separate columns: `user_name`, `user_age` |
| `StringifyOnly` | Convert entire subtree to a JSON string column: `metadata="{\"key\":\"val\"}"` |
| `ParseAndStringify` | Both: flattened columns AND a JSON blob column |
| `Pivot` | Special: converts array of key-value pairs into columns |

##### The Pivot Pattern

```json
"PathActions": [
    {
        "Path": "$[*].measurements[*]",
        "ObjectHandling": "Pivot",
        "PivotName": "type",
        "PivotValue": "value"
    }
]
```

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
- `true`: JSON `null` values create a field with empty string value

#### SimplifyColumnNames

```json
"SimplifyColumnNames": true
```

- `false` (default): Uses full nested path — `user_profile_name`
- `true`: Uses only leaf name — `name`. If collisions occur, adds parent context until unique

#### GeoJSON Auto-Detection

Automatic — objects with `type` and `coordinates` are converted to WKT. E.g., `{"location": {"type": "Point", "coordinates": [-73.98, 40.75]}}` → `location = "POINT (-73.98 40.75)"`.

#### Full JSON Parser Config

```
TreeParserConfig:
  RecordRootPath       string       Single root path
  MultipleRoots        array        Multiple root configs
  SimplifyColumnNames  bool         Use leaf names only
  ExcludePaths         string[]     Exclude patterns (regex)
  IncludePaths         string[]     Include only patterns
  PathActions          array        Custom per-path handling
  PropertiesToPromote  array        Extract values to context
  SwapAxisOrder        bool         Swap X/Y axis order in geometry parsing (default false)

JsonParserConfig (extends TreeParserConfig):
  ProcessJsonNulls     bool         Create fields for null values
```

---

### XML Parser (`XmlParser`)

Same options as JSON parser but uses XPath-style paths. Both `IncludePaths` and `ExcludePaths` work.

#### Record Root Selection

```json
"MultipleRoots": [
    { "Path": "/root/product", "OutputKey": "products" },
    { "Path": "/root/product/variant", "OutputKey": "variants", "IncludeParentProperties": 20 }
]
```

#### Attribute Handling

XML attributes become columns automatically:

```xml
<product id="P1" category="Electronics">
    <name>Laptop</name>
</product>
```
Becomes: `id="P1"`, `category="Electronics"`, `name="Laptop"`

#### AttributeBasedNames — Use Attribute Values in Column Names

```json
"AttributeBasedNames": {
    "/track/dynamics": "cs"
}
```

```xml
<dynamics cs="COORD"><x>10</x><y>20</y></dynamics>
<dynamics cs="SPEED"><value>50</value></dynamics>
```
Becomes: `dynamics_COORD_x=10`, `dynamics_COORD_y=20`, `dynamics_SPEED_value=50`

Without this, column name collisions occur since both elements are named `dynamics`.

#### Include/Exclude Paths

```json
"ExcludePaths": ["/nitsRoot/product", "/nitsRoot/message/ConfidentialityInformation"],
"IncludePaths": ["/nitsRoot/message/track/*"]
```

#### Automatic GML to WKT Conversion

```xml
<gml:Point><gml:pos>40.75 -73.98</gml:pos></gml:Point>
```
Becomes: `POINT(-73.98 40.75)`

Supports: Point, LineString, Polygon, Envelope.

---

### Delimited Text Parser (`DelimitedTextParser`)

Every row is a record — no root path concept.

```json
"Options": {
    "Delimiter": ",",
    "SkipRows": 0,
    "KeepNewLine": false,
    "ExplicitColumnHeaders": null
}
```

| Option | Purpose |
|--------|---------|
| `Delimiter` | Column separator (`,`, `\t`, `;`, `\|`, etc.) |
| `SkipRows` | Skip N rows before the header row |
| `KeepNewLine` | Preserve newlines within quoted values |
| `ExplicitColumnHeaders` | Override: provide column names manually instead of reading from first row |

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

Binary format with embedded schema. Every Avro record becomes one MapLarge record. Nested `GenericRecord` objects are flattened with underscore-joined names. Union types (nullable fields): extracts the non-null value. No record root selection needed.

---

### YAML Parser (`YamlPipelineParser`)

Converts YAML to JSON internally, then delegates to JSON parser. Supports all `TreeParserConfig` options. **Plugin name is `YamlPipelineParser`, NOT `YamlParser`.**

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

### LiteralParser — Store Raw Message as a Single Field

Reads entire message as UTF-8 string, emits one record with one field. No parsing applied.

```json
"Options": {
    "Column": "raw_message"
}
```

- **`Column`** (required) — Output field name. One record per message.

---

### MessageContextParser — Records from Metadata Instead of Body

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

- **`ExtendedFields`** — Array of explicit column/value pairs. `Value` supports `{scope:property}` context references
- **`ConvertContextToColumns`** — When `true`, all context values with a two-part `scope::property` key become columns
- **`ContextScopeFilter`** — When `ConvertContextToColumns` is true, only context keys containing this substring are included

---

### KeyValuePairParser — Property-File Style Messages

Splits each line on a delimiter to extract key-value pairs; all pairs combined into one record.

```json
"Options": {
    "Delimiter": "=",
    "PreserveWhiteSpace": true
}
```

- **`Delimiter`** (required) — String used to split each line into key and value
- **`PreserveWhiteSpace`** — When `false`, trims whitespace from both key and value (default `true`)
- Lines not containing the delimiter are silently skipped
- Only the first occurrence of the delimiter is used as the split point

---

### Other Parsers

| PluginName | Format | Notes |
|------------|--------|-------|
| `WfsGmlParser` | OGC WFS GML | GML-specific parsing with geometry extraction. Extends `TreeParserConfig` |
| `LASWellLogParser` | Well log data | Specialized for LAS well log format |
| `RasterParser` | Raster imagery | Image/raster data parsing |
| `TiledImageryParser` | XYZ tiled images | Tile service imagery |
| `GdeltMasterListParser` | GDELT master list | Produces EVENTS, MENTIONS, GKG outputs (multiple output keys) |
| `GdeltEventFileParser` | GDELT events | GDELT event file format |
| `GdeltMentionsFileParser` | GDELT mentions | GDELT mentions file format |
| `GdeltGkgFileParser` | GDELT GKG | GDELT GKG file format |
| `GdeltLinksFileParser` | GDELT links | GDELT links file format |
| `GdeltSocialLinksListParser` | GDELT social links | GDELT social links format |
| `ObjectDetectionParser` | Video frames | Runs YOLO object detection on video frame bitmaps from message context. Config: `ModelURL`, `ModelType` |
| `VideoToMediaDataParser` | Video segments | Reads video segment metadata from context, wraps in MediaWrapper. No config |
| `PassThroughParser` | N/A | For connectors that already produce records — no parsing needed |

---

## How Nested Data Gets Flattened

JSON, XML, and Avro parsers all flatten the same way.

### Default Underscore-Joined Names

```json
{ "user": { "profile": { "name": "John", "age": 30 } } }
```
Becomes: `user_profile_name="John"`, `user_profile_age=30`

### SimplifyColumnNames = true

Uses leaf names only: `name="John"`, `age=30`. On collision, adds parent context: `user_name="John"`, `product_name="Widget"`.

### Array Values Get Numbered Suffixes

```json
{ "tags": ["red", "blue", "green"] }
```
Becomes: `tags1="red"`, `tags2="blue"`, `tags3="green"`

### Custom Column Names via PathActions

`"PathActions": [{"Path": "$.data.nested.value", "ColumnName": "my_custom_name"}]` — forces a specific column name regardless of nesting.

---

## Record Transforms

Steps with `"Type": "RecordTransform"`, placed between parser and committer. `Options` vary by plugin.

### FieldNameTransform — Rename/Filter Fields

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

- **`ExcludeFields`** — Array of field names to remove from the record
- **`IncludeFields`** — If set, only these fields are kept (whitelist mode). If null, all fields are kept minus excludes
- **`RenameFields`** — Dictionary mapping old field names to new names

### ExpressionTransform — Compute New Fields

Uses MapLarge's query expression engine (`DotNetExpTranslator`) — a **C#-like expression language**, not SQL or JavaScript.

#### Expression Syntax Rules

- **Field references:** bare names — `first_name`, not `[first_name]`
- **String literals:** single quotes — `'hello'`. Double quotes cause parse errors
- **`+` concatenation:** only works when both sides are `string`. Wrap non-string fields with `ToString()`
- **Conditional:** `Iif(condition, ifTrue, ifFalse)` or ternary `condition ? ifTrue : ifFalse`
- **Adding a capture timestamp:** If you just need a timestamp on every record, use `"AddTimestamp": true` in the committer's `ExtendedConfigJson` instead — it adds an `_ml_capture_timestamp` column automatically with no extra pipeline step. Only use `UtcNow()`/`CreateTimestamp()` in ExpressionTransform when you need the current time for a calculation or need it visible to downstream transforms

#### Available Functions (verified against source)

**IMPORTANT:** Function names are case-sensitive. `Now()`, `IsNullOrEmpty()`, `IsNotNullOrEmpty()` do **NOT** exist for strings — these are common mistakes. Use the exact names below.

**Type Conversions:**
`ToString(value)`, `ToInt(value)`, `ToLong(value)`, `ToDouble(value)`, `ToFloat(value)`

**Conditional:**
`Iif(condition, ifTrue, ifFalse)` — also available as ternary: `condition ? ifTrue : ifFalse`

**Null Handling:**
`IsNull(value)` / `IsNotNull(value)` — works on any type. `Nvl(value, default)` — returns default if null. `NullIf(value, nullCondition)` — returns null if value matches nullCondition. `Coalesce(v1, v2, ...)` — first non-null value

**String Functions:**
| Function | Description |
|----------|-------------|
| `IsEmpty(text)` | True if string is null or empty. **Use this, not `IsNullOrEmpty()`** |
| `IsNotEmpty(text)` | True if string is not null and not empty. **Use this, not `IsNotNullOrEmpty()`** |
| `Contains(text, search, insensitive)` | True if text contains search string (`insensitive` defaults to `true` — case-insensitive by default) |
| `StartsWith(text, search, caseSensitive)` | True if text starts with search (caseSensitive defaults to true) |
| `EndsWith(text, search, caseSensitive)` | True if text ends with search |
| `Replace(text, find, replacement, ignoreCase)` | Replace occurrences (`ignoreCase` defaults to `false`) |
| `Trim(text, characters)` | Remove leading/trailing whitespace, or specific `characters` if provided (default: whitespace) |
| `SubString(text, start, length)` | Extract substring |
| `IndexOf(text, search, startIndex)` | Position of search in text (`startIndex` defaults to `0`; returns -1 if not found) |
| `StrLength(text)` | Character count |
| `ToUpper(text)` / `ToLower(text)` | Case conversion |
| `Split(text, delimiter)` | Split string into array |
| `Like(text, pattern)` | SQL-style wildcards (`%`, `_`) |
| `IsMatchRegex(value, pattern, matchCase)` | .NET regex match, returns true/false |
| `ContainsAny(text, v1, v2, ...)` | True if text contains any of the provided values |
| `ContainsAll(text, v1, v2, ...)` | True if text contains all of the provided values |
| `PadLeft(number, totalWidth, paddingChar)` | Left-pad a number (int or double) to specified width with the given character |
| `LastIndexOf(text, search)` | Position of last occurrence of search in text (-1 if not found) |
| `CountOf(text, search, caseSensitive)` | Count occurrences of search in text (caseSensitive is required) |
| `Equals(text1, text2, caseSensitive)` | String equality check (`caseSensitive` defaults to `true`; use `Equals(a, b, false)` for case-insensitive) |
| `RegexMatch(text, pattern)` | Return first regex match |
| `RegexMatches(text, pattern, delimiter)` | Return all regex matches joined by delimiter (default `","`) |
| `RegexReplace(text, pattern, replacement)` | Replace regex matches |
| `RegexReplace2(input, pattern, output)` | Replace using named capture groups in output template |
| `FromJSON(text)` | Parse JSON string into columns |
| `FromCSV(text, delim, colNames)` | Parse CSV string into columns |
| `ToCSV(values...)` | Combine values into CSV string |
| `Encrypt(value)` / `Decrypt(value)` | Encrypt/decrypt string values |
| `MatchAndMapDelimited(match, matchIn, delim1, mapTo, delim2)` | Find `match` in delimited `matchIn` list, return value at same index from `mapTo` list. Returns empty string if no match |
| `ReverseContainsAll(text, delim, words...)` | True if all elements of delimited `text` appear in `words` |
| `RangeMatch(value, ranges)` | True if numeric value falls within comma-delimited ranges like `'1-10,20-25'` |
| `EqualsAny(value, v1, v2, ...)` | True if value matches any of the provided values |
| `EqualsNone(value, v1, v2, ...)` | True if value matches none of the provided values |
| `Choose(index, v1, v2, ...)` | Return value at 1-based index position |
| `SearchCSV(haystack, needle)` | Find `needle` in CSV `haystack`, return 0-based index (-1 if not found). `[CacheIndex]` auto-injected |
| `ContainsCSV(haystack, needle)` | Check if CSV `haystack` contains `needle`. Returns 1 (found) or 0 (not found). Overloads for string, int, and long needle. `[CacheIndex]` auto-injected |
| `StringSplitLength(value, separator, excludeEmpty)` | Count of parts after splitting `value` on `separator`. `excludeEmpty` controls whether empty entries are excluded |
| `RangesOverlap(ranges1, ranges2)` | True if two numeric range strings overlap (e.g., `RangesOverlap('1-10,20-25', '8-15')`) |
| `RangesEnumerate(ranges, strictAlphaMatching)` | Enumerate all values in a range string as comma-separated list (`strictAlphaMatching` defaults to `true`) |
| `CollapseToRanges(values)` | Collapse a comma-separated list of values into range notation (e.g., `'1,2,3,5,6'` → `'1-3,5-6'`) |
| `MultiValueEquals(val1, val2)` | Multi-value equality check between two strings |
| `ColorHash(input, alpha)` | Deterministic ARGB color from string, returned as `"A-R-G-B"` dash-separated string. `alpha` defaults to 255 |
| `Compare(a, b)` | Generic comparison returning int (-1, 0, 1) with null handling |

**Numeric/Math:**
`Floor(value)`, `Ceiling(value)`, `Round(value, decimalDigits)`, `Pow(value, exponent)`, `Sqrt(value)`, `Max(v1, v2, ...)`, `Min(v1, v2, ...)`, `Clamp(value, min, max)`, `Rand()` (0-1 double), `Rand(min, max)` (int), `NearestInt(value, step)`, `FormatNumber(value, format)`, `Threshold(value, t1, t2, ...)` (step-function: returns the last threshold the value exceeds, walking sorted thresholds in order), `StdDeviations(value, mean, stddev)` (number of standard deviations from mean), `NormalizeAngle(angle)` (normalize to -180..180), `CDF(value, mean, stdev)` (cumulative distribution function — returns the percentile of value on a bell curve)

**Date/Time:**
| Function | Description |
|----------|-------------|
| `UtcNow()` | Current UTC time as DateTimeOffset. **`Now()` does NOT exist** |
| `CreateTimestamp()` | Current UTC time as ISO 8601 string |
| `FormatDateTime(date, format)` | Format date using .NET format string |
| `ParseDateString(value, ignoreInvalid, format)` | Parse string to DateTime |
| `SecondsBetween(date1, date2)` | Seconds between two dates |
| `TotalDays(date1, date2)` / `TotalHours(...)` / `TotalMinutes(...)` / `TotalSeconds(...)` / `TotalMilliseconds(...)` | Time difference in specified unit |
| `TotalDays(date)` / `TotalHours(date)` / `TotalMilliseconds(date)` / etc. | Difference from UtcNow (single-arg) |
| `GetUnixTime(date)` | Convert to Unix timestamp |
| `FromUnixTimeSeconds(seconds)` / `FromUnixTimeMilliseconds(ms)` | Convert from Unix timestamp |
| `AddMilliseconds(date, ms)` / `AddTimeSpan(date, timespan)` | Date arithmetic |
| `Days(n)` / `Hours(n)` / `Minutes(n)` / `Seconds(n)` | Create TimeSpan values |
| `TruncateToYear(date)` / `TruncateToMonth(...)` / `TruncateToDay(...)` / `TruncateToHour(...)` / `TruncateToMinute(...)` / `TruncateToSecond(...)` | Truncate date to period |
| `WeekOfYear(date)` | Week number |
| `ToDayOfWeek(date)` | Day name |
| `ToTimeZone(date, tz)` / `ToLocalTime(date, tz)` / `ForceToTimeZone(date, tz)` | Time zone conversion |
| `GetLaterTimestamp(time1, time2)` | Return the later of two timestamps |
| `RoundTimeUp(date, span)` / `RoundTimeDown(date, span)` / `RoundTimeToNearest(date, span)` | Round time to interval |
| `TimeRangeOverlap(start1, end1, start2, end2)` | True if two date ranges overlap |
| `IsWithin(date1, date2, range)` | True if two dates fall within the given timespan |
| `DaysInMonth(year, month)` | Number of days in the given month (both args are integers) |
| `FormatTimeSpan(span)` | Format a TimeSpan as a readable string |
| `ToTimeSpan(string)` | Parse a string to a TimeSpan |
| `InterpolateTime(time, start, end)` | Interpolate a time value between two timestamps |
| `FormatHour(hour)` | Format hour (0-23) as string (e.g., `"12a"`, `"2p"`) |
| `FormatDayOfWeek(day)` | Format day-of-week number as string (e.g., `"Sun"`, `"Mon"`) |
| `CalculateSunAltitude(position, datetime)` | Sun altitude angle for a geographic point at a given time. `position` must be `GeoPointDouble` — wrap WKT strings with `PointFromWKT()` first |
| `CalculateLightStage(position, datetime)` | Light stage (`"Day"`, `"Twilight"`, or `"Night"`) for a geographic point at a given time. Same `PointFromWKT()` requirement as `CalculateSunAltitude` |

**Unit Conversion:**
`ConvertUnit(value, fromUnit, toUnit)` — convert between units by abbreviation (e.g., `ConvertUnit(distance, 'mi', 'km')`)

**GUID:**
`CreateGuid()` (returns Guid), `CreateGuidAsString()` (returns string), `CreateEmptyGuid()`, `GuidOffset(guid1, guid2)` (deterministic GUID derived from two input GUIDs; overloads for string and Guid inputs)

**JSON (for JSON-typed columns only):**
`GetJSONPathValue(json, path)`, `GetJSONPathValues(json, path)` (returns multiple matches), `GetJSONPathValueAsInt64(json, path)`, `GetJSONPathValueAsDouble(json, path)`, `GetJSONPathValueAsBoolean(json, path)`, `GetJSONPathValueAsDateTimeUtc(json, path)`, `StringToJSON(str)`, `IsNullOrEmpty(json)` / `IsNotNullOrEmpty(json)` — **these only work on JSON types, NOT strings**

```json
"Options": {
    "Expressions": {
        "full_name": "first_name + ' ' + last_name",
        "primary_key": "id + '@' + ToString(num)",
        "label_with_date": "name + '_' + ToString(timestamp)",
        "age_in_years": "floor((UtcNow() - birth_date) / 365)"
    },
    "SkipStringConversion": false,
    "OverwriteFieldNames": true
}
```

- **`Expressions`** — Dictionary where keys are output field names and values are expression strings. Reference record fields by bare name (e.g., `first_name`, not `[first_name]`)
- **`OverwriteFieldNames`** — When `true`, overwrites existing fields if the output name matches. When `false`, adds with a modified name (e.g., `fieldName1`) if the output name already exists
- **`SkipStringConversion`** — When `true`, keeps numeric results as-is. When `false` (default), converts all results to strings
- **`TreatMissingFieldsAsEmpty`** — When `true`, missing fields resolve as `null` instead of throwing `"Unable to find field"`. Despite the property name, the value is `null`, not empty string — arithmetic expressions on missing fields will need wrapping with `ToDouble()`, `Nvl()`, etc. (default: `false`)

#### Regex and Pattern Matching in ExpressionTransform

`IsMatchRegex(value, regexPattern, matchCase)` applies a .NET regular expression and returns `true`/`false`. This is available directly in `ExpressionTransform` — you do NOT need a separate `RegexTransform` step for pattern matching.

**Example — Match GUID pattern and filter/flag records:**

```json
"Options": {
    "Expressions": {
        "IsGuid": "IsMatchRegex(my_id_field, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', false)"
    },
    "SkipStringConversion": false
}
```

This creates a field `IsGuid` with value `"True"` or `"False"`. You can then use a `SkipRecordTransform` downstream to filter on it, or use it directly as a column.

**Example — Extract or validate multiple patterns in one step:**

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

#### Delimited String Functions — MatchAndMapDelimited, ReverseContainsAll

##### MatchAndMapDelimited — Map a Single Value via Positional Lookup

`MatchAndMapDelimited(match, matchIn, delimiter1, mapTo, delimiter2)` finds `match` in the `matchIn` delimited list, returns the value at the same index from the `mapTo` delimited list. Both lists are aligned by position. Returns empty string if no match.

**Example 1 — Status code to label:**
```
MatchAndMapDelimited(status, '1|2|3', '|', 'Active|Pending|Closed', '|')
```
Input `status` = `"2"` → matchIn `["1","2","3"]` → index 1 → mapTo `["Active","Pending","Closed"]` → **`"Pending"`**

**Example 2 — Numeric code to WABCD label:**
```
MatchAndMapDelimited(code, '7|4|5', '|', 'SABCD-F|SABCD-U|WABCD', '|')
```
Input `code` = `"4"` → index 1 → **`"SABCD-U"`**

**Example 3 — No match returns empty string:**
```
MatchAndMapDelimited(region, 'US,EU,AP', ',', 'Americas,Europe,Asia-Pacific', ',')
```
Input `region` = `"AF"` → not found → **`""`**

The two delimiters can be different characters — `delimiter1` splits `matchIn`, `delimiter2` splits `mapTo`. In practice they're usually the same.

##### ReverseContainsAll — Check Token Subset Membership

`ReverseContainsAll(text, delim, words...)` splits `text` by `delim` and checks that **every token** appears in `words`. Think of it as: "is the token set from `text` a subset of `words`?"

**Examples with `text` = `"7 4 5"`, `delim` = `" "`:**

| Expression | Result | Why |
|---|---|---|
| `ReverseContainsAll(field, ' ', '7')` | **false** | `"4"` not in words |
| `ReverseContainsAll(field, ' ', '7', '4')` | **false** | `"5"` not in words |
| `ReverseContainsAll(field, ' ', '7', '4', '5')` | **true** | all tokens found |
| `ReverseContainsAll(field, ' ', '7', '4', '5', '9')` | **true** | all tokens found (extra words OK) |
| `ReverseContainsAll(field, ' ', '11')` | **false** | exact match per token — `"7"` ≠ `"11"` |

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
|---|---|---|
| `"6"` | `"SABCD-E;"` | Single match |
| `"7 4 5"` | `"SABCD-F;SABCD-U;WABCD;"` | Three matches |
| `"11 7 4 5"` | `"SABCD-F;SABCD-U;WABCD;SABCD-K;"` | `11` matches correctly, doesn't false-match `1` |
| `"17"` | `""` | `7` does NOT false-match inside `17` — regex boundaries work |

**Why not simpler alternatives?**
- `Contains(codes, '7')` — substring match, so `Contains('17', '7')` = true (wrong)
- `Replace()` chains — `Replace('11', '1', 'X')` corrupts multi-digit codes
- `MatchAndMapDelimited()` — maps a single value only, not a multi-token string
- `Split()` — splits the string but there's no way to iterate/map/rejoin results

**Limitations of the regex approach:**
1. **Trailing semicolon** — every match appends `';'`, no `TrimEnd()` available in expressions
2. **Output order is hardcoded** — determined by expression order, not input order. `"5 4 7"` and `"7 4 5"` produce identical output
3. **Every code must be hardcoded** — new codes require updating the expression
4. **Expression gets long fast** — each code adds ~50 characters; unwieldy past ~20 codes

**Better alternatives if limitations matter:**
- Do the mapping at **query time** instead — same functions available plus JOINs
- Use a **custom RecordTransform plugin** for proper split-map-rejoin
- **Pre-normalize the source data** — one record per code instead of a delimited list

#### Geo Functions Available in ExpressionTransform

The expression engine has full access to MapLarge's geospatial functions. These work on geometry objects — WKT string fields must be converted first using `ShapeFromWKT()`, `LineFromWKT()`, or `PointFromWKT()`.

##### WKT Conversion Functions (String → Geometry)

These functions convert WKT strings (e.g., output from `EllipseToWKTTransform`) into typed geometry objects that other geo functions can operate on:

| Function | Input | Returns | Description |
|----------|-------|---------|-------------|
| `ShapeFromWKT(wkt_field)` | WKT string (POLYGON, MULTIPOLYGON) | `ShapeSetDouble` | Convert WKT polygon/multipolygon to a shape object |
| `LineFromWKT(wkt_field)` | WKT string (LINESTRING, MULTILINESTRING) | `LineSet` | Convert WKT line to a line object |
| `PointFromWKT(wkt_field)` | WKT string (POINT) | `GeoPointDouble` | Convert WKT point to a point object |

> **`GeoFromWKT` is NOT available in ExpressionTransform.** The pipeline uses `QueryEngine.Expressions` where `GeoFromWKT` is private. Use `ShapeFromWKT()`, `LineFromWKT()`, or `PointFromWKT()` instead.

##### Measurement Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `Area(shape)` | Geodesic area of a polygon | `double` (km²) |
| `Buffer(line_or_shape, radiusMeters)` | Buffer a geometry by a distance | shape geometry |
| `GeoDistance(a, b, unit)` | Geodesic distance between geometries | `double` (unit: `'m'`, `'km'`, `'mi'`, `'nmi'`) |
| `DistanceBetween(p1, p2, unit)` | Distance between two points | `double` (unit: `'M'`, `'K'`, `'N'`) |
| `CreateCircle(point, radiusMeters)` | Create a circle polygon | shape geometry |

##### Using Area() in ExpressionTransform

`Area()` requires `ShapeSetDouble`, not a string. WKT fields must be converted with `ShapeFromWKT()` first:

| Expression | Works? | Why |
|---|---|---|
| `Area(EllipseWKT)` | **No** | `Area()` has no `string` overload — throws `"no overload for argument System.String"` |
| `Area(GeoFromWKT(EllipseWKT))` | **No** | `GeoFromWKT` is private in the QueryEngine expression scope — not callable |
| `Area(ShapeFromWKT(EllipseWKT))` | **Yes** | `ShapeFromWKT` converts WKT string to `ShapeSetDouble`, which `Area()` accepts |

**Example — Compute area from an ellipse WKT field in the pipeline:**

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

**At query time** (after import), `ShapeFromWKT()` is not needed — the column is already typed:
```sql
SELECT *, Area(geometry_ellipse) AS AreaKmSq, Area(geometry_ellipse) * 0.291553 AS AreaNmiSq FROM MyAccount/MyTable
```

**Example — Distance between two points:**

```json
"Options": {
    "Expressions": {
        "DistNmi": "GeoDistance(StartPoint, EndPoint, 'nmi')"
    }
}
```

### DelimitedToWKTTransform — Delimited Coordinate String to WKT Geometry

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

- **`Fields`** — Array of record field names to apply this transform to. Each field's string value is split on delimiters and parsed as coordinates
- **`Coordinates`** — Defines the **axis order** within the delimited string (default: `["x", "y"]`). Use `["y", "x"]` when the field has latitude before longitude (e.g., `"40.75,-73.98"` where 40.75 is lat)
- **`WKTName`** — WKT geometry type: `"Point"`, `"LineString"`, or `"Polygon"`
- **`OutputName`** — Name of the output WKT column (if null, overwrites the original field)
- **`Delimiters`** — Array of delimiter strings to split on (default: `[",", " "]`)
- **`ExpandExtents`** — When `true` and `WKTName` is `"Polygon"`, converts a 2-point diagonal extent into a rectangle (default: `false`). Antimeridian (±180° longitude) wrapping is handled automatically

### CrsTransform — Coordinate Reference System Conversion

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

**`Transformers`** — Dictionary where each key is a field name (or complex field like `lon|lat|z`) and each value is an array of CRS conversion rules:

- **`InputCrs`** — Input coordinate system (e.g., `"epsg:4326"` for WGS84)
- **`OutputCrs`** — Output coordinate system (e.g., `"epsg:3857"` for Web Mercator)
- **`OutputPostFix`** — Suffix appended to the input field name for the output (e.g., `"_3857"` → `geometry_3857`)

**Field name formats:** Simple (`"geometry"` = WKT string), complex (`"lon|lat"` = pipe-separated numeric fields), 3D (`"lon|lat|z"`). Multiple conversions per field are supported; original is preserved. Order must be **lon-lat** (not lat-lon).

### ExtendRecordTransform — Add Fields Not in the Incoming Data

```json
"Options": {
    "ExtendedFields": [
        { "ColumnName": "source_system", "Value": "kafka-prod" },
        { "ColumnName": "topic", "Value": "{streaming_msg:topic}" },
        { "ColumnName": "pipeline_version", "Value": "v2.1" }
    ],
    "AddContextProperties": false,
    "SensitiveDataHandling": "Mask",
    "AddTimestamp": true
}
```

**`ExtendedFields`** — An array of columns to add to every record:
- `ColumnName`: The column name to add
- `Value`: Either a literal string (`"kafka-prod"`) or a message context reference using `{scopename:valueid}` syntax (e.g., `"{streaming_msg:topic}"` pulls the `topic` property from the `streaming_msg` context scope)

**`AddContextProperties`** — When `true`, copies all message context properties as columns on the record. `SensitiveDataHandling` controls how sensitive values appear (`"Mask"` by default).

**`AddTimestamp`** — When `true`, adds an `_ml_capture_timestamp` column with the current UTC time in ISO 8601 format.

#### Stubbing Missing Fields

Place `ExtendRecordTransform` **before** transforms that need a field to guarantee it exists with a default. If the field already exists, a duplicate is created (committer resolves: last value wins).

**Transforms that throw on missing fields:**

| Transform | Error When Field Missing | Fix |
|-----------|------------------------|-----|
| **ExpressionTransform** | `"Unable to find field for expression variable '{name}'"` — throws for ANY referenced field, even inside `Iif()` or ternary expressions. | Set `TreatMissingFieldsAsEmpty: true`, or stub fields with `EnsureFieldsTransform` (preferred) or `ExtendRecordTransform` |
| **MagneticDeclinationTransform** | `InvalidOperationException` from `.First()` — crashes if WKT, lat, lng, altitude, or time fields are missing. No graceful fallback. | Stub all input fields |
| **TableLookupTransform** | `"Key Field {item} not found in incoming record"` — throws unless `IgnoreErrors: true` | Stub key fields, or set `IgnoreErrors: true` |
| **DMLStatementCommitter** | `"Could not find message field {name}"` — throws if any `{field:name}` placeholder references a missing field | Stub all fields referenced in `StatementTemplate` |
| **EllipseToWKTTransform** | `"Ellipse not fully parameterized"` — throws only when `FailOnMissingParameters: true` | Set `FailOnMissingParameters: false`, or stub fields |
| **SectorToWKTTransform** | `"Sector not fully parameterized"` — same pattern | Same fix |
| **ECEFTransform** | `"ECEF not fully parameterized"` — same pattern | Same fix |

**Example — Stub fields before ExpressionTransform:**

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

> **Caveat: Duplicate field names.** If the field already exists, `ExtendRecordTransform` creates a duplicate. Most transforms and committers handle duplicates (last wins). But **ExpressionTransform crashes on duplicates** (`ToDictionary()` on input fields throws `ArgumentException`). **Preferred alternatives:** Use `EnsureFieldsTransform` (no duplicates) or set `TreatMissingFieldsAsEmpty: true` on `ExpressionTransform`. Legacy workaround: use `SkipRecordTransform` first to drop records that already have the field.

### EnsureFieldsTransform — Stub Missing Fields Without Duplicates

Ensures that specified fields exist on every record. If a field is missing, it is added with an empty string value. If the field already exists, it is **not** duplicated (uses case-insensitive HashSet check). This is the preferred alternative to `ExtendRecordTransform` when you need to guarantee field presence before `ExpressionTransform`.

```json
"Options": {
    "Fields": ["agency", "shelter_type", "ridership", "ada_accessible"]
}
```

- **`Fields`** — Array of field names to ensure exist on each record. Missing fields are added with empty string values; existing fields are left unchanged.

**Example — Safe field stubbing before ExpressionTransform:**

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

### SkipRecordTransform — Conditionally Drop Records

Drops records where **any** condition is true:

```json
"Options": {
    "SkipWhen": [
        { "FieldName": "status", "Condition": "Equals", "Value": "deleted" },
        { "FieldName": "geometry", "Condition": "NotExists" }
    ]
}
```

| Condition | Drops the record when... |
|-----------|--------------------------|
| `Exists` | The field exists on the record |
| `NotExists` | The field does NOT exist on the record |
| `Equals` | The field value equals `Value` |
| `NotEquals` | The field value does NOT equal `Value` |
| `EqualsAny` | The field value matches any of the comma-separated values in `Value` |
| `NotEqualsAny` | The field value does NOT match any of the comma-separated values in `Value` |

`Equals`/`NotEquals` use **case-sensitive** comparison (`==`/`!=`). `EqualsAny`/`NotEqualsAny` use **case-insensitive** comparison (`StringComparison.InvariantCultureIgnoreCase`). `Exists`/`NotExists` do not use `Value`.

### SplitDelimitedTransform — Split One Field into Multiple Columns

```json
"Options": {
    "FieldNames": ["location"],
    "Delimiters": [","],
    "OutputNames": ["city", "country"],
    "SuffixOutput": false
}
```

- **`FieldNames`** — Array of field names to split
- **`Delimiters`** — Array of delimiter strings to split on (default: `[" ", ","]`)
- **`OutputNames`** — Names for the resulting columns, applied in order. If there are more tokens than names, extra tokens are ignored. If null, generates names like `location_1`, `location_2`
- **`SuffixOutput`** — When `true` and `OutputNames` is set, appends the output name to the original field name (e.g., `locationcity`) instead of replacing it

### EmbeddedJsonTransform — Parse JSON Inside a String Field

Parses a JSON string field and expands its properties into separate record columns.

```json
"Options": {
    "FieldToExpand": "payload_json",
    "ReplaceMesage": false,
    "UseLastRecord": false,
    "SimplifyColumnNames": true
}
```

- **`FieldToExpand`** — The field name containing the embedded JSON string
- **`ReplaceMesage`** — When `true`, replaces the entire record with only the fields from the embedded JSON. When `false` (default), appends the parsed fields to the existing record. (Note: the property name has a typo — `Mesage` not `Message` — this is how it appears in the source code)
- **`UseLastRecord`** — When the embedded JSON parses to multiple records, use the last one instead of the first (default `false`)
- This transform inherits all `TreeParserConfig` options (`SimplifyColumnNames`, `ExcludePaths`, `RecordRootPath`, etc.) so you can control how the embedded JSON is parsed

#### GeoJSON String to WKT Conversion

Internally creates a `JsonParser`, so GeoJSON auto-detection converts `type`+`coordinates` objects to WKT automatically.

```json
{
    "StepName": "ConvertGeoJson",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "EmbeddedJsonTransform",
    "Options": {
        "FieldToExpand": "geojson_column",
        "ReplaceMesage": false,
        "RecordRootPath": "$"
    },
    "Transitions": [{ "ToStep": "NextStep" }]
}
```

Set `ReplaceMesage: false` to keep existing fields and append the WKT geometry. This is the only way to convert GeoJSON-to-WKT in a pipeline (no dedicated transform or expression function exists).

### TableLookupTransform — Enrich Records from an Existing Table (LUT)

Full lookup table (JOIN at ingest time) — status code mappings, reference data enrichment, any key→value translation.

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

- **`LookupAccount`** / **`LookupTable`** — The MapLarge table to look up against
- **`KeyColumns`** — Column names in the lookup table that form the lookup key
- **`KeyFields`** — Values from the incoming record to match against `KeyColumns`. Use `field:FieldName` syntax to reference a record field's value
- **`FetchColumns`** — Dictionary mapping lookup table column names (keys) to output field names (values) for the columns to retrieve
- **`DefaultFetchColumnValues`** — Default values when the lookup doesn't find a match (keys must be the **source column names** — i.e., the keys of `FetchColumns`, not the output names). **Bug note:** when the default matches, the output field is named using the source column name (`fetch.Key`), not the dest name (`fetch.Value`). When it doesn't match, the field is named using the dest name with an empty string value
- **`IgnoreErrors`** — When `true`, returns the record with default values if the lookup fails. When `false` (default), throws an exception

**Important:** `KeyColumns` must match the lookup table's **primary key** (uses PK index for fast retrieval; mismatched columns throw an error). Supports composite keys (multiple `KeyColumns`/`KeyFields`) and multiple fetch columns.

**Example — Status code LUT:**

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

**Missing table behavior:** When `IgnoreErrors: true`, TableLookupTransform handles a **nonexistent target table** gracefully — every record passes through with `DefaultFetchColumnValues` applied. The lookup info is evaluated once per poll (not per record), so even if the downstream committer creates the table mid-poll, lookups won't start working until the next poll cycle. This makes it safe to use in pipelines that write to and read from the same table without pre-creating it.

**Example — Per-record freshness filtering (skip unchanged records):**

Use TableLookupTransform + ExpressionTransform + SkipRecordTransform to compare each incoming record's timestamp against what's already committed, and skip records that haven't changed. Useful when the source API doesn't support server-side "modified since" filtering.

**Caution — `GetDefaultResult` field naming bug:** When `DefaultFetchColumnValues` matches, the output field is named using the **source** column name (`FetchColumns` key), not the dest name (`FetchColumns` value). To avoid field name collisions between the incoming record and the default, use a dedicated column in the target table for the lookup (e.g., store the timestamp as `last_committed_modified` in the target table, not `modified`).

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
        "FetchColumns": { "last_committed_modified": "existing_modified" },
        "DefaultFetchColumnValues": { "last_committed_modified": "1970-01-01T00:00:00Z" },
        "IgnoreErrors": true
    },
    "Transitions": [{ "ToStep": "compareModified" }]
},
{
    "StepName": "compareModified",
    "Type": "RecordTransform",
    "Application": "MapLargeCore",
    "PluginName": "ExpressionTransform",
    "Options": {
        "Expressions": {
            "is_newer": "modified > existing_modified ? \"true\" : \"false\""
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
    "Transitions": [{ "ToStep": "commit" }]
}
```

On the first run (table doesn't exist), `IgnoreErrors: true` causes every lookup to return `last_committed_modified: "1970-01-01T00:00:00Z"` (named using the source column name due to the bug), so all records pass through and the committer creates the table. On subsequent polls, only records with a newer `modified` value are committed. The committer should use `PrimaryKeyColumns: ["id"]` with `Append: true` to upsert. You will also need an ExpressionTransform or ExtendRecordTransform step before the committer to copy `modified` into `last_committed_modified` so the lookup column stays in sync.

**Note:** The `modified > existing_modified` comparison in ExpressionTransform works correctly for ISO 8601 date strings (lexicographic ordering matches chronological ordering). For non-sortable date formats, parse to a comparable type first.

### RegexTransform — Apply Regex Patterns to Fields

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

**`Transformers`** — Dictionary where each key is a field name and each value defines the regex rule:

- **`Pattern`** — Regular expression to match
- **`Replacement`** — Replacement string (supports capture groups: `$1`, `$2`, etc.)
- **`NewProperty`** — If set, writes the result to a new field with this name instead of overwriting the original
- **`DefaultIfNoRegexMatch`** — Value to use when the pattern doesn't match the input (default: empty string)

### FieldTrackingTransform — Deduplicate / Incremental Import

Tracks a field value and skips records not greater than the last seen value (high water mark).

```json
"Options": {
    "TrackingFieldName": "last_modified",
    "DateFormatString": "yyyy-MM-dd'T'HH:mm:ss.fffZ",
    "DateTimeGracePeriodSeconds": 300,
    "TrackOnlyDoNotFilter": false
}
```

- **`TrackingFieldName`** — The field to track (must be a date, integer, or decimal)
- **`DateFormatString`** — Custom date format string for parsing the tracking field (uses .NET DateTime format). If omitted, uses `DateTime.TryParse`
- **`DateTimeGracePeriodSeconds`** — Applies to both record rejection and high-water-mark updates. Records are rejected if `currentDate + gracePeriod <= lastDate`. Also only updates the tracked high water mark when the new value exceeds the previous by this many seconds. Prevents rapid updates from near-identical timestamps (default: 0)
- **`TrackOnlyDoNotFilter`** — When `true`, tracks the value but does not skip records. Useful if you want to observe the field's progression without filtering (default: `false`)

### Geometry Transforms

Convert domain-specific geometry representations to WKT. Only needed when data is not GeoJSON or GML (those are auto-detected by parsers).

#### EllipseToWKTTransform — Geodesic Ellipse Parameters to WKT Polygon

Generates a geodesic ellipse (MULTIPOLYGON WKT) on WGS84 from center, axes, and orientation. Antimeridian crossing is handled automatically.

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
    "AxisScale": 1,
    "AxisUnits": "m",
    "StepSizeDegrees": 4,
    "OrientationOrigin": "CWN",
    "FailOnMissingParameters": false,
    "Adaptive": false
}
```

- **`CenterLatitudeField`** / **`CenterLongitudeField`** — Record fields for the center point (alternatively use `CenterWKTField` for a WKT point)
- **`MajorAxisField`** / **`MinorAxisField`** — Record fields for the ellipse axes. Can be the same field for a circle
- **`OrientationAngleField`** — Record field for the rotation angle (optional, defaults to 0)
- **`OutputShapeField`** — Name of the output WKT column (default: `"EllipseWKT"`)
- **`AngleType`** — `"Degrees"` or `"Radians"` (default: `"Degrees"`)
- **`OrientationOrigin`** — `"CWN"` (clockwise from North) or `"CCWE"` (counter-clockwise from East) (default: `"CWN"`)
- **`AxisUnits`** — Unit for axis values. Supports: `"m"` (meters), `"km"` (kilometers), `"mi"` (miles), `"nmi"` (nautical miles), `"ft"` (feet), `"yd"` (yards), `"in"` (inches), `"cm"` (centimeters). Default: `"m"`
- **`AxisScale`** — Multiplier applied to axis values (default: 1)
- **`StepSizeDegrees`** — Angular step for polygon point generation (default: 4, meaning ~90 points around the ellipse)
- **`Adaptive`** — When `true`, uses an iterative algorithm to optimize point count while preserving visual quality
- **`FailOnMissingParameters`** — When `true`, throws if required fields are missing. When `false` (default), returns the record **unchanged** — the `OutputShapeField` is **not added** to the record (see [Absent Fields vs Null-Valued Fields](#absent-fields-vs-null-valued-fields))
- **Antimeridian handling is automatic** — polygons crossing ±180° longitude are split into valid sub-polygons. No extra configuration needed

> **Handling missing output fields downstream.** When `FailOnMissingParameters: false` and parameters are missing, the record is returned unchanged — the output field is **not added**. Downstream transforms that reference the output field will throw (e.g., `ExpressionTransform` throws "Unable to find field").
>
> **Solutions:**
>
> **Option A (recommended) — Filter before transform:** `SkipRecordTransform` BEFORE `EllipseToWKTTransform` drops records missing input fields. Then set `FailOnMissingParameters: true` so downstream steps can safely assume valid WKT.
> ```json
> {"StepName": "RequireEllipseInputs", "Type": "RecordTransform", "PluginName": "SkipRecordTransform",
>  "Options": {"SkipWhen": [
>      {"FieldName": "lat", "Condition": "NotExists"},
>      {"FieldName": "lng", "Condition": "NotExists"},
>      {"FieldName": "semi_major", "Condition": "NotExists"},
>      {"FieldName": "semi_minor", "Condition": "NotExists"}
>  ]}},
> {"StepName": "BuildEllipse", "Type": "RecordTransform", "PluginName": "EllipseToWKTTransform",
>  "Options": {"CenterLatitudeField": "lat", "CenterLongitudeField": "lng", "MajorAxisField": "semi_major", "MinorAxisField": "semi_minor", "OutputShapeField": "geometry_ellipse", "FailOnMissingParameters": true}},
> {"StepName": "ComputeArea", "Type": "RecordTransform", "PluginName": "ExpressionTransform",
>  "Options": {"Expressions": {"AreaKmSq": "Area(ShapeFromWKT(geometry_ellipse))"}}}
> ```
>
> **Option B — Stub output field:** `ExtendRecordTransform` adds empty default before the transform. On success, duplicate field created (committer resolves: last wins). **Caveat:** `ExpressionTransform` crashes on duplicates — compute Area at **query time** instead.
> ```json
> {"StepName": "DefaultEllipse", "Type": "RecordTransform", "PluginName": "ExtendRecordTransform",
>  "Options": {"ExtendedFields": [{"ColumnName": "geometry_ellipse", "Value": ""}]}},
> {"StepName": "BuildEllipse", "Type": "RecordTransform", "PluginName": "EllipseToWKTTransform",
>  "Options": {"CenterLatitudeField": "lat", "CenterLongitudeField": "lng", "MajorAxisField": "semi_major", "MinorAxisField": "semi_minor", "OutputShapeField": "geometry_ellipse", "FailOnMissingParameters": false}}
> ```
>
> **Option C — `FailOnMissingParameters: true`:** Strictest. Missing fields fail the entire message. Only use when all records have required fields.
>
> **Option D — Query-time Area:** Skip pipeline `ExpressionTransform`; after import, `Area()` works directly: `SELECT *, Area(geometry_ellipse) AS AreaKmSq FROM MyAccount/MyTable`

#### LOBToWKTTransform — Geodesic Line of Bearing to WKT LineString

Generates a geodesic LINESTRING from start point, bearing, and distance.

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
    "UseGreatCircle": true
}
```

- **`StartLatitudeField`** / **`StartLongitudeField`** — Record fields for the start point (alternatively use `StartWKTField`)
- **`BearingField`** — Record field for the bearing angle (required)
- **`DistanceField`** — Record field for the line distance (optional — if missing, uses `DistanceScale` as the distance)
- **`OutputLineField`** — Name of the output WKT column (default: `"BearingWKT"`)
- **`UseGreatCircle`** — When `true` (default), interpolates 20 points along a great circle arc. When `false`, produces a simple two-point line
- **`DistanceUnits`** — Unit for distance values. Supports: `"m"` (meters), `"km"` (kilometers), `"mi"` (miles), `"nmi"` (nautical miles), `"ft"` (feet), `"yd"` (yards). Default: `"m"`
- **`DistanceScale`** — Multiplier applied to distance values (default: 1)

#### SectorToWKTTransform — Geodesic Sector/Wedge to WKT Polygon

Generates a geodesic MULTIPOLYGON sector from center, diameter, orientation, and sector angle. Reuses ellipse logic; antimeridian splitting automatic.

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
    "DiameterScale": 1,
    "StepSizeDegrees": 4,
    "FailOnMissingParameters": false
}
```

- **`SectorAngleField`** — Record field for the wedge angle (e.g., 90 = quarter circle)
- **`DiameterField`** — Record field for the sector radius
- All other options work the same as `EllipseToWKTTransform`

#### ECEFTransform — Earth-Centered Earth-Fixed XYZ to Lat/Lng

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

- **`XField`** / **`YField`** / **`ZField`** — Record fields for the ECEF coordinates (all three required)
- **`Unit`** — `"m"` or `"km"` (default: `"m"`)
- **`OutputPointField`** — Name of the output WKT point column (default: `"XY"`)
- **`OutputAltitudeField`** — Name of the output altitude column in meters (default: `"Altitude"`)

#### ArcGisGeometryTransform — ArcGIS Geometry Fields to WKT

Zero-config (`"Options": {}`). Auto-detects ArcGIS geometry fields by suffix (case-insensitive):

| Field suffix | Output WKT type |
|-------------|-----------------|
| `geometry_x` + `geometry_y` | `POINT (x y)` |
| `geometry_paths` / `geometry_line` | `LINESTRING` |
| `geometry_points` | `MULTIPOINT` |
| `geometry_rings` | `POLYGON` |
| `geometry_polyline` | `MULTILINESTRING` |
| `geometry_polygon` | `MULTIPOLYGON` |

Multiple geometry types per record supported. Non-geometry fields pass through.

#### SimplifyTransform — Reduce Geometry Point Count

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

- **`Transformers`** — Dictionary where each key is a geometry field name and the value is an array of simplification rules
- **`FieldType`** — `"shapeset"` for polygons, `"lineset"` for lines
- **`OutputFieldName`** — Name of the output field (can be same as input to overwrite)
- **`Tolerance`** — Maximum distance points can deviate from the original line (units depend on input CRS — degrees for WGS84, meters for projected)
- **`DoNotOverSimplify`** — When `true`, iteratively halves the tolerance until the result has more than 6 points, preventing degenerate shapes (default: `false`)

#### LineToWKTTransform — Two Points to WKT LineString

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

- **`StartLatitudeField`** / **`StartLongitudeField`** — Record fields for the start point (alternatively use `StartWKTField` for a WKT POINT string)
- **`EndLatitudeField`** / **`EndLongitudeField`** — Record fields for the end point
- **`OutputLineField`** — Name of the output WKT column (default: `"BearingWKT"`)
- **`UseGreatCircle`** — When `true` (default), interpolates points along the great-circle arc. When `false`, produces a simple two-point line
- **`Steps`** — Number of intermediate arc points (default: 20, only used when `UseGreatCircle` is `true`)
- Antimeridian handling automatic (produces MULTILINESTRING). Unparseable coordinates pass through unchanged
- Typical use: AIS/radar track segments from previous+current positions

#### RemoveInnerRingsTransform — Strip Polygon Holes

Removes inner rings (holes) from polygon WKT geometry, leaving only the outer boundary. Modifies the field in-place.

```json
"Options": {
    "GeoColumn": "boundary",
    "Method": "ShapeSet"
}
```

- **`GeoColumn`** — Name of the field containing polygon WKT (if null/empty, record passes through unchanged)
- **`Method`** — Parsing strategy: `"ShapeSet"` (default, handles all geometry types) or `"WktExtractor"` (handles POLYGON only)

### Additional Record Transforms

These transforms cover more specialized use cases:

#### TableFieldNameTransform — Dynamic Field Renames from a Lookup Table

Renames record fields using a mapping stored in a MapLarge table. The lookup is cached and refreshed when the table version changes.

```json
"Options": {
    "LookupAccount": "config",
    "LookupTable": "field_mappings",
    "SourceColumn": "original_name",
    "RenameColumn": "mapped_name"
}
```

- **`LookupAccount`** / **`LookupTable`** (required) — MapLarge table containing the rename mappings
- **`SourceColumn`** (required) — Column in the lookup table holding original field names
- **`RenameColumn`** (required) — Column in the lookup table holding desired new field names
- All four properties are validated at configuration time; missing values throw immediately

Use this when field rename mappings need to be managed through the MapLarge UI rather than by editing pipeline config JSON.

#### GeoFieldNameTransform — Rename Geo Column to MapLarge Canonical Format

Optional transform. Renames geo column per the canonical naming table in [Geometry Column Naming](#geometry-column-naming--how-the-import-engine-names-geo-columns).

```json
"Options": {
    "TableName": "my_table",
    "GeoColumn": "geometry"
}
```

- **`TableName`** (required) — Table name (supports `{scope:property}` syntax). Used to derive canonical geo column name
- **`GeoColumn`** (required) — Current geo field name (case-insensitive match)

**Important:** Renaming is **per-record** based on WKT type inspection. Mixed geometry types produce different column names per record — separate geometry types first with `SkipRecordTransform` or `TransitionGuard`.

#### HttpEncodeTransform — URL-Encode Field Values

URL-encodes field values and adds them as new columns. Values can reference context variables using `{scope:name}` syntax.

```json
"Options": {
    "ConvertFields": [
        { "ColumnName": "encoded_id", "Value": "{streaming_msg:record_id}" }
    ]
}
```

- **`ConvertFields`** — Array of `{ColumnName, Value}` pairs. Each `Value` is URL-encoded and stored in `ColumnName`

#### MagneticDeclinationTransform — Compute Magnetic Variation

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

- **`MagneticModelTable`** (required) — MapLarge table containing WMM spherical harmonic coefficients
- **`InputWktField`** — WKT POINT field for location (mutually exclusive with lat/lng fields)
- **`InputLatField`** / **`InputLngField`** — Separate lat/lng fields (mutually exclusive with `InputWktField`)
- **`InputTimeField`** — Timestamp field (if omitted, uses current UTC time)
- **`InputAltitudeField`** — Altitude in meters (if omitted, computes at sea level)
- **`OutputField`** — Output column name (default: `"Declination"`)
- **`MagneticModelName`** — Specific WMM model name (if null, uses the model applicable to the record's date)

#### HtmlSourceTransform

Fetches HTML from a URL stored in a record field and parses the content into additional fields. Niche use case for web scraping within a pipeline.

#### FetchImageFromS3Transform — Fetch S3 Images into Records

Fetches an image from AWS S3 and appends it as a binary imagery field. S3 key, bucket, region, and credentials can be resolved dynamically from context variables. Optionally geo-registers the image using a bounding-box field.

```json
"Options": {
    "Bucket": "my-imagery-bucket",
    "Key": "{s3:key}",
    "Region": "us-east-1",
    "AccessKey": "...",
    "SecretKey": "...",
    "BoundingBox": "extent_wkt",
    "OutputColumnName": "Image"
}
```

Niche — for satellite/aerial imagery pipelines where each message references an S3 image object.

#### VideoToTableDataTransform

Converts a video frame bitmap from the message context into a geo-registered image field. Config has only `ShapeWKT` (optional polygon WKT for the image footprint). Output column is hardcoded as `"frame"`. Niche — for video frame ingestion pipelines.

---

## Stream Transforms

Operate on raw byte streams (`"Type": "StreamTransform"`). Typically placed before a parser.

| Plugin | Purpose |
|--------|---------|
| `JSONDisassemblerStreamTransform` | Extract JSON subtrees, promote properties to context |
| `MultipleJsonStreamSplitTransform` | Split concatenated JSON objects (see below) |
| `ContextVariableStreamTransform` | Transform context variables (see below) |

**Download Transforms** — Fetch data from remote storage when the connector delivers a reference (key, path, URL) rather than the data itself:

| Plugin | Purpose |
|--------|---------|
| `DownloadFromS3Transform` | Fetch files from AWS S3 |
| `DownloadFromAzureTransform` | Fetch from Azure Blob Storage |
| `DownloadFromGCSTransform` | Fetch from Google Cloud Storage |
| `DownloadFromStorageGridTransform` | Fetch from NetApp StorageGrid (S3-compatible). Config: `EndpointUrl`, `NoVerifySsl`, `DeleteAfterConsume` |
| `DownloadFromSFTPTransform` | Fetch from SFTP server. Uses `SFTPConnector.Config` (same config as the SFTP connector). Reads file path from the `SFTPConnector` context scope |
| `WebDownloadTransform` | HTTP(S) downloads |

**Archive/Compression Transforms** — Extract or decompress archives. `UnzipTransform` and `UntarTransform` both support `IncludeRegexes` and `ExcludeRegexes` arrays for filtering entries by name:

| Plugin | Purpose |
|--------|---------|
| `UnzipTransform` | Decompress ZIP files. Config: `IncludeRegexes[]`, `ExcludeRegexes[]`. Each matching entry emitted as a separate message |
| `GUnzipTransform` | Decompress gzip streams |
| `UntarTransform` | Extract TAR archives. Config: `IncludeRegexes[]`, `ExcludeRegexes[]`. Each matching entry emitted as a separate message |

**Other Stream Transforms:**

| Plugin | Purpose |
|--------|---------|
| `AzureBlobStreamTransform` | Capture Azure blobs |
| `PassThroughStreamTransform` | No-op pass-through (for development/debugging or satisfying a required slot) |
| `GeoFileInfoStreamTransform` | Extract geospatial metadata via GDAL (`gdalinfo`/`ogrinfo`). Config: `PathRules` (regex→command mapping), `InfoOnlyMode`. Outputs JSON metadata array |
| `FileSetMetadataTransform` | Accumulate multi-file sets (e.g., satellite imagery bands), run `gdalinfo` when complete, inject metadata into import options. Niche — for Sentinel/Copernicus multi-band imagery |
| `GcsParquetStreamTransform` | Parse Parquet files from Google Cloud Storage. Config: `FileImportOptions`, `GeoTypes` (geometry type dictionary) |
| `BandsToVisibleImageTransform` | Convert separate visible spectrum band files into a single image. Post-processing for satellite imagery |

### MultipleJsonStreamSplitTransform — Split Concatenated JSON

Splits concatenated JSON objects (e.g., `{"a":1}{"b":2}`) into individual messages.

```json
"Options": {
    "IncludeRoots": []
}
```

- **`IncludeRoots`** — Optional JSON path filter. Empty/null = process all top-level objects. Each split document forwarded as separate message with cloned context.

### ContextVariableStreamTransform — Transform Context Variables

Transforms message context variables (URL-encode, regex replace, token extraction).

```json
"Options": {
    "Transformations": [
        {
            "Input": "{s3:key}",
            "OutputScope": "s3",
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
            "Input": "{s3:key}",
            "OutputScope": "s3",
            "OutputName": "filename",
            "Transform": "replace",
            "Pattern": "^.*/([^/]+)$",
            "Replacement": "$1",
            "DefaultIfNoMatch": "unknown"
        }
    ]
}
```

- **`Input`** — Value to transform (`{scope:name}` or literal)
- **`OutputScope`** / **`OutputName`** — Where to store result
- **`Transform`** — `urlencode`, `interpolate`, `extracttoken` (`Delimiter`, `TokenIndex`, `DefaultIfNoMatch`), or `replace` (`Pattern`, `Replacement`, `DefaultIfNoMatch`)
- Transformations run sequentially (later entries can reference earlier results)

---

## InterchangeTransform Plugins

InterchangeTransforms operate on entire batches of records (the `IMLImportInterchange` object) rather than individual records. They sit between RecordTransforms and Committers.

### CreateTrackLinesTransform — Generate Line Segments from Points

Creates line geometry (LINESTRING) from supplied points, connecting them in sequence. Useful for GPS tracks, flight paths, or other trajectory data.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `SourceTableKey` | string | | Key identifying the source point table in the interchange |
| `TargetTableKey` | string | | Key for the output line table in the interchange |
| `IDField` | string | | Field that groups points into tracks (e.g., vehicle ID) |
| `TimeField` | string | | Field used to order points within each track |
| `TimeIsNumeric` | bool | `false` | When `true`, treats the time field as a numeric value rather than a date string |
| `PointField` | string | | Field containing the point geometry (WKT) |
| `KeepSourceTable` | bool | `true` | Keep the source point table in the interchange output |
| `DistanceFactorMeters` | double | `1` | Multiplier to convert distance values to meters |
| `TimeFactorSeconds` | double | `1` | Multiplier to convert time values to seconds |
| `Summarize` | bool | `false` | Add summary statistics (total distance, duration) to each line |
| `OutputFieldPrefix` | string | `"track_"` | Prefix for output fields on the line record |
| `LagFieldPrefix` | string | `"prev_"` | Prefix for previous-point lag fields |
| `KeepFields` | string[] | `null` | Additional fields from the source record to carry forward to the line record |

### TableRecordIDCachingTransform — Cache Domain IDs

Generates MapLarge Record IDs and places them in a domain ID cache for downstream lookup.

| Property | Type | Purpose |
|----------|------|---------|
| `KeyFields` | string[] | Fields that form the unique key for each record |
| `AccountCode` | string | MapLarge account code |
| `TableName` | string | Target table name |
| `DomainIDCacheName` | string | Name of the domain ID cache to populate |
| `OutputKey` | string | Output key for routing via transitions |

### TableRecordIDLookupTransform — Look Up Record IDs

Looks up MapLarge row identifiers from existing tables and produces records with ML Record IDs. Used for joining incoming data with existing table records.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `KeyFields` | string[] | | Fields used for the lookup key |
| `Tables` | TableInfo[] | | Table definitions to look up against (see below) |
| `RetainFields` | bool | `false` | Keep the original record fields alongside the looked-up IDs |
| `DomainIDCacheName` | string | | Name of the domain ID cache to use |
| `UseTableLookup` | bool | `true` | Use actual table lookups (set `false` for cache-only testing) |

**TableInfo properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `Account` | string | MapLarge account code |
| `Name` | string | Table name |
| `KeyColumns` | string[] | Columns in the table that form the lookup key |
| `OutputKey` | string | Output key for routing via transitions |

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
                "partitionCols": ["date:week"]
            }
        }
    }
}
```

| Option | Default | Purpose |
|--------|---------|---------|
| `MaxFlushDelayMS` | 15000 | Max milliseconds to wait before flushing batch to DB |
| `TargetBackingFileRecordCount` | 1 | Records to accumulate before flush |
| `UseBackingFilePersistence` | true | Disk-backed accumulation (survives crashes) |
| `FaultPipelineOnFailedTransaction` | true | Stop the ramp if a commit fails |
| `UseInlinePayloadOptimization` | false | Store small payloads inline (< 4KB by default) for faster reads |

**Flush triggers:** No more messages, ramp stopped, `MaxFlushDelayMS` elapsed, or `TargetBackingFileRecordCount` reached. `MaxFlushDelayMS` takes precedence.

**Tuning:** High-volume: large record count (1000+), moderate delay (15000ms). Low-latency: small count (1-10), small delay (1000-5000ms).

**ImportTables** maps input keys to table configs. Keys correspond to `TargetInputKey` values from transitions. Use `"DEFAULT"` for single-table pipelines.

#### MLImportOptions — Table Config Properties

Each entry in `ImportTables` is an `MLImportOptions` object. Here are all available properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `Account` | string | required | Target account code. Supports context substitution (e.g., `"{{ACCOUNT}}"`) |
| `Table` | string | required | Target table name. Supports context substitution |
| `Append` | bool | false | When `true`, appends to existing table. When `false`, creates/replaces |
| `Delete` | bool | false | When `true`, deletes matching rows (used with `ChangeSetCoalescingPipelineCommitter`) |
| `PrimaryKeyColumns` | string[] | null | Column(s) forming the primary key for upsert/dedup behavior (see below) |
| `Visibility` | enum | `Private` | Table visibility: `Private`, `PublicUnlisted`, `Public` (see [MLTableVisibility](#mltablevisibility)) |
| `Partition` | object | null | Partitioning config with retention and expiration (see [MLPartitionInfo](#mlpartitioninfo)) |
| `SchemaDirectives` | array | null | Column type/rename directives applied at import time (see [SchemaDirectives](#schemadirectives--column-remapping-and-type-coercion)) |
| `TableTags` | array | null | Tags to apply to the created/updated table (see [MLImportTableTag](#mlimporttabletag)) |
| `ExtendedConfigJson` | string | null | JSON string of `FileImportOptions` for advanced import settings (see below) |
| `ExtendedConfig` | object | null | `FileImportOptions` object directly (alternative to `ExtendedConfigJson`) |
| `FileTypeHandler` | string | null | Override the file type handler used for import |
| `WaitTimeoutMS` | int | 0 | Timeout in milliseconds for waiting on import completion (0 = no wait) |
| `ImportItems` | string[] | null | Specific items to import (rarely used in pipeline context) |

#### Primary Key and Deduplication Behavior

When `PrimaryKeyColumns` is set, the import engine checks incoming rows against existing rows in the table. The behavior depends on additional flags:

| Configuration | When PK already exists | When PK is new | Use case |
|--------------|----------------------|----------------|----------|
| `Append: true` (no PK) | N/A — no PK checking | Always inserts | Simple append, duplicates allowed |
| `Append: true` + `PrimaryKeyColumns` | **Replaces** the existing row (upsert) | Inserts | Default upsert — always keep latest |
| `Append: true` + `PrimaryKeyColumns` + `InsertOnly: true` | **Silently discards** the incoming row | Inserts | Skip duplicates — only insert new PKs |
| `Append: true` + `PrimaryKeyColumns` + `UpdateOnly: true` | Updates the existing row | **Discards** the new row | Only update existing rows, never insert new |

**Example — Upsert (default PK behavior):**

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

**Example — Insert-only (skip if PK exists):**

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

**Example — Composite primary key:**

```json
"PrimaryKeyColumns": ["source_system", "record_id"]
```

Multiple columns can form the PK. A row is considered a duplicate only if **all** PK columns match.

#### ExtendedConfigJson — Advanced Import Options

JSON string deserialized into `FileImportOptions` at import time:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `InsertOnly` | bool | false | Only insert rows with new PKs; discard rows where PK already exists |
| `UpdateOnly` | bool | false | Only update rows where PK already exists; discard rows with new PKs |
| `PrimaryKeyAppend` | bool | false | Trigger PK-based append behavior (usually inferred from PrimaryKeyColumns) |
| `AddTimestamp` | bool | false | Add `_ml_capture_timestamp` column with UTC import time |
| `AddSourceFileColumn` | bool | false | Add column with source file name |
| `SimplifyColumnNames` | bool | false | Use leaf names instead of full nested paths |
| `SwapCoordinates` | bool | false | Swap x/y coordinate order |
| `SplitAtDateLine` | bool | false | Split shapes crossing the dateline |
| `SchemaStrictness` | enum | Permissive | `Permissive`, `Strict`, `StrictAllowNewColumns`, `StrictByColumnAllowNewColumns` |
| `CoerceColumnsToStrictSchema` | bool | false | Force column types to match existing schema |
| `RequireAllColumns` | bool | false | Fail if incoming data is missing columns from existing schema |
| `ReplicationFactor` | int | 0 | Number of replicas for this table |

**Example — Insert-only with timestamp:**

```json
"ExtendedConfigJson": "{\"InsertOnly\": true, \"AddTimestamp\": true}"
```

**Important:** `ExtendedConfigJson` is a **string** containing escaped JSON. Alternatively use `ExtendedConfig` for direct object.

#### IMLExtendedImportConfig — Interface Properties

Properties on the interface (from plugin-dependencies API; `FileImportOptions` may have additional):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `PrimaryKeyAppend` | bool | false | Trigger PK-based append behavior (usually inferred from PrimaryKeyColumns) |
| `ForceGeocode` | bool | false | Force geocoding of address fields |
| `MultiGeoTable` | bool | false | Allow multiple geometry columns in one table |
| `ForceSplitWKT` | bool | false | Force WKT splitting even when not auto-detected |
| `SplitAtDateLine` | bool | false | Split shapes that cross the antimeridian (±180° longitude) |
| `AddTimestamp` | bool | false | Add `_ml_capture_timestamp` column with UTC import time |
| `AddSourceFileColumn` | bool | false | Add a column with the source file name |
| `ReplicationFactor` | int | 0 | Number of replicas for this table's data |

#### MLPartitionInfo

Set via `Partition` property on `MLImportOptions`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `PartitionColumns` | string[] | null | Column(s) to partition by. Use `"colname:period"` syntax for time partitions (e.g., `"date:week"`, `"timestamp:day"`, `"date:month"`) |
| `RetentionTime` | TimeSpan | null | How long to keep partitions before automatic expiration (e.g., `"30.00:00:00"` = 30 days). When null, partitions are never expired |
| `ExpireFromEnd` | bool | false | When `true`, expires the newest partitions first. When `false` (default), expires the oldest partitions first |
| `DefaultPartitionCount` | int? | null | Default number of partitions to pre-create |
| `DefaultPartitionAscending` | bool | false | When `true`, partitions are ordered ascending |

**Example — Time-partitioned table with 90-day retention:**

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

**Example — Weekly partitions (no expiration):**

```json
"Partition": {
    "PartitionColumns": ["event_date:week"]
}
```

#### SchemaDirectives — Column Remapping and Type Coercion

Rename columns or force type conversions at import time. Each directive is an `MLDirectiveInfo`:

| Property | Type | Description |
|----------|------|-------------|
| `SrcColumn` | string | Source column name in the incoming data |
| `DestColumn` | string | Destination column name in the table (can be the same as `SrcColumn` for type-only changes) |
| `DestType` | MLColumnType | Target column type (see [MLColumnType](#mlcolumntype--supported-column-types) below) |
| `Directive` | enum | Currently only `"Remap"` is supported |

**Example — Rename and retype columns at import:**

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "analytics",
        "Table": "events",
        "Append": true,
        "SchemaDirectives": [
            { "SrcColumn": "evt_timestamp", "DestColumn": "timestamp", "DestType": "DateTime", "Directive": "Remap" },
            { "SrcColumn": "lat_lng_wkt", "DestColumn": "geometry", "DestType": "Shape", "Directive": "Remap" },
            { "SrcColumn": "record_count", "DestColumn": "record_count", "DestType": "Int64", "Directive": "Remap" }
        ]
    }
}
```

**When to use SchemaDirectives vs FieldNameTransform:**
- **SchemaDirectives** — Best for type coercion (string→DateTime, string→Int64, etc.) and simple renames at the database level. Applied during the import commit, not during pipeline processing. Downstream transforms still see the original field names.
- **FieldNameTransform** — Best for renames that need to be visible to downstream pipeline steps (ExpressionTransform, SkipRecordTransform, etc.)

#### MLColumnType — Supported Column Types

These are the valid values for `DestType` in schema directives and represent the column types supported by the MapLarge database:

| Type | Description |
|------|-------------|
| `Unknown` | Internal default (value 0) — do not specify in config; listed for completeness |
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

Controls who can see the imported table:

| Value | Description |
|-------|-------------|
| `Private` | Only visible to the owning user (default — enum value 0, no explicit initializer on `MLImportOptions.Visibility`) |
| `PublicUnlisted` | Accessible but not shown in table listings |
| `Public` | Visible to all users with account access |

#### MLImportTableTag

Tags are key-value metadata pairs attached to the table at import time. Useful for categorization, filtering, and automation.

| Property | Type | Description |
|----------|------|-------------|
| `Key` | string | Tag key (e.g., `"source"`, `"environment"`, `"pipeline"`) |
| `Value` | string | Tag value (e.g., `"kafka-feed"`, `"production"`, `"geo-enrichment"`) |
| `Resource` | string | Optional resource qualifier |

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

### InvokeRampCommitter — Forward Records to Another Pipeline

Forwards records to a different ramp instead of writing to a table. Use for pipeline chaining.

```json
"Options": {
    "RampName": "secondary-enrichment-pipeline"
}
```

- **`RampName`** — Name of the target ramp to invoke (provide either `RampName` or `RampId`)
- **`RampId`** — ID of the target ramp to invoke

Message context is passed to the target ramp. Internally calls `ProcessPushedRecordAsync` **per record**. Requirements:
- Target connector must implement `IMLAcceptsPushedRecords` (most polling connectors do); otherwise throws `"connector does not support dynamic invocation."`
- Target ramp must be **running** (won't start automatically)
- Each record triggers `PushedDataMapping` logic (can map record fields to connector config, e.g., URL → `EndPoint`)

#### Pattern: Conditionally Invoke Another Ramp Based on Record Field Values

Use **broadcasting** (transitions without guards) + **SkipRecordTransform** to filter, then `InvokeRampCommitter` for the subset. Avoids `TransitionGuard` limitations (message context only, throws on missing/empty properties).

```
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
                }
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

**Ramp 2 Connector Config (enterprise detail fetcher — HttpPollingConnector in accepting mode):**

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
- Broadcasting sends data to ALL targets (both `CommitAll` and `FilterEnterprise` receive every record)
- `SkipRecordTransform` filters per-record (vs `TransitionGuard` which is per-message)
- `PushedDataMapping` maps record fields to connector config (e.g., URL → `EndPoint`)
- Ramp 2 must be running before Ramp 1; `EndPoint` placeholder required even in accepting mode
- Each record = one fetch (1,000 matching records = 1,000 HTTP requests)

#### TransitionGuard vs SkipRecordTransform for Conditional Routing

| Mechanism | Operates On | Best For | Limitation |
|-----------|------------|----------|------------|
| `TransitionGuard` | Message context (set before/during parsing) | Routing different message types (e.g., Kafka topic routing) | Throws if context property is missing or empty |
| `SkipRecordTransform` | Record field values | Filtering records within a single message | Only drops records — cannot route to different paths by itself |
| **Broadcasting + SkipRecordTransform** | Record field values | Conditional per-record routing to different committers | Requires duplicate processing (all records flow through both paths initially) |

### DMLStatementCommitter — Execute SQL Statements Per Record

Executes a DML statement per record with field value substitution.

```json
"Options": {
    "StatementTemplate": "INSERT INTO account/tablename (sensor_id, reading, source) VALUES ('{field:sensor_id}', {field:reading}, '{streaming_msg:topic}');"
}
```

- **`StatementTemplate`** — A DML statement with placeholders:
  - `{field:columnName}` — substitutes a value from the record
  - `{scope:varName}` — substitutes a value from the message context
- DateTime values are formatted as ISO 8601 automatically
- A trailing semicolon is added if missing
- Statements are batched and executed asynchronously for throughput

### ChangeSetCoalescingPipelineCommitter — Atomic Commits with Blob Support

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

- **`MaxInstructionsPerChangeSet`** — If > 0, splits into multiple change sets when instruction count reaches this threshold (default: `-1` = no limit)
- **`AppendOrDeleteContextProperty`** — Context property name whose value (`"append"`, `"update"`, `"upsert"`, or `"delete"`) dynamically controls the import type per message
- If an `MLSchema` is present in the interchange context under the `"schema"` key, uses exact typed columns; otherwise infers types via `TextTypeDetector`

### FixedSchemaBatchCommitter — Pre-Defined Schema Batch Commits

A batching committer that requires a pre-defined `MLSchema` object passed via the interchange context. Requires the upstream connector to support at-least-once delivery (`missingMessagesWillBeResent = true`).

```json
"Options": {
    "MaxMessagesPerChangeSet": 5,
    "ImportTables": {
        "DEFAULT": { "Account": "data", "Table": "fixed_table", "Append": true }
    }
}
```

- **`MaxMessagesPerChangeSet`** — Batch size: messages accumulated before commit (default: `5`)
- **`MaxTimeBeforeFlush`** — Maximum wait time before flushing an incomplete batch (default: 5 minutes)
- **`QueueFullWaitDelay`** — How long to wait when the internal queue is full before retrying (default: 5 seconds)
- **`QueueEmptyWaitDelay`** — How long to wait when the internal queue is empty before checking again (default: 1 second)
- Faults the pipeline on commit failure

### FileImportPipelineCommitter — File-Based Import (Stream Committer)

Writes stream to temp file, imports via `ImportManager`. Supports ZIP auto-detection, context substitution for table/account names, and schema directives.

```json
"Options": {
    "Account": "analytics",
    "Table": "imported_data",
    "Append": false,
    "ExtendedConfig": "{connector:importOptions}"
}
```

- **`Account`** / **`Table`** (required) — Target table. Both support context substitution expressions
- **`Append`** — When `true`, appends to existing table (default: `false`)
- **`FileImportOptions`** — Full import options object (schema directives, column types, etc.)
- **`ExtendedConfig`** — JSON string or `{scope:property}` pointer to a `FileImportOptions` object in message context. Overrides `FileImportOptions` if present
- **`FileNameProperty`** / **`FileExtProperty`** / **`ContentTypeProperty`** — Context property references for file naming
- File naming priority: S3 Key context → SFTP path context → `FileNameProperty` config → MIME type extension → `.bin`

This is a **StreamCommitter** (step type `StreamCommitter`), not a record-based committer.

### Event Bus Committers

Two variants for publishing to MapLarge's Event Bus (live layers / VFB):

**`PublishToEventBusCommitter`** (stream-based) — Reads the raw stream as a JSON string and publishes directly to Event Bus. The body must already be valid JSON. Fire-and-forget.

**`PublishRecordToEventBusCommitter`** (record-based) — Converts parsed `MLFlattenedRecord` fields to JSON with type-aware serialization. Automatically synthesizes a WKT `POINT(lng lat)` `XY` field if `Latitude`/`Longitude` columns exist but no `XY` column. Preferred when you need geo synthesis or replacement key logic.

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

- **`Replace`** — Whether the event replaces an existing event with the same key
- **`EventLifetimeSec`** — Event TTL in seconds (`-1` = indefinite)
- **`PrimaryKeyColumns`** — Fields forming the replacement key

### Other Committers

| Plugin | Type | Purpose |
|--------|------|---------|
| `PublishToMessageBusCommitter` | StreamCommitter | Publishes raw stream bytes to MapLarge's internal Message Bus (`MessageProducer`). Config: `ProducerName`, `Destinations` dict of `{Account, BoxName}`. For internal server-to-server pub/sub |
| `StreamCommitingRowDeleter` | StreamCommitter | Deletes rows from a target table by primary key extracted from message context. Config: `Account`, `Table`, `PrimaryKeyColumns[]`, `Scope`, `PkPath`. For CDC (change-data-capture) delete propagation |
| `VFSCommitter` | Record | Registers records as `VFSTableItem` entries in MapLarge's Virtual File System. Creates pointer-disposition entries (remote URL references, not file content). Config: `PathColumnName`, `AccountColumnName` (context reference), `ContextItemsForTags`. For S3/blob storage listing pipelines |

---

## Export Pipeline Components

Pattern: **RecordObserver → RecordTransform → Serializer → ExportConnector**. Record transforms are the same as import.

### Serializers (`"Type": "Serializer"`)

| PluginName | Config | Purpose |
|------------|--------|---------|
| `JsonRecordSerializer` | (none) | Serializes records to JSON. No configuration needed |
| `DelimitedTextSerializer` | `Delimiter` (default `","`) | Produces CSV/TSV. Header row + one delimited line per record |
| `TemplatingSerializer` | `Template` or `WellKnownTemplate` | Renders records against a Handlebars template for arbitrary output formats (JSON, XML, text, etc.). `Template` = inline string, `WellKnownTemplate` = server-stored resource ID/name. Exactly one must be set. Custom helpers: `{{#isMatch field "value"}}`, `{{#propertyValues this "col1,col2" 3}}` |

### Observers (`"Type": "RecordObserver"`)

| PluginName | Purpose |
|------------|---------|
| `PushedRecordObserver` | Infrastructure observer for push-based off-ramps. Records are pushed into the pipeline externally. No config |

### Export Connectors (`"Type": "ExportConnector"`)

| PluginName | Purpose |
|------------|---------|
| `FileSystemExportConnector` | Export stream to a file on the local filesystem |
| `HttpExportConnector` | Export stream via HTTP POST/PUT |
| `NATSExportConnector` | Publish message to NATS |
| `SNSExportConnector` | Publish to AWS SNS topic |

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

> **CRITICAL: Transition key values are CASE-SENSITIVE.** The `SourceOutputKey` and `TargetInputKey` values are matched using ordinal (case-sensitive) string comparison — both in the pipeline's `OutputHandlers` dictionary and in the committer's `ImportTables` dictionary (`StringComparer.Ordinal`). The `TargetInputKey` value must **exactly match** the corresponding key in the committer's `ImportTables` dictionary. For example, if `ImportTables` has a key `"DEFAULT"`, the transition must use `"TargetInputKey": "DEFAULT"` — not `"default"`, `"Default"`, or any other casing. A case mismatch causes a `DataStreamException: Table <key> unknown to coalescer!` at runtime, which silently kills the message processing. In cursor pagination scenarios, this manifests as **only fetching 1 page** because the pipeline failure prevents the connector from reading the cursor value.
>
> When `SourceOutputKey` or `TargetInputKey` is **omitted or null**, the engine defaults to `MLDataStreamConstants.DEFAULT_TRANSITION` which is `"DEFAULT"` (all caps). However, if you explicitly set the value to `"default"` (lowercase), the null-coalescing fallback does NOT apply — the lowercase value is used as-is.

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

**TransitionGuard properties:** `ContextScope`, `ContextProperty`, `CompareTo` (exact, case-insensitive), `NotEqualTo` (case-insensitive), `Contains` (case-insensitive), `ContextMask` (template with `{scope:name}` references).

**Important:** Guard throws `ArgumentOutOfRangeException` if context property doesn't exist or is empty. Ensure population via `PropertiesToPromote` or connector metadata.

**Broadcasting:** Multiple transitions without guards sends data to **all** targets.

---

## Well-Known vs Ad-Hoc Pipelines

**Ad-Hoc:** Inline with On Ramp, single-use. **Well-Known:** Reusable template with `{{PARAM_NAME}}` parameterization:

```json
"ImportTables": {
    "DEFAULT": {
        "Account": "{{TARGET_ACCOUNT}}",
        "Table": "{{TARGET_TABLE}}",
        "Append": true
    }
}
```

Parameter formats: JSON dict (`{"KEY": "value"}`), pipe-separated (`KEY=VALUE|KEY2=VALUE2`), arrays (`"{{ARRAY_PARAM}}"` → `[val1, val2]`), date tokens (`{now}`, `{today}`, `{now-30d}`).

---

## Message Context System

Scoped key-value metadata store (`IMLMessageContext`) carried with each message, allowing steps to pass data without modifying records.

### IMLMessageContext Interface

| Member | Description |
|--------|-------------|
| `IMLSystemContext SystemContext` | Access to the full system context (logger, database, jobs, etc.) |
| `this[string scope, string propertyName]` | Get a context value by scope and property name |
| `SetProperty(scope, propertyName, value, sensitive)` | Set a context value. `sensitive=true` masks the value in logs |
| `GetValues(SensitiveDataHandling)` | Enumerate all context values with optional sensitive data handling |

**Sensitive data handling options** (`SensitiveDataHandling` enum):
- `Mask` — Replace sensitive values with `"***"` in output
- `Include` — Include sensitive values as-is
- `Omit` — Exclude sensitive values entirely

### How Context Values Are Populated

1. **Connector** — auto-adds source metadata (Kafka topic, offset, etc.)
2. **`PropertiesToPromote`** — on `JSONDisassemblerStreamTransform` or parser steps
3. **`ContextVariableStreamTransform`** — derives new values from existing ones
4. **Pipeline handler** — `CreateMessageContext()` creates fresh context per message

Values are organized as `scope:property` (e.g., `streaming_msg:record_type`).

### Where Context Values Are Used

`TransitionGuard`, `ExtendRecordTransform` (`{scope:name}` in Value), `DMLStatementCommitter` (`{scope:varName}` placeholders), `ContextVariableStreamTransform`, `InvokeRampCommitter` (passes full context), stream transforms (e.g., `DownloadFromS3Transform` reads `s3:region`).

### Pipeline Metadata Storage

The pipeline message handler (`IMLDataStreamMessageHandler`) also provides persistent metadata storage that survives restarts:

| Method | Description |
|--------|-------------|
| `StoreMetadataAsync(key, value)` | Store a persistent key-value pair (e.g., cursor position, last processed ID) |
| `GetMetadataAsync(key)` | Retrieve a stored value |

This is how connectors like `HttpPollingConnector` persist tracking state (last poll timestamp, cursor values) between ramp restarts.

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
                "Coordinates": ["latitude", "longitude"],
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
                        "Partition": { "partitionCols": ["timestamp:week"] }
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
                "Roots": [{ "OutputKey": "Payload", "Path": "$.payload" }],
                "PropertiesToPromote": [
                    { "Path": "$.message_type", "Scope": "streaming_msg", "Name": "msg_type" }
                ]
            },
            "Transitions": [
                { "ToStep": "ParsePayload", "SourceOutputKey": "Payload" }
            ]
        },
        {
            "StepName": "ParsePayload",
            "Type": "Parser",
            "Application": "MapLargeCore",
            "PluginName": "JsonPipelineParser",
            "Options": { "RecordRootPath": "$[*]" },
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
                "Region": "s3:region",
                "Bucket": "s3:bucket",
                "Key": "s3:key",
                "AccessKey": "...",
                "SecretKey": "..."
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
            "Options": {},
            "Transitions": [
                { "SourceOutputKey": "EVENTS",   "TargetInputKey": "EVENTS",   "ToStep": "CommitAll" },
                { "SourceOutputKey": "MENTIONS", "TargetInputKey": "MENTIONS", "ToStep": "CommitAll" },
                { "SourceOutputKey": "GKG",      "TargetInputKey": "GKG",      "ToStep": "CommitAll" }
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
                    "GKG":      { "Account": "gdelt", "Table": "gkg",      "Append": true }
                }
            }
        }
    ]
}
```

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

The cursor (`content.nextCursor`) is **outside** the record root (`content.tasks[*]`). This is the most common API pagination pattern — and `PropertiesToPromote` handles it correctly because it operates on the full document, not scoped to `RecordRootPath`.

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
                        "PrimaryKeyColumns": ["taskId"]
                    }
                }
            }
        }
    ]
}
```

> **Proven pattern for cursor pagination:** Use `MultipleRoots` (not `RecordRootPath`) with an explicit `OutputKey`, and use **dot-notation** (no leading `$`) for `PropertiesToPromote.Path`. While the source code normalizes `$.content.nextCursor` and `content.nextCursor` identically (via `TrimStart('$', '.')`), field testing has shown that `MultipleRoots` + dot-notation promotion paths is the most reliable combination for cursor-based pagination. If `RecordRootPath` with promotion isn't working, switch to `MultipleRoots` and add a matching `SourceOutputKey` on the transition.

**How the pagination loop works:**

1. **First request:** Connector sends `GET https://api.example.com/v1/tasks` (no cursor parameter)
2. **Parser traverses full document:** Encounters `content.nextCursor` → promotes `"eyJpZCI6MTAwfQ=="` to context as `__cursor::__value`. Then encounters `content.tasks[*]` → emits 2 records.
3. **Connector reads cursor:** After the pipeline processes the page, the connector reads `ctx["__cursor", "__value"]` → gets `"eyJpZCI6MTAwfQ=="`
4. **Next request:** Connector sends `GET https://api.example.com/v1/tasks?cursor=eyJpZCI6MTAwfQ==`
5. **Repeat** until the API returns no `nextCursor` (null/empty) or the cursor is unchanged

**Key points:**
- `CursorParameterName` must match the API's query parameter name
- `CursorContextScope`/`CursorContextKey` must exactly match `PropertiesToPromote`'s `Scope`/`Name` (names are arbitrary; double-underscore convention avoids collisions)
- Fresh context per page; cursor flows via local variable, not across contexts
- POST pagination: use `{{CURSOR_VALUE}}` in `PostPayload` (see `ConnectorConfig.claude.md`)
- `PaginationDelayMs` adds delay between requests to avoid rate limiting

**Troubleshooting: Pagination stops after 1 page**

If pagination only fetches 1 page, check these in order:

1. **`TargetInputKey` case mismatch (most common):** The `TargetInputKey` value in transitions must **exactly match** the key in the committer's `ImportTables` dictionary (case-sensitive, ordinal comparison). If `ImportTables` has `"DEFAULT"` but the transition has `"default"`, the committer throws `DataStreamException: Table default unknown to coalescer!`. This kills `ProcessMessageAsync`, so the connector never reads the cursor from context, and pagination stops. **Fix:** Use `"DEFAULT"` (all caps) for both, or omit `TargetInputKey` entirely to use the default.

2. **`PropertiesToPromote` path mismatch:** The `Path` value is matched against the full Newtonsoft JSON path during traversal. Leading `$` and `.` are stripped automatically, so `"$.content.nextCursor"`, `".content.nextCursor"`, and `"content.nextCursor"` all work. But the path must exactly match what the JSON reader produces — e.g., `"content.nextCursor"` not `"content.next_cursor"`.

3. **Scope/Key mismatch:** The connector's `CursorContextScope` + `CursorContextKey` must match `PropertiesToPromote`'s `Scope` + `Name` exactly. If these don't match, the connector reads `null` from context and stops.

4. **API returns cursor inside the record array:** If the cursor is inside `RecordRootPath` (e.g., each task object has a `cursor` field), `PropertiesToPromote` still works — the parser promotes it for every record it encounters. The connector reads the last-promoted value after the pipeline completes.

> **`JSONDisassemblerStreamTransform` is NOT needed for cursor pagination.** `PropertiesToPromote` on the parser operates on the full document (not scoped to `RecordRootPath`). The cursor is promoted as a side-effect of traversal. `JSONDisassemblerStreamTransform` is only needed for splitting messages into multiple sub-streams.
>
> **JSON property order affects `AddContextProperties`, NOT pagination.** If the cursor appears AFTER the record array in JSON, `ExtendRecordTransform` with `AddContextProperties: true` won't show it as a column (not yet in context when records were transformed). But **pagination still works** because the connector reads cursor after `ProcessMessageAsync` completes. Don't use `AddContextProperties` column presence to test promotion.

**Combining pagination with tracking:** Replace `DoNotTrack: true` to bookmark between poll cycles (pagination = within cycle, tracking = between cycles):

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

Add `FieldTrackingTransform` to the pipeline if using POST-based tracking (see `ConnectorConfig.claude.md` for POST tracking details).

---

## Data Selection Cheat Sheet

| Question | JSON Parser | XML Parser | YAML Parser | CSV Parser | Avro |
|----------|-------------|------------|-------------|------------|------|
| **PluginName** | `JsonPipelineParser` | `XmlParser` | `YamlPipelineParser` | `DelimitedTextParser` | `AvroParser` |
| **Where do records start?** | `RecordRootPath` or `MultipleRoots` | `MultipleRoots` with XPath | Same as JSON (converts YAML to JSON first) | Every row | Every Avro record |
| **How to exclude data?** | `ExcludePaths` | `ExcludePaths` | `ExcludePaths` | N/A | N/A |
| **How to include only specific data?** | `ExcludePaths` (no `IncludePaths` support) | `IncludePaths` and `ExcludePaths` | `ExcludePaths` (no `IncludePaths` support) | `ExplicitColumnHeaders` | N/A |
| **How are nested structures handled?** | Flattened with `_` joins | Flattened with `_` joins | Flattened with `_` joins | N/A (flat) | Flattened with `_` joins |
| **How to keep nested as blob?** | `PathActions` with `StringifyOnly` | N/A | `PathActions` with `StringifyOnly` | N/A | N/A |
| **How to pivot arrays into columns?** | `PathActions` with `Pivot` | N/A | `PathActions` with `Pivot` | N/A | N/A |
| **How to control column names?** | `SimplifyColumnNames`, `PathActions.ColumnName` | `SimplifyColumnNames`, `AttributeBasedNames` | `SimplifyColumnNames`, `PathActions.ColumnName` | Headers or `ExplicitColumnHeaders` | Schema field names |
| **How to extract metadata?** | `PropertiesToPromote` (on parser or on `JSONDisassemblerStreamTransform` step) | `PropertiesToPromote` (on parser or on `JSONDisassemblerStreamTransform` step, JSON input only) | `PropertiesToPromote` | N/A | N/A |
| **How to split one message into multiple tables?** | `MultipleRoots` with different `OutputKey`s | `MultipleRoots` with different `OutputKey`s | `MultipleRoots` with different `OutputKey`s | N/A | N/A |
| **Auto geometry detection?** | GeoJSON -> WKT | GML -> WKT | GeoJSON -> WKT | N/A | N/A |

---

## Available Connectors

Configs documented in `ConnectorConfig.claude.md`. **Two plugins use spaces in names:** `"ArcGIS Rest Connector"` and `"Tiled Imagery Connector"`.

### Push/Subscribe Connectors (Listen for incoming data)

| PluginName | Source |
|------------|--------|
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
|------------|--------|
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
|------------|--------|
| `FileSystemConnector` | Local filesystem monitoring |
| `AttachedFilesystemConnector` | Monitored filesystem with indexing |
| `Tiled Imagery Connector` | WMTS/XYZ tile services (**note: has spaces in plugin name**) |

### Export Connectors (Off Ramps)

| PluginName | Destination |
|------------|-------------|
| `FileSystemExportConnector` | Local filesystem |
| `HttpExportConnector` | HTTP POST/PUT |
| `NATSExportConnector` | NATS publish |
| `SNSExportConnector` | AWS SNS topics |


