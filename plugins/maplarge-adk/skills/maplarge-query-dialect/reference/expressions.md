# Expressions: what exists, what returns 500, and the shapes in between

This dialect's function set cannot be inferred from one failure: ternaries work while `CASE WHEN` does not, string methods work on a string column and fail on a datetime one, maths exists under `Math.` and not bare, and a null number quietly becomes zero. Every behavior below was measured on MapLarge Server 4.139 through the JSON query route that `ml.data.query.Query.fromApiRequest(q).runAsync()` calls, against the public `ml_samples/Miami_*` tables. Probe the specific expression you need, on the endpoint the code will call, before building on it.

## Dates: no date functions, but property access works

Each of these returned HTTP 500 (`year` and `Year` on three datetime columns, the others on one or two), and the capitalized spellings fail like the lowercase ones:

| Expression | Error |
| --- | --- |
| `year(col)`, `Year(col)`, `month(col)`, `datepart('year', col)`, `datediff('day', a, b)` | `method '<name>' doesn't exist` |
| `ToString(col, 'yyyy-MM')` | `no overloaded version of method 'ToString' exists for the following argument types: MapLarge.Common.MLDateTimeOffset, System.String` |
| `substring(col, 0, 7)` on a datetime | no overload for a nullable datetime and two integers |

What works is .NET property access on the column (`.Year`, `.Month`, `.Day`, `.Hour`, `.Minute`) with arithmetic on the results, which makes a real month roll-up expressible on the server:

```jsonc
{
  "table": { "name": "ml_samples/Miami_Wildfire_Locations" },
  "where": [[{ "col": "STARTDATED", "test": "Greater", "value": "1900-01-01" }]],
  "sqlselect": ["STARTDATED.Year*100+STARTDATED.Month as Period", "count(FIREID) as Fires"],
  "groupby": ["STARTDATED.Year*100+STARTDATED.Month"],
  "take": 500
}
```

The `groupby` repeats the expression: naming the alias, `"groupby": ["Period"]`, fails with `Column 'Period' is not found in any table source`. The `where` drops the rows this table stores as `0001-01-01`, which would otherwise form a period of their own.

Also measured working: `min()` and `max()` on a datetime column, and a one-argument `ToString(col)`, which renders as `07/09/2021 00:00:00 +00:00`. `.DayOfWeek` is a special case: see the time-binning section.

**`<datetime col>.ToUnixTimeSeconds()`** returns an integer epoch in seconds, on the JSON route and on the SQL endpoint alike, and both returned identical minimums and maximums on columns without `0001-01-01` values (for `Miami_Flights.timestamp`, 1748752525 to 1748822395). On a column that has them, the two endpoints disagree: for `Miami_Wildfire_Locations.CONTRDATED` the JSON route's minimum was -62135596800, the year-0001 value, and the SQL endpoint's was 320544000, the earliest real date, because the SQL endpoint leaves those rows out.

## Time binning

Property access is the simplest way to bin by time of day. On `Miami_Flights`, `timestamp.Hour*2+timestamp.Minute/30` in `groupby` produced the same 28 non-empty half-hour bins, with identical counts summing to all 6,947 rows, as integer arithmetic on the epoch:

```text
e = timestamp.ToUnixTimeSeconds()
(e - (e/86400)*86400)/1800            half-hour of the UTC day, 0 to 47
(e/86400 + 4) - ((e/86400 + 4)/7)*7   day of the week, 0 = Sunday
```

There is no modulo operator, so a modulo is written as the value minus its truncated quotient times the divisor. The day-of-week form placed every row of 2025-06-01 at 0, and that date was a Sunday. `timestamp.DayOfWeek` cannot stand in for it: in a `groupby` and in a flat `sqlselect` it failed with `GenericArguments[0], 'System.DayOfWeek' ... violates the constraint of type parameter 'T'`. To filter rather than bin, the `HourOfDay` and `DayOfWeek` filter tests exist, each accepting exactly one value per test.

## Division by a literal: never leave `column/number` bare

The parser reads `ZIPCODE/100` as a table reference. Parenthesizing it, adding an operator, or putting spaces around the slash removes the ambiguity:

| Expression | In `sqlselect` | In `groupby` |
| --- | --- | --- |
| `ZIPCODE/100` | HTTP 500 `Table alias 'ZIPCODE' is not defined in the current scope` | Accepted when the `sqlselect` beside it is written safely |
| `(ZIPCODE/100)` | Works | Works |
| `ZIPCODE/100*1` | Works | Works |
| `ZIPCODE / 100` | Works | Works |

The bare form failed in `sqlselect` for `ZIPCODE/10`, `ZIPCODE/100`, `ZIPCODE/1000` and `CD_ID/2`, and the error message names the column as if it were a table, which points away from the real cause. `orderby` is stricter than `groupby`: `((ZIPCODE/7 + 4) - ((ZIPCODE/7 + 4)/7)*7)` was accepted in `groupby` and rejected in `orderby` with `Malformed column name`, because of the unparenthesized `ZIPCODE/7` inside it. Writing every division parenthesized or spaced avoids the question of which clause rejects it. Integer division truncates: `(ZIPCODE/100)` groups `ml_samples/Miami_Busstops` into 331, 330 and 0.

