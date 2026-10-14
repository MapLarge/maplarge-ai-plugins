# Aggregation: the shapes that work, and the ways one fails

Every figure below was measured on the JSON query route that extension code uses (`.runAsync()` on a query built by `Query.fromApiRequest` or `getQueryFromJSON`, which posts a `table/query` action to `/Api/ProcessDirect`) against the public `ml_samples/Miami_*` tables, on three distinct requests per behavior unless a probe count is given. An aggregation goes wrong in four recurring ways: a value lands in `totals` instead of the data, the rows come back un-aggregated, the result is capped at 100 groups without saying so, or an alias is used where the parser cannot see it. Only the last is reliably loud. After every change to an aggregation, check the returned column list, the row count and `totals.Records` against what the shape should produce.

## The flat shape

```jsonc
{
  "table": "ml_samples/Miami_Busstops",
  "sqlselect": ["MUNIC_NAME", "count(StopID) as Stops", "sum(Benches) as BenchTotal"],
  "groupby": ["MUNIC_NAME"],
  "take": 100
}
```

This returns 35 groups whose `Stops` sum to all 5,595 stops, including a blank-name group of 15 stops and near-duplicate spellings such as `North Miami Beach` beside `NORTH MIAMI BEACH`, which is the data rather than the query.

## Writing the `groupby` key

| Form | Result |
| --- | --- |
| `groupby: ["MUNIC_NAME"]` | Aggregates: 35 rows |
| `groupby: ["Math.Floor(ZIPCODE/10.0)"]`, the expression repeated from `sqlselect` | Aggregates: 13 rows |
| `groupby: ["z"]`, the alias of that expression | HTTP 500, `MLE0011:Column 'z' is not found in any table source` |
| `groupby: { groupFields: ["MUNIC_NAME"] }` | HTTP 500, `Unknown JSON attribute in query-query clause: groupfields`, when it reaches the server (through `Query.fromApiRequest` or sent directly). `getQueryFromJSON` drops a `groupby` that is not an array, so through it the query runs un-aggregated |
| `groupbyfields: ["MUNIC_NAME"]` | Through either client converter: dropped before sending, so 200 with one row per stop up to `take`, each carrying the whole-table count 5,595 in `n`. Sent directly: HTTP 500 naming the attribute |
| `groupBy: ["MUNIC_NAME"]` (camelCase) | Through either client converter: dropped before sending, un-aggregated rows. Sent directly or through REST: aggregates |

So a grouping that appears not to group in extension code is usually a key the client converter did not copy; both keep only a lowercase `groupby` array.

## `take` on an aggregate

- With no `take`, an aggregate returns the first 100 groups: grouping the bus stops by `MainSt` returned 100 rows while `totals.Records` reported 522.
- `take: 0` returns every group (522), and any `take` below 1 is unbounded, as it is for a plain query. Bound it by reasoning about the group count, not by asserting that `take` is positive.
- Only the outermost `take` counts. An inner `take: 10000` with no outer `take` returned 100 rows; inner 5 with outer 50 returned 50; inner 500 with outer 7 returned 7.

## Where a value lands: the data or `totals`

The response carries a `totals` object beside the data. Without a `groupby`, most aggregates are broadcast: the scalar appears in the data on every one of `take` rows and in `totals`. Several put the value only in `totals`, and when nothing else is selected the data comes back with zero rows and no error:

| Aggregate, no `groupby` | Flat | Over a nested plain query | Over a nested grouped query |
| --- | --- | --- | --- |
| `count(<column>)`, `sum`, `max`, `CountDistinct` | Data, broadcast | Data, broadcast | `totals` only (measured for `count`, `sum` and `max`) |
| Bare `count()` | `totals` only | `totals` only | `totals` only |
| `median`, `stddev`, `variance`, `mode` | `totals` only | `totals` only | not measured |

Mixed selections split: `["sum(TOTALACRES) as s", "median(TOTALACRES) as m", "stddev(TOTALACRES) as sd"]` on `Miami_Wildfire_Locations` returned a data column `s` only, with `m` and `sd` present in `totals` alone. `totals.Records` reports the number of rows that were aggregated (693 for the wildfire table, 1,258 for the MIAMI bus stops, 35 over the grouped municipalities), not 1.

**The join-aggregate case is the same rule.** An `Overlap` join from `Miami_Census_Block_Group_2020` to `Miami_Busstops.XY` with `"Count() as stops"` and no explicit `groupby` returned `GEOID` and the other aggregates but no `stops` column; `totals.stops` held 1,384, which is the number of block groups, not the 5,578 stops the join assigned. Renaming the alias moved the new name into `totals`, and the lowercase `count()` behaved the same. `count(StopID)` returned a proper per-group column summing to 5,578. A bare `count()` with an explicit `groupby` on a flat query is fine: grouped by municipality it summed to 5,595.

