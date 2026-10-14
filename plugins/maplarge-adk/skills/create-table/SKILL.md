---
name: create-table
description: >-
  Create a MapLarge table from a natural language description, end to end:
  profile and server setup, account discovery, table creation, and
  verification. Use when the user describes data they want to store, track, or
  manage — even on a server not yet connected; this skill handles profile
  resolution itself. Triggers on "create a table", "I need a table for",
  "make me a table", "set up a table to track", "build a table", "new table",
  "create table on [server]", or "/create-table".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "ARC-30, promoted from the internal skill pool per the ARC-3 audit"
  verified-against: "create_table.mjs CSV and schema-only paths verified by live run on MapLarge Server 4.139 (docs host), 2026-09-22 (ARC-30); ADK CLI 1.0.90"
---

# Create Table from Natural Language

Translate a user's plain-English description into a MapLarge table with schema and optional sample data, created and verified on a real server through the bundled script. This skill owns the whole workflow: resolving the server profile, mapping the description to MapLarge column types, generating sample data, creating the table, and confirming it exists. For schema design or data modeling that stops short of creating anything, use `adk-data-dev`; for querying, updating, exporting, or managing tables that already exist, use `maplarge-database`.

## Step 0: Resolve server and profile

If the user specifies a server URL or profile name, resolve it before anything else.

**If the user gives a URL** (e.g., `https://yourserver.com`):

1. Run `maplarge config list-profiles` to check for an existing profile matching that server URL.
2. If found, use that profile name.
3. If NOT found, have the USER create the profile themselves — never collect a password in chat (it would land in the conversation transcript and shell history). Ask them to run this in their own terminal:

   ```bash
   maplarge config create-profile -name "{name}" -server "{url}" -user "{user}" -password "<their password>"
   ```

   Then continue once they confirm the profile exists.

**If the user gives a profile name** (e.g., `dev`): use it directly — the script validates it exists.

**If neither is specified**: default to `local`.

**IMPORTANT**: Profiles store server URL, username, password, and JWT token (CLI config: `MapLargeCLI/maplarge.cli.config.json` under the platform app-data dir). Do NOT guess passwords, and do NOT ask the user to paste one into the conversation.

## Step 1: Understand the user's intent

From the user's description, determine table purpose, columns, column types, and whether sample data is wanted.

### MapLarge column type mapping

| User says | MapLarge type | Notes |
| --- | --- | --- |
| name, title, status, description, label, category, type, notes | `String` | Any text field |
| count, quantity, age, rank, score, number of, ID, zip code | `Int32` | Whole numbers |
| large number, population, row count, file size, timestamp (epoch) | `Int64` | Large integers |
| price, temperature, weight, distance, percentage, rating, mileage | `Double` | Decimal numbers |
| date, time, when, created, updated, last service, due date, deadline | `DateTime` | Date/time values |
| location, coordinates, position, lat/lng, where, address, point | See geospatial rules | Requires special handling |
| area, boundary, region, zone, polygon, shape, geofence | `Poly` | Polygon geometry |
| route, path, track, line, trail | `Line` | Line geometry |
| unique ID, UUID, GUID | `Guid` | Unique identifiers |
| image, photo, thumbnail, picture | `Image` | Image data |
| JSON, metadata, payload, config, properties, tags | `Json` | Structured nested data |

### Geospatial rules

If the user mentions location, position, or coordinates:

- Add TWO columns: `Lat` (Double) and `Lng` (Double) — MapLarge auto-detects the pair and creates a geospatial index
- Do not use the `XY` type directly for CSV uploads — the CSV import path builds the geospatial index from the Lat/Lng Double pair, not from a raw `XY` column
- If the user mentions addresses, add an address String column AND pass `--force-geocode` so MapLarge geocodes it automatically

## Step 2: Determine sample data

- **Volume**: "with 100 rows", "just a few rows", "empty" (0 rows). Default: 5 rows of realistic data.
- **Domain / geography / patterns**: honor "realistic for a hospital", "locations in Atlanta", "some with missing values", etc.
- **For empty tables** ("empty", "no data", "just the schema"): skip CSV generation and use `--schema` (see Step 4).