## Strings: methods exist, on string columns

In a flat `sqlselect` on a string column, `col.Substring(0,3)`, `substring(col,0,3)`, `col.Length`, `col.ToUpper()` and `col.ToLower()` all work. `upper(col)`, `left(col, 4)` and `Left(col, 4)` do not exist, so `.ToUpper()` is the case normalizer.

Two failure modes, both HTTP 500:

- **`Substring` fails when any in-scope value is shorter than start plus length.** The error is `Index and length must refer to a location within the string`. A blank value triggers it (on `StopName`, `flight` and `MUNIC_NAME`, each of which has blanks), and so does a short non-blank one: `MUNIC_NAME.Substring(0,6)` over the five-character value `MIAMI`. Filter out short values first; `IsNotEmpty` handles blanks.
- **In a `groupby` or inside an aggregate, a string method fails while blank values are in scope.** `.Length`, `.Substring(0,3)` and `.ToUpper()` in `groupby`, and `sum(flight.Length == 0 ? 1 : 0)`, each returned `Object reference not set to an instance of an object`; the same methods worked in five of five trials once `IsNotEmpty` excluded the blanks. A flat `.Length` over blanks returns 0 without error, and grouping by the plain column is fine.

## Maths

`Math.Sin`, `Math.Cos`, `Math.Acos`, `Math.Asin`, `Math.Atan2`, `Math.Sqrt`, `Math.Pow`, `Math.Abs`, `Math.Floor`, `Math.Ceiling`, `Math.Round` and `Math.Truncate` exist, and the trigonometric ones take **radians**: `Math.Sin(LAT*Math.PI/180.0)` matched a client-side sine to every printed digit. `Math.PI` returns 3.141592653589793. Bare `floor(x)` and `Floor(x)` also exist.

These do not: `sin`, `cos` and `PI()` (lowercase or bare), `abs`, and `Truncate`. `round` and `Round` exist only with two arguments: `round(2.567, 1)` returns 2.6, while `round(2.5)` fails with `no overloaded version of method 'round' exists for the following argument types: System.Double`.

Rounding to an integer is banker's rounding, half to even: `Convert.ToInt32(2.5)` is 2, `Convert.ToInt32(3.5)` is 4, `Convert.ToInt32(2.7)` is 3, and `Math.Round(2.5)` is 2.

## Nulls read as zero in a grouped query unless `usenullvalues` is set

By default a null in a numeric column is returned as `0` in plain rows. Inside the expressions of a grouped query (any `groupby`, a constant one included) it is also compared as `0`. A flat aggregate with no `groupby` skipped nulls instead: `sum(track <= 30 ? 1 : 0)` returned 328 flat and 1,239 grouped. Filter tests skip nulls, so a grouped expression and a filter that look equivalent disagree. `ml_samples/Miami_Flights.track` has 911 nulls; the aggregate rows below were measured grouped:

| Query | Default | With `"usenullvalues": true` |
| --- | --- | --- |
| `sum(track <= 30 ? 1 : 0)` | 1,239 (328 real matches plus 911 nulls) | 328 |
| `sum(gs <= 5 ? 1 : 0)` | 1,497 | 1,454 |
| `sum((track >= 330 \|\| track <= 30) ? 1 : 0)` | 2,768 | 1,857 |
| The filter `track LessOR 30` | 328 | 328 |
| The rows themselves, where `track IsNull` | `track` shown as `0` | `track` shown as `null` |

A guard such as `(track > -1 && track <= 30)` does not help, because the null is already 0: it still returned 1,239. Set the flag whenever an expression compares or sums a column that can be null:

```jsonc
{
  "table": { "name": "ml_samples/Miami_Flights" },
  "usenullvalues": true,
  "sqlselect": ["sum((track >= 330 || track <= 30) ? 1 : 0) as Northbound"],
  "groupby": ["'k'"],
  "take": 1
}
```

The flag only takes effect if it reaches the server. `ml.data.query.Query.fromApiRequest(q)` does not copy `usenullvalues` from the object it is given, so a query built that way sends no flag and still returns 1,239; on the returned query, call its declared `withNull(true)` method instead. The dropped key was read from the 4.139 client bundle, not observed in a browser; the server-side effect of the flag was measured.

The same default hides the edge of a window function: `lag(gs)` on the first row of a partition is null, which comes back as 0 by default and as `null` with the flag, and `gs - lag(gs)` on that row came back as 0 rather than as the speed itself.

## Ternaries, booleans, and what the JSON route rejects

`cond ? a : b` with `||` and `&&` works in a JSON `sqlselect`, and an aggregate may sit inside a ternary or arithmetic in a grouped select (`(sum(Benches) > 50) ? 1 : 0` and `sum(Benches)*2` both worked).

