---
name: maplargerest
description: >-
  Use the MapLarge Python REST client (PyPI maplargerest) for server status,
  table queries, and geo verification against a live MapLarge instance. Prefer
  this over hand-rolled ProcessDirect or curl JSON for standard reads. Use when
  writing Python against MapLarge REST, checking imports, reading Line/WKT
  geometry, probing /restapi/v1/openapi.json, or bridging an OpenAPI path the
  installed client does not wrap yet. Triggers on "maplargerest", "RestClient",
  "from maplargerest", "pip install maplargerest", "with_geo", "queries.result",
  "openapi.json", "Python REST client".
metadata:
  owner: "David Days <david.days@maplarge.com> · AI Resource Team"
  provenance: "Promoted from the internal maplarge-reference pool on branch python-rest-client"
  verified-against: "PyPI maplargerest (RestClient, Query, with_geo) import-checked 2026-09-29; OpenAPI live-contract probe is the standard /restapi/v1/openapi.json path — re-verify against the client version pinned in the consumer environment"
---

# MapLarge Python REST client (`maplargerest`)

Covers the public PyPI package `maplargerest` for scripted reads against a MapLarge
server's REST API: install, authenticate, query tables (including geo columns),
and check the running OpenAPI when the installed client may lag the server. It
excludes the general CLI / ProcessDirect / plugin-API catalog (`maplarge-database`),
JSON query authoring inside ADK extensions (`adk-query-dev`), table create-from-description
(`create-table`), and authoring or regenerating server REST endpoints.

## Prefer this over inventing HTTP

For standard reads (login, table info, queries, geo columns), use **`maplargerest`**
instead of ad-hoc `curl` or ProcessDirect payloads.

| Surface | When |
| --- | --- |
| **`maplargerest` (this skill)** | Python scripts, CLI agents, import verification, reproducible automation |
| Host-provided MapLarge tools (if any) | In-session IDE helpers already authenticated to the target server |
| Raw HTTP | Only if the client lacks the endpoint **and** OpenAPI confirms the server has it |

For verb catalogs, permission quads, and non-Python surfaces, use `maplarge-database`.

## Package

```bash
pip install 'maplargerest' 'typing_extensions'
# or: python3 -m venv /tmp/mlrest-venv && /tmp/mlrest-venv/bin/pip install maplargerest typing_extensions
```

**Note:** Current PyPI `maplargerest` can import-fail on Python 3.13+ with
`No module named 'typing_extensions'` because that dependency is not declared.
Install `typing_extensions` alongside until a fixed package release lands; then
this pin can drop.

PyPI: `maplargerest` — “MapLarge REST API Python Client”.

Import surface:

```python
from maplargerest.endpoints import RestClient
from maplargerest.models import Query
```

## Always check the running OpenAPI

Every MapLarge server publishes its live REST contract:

```text
{serverUrl}/restapi/v1/openapi.json
```

Example (same base URL you pass to `RestClient`):

```text
{serverUrl}/restapi/v1/openapi.json
```

`{serverUrl}` is a **full MapLarge server** (cluster/lab/deployed), not
`maplarge adk run` — ADK’s local HTTPS page does not expose `/restapi/v1/...`.

**Why this matters:** `maplargerest` is generated from a **published** API snapshot.
A running server (new or amended REST endpoints) can be **ahead of** or **different
from** the installed client. Before assuming “the client can’t do X”:

1. Fetch OpenAPI from the **same** `serverUrl` you will call.
2. Confirm the path/method/schema exists on the server.
3. If OpenAPI has it but `maplargerest` does not → call the endpoint with the
   authenticated client’s HTTP helpers / raw request using the OpenAPI shape,
   or note the client gap; do not invent legacy ProcessDirect unless OpenAPI
   (or product docs) say that is still the supported path.
4. If neither OpenAPI nor the client exposes it → it is not a public REST API
   on that server (or wrong base URL / version).

Quick probe:

```bash
curl -sS "$SERVER_URL/restapi/v1/openapi.json" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('openapi', d.get('openapi') or d.get('swagger')); print('paths', len(d.get('paths',{})))"
```

Search for a path fragment:

```bash
curl -sS "$SERVER_URL/restapi/v1/openapi.json" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); q='$FRAG';
print('\n'.join(p for p in d.get('paths',{}) if q.lower() in p.lower()))"
```

## Connect and authenticate

```python
from maplargerest.endpoints import RestClient
import os

server_url = os.environ["MAPLARGE_SERVER_URL"]  # full MapLarge base URL, no trailing slash
username = os.environ["MAPLARGE_USER"]
password = os.environ["MAPLARGE_PASSWORD"]

client = RestClient(server_url, username, password)
client.login()  # caches ml token; subsequent calls attach auth
```

Resolve `server_url` / credentials from the user’s MapLarge CLI profile, environment,
or an explicit URL they provide. Do **not** collect passwords in chat, hardcode them
into skills or committed scripts, or invent default admin accounts.

## Queries (most common)

Create a query, then fetch results by hash:

```python
from maplargerest.models import Query

q = Query(table="MyAccount/MyTable", take=5000, with_geo=True)
resp = client.queries.post(body=q)
result = client.queries.result(hash_=resp.hash_)

# Column-oriented dict: result.data["columnName"] -> list
# Geo: result.data["WKT"] and/or result.all_geo (e.g. ["Line"] -> WKT strings)
data = result.data
n = len(next(iter(data.values())))
```

Notes:

- Python kwarg is **`with_geo`**; wire JSON is `withGeo`. Without it, Line/WKT
  geometry is often omitted.
- `table` may be the string `"account/table"` (client accepts it).
- Prefer `/restapi/v1/queries` (what this client uses). Legacy ProcessDirect
  routes may 403/404 on modern servers.

### Table metadata

```python
info = client.tables.get(account="MyAccount", name="MyTable")
```

Or OpenAPI + GET `/restapi/v1/accounts/{account}/tables/{name}` if exploring
new fields.

## Auth headers (fallback raw HTTP)

When bridging an OpenAPI-only endpoint the client lacks:

1. `client.login()` then `token = client.credentials().token`
2. Send `mluser` + `mltoken` (same as the client), JSON body per OpenAPI.

Do not fall back to guessing ProcessDirect action names — use `maplarge-database`
when you need the verb catalog.

## Common failure modes

| Symptom | Likely cause |
| --- | --- |
| `Connection refused` / TLS errors | Server not listening; wrong `{serverUrl}`; self-signed certs need an explicit TLS trust/disable path in the client/env — do not point at `adk run` |
| 401 / login fail | Wrong user/password or token for that server |
| Query 400 `Query table is missing` | Body shape wrong for raw HTTP; use `Query(table=...)` via client |
| Empty / missing Line geometry | Forgot `with_geo=True` |
| Client missing method that “should” exist | **Check OpenAPI** on the running server; client may lag that build |
| ProcessDirect 403 | Use REST `/restapi/v1/...` per OpenAPI instead |
| `No module named 'typing_extensions'` after `pip install maplargerest` | Undeclared package dependency on some Pythons — `pip install typing_extensions` (see Package note) |

## Examples

- “Verify MyAccount/Vehicles has Line geometry from Python” →
  `Query(table="MyAccount/Vehicles", take=10, with_geo=True)` then
  `client.queries.result(...)`; inspect `result.all_geo` / `WKT`. Do not omit
  `with_geo` and do not hand-roll ProcessDirect for this.
- “Does this server expose a new REST path the client lacks?” → fetch
  `{serverUrl}/restapi/v1/openapi.json`, search paths, then either use a client
  method or authenticated raw HTTP from OpenAPI — not a guessed ProcessDirect verb.
- “Script a table-info check in CI” → `RestClient` + `client.tables.get(account=..., name=...)`
  with credentials from env or a local CLI profile the user manages outside chat.