**Referencing a missing column does not error.** An outer query selecting `stops` over the folded join-aggregate returned 200 with `GEOID` only. On the render path, a dynamic color ramp keyed on the folded column was accepted at layer creation and then failed every tile with `Could not get column stats for stops`; the same layer with `count(StopID)` drew. The only check that catches this before a map does is asserting the column's presence in the returned column list.

**The fix is a grouping, which also fixes the display.** Any real `groupby` returns the statistics as data columns; grouping the wildfires by `CAUSE` returned `median`, `stddev`, `variance` and `mode` per cause. For a single overall figure use a constant group:

```jsonc
{
  "table": "ml_samples/Miami_Wildfire_Locations",
  "sqlselect": ["'k' as k", "median(TOTALACRES) as m", "stddev(TOTALACRES) as sd"],
  "groupby": ["'k'"],
  "take": 1
}
```

This returned one row, `m` 5 and `sd` 4,852.99, and the same pattern turned a bare `count()` and an aggregate over a grouped inner query into one data row each. After the fix `totals` is `{Records: 1}`, so code that prefers `totals` whenever it is non-empty starts reporting the wrong thing; read the row, and use `totals` only for `Records`.

## Aggregates over a column with nulls

`Miami_Flights.track` holds 911 nulls in 6,947 rows. What an aggregate does with them depends on the query's shape more than on the aggregate. On the JSON route:

| Aggregate | Grouped (any `groupby`, a constant one included) | Grouped, with `"usenullvalues": true` | Flat (no `groupby`) |
| --- | --- | --- | --- |
| `count(track)` | 6,947: the null rows are counted | 6,947 | 6,036: the null rows are skipped |
| `avg(track)` | 198.63, which is `sum(track)` over all 6,947 rows | 198.63 | 198.63 |
| `sum(track <= 30 ? 1 : 0)` | 1,239: each null reads as 0 and passes the test | 328 | 328 |

The SQL endpoint follows the same shape rule for `count`: `SELECT COUNT(track)` returned 6,947 alone and 6,036 with a constant column selected beside it. It leaves nulls out of a grouped `CASE WHEN` sum (328), which is a real difference from the JSON route. So:

- count a column that is never empty, and the question does not arise;
- an average divides by rows that hold no value, in every shape measured;
- a grouped expression needs the flag to leave nulls out.

`ml.data.query.getQueryFromJSON` forwards `usenullvalues`, but `Query.fromApiRequest` drops it, so with that converter the flag has to be set on the returned query object (its `withNull(true)` method, read from the client bundle rather than observed in a browser).

## Ordering by an aggregate: nest it

A flat `orderby` on an aggregate alias is an HTTP 500 naming the alias, `MLE0011:Column 'n' is not found in any table source`, for `count`, `sum`, `max` and `CountDistinct` aliases alike. It was never silently ignored on this route. Nest the aggregate and order in the outer query, which is also a true server-side top-N:

```jsonc
{
  "table": { "query": {
    "table": "ml_samples/Miami_Busstops",
    "sqlselect": ["MUNIC_NAME", "count(StopID) as n"],
    "groupby": ["MUNIC_NAME"],
    "take": 0 } },
  "orderby": ["n.desc"],
  "take": 5
}
```

This returned 2,303, 1,258, 394, 300, 180, with `totals.Records` 35 beside the five rows. The ascending form returned 1, 1, 3, 4, 6, 7, 8, 9, 10, 11, 11, 12, which is numeric; a lexical sort would put 10 and 11 before 3. The inner `take` makes no difference here (omitted, 5 and 0 gave identical results); the outer one is the only bound.

**Ordering by a raw `groupby` expression depends on the expression.** `orderby: ["Math.Floor(ZIPCODE/10.0).desc"]` and `orderby: ["((ZIPCODE + 4) - ((ZIPCODE + 4)/7)*7).desc"]` both sorted. `((ZIPCODE/7 + 4) - ((ZIPCODE/7 + 4)/7)*7)` was accepted in `groupby` and was an HTTP 500 in `orderby`, `Malformed column name`, apparently because of the unparenthesized `column/integer` division. Ordering by the alias of a grouped expression is always a 500. Nesting and ordering on the inner alias avoids all of these.

**Do not rely on the default order.** Grouped by a plain column (`ZIPCODE`, `MUNIC_NAME`) the rows came back sorted, but grouped by an expression they did not: `Math.Floor(Benches/2.0)` returned 0, 1, 2, 4, 3, 6, and a month roll-up returned 199106, 199608, 198012. A chart fed from such a result silently starts mid-range, so sort the returned group rows in the caller or order in an outer query.

`orderby` on a real numeric column is numeric: `TOTALACRES.desc` returned 98,800, 43,700, 39,465, and `StopID.asc` returned 1, 2, 4, 5.

