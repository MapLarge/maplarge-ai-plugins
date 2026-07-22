---
name: maplarge-datastreams
description: >-
  Authoritative reference for configuring MapLarge DataStream on-ramps and off-ramps — the two
  separate JSON configs (Connector tab and Pipeline tab) for the on-ramp create/edit dialog.
  Covers every connector (NATS, NATSJetStream, Kafka, MQTT, Pulsar, ActiveMQ, SQS, WebSocket,
  PushedMessage, HTTP polling, S3, Azure/GCS storage, SFTP, FileSystem, AttachedFilesystem,
  RelationalDB, Elasticsearch, OGC WFS, ArcGIS REST, TiledImagery, Video) plus the full pipeline:
  parsers, record/stream/interchange transforms, committers, serializers, scheduling, tracking,
  message context, and monitoring. Use when building, editing, debugging, or reasoning about any
  DataStream pipeline, on-ramp connector config, or off-ramp/export config in any MapLarge repo.
  Triggers on: "datastream", "data stream", "data streams", "on-ramp", "onramp", "on ramp",
  "off-ramp", "offramp", "off ramp", "connector config", "connector tab", "pipeline tab",
  "pipeline definition", "NumberOfWorkers", "Steps array", "fetchonramp", "ml_rampserverstats",
  "ml_ramplog", "ml_rampsteplog", "connector", "parser", "RecordTransform", "StreamTransform",
  "InterchangeTransform", "committer", "off ramp serializer", "KafkaConnector",
  "NATSConnector", "NATSJetStreamConnector", "JetStream", "DeliverPolicy", "MQTTConnector",
  "PulsarConnector", "ActiveMQConnector", "SQSConnector", "WebSocketMessageConnector",
  "PushedMessageConnector", "HttpPollingConnector", "S3Connector", "AzureStorageConnector",
  "GoogleCloudStorageConnector", "GCS connector", "SFTPConnector", "FileSystemConnector",
  "AttachedFilesystemConnector", "RelationalDatabaseConnector", "ElasticsearchConnector",
  "ArcGIS Rest Connector", "WfsConnector", "WFS", "OGC", "TiledImageryConnector", "VideoConnector",
  "JsonPipelineParser", "XmlParser", "DelimitedTextParser", "AvroParser", "YamlPipelineParser",
  "LiteralParser", "MessageContextParser", "KeyValuePairParser", "PassThroughParser",
  "JSONDisassemblerStreamTransform", "Roots", "PropertiesToPromote", "RecordRootPath",
  "MultipleRoots", "PathActions", "Pivot", "SimplifyColumnNames", "FieldNameTransform",
  "ExpressionTransform", "expression functions", "DelimitedToWKTTransform", "CrsTransform",
  "ExtendRecordTransform", "EnsureFieldsTransform", "SkipRecordTransform", "SplitDelimitedTransform",
  "EmbeddedJsonTransform", "TableLookupTransform", "RegexTransform", "FieldTrackingTransform",
  "LineToWKTTransform", "EllipseToWKTTransform", "SectorToWKTTransform", "ECEFTransform",
  "LOBToWKTTransform", "ArcGisGeometryTransform", "SimplifyTransform", "GeoFieldNameTransform",
  "geometry transform", "WKT", "CoalescingPipelineCommitter", "InvokeRampCommitter",
  "DMLStatementCommitter", "ChangeSetCoalescingPipelineCommitter", "FixedSchemaBatchCommitter",
  "FileImportPipelineCommitter", "MLImportOptions", "ExtendedConfigJson", "SchemaDirectives",
  "ForceSplitWKT", "ImportTables", "TransitionGuard", "transitions", "conditional routing",
  "WellKnownPipelineId", "well-known pipeline", "message context", "incremental tracking",
  "DoNotTrack", "cursor pagination", "offset pagination", "PollingFrequencyMS", "CronExpression",
  "RunInAcceptingMode", "pushed records", "ProcessLogConfig", "PathTemplate",
  "geometry column naming", "ingest pipeline", "Kafka SASL", "verboseLogging", "tableLogging".
---

# MapLarge DataStreams — Connector & Pipeline Configuration

Before configuring, editing, or debugging any DataStream on-ramp, off-ramp, connector, or pipeline, READ the relevant sections of the bundled references first — they are the authoritative source:

- Connector tab (data source, scheduling, credentials, tracking, accepting mode): `${CLAUDE_PLUGIN_ROOT}/skills/maplarge-datastreams/reference/ConnectorConfig.md`
- Pipeline tab (parsers, transforms, committers, transitions, export components, message context): `${CLAUDE_PLUGIN_ROOT}/skills/maplarge-datastreams/reference/PipelineConfig.md`

Read only the sections you need for the task (not the whole file unless required). The two configs are **separate JSON objects edited in separate UI tabs** — never merge them into one object.

## When to read what

