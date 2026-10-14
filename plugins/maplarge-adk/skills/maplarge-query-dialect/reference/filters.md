# Filters: separators, nesting, and the tests that match more than you think

Every behavior below was measured on MapLarge Server 4.139 through the JSON query route that `ml.data.query.Query.fromApiRequest(q).runAsync()` calls (the classic `table/query` action), against the public `ml_samples/Miami_*` tables, and each figure quoted is a real count from that server. The recurring theme: a filter value in the wrong form is usually an HTTP 500 that names the problem, but a filter in a valid form that means something other than intended returns HTTP 200 with a plausible count, and nothing in the response says so.

## Nesting: outer array is OR, inner array is AND

```jsonc
"where": [[A, B]]      // A AND B
"where": [[A], [B]]    // A OR B
```

On `ml_samples/Miami_Busstops`, `MUNIC_NAME Equal "MIAMI"` matches 1,258 rows and `Equal "HIALEAH"` matches 300. As two groups they return 1,558; as one group they return 0, because no row has both values. The second shape reads as a broken filter rather than a wrong one. A condition that has to hold in every branch, such as a date window, must be repeated inside each inner array, because a group of its own is ORed with the others rather than applied to them.

## Separator per test: they are not interchangeable

| Test | Value form that works | Wrong forms |
| --- | --- | --- |
| `Between` | A slash-delimited string: `{ "col": "ZIPCODE", "test": "Between", "value": "33100/33150" }` returns 2,153, the same as `GreaterOR 33100` AND `LessOR 33150`. Inclusive at both ends: `"33181/33181"` returns 51, the same as `Equal 33181`. Negative bounds work: `LON Between "-80.3/-80.2"` returns 2,330, the same as the `GreaterOR`/`LessOR` pair. | A comma, `"33100,33150"`, is HTTP 500 `Fatal error in Filter.ValidateAsync: : Index was outside the bounds of the array.` A numeric array `[33100, 33150]` or a string array `["33150", "33170"]` fails with the same 500. |
| `EqualAny` | A comma-separated list: `"MIAMI,HIALEAH"` returns 1,558. Works on an integer column too: `ZIPCODE EqualAny "33181,33179"` returns 163. | A slash, `"MIAMI/HIALEAH"`, is treated as one literal value and returns 0 rows, no error. A space after the comma is kept as part of the next value: `"MIAMI, HIALEAH"` returns 1,258, which is MIAMI alone. |

These two tests usually sit a few lines apart in the same filter builder, which is why swapping their separators is a common mistake. Build `EqualAny` values with `join(",")` and no space.

## Blank values

- **`{ "test": "EqualNot", "value": "" }` matches every row.** It does not exclude blanks: on `Miami_Busstops.MUNIC_NAME`, which has 15 blank values, it returns all 5,595 rows.
- **Use `IsEmpty` and `IsNotEmpty` for blanks.** They return 15 and 5,580 on `MUNIC_NAME`, 92 and 6,855 on `Miami_Flights.flight`, and 4 and 5,591 on `Miami_Busstops.StopName`, each pair summing to the table's row count. `Equal ""` counts blanks as well.
- A numeric null is a different case: filter tests skip it, while an expression in the `sqlselect` of a grouped query reads it as 0 unless the query sets `"usenullvalues": true`.

## Case sensitivity differs per test

| Test | Case handling | Measured on `Miami_Busstops` |
| --- | --- | --- |
| `Equal` | Case-sensitive | `MUNIC_NAME Equal "NORTH MIAMI BEACH"` 86, `"North Miami Beach"` 1, `"north miami beach"` 0 |
| `IEqual`, `IEqualNot` | Case-insensitive | `IEqual "north miami beach"` 87 (both spellings), `IEqual "miami"` 1,258, `IEqualNot "north miami beach"` 5,508 |
| `Contains` | Case-insensitive | `StopName Contains "ave"`, `"Ave"` and `"AVE"` all return 88 |
| `Like` | Case-sensitive, SQL `%` wildcards | `StopName Like "%AVE%"` 46, `"%Ave%"` 41 |
| `ILike` | Case-insensitive, SQL `%` wildcards | `StopName ILike "%ave%"` 88 |
| A join with `"method": "Equals"` | Case-sensitive | Joining `MUNIC_NAME` to a one-row nested query carrying `"North Miami Beach"` matched 1 row, and `"NORTH MIAMI BEACH"` matched 86 |

