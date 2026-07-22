# MapLarge DataStream Connector Configuration Guide

> **Scope**: Reference for the **Connector Options** JSON that goes into the **Connector tab** of the MapLarge on-ramp create/edit dialog. This document covers connector types, per-connector options, scheduling, credentials, and examples.

---

## IMPORTANT: Two Separate Configs — Do NOT Combine

An on-ramp has **two independent JSON configurations** edited in **two separate UI tabs**. The user never combines them — each tab has its own "Show JSON" button and its own JSON editor. Internally the server pairs them, but the user (and you) always work with them separately.

| UI Tab | What you generate | Documented in |
|--------|------------------|---------------|
| **Connector tab** (this doc) | Flat JSON object with connector-specific properties | This file |
| **Pipeline tab** | JSON object with `NumberOfWorkers` + `Steps` array | `PipelineConfig.claude.md` |

**When asked to configure a connector → output ONLY connector JSON. When asked to configure a pipeline → output ONLY pipeline JSON. NEVER merge them into one JSON object.**

```json
{
    "Endpoint": "broker1:9092",
    "Topic": "sensor-data",
    "GroupId": "ml-ingest-group",
    "EnableAutoCommit": true
}
```

**User workflow:** Select connector type in UI dropdown → Connector tab → Show JSON → paste your output. Pipeline is configured separately in the Pipeline tab.

---

## Table of Contents