`CASE WHEN ... END` and `LIKE` are rejected in a JSON `sqlselect` with `Failed to parse the following expr ... Received 'WHEN'` (or `'LIKE'`). The SQL endpoint is the reverse: it rejects the ternary at the `?` and accepts `CASE WHEN` and `LIKE`. Write the JSON form for code that runs through the JSON route, and for a pattern match there use the `Like` (case-sensitive) or `ILike` filter test in `where`.

## Blank strings inside expressions

`col == ''` evaluates false for every row and `col != ''` true for every row. On `Miami_Flights.flight`, which has 92 blanks, `sum(flight == '' ? 1 : 0)` returned 0, with or without `usenullvalues`; the same held on `MUNIC_NAME` (15 blanks) and `StopName` (4). Comparisons with a non-empty literal work: `sum(MUNIC_NAME == 'MIAMI' ? 1 : 0)` returned 1,258. To test for blank inside an expression use `String.IsNullOrEmpty(col)`, which returned exactly 92, 15 and 4; to count or exclude blanks with a filter, use `IsEmpty` or `IsNotEmpty`. On a datetime column, `col != ''` is likewise true for every row, so it cannot find a missing date either.

## Geometry functions

- **`GeoDistance(XY, 'POINT(<lon> <lat>)')` returns meters** and takes WKT in longitude-latitude order. For ten bus stops between 3 and 41 km from two reference points it agreed with a haversine distance on a 6,371,008.8 m sphere to within 1.1e-4 of the value (0.35 m at 3.3 km). With latitude and longitude swapped it returned about 13,100 km, not an error.
- **`GeoDistance` of an empty geometry returns 0.** `lag(XY) over (partition by hex order by timestamp)` is empty on each aircraft's first row, and the distance from it was 0 on the first row of both aircraft measured, which cannot be told apart from a real zero-length step in the same column.
- **`Length(line)` returns kilometers**, matching a haversine sum over the line's vertices to the centimeter on three `Miami_Streets` rows, and `CountPoints(line)` returns the vertex count. The stored `Shape__Length` column on the same table is about 1.11 times `Length()`, the ratio being 1/cos(latitude): it is a projected length, not ground distance, despite the name.

## Window functions

`lag`, `lead` and aggregate-over-partition work in a JSON `sqlselect`:

```jsonc
{
  "table": { "query": {
    "table": { "name": "ml_samples/Miami_Flights" },
    "where": [[{ "col": "hex", "test": "Equal", "value": "a7421a" }]],
    "sqlselect": ["hex", "timestamp", "gs",
                  "gs - lag(gs) over (partition by hex order by timestamp) as SpeedChange",
                  "max(gs) over (partition by hex) as TopSpeed"] } },
  "orderby": ["timestamp.asc"],
  "take": 20
}
```

The lagged position on each row equaled the previous row's position, and `max(gs) over (partition by hex)` equaled a grouped `max(gs)` for the same aircraft. Arithmetic on a window function, and a window function nested inside another function call such as `GeoDistance(lag(XY) over (partition by hex order by timestamp), 'POINT(-80.19 25.77)')`, `Math.Abs(lag(gs) over (...))` or `Math.Floor(lead(track) over (...))`, all worked with correct values. So per-row deltas along a track (speed or heading change between readings, gap detection, distance from the previous fix) are computable on the server in one level. Add an outer `orderby` on a real column when row order matters, as the example does; the first row of each aircraft reads 0 for the lagged terms, as the null section explains.

## Aliases

- **An alias is not visible within the same `sqlselect`.** `"gs*2 as g2", "g2+1 as g3"` fails with `Column 'g2' is not found in any table source`, including when the alias is an aggregate. Repeat the expression.
- **An alias projected by an inner query is visible to the outer query's `where` and `orderby`.** With an inner `sqlselect` of `"(ZIPCODE/100) as z"` and `"Benches+Shelters as amen"`, an outer `where` of `z Equal 331` returned 4,482, the same as `ZIPCODE Between "33100/33199"`, and an outer `orderby: ["amen.desc"]` sorted numerically. This nesting is the general mechanism for filtering or sorting on a computed value.
- **A raw expression as `where.col` fails:** `"(ZIPCODE/100)"` and `"Benches+Shelters"` return `Column '<expr>' is not found in any table source`, and `"timestamp.Hour"` returns `error parsing JSON request!`, which reads like malformed JSON and is not.

## A string column that holds numbers is compared as text

`ml_samples/Miami_Flights.alt_baro` is a String column holding numbers, the word `ground` (2,145 rows) and blanks (5 rows). Ordering and `min`/`max` on it are lexical: `max(alt_baro)` returns `ground`, and among the numeric values the largest by text is `9975` although 4,038 rows are numerically higher, up to 35025. The comparison tests refuse the column outright: `Greater` and `Between` on it fail with `Test 'Greater' is invalid for column type String`. Check a column's type before ranking or thresholding it.

## Related

- Aggregation shapes, `groupby` rules, `totals` and server-side top-N: [aggregation.md](aggregation.md)
- Filter tests and their value formats, including blanks, case handling and dates: [filters.md](filters.md)
- Why an expression confirmed on the SQL endpoint proves nothing about the JSON route: [endpoint-parity.md](endpoint-parity.md)
