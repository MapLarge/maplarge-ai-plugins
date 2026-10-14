---
name: maplarge-query-dialect
description: Runtime behavior of the MapLarge query dialect when a query returns 200 and is still wrong, or fails with a 500 naming an alias, a method or an unknown attribute. Covers filter-test separators and nesting, aggregation shapes that put a value in totals instead of the data, take defaults, ordering by an aggregate, which expressions and functions exist, and where the JSON, SQL and REST endpoints disagree. Use when a query returns no rows or too many, an aggregate column is missing from the response, a GROUP BY looks un-aggregated, an orderby fails, a date or string function returns HTTP 500, a count of distinct values is rejected, or a filter matches everything. Triggers on "query returns nothing", "no rows returned", "query 500", "sqlselect", "groupby", "count distinct", "CountDistinct", "median", "Between", "EqualAny", "aggregate missing", "orderby", "top N", "date function", "window function", "totals", "Unknown JSON attribute".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "ARC-76"
  verified-against: "MapLarge Server 4.139 (docs host): 74 filter and expression behaviors and 52 aggregation, endpoint-parity and skill-body behaviors re-run live on the JSON query route (/Api/ProcessDirect table/query, built as Query.fromApiRequest(q).runAsync() sends it), the SQL endpoint and the REST query and validation routes against ml_samples/Miami_* tables, plus flat-versus-grouped null handling re-confirmed in 3 trials each on the JSON route and the SQL endpoint, 2026-09-29 (ARC-76)"
---

# MapLarge Query Dialect

This skill covers what the MapLarge query dialect does at runtime: filter-test semantics, the aggregation shapes that work and the ones that fail, which expressions exist, and the measured differences between the routes that evaluate a query. It does not cover which query form to prefer for a task (JSON, fluent or SQL), which belongs to `adk-query-dev`; the layer wrapper a query sits inside and why a map draws nothing, which belongs to `adk-map-layers`; or table and column discovery, which belongs to `adk-data-dev`. The material exists because many of this dialect's mistakes return HTTP 200: an aggregate that lands in the response's `totals` instead of the data, a key the client wrapper drops before sending, a result silently capped at 100 rows, and nothing in the response says so.

## When to use

Reach for this skill when any of these is true:

- A query returns 200 and zero rows, or far more rows than the filter should allow.
- An aggregate named in `sqlselect` is absent from the returned data columns, or the data is empty while `totals` holds the value.
- A `groupby` returns one row per input row, or a count of 1 per group.
- An `orderby` fails with `MLE0011:Column '<alias>' is not found in any table source` or `Malformed column name`.
- A function call fails with `MLE0010: ... method '<name>' doesn't exist` or `MLE0015: ... no overloaded version of method`.
- A response error lists `Unknown JSON attribute in ...`.
- The same query behaves differently through extension code, the REST API, the SQL endpoint or the command line.
- A result verified on one route is about to be relied on in code that calls another.

## Task routing

Read the matching reference before writing the query, not after it returns something unexpected:

| Task / keywords | Reference doc |
| --- | --- |
| Read before writing any `where`: a filter matching nothing, everything, or the wrong range; `Between`, `EqualAny`, `EqualNot`, blanks and `IsEmpty`, case sensitivity, `Like`, OR versus AND, date bounds and zones, hour-of-day and day-of-week tests, spatial and drawn-shape filters, filtering by a long id list | `reference/filters.md` |
| Read before writing a `groupby`, a join, a top-N, a distinct count or a percentile: `sqlselect`, a missing aggregate column, zero data rows, `totals`, ordering by an aggregate, `take` on an aggregate, counts and averages over nullable columns | `reference/aggregation.md` |
| Read before using a function or operator inside `sqlselect`, `groupby` or `orderby`: dates, strings, math, ternaries, `CASE WHEN` and `LIKE`, nulls read as zero (`usenullvalues`), window functions, integer binning, computed aliases, string columns holding numbers | `reference/expressions.md` |
| Read before confirming a query on a route other than the one the code calls, or when JSON, SQL, REST and command-line results disagree | `reference/endpoint-parity.md` |