- [Overview](#overview)
- [On-Ramp Context (How Connector Config Fits In)](#on-ramp-context)
- [Scheduling (BasePollingConnectorConfig)](#scheduling-basepollingconnectorconfig)
- [File-Oriented Shared Config (AbstractPollingConnectorConfig)](#file-oriented-shared-config-abstractpollingconnectorconfig)
- [Process Log Filtering (ProcessLogConfig)](#process-log-filtering-processlogconfig)
- [Messaging Connectors (Push-Based)](#messaging-connectors-push-based)
- [Polling / LongRunning Connectors](#polling--longrunning-connectors)
- [Specialty Connectors](#specialty-connectors)
- [Accepting Mode (Pushed Records)](#accepting-mode-pushed-records)
- [Connector Quick-Reference Table](#connector-quick-reference-table)
- [Monitoring, Logging & Debugging](#monitoring-logging--debugging)

---

## Overview

An **on-ramp** pairs a **connector** (data source + schedule; this doc) with a **pipeline** (parse/transform/commit; see `PipelineConfig.claude.md`). Connectors are plugins loaded by name at runtime, each with a `Config` class deserialized from the connector options JSON.

---

## On-Ramp Context

The UI manages on-ramp-level fields (name, connector plugin selection, effective user, retry settings, etc.) through its own form controls — you do not generate these. The only JSON you produce is the connector options that go into the Connector tab.

Other on-ramp-level fields of note: `verboseLogging` (bool, enables detailed pipeline logging), `requiredClusterRole` (string, restricts which cluster nodes run this on-ramp), `wellKnownPipelineId` (string, references a saved pipeline instead of an inline pipeline definition — takes precedence if both are provided), `faultedRetryAttempts`/`faultedRetryIndefinitely`/`faultedRetryDelay`/`faultedRetryExponentialBackoff` (retry behavior when connector faults).

---

## Config Deserialization

Property names in connector JSON are **case-insensitive**.

---

## Connector Type Categories

| `ImportConnectorType` | Behavior | Connectors |
|----------------------|----------|------------|
| `Accepting` | Stays alive indefinitely, listening for pushed messages | Kafka, NATS, NATSJetStream, MQTT, Pulsar, ActiveMQ, WebSocket, PushedMessage, Video |
| `Polling` | Wakes on schedule, fetches data, sleeps | Http, RelationalDB, WFS, ArcGIS, SQS (when recurring) |
| `LongRunning` | Scans once through a dataset, optionally repeats | S3, Azure, GCS, SFTP, FileSystem, AttachedFilesystem, TiledImagery, SQS (when one-time) |

Many connectors dynamically choose between `Polling` and `LongRunning` based on `IsOneTime` (true when neither `PollingFrequencyMS` nor `CronExpression` is set).

---

## Scheduling (BasePollingConnectorConfig)

Shared by all connectors extending `BasePollingConnectorConfig`:

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `EndPoint` | string | `null` | Server URI / location — meaning varies per connector |
| `PollingFrequencyMS` | int | `-1` | Milliseconds between polls. `-1` = one-time run, `0+` = recurring. Setting this clears `CronExpression` |
| `CronExpression` | string | `""` | CRON expression (UTC, 5-field NCrontab format). Setting a valid expression clears `PollingFrequencyMS` |
| `RunOnStartup` | bool | `false` | Execute immediately when on-ramp starts (relevant when using CRON) |
| `RunInAcceptingMode` | bool | `false` | Switch to pushed-records mode instead of polling |
| `PushedRecordIsConfig` | bool | `false` | Treat each pushed record as a full config replacement |
| `PushedDataMapping` | MLPushedRecordMapping[] | `null` | Maps pushed record fields to config properties |

`IsOneTime` is a computed read-only property: `true` when `PollingFrequencyMS == -1 && CronExpression` is not set.

### Scheduling Modes

**One-time run** (scan once and stop):
```json
{ "PollingFrequencyMS": -1 }
```

**Fixed interval** (poll every 5 minutes):
```json
{ "PollingFrequencyMS": 300000 }
```

**CRON schedule** (run at specific times, UTC):
```json
{
    "CronExpression": "0 */15 * * *",
    "RunOnStartup": true
}
```

---

## File-Oriented Shared Config (AbstractPollingConnectorConfig)

Extends `BasePollingConnectorConfig`. **Inherited by:** S3, Azure Storage, GCS. **NOT by:** HttpPolling, SFTP, ArcGIS, WFS, Elasticsearch, RelationalDB, SQS, AttachedFilesystem.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `CopyConfigToMessage` | bool | `false` | Include connector config in message context |
| `MaxThreads` | int | `1` | Max concurrent file processing threads |
| `RetryAttempts` | int | `2` | Retry count on failure per file |
| `ContinueOnError` | bool | `false` | Skip errors vs. fault the connector |
| `PageSize` | int | `100` | Objects per listing page |
| `MinimumFileAgeMS` | int | `1000` | Min file age in milliseconds before processing (avoids partial writes) |
| `MinimumLastModified` | DateTimeOffset | `DateTimeOffset.MinValue` | Only process files modified after this timestamp |
| `Prefix` | string | `""` | Object prefix filter (e.g., `"data/2024/"`) |
| `StartAfter` | string | `""` | Pagination starting point (supports `script:` prefix for dynamic evaluation) |
| `StopAfter` | string | `""` | Pagination ending point |
| `FilterByPathTemplate` | bool | `false` | Enable path template regex matching |
| `PathTemplate` | string | `null` | Pattern like `{year}/{month}/{filename}.csv` — auto-generates regex |
| `PathTemplateRegexPattern` | string | `null` | Custom regex (overrides `PathTemplate` auto-generation) |
| `MetaDataMessageProperty` | string | `null` | `Scope:Name` format for storing extracted path metadata |
| `FilterByLatestFileTimestamp` | bool | `true` | Track latest processed file timestamp for incremental imports |
| `OrderImportBy` | List\<string\> | `[]` | Sort order for files before processing |
| `ProcessLogFilter` | ProcessLogConfig | `null` | Duplicate detection via process log table |

**Property interactions:**
- `PathTemplate` and `PathTemplateRegexPattern` are mutually exclusive. Setting `PathTemplate` auto-generates the regex and clears `PathTemplate` back to empty — the regex is authoritative.
- `StartAfter` supports `"script:"` prefix for dynamic evaluation with `latestFileTimestamp` and `latestProcessLogTimestamp` variables.
- `StopAfter` is prefix-based: collects objects until the key no longer starts with `StopAfter` after a match.
- `CopyConfigToMessage` copies credentials to context with `isSensitive: true`. What gets copied varies by connector.
- `MaxThreads` max varies by connector (S3=50, Azure/GCS/SFTP=25) — throws if exceeded.

### Path Templates

Extract metadata from file paths into message context. Set `FilterByPathTemplate: true`, define `PathTemplate` with `{placeholder}` tokens, and set `MetaDataMessageProperty` to `"scope:name"` (must contain exactly one `:`). Non-matching files are **skipped**.

```json
{
    "FilterByPathTemplate": true,
    "PathTemplate": "data/{region}/{year}/{month}/{filename}.csv",
    "MetaDataMessageProperty": "s3:pathinfo"
}
```

Given `data/us-east/2024/06/sensors.csv`, context gets `s3:pathinfo.region` = `"us-east"`, etc.

---

## Process Log Filtering (ProcessLogConfig)

Prevents reprocessing already-imported files via a MapLarge tracking table.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Account` | string | | MapLarge account owning the tracking table |
| `Table` | string | | Tracking table name |
| `KeyColumn` | string | `"key"` | Column storing the file key/path |
| `LastModifiedColumn` | string | `"lastModified"` | Column storing the file's last modification timestamp |
| `FileTimestampColumn` | string | `null` | Column storing the file's own data timestamp |
| `ProcessTimeColumn` | string | `null` | Column recording when the file was processed |
| `IdentityColumn` | string | `null` | Column for identity value of duplicate objects |
| `AutoAppendToTable` | bool | `true` | Auto-append to tracking table on each file import |
| `DisableLastModifiedFilter` | bool | `false` | Only use `KeyColumn` when checking (ignore `LastModifiedColumn`) |

The tracking table must exist before the on-ramp starts. Process log filtering is active when `Account`, `Table`, `KeyColumn`, and `LastModifiedColumn` are all non-empty.

```json
{
    "ProcessLogFilter": {
        "Account": "system",
        "Table": "s3_process_log",
        "KeyColumn": "file_key",
        "LastModifiedColumn": "last_modified",
        "AutoAppendToTable": true
    }
}
```

---

## Messaging Connectors (Push-Based)

### KafkaConnector

**PluginName**: `"KafkaConnector"` | **Type**: Accepting | **Base**: `AbstractTestableConnector`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Topic` | string | `""` | Kafka topic to subscribe to (singular string, not array) |
| `Endpoint` | string | `""` | Bootstrap server address (e.g., `"broker1:9092"`) |
| `MultipleEndpoints` | string[] | `null` | Multiple broker addresses (alternative to `Endpoint`) |
| `GroupId` | string | `""` | Consumer group ID |
| `StartAtBeginning` | bool | `false` | `true` → offset reset `Earliest`; `false` → `Latest` |
| `EnableAutoCommit` | bool | `true` | Auto-commit offsets. `false` = acknowledge only after processing |
| `ResetTrackingOnStartup` | bool | `false` | Generate new random GroupId each run |
| `FaultIfTopicNotFound` | bool | `false` | Fault connector if topic doesn't exist |
| `ConsumeTimeoutMilliseconds` | int | `1000` | Timeout per consume call |
| `ManualCommitMaxMessages` | int | `10` | Max messages per batch before committing (manual-commit mode) |
| `ManualCommitConsumeMaxMilliseconds` | int | `100` | Max time in ms per consume batch (manual-commit mode) |
| **SSL/TLS** | | | |
| `UseSSL` | bool | `false` | Enable SSL/TLS for broker connections |
| `SSLCACert` | string | `""` | Path to CA certificate file |
| `SSLClientCert` | string | `null` | Path to client public key PEM (mutual TLS) |
| `SSLKey` | string | `""` | Path to client private key PEM |
| `SSLKeyPassword` | string | `""` | Private key passphrase |
| `UseSSLEndpointIdentification` | bool | `false` | Validate broker hostname against certificate |
| **SASL** | | | |
| `SaslMechanism` | string | `null` | `PLAIN`, `SCRAM-SHA-256`, `SCRAM-SHA-512`, `GSSAPI` |
| `SaslUsername` | string | `""` | SASL username |
| `SaslPassword` | string | `""` | SASL password (takes precedence over file) |
| `SaslPasswordFile` | string | `""` | Path to SASL password file (auto-encrypted after first read) |
| **Advanced** | | | |
| `IdPropertyScope` | string | `""` | Message context scope for message identifier |
| `IdPropertyName` | string | `""` | Message context property name for message identifier |
| `ReadMessageHeaders` | bool | `false` | Read Kafka headers into context as UTF-8 strings |
| `ManualConsumerSettings` | Dictionary\<string, string\> | `null` | Raw librdkafka consumer overrides |

**Security protocol selection:**

| `UseSSL` | `SaslMechanism` | Protocol |
|----------|----------------|----------|
| `false` | `null` | Plaintext |
| `true` | `null` | SSL |
| `false` | set | SASL_PLAINTEXT |
| `true` | set | SASL_SSL |

**Message context** (scopes: `"kafka"` and `"streaming-scope"` — all properties are set on both):

| Key | Value |
|-----|-------|
| `message_timestamp` | Message timestamp (ISO 8601 via `.ToString("o")`) |
| `topic` | The configured `Topic` value |
| `id_property_scope` | `IdPropertyScope` value (only when `IdPropertyScope` is set) |
| `id_property_name` | `IdPropertyName` value (only when `IdPropertyScope` is set) |
| `<header_key>` | Header values as UTF-8 strings (only when `ReadMessageHeaders: true`) |

**Example:**
```json
{
    "Topic": "sensor-events",
    "Endpoint": "kafka-broker.internal:9092",
    "GroupId": "maplarge-ingest",
    "EnableAutoCommit": true,
    "FaultIfTopicNotFound": true
}
```

**Manual commit (at-least-once delivery):**
```json
{
    "Topic": "critical-data",
    "Endpoint": "kafka-broker.internal:9092",
    "GroupId": "maplarge-exactly-once",
    "EnableAutoCommit": false,
    "ManualCommitMaxMessages": 500,
    "ManualCommitConsumeMaxMilliseconds": 5000
}
```

---

### NATSConnector

**PluginName**: `"NATSConnector"` | **Type**: Accepting | **Base**: Direct `IMLPlugin`

Config extends `NatsConfigBase` (shared with NATSJetStreamConnector).

**NatsConfigBase properties:**

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Endpoint` | string | `"1.2.3.4:4222"` | NATS server address with port |
| `CredentialsPath` | string | `""` | Path to `.creds` file (JWT/NKey) |
| `NatsJwtToken` | string | `""` | Inline JWT token (whitespace auto-stripped; takes precedence over file) |
| `NKey` | string | `""` | Inline NKey seed (whitespace auto-stripped; takes precedence over file) |
| `SecureConnection` | bool | `false` | Enable TLS |
| `SecondsBetweenConnectionRetryAttempts` | int | `-1` | Seconds between reconnection attempts (`-1` = no retry) |
| `MaxConnectionAttempts` | int | `1` | Max connection attempts before faulting |
| `PendingMessageLimit` | int | `1024` | Max pending messages before dropping/waiting |
| `PendingMessageBytesLimit` | int | `65536` | Max pending bytes in buffers |
| `PersistOldestPendingMessages` | bool | `false` | `true` = block/wait when buffer full (no drops); `false` = drop oldest messages when buffer full |

**NATSConnector-specific properties:**

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Subjects` | string[] | `["example subject"]` | Subjects to subscribe to (supports NATS wildcards: `>`, `*`) |
| `QueueGroupName` | string | `""` | Queue group for load balancing |

**Auth priority:** 1. Inline JWT/NKey (both required, whitespace stripped) → 2. `CredentialsPath` `.creds` file. File changes trigger auto-reconnection (throttled to 1s).

**Message context** (scope: `"nats"`):

| Key | Value |
|-----|-------|
| `subject` | Message subject |
| `<header_key>` | Individual header values (one property per header key-value pair) |

**Example:**
```json
{
    "Endpoint": "nats://nats-cluster.internal:4222",
    "Subjects": ["sensors.>"],
    "QueueGroupName": "ml-workers",
    "CredentialsPath": "/secrets/nats/user.creds"
}
```

---

### NATSJetStreamConnector

**PluginName**: `"NATSJetStreamConnector"` | **Type**: Accepting | **Base**: Direct `IMLPlugin`

Config extends `NatsConfigBase` (inherits all properties listed above under NATSConnector).

**JetStream-specific properties:**

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Stream` | string | `"stream name"` | JetStream stream name |
| `DurableConsumerName` | string | `""` | Durable consumer name (survives restarts) |
| `DeliverPolicy` | string | `"All"` | Starting position (see table below) |
| `OptStartSeq` | ulong? | `null` | Starting sequence (required for `ByStartSequence`) |
| `OptStartTime` | DateTime? | `null` | Starting timestamp (required for `ByStartTime`) |
| `FilterSubjects` | string[] | `[]` | Subject filters within the stream |

**Deliver policies:**

| Policy | Behavior |
|--------|----------|
| `All` | Replay all messages from stream beginning (default) |
| `Last` | Last message in the stream |
| `New` | Only messages published after consumer creation |
| `LastPerSubject` | Latest message per subject |
| `ByStartSequence` | From specific sequence number (`OptStartSeq` required) |
| `ByStartTime` | From specific timestamp (`OptStartTime` required) |

Same auth, credential rotation, and message context as NATSConnector.

**Example:**
```json
{
    "Endpoint": "nats://nats-cluster.internal:4222",
    "Stream": "EVENTS",
    "DurableConsumerName": "ml-event-consumer",
    "DeliverPolicy": "New",
    "FilterSubjects": ["events.sensor.*", "events.alert.*"],
    "CredentialsPath": "/secrets/nats/user.creds"
}
```

---

### MQTTConnector

**PluginName**: `"MQTTConnector"` | **Type**: Accepting | **Base**: Direct `IMLPlugin`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Topics` | string[] | `["example topic"]` | MQTT topics to subscribe to (supports `+` and `#` wildcards) |
| `Endpoint` | string | `"localhost"` | MQTT broker hostname (passed to `WithTcpServer`) |

**No authentication options** are exposed in the Config class.

**Message context** (scope: `"mqtt"`):

| Key | Value |
|-----|-------|
| `topic` | Message topic |
| `QOS` | Quality of Service level |
| `content-type` | Message content type |
| `dup` | Duplicate flag |
| `retain` | Retain flag |
| `responseTopic` | Response topic (MQTT v5) |
| `topicAlias` | Topic alias (MQTT v5) |
| `payloadFormat` | Payload format indicator string (MQTT v5) |
| `receivedTime` | UTC receive timestamp (ISO 8601 via `.ToString("o")`) |

**Example:**
```json
{
    "Endpoint": "mqtt-broker.internal",
    "Topics": ["devices/+/telemetry", "alerts/#"]
}
```

---

### PulsarConnector

**PluginName**: `"PulsarConnector"` | **Type**: Accepting | **Base**: `AbstractTestableConnector`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Topic` | string | `""` | Pulsar topic (e.g., `"persistent://tenant/namespace/topic"`) |
| `Subscription` | string | `""` | Subscription name |
| `StartAtBeginning` | bool | `false` | `true` → `Earliest`; `false` → `Latest` |
| `Endpoint` | string | `""` | Broker address (e.g., `"pulsar://localhost:6650"`) |
| `MultipleEndpoints` | string[] | `null` | Multiple broker addresses |
| **Token Auth** | | | |
| `Token` | string | `""` | Inline authentication token (highest priority) |
| `TokenCredentialsPath` | string | `""` | Path to token file on disk (supports credential rotation) |
| **TLS / Certificates** | | | |
| `UseSecureConnection` | bool | `false` | Enable TLS |
| `UseSSL` | bool | *(deprecated)* | Alias for `UseSecureConnection` — maps to same property |
| `SSLCACert` | string | `""` | Path to CA certificate PEM |
| `SSLClientCert` | string | `""` | Path to client certificate PEM (mutual TLS triggered automatically when both `SSLClientCert` and `SSLClientKey` are non-empty) |
| `SSLClientKey` | string | `""` | Path to client private key PEM |
| `VerifyCertificateName` | bool | `true` | Verify server cert hostname |
| `VerifyCertificateAuthority` | bool | `true` | Verify server cert CA chain |
| `IdPropertyScope` | string | `""` | Message context scope for message identifier |
| `IdPropertyName` | string | `""` | Message context property name for message identifier |

**Auth (checked in order):** 1. Inline `Token` → 2. `TokenCredentialsPath` file (with rotation watcher) → 3. Mutual TLS (`SSLClientCert` + `SSLClientKey`)

**Message context** (scope: `"streaming-scope"`):

| Key | Value |
|-----|-------|
| `message_timestamp` | Message timestamp (ISO 8601 via `.ToString("o")`) |
| `topic` | The configured `Topic` value |
| `id_property_scope` | `IdPropertyScope` value (only when `IdPropertyScope` is set) |
| `id_property_name` | `IdPropertyName` value (only when `IdPropertyScope` is set) |

**Example:**
```json
{
    "Endpoint": "pulsar://pulsar-cluster.internal:6650",
    "Topic": "persistent://tenant/namespace/sensor-data",
    "Subscription": "ml-ingest",
    "Token": "eyJhbGciOiJSUzI1NiJ9..."
}
```

---

### ActiveMQConnector

**PluginName**: `"ActiveMQConnector"` | **Type**: Accepting | **Base**: Direct `IMLPlugin`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Endpoint` | string | `"http://server.com"` | Broker URI (e.g., `"activemq:tcp://localhost:61616"`) |
| `QueueOrTopic` | string | `""` | Destination — prefix with `topic:` for topics (e.g., `"queue:sensor-data"`) |
| `UserName` | string | `""` | Authentication username |
| `Password` | string | `""` | Authentication password |
| `ClientId` | string | `""` | Client identifier (required for durable topic subscriptions) |
| `AcknowledgementMode` | AcknowledgementMode | `ClientAcknowledge` | `AutoAcknowledge`, `ClientAcknowledge`, `DupsOkAcknowledge`, `IndividualAcknowledge` |

**Message context** (scope: `"amq"`):

| Key | Value |
|-----|-------|
| `delivery-mode` | NMS delivery mode |
| `destination` | NMS destination |
| `message-id` | NMS message ID |
| `priority` | NMS priority |
| `redelivered` | Redelivered flag |
| `timestamp` | NMS timestamp (ISO 8601) |
| `ttl` | NMS time-to-live |

**Example:**
```json
{
    "Endpoint": "activemq:tcp://amq-broker.internal:61616",
    "QueueOrTopic": "queue:incoming-data",
    "UserName": "ml-consumer",
    "Password": "secret",
    "AcknowledgementMode": "ClientAcknowledge"
}
```

---

### SQSConnector

**PluginName**: `"SQSConnector"` | **Type**: Polling or LongRunning (based on `IsOneTime`) | **Base**: `AbstractPollableConnector`

Config extends `BasePollingConnectorConfig`.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `QueueEndpoint` | string | `"https://sqs.us-east-1.amazonaws.com/"` | SQS queue URL |
| `AccessKey` | string | `null` | AWS access key |
| `SecretKey` | string | `null` | AWS secret key |
| `Region` | string | `"us-east-1"` | AWS region |
| `MaxMessagesWhenReceiving` | int | `1` | Batch size per receive call (1-10) |
| `WaitTimeSeconds` | int | `0` | Long polling wait time (0-20 seconds) |

Plus all `BasePollingConnectorConfig` properties (`PollingFrequencyMS`, `CronExpression`, `RunOnStartup`, `RunInAcceptingMode`, etc.).

**Message context** (scope: `"SQSConnector"`):

| Key | Value |
|-----|-------|
| `MessageId` | SQS message ID |
| `<attribute_key>` | Each SQS message attribute |
| `ProcessTime` | UTC processing timestamp |

**Example:**
```json
{
    "QueueEndpoint": "https://sqs.us-east-1.amazonaws.com/123456789/my-queue",
    "AccessKey": "AKIAIOSFODNN7EXAMPLE",
    "SecretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Region": "us-east-1",
    "MaxMessagesWhenReceiving": 10,
    "WaitTimeSeconds": 20,
    "PollingFrequencyMS": 1000
}
```

---

### WebSocketMessageConnector

**PluginName**: `"WebSocketMessageConnector"` | **Type**: Accepting | **Base**: Direct `IMLPlugin`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `EndPoint` | string | `null` | WebSocket URI (e.g., `"wss://stream.example.com/feed"`) |
| `SubscriptionMessage` | string | `null` | Message to send upon connection |
| `ConnectionDurationMS` | int | `-1` | Connection timeout in ms (`-1` = infinite) |
| `ConnectionSpan` | string | `null` | TimeSpan string alternative (e.g., `"00:05:00"`) |
| `RecvTimeoutSec` | int | `0` | Receive timeout in seconds (`0` = no timeout) |
| `IgnoreErrors` | bool | `false` | Reconnect on error instead of faulting |

**No message context properties** are set by this connector. No authentication options.

**Example:**
```json
{
    "EndPoint": "wss://stream.example.com/realtime",
    "SubscriptionMessage": "{\"action\":\"subscribe\",\"channel\":\"trades\"}",
    "RecvTimeoutSec": 30,
    "IgnoreErrors": true
}
```

---

### PushedMessageConnector

**PluginName**: `"PushedMessageConnector"` | **Type**: Accepting | **Base**: Direct `IMLPlugin`

Exposes an HTTP POST endpoint. Query parameters can be promoted to message context.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `PromotableProperties` | PromotableProperty[] | `[{}]` | Maps HTTP query parameters to message context properties |

**PromotableProperty fields:**

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `ParameterName` | string | `""` | HTTP query parameter name |
| `ContextScope` | string | `""` | Message context scope |
| `ContextName` | string | `""` | Message context property name |

**Example:**
```json
{
    "PromotableProperties": [
        {
            "ParameterName": "source",
            "ContextScope": "http",
            "ContextName": "data_source"
        }
    ]
}
```

When a POST hits `https://server/Api/DataStream/Push?rampId=xyz&source=sensor42`, the context property `http:data_source` is set to `"sensor42"`.

---

## Polling / LongRunning Connectors

### HttpPollingConnector

**PluginName**: `"HttpPollingConnector"` | **Type**: Polling or LongRunning | **Base**: `BasePollingConnector` (supports incremental tracking)

Config extends `BasePollingConnectorConfig` and implements `IEndpointPollableConnectorConfig`.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `EndPoint` | string | `null` | Target URL (inherited from `BasePollingConnectorConfig`) |
| `MultipleEndpoints` | string[] | `null` | Query multiple URLs |
| `UsePost` | bool | `false` | Use HTTP POST instead of GET |
| `PostPayload` | string | `null` | POST body (JSON string) — supports `{{TRACKING_FIELD}}`, `{{TRACKING_VALUE}}`, `{{CURSOR_VALUE}}`, `{{OFFSET_VALUE}}`, `{{PAGE_SIZE}}` placeholders |
| `MediaType` | string | `"application/json"` | Content type for POST (`"application/json"`, `"application/xml"`, `"text/plain"`) |
| `AuthenticationType` | AuthenticationType | `None` | `None`, `ApiKeyInUrl`, `ApiKeyInHeaders`, `Basic` |
| `ApiKeyParameterName` | string | `null` | API key parameter/header name |
| `ApiKeyValue` | string | `null` | API key value |
| `Username` | string | `null` | Basic auth username |
| `Password` | string | `null` | Basic auth password |
| `IgnoreErrors` | bool | `true` | Continue on HTTP errors vs. fault |
| `DoNotTrack` | bool | `false` | Skip incremental tracking updates |
| `StartDate` | DateTime? | `null` | Initial start date for tracking |
| `TrackingFieldName` | string | `""` | Field name in response for incremental updates |
| `TrackingStartValue` | string | `""` | Default starting tracking value |
| `DateSubstitutionFormat` | string | `""` | Date format for URL/body placeholders |
| `TimeZoneOverride` | string | `""` | Timezone for date substitution |
| `CursorParameterName` | string | `null` | Query parameter name for pagination cursor |
| `CursorContextScope` | string | `"__cursor"` | Context scope where cursor value is stored |
| `CursorContextKey` | string | `"__value"` | Context key where cursor value is stored |
| `PaginationDelayMs` | int | `0` | Delay between paginated requests |
| `CustomRequestHeaders` | Dictionary\<string, string\> | `[]` | Custom HTTP request headers added to every request |
| **Offset Pagination** | | | |
| `OffsetParameterName` | string | `null` | Query parameter name for offset-based pagination (e.g., `"offset"` or `"startRecord"`) |
| `OffsetStartValue` | int | `1` | Starting offset value |
| `PageSize` | int | `0` | Number of records per page (used with offset pagination) |
| `RecordCountContextScope` | string | `"__offset"` | Context scope where record count is stored |
| `RecordCountContextKey` | string | `"recordsReturned"` | Context key for the number of records returned |
| `NextRecordContextKey` | string | `"nextRecordNum"` | Context key for the next record number |

Plus all `BasePollingConnectorConfig` properties.

#### Two Separate Placeholder Systems

HttpPollingConnector has **two independent placeholder systems**:

##### System 1: Relative Date Tokens (rolling window, no tracking needed)

Recalculated fresh on **every poll**, independent of `DoNotTrack` and the tracking system.

| Placeholder | Resolves To |
|-------------|-------------|
| `{now}` | Current UTC datetime |
| `{today}` | Current UTC date |
| `{now-30d}` | 30 days before now |
| `{now+7h}` | 7 hours after now |
| `{now-15m}` | 15 minutes before now |

Format controlled by `DateSubstitutionFormat`. Use `TimeZoneOverride` to convert from UTC.

```json
{
    "EndPoint": "https://api.example.com/events?from={now-1h}&to={now}",
    "DateSubstitutionFormat": "yyyy-MM-ddTHH:mm:ssZ",
    "TimeZoneOverride": "America/New_York",
    "DoNotTrack": true,
    "PollingFrequencyMS": 300000
}
```

##### System 2: Tracking Placeholders (automatic "since last run" — requires DoNotTrack: false)

The connector saves each run's end date and uses it as the next run's start date — built-in "since last run" with no gaps.

**GET tracking placeholders** (in URL, substituted by `BuildUrl()`):

| Placeholder | Resolves To |
|-------------|-------------|
| `{year1}` | Start date year (previous run's end date, or `StartDate` config, or Jan 1 of current year) |
| `{month1}` | Start date month |
| `{day1}` | Start date day |
| `{year2}` | End date year (always `DateTime.Today` — midnight of current day) |
| `{month2}` | End date month |
| `{day2}` | End date day |

**IMPORTANT: GET tracking is day-granularity only.** `date2` is hardcoded to `DateTime.Today` (midnight). No hour/minute/second placeholders exist. The connector skips the request if the built URL matches the previous poll's URL (same day = same URL = skip). **Suited for daily or less frequent polling only.**

**For sub-day polling, use instead:**
1. **Relative date tokens** (`{now}`, `{now-1h}`) with `DoNotTrack: true` — rolling window with full timestamp precision. No tracking state. Gaps possible if polls are missed.
2. **POST tracking with `{{TRACKING_VALUE}}`** — tracked value can be any format (e.g., ISO timestamps). `FieldTrackingTransform` extracts new value from response. True "since last run" at any granularity with no gaps.

**GET tracking flow:** First run: `date1` = `StartDate` (or Jan 1 of current year). `date2` = today. After processing, saves `{ StartDate, EndDate }`. Next run: `date1` = previous `EndDate`, `date2` = today.

```json
{
    "EndPoint": "https://api.example.com/data?from={year1}-{month1}-{day1}&to={year2}-{month2}-{day2}",
    "DateSubstitutionFormat": "00",
    "StartDate": "2024-01-01",
    "PollingFrequencyMS": 86400000
}
```

**POST tracking placeholders** (in `PostPayload`):

| Placeholder | Resolves To |
|-------------|-------------|
| `{{TRACKING_VALUE}}` | The saved tracking value from the previous run (or `TrackingStartValue` on first run) |
| `{{TRACKING_FIELD}}` | The configured `TrackingFieldName` |

**POST tracking flow:** First run: `{{TRACKING_VALUE}}` = `TrackingStartValue` (or empty). After processing, `FieldTrackingTransform` extracts a value from response data, saved as `PostTrackingValue`. Next run uses that value.

```json
{
    "EndPoint": "https://api.example.com/query",
    "UsePost": true,
    "PostPayload": "{\"since\": \"{{TRACKING_VALUE}}\", \"limit\": 1000}",
    "TrackingFieldName": "lastModified",
    "TrackingStartValue": "2024-01-01T00:00:00Z",
    "PollingFrequencyMS": 300000
}
```

#### Cursor-Based Pagination (within a single run)

Pages through a single API response (vs. tracking which spans across runs). Configure cursor context keys, use `PropertiesToPromote` in pipeline to extract cursor, connector appends to next request. **GET:** `CursorParameterName=value` in URL. **POST:** `{{CURSOR_VALUE}}` in `PostPayload`. Continues until cursor is empty/null. Can combine with tracking.

#### Offset-Based Pagination (within a single run)

Pages through results using a numeric offset. Set `OffsetParameterName` (e.g., `"offset"`) and `PageSize`. The connector appends the offset as a query parameter (**GET**) or substitutes `{{OFFSET_VALUE}}` and `{{PAGE_SIZE}}` in `PostPayload` (**POST**). Pagination continues while the number of records returned equals `PageSize`.

The pipeline must set the record count in context via `PropertiesToPromote` or similar — the connector reads `RecordCountContextScope:RecordCountContextKey` to decide whether another page exists.

```json
{
    "EndPoint": "https://api.example.com/data?limit=100",
    "OffsetParameterName": "offset",
    "OffsetStartValue": 0,
    "PageSize": 100,
    "RecordCountContextScope": "__offset",
    "RecordCountContextKey": "recordsReturned",
    "PollingFrequencyMS": 300000
}
```

#### `DoNotTrack` Summary

**`DoNotTrack: false` (default)** — enables tracking/bookmarking:
- **GET:** Saves `EndDate`; next run starts from previous end date. Requires `{year1}` etc. in URL.
- **POST:** Saves `PostTrackingValue`; next run substitutes into `{{TRACKING_VALUE}}`. Requires `FieldTrackingTransform`.
- **Validation:** When `false` + `UsePost: false` + no cursor, URL must contain `{` (date placeholder), else throws `"Set DoNotTrack to true, or add parameters to the EndPoint."`

**`DoNotTrack: true`** — disables tracking:
- No tracking data read or saved between runs
- Relative date tokens (`{now}`, `{now-1h}`) still work (separate system)
- Date placeholders in URL still work — `DoNotTrack` only disables the bookmarking system, not date substitution
- Use when: API returns full/current dataset, using rolling relative dates, or deduplication handled downstream

**Other connectors:** `DoNotTrack` on WfsConnector skips OGC tracking filter; on AttachedFilesystemConnector skips file timestamp tracking. For S3/Azure/GCS, the equivalent is `FilterByLatestFileTimestamp`.

#### Validation Rules

- At least one endpoint required (`EndPoint` or `MultipleEndpoints`); basic auth requires both `Username` and `Password`
- `UsePost` requires `PostPayload` (and vice versa); `MediaType` must be `"application/json"`, `"application/xml"`, or `"text/plain"`

**Example — GET polling with date substitution:**
```json
{
    "EndPoint": "https://api.example.com/data?since={now-1h}",
    "DateSubstitutionFormat": "yyyy-MM-ddTHH:mm:ssZ",
    "PollingFrequencyMS": 300000
}
```

**Example — POST with cursor pagination:**
```json
{
    "EndPoint": "https://api.example.com/query",
    "UsePost": true,
    "PostPayload": "{\"cursor\": \"{{CURSOR_VALUE}}\", \"limit\": 100}",
    "MediaType": "application/json",
    "CursorContextScope": "streaming_msg",
    "CursorContextKey": "next_cursor",
    "PaginationDelayMs": 200,
    "PollingFrequencyMS": 600000
}
```

---

### S3Connector

**PluginName**: `"S3Connector"` | **Type**: LongRunning or Polling | **Base**: `AbstractPollableConnector`

Config extends `AbstractPollingConnectorConfig`. Max threads: **50**.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Bucket` | string | `null` | S3 bucket name |
| `AccessKey` | string | `null` | AWS access key ID |
| `SecretKey` | string | `null` | AWS secret access key |
| `Region` | string | `null` | AWS region (e.g., `"us-east-1"`) |
| `KMSKey` | string | `null` | AWS KMS key ID for server-side encryption |
| `ServiceUrl` | string | `null` | Custom S3-compatible endpoint (MinIO, Ceph) |
| `UseHttp` | bool | `false` | Use HTTP instead of HTTPS (only with custom `ServiceUrl`) |
| `Anonymous` | bool | `false` | Unauthenticated access (public buckets) |
| `RequesterPays` | bool | `false` | Enable requester-pays requests |
| `SkipSizeZero` | bool | `false` | Skip zero-byte objects |
| `CopyS3ConfigToMessage` | bool | `false` | Copy S3 credentials to message context (also triggered by `CopyConfigToMessage`) |

Plus all `AbstractPollingConnectorConfig` and `BasePollingConnectorConfig` properties.

**Message context** (scope: `"S3Connector"`):

| Key | Value |
|-----|-------|
| `BucketName` | S3 bucket name |
| `Key` | S3 object key |
| `Size` | Object size |
| `LastModified` | Object last modified timestamp |
| `ProcessTime` | UTC processing timestamp |

When `CopyS3ConfigToMessage` is true, also copies `AccessKey`, `SecretKey`, `KMSKey` (marked sensitive), `Region`, `Bucket`, `ServiceUrl`, `UseHttp`.

**Example:**
```json
{
    "Bucket": "my-data-lake",
    "AccessKey": "AKIAIOSFODNN7EXAMPLE",
    "SecretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Region": "us-east-1",
    "Prefix": "incoming/2024/",
    "MaxThreads": 10,
    "MinimumFileAgeMS": 5000,
    "PollingFrequencyMS": 60000
}
```

---

### AzureStorageConnector

**PluginName**: `"AzureStorageConnector"` | **Type**: LongRunning or Polling | **Base**: `AbstractPollableConnector`

Config is `AzureStorageConfig` extending `AbstractPollingConnectorConfig`. Max threads: **25**.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Credentials` | Dictionary\<string, string\> | `{}` | Authentication credentials (connection string, SAS token, etc.) |

Plus all `AbstractPollingConnectorConfig` and `BasePollingConnectorConfig` properties.

The `Credentials` dictionary typically contains `"ConnectionString"`:
```json
"Credentials": {
    "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
}
```

**Message context** (scope: `"AzureStorageConnector"`):

| Key | Value |
|-----|-------|
| `Name` | Blob name |
| `ContentLength` | Blob size |
| `LastModified` | Blob last modified timestamp |
| `ProcessTime` | UTC processing timestamp |

**Example:**
```json
{
    "EndPoint": "my-container",
    "Credentials": {
        "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=...;EndpointSuffix=core.windows.net"
    },
    "Prefix": "data/",
    "MaxThreads": 5,
    "PageSize": 500,
    "PollingFrequencyMS": 120000
}
```

---

### GoogleCloudStorageConnector

**PluginName**: `"GoogleCloudStorageConnector"` | **Type**: LongRunning or Polling | **Base**: `AbstractPollableConnector`

Config is `GCSConnectorConfig` extending `AbstractPollingConnectorConfig`. Max threads: **25**.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Bucket` | string | `null` | GCS bucket name |
| `KeyFile` | string | `null` | Path to service account JSON key file |
| `Anonymous` | bool | `false` | Unauthenticated access (public buckets) |

Plus all `AbstractPollingConnectorConfig` and `BasePollingConnectorConfig` properties.

**Message context** (scope: `"GoogleCloudStorageConnector"`):

| Key | Value |
|-----|-------|
| `Bucket` | GCS bucket name |
| `KeyFile` | Service account key file path |
| `Name` | Object name |
| `Size` | Object size |
| `LastModified` | Object last modified timestamp |
| `ProcessTime` | UTC processing timestamp |

**Example:**
```json
{
    "Bucket": "my-data-bucket",
    "KeyFile": "/secrets/gcp/service-account.json",
    "Prefix": "exports/",
    "MaxThreads": 5,
    "PollingFrequencyMS": 300000
}
```

---

### FileSystemConnector

**PluginName**: `"FileSystemConnector"` | **Type**: LongRunning | **Base**: Direct `IMLPlugin`

Config implements `IMLAcceptsPushedRecordsConfig` directly (not via `BasePollingConnectorConfig`).

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `LocationToWatch` | string | `"C:/temp/"` | Directory path to scan (auto-created if missing) |
| `Filter` | string | `"*"` | File pattern (e.g., `"*.csv"`) |
| `PollingFrequencyMS` | int | `5000` | Scan interval in ms |
| `MinimumFileAgeMS` | int | `1000` | Min file age before processing |
| `Recursive` | bool | `false` | Recurse into subdirectories |
| `StreamBufferSize` | int | `4096` | Buffer size for file reading |
| `RunInAcceptingMode` | bool | `false` | Switch to pushed-records mode |
| `PushedDataMapping` | MLPushedRecordMapping[] | `null` | Pushed record field mappings |
| `PushedRecordIsConfig` | bool | `false` | Treat pushed record as full config |

**Message context** (scope: `"FileSystemConnector"`):

| Key | Value |
|-----|-------|
| `OriginalFileName` | File name (not full path) |

**Example:**
```json
{
    "LocationToWatch": "/data/incoming",
    "Filter": "*.geojson",
    "Recursive": true,
    "PollingFrequencyMS": 30000,
    "MinimumFileAgeMS": 5000
}
```

---

### SFTPConnector

**PluginName**: `"SFTPConnector"` | **Type**: LongRunning or Polling | **Base**: `AbstractPollableConnector`

Config extends `BasePollingConnectorConfig` (NOT `AbstractPollingConnectorConfig` — it has its own file-oriented properties). Max threads: **25**.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Host` | string | `null` | SFTP server hostname |
| `Port` | string | `null` | SFTP port (string, parsed internally) |
| `Username` | string | `null` | SSH username (supports `"scope:propertyName"` for context substitution) |
| `Password` | string | `null` | SSH password (supports `"scope:propertyName"` for context substitution) |
| `RemoteDirectoryPath` | string | `null` | Remote directory to scan |
| `IncludeRegexes` | string[] | `[]` | Regex patterns — only process matching files |
| `ExcludeRegexes` | string[] | `[]` | Regex patterns — skip matching files |
| `CopyConfigToMessage` | bool | `false` | Copy Host, Port, RemoteDirectoryPath, Username, Password to context |
| `MaxThreads` | int | `1` | Max concurrent file processing |
| `MinimumFileAgeMS` | int | `1000` | Min file age before processing |
| `MinimumLastModified` | DateTimeOffset | `DateTimeOffset.MinValue` | Default last modified date |
| `FilterByLatestFileTimestamp` | bool | `true` | Skip files older than latest processed |

Plus `BasePollingConnectorConfig` scheduling properties.

**Context substitution:** `Username`/`Password` support `"scope:propertyName"` format — resolved from message context at runtime (useful in pushed-records mode).

**Message context** (scope: `"SFTPConnector"`):

| Key | Value |
|-----|-------|
| `OriginalFileName` | Full file name on SFTP server |
| `Length` | File size |
| `LastWriteTimeUtc` | File last write timestamp |
| `ProcessTime` | UTC processing timestamp |

**Example:**
```json
{
    "Host": "sftp.partner.com",
    "Port": "22",
    "Username": "ml-ingest",
    "Password": "secret",
    "RemoteDirectoryPath": "/exports/daily",
    "IncludeRegexes": [".*\\.csv$"],
    "MaxThreads": 3,
    "PollingFrequencyMS": 3600000,
    "MinimumFileAgeMS": 10000
}
```

---

### RelationalDatabaseConnector

**PluginName**: `"RelationalDatabaseConnector"` | **Type**: Polling (always, not conditional) | **Base**: `AbstractPollableConnector`

Config extends `BasePollingConnectorConfig`.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Provider` | string | `""` | ADO.NET provider (`"System.Data.SqlClient"`, `"Npgsql"`, etc.) |
| `ConnectionString` | string | `""` | Database connection string |
| `Query` | string | `""` | Single SQL query |
| `Queries` | Dictionary\<string, string\> | `null` | Named queries — keys become pipeline routing keys |
| `TrackingColumnName` | string | `""` | Column to track for incremental updates |
| `InitialTrackValue` | string | `"1970-01-01 00:00:00"` | Starting value for tracking |
| `TrackDateFormat` | string | `"yyyy-MM-dd HH:mm:ss"` | Date format for tracking value |
| `TrackMinumumAgeSeconds` | long | `0` | Min age in seconds (max 86400) |
| `MaxRecordsPerBatch` | int | `1000` | Records per batch (1–100000) |
| `PollingFrequencyMS` | int | `15000` | **Override** — default 15s instead of base -1 (range 1000–3600000) |
| `TestUuid` | string | `""` | Test UUID field (validated as UUID format) |

Plus `BasePollingConnectorConfig` scheduling properties.

**Incremental tracking:** When `TrackingColumnName` is set, queries must contain `{TRACKING}`. Tracker type selected by `InitialTrackValue`: empty → `SQLNoopTracker` (disabled); date-parseable → `SQLDateTracker`; long-parseable → `SQLIntegerTracker`; else throws. Empty `InitialTrackValue` disables tracking even if `TrackingColumnName` is set.

**Validation:** Provider, ConnectionString, and at least one query required. No message context properties.

**Example:**
```json
{
    "Provider": "Npgsql",
    "ConnectionString": "Host=db.internal;Database=sensors;Username=reader;Password=secret",
    "Query": "SELECT * FROM readings WHERE timestamp > '{TRACKING}' ORDER BY timestamp",
    "TrackingColumnName": "timestamp",
    "InitialTrackValue": "2024-01-01T00:00:00Z",
    "TrackDateFormat": "yyyy-MM-ddTHH:mm:ssZ",
    "PollingFrequencyMS": 60000
}
```

---

### ElasticsearchConnector

**PluginName**: `"ElasticsearchConnector"` | **Type**: LongRunning or Polling | **Base**: `AbstractPollableConnector`

Config extends `BasePollingConnectorConfig`.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `EndpointUri` | string | `"http://server.com/"` | Elasticsearch search URL (e.g., `"https://es:9200/myindex/_search"`) |
| `Authorization` | string | `""` | Authorization header value (e.g., `"Basic base64..."` or `"Bearer token"`) |
| `UseTimeStampField` | string | `""` | Field for incremental polling (e.g., `"@timestamp"`) — auto-adds range query |
| `PreventEmptyResults` | bool | `false` | Reject empty result sets before processing |

Plus `BasePollingConnectorConfig` scheduling properties.

**Message context** (scope: `"ElasticsearchConnector"`):

| Key | Value |
|-----|-------|
| `LAST_EXECUTION_TIMESTAMP` | Previous poll timestamp |
| `NEW_LAST_EXECUTION_TIMESTAMP` | Timestamp for tracking update |
| `REQUEST_METHOD` | `"Search"` or `"Scroll"` |
| `SEARCH_BODY` | Raw JSON search body |

**Example:**
```json
{
    "EndpointUri": "https://es-cluster.internal:9200/logs-*/_search",
    "Authorization": "ApiKey base64encodedkey",
    "UseTimeStampField": "@timestamp",
    "PollingFrequencyMS": 60000
}
```

---

### ArcGISRestConnector

**PluginName**: `"ArcGIS Rest Connector"` *(note the spaces)* | **Type**: Polling or LongRunning | **Base**: `BasePollingConnector`

Config extends `BasePollingConnectorConfig`.

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `EndPoint` | string | `null` | Feature service URL |
| `MultipleEndpoints` | string[] | `null` | Multiple feature service URLs |
| `ParallelFactor` | int | `1` | Parallel import threads per layer |
| `SimplifyColumnNames` | bool | `false` | Simplify ArcGIS field names |
| `AccountCode` | string | `null` | Destination MapLarge account |
| `TableName` | string | `null` | Destination table name |
| `TableVisibility` | TableVisibility | | Table visibility setting |
| `AppendMode` | bool | `false` | Append vs. replace |
| `SupressionFields` | string | `null` | Fields to exclude |
| `AdditionalTrackingFields` | string | `null` | Additional tracking fields |
| `IncludeObjectIdTracking` | bool | `false` | Track ObjectID for incremental |
| `ExcludeNonCanonicalGeometries` | bool? | `null` | Skip non-canonical geometries |
| `CanonicalGeometryColumn` | string | `null` | Canonical geometry column name |
| `FailureMode` | ContinueOnFailureMode | `None` | Behavior on failure |

Plus `BasePollingConnectorConfig` scheduling properties.

**Example:**
```json
{
    "EndPoint": "https://services.arcgis.com/.../FeatureServer/0",
    "ParallelFactor": 4,
    "IncludeObjectIdTracking": true,
    "CronExpression": "0 2 * * *",
    "RunOnStartup": false
}
```

---

### WfsConnector

**PluginName**: `"WfsConnector"` | **Type**: Polling or LongRunning | **Base**: `BasePollingConnector`

Config is `WfsConnectorConfig` → `OgcConnectorConfig` → `BasePollingConnectorConfig`.

**OgcConnectorConfig properties:**

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `AuthenticationType` | AuthenticationType | `None` | `None`, `ApiKeyInUrl`, `ApiKeyInHeaders`, `Basic` |
| `Username` | string | `null` | Auth username |
| `Password` | string | `null` | Auth password |
| `IgnoreErrors` | bool | `true` | Continue on HTTP errors |
| `Method` | string | `"GET"` | HTTP method (`GET`, `postxml`, `postkvp`) |
| `Version` | string | `null` | WFS version override |
| `StartDate` | DateTime? | `null` | Initial tracking date |
| `DoNotTrack` | bool | `false` | Disable incremental tracking |

**WfsConnectorConfig properties:**

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Features` | List\<string\> | `[]` | Feature type names to query |
| `Hits` | long | `-1` | Max records to retrieve (`-1` = all) |
| `PageSize` | int? | `0` | Features per request (`0` = use server default from GetCapabilities; set `> 0` to override). WFS 1.1.0 disables paging entirely regardless of this value. |
| `TrackingDateField` | string | `null` | Date field for incremental tracking |
| `FilterXml` | string | `null` | OGC filter XML |
| `SrsName` | string | `"EPSG:4326"` | Coordinate reference system |
| `Parsing` | WfsGmlParserConfig | `new()` | Parser config overrides |

`WfsGmlParserConfig` has: `SimplifyColumnNames` (bool), `SwapAxisOrder` (bool), `OutputKey` (string).

**Message context** (scope: `"wfs"`):

| Key | Value |
|-----|-------|
| `version` | WFS version used |
| `featureId` | Feature type identifier |

**Example:**
```json
{
    "EndPoint": "https://geoserver.example.com/wfs",
    "Features": ["namespace:buildings"],
    "Version": "2.0.0",
    "PageSize": 5000,
    "SrsName": "EPSG:4326",
    "TrackingDateField": "last_modified",
    "AuthenticationType": "Basic",
    "Username": "reader",
    "Password": "secret",
    "CronExpression": "0 3 * * *"
}
```

---

## Specialty Connectors

### AttachedFilesystemConnector

**PluginName**: `"AttachedFilesystemConnector"` | **Type**: LongRunning

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `RootPaths` | string[] | `null` | Base directories to scan |
| `ArchiveMode` | ArchiveHandling | `Expand` | Archive handling: `None`, `Expand`, `BrowseOrExpand` |
| `OutputMode` | OutMode | `FileName` | `FileName` (path string) or `Stream` (file stream) |
| `IncludeRegexes` | string[] | `[]` | Regex include patterns |
| `ExcludeRegexes` | string[] | `[]` | Regex exclude patterns |
| `Recursive` | bool | `true` | Recurse into subdirectories |
| `MinimumFileAgeMS` | int | `1000` | Min file age before processing |
| `StreamBufferSize` | int | `4096` | Buffer size for Stream mode |
| `DelayBetweenScanMS` | int | `1000` | Delay between scan cycles |
| `RunOnce` | bool | `false` | Single scan vs. continuous |
| `FaultOnError` | bool | `false` | Fault on scan errors |
| `DoNotTrack` | bool | `false` | Disable file timestamp tracking |
| `Reconciliation` | ReconciliationConfig | `null` | Delete stale rows when files removed |

`ReconciliationConfig`: `AccountCode` (string), `TableName` (string), `LocationColumn` (string).

**Message context** (scope: `"FILE"`):

| Key | Value |
|-----|-------|
| `LOCATION` | Canonical file path |
| `CONTAINING_ARCHIVE` | Parent archive path (if inside archive) |
| `PRESENTATION` | Presentation mode |
| `SIZE_BYTES` | File size |
| `LAST_WRITE_TIME_UTC` | Last write timestamp |
| `RELATIVE_PATH` | Relative path from root |

**Example:**
```json
{
    "RootPaths": ["/mnt/nas/data"],
    "ArchiveMode": "Expand",
    "OutputMode": "Stream",
    "IncludeRegexes": ["\\.csv$", "\\.json$"],
    "MinimumFileAgeMS": 5000,
    "DelayBetweenScanMS": 60000
}
```

---

### TiledImageryConnector

**PluginName**: `"Tiled Imagery Connector"` *(note the spaces)* | **Type**: LongRunning

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `EndPoint` | string | `"http://server.com/"` | WMTS GetCapabilities URL, ArcGIS MapServer URL, or XYZ `{x}{y}{z}` template |
| `MinZoom` | int | `-1` | Min zoom level (`-1` = auto-detect from capabilities) |
| `MaxZoom` | int | `-1` | Max zoom level (`-1` = auto-detect from capabilities) |
| `WMTSLayerTitle` | string | `null` | Layer name for WMTS services |

Geographic bounds are read from WMTS capabilities (`WGS84BoundingBox`) at runtime — there is no BoundingBox config property.

**Message context** (scope: `"tile"`):

| Key | Value |
|-----|-------|
| `x` | Tile X coordinate |
| `y` | Tile Y coordinate |
| `z` | Tile zoom level |
| `url` | Tile URL |

**Example:**
```json
{
    "EndPoint": "https://tiles.example.com/wmts/1.0.0/WMTSCapabilities.xml",
    "WMTSLayerTitle": "satellite-imagery",
    "MinZoom": 5,
    "MaxZoom": 15
}
```

---

### VideoConnector

**PluginName**: `"VideoConnector"` | **Type**: Accepting

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `URL` | string | `"https://example.com/"` | RTSP or MJPEG stream URL |
| `PixelThreshold` | int | `0` | Greyscale difference threshold for change detection (0-255) |
| `PercentThreshold` | double | `0.0` | Percentage of changed pixels to consider frame significant |
| `TimeoutMinutes` | double | `1` | Connection timeout in minutes |
| `IngestWidth` | int | `0` | Downscale frame width (`0` = original resolution) |
| `HWAccelType` | string | `""` | GPU acceleration: `"opencl"`, `"cuda"` |
| `IngestAsMediaArchive` | bool? | `null` | Store as media archive segments |
| `MediaArchiveSegmentDuration` | int? | `null` | Segment duration in seconds (default 10 when archiving) |
| `Encoder` | string | `"libopenh264"` | Video encoder for archive segments |

**Message context** (scope: `"video"`):

For frame mode: `frame`, `frameNumber`, `frameId`.
For segment mode: `file`, `segmentDuration`, `segment`, `streamStartTime`.

**Example:**
```json
{
    "URL": "rtsp://camera.internal:554/stream1",
    "PixelThreshold": 30,
    "PercentThreshold": 5.0,
    "IngestWidth": 640,
    "HWAccelType": "cuda",
    "TimeoutMinutes": 0
}
```

---

## Accepting Mode (Pushed Records)

Switches polling/LongRunning connectors to passive mode, awaiting data from upstream on-ramps or `datastream/acceptstream` API.

**Important: `EndPoint` is still required.** Validation runs *before* checking `RunInAcceptingMode`. Provide a placeholder value even if the connector won't poll.

Config mapping via `PushedRecordHelper.TranslateRecord<T>()`: clones config (thread safety) → applies `PushedRecordIsConfig` (direct name mapping) or `PushedDataMapping` (explicit rules) → returns modified clone.

### Config Properties

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `RunInAcceptingMode` | bool | `false` | Switch from active polling to passive waiting |
| `PushedRecordIsConfig` | bool | `false` | Map pushed record fields directly to config properties by name |
| `PushedDataMapping` | MLPushedRecordMapping[] | `null` | Explicit source→destination mappings |

Only one of `PushedRecordIsConfig` or `PushedDataMapping` should be set.

### PushedDataMapping Structure

```json
{
    "PushedDataMapping": [
        {
            "Source": { "Type": "Record", "FieldName": "file_filter" },
            "Destination": { "Type": "Config", "ConfigProperty": "Filter" }
        },
        {
            "Source": { "Type": "Context", "ContextScope": "upstream", "ContextName": "target_path" },
            "Destination": { "Type": "Config", "ConfigProperty": "LocationToWatch" }
        }
    ]
}
```

**Source types** (`SourceType` enum): `Record` (field from pushed record), `Context` (value from invoking on-ramp's message context).
**Destination types** (`DestinationType` enum): `Config` (set a connector config property), `Context` (set a message context property).

### Supported Connectors

| Connector | Via |
|-----------|----|
| `FileSystemConnector` | Config directly implements `IMLAcceptsPushedRecordsConfig` |
| All `BasePollingConnectorConfig` descendants | Inherits from `BasePollingConnectorConfig` which implements `IMLAcceptsPushedRecordsConfig` |
| Messaging connectors (Kafka, NATS, etc.) | N/A — already accepting by nature |

---

## Gotchas, Validation & Behavioral Nuances

### Scheduling

| Gotcha | Detail |
|--------|--------|
| **`RunOnStartup` scope is limited** | Only checked by `AbstractPollableConnector` descendants (S3, Azure, GCS, SFTP) and only with `CronExpression`. `BasePollingConnector` descendants (HttpPolling, ArcGIS, WFS, RelationalDB, Elasticsearch) always run first poll immediately. |
| **2500ms minimum poll interval** | Even with `PollingFrequencyMS: 0`, minimum is 2.5s. S3/Azure/GCS/SQS enforce this independently. Delay is additive: `max(2500ms - elapsed, 0) + configuredInterval`. |
| **Invalid `CronExpression` silently becomes one-time** | Invalid cron clears `PollingFrequencyMS` to `-1` and sets schedule to null → `IsOneTime = true`. Runs once, stops, no error. |
| **`PollingFrequencyMS` and `CronExpression` mutually exclusive** | Last one set wins. Setting one clears the other. |

### Validation

| Gotcha | Detail |
|--------|--------|
| **Validation runs at save time AND startup** | Invalid configs fail to save with `ArgumentException`. |
| **`EndPoint` required even in accepting mode** | Validation runs before `RunInAcceptingMode` check. Provide a placeholder. |
| **On-ramp save validation** | `Name`, `ConnectorAppName`, `ConnectorPluginName`, `ConnectorOptions` must be non-empty, JSON valid, and either `WellKnownPipelineId` or `PipelineDefinition` must be provided. |
| **`effectiveUser` must exist** | Throws `DataStreamException` if user email not found. |
| **NATS: `CredentialsPath` file must exist** | Throws `FileNotFoundException`. Directory auto-created, but file must be present. |
| **NATS: JWT + NKey BOTH required** | Setting only one silently falls through to `CredentialsPath` auth. |
| **NATSJetStream: Invalid `DeliverPolicy` silently defaults to `All`** | Misspelled values replay ALL messages. Case-insensitive. |
| **NATSJetStream: `OptStartSeq`/`OptStartTime` required for their policies** | Missing required param throws `ArgumentException`. |
| **Pulsar: `SSLCACert` required with TLS** | Required when `UseSecureConnection` is true or when using mutual TLS (`SSLClientCert` + `SSLClientKey`). |
| **Pulsar: Minimal config validation** | Only checks `_config == null`. Empty fields fail at Pulsar client level. |
| **SQS: Uses `QueueEndpoint`, not inherited `EndPoint`** | `QueueEndpoint` required; `EndPoint` is ignored. |
| **Elasticsearch: Validates at config-set time** | Unlike most connectors, fails before connector starts. |

### Runtime Behavior

**Destructive operations:**
- **FileSystemConnector DELETES files** after successful processing
- **SQS deletes messages** after successful processing

**No reconnection:**
- **MQTT** — connects once; silent failure on disconnect
- **ActiveMQ** — no reconnection; only supports text messages (`ITextMessage` cast); failed durable subscription silently falls back to non-durable

**Reconnection with backoff:**
- **Kafka/Pulsar** — 5-second delay then retry, indefinitely
- **HttpPolling** — single retry with 5s delay; if retry fails, throws (or returns null if `IgnoreErrors: true`)
- **WebSocket** — no backoff when `IgnoreErrors: true` (immediate retry); connection duration expiry = permanent exit (no reconnect)

**Message handling:**
- **Kafka/Pulsar `MultipleEndpoints`** creates parallel independent consumers, not one consumer with multiple brokers
- **Pulsar `SubscriptionType`** hardcoded to `Exclusive` (one consumer per subscription)
- **Pulsar acknowledges messages even on processing failure** (fire-and-forget)
- **NATSJetStream** at-least-once: unacknowledged on exception → redelivery. Existing durable consumers are **updated** (not failed) if settings change.
- **Kafka `SaslMechanism`** normalized: trimmed, uppercased, underscores→hyphens. Invalid values throw.
- **Kafka `IdPropertyScope` + `IdPropertyName`** both required; setting only one has no effect
- **Kafka `ManualCommitMaxMessages`** min 1, `ManualCommitConsumeMaxMilliseconds` min 50 (silently clamped)
- **Kafka `ManualConsumerSettings`** overlays ALL consumer config including `GroupId` and security

**Other:**
- **HttpPolling duplicate URL skipping** — GET tracking skips poll if built URL matches previous poll's URL
- **WebSocket `ConnectionSpan`** takes precedence over `ConnectionDurationMS`
- **`FaultedRetryAttempts: 3`** = 4 total executions (1 initial + 3 retries). Retry delay has 0-1000ms random jitter.
- **Accepting mode race condition** — concurrent pushed records can overwrite shared `_config` field

### Connector-Specific Nuances

| Connector | Nuance |
|-----------|--------|
| **AttachedFilesystem** | `Recursive` config property is **never read** — always recurses. Use `STOP_RECURSION` context property to halt. Reconciliation **deletes rows** when source files removed. |
| **TiledImagery** | Resumes via `LAST_TILE_XYZ` metadata. Per-tile errors non-fatal. One-shot: processes all tiles then exits. |
| **SFTP** | Uses both `PasswordAuthenticationMethod` and `KeyboardInteractiveAuthenticationMethod`. `Port` string→int; invalid = default SSH port. NOT recursive. Context substitution (`scope:propertyName`) breaks if value contains a colon. |
| **WFS** | Auto-fetches GetCapabilities for version/paging. WFS 1.1.0 disables paging. Version `"1.1*"` → V1_1_0, else V2_0_0. `FilterXml` is actually CQL, not XML. `TrackingDateField` auto-generates CQL filter (may conflict with user filters). `Method` containing `"post"` → PostKvp. |
| **S3/Azure/GCS** | `StartAfter` `"script:"` prefix for dynamic evaluation. `CopyConfigToMessage` copies credentials as sensitive. Azure uses `Credentials["BlobContainerName"]` for container, not `EndPoint`. |
| **FileSystem** | Default `LocationToWatch` is Windows-specific (`"C:/temp/"`). `FileShare.Read` lock. Fire-and-forget parallel processing. |
| **GCS** | `KeyFile` required when `Anonymous: false`. Prefix auto-appends `/`. `Bucket`/`KeyFile` ALWAYS in context (not only with `CopyConfigToMessage`). |
| **Elasticsearch** | 30s derate on timestamp queries for indexing delay. Scroll pagination hardcoded at 10000/page. `Authorization` is full header value (e.g., `"Basic base64..."`). Transient failures retried, not faulted. |
| **Video** | Requires `ffmpeg` on PATH. `TimeoutMinutes: 0` cancels immediately. `IngestWidth` only downscales. Frame mode: `SKBitmap` object in context. Segment mode: `null` payload with file path. `MediaArchiveSegmentDuration <= 0` defaults to 10. |

---

## Connector Quick-Reference Table

| PluginName (exact) | Category | Config Base | Key Properties |
|--------------------|----------|-------------|----------------|
| `KafkaConnector` | Accepting | standalone | Topic, Endpoint, GroupId, EnableAutoCommit, UseSSL, SaslMechanism |
| `NATSConnector` | Accepting | NatsConfigBase | Endpoint, Subjects, QueueGroupName, CredentialsPath |
| `NATSJetStreamConnector` | Accepting | NatsConfigBase | Endpoint, Stream, DurableConsumerName, DeliverPolicy, FilterSubjects |
| `MQTTConnector` | Accepting | standalone | Endpoint, Topics |
| `PulsarConnector` | Accepting | standalone | Endpoint, Topic, Subscription, Token, UseSecureConnection |
| `ActiveMQConnector` | Accepting | standalone | Endpoint, QueueOrTopic, UserName, Password |
| `SQSConnector` | Polling/LR | BasePollingConnectorConfig | QueueEndpoint, AccessKey, SecretKey, Region |
| `WebSocketMessageConnector` | Accepting | standalone | EndPoint, SubscriptionMessage, RecvTimeoutSec |
| `PushedMessageConnector` | Accepting | standalone | PromotableProperties |
| `HttpPollingConnector` | Polling/LR | BasePollingConnectorConfig | EndPoint, UsePost, PostPayload, AuthenticationType, Cursor* |
| `S3Connector` | Polling/LR | AbstractPollingConnectorConfig | Bucket, AccessKey, SecretKey, Region, ServiceUrl |
| `AzureStorageConnector` | Polling/LR | AbstractPollingConnectorConfig | Credentials |
| `GoogleCloudStorageConnector` | Polling/LR | AbstractPollingConnectorConfig | Bucket, KeyFile, Anonymous |
| `FileSystemConnector` | LongRunning | standalone (IMLAcceptsPushedRecordsConfig) | LocationToWatch, Filter, Recursive |
| `SFTPConnector` | Polling/LR | BasePollingConnectorConfig | Host, Port, Username, Password, IncludeRegexes |
| `RelationalDatabaseConnector` | Polling | BasePollingConnectorConfig | Provider, ConnectionString, Query/Queries, TrackingColumnName |
| `ElasticsearchConnector` | Polling/LR | BasePollingConnectorConfig | EndpointUri, Authorization, UseTimeStampField |
| `ArcGIS Rest Connector` | Polling/LR | BasePollingConnectorConfig | EndPoint, MultipleEndpoints, ParallelFactor |
| `WfsConnector` | Polling/LR | OgcConnectorConfig→BasePollingConnectorConfig | EndPoint, Features, Version, SrsName |
| `AttachedFilesystemConnector` | LongRunning | standalone | RootPaths, ArchiveMode, OutputMode |
| `Tiled Imagery Connector` | LongRunning | standalone | EndPoint, WMTSLayerTitle, MinZoom, MaxZoom |
| `VideoConnector` | Accepting | standalone | URL, PixelThreshold, PercentThreshold, HWAccelType |

---

## Monitoring, Logging & Debugging

### Where to Monitor On-Ramps in the Browser

The primary monitoring interface is in the MapLarge Admin UI. Navigate via the **gear icon** (left sidebar) → **Data Streams**. This opens the Data Streams admin page (`/dashboard/repo/v5/Admin/DataStream`) with four tabs: **On Ramps** (default), **Off Ramps**, **Pipelines**, **Well-known Resources**.

**On-Ramps List Grid** shows all configured on-ramps with columns:
- Name, Requested Status, **Actual Status** (with color indicator), Connector (App/Plugin), Effective User, Cluster Role, Server count

**Status indicators:** Green = Running, Orange + warning icon = Running with warnings, Red = Faulted, Gray = Stopped

**Actions available:** Start/Stop toggle, Delete, Export (downloads .json), Import (.json upload), Reset Tracking (for incremental connectors), Search by name.

### Drilling Into a Specific On-Ramp

Click the **Actual Status** indicator on any ramp to open a detail dialog with three tabs:

**1. Server Statistics Tab** (auto-refreshes every 15 seconds)
Shows per-server stats: ServerName, ActualStatus, QueueDepth, MessagesProcessed, MessagesFailed, RecordsProcessed, RecordsSkipped, RecordsFailed, AvgLatencyMS, LastProcessedTimestamp, ErrorMessage.

**2. Test On Ramp Tab**
Text area to send a test message payload to the connector for validation.

**3. Detailed Logging Tab** (auto-refreshes every 30 seconds)
Server node selector dropdown. Shows message-level logs with timestamps. Click a message row to expand and see **step-level detail** (which parser ran, which transform, any exceptions, record counts, context variables). Has an "Exceptions Only" toggle to filter.

### On-Ramp Logging Options

These are on-ramp-level settings configured in the UI form (not in connector or pipeline JSON):

| Setting | Default | Purpose |
|---------|---------|---------|
| `verboseLogging` | `false` | Logs detailed step execution info (step name, type, plugin, start/end times, exceptions, record counts, context variables) to in-memory log queue. Viewable in the Detailed Logging tab. |
| `tableLogging` | `false` | Persists step execution details to the `_system/datastream_log` table. **Warning: negatively affects performance.** Use for debugging, not production. Table auto-caps at 100,000 rows. |

**Without `verboseLogging`**: The Server Statistics tab still works (counters are always tracked), but the Detailed Logging tab will have minimal data.

**With `tableLogging`**: Step details are written to `_system/datastream_log` with columns: `Timestamp`, `RampName`, `RampId`, `Message`, `JsonDataString` (full JSON of step diagnostics). You can query this table directly via the SQL query interface for historical analysis.

### Querying Ramp Status via SQL (TVFs)

You can also query ramp status directly using SQL Table-Valued Functions in the MapLarge query interface. This is useful for building dashboards or automated monitoring.

**Cluster-wide ramp overview:**
```sql
SELECT * FROM ml_rampserverstats(ramptype='on', asof='{{now}}')
```
Returns: `UniqueID`, `Name`, `ServerName`, `ActualStatus`, `ErrorMessage`, `QueueDepth`, `MessagesProcessed`, `RecordsProcessed`, `RecordsSkipped`, `RecordsFailed`, `MessagesFailed`, `AvgLatencyMS`, `LastProcessedTimestamp`, `LastStateChangeTime`, `HasWarnings`

Optional parameters: `local='true'` (local server only), `nondeleted='true'` (exclude deleted ramps). Use `ramptype='off'` for off-ramps.

**Message-level logs for a specific ramp:**
```sql
SELECT * FROM ml_ramplog(id='<ramp-unique-id>', ramptype='on', asof='{{now}}')
```
Returns: `MessageId`, `MessageStart`, `MessageEnd`, `UniqueID`, `ServerName`, `NumStepsWithException`, `RecordsProcessed`

**Step-level detail within messages:**
```sql
SELECT * FROM ml_rampsteplog(id='<ramp-unique-id>', ramptype='on', asof='{{now}}')
```
Returns: `UniqueID`, `StepName`, `Count`, `Start`, `End`, `Exceptions`, `MessageContext`, `MessageId`, `MessageStart`, `MessageEnd`, `ServerName`, `NumStepsWithException`

Optional: add `messageid='<message-id>'` to filter to a single message.

### Debugging Workflow

1. **Check status**: Go to Admin (gear icon) → Data Streams → On Ramps. Look for red (Faulted) or orange (warnings) indicators.
2. **Read the error**: Click the status indicator → Server Statistics tab → read `ErrorMessage` column.
3. **Enable verbose logging**: Edit the on-ramp → set `verboseLogging = true` → save and restart.
4. **Review step details**: Click status indicator → Detailed Logging tab → expand a message to see which step failed, the exception, and context variables at that point.
5. **For historical analysis**: Enable `tableLogging`, reproduce the issue, then query `_system/datastream_log` in the SQL interface.
6. **For dashboards**: Use the `ml_rampserverstats()` TVF to build a monitoring view across all ramps.