## Joins

- **`method: "Overlap"` is a point-in-polygon join** that needs no key. Joining the 1,843 block groups to the 5,595 bus stops assigned 5,578 stops by location.
- **Only base rows with at least one match come back.** That join returned 1,384 of the 1,843 block groups, so a choropleth built from it has no row, rather than a zero, for an empty polygon.
- **`join.table` accepts a nested query, and the nested query needs `withgeo: true`.** Without it the join fails with `MLE0006:Column 'XY' is not found in the table with alias '...'`; with it, a join to the MIAMI stops only returned 299 block groups whose counts sum to exactly 1,258, and the base polygons came back in `allGeo`.
- **A join can target a derived aggregate.** `Miami_Primary_Evacuation_Routes` joined by `Overlap` to a nested query of block groups already joined to bus stops returned 147 of the 152 routes, each with its LINESTRING and `sum(stops)` over the block groups it crosses. That is how a line can be shaded by an aggregate over a table it never touches.
- **An `Equals` join works against a nested aggregate**: bus stops `ZIPCODE` joined to street segments grouped by `LZIP` returned 5,579 rows. **It cannot reference a column computed in the same `sqlselect`**: the same join with `leftcolumn` set to `"Z"` from `"ZIPCODE*1 as Z"` failed with `MLE0006:Column 'Z' is not found`.
- **An explicit `groupby` on a join-aggregate returns garbage.** Adding `groupby: ["GEOID"]` to the block-group join made `count(StopID)` equal 1 in every one of the 1,384 rows, no error. The implicit per-base-row grouping is the only shape that aggregated correctly; for per-class counts, run one query per class.
- **A `where` cannot compare two columns**, because its `value` is a literal: `{ "col": "Benches", "test": "Greater", "value": "Shelters" }` failed with `Where value 'Shelters' on column Benches is not numeric`, and a raw expression as `col` failed with `Column 'Benches - Shelters' is not found`. Project the comparison in an inner query and filter on its alias in the outer one: `"Benches - Shelters as d"` inside, `{ "col": "d", "test": "Greater", "value": 0 }` outside returned 2,117 stops, matching a client-side count.

## Counting distinct values

`count(distinct col)` fails inside a JSON `sqlselect` with `Failed to parse the following expr: 'count*distinct ZIPCODE*'`, and the same spelling runs on the SQL endpoint. **`CountDistinct(col)`, one word, works on the JSON route, and so does `countdistinct(col)`.** Flat, it returned 34 municipality names and 80 ZIP codes, identical to the SQL endpoint's `count(distinct ...)`; grouped by municipality, the per-group ZIP counts matched the SQL endpoint on every named group. Whether it counts the blank string depends on the shape, like `count` above. There are 35 `MUNIC_NAME` groups including the blank one. A flat `CountDistinct(MUNIC_NAME)` returned 34, the same as the SQL endpoint, and with a constant `groupby` it returned 35. A picker's option list with per-value counts is therefore one flat grouped query with no nesting.

## Statistics and percentiles

`median`, `stddev`, `variance` and `mode` exist. `stddev` and `variance` are population statistics: on `TOTALACRES` the server's 4,852.99 matched the population standard deviation, not the sample one (4,856.50). They land in `totals` unless grouped, as described above.

No usable percentile aggregate was found. `percentile` and `Percentile` are names the server knows, but every argument shape tried (a column with an integer, a decimal or a string percent, either argument order) failed with `MLE0015 ... no overloaded version of method`; `PercentileCont`, `percentile_cont`, `Quantile`, `approx_percentile`, `ApproxPercentile`, `quartile` and `ntile` fail with `MLE0010 ... doesn't exist`.

An arbitrary percentile is still available server-side by paging into a sorted query with `start`:

```jsonc
{
  "table": { "query": {
    "table": "ml_samples/Miami_Busstops",
    "sqlselect": ["MUNIC_NAME", "count(StopID) as n"],
    "groupby": ["MUNIC_NAME"],
    "take": 0 } },
  "sqlselect": ["MUNIC_NAME", "n"],
  "orderby": ["n.asc"],
  "start": 17,
  "take": 1
}
```

`start` is `floor(p/100*N)`, and `totals.Records` gives N (35) beside the single row. This returned the median municipality, 41 stops, and matched a client-side sort at seven probes from p0 to p100; the flat form on `Miami_Wildfire_Locations.TOTALACRES` matched at five probes, each in under 40 ms.

## Related

- Filter separators, nesting, blanks and date bounds: [filters.md](filters.md)
- Which functions and operators exist inside these expressions, and how a null reads inside one: [expressions.md](expressions.md)
- Why a result from the SQL endpoint, the REST routes or the command line is not evidence about extension code: [endpoint-parity.md](endpoint-parity.md)