| Task | Sections to read |
|------|-----------------|
| Decide connector type / scheduling (interval, CRON, one-time) | ConnectorConfig: *Connector Type Categories*, *Scheduling (BasePollingConnectorConfig)* |
| Configure a messaging connector (Kafka, NATS, JetStream, MQTT, Pulsar, ActiveMQ, SQS, WebSocket, PushedMessage) | ConnectorConfig: *Messaging Connectors (Push-Based)* + the specific `<Name>Connector` subsection |
| Configure HTTP polling, tracking, cursor/offset pagination, date substitution | ConnectorConfig: *HttpPollingConnector* (incl. *Two Separate Placeholder Systems*, *DoNotTrack Summary*) |
| Configure file/object connectors (S3, Azure, GCS, SFTP, FileSystem) | ConnectorConfig: *File-Oriented Shared Config (AbstractPollingConnectorConfig)*, *Process Log Filtering (ProcessLogConfig)*, the specific connector subsection |
| Configure DB / Elasticsearch / ArcGIS / WFS / TiledImagery / Video | ConnectorConfig: *RelationalDatabaseConnector*, *ElasticsearchConnector*, *ArcGISRestConnector*, *WfsConnector*, *Specialty Connectors* |
| Pushed-records / accepting mode, invoke-ramp chaining | ConnectorConfig: *Accepting Mode (Pushed Records)* |
| Exact PluginName / config base / key props for any connector | ConnectorConfig: *Connector Quick-Reference Table* |
| Connector gotchas, validation, reconnection, destructive ops | ConnectorConfig: *Gotchas, Validation & Behavioral Nuances* |
| Build pipeline JSON structure, step order, transitions | PipelineConfig: *Pipeline Structure*, *Step Types*, *Transitions and Conditional Routing* |
| Understand the runtime record model + defensive coding | PipelineConfig: *Runtime Data Model & Defensive Patterns* |
| Choose / configure a parser (JSON, XML, CSV, Avro, YAML, etc.) | PipelineConfig: *Parsers: How Data Gets Interpreted*, *How Nested Data Gets Flattened* |
| Rename/compute/filter fields, expression functions | PipelineConfig: *Record Transforms* → *FieldNameTransform*, *ExpressionTransform* (incl. *Available Functions*) |
| Convert coordinates to geometry / WKT, name geo columns | PipelineConfig: *Record Transforms* → *Geometry Transforms*; *Geometry Column Naming* |
| Enrich/dedupe/skip records, embedded JSON, lookups | PipelineConfig: *TableLookupTransform*, *SkipRecordTransform*, *EmbeddedJsonTransform*, *FieldTrackingTransform* |
| Split JSON envelope / promote context before parsing | PipelineConfig: *JSONDisassemblerStreamTransform*, *Stream Transforms* |
| Commit to tables (schema, PK/dedup, partitions, multi-table) | PipelineConfig: *Committers* → *CoalescingPipelineCommitter*, *MLImportOptions*, *ExtendedConfigJson*, *SchemaDirectives*, *Multiple Tables from One Committer* |
| Build an off-ramp / export pipeline | PipelineConfig: *Export Pipeline Components*, *Valid Export Transition Order* |
| Well-known vs inline pipelines; message context lookup | PipelineConfig: *Well-Known vs Ad-Hoc Pipelines*, *Message Context System* |
| End-to-end worked examples | PipelineConfig: *Complete Pipeline Examples*; *Data Selection Cheat Sheet* |
| Monitor / debug a running ramp in UI or via SQL | ConnectorConfig: *Monitoring, Logging & Debugging* (`ml_rampserverstats`, `ml_ramplog`, `ml_rampsteplog`, `verboseLogging`, `tableLogging`) |

## Key facts (verified)

- **Two separate configs.** The Connector tab and Pipeline tab each have their own "Show JSON" editor; never combine them, and never wrap pipeline JSON in an on-ramp envelope (`connectorPluginName`, `effectiveUserName`, etc. are UI-managed).
- **Steps run in transition order, not array order.** A pipeline is `{ "NumberOfWorkers": N, "Steps": [...] }`; routing comes from `Transitions`, and each `Type` only accepts specific `PluginName`s.
- **Fail-fast per message.** A thrown exception in any step loses the *entire message* (all its records); a `RecordTransform` returning `null` silently drops just that one record. Guard transforms that touch optional fields.
- **Records are schema-less string bags** at pipeline time — fields may be absent on some records, duplicate names are legal, and type detection happens at commit time. Prefer `EnsureFieldsTransform` over `ExtendRecordTransform` before `ExpressionTransform` (duplicates crash `ToDictionary()`).
- **Some PluginNames contain spaces:** `"ArcGIS Rest Connector"` and `"Tiled Imagery Connector"`. The YAML parser is `YamlPipelineParser` (not `YamlParser`).
- **Destructive runtime behavior:** `FileSystemConnector` deletes files and `SQSConnector` deletes messages after successful processing; `AttachedFilesystemConnector` reconciliation deletes table rows when source files are removed.