## Mental model

Seven facts govern most of this dialect's surprises.

1. **Extension code does not send the object it writes.** Both client converters, `ml.data.query.Query.fromApiRequest(q)` and `ml.data.query.getQueryFromJSON(q)`, rebuild the query from lowercase keys before `.runAsync()` posts it to `/Api/ProcessDirect` as a `table/query` action with its keys sorted. Neither copies `select` or a camelCase spelling such as `sqlSelect` or `groupBy`, so those are dropped with no error. The two also differ: `getQueryFromJSON` keeps `withgeo` and `usenullvalues`, while `fromApiRequest` drops both. This was read from the 4.139 client bundle; the server-side consequences were measured.
2. **A 200 is not validation.** A `select: { columns }` block is a loud `Unknown JSON attribute` 500 on `/Api/ProcessDirect`, yet on the REST query route the same block makes the parser silently skip every key written after it. A key the client converter does not read returns 200 as if it had never been written, and an aggregate in the wrong shape returns 200 with its column missing. Check the returned column list, the row count and `totals.Records` against what the shape should produce.
3. **Aliases are second-class.** An alias declared in `sqlselect` is not visible to `groupby`, to a flat `orderby`, or to other expressions in the same `sqlselect`; each of those was measured as an HTTP 500 naming the alias. Repeat the expression instead. An alias projected by an inner query is visible to an outer query's `where` and `orderby`, which is the general mechanism for a computed filter and for a server-side top-N.
4. **Some aggregates land in `totals`, not in the data.** Without a `groupby`, a bare `count()`, `median`, `stddev`, `variance`, `mode`, and any aggregate over an already-grouped inner query put their value only in `totals`. Selected alone, they return zero data rows. Selected beside other aggregates, their column is simply missing from the data. A constant group, `groupby: ["'k'"]` with `"'k' as k"` selected, turns each of them into one data row.
5. **`take` defaults to 100 and only the outer one counts.** A query with no `take` returns 100 rows, or 100 groups, while `totals.Records` reports the full count; the SQL endpoint caps the same way. A `take` inside a nested query is ignored. A `take` below 1 is unbounded, so `take: 0` on an aggregate returns every group.
6. **There is no single dialect.** The JSON route, the SQL endpoint and the REST query routes do not share a parser or a client, and `reference/endpoint-parity.md` lists twelve behaviors where they were measured disagreeing. Confirm on the route the code will call, and compare routes only with queries of the same shape: a flat aggregate and a grouped one handle nulls and blanks differently on every route, which is easy to mistake for a route difference.
7. **Column names are not column semantics.** Measured on the sample tables: `Miami_Flights.alt_baro` is a string column in which 2,145 rows hold `ground`, so ordering it descending returns `ground` before any altitude; `Miami_Busstops.CreateDate` puts 5,424 of 5,595 stops on one day, a load date rather than a creation date; and `Miami_Wildfire_Locations.CONTRDATED` holds the year-0001 "no value" sentinel on 458 of 693 rows. Check a column's distribution before building a figure on it.

## Universal rules

- **Project with `sqlselect`, never with `select: { columns: [...] }`.** On `/Api/ProcessDirect` that form is an HTTP 500; on the REST query route and the command line it returns 200 and silently discards every key written after it, including `where` and `take`; and both client converters drop it before sending. It trimmed no columns on any route.
- **Write `groupby` as a top-level array of lowercase strings that repeats the expression.** An alias in `groupby` is an HTTP 500, and so is `groupby: { groupFields: [...] }` once it reaches the server; `groupbyfields` and camelCase `groupBy` are dropped by both client converters, which returns un-aggregated rows with no error.
- **Use the separator each test expects.** `Between` takes a slash-delimited string, `"1/3"`, and a comma there is an HTTP 500. `EqualAny` takes a comma-separated list, and a slash there matches nothing. These tests usually sit next to each other, which is why the mix-up is common.
- **Count with `count(<column>)` on a column that is never empty.** A bare `count()` without an explicit `groupby` lands in `totals` in every shape measured, while `count(<column>)` stays a data column in flat, nested and join aggregates. Whether it counts null or blank values depends on the query shape: a grouped count included them and a flat one without `groupby` skipped them, on both routes. So point it at a key that is never empty, such as `StopID`.
- **Order by an aggregate in an outer query.** A flat `orderby` on an aggregate alias is an HTTP 500; nesting the aggregate and ordering in the outer query sorts numerically and gives a real server-side top-N.
- **Prefer a server-side shape over a client-side loop once the shape is verified**, so the server aggregates the whole table and only the result rows travel. This dialect supports window functions, spatial joins, distinct counts, medians and paged percentiles, and rejects several things that look ordinary, so verify each shape on the route the code calls.