`IEqual`, `IEqualNot`, `Like` and `ILike` appear in the server's OpenAPI `TestSymbol` enum but not in its `MLQueryTests` enum, so a type list generated from the latter will not offer them; they work on the JSON route regardless. A data column that mixes spellings, as `MUNIC_NAME` does, makes `Equal` silently undercount.

## Test names are checked on the server

An unknown or misspelled test is an HTTP 500 that names it: `NotARealTest`, `Equals` and the lowercase `equal` each returned `Test '<name>' is invalid for column type String`, and `Betwen` on an integer column returned `Unsupported test 'Betwen'`. Test names are case-sensitive PascalCase. The failure is loud, which makes a misspelled test quick to find once the status code is read rather than only the row count.

## Dates

### A bare date is an instant at midnight

The effect of a date-only `Between` depends on whether the column carries times of day:

| Column | `"D/D"` | `"D/D+1"` | Explicit instants |
| --- | --- | --- | --- |
| `Miami_Flights.timestamp`, times of day across one UTC day, 04:35:25 to 23:59:55 | `"2025-06-01/2025-06-01"` returns 0: an empty instant | `"2025-06-01/2025-06-02"` returns 6,947: the whole day under a two-day label | `"2025-06-01T00:00:00Z/2025-06-01T23:59:59Z"` returns 6,947 |
| `Miami_Busstops.CreateDate`, every value stamped 00:00:00 | `"2021-07-09/2021-07-09"` returns 5,424: the whole day | `"2024-02-13/2024-02-14"` returns 38: all 34 rows of the 13th and all 4 of the 14th | |

So the same filter string is empty on one column and a full day on the other, and on a midnight-stamped column the upper day is included. Emit explicit instants, `"<date>T00:00:00Z/<date>T23:59:59Z"`, so the meaning does not depend on how the column was loaded.

### State the zone

An instant without an offset was read as UTC on the measured server: `"2025-06-01T05:00:00/2025-06-01T05:59:59"` and the same window with `Z` both returned 707. An offset changes which rows fall inside the same wall-clock day: `"2025-06-01T00:00:00+05:00/2025-06-01T23:59:59+05:00"` returned 5,447 and `-10:00` returned 5,497, against 6,947 at `Z`. Write the zone into every instant rather than relying on the server's default.

Do not check a JSON date filter by rewriting it in SQL. On the SQL endpoint, `WHERE timestamp > '2025-06-01'` returned 0 rows, silently, where the JSON `Greater "2025-06-01"` returned 6,947; the same happened on two other datetime columns and with a fully zoned instant. A zero from the SQL rewrite says nothing about the JSON filter.

### Datetime columns and the empty string

| Filter on a datetime column | Result |
| --- | --- |
| `EqualNot ""` | HTTP 500 `Invalid DateTime literal: '<col>', test: 'EqualNot', value:''. Can't parse value as a valid DateTime.` |
| `Equal ""` | HTTP 200, and it matches exactly the rows holding `0001-01-01`: 458 on `Miami_Wildfire_Locations.CONTRDATED`, 18 on `STARTDATED`, and 0 on `Miami_Busstops.CreateDate`, which has none |

Some tables store a missing date as `0001-01-01T00:00:00`, as both `Miami_Wildfire_Locations` date columns do. Exclude those rows with a `Greater` test against an early date: `CONTRDATED Greater "1900-01-01"` returned 235, identical at bounds of 1900, 1950 and 1970 because the earliest real date is in 1980, and `LessOR "1900-01-01"` returned the other 458. Check the column's earliest real value before choosing the bound.

### Rendering depends on the path

The JSON query route returns ISO 8601 in UTC with seven fractional digits: `1991-06-05T00:00:00.0000000+00:00`. The REST query and SQL routes return the same UTC form. The command-line `maplarge query exec` converts the value to the local time zone of the machine running it (a machine on US Eastern time in this measurement): `1991-06-04T20:00:00-04:00` in its JSON output and `6/4/1991 8:00:00 PM` in its table and CSV output, which is a different calendar day. Copying a date from command-line output into a filter, or writing client code against that rendering, can therefore be off by a day; take date strings from the route the code will call.

### Hour of day and day of week

`HourOfDay` and `DayOfWeek` are filter tests, not functions, and each accepts exactly one value:

