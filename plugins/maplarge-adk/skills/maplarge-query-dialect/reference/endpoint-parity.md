# Endpoint parity: a result from one route is not evidence about another

MapLarge queries reach the server through several routes, and they do not share one parser, one serializer or one client. The twelve behaviors below were each measured disagreeing between routes on the same server and the same public `ml_samples/Miami_*` tables, in both directions. The operative rule is short: **confirm a query on the route the code will actually call.** A result from any other route is corroboration, not proof, and rewriting a query in another dialect to "check" it is how a correct query gets "fixed" into a broken one.

## The routes

| Route | What calls it | Notes |
| --- | --- | --- |
| The JSON query route | `.runAsync()` on a query built by `ml.data.query.Query.fromApiRequest(q)` or `ml.data.query.getQueryFromJSON(q)` in extension code: a `table/query` action posted to `/Api/ProcessDirect` | The reference point for extension work. The client rebuilds and re-serializes the query first; see below |
| The same route, hand-written | Scripts or tests posting their own `table/query` request to `/Api/ProcessDirect` | Same server parser, but without the client's key filtering, so an unknown key is a loud 500 |
| The REST query routes | `POST /restapi/v1/queries/result` and `/restapi/v1/queries/validate` | camelCase field names in the schema; lowercase also accepted. The command line's `-lang json` returned the same rows and counts as this route in every case measured, though it re-renders dates (below) |
| The SQL endpoint | `POST /restapi/v1/sql/result`, and the command line's `-lang sql` | A different parser; several expressions and comparisons differ |
| The layer render path | `/Api/CacheRequest` and the tile routes the map uses | The only route that proves a map will draw; see the `adk-map-layers` skill |

## What the client changes before anything reaches the server

Extension code builds a query object with one of two converters, and both rebuild it before anything is sent. `Query.fromApiRequest` copies only `where`, `sqlselect`, `join`, `orderby`, `having`, `groupby`, `take`, `start`, `wherefirst`, `table` and a few bookkeeping keys (`engineVersion`, `queryName`, `queryTag`). `getQueryFromJSON` reads a longer list of lowercase keys, including `withgeo`, `usenullvalues` and `unionall`, and skips a `groupby` that is not an array. Either way the request is serialized with its keys sorted. This was read from the 4.139 client bundle rather than observed in a browser, and it has consequences that the server measurements confirm:

- **Keys a converter does not read never reach the server.** Neither reads `select`, `groupbyfields` or any camelCase spelling; `fromApiRequest` also drops `withgeo`, `usenullvalues` and `unionall`. Nothing reports the drop. The filter applies to the top level only: a nested `table.query` and a `join` are passed through verbatim, so an inner query's `withgeo` or `usenullvalues` survives.
- **camelCase keys silently un-aggregate a query.** `sqlSelect` and `groupBy` are accepted by the REST route and by a hand-written `/Api/ProcessDirect` request (35 grouped rows), but through either converter both are dropped and the same query returned 200 rows of all 45 columns.
- **The null flag depends on the converter.** In a grouped query, an expression over `Miami_Flights.track`, which holds 911 nulls, returned 1,239 without `usenullvalues` and 328 with it; the request `fromApiRequest` builds carries no flag, so the query objects it returns need their `withNull(true)` method instead.
- **JSON key order cannot matter on this route**, because the keys are sorted before sending. It does matter on the REST route; see the `select: { columns }` row below.

## The measured divergences