## Examples

**"Show the five municipalities with the most bus stops from `ml_samples/Miami_Busstops`."** The flat roll-up aggregates correctly (35 groups, including a blank-name group of 15 stops), but adding `orderby: ["Stops.desc"]` to it fails with `MLE0011:Column 'Stops' is not found in any table source`. Nest the aggregate and order in the outer query:

```jsonc
{
  "table": { "query": {
    "table": "ml_samples/Miami_Busstops",
    "sqlselect": ["MUNIC_NAME", "count(StopID) as Stops", "sum(Shelters) as Shelters"],
    "groupby": ["MUNIC_NAME"],
    "take": 0 } },
  "orderby": ["Stops.desc"],
  "take": 5
}
```

This returned UNINCORPORATED MIAMI-DADE 2,303, MIAMI 1,258, MIAMI GARDENS 394, HIALEAH 300 and MIAMI BEACH 180, with `totals.Records` reporting all 35 groups. `count(StopID)` rather than a bare `count()` keeps the count a data column in every shape.

**"Give me a monthly trend of wildfire starts from `ml_samples/Miami_Wildfire_Locations`," and `year(STARTDATED)` fails with `method 'year' doesn't exist`.** There are no date functions, but .NET property access on the column works, and `groupby` repeats the expression because `groupby: ["Period"]` fails with `Column 'Period' is not found`:

```jsonc
{
  "table": "ml_samples/Miami_Wildfire_Locations",
  "sqlselect": ["STARTDATED.Year*100+STARTDATED.Month as Period", "count(FIREID) as Fires"],
  "where": [[{ "col": "STARTDATED", "test": "Greater", "value": "1900-01-01" }]],
  "groupby": ["STARTDATED.Year*100+STARTDATED.Month"],
  "take": 0
}
```

This returned 268 months summing to 675 fires. Without the `where`, a 269th bucket, `Period` 101, holds the 18 fires whose start date is the year-0001 sentinel. The rows came back in no particular order, so sort them in the caller before charting.

**"Count the flights on 1 June 2025 in `ml_samples/Miami_Flights`," and the count is plausible but wrong.** A bare date is parsed as midnight. Every one of the table's 6,947 rows is on 2025-06-01 UTC, yet `Between "2025-06-01/2025-06-01"` returns 0 and `Between "2025-05-31/2025-06-01"` also returns 0, while `"2025-06-01/2025-06-02"` returns all 6,947 under a two-day label. The error runs the other way on a column stamped at midnight: on `Miami_Busstops.CreateDate`, `"2021-07-09/2021-07-09"` returns that whole day (5,424) and `"2024-02-13/2024-02-14"` returns both days (38). Emit explicit instants and state the zone, so the meaning does not depend on how the column was loaded:

```jsonc
{ "col": "timestamp", "test": "Between", "value": "2025-06-01T00:00:00Z/2025-06-01T23:59:59Z" }
```

## Hand-offs

- Choosing between JSON, fluent and SQL query forms for a task: use `adk-query-dev`.
- Wrapping a query in a map layer, and why a layer draws nothing: use `adk-map-layers`.
- Table and column discovery, schemas and sample data: use `adk-data-dev`.
- Charts consuming these results: use `echarts`.
