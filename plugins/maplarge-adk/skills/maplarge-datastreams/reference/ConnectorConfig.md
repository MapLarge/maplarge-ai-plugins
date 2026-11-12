# MapLarge DataStream Connector Configuration Guide

> **Scope**: Reference for the **Connector Options** JSON that goes into the **Connector tab** of the MapLarge on-ramp create/edit dialog. This document covers connector types, per-connector options, scheduling, credentials, and examples.
> **Last updated**: 2026-09-11

---

## IMPORTANT: Two Separate Configs - Do NOT Combine

An on-ramp has **two independent JSON configurations** edited in **two separate UI tabs**. The user never combines them - each tab has its own "Show JSON" button and its own JSON editor. Internally the server pairs them, but the user (and you) always work with them separately.

| UI Tab | What you generate | Documented in |
| -------- | ------------------ | --------------- |
| **Connector tab** (this doc) | Flat JSON object with connector-specific properties | This file |
| **Pipeline tab** | JSON object with `NumberOfWorkers` + `Steps` array | `PipelineConfig.md` |

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
- [Encrypted Configuration Fields](#encrypted-configuration-fields)
- [Connector Quick-Reference Table](#connector-quick-reference-table)
- [Monitoring, Logging & Debugging](#monitoring-logging--debugging) - ramp TVFs, ProcessDirect verbs, pipeline sandbox, server logs, reset tracking

---

## Overview

An **on-ramp** pairs a **connector** (data source + schedule; this doc) with a **pipeline** (parse/transform/commit; see `PipelineConfig.md`). Connectors are plugins loaded by name at runtime, each with a `Config` class deserialized from the connector options JSON.

---

## On-Ramp Context

The UI manages on-ramp-level fields (name, connector plugin selection, effective user, retry settings, etc.) through its own form controls - you do not generate these. The only JSON you produce is the connector options that go into the Connector tab.

Other on-ramp-level fields of note: `verboseLogging` (bool, enables detailed pipeline logging), `requiredClusterRole` (string, restricts which cluster nodes run this on-ramp), `wellKnownPipelineId` (string, references a saved pipeline instead of an inline pipeline definition - takes precedence if both are provided), `faultedRetryAttempts`/`faultedRetryIndefinitely`/`faultedRetryDelay`/`faultedRetryExponentialBackoff` (retry behavior when connector faults).

---

## Config Deserialization

Property names in connector JSON are **case-insensitive**.

---

## Connector Type Categories

| `ImportConnectorType` | Behavior | Connectors |
| ---------------------- | ---------- | ------------ |
| `Accepting` | Stays alive indefinitely, listening for pushed messages | Kafka, NATS, NATSJetStream, MQTT, Pulsar, ActiveMQ, WebSocket, PushedMessage, Video |
| `Polling` | Wakes on schedule, fetches data, sleeps | Http, RelationalDB, WFS, ArcGIS, SQS (when recurring) |
| `LongRunning` | Scans once through a dataset, optionally repeats | S3, Azure, GCS, SFTP, FileSystem, AttachedFilesystem, TiledImagery, SQS (when one-time) |

Many connectors dynamically choose between `Polling` and `LongRunning` based on `IsOneTime` (true when neither `PollingFrequencyMS` nor `CronExpression` is set).

---

## Scheduling (BasePollingConnectorConfig)

Shared by all connectors extending `BasePollingConnectorConfig`:

| Property | Type | Default | Purpose |
| ---------- | ------ | --------- | --------- |
| `EndPoint` | string | `null` | Server URI / location - meaning varies per connector |
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
| ---------- | ------ | --------- | --------- |
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
| `PathTemplate` | string | `null` | Pattern like `{year}/{month}/{filename}.csv` - auto-generates regex |
| `PathTemplateRegexPattern` | string | `null` | Custom regex (overrides `PathTemplate` auto-generation) |
| `MetaDataMessageProperty` | string | `null` | `Scope:Name` format for storing extracted path metadata |
| `FilterByLatestFileTimestamp` | bool | `true` | Track latest processed file timestamp for incremental imports |
| `OrderImportBy` | List\<string\> | `[]` | Sort order for files before processing |
| `ProcessLogFilter` | ProcessLogConfig | `null` | Duplicate detection via process log table |

**Property interactions:**

- `PathTemplate` and `PathTemplateRegexPattern` are mutually exclusive. Setting `PathTemplate` auto-generates the regex and clears `PathTemplate` back to empty - the regex is authoritative.
- `StartAfter` supports `"script:"` prefix for dynamic evaluation with `latestFileTimestamp` and `latestProcessLogTimestamp` variables.
- `StopAfter` is prefix-based: collects objects until the key no longer starts with `StopAfter` after a match.
- `CopyConfigToMessage` copies credentials to context with `isSensitive: true`. What gets copied varies by connector.
- `MaxThreads` max varies by connector (S3=50, Azure/GCS/SFTP=25) - throws if exceeded.

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
| ---------- | ------ | --------- | --------- |
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
| ---------- | ------ | --------- | --------- |
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
| ---------- | ---------------- | ---------- |
| `false` | `null` | Plaintext |
| `true` | `null` | SSL |
| `false` | set | SASL_PLAINTEXT |
| `true` | set | SASL_SSL |

**Message context** (scopes: `"kafka"` and `"streaming-scope"` - all properties are set on both):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
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
| ---------- | ------ | --------- | --------- |
| `Subjects` | string[] | `["example subject"]` | Subjects to subscribe to (supports NATS wildcards: `>`, `*`) |
| `QueueGroupName` | string | `""` | Queue group for load balancing |

**Auth priority:** 1. Inline JWT/NKey (both required, whitespace stripped) → 2. `CredentialsPath` `.creds` file. File changes trigger auto-reconnection (throttled to 1s).

**Message context** (scope: `"nats"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
| `Stream` | string | `"stream name"` | JetStream stream name |
| `DurableConsumerName` | string | `""` | Durable consumer name (survives restarts) |
| `DeliverPolicy` | string | `"All"` | Starting position (see table below) |
| `OptStartSeq` | ulong? | `null` | Starting sequence (required for `ByStartSequence`) |
| `OptStartTime` | DateTime? | `null` | Starting timestamp (required for `ByStartTime`) |
| `FilterSubjects` | string[] | `[]` | Subject filters within the stream |

**Deliver policies:**

| Policy | Behavior |
| -------- | ---------- |
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
| ---------- | ------ | --------- | --------- |
| `Topics` | string[] | `["example topic"]` | MQTT topics to subscribe to (supports `+` and `#` wildcards) |
| `Endpoint` | string | `"localhost"` | MQTT broker hostname (passed to `WithTcpServer`) |

**No authentication options** are exposed in the Config class.

**Message context** (scope: `"mqtt"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
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
| `UseSSL` | bool | *(deprecated)* | Alias for `UseSecureConnection` - maps to same property |
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
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
| `Endpoint` | string | `"http://server.com"` | Broker URI (e.g., `"activemq:tcp://localhost:61616"`) |
| `QueueOrTopic` | string | `""` | Destination - prefix with `topic:` for topics (e.g., `"queue:sensor-data"`) |
| `UserName` | string | `""` | Authentication username |
| `Password` | string | `""` | Authentication password |
| `ClientId` | string | `""` | Client identifier (required for durable topic subscriptions) |
| `AcknowledgementMode` | AcknowledgementMode | `ClientAcknowledge` | `AutoAcknowledge`, `ClientAcknowledge`, `DupsOkAcknowledge`, `IndividualAcknowledge` |

**Message context** (scope: `"amq"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
| `QueueEndpoint` | string | `"https://sqs.us-east-1.amazonaws.com/"` | SQS queue URL |
| `AccessKey` | string | `null` | AWS access key |
| `SecretKey` | string | `null` | AWS secret key |
| `Region` | string | `"us-east-1"` | AWS region |
| `MaxMessagesWhenReceiving` | int | `1` | Batch size per receive call (1-10) |
| `WaitTimeSeconds` | int | `0` | Long polling wait time (0-20 seconds) |

Plus all `BasePollingConnectorConfig` properties (`PollingFrequencyMS`, `CronExpression`, `RunOnStartup`, `RunInAcceptingMode`, etc.).

**Message context** (scope: `"SQSConnector"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
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
| ---------- | ------ | --------- | --------- |
| `PromotableProperties` | PromotableProperty[] | `[{}]` | Maps HTTP query parameters to message context properties |

**PromotableProperty fields:**

| Field | Type | Default | Purpose |
| ------- | ------ | --------- | --------- |
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
| ---------- | ------ | --------- | --------- |
| `EndPoint` | string | `null` | Target URL (inherited from `BasePollingConnectorConfig`) |
| `MultipleEndpoints` | string[] | `null` | Query multiple URLs |
| `UsePost` | bool | `false` | Use HTTP POST instead of GET |
| `PostPayload` | string | `null` | POST body (JSON string) - supports `{{TRACKING_FIELD}}`, `{{TRACKING_VALUE}}`, `{{CURSOR_VALUE}}`, `{{OFFSET_VALUE}}`, `{{PAGE_SIZE}}` placeholders |
| `MediaType` | string | `"application/json"` | Content type for POST (`"application/json"`, `"application/xml"`, `"text/plain"`, `"application/x-www-form-urlencoded"`) |
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
| `CursorParameterName` | string | `null` | Turns on cursor pagination (GET and POST). GET: query parameter name for the cursor. POST: any non-empty value; the cursor goes into `{{CURSOR_VALUE}}` |
| `CursorContextScope` | string | `"__cursor"` | Context scope where cursor value is stored |
| `CursorContextKey` | string | `"__value"` | Context key where cursor value is stored |
| `PaginationDelayMs` | int | `0` | Delay between paginated requests |
| `CustomRequestHeaders` | Dictionary\<string, string\> | `[]` | Custom HTTP request headers added to every request |
| **Offset Pagination** | | | |
| `OffsetParameterName` | string | `null` | Query parameter name for offset-based pagination (e.g., `"offset"` or `"startRecord"`). **Takes precedence over cursor pagination** - when set, all `Cursor*` settings are ignored |
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
| ------------- | ------------- |
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

##### System 2: Tracking Placeholders (automatic "since last run" - requires DoNotTrack: false)

The connector saves each run's end date and uses it as the next run's start date - built-in "since last run" with no gaps.

**GET tracking placeholders** (in URL, substituted by `BuildUrl()`):

| Placeholder | Resolves To |
| ------------- | ------------- |
| `{year1}` | Start date year (previous run's end date, or `StartDate` config, or Jan 1 of current year) |
| `{month1}` | Start date month |
| `{day1}` | Start date day |
| `{year2}` | End date year (always `DateTime.Today` - midnight of current day) |
| `{month2}` | End date month |
| `{day2}` | End date day |

**IMPORTANT: GET tracking is day-granularity only.** `date2` is hardcoded to `DateTime.Today` (midnight). No hour/minute/second placeholders exist. The connector skips the request if the built URL matches the previous poll's URL (same day = same URL = skip). **Suited for daily or less frequent polling only.**

**For sub-day polling, use instead:**

1. **Relative date tokens** (`{now}`, `{now-1h}`) with `DoNotTrack: true` - rolling window with full timestamp precision. No tracking state. Gaps possible if polls are missed.
2. **POST tracking with `{{TRACKING_VALUE}}`** - tracked value can be any format (e.g., ISO timestamps). `FieldTrackingTransform` extracts new value from response. True "since last run" at any granularity with no gaps.

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
| ------------- | ------------- |
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

Pages through every page of one poll (tracking, by contrast, spans polls). The connector picks a mode in `ExecutePollForEndpointAsync`: **`OffsetParameterName` set → offset mode; else `CursorParameterName` set → cursor mode; else a single request.** So cursor mode requires `CursorParameterName` for **both GET and POST**, and any `OffsetParameterName` silently disables it.

**Loop** (`ExecuteCursorPaginatedPollAsync`):

1. First request has no cursor (GET: no parameter; POST: `{{CURSOR_VALUE}}` → `""`).
2. A fresh message context is created per page; the connector `await`s the full pipeline for that page (parse through commit).
3. It reads `ctx[CursorContextScope, CursorContextKey]?.ToString()` (defaults `__cursor` / `__value`).
4. Null, empty, or equal to the previous cursor → stop. Otherwise GET sets `CursorParameterName=<cursor>` in the query string (via `HttpUtility.ParseQueryString`, so the value is URL-encoded and an existing parameter of the same name is replaced); POST substitutes `{{CURSOR_VALUE}}`. Then waits `PaginationDelayMs` and loops.

The cursor is any string - opaque tokens like `eyJwIjoyfQ.abc-_DEF` or `...ghi+/JKL=` work (verified live 2026-10-01). It lives in a local variable only: **not persisted between polls**, so every poll starts again at page 1 (dedupe with `PrimaryKeyColumns`).

**Who writes the cursor:** the parser's `PropertiesToPromote` (`Path` → `Scope`/`Name` matching the connector's `CursorContextScope`/`CursorContextKey`). The parser must receive the connector's own context, which means a parser that is the first step, or one reached through stream transforms that pass the context through unchanged. **`JSONDisassemblerStreamTransform` promotes into a cloned context** (`RootWrapper` calls `context.Clone()`), and `MultipleJsonStreamSplitTransform`, `GeoFileInfoStreamTransform`, and the Parquet DB transforms also hand downstream steps a `Clone()`. A cursor promoted by such a step, or by a parser after it, never reaches the connector, and pagination stops after page 1 (verified live 2026-10-01).

An exception anywhere in the pipeline for a page ends pagination for that poll (caught and logged at Error), and tracking is not updated. A non-success HTTP status also stops the loop.

**Symptom → cause:** the cursor parameter is sent as numbers that grow by the page's record count (`1, 3, 5, 7...`) when `OffsetParameterName` is set, even if it is named like a cursor (e.g. `"OffsetParameterName": "pageToken"`). Offset mode ran and fell back to the parser's record count; the cursor settings were never read. Fix: remove `OffsetParameterName`/`OffsetStartValue`/`PageSize`/`RecordCount*`, and set `CursorParameterName`.

**Example - GET with an opaque page token** (response `{"items":[...], "nextPageToken":"..."}`, next request needs `?pageToken=...`):

Connector tab:

```json
{
    "EndPoint": "https://api.example.com/items?pageSize=100",
    "CursorParameterName": "pageToken",
    "DoNotTrack": true,
    "PollingFrequencyMS": 300000
}
```

Parser step options (Pipeline tab):

```json
"Options": {
    "RecordRootPath": "$.items[*]",
    "PropertiesToPromote": [
        { "Path": "$.nextPageToken", "Scope": "__cursor", "Name": "__value" }
    ]
}
```

#### Offset-Based Pagination (within a single run)

Pages through results using a numeric offset. Set `OffsetParameterName` (e.g., `"offset"`) and `PageSize` (> 0, enforced by validation). The connector appends the offset as a query parameter (**GET**) or substitutes `{{OFFSET_VALUE}}` and `{{PAGE_SIZE}}` in `PostPayload` (**POST**). The first request uses `OffsetStartValue` (default **1**).

After each page the connector computes `recordsReturned` and the next start, in this order:

1. `recordsReturned` = `ctx[RecordCountContextScope, RecordCountContextKey]` if it parses as an int, else 0.
2. `nextStart = currentStart + recordsReturned`; a non-zero int at `ctx[RecordCountContextScope, NextRecordContextKey]` overrides it.
3. **Fallback:** if `recordsReturned == 0` and `nextStart == currentStart`, use the parser's own record count (`ctx["Message", "RecordCount"]`, set by `ParserPipelineStepContext`) for both.
4. Stop when `recordsReturned < PageSize` (or 0).

Because of the fallback, offset pagination runs even when nothing is promoted. That is what makes the "numeric cursor" symptom above happen. Promotion has the same constraint as for cursors: the promoting parser must be on the connector's context. A disassembler-promoted count is invisible, and so is the fallback count from a parser after a cloning stream transform, so pagination stops after page 1 (verified live 2026-10-01).

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

**`DoNotTrack: false` (default)** - enables tracking/bookmarking:

- **GET:** Saves `EndDate`; next run starts from previous end date. Requires `{year1}` etc. in URL.
- **POST:** Saves `PostTrackingValue`; next run substitutes into `{{TRACKING_VALUE}}`. Requires `FieldTrackingTransform`.
- **Validation:** When `false` + `UsePost: false` + no `CursorParameterName` + no `OffsetParameterName`, URL must contain `{` (date placeholder), else throws `"Set DoNotTrack to true, or add parameters to the EndPoint."`
- **Pagination trap:** the validation above is skipped when cursor or offset pagination is configured, but the GET "same URL as last poll → skip" check still runs. A paginated GET connector with `DoNotTrack: false` and an unchanging URL is accepted, runs its first poll, then **skips every later poll** with no error (verified live 2026-10-01: same config with `DoNotTrack: true` re-polled every interval). Use `DoNotTrack: true` unless the URL contains `{year1}`-style or relative-date placeholders that change between polls.

**`DoNotTrack: true`** - disables tracking:

- No tracking data read or saved between runs
- Relative date tokens (`{now}`, `{now-1h}`) still work (separate system)
- Date placeholders in URL still work - `DoNotTrack` only disables the bookmarking system, not date substitution
- Use when: API returns full/current dataset, using rolling relative dates, or deduplication handled downstream

**Other connectors:** `DoNotTrack` on WfsConnector skips OGC tracking filter; on AttachedFilesystemConnector skips file timestamp tracking. For S3/Azure/GCS, the equivalent is `FilterByLatestFileTimestamp`.

#### Validation Rules

- At least one endpoint required (`EndPoint` or `MultipleEndpoints`); basic auth requires both `Username` and `Password`
- `UsePost` requires `PostPayload` (and vice versa); `MediaType` must be `"application/json"`, `"application/xml"`, `"text/plain"`, or `"application/x-www-form-urlencoded"`
- `OffsetParameterName` requires `PageSize > 0`

**Example - GET polling with date substitution:**

```json
{
    "EndPoint": "https://api.example.com/data?since={now-1h}",
    "DateSubstitutionFormat": "yyyy-MM-ddTHH:mm:ssZ",
    "PollingFrequencyMS": 300000
}
```

**Example - POST with cursor pagination:**

```json
{
    "EndPoint": "https://api.example.com/query",
    "UsePost": true,
    "PostPayload": "{\"cursor\": \"{{CURSOR_VALUE}}\", \"limit\": 100}",
    "MediaType": "application/json",
    "CursorParameterName": "cursor",
    "CursorContextScope": "streaming_msg",
    "CursorContextKey": "next_cursor",
    "PaginationDelayMs": 200,
    "PollingFrequencyMS": 600000
}
```

`CursorParameterName` is required even for POST: it is what turns on cursor mode (its value is not sent anywhere for POST). Without it the connector makes one request per poll. The parser must promote the response's cursor with `"Scope": "streaming_msg", "Name": "next_cursor"` to match.

---

### S3Connector

**PluginName**: `"S3Connector"` | **Type**: LongRunning or Polling | **Base**: `AbstractPollableConnector`

Config extends `AbstractPollingConnectorConfig`. Max threads: **50**.

| Property | Type | Default | Purpose |
| ---------- | ------ | --------- | --------- |
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
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
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
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
| `Bucket` | string | `null` | GCS bucket name |
| `KeyFile` | string | `null` | Path to service account JSON key file |
| `Anonymous` | bool | `false` | Unauthenticated access (public buckets) |

Plus all `AbstractPollingConnectorConfig` and `BasePollingConnectorConfig` properties.

**Message context** (scope: `"GoogleCloudStorageConnector"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
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
| ----- | ------- |
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

Config extends `BasePollingConnectorConfig` (NOT `AbstractPollingConnectorConfig` - it has its own file-oriented properties). Max threads: **25**.

| Property | Type | Default | Purpose |
| ---------- | ------ | --------- | --------- |
| `Host` | string | `null` | SFTP server hostname |
| `Port` | string | `null` | SFTP port (string, parsed internally) |
| `Username` | string | `null` | SSH username (supports `"scope:propertyName"` for context substitution) |
| `Password` | string | `null` | SSH password (supports `"scope:propertyName"` for context substitution) |
| `RemoteDirectoryPath` | string | `null` | Remote directory to scan |
| `IncludeRegexes` | string[] | `[]` | Regex patterns - only process matching files |
| `ExcludeRegexes` | string[] | `[]` | Regex patterns - skip matching files |
| `CopyConfigToMessage` | bool | `false` | Copy Host, Port, RemoteDirectoryPath, Username, Password to context |
| `MaxThreads` | int | `1` | Max concurrent file processing |
| `MinimumFileAgeMS` | int | `1000` | Min file age before processing |
| `MinimumLastModified` | DateTimeOffset | `DateTimeOffset.MinValue` | Default last modified date |
| `FilterByLatestFileTimestamp` | bool | `true` | Skip files older than latest processed |

Plus `BasePollingConnectorConfig` scheduling properties.

**Context substitution:** `Username`/`Password` support `"scope:propertyName"` format - resolved from message context at runtime (useful in pushed-records mode).

**Message context** (scope: `"SFTPConnector"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
| `Provider` | string | `""` | ADO.NET provider (`"System.Data.SqlClient"`, `"Npgsql"`, etc.) |
| `ConnectionString` | string | `""` | Database connection string |
| `Query` | string | `""` | Single SQL query |
| `Queries` | Dictionary\<string, string\> | `null` | Named queries - keys become pipeline routing keys |
| `TrackingColumnName` | string | `""` | Column to track for incremental updates |
| `InitialTrackValue` | string | `"1970-01-01 00:00:00"` | Starting value for tracking |
| `TrackDateFormat` | string | `"yyyy-MM-dd HH:mm:ss"` | Date format for tracking value |
| `TrackMinumumAgeSeconds` | long | `0` | Min age in seconds (max 86400) |
| `MaxRecordsPerBatch` | int | `1000` | Records per batch (1–100000) |
| `PollingFrequencyMS` | int | `15000` | **Override** - default 15s instead of base -1 (range 1000–3600000) |
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
| ---------- | ------ | --------- | --------- |
| `EndpointUri` | string | `"http://server.com/"` | Elasticsearch search URL (e.g., `"https://es:9200/myindex/_search"`) |
| `Authorization` | string | `""` | Authorization header value (e.g., `"Basic base64..."` or `"Bearer token"`) |
| `UseTimeStampField` | string | `""` | Field for incremental polling (e.g., `"@timestamp"`) - auto-adds range query |
| `PreventEmptyResults` | bool | `false` | Reject empty result sets before processing |

Plus `BasePollingConnectorConfig` scheduling properties.

**Message context** (scope: `"ElasticsearchConnector"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
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

> **Do not use this connector on a layer containing polygons.** Against any service returning GML 3 -
> which is every WFS 1.1.0 and 2.0.0 service - polygon geometry is lost **silently**: the ramp reports
> success with 0 records failed, and on a polygons-only layer it substitutes each feature's bounding box
> for its real shape. Use the HTTP + GeoJSON or HTTP + CSV path instead; both are tested. This connector remains correct
> for point/line layers.

**PluginName**: `"WfsConnector"` | **Type**: Polling or LongRunning | **Base**: `BasePollingConnector`

Config is `WfsConnectorConfig` → `OgcConnectorConfig` → `BasePollingConnectorConfig`.

**OgcConnectorConfig properties:**

| Property | Type | Default | Purpose |
| ---------- | ------ | --------- | --------- |
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
| ---------- | ------ | --------- | --------- |
| `Features` | List\<string\> | `[]` | Feature type names to query |
| `Hits` | long | `-1` | Max records to retrieve (`-1` = all) |
| `PageSize` | int? | `0` | Features per request (`0` = use server default from GetCapabilities; set `> 0` to override). WFS 1.1.0 disables paging entirely regardless of this value. |
| `TrackingDateField` | string | `null` | Date field for incremental tracking |
| `FilterXml` | string | `null` | **Misnomer - this is CQL, not XML.** Emitted as `cql_filter=`, and only applied under three simultaneous conditions (see gotchas below) |
| `SrsName` | string | `"EPSG:4326"` | Coordinate reference system |
| `Parsing` | WfsGmlParserConfig | `new()` | Parser config overrides |

`WfsGmlParserConfig` has: `SimplifyColumnNames` (bool), `SwapAxisOrder` (bool), `OutputKey` (string).

**Message context** (scope: `"wfs"`):

| Key | Value |
| ----- | ------- |
| `version` | WFS version used |
| `featureId` | Feature type identifier |

**Example:**

```json
{
    "EndPoint": "https://geoserver.example.com/wfs",
    "Features": ["namespace:buildings"],
    "PageSize": 5000,
    "SrsName": "EPSG:4326",
    "TrackingDateField": "last_modified",
    "AuthenticationType": "Basic",
    "Username": "reader",
    "Password": "secret",
    "CronExpression": "0 3 * * *"
}
```

Note the deliberate absence of `Version` - see the first gotcha below.

**Finding the values for `Features`**

`Features` holds WFS *feature type* names, and they come from the service's own catalog - not from anything in MapLarge. Fetch it once in a browser or with curl:

```text
<EndPoint>?service=WFS&request=GetCapabilities
```

In the XML that comes back:

- The root element's `version` attribute is the real service version. Trust it over any version in a URL you were handed - the connector reads this same attribute to pick its request dialect.
- `FeatureTypeList/FeatureType/Name` is the catalog. Each `<Name>` - e.g. `<Name>ns:buildings</Name>` - is exactly the string that goes in `Features`, namespace prefix included. `<Title>` and `<Abstract>` are the human-readable labels you use to pick.

Before building an on-ramp, run `DescribeFeatureType` on the name you chose to see its columns and geometry type:

```text
<EndPoint>?service=WFS&version=<version>&request=DescribeFeatureType&typeName=<ns:name>
```

(`typeName` singular for 1.x, `typeNames` for 2.0.0.) In the returned XSD, the element whose `type` starts with `gml:` is the geometry. A specific type such as `gml:PointPropertyType` means one geometry kind; **`gml:GeometryPropertyType` means the layer may hold mixed geometry**, which changes how many tables you end up with - see *Geometry Column Naming* in `PipelineConfig.md`.

Note that a WMS layer name is usually the same string as the WFS `typeName`, but **not every WMS layer is republished over WFS** (imagery is routinely WMS-only). The WFS GetCapabilities is the authority.

#### WfsConnector gotchas

- **`EndPoint` must be the bare base URL** (`https://host/geoserver/wfs`, or GeoServer's unified `https://host/ows`) and nothing else. The connector does not use a URL you hand it - it *rebuilds* one from `EndPoint` plus its own config, appending `?SERVICE=WFS&REQUEST=GetFeature&...` via `host.EndsWith("?") ? "" : "?"` (`WFSRequestBuilder.cs:230`). Pasting a working GetFeature URL produces a request with two `?` and fails.
- **Leave `Version` unset.** The enum has only `UNSET`, `V1_1_0`, `V2_0_0` (`WFSVersion.cs`). `UpdateWFSVersion` (`WfsConnector.cs:326`) special-cases only a `"1.1"` prefix; **everything else falls through to 2.0.0**, so `"Version": "1.0.0"` silently emits `TYPENAMES`/`COUNT`/`STARTINDEX` at a server that cannot parse them. Auto-detection from GetCapabilities is correct - any `1.x` root `version` attribute maps to `V1_1_0` (`WfsConnector.cs:398`).
- **No `outputFormat` is ever sent.** You always get the server's default, which is GML - which is what `WfsGmlParser` expects. There is no way to request GeoJSON through this connector.
- **No bbox / spatial filter.** `WFSRequestBuilder.GetFeature` accepts only `cqlFilter`, `srsName`, `maxRecords`, `pageStart`, and `pageSize` (`:197`).
- **`FilterXml` needs three conditions at once** to be applied: `DoNotTrack: false`, a tracking start date (from `StartDate` or a prior watermark), **and** `TrackingDateField` empty (`WfsConnector.cs:224-233`). Miss any one and it is a silent no-op. It supports `{year1}`/`{month1}`/`{day1}`/`{year2}`/`{month2}`/`{day2}` substitution.
- **`TrackingDateField` overrides `FilterXml`.** It auto-generates the CQL `"<field> after <ISO8601>"` plus `sortBy=<field>+A`, and advances the watermark from the max value actually seen in the returned records (`EvaluateTracking`, `:177`). With `DoNotTrack: false` but neither `StartDate` nor a prior watermark, **no filter is applied at all** - a full pull every poll.
- **`IgnoreErrors` defaults to `true`.** An `ows:ExceptionReport` is logged and the poll cancels quietly *without* faulting the ramp, which reads downstream as "empty table, no error". Set it `false` during bring-up.
- **WFS 1.1.0 disables paging entirely**, regardless of `PageSize` (`WfsConnector.cs:260`). The whole result set arrives in one response and is held as a string and then a byte array before parsing (`:98-103`), so a large feature type is a memory risk. On 1.1.0, `Hits` maps to `maxFeatures=` and is the only throttle - and at the default `Hits: -1` no `maxFeatures` is emitted at all, so the server returns everything.
- **Paging on 2.0.0 is conditional** on the capabilities document advertising `ImplementsResultPaging=true`; `PageSize: 0` means "use the server's `CountDefault`" (fallback 100).
- **All feature types share one output key.** `Parsing.OutputKey` is a single string, so every entry in `Features[]` funnels to the same committer input key and merges into one table. Use one on-ramp per feature type if you want them separate.
- **No parser step in the pipeline.** `WfsConnector` implements `IMLRecordOrientedConnector`, so the engine injects a `PassThroughParser` and the pipeline can start at the committer. See *Record-Oriented Connectors* in `PipelineConfig.md`.
- **Geometry becomes WKT text.** GML elements are converted in-parser to a `<path>_WKT` field (`XmlParser.cs:49`); `Parsing.SimplifyColumnNames: true` reduces that to the leaf name. Mixed geometry survives as WKT strings rather than being coerced to one column type - but it will split the target table at commit time (see *Geometry Column Naming* in `PipelineConfig.md`).
- **`Parsing.SwapAxisOrder` - leave it `false` when `SrsName` is the short `EPSG:4326` form (the default).** The axis order a GeoServer returns is decided by the *form* of the `srsName` you ask for, not by the WFS version:

| `srsName` requested | Axis order returned |
| --- | --- |
| omitted | latitude first |
| `EPSG:4326` (short form) | **longitude first** |
| `urn:ogc:def:crs:EPSG::4326` | latitude first |
| `CRS:84` | **longitude first** |

  `WfsConnector` sends `SRSNAME=<SrsName>` and `SrsName` defaults to `EPSG:4326`, so the default request already gets longitude-first data and **needs no swap**. Setting `SwapAxisOrder: true` on that default breaks it - points come back with latitude in the X position and the longitude clamped out of the valid latitude range (`POINT (21.3069 -91)`), and lines come back as empty `MULTILINESTRING ()`.

  Note the core's own WFS *browse* path hardcodes `SwapAxisOrder = true` (`WFSDataBrowseProvider.cs:236`), which is the opposite of what the connector needs - do not take it as the connector's default. Verified against GeoServer 2.26; a server with a non-default axis-order policy can still differ, so check the first pull.

---

## Specialty Connectors

### AttachedFilesystemConnector

**PluginName**: `"AttachedFilesystemConnector"` | **Type**: LongRunning

| Property | Type | Default | Purpose |
| ---------- | ------ | --------- | --------- |
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
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
| `EndPoint` | string | `"http://server.com/"` | WMTS GetCapabilities URL, ArcGIS MapServer URL, or XYZ `{x}{y}{z}` template |
| `MinZoom` | int | `-1` | Min zoom level (`-1` = auto-detect from capabilities) |
| `MaxZoom` | int | `-1` | Max zoom level (`-1` = auto-detect from capabilities) |
| `WMTSLayerTitle` | string | `null` | Layer name for WMTS services |

Geographic bounds are read from WMTS capabilities (`WGS84BoundingBox`) at runtime - there is no BoundingBox config property.

**Message context** (scope: `"tile"`):

| Key | Value |
| ----- | ------- |
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
| ---------- | ------ | --------- | --------- |
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
| ---------- | ------ | --------- | --------- |
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
| ----------- | ---- |
| `FileSystemConnector` | Config directly implements `IMLAcceptsPushedRecordsConfig` |
| All `BasePollingConnectorConfig` descendants | Inherits from `BasePollingConnectorConfig` which implements `IMLAcceptsPushedRecordsConfig` |
| Messaging connectors (Kafka, NATS, etc.) | N/A - already accepting by nature |

---

## Encrypted Configuration Fields

Connector config properties marked `[MLEncrypted]` in C# are encrypted at rest by `PluginSecretsService` (`MapLarge.Engine/Unified/PluginFramework/PluginSecretsService.cs`). You type the plaintext value into the Connector tab as normal; the server encrypts it on save and decrypts it before the plugin runs.

### Mechanism

- `EncryptConfigSecretsAsync` runs on save and `DecryptConfigSecretsAsync` on load, both keyed off the plugin's config type.
- Encrypted values carry an `mlcrypt1:` prefix; the backing store is the `plugin_secrets` table in the system account.
- Only **non-empty JSON string** values are encrypted. Nulls, empty strings, and non-string tokens pass through untouched, and if nothing needed encrypting the original JSON is returned byte-for-byte with its formatting intact.
- **Secrets are stripped on export.** `DataStreamManager.RemovePluginSecrets` (`:1201`) rewrites every `"mlcrypt1:..."` value to `""` when an on-ramp is exported, so an imported on-ramp always needs its credentials re-entered.

### Which properties are encrypted

| Connector | Encrypted properties |
| ----------- | --------------------- |
| `ActiveMQConnector` | `ClientId`, `UserName`, `Password`, `QueueOrTopic` |
| `ArcGIS Rest Connector` | `TableName` |
| `ElasticsearchConnector` | `Authorization` |
| `HttpPollingConnector` | `ApiKeyValue`, `Username`, `Password` |
| `KafkaConnector` | `SSLKeyPassword`, `SaslUsername`, `SaslPassword` |
| `NATSConnector` | `NKey` |
| `PulsarConnector` | `Token` |
| `S3Connector` | `KMSKey`, `AccessKey`, `SecretKey` |
| `SFTPConnector` | `Username`, `Password` |
| `SQSConnector` | `SecretKey` |

**Two surprises in that list.** `ActiveMQConnector.ClientId` and `QueueOrTopic`, and `ArcGIS Rest Connector.TableName`, are not credentials but carry the attribute anyway. Their values are stored as `mlcrypt1:` ciphertext like any other secret - not readable or greppable in a saved config, and blanked on export. Treat that as current behavior rather than intent.

**Connectors with no encrypted properties at all:** `MQTTConnector`, `NATSJetStreamConnector`, `PushedMessageConnector`, `WebSocketMessageConnector`, `WfsConnector`, `AzureStorageConnector`, `GoogleCloudStorageConnector`, `FileSystemConnector`, `RelationalDatabaseConnector`, `AttachedFilesystemConnector`, `Tiled Imagery Connector`, `VideoConnector`. Credentials in those configs - including `WfsConnector`'s `Username`/`Password` and `RelationalDatabaseConnector`'s `ConnectionString` - are stored **in the clear** and are **not** stripped on export.

---

## Gotchas, Validation & Behavioral Nuances

### Scheduling

| Gotcha | Detail |
| -------- | -------- |
| **`RunOnStartup` scope is limited** | Only checked by `AbstractPollableConnector` descendants (S3, Azure, GCS, SFTP) and only with `CronExpression`. `BasePollingConnector` descendants (HttpPolling, ArcGIS, WFS, RelationalDB, Elasticsearch) always run first poll immediately. |
| **2500ms minimum poll interval** | Even with `PollingFrequencyMS: 0`, minimum is 2.5s. S3/Azure/GCS/SQS enforce this independently. Delay is additive: `max(2500ms - elapsed, 0) + configuredInterval`. |
| **Invalid `CronExpression` silently becomes one-time** | Invalid cron clears `PollingFrequencyMS` to `-1` and sets schedule to null → `IsOneTime = true`. Runs once, stops, no error. |
| **`PollingFrequencyMS` and `CronExpression` mutually exclusive** | Last one set wins. Setting one clears the other. |

### Validation

| Gotcha | Detail |
| -------- | -------- |
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

- **MQTT** - connects once; silent failure on disconnect
- **ActiveMQ** - no reconnection; only supports text messages (`ITextMessage` cast); failed durable subscription silently falls back to non-durable

**Reconnection with backoff:**

- **Kafka/Pulsar** - 5-second delay then retry, indefinitely
- **HttpPolling** - single retry with 5s delay; if retry fails, throws (or returns null if `IgnoreErrors: true`)
- **WebSocket** - no backoff when `IgnoreErrors: true` (immediate retry); connection duration expiry = permanent exit (no reconnect)

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

- **HttpPolling duplicate URL skipping** - GET tracking skips poll if built URL matches previous poll's URL. With cursor/offset pagination the placeholder validation is bypassed, so a static URL + `DoNotTrack: false` polls once and then silently never again
- **HttpPolling offset beats cursor** - `OffsetParameterName` set → cursor settings ignored; the "cursor" param is sent as growing integers
- **HttpPolling pagination values must be promoted on the connector's context** - by the parser, not `JSONDisassemblerStreamTransform` (cloned context) → otherwise stops after page 1
- **WebSocket `ConnectionSpan`** takes precedence over `ConnectionDurationMS`
- **`FaultedRetryAttempts: 3`** = 4 total executions (1 initial + 3 retries). Retry delay has 0-1000ms random jitter.
- **Accepting mode race condition** - concurrent pushed records can overwrite shared `_config` field

### Connector-Specific Nuances

| Connector | Nuance |
| ----------- | -------- |
| **AttachedFilesystem** | `Recursive` config property is **never read** - always recurses. Use `STOP_RECURSION` context property to halt. Reconciliation **deletes rows** when source files removed. |
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
| -------------------- | ---------- | ------------- | ---------------- |
| `KafkaConnector` | Accepting | standalone | Topic, Endpoint, GroupId, EnableAutoCommit, UseSSL, SaslMechanism |
| `NATSConnector` | Accepting | NatsConfigBase | Endpoint, Subjects, QueueGroupName, CredentialsPath |
| `NATSJetStreamConnector` | Accepting | NatsConfigBase | Endpoint, Stream, DurableConsumerName, DeliverPolicy, FilterSubjects |
| `MQTTConnector` | Accepting | standalone | Endpoint, Topics |
| `PulsarConnector` | Accepting | standalone | Endpoint, Topic, Subscription, Token, UseSecureConnection |
| `ActiveMQConnector` | Accepting | standalone | Endpoint, QueueOrTopic, UserName, Password |
| `SQSConnector` | Polling/LR | BasePollingConnectorConfig | QueueEndpoint, AccessKey, SecretKey, Region |
| `WebSocketMessageConnector` | Accepting | standalone | EndPoint, SubscriptionMessage, RecvTimeoutSec |
| `PushedMessageConnector` | Accepting | standalone | PromotableProperties |
| `HttpPollingConnector` | Polling/LR | BasePollingConnectorConfig | EndPoint, UsePost, PostPayload, AuthenticationType, Cursor*, Offset*/PageSize |
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
| --------- | --------- | --------- |
| `verboseLogging` | `false` | Logs detailed step execution info (step name, type, plugin, start/end times, exceptions, record counts, context variables) to in-memory log queue. Viewable in the Detailed Logging tab. |
| `tableLogging` | `false` | Persists step execution details to the `_system/datastream_log` table. **Warning: negatively affects performance.** Use for debugging, not production. Table auto-caps at 100,000 rows. |

**Without `verboseLogging`**: The Server Statistics tab still works (counters are always tracked), but the Detailed Logging tab will have minimal data.

**With `tableLogging`**: Step details are written to `_system/datastream_log` with columns: `Timestamp`, `RampName`, `RampId`, `Message`, `JsonDataString` (full JSON of step diagnostics). You can query this table directly via the SQL query interface for historical analysis.

### Querying Ramp Status via Table-Valued Functions

Ramp status, logs and plugin metadata are all exposed as TVFs. This is the scriptable path - it is exactly what the Admin UI itself calls - and it is the only way to read this data without a browser.

**How to call them.** TVFs resolve by **.NET type name**, not by a short SQL alias: `QueryTableFunction.GetFunctionOrMatchType` does `Type.GetType("MapLarge.Engine.Query.TableValuedFunctions." + name)`. Use a query descriptor with `table.function.name` set to the class name:

```json
{
    "table": {
        "function": {
            "name": "RampServerStatsTableValuedFunction",
            "params": { "ramptype": "on", "asof": "{{cacheString}}" }
        }
    },
    "where": [[{ "col": "UniqueID", "test": "Equal", "value": "<ramp-unique-id>" }]],
    "orderby": ["ServerName"],
    "usenullvalues": true
}
```

Every one of these takes an `asof` parameter whose only purpose is cache busting - pass a changing value (a timestamp) or you will get a stale cached result on the second call.

> **Note:** short aliases of the form `ml_rampserverstats(...)` do **not** exist and never did. Earlier revisions of this document showed them; they cannot resolve, because name lookup goes through `Type.GetType`.

#### RampsTableValuedFunction - the ramp's saved configuration

The one to reach for first when a ramp misbehaves, because it returns **`ConnectorOptions` and `PipelineDefinition` as actually stored**, rather than what a UI form re-renders.

| Param | Optional | Purpose |
| ------- | ---------- | --------- |
| `mode` | yes | `'Minimal'` (default) or `'Full'` |
| `ramptype` | yes | `'on'` or `'off'` |
| `asof` | yes | Cache busting |

Columns: `UniqueID`, `Name`, `RequestedStatus`, `ActualStatus`, `ConnectorAppName`, `ConnectorPluginName`, `ConnectorOptions`, `PipelineDefinition`, `WellKnownPipelineId`, `EffectiveUserName`, `PerformanceCounterInstanceName`, `RequiredClusterRole`, `NumberRunning`, `NumberFaulted`, `NumberNonFatal`, `Parameters`, `VerboseLogging`, `TableLogging`, `FaultedRetryAttempts`, `FaultedRetryIndefinitely`, `FaultedRetryDelay`, `FaultedRetryExponentialBackoff`, `SupportIncrementalUpdate`, `HasWarnings`, `WellKnownLoggingInterceptorId`, `LoggingInterceptorDefinition`.

`SupportIncrementalUpdate` is worth reading before you reset tracking - see *Reset Tracking* below.

#### RampServerStatsTableValuedFunction - per-server counters

| Param | Optional | Purpose |
| ------- | ---------- | --------- |
| `ramptype` | yes | `'on'` or `'off'` |
| `local` | yes | `'true'` = this server only |
| `nondeleted` | yes | `'true'` = exclude deleted ramps |
| `asof` | yes | Cache busting |

Columns: `UniqueID`, `Name`, `ServerName`, `ActualStatus`, `ErrorMessage`, `QueueDepth`, `MessagesProcessed`, `MessagesFailed`, `RecordsProcessed`, `RecordsSkipped`, `RecordsFailed`, `AvgLatencyMS`, `LastProcessedTimestamp`, `LastStateChangeTime`, `HasWarnings`.

Counters are always tracked - this works whether or not `verboseLogging` is on.

#### RampLoggingTableValuedFunction - message-level log

| Param | Optional | Purpose |
| ------- | ---------- | --------- |
| `id` | yes | Ramp `UniqueID` |
| `ramptype` | yes | `'on'` or `'off'` |
| `local` | yes | This server only |
| `nondeleted` | yes | Exclude deleted ramps |
| `asof` | yes | Cache busting |

Columns: `UniqueID`, `MessageId`, `MessageStart`, `MessageEnd`, `ServerName`, `NumStepsWithException`, `RecordsProcessed`.

#### RampStepLoggingTableValuedFunction - step-level detail

| Param | Optional | Purpose |
| ------- | ---------- | --------- |
| `id` | **no - required** | Ramp `UniqueID` |
| `messageid` | yes | Narrow to one message |
| `ramptype` | yes | `'on'` or `'off'` |
| `local` | yes | This server only |
| `nondeleted` | yes | Exclude deleted ramps |
| `asof` | yes | Cache busting |

Columns: `UniqueID`, `StepName`, `Count`, `Start`, `End`, `Exceptions`, `MessageContext`, `MessageId`, `MessageStart`, `MessageEnd`, `ServerName`, `NumStepsWithException`.

`Exceptions` and `MessageContext` are the two that matter - they tell you which step threw and what the context held at that moment. Needs `verboseLogging` to be populated.

#### PluginListTableValuedFunction - what plugins exist, and their config schema

Runtime discovery of every registered plugin, **including its config metadata and defaults**. This is how you answer "does this server even have `WfsConnector`?" and "what properties does its config accept?" without source access.

| Param | Optional | Purpose |
| ----- | -------- | ------- |
| `interfaceType` | yes | .NET interface name to filter by |
| `asof` | yes | Cache busting |

Columns: `AppName`, `PluginName`, `Type`, `ConfigMetadata`, `ConfigDefaults`, `ValidTransitions`.

#### PipelineParametersTableValuedFunction - parameters of a saved pipeline

Params: `UniqueID` (the pipeline id, optional), `asof`. Columns: `UniqueID`, `PipelineName`, `ParameterName`, `ParameterValue`.

---

### Scriptable Control and Debugging (ProcessDirect)

Everything the Data Streams admin page does is a ProcessDirect action on the `datastream` module (registered at `ApiRequestManager.cs:236`). Post to `/Api/ProcessDirect` with an `action` of `datastream/<verb>`:

```json
{
    "action": "datastream/resetonramptracking",
    "onramp": { "UniqueID": "<ramp-unique-id>" }
}
```

| Verb | Purpose |
| ------ | --------- |
| `fetchallonramps` / `fetchonramp` | List / read on-ramps. **`fetchonramp` is the truth** for a ramp's saved config |
| `createonramp` / `editonramp` / `deleteonramp` | CRUD |
| `startonramp` / `stoponramp` | Start / stop |
| `testonramp` | Send a test payload at the connector |
| `resetonramptracking` | Clear the incremental watermark (see below) |
| `exportonramp` / `importonramp` | Export / import JSON (**secrets are blanked on export**) |
| `acceptstream` | Push records into a ramp running in accepting mode |
| `fetchallpipelines` / `fetchpipeline` / `createpipeline` / `editpipeline` / `deletepipeline` | Saved-pipeline CRUD |
| `testpipeline` / `testexportpipeline` | Run a whole pipeline against a payload |
| `testpipelinestep` | **Run one step in isolation** |
| `testpipelinesubgraph` | **Run from one step downstream through the rest** |
| `importpipeline` / `exportpipeline` | Pipeline import / export |
| `fetchallresources` / `fetchresource` / `createresource` / `editresource` / `deleteresource` | Well-known resources |
| `fetchallofframps` … `resetofframptracking` | The off-ramp equivalents of all of the above |

**Access gate.** `sysAdminOnlyDataStreamAccess` defaults to **`true`** (`Config.cs:689`). With it on, every verb above throws `ForbiddenException` for a non-sysadmin - including the read-only ones. A blanket 403 on datastream calls usually means this, not a per-object permission problem.

---

### Testing a Pipeline Without Running the Ramp

Two verbs let you exercise pipeline logic against a payload you supply, with no connector involved and no schedule. This is the fastest loop for debugging a transform or committer.

**`testpipelinestep`** - one step, in isolation. Request body carries a `pipelineSandbox` object:

| Field | Default | Purpose |
| ------- | --------- | --------- |
| `rampIdOrName` | - | Ramp whose pipeline definition to use |
| `stepName` | - | The step to run |
| `textPayload` | - | Payload as a string (JSON-encoded) |
| `isExportPipeline` | `false` | True when the step is export-only |
| `simplifyColumnNames` | `true` | Column naming when parsing a JSON payload |
| `recordRootPath` | `"$.features[*]"` | JSONPath to the records |

**`testpipelinesubgraph`** - start at a step and run everything downstream, committers included. Request body carries a `pipelineSubgraphRun` object:

| Field | Default | Purpose |
| ------- | --------- | --------- |
| `startStepName` | - | **Required.** Where execution begins |
| `rampIdOrName` | - | Use this ramp's pipeline definition |
| `wellKnownPipelineName` | - | …or this saved pipeline |
| `pipelineDefinition` | - | …or an inline definition (object or string) |
| `textPayload` | - | Payload as a string; **if omitted, the HTTP body is used** |
| `pipelineParameters` | - | Parameter substitutions applied to the definition |
| `contextProperties` | - | Message-context properties set before the start step runs |
| `keepHistory` | `true` | Whether committers retain import history |
| `isExportPipeline` | `false` | Export pipeline definitions |
| `simplifyColumnNames` | `true` | Column naming for JSON record payloads |
| `recordRootPath` | `"$.features[*]"` | JSONPath to the records |

Exactly one of `rampIdOrName` / `wellKnownPipelineName` / `pipelineDefinition` is required; an unknown `startStepName` returns `Pipeline does not contain step '<name>'`. The payload is shape-validated against the start step before anything is enqueued, so a mismatched payload fails fast rather than half-committing.

The response returns `messageResult`, `pipelineName`, the list of `stepNames` that actually ran, and `affectedResources` - the last of which tells you which tables were written. `extraData.CorrelationToken` carries the coalescer batch id.

**This runs for real.** A subgraph that ends in a committer writes to the target table. Point it at a scratch table first.

---

### Server-Side Logs

The in-browser Detailed Logging tab and the ramp TVFs cover the pipeline's own diagnostics. The server event log is separate, and is where connector-level failures (HTTP errors, auth, connection drops) land.

DataStream code logs almost entirely under the **`import`** module tag (`LoggableModule.import`, `MapLarge.IO/Logging/LoggableModule.cs:6`); a few paths use `dataimport`, `file`, `pipe`, and `video`. To raise just that module without flooding the log, add a `LoggingOverrides` entry in `config.json`:

```json
"DefaultLogLevel": "Info",
"LoggingOverrides": { "import": "Debug" }
```

Three things to know:

- **`DefaultLogLevel` defaults to `Info`, so `Debug` entries are dropped** unless you override the module explicitly. Setting the override is what makes connector debug output appear.
- **`LoggingOverrides` keys are matched case-sensitively.** Use exactly `import`, lowercase.
- Entries land in `<logDirectory>/YYYYMMDD/EventLog.HH.txt` - **rotated hourly**, so one day is many files - and flush asynchronously (~5 s), meaning a hard crash can lose the last few lines.

An override of `None` fully suppresses the module regardless of `DefaultLogLevel`.

---

### Reset Tracking - Read This First

`resetonramptracking` behaves differently depending on the connector (`DataStreamManager.cs:1355`):

- If the connector implements `ISupportIncrementalUpdate` - which **every `BasePollingConnector` descendant does**, including `WfsConnector`, `HttpPollingConnector`, `ArcGISRestConnector`, `RelationalDatabaseConnector` and `ElasticsearchConnector` - only its tracking data is cleared. This is the safe, targeted case.
- If it does **not**, the fallback is `ClearAllMetadataForComponentAsync` - **all** metadata for that ramp is wiped, not just the watermark.

Check the `SupportIncrementalUpdate` column from `RampsTableValuedFunction` before resetting a connector you are unsure about.

After a reset, the next poll re-pulls from `StartDate` if one is configured, and otherwise pulls everything.

---

### Debugging Workflow

1. **Check status** - Admin (gear icon) → Data Streams → On Ramps. Red = Faulted, orange = warnings. Scriptable equivalent: `RampServerStatsTableValuedFunction` and read `ActualStatus` / `ErrorMessage`.
2. **Read the error** - click the status indicator → Server Statistics tab → `ErrorMessage`.
3. **Confirm what the ramp is actually configured with** - `fetchonramp`, or the `ConnectorOptions` / `PipelineDefinition` columns of `RampsTableValuedFunction`. Do not trust a re-rendered UI form for this.
4. **Nothing arriving at all?** Check the connector, not the pipeline: raise `LoggingOverrides: { "import": "Debug" }` and read `EventLog.HH.txt`. Remember that several connectors default `IgnoreErrors` to `true` and will log-and-continue rather than fault.
5. **Data arriving but wrong?** That is the pipeline. Enable `verboseLogging`, restart, then read `RampStepLoggingTableValuedFunction` - `Exceptions` and `MessageContext` identify the failing step.
6. **Iterate on the fix without waiting for a poll** - `testpipelinestep` for one step, `testpipelinesubgraph` to run from that step through the committers. Point at a scratch table; these write for real.
7. **Historical analysis** - enable `tableLogging`, reproduce, then query `_system/datastream_log` (auto-caps at 100,000 rows; costs throughput, so turn it back off).
8. **Re-pull from the beginning** - `resetonramptracking`, after checking `SupportIncrementalUpdate`.
9. **Dashboards** - `RampServerStatsTableValuedFunction` across all ramps, with a rotating `asof`.