## Step 3: Confirm with the user

Present a summary (table name, profile, columns table with example values, row count) and ask if they want to adjust anything.

**Table naming**: PascalCase from the description — "vehicle maintenance" → `VehicleMaintenance`.

**Account**: auto-detected by the script (the profile user's own account when it can be matched, otherwise the first non-system user-owned account); pass `--account` to override. **Visibility**: defaults to `Private`; pass `--visibility PublicUnlisted` or `--visibility Public` when the user asks for a shared/public table.

## Step 4: Create the table

Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`).

**With data** — generate CSV content (header row; realistic values; quote fields containing commas/newlines; DateTime as `yyyy-MM-ddTHH:mm:ss`; realistic Lat/Lng for the region), write it to a temp file, then:

```bash
node <plugin-root>/scripts/create_table.mjs --table-name "{tableName}" --profile "{profile}" --csv-file "{path-to-temp-csv}" [--account "{account}"] [--visibility Private] [--force-geocode]
```

**Empty (schema only)** (`--force-geocode` does not apply to empty tables):

```bash
node <plugin-root>/scripts/create_table.mjs --table-name "{tableName}" --profile "{profile}" --schema '{"Name":"String","Age":"Int32","Lat":"Double","Lng":"Double"}' [--visibility Private]
```

The script verifies the profile, auto-detects the account if omitted, creates the table via the MapLarge CLI, verifies the table actually exists afterward, and prints a JSON result. Temp-directory CSVs are cleaned up automatically.

## Step 5: Report results

Report the table (`{Account}/{TableName}`), column count, rows loaded (or "empty"), and a query example:

```bash
maplarge query exec -profile {profile} -input "SELECT * FROM {Account}.{TableName} LIMIT 10" -lang sql -outputTypes json
```

## Error handling

- **Profile not found**: the script lists available profiles and the create-profile command — guide the user through setup (`maplarge config create-profile ...`, then `maplarge config login -profile {name}`), with the user running credential-bearing commands themselves per Step 0.
- **Account not found**: run `maplarge admin account list -profile {profile} -outputTypes JSON` and show options.
- **Table not verified**: the CLI can report success while the table is missing — usually an invalid account name. Re-run with auto-detection (omit `--account`) or check the account.
- **Geocoding failure**: requires server-side geocoding service configuration.
- **Table already exists**: ask whether to append data or choose a different name.

## Examples

- "Create a table to track our delivery vans — name, status, where they are, last service date" →
  columns `Name` (String), `Status` (String), `Lat` (Double), `Lng` (Double), `LastService` (DateTime); confirm, generate 5 CSV rows, then
  `node <plugin-root>/scripts/create_table.mjs --table-name "DeliveryVans" --profile "local" --csv-file "{temp}.csv"`.
  "Where they are" becomes the Lat/Lng Double pair, never a single location column.
- "Make me an empty table on `https://yourserver.com` for sensor readings: sensor id, reading, timestamp — just the schema" →
  resolve the URL to a profile (Step 0), then
  `node <plugin-root>/scripts/create_table.mjs --table-name "SensorReadings" --profile "{resolved}" --schema '{"SensorId":"Guid","Reading":"Double","Timestamp":"DateTime"}'`.
  "Just the schema" means `--schema`, no CSV generation.
- "Set up a public table of our store locations by street address" →
  columns `Store` (String), `Address` (String), then
  `node <plugin-root>/scripts/create_table.mjs --table-name "StoreLocations" --profile "local" --csv-file "{temp}.csv" --visibility Public --force-geocode`.
  Addresses ride in a String column and `--force-geocode` has the server geocode them; "public" maps to `--visibility Public`.

## Hand-offs

- Schema design or data-modeling questions with no table to create: use `adk-data-dev`.
- The table should be created by extension or application code at runtime rather than by you now: use `maplarge-database` (REST and plugin API surfaces), with `adk-data-dev` for the ADK-side patterns.
- Querying, updating, exporting, versioning, or permissions on tables that already exist: use `maplarge-database`.
- Loading data continuously from an external source rather than a one-time CSV: use `maplarge-datastreams`.