| Value | Result on `Miami_Flights.timestamp` |
| --- | --- |
| `HourOfDay "5"` | 707, the UTC hour, matching a `timestamp.Hour` roll-up |
| `HourOfDay "5,10"`, `"5,10,14"`, `"10,14"`, `"5/10"` | HTTP 200 with **0 rows**, no error |
| `HourOfDay "5"` OR `HourOfDay "10"` as two groups | 1,195, which is 707 + 488 |
| `DayOfWeek "Sunday"` or `"sunday"` | 6,947 (2025-06-01 was a Sunday) |
| `DayOfWeek "SUNDAY"` | HTTP 200 with **0 rows**, no error |
| `DayOfWeek "0"`, `"1"`, `"Sun"`, `"Saturday,Sunday"` | HTTP 500 `Invalid parameter for DayOfWeek query: <value>` |

For several hours or days, write one OR group per value, repeating every other clause in each. Both tests evaluate each row's own timestamp, so a record whose event spans midnight is split between days.

## Spatial filters from a drawn shape

The value format is `"WKT(<wkt>),COL(<geoColumn>)"`, and the WKT is in longitude-latitude order:

```jsonc
{
  "table": { "name": "ml_samples/Miami_Busstops" },
  "where": [[{ "col": "XY", "test": "Overlaps",
               "value": "WKT(POLYGON((-80.21 25.76, -80.18 25.76, -80.18 25.79, -80.21 25.79, -80.21 25.76))),COL(XY)" }]],
  "take": 1
}
```

That returns 138, the same as `LAT Between "25.76/25.79"` AND `LON Between "-80.21/-80.18"`. A bare WKT string without the wrapper is HTTP 500 `Specified argument was out of the range of valid values. *Parameter 'i'*`. Swapping to latitude-longitude order returns 0 with no error. A single-parenthesis polygon, `POLYGON(-80.21 25.76,-80.18 25.76,...)`, is accepted and returns the same count.

**Points against a polygon:** `Overlaps`, `Contains` and `DWithin:0` returned identical counts on three boxes (138, 173, 207). `DWithin:<meters>` buffers the shape outward: `DWithin:1000` returned 321, 263 and 353 on the same boxes.

**Points against a line:** a point almost never lies exactly on a line, so `Overlaps` with a `LINESTRING` returned 0 on three lines. `DWithin:<meters>` is the working gate: `DWithin:200` returned 20, 5 and 22, and `DWithin:1000` returned 120, 89 and 78.

**Lines against a shape** (`ml_samples/Miami_Streets`, geometry column `Miami_Streets`):

| Filter | Box 1 | Box 2 | Box 3 | Meaning |
| --- | --- | --- | --- | --- |
| `Contains` with a polygon | 1,477 | 2,652 | 2,672 | Streets entirely inside the box |
| `Overlaps` with a polygon | 1,569 | 2,803 | 2,771 | Streets touching the box |
| `Overlaps` with a crossing line | 24 | 37 | 31 | Streets crossing the gate line |
| `Contains` with a crossing line | 0 | 0 | 0 | A line cannot contain a line |

So choose by geometry: a polygon area over points can use any of the three point tests; over lines, `Overlaps` means touching and `Contains` means entirely inside; a line gate over stored lines uses `Overlaps`; a line gate over points uses `DWithin:<meters>`. `DWithin` is listed in the server's OpenAPI filter-test enums.

## Filtering by a long id list

`{ "col": "StopID", "test": "EqualAny", "value": "<comma-joined ids>" }` with the `StopID` of every row in `Miami_Busstops`, a request of about 28 KB, returned all 5,595 rows in under 0.1 seconds, and lists of 4,000 and 1,000 ids returned exactly 4,000 and 1,000. No limit was reached at that size; larger lists were not measured. This is the shape for "every record of the groups that matched": run one grouped query to collect the ids, then filter by the list, which a row-level filter cannot express.

## Related

- Aggregation shapes, `groupby` rules, `totals` and server-side top-N: [aggregation.md](aggregation.md)
- Functions and operators inside a projection or a computed filter, including how nulls behave in expressions: [expressions.md](expressions.md)
- Why a filter confirmed through the SQL endpoint or the command line proves nothing about the JSON route: [endpoint-parity.md](endpoint-parity.md)