| Behavior | JSON query route | Other route |
| --- | --- | --- |
| A date comparison: `STARTDATED Greater "2000-01-01"` against `WHERE STARTDATED > '2000-01-01'` on `Miami_Wildfire_Locations` | 237 rows, matching a client-side count | **0 rows, silently**, on the SQL endpoint |
| `count(distinct ZIPCODE)` in a projection | HTTP 500, `Failed to parse the following expr`. The one-word `CountDistinct(ZIPCODE)` works and matches SQL | Runs on the SQL endpoint |
| A ternary with `\|\|`: `sum((Benches>=1 \|\| Shelters>=1) ? 1 : 0)` | Works: 4,019 across 35 groups | HTTP 500 on the SQL endpoint, `SQL Syntax Error` at `\|\|` |
| A blank-string equality combined with any other condition: `MUNIC_NAME = ''` AND (or OR) a condition true for every row | 15 rows, the same as the blank test alone | **0 rows** on the SQL endpoint, although `MUNIC_NAME = ''` alone returns the correct 15 |
| A null number inside an expression in a grouped query: `sum(track <= 30 ? 1 : 0)`, and on SQL the `CASE WHEN` form | Reads each null as 0: 1,239, or 328 with `"usenullvalues": true` | Leaves nulls out on the SQL endpoint, grouped as well: 328 |
| `CASE WHEN` and `LIKE` inside an expression | Parse error (`Unexpected Characters: 'WHEN'` or `'LIKE'`). The ternary works, and the `Like` filter test returned 46, the same as SQL | The SQL endpoint accepts both: `CASE WHEN Benches >= 1` summed to 3,405 and `WHERE StopName LIKE '%AVE%'` returned 46 |
| The blank value as a group key | `""` | `null` on the SQL endpoint |
| A row cap inside a nested query | An inner `take: 5` is ignored: a count over it returned 5,595 | A subquery `LIMIT 5` is honored on the SQL endpoint: the count returned 5 |
| Rendering of a DateTime value stored as midnight UTC on 1991-06-05 | `1991-06-05T00:00:00.0000000+00:00`, identical on the REST query route and the SQL endpoint | Command line JSON: `1991-06-04T20:00:00-04:00`, the machine's local offset, which moves the calendar date; command line CSV: `6/4/1991 8:00:00 PM` |
| Year-0001 "no value" dates in `Miami_Wildfire_Locations` | Treated as values: `min(STARTDATED)` is `0001-01-01T00:00:00.0000000+00:00`, the `IsNull` filter test matches the 18 such `STARTDATED` rows, and a year-0001 `CONTRDATED` renders as `0001-01-01T00:00:00.0000000+00:00` | Treated as nulls, inconsistently, on the SQL endpoint: `min(STARTDATED)` is 1980-02-28, `IS NULL` matches 0 rows, and the same `CONTRDATED` value renders as `null` |
| `select: { columns: ["StopID", "MUNIC_NAME"] }` with a `where` on `MUNIC_NAME` | Dropped by both client converters before sending: the `where` applies and all 45 columns return. Hand-written to `/Api/ProcessDirect`: HTTP 500, `Unknown JSON attribute in select block: columns` | REST route and command line: 200 with **every key after the select block silently skipped**. Placed before `where` and `take`: 5,595 rows counted and 100 returned instead of 1,258 and 170; placed after them: correct counts. No columns were trimmed on any route |
| camelCase `sqlSelect` and `groupBy` | Dropped by both client converters: un-projected, un-aggregated rows | Honored by the REST route and by a hand-written `/Api/ProcessDirect` request |

Behaviors measured the **same** on the routes compared, so they are not in the count: the default cap of 100 rows and 100 groups when no `take` or `LIMIT` is given (JSON, REST and SQL), a blank-string equality on its own (JSON and SQL), `Between "1/3"` (JSON and REST), and `CountDistinct` against the SQL endpoint's `count(distinct ...)`.

**Null and blank handling in an aggregate follows the query shape, not the route**, and is easy to mistake for a route difference. On both the JSON route and the SQL endpoint, a flat aggregate (no `groupby`, or a constant column selected beside the aggregate) skipped nulls and blanks, while a grouped one counted them. `count(track)` returned 6,036 flat and 6,947 grouped on the JSON route. SQL `SELECT COUNT(track)` returned 6,947 on its own and 6,036 once a constant column was selected beside it. Compare two routes only with queries of the same shape.

## Where the schema helps, and where it stops

Every server publishes an OpenAPI description of its REST surface, readable without authentication, and it is a genuine oracle for one question: *is this a declared key?* It is corroboration, not an oracle, for behavior. For example, the schema declares a `{ "min": ..., "max": ... }` value form for range filters, yet `Between` with that value is an HTTP 500 (`Index was outside the bounds of the array`) on both the JSON and REST routes; only the slash-delimited string works. Which layer style keys the render path accepts is covered by the `adk-map-layers` skill.

**A live measurement outranks the schema; the schema outranks a guess.**

Two cheap pre-flight calls are worth knowing, and neither is the render path:

- `POST /restapi/v1/queries/validate` returned 200 with a hash and the projected column list for a good query, and 400 `Column 'NoSuchColumn' is not found in any table source` for a bad one. Its schema summary says it validates without adding the query to the cache. It checks the query only, never a style.
- `POST /restapi/v1/layers` checks a layer's style keys, needs no credentials to reject a bad key by name, and returned 201 with a hash for a good layer.

## Verifying on the route the code calls

- Extension code that runs a query in the browser: build the object the code builds, apply the key filter of the converter the code uses, and post it as a `table/query` action to `/Api/ProcessDirect`. Checking the object on the REST route instead can pass a camelCase key the browser drops, or reject a `select` block the browser never sends.
- A map layer: submit the layer to `/Api/CacheRequest` and fetch a tile, checking the byte count. A layer can be accepted at creation and still fail every tile, as a color ramp on a column that landed in `totals` did.
- A figure that will be shown to a user: quote it with the route and the filter set it was measured with, because a total without its `where` cannot be re-run.

## Related

- Filter value formats, blanks and date bounds: [filters.md](filters.md)
- Aggregation shapes, `totals`, and server-side top-N: [aggregation.md](aggregation.md)
- Which functions exist on which route: [expressions.md](expressions.md)
