# Raster columns, grid functions and network routing

A raster table stores each grid (an elevation model, a land-cover classification, a computed viewshed) as one cell value per pixel in a `Raster` column, usually one row per grid or per tile. Queries read it through grid functions, and layers draw it through a raster style. Most raster mistakes come down to a wrong band name or a column of the wrong type, and both fail with messages that do not point at the cause. The facts below were measured on `ml_samples/Miami_Elevation`: one row, one `Raster` column `grid_float`, one band named `DEFAULT`, 3,612 by 3,612 cells.

## Raster columns and bands

### A raster is a column type, not a geometry

- **`Raster` and `Image` are different column types.** Grid functions and the raster style read a `Raster` column, which holds cell values. An `Image` column holds picture tiles and has no cell values to read.
- **A GeoTIFF imports as an `Image` column by default.** The import option `Imagery.ImportAsRaster` defaults to `false`. Set it to `true` for any file whose cells are data rather than a picture. GRIB files import as rasters by default.
- **A layer selects a raster by type and column:** `select: { type: "geo.raster", column: "grid_float" }`. The `column` can be left out when the table has exactly one `Raster` column. Styling is covered by the `adk-map-layers` skill.

### Band names follow from where the raster came from

Every grid function takes a band argument, and a literal name that does not exist fails with `MLE0000 ... Cannot find band named <name>`. What the band is called depends on how the raster was produced:

| Raster source | Band name |
| --- | --- |
| Imported, one band with no name in the file | `DEFAULT` |
| Imported, several bands with no names | `band_0`, `band_1`, ... |
| Imported, named bands | the names from the file |
| `ViewShed` output | `band_0`, because `ViewShed` discards the band metadata |
| Grid math output (`GridClamp`, `GridAdd`, `GridSubtract` and the rest, scalar or two-raster) | `DEFAULT` |

So the same pipeline changes band names halfway through: a viewshed is `band_0`, and the moment it passes through `GridClamp` it is `DEFAULT`. Hard-coding either name breaks when the pipeline changes.

### Resolve the band, do not guess it

- **Pass `''` for the first band.** Most grid functions resolve the band argument case-insensitively, and treat an empty string as band 0. This was confirmed for `GridLookup`, `ViewShed` and Grid math.
- **Or ask the raster: `GetBandName(grid_float, 0)`.** It returns the name of the band at an index, and an empty string when the index is out of range.
- **`GridAcres` is the exception.** It matches the band name exactly, so `''` fails there with `Unable to find band`. Pass the real name, read with `GetBandName` first.
- **The aggregate form of `GridAdd` defaults its band to `'DEFAULT'`**, so it fails on raw `ViewShed` output until the band argument is `''`.

Reading the metadata before writing anything else costs one query:

```jsonc
{
  "table": "ml_samples/Miami_Elevation",
  "sqlselect": [
    "GetBandName(grid_float, 0) as band",
    "GridRows(grid_float) as rows",
    "GridCols(grid_float) as cols",
    "GridMinValue(grid_float) as lo",
    "GridMaxValue(grid_float) as hi",
    "GetGridPropertyDouble(grid_float, 'xllcorner') as west"
  ]
}
```

This returned `DEFAULT`, 3,612 rows and columns, and a value range of about -3.7 to 64.4.

### NoData and value range

- **NoData cells are not drawn in 2D.** The 2D renderer skips them, so they come out transparent. This covers 2D tiles only; 3D terrain handles NoData separately and is not covered here.
- **A gradient with no `scaleMin` and `scaleMax` stretches over the band's stored range.** A tile rendered that way was byte-identical to one with the band's own minimum and maximum pinned as the scale.
- **A table's `min_value` and `max_value` columns are not the band statistics.** On `Miami_Elevation` both read `0` while the band ranges from about -3.7 to 64.4. Read the range with `GridMinValue` and `GridMaxValue`.

## Grid functions

### One query level per raster step

A raster produced by `ViewShed` or by an aggregate grid function cannot be passed into another function in the same `sqlselect`. `GridLookup(XY, ViewShed(...), '')` fails with `MLE0015 ... no overloaded version of method 'GridLookup'`, and `GridClamp(ViewShed(...), 0, 1)` or `GridRows(GridAdd(...))` over an aggregate fails with the less helpful `violates the constraint of type parameter 'T'`. Return the raster under an alias, and work on it in an outer query; each step of a pipeline gets its own level.

### Joining points to a raster

To read a raster at points stored in another table, join the raster table with `method: "Overlaps"` and `cartesian: true`, so every point row carries the raster column:

```jsonc
{
  "table": { "function": { "name": "JsonToTableTableValuedFunction", "params": {
    "schema": [{ "name": "id", "type": "String" }, { "name": "XY", "type": "XY" }],
    "rows": [{ "id": "a", "XY": "POINT(-80.5 26.5)" }] } } },
  "join": { "table": "ml_samples/Miami_Elevation", "method": "Overlaps", "cartesian": true },
  "sqlselect": ["id", "GridLookup(XY, grid_float, '') as ground"]
}
```

This returned a ground height of about 2.12 for the point. `JsonToTableTableValuedFunction` stands in for any point table here.

### `GridLookup`: read values at a point or along a shape

| Form | Signature |
| --- | --- |
| Point | `GridLookup(XY, raster, band, agg = 'Average', interpolateBetweenCells = true, defaultNoData)` |
| Latitude and longitude | `GridLookupByLatLon(lat, lon, raster, band, agg, interpolateBetweenCells)` |
| Shape or line | `GridLookup(shape, raster, band, spacingMeters = 1000, agg)`, sampling the raster every `spacingMeters` |

- **The aggregate names are `Average`, `Min`, `Max`, `Concat`, `Sum` and `Count`.** `'Avg'` fails with `MLE0012 ... enum parameter 'agg' ... can't be parsed from the value 'Avg'`. The layer style's `aggregate` key uses a different list, which includes `Avg`.
- **The point form interpolates by default.** That suits a score such as elevation, and is wrong for a code. On a viewshed, the cell under the observer read 1.75 with the default and 2.0 (visible) with `interpolateBetweenCells` set to `false`.
- A `GridLookup` over shapes worked as a plain projection, but inside a `groupby` with `Max()` around it failed with `PagedArray Bad Index`.

### `ViewShed`: what an observer can see

`ViewShed(raster, XY, observerHeightM, objectHeightM, stride = 1, observerHeightIsAbsolute = false, maxRadiusMeters, minAzimuth = 0, maxAzimuth = 360, bandName = '', skipNoData = true)`

- **The result is a raster of codes:** -1 not visible, 0 no data, 1 partly visible, 2 visible. Style it as codes, not as a scale; see the `adk-map-layers` skill.
- **It is cropped to the radius.** A 2,000 m viewshed on `Miami_Elevation` came back as 130 by 146 cells, one raster per observer row. Two observers therefore produce rasters with different extents, which matters for Grid math below.
- **Its band is `band_0`, not `DEFAULT`** (see the band table above).
- The observer XY comes from the joined point row, so the usual shape is the cartesian `Overlaps` join above with `ViewShed(grid_float, XY, ...) as vs` in the inner `sqlselect`, and any reading of `vs` in the query around it:

```jsonc
{
  "table": { "query": {
    "table": { "function": { "name": "JsonToTableTableValuedFunction", "params": {
      "schema": [{ "name": "id", "type": "String" }, { "name": "XY", "type": "XY" }],
      "rows": [{ "id": "boca", "XY": "POINT(-80.12 26.37)" }] } } },
    "join": { "table": "ml_samples/Miami_Elevation", "method": "Overlaps", "cartesian": true },
    "sqlselect": ["id", "XY", "ViewShed(grid_float, XY, 1, 0, 1, false, 2000) as vs"] } },
  "sqlselect": ["id", "GetBandName(vs, 0) as band", "GridLookup(XY, vs, '', 'Average', false) as at_observer"]
}
```

This returned `band_0` and 2.0.

### Grid math

Every Grid math result is a single band named `DEFAULT`. Three forms exist:

- **Scalar:** `GridAdd`, `GridSubtract`, `GridMultiply`, `GridDivide`, `GridMin` and `GridMax` take `(raster, scalar, band = '')`; `GridClamp(raster, min, max, band = '')` and `GridLog(raster, base = e, band = '')` round it out.
- **Two rasters:** `GridAdd`, `GridSubtract`, `GridMultiply`, `GridMin`, `GridMax` and `GridMask` take `(r1, r2, b1 = '', b2 = '', noDataHandling = 'RequireBoth')`. There is no two-raster `GridDivide`.
- **Across rows:** `GridAdd(raster, band = 'DEFAULT', noDataHandling)` inside a `groupby` sums one raster per row into one. Its band defaults to `'DEFAULT'`, so on `ViewShed` output it fails with `Cannot find band named DEFAULT` until the band is `''`.

`noDataHandling` is one of `RequireBoth` (the default: a cell needs a value in both inputs), `RequireLeft`, `RequireRight`, `RequireEither` and `RequireNone`.

**Two-raster math is only safe on rasters with the same extent**, such as a raster and something computed from it. Measured on viewsheds, which are cropped to each observer's radius:

| Inputs | Result |
| --- | --- |
| One extent inside the other (2 km and 3 km viewsheds from one observer), `RequireBoth` | Works, cropped to the smaller (130 rows from inputs of 130 and 196) |
| The same pair, `RequireEither` | Fails with `Index was outside the bounds of the array.` |
| The same pair, `RequireLeft` | Smaller raster first: returned the larger extent (196 rows). Larger raster first: fails with `Specified argument was out of the range of valid values` |
| Offset extents (two observers), `RequireBoth`, `RequireLeft` or `RequireEither` | Fails with `Index was outside the bounds of the array.` |
| Offset extents, summed across rows with `GridAdd(vs, '', 'RequireEither')` | Works, covering the union: two 130 by 146 viewsheds summed to 202 by 218 |

So to combine many observers into one coverage raster, sum them across rows rather than chaining two-raster calls, with one level per step:

```jsonc
{
  "table": { "query": {
    "table": { "query": {
      "table": { "query": {
        "table": { "function": { "name": "JsonToTableTableValuedFunction", "params": {
          "schema": [{ "name": "id", "type": "String" }, { "name": "XY", "type": "XY" }],
          "rows": [{ "id": "a", "XY": "POINT(-80.12 26.37)" }, { "id": "b", "XY": "POINT(-80.10 26.39)" }] } } },
        "join": { "table": "ml_samples/Miami_Elevation", "method": "Overlaps", "cartesian": true },
        "sqlselect": ["id", "ViewShed(grid_float, XY, 1, 0, 1, false, 2000) as vs"] } },
      "sqlselect": ["id", "GridClamp(vs, 0, 1) as cv"] } },
    "sqlselect": ["'k' as k", "GridAdd(cv, '', 'RequireEither') as covered"],
    "groupby": ["'k'"] } },
  "sqlselect": ["GridRows(covered) as rows", "GridMaxValue(covered) as watchers", "GetBandName(covered, 0) as band"]
}
```

`GridClamp(vs, 0, 1)` turns each viewshed into 1 for visible and 0 otherwise, so the sum counts how many observers see each cell. This returned 202 rows, a maximum of 2 (cells both observers see) and band `DEFAULT`.

### `CoveringGridTableValuedFunction`: a grid of cells over an area

Parameters: `type` (`SquareGrid`, `TriangleGrid`, `HexGrid`, or the outline forms `SquareLines`, `TriangleLines`, `HexLines`), `cellSize` in degrees, `minLat`, `maxLat`, `minLng`, `maxLng`, and optionally `coverTable` and `coverColumn` to cover another table's shapes. Each row has an `ID` and a `Grid` shape. A `HexGrid` at 0.1 degrees over the exact `Miami_Elevation` bounds returned 168 cells in about 50 ms.

## Raster area and cost

Two ways measure how much area of a raster falls in a value range inside a shape. They agree, but they cost very differently once a query needs more than one range.

- **`GridAcres(raster, shape, band, min, max)`** is an expression returning acres for one range. Every call walks every cell of the raster and tests it against the shape, so a query asking for ten classes or bins makes ten full passes. Its band must be the exact name (see [resolving bands](#resolve-the-band-do-not-guess-it)).
- **`GridAreaByRasterValue`** is a table-valued function that makes one pass and returns a row per band and distinct value: `BandIndex`, `Value` and `AreaKmSq`. The area is in square kilometres; multiply by 247.105 for acres. Group or filter its rows in an outer query to get ranges.

| Parameter | Meaning |
| --- | --- |
| `rasterSource` | A query returning the raster rows, such as `{ "query": { "table": "<raster table>" } }` |
| `bandNames` | The band to measure; every band when left out |
| `areaFilterWkt` | The shape to measure inside, as WKT |
| `areaFilterSource` | The shape as a query instead of WKT |

On `ml_samples/Miami_Elevation`, with a 0.2 by 0.2 degree box as the shape, `GridAcres(grid_float, <box>, 'DEFAULT', 0, 10)` and the summed function rows for values 0 to 10 both returned 109,218.95 acres. Split into ten 1 m bins, ten `GridAcres` calls in one query took 935 ms; one function pass grouped by `Floor(Value)` took 211 ms and returned the same acres in every bin:

```jsonc
{
  "table": { "query": { "table": { "function": { "name": "GridAreaByRasterValue", "params": {
    "rasterSource": { "query": { "table": "ml_samples/Miami_Elevation" } }, "bandNames": "DEFAULT",
    "areaFilterWkt": "POLYGON((-80.6 26.4,-80.4 26.4,-80.4 26.6,-80.6 26.6,-80.6 26.4))" } } }, "take": -1 } },
  "where": [[{ "col": "Value", "test": "GreaterOR", "value": 0 }, { "col": "Value", "test": "Less", "value": 10 }]],
  "groupby": ["Floor(Value)"],
  "sqlselect": ["Floor(Value) as bin", "Sum(AreaKmSq) * 247.105 as acres"], "take": -1
}
```

- **A continuous raster returns many rows.** That box held 483,491 distinct elevation values, so aggregate in the outer query rather than shipping the rows to the client. A coded raster, such as land cover, returns one row per class.
- **Bins need a half-open range.** `GreaterOR 0` with `Less 10`, as above, gives exactly ten bins; an inclusive upper bound would put a cell of exactly 10 in an eleventh bin. For an inclusive total, `Between "0/10"` and `GreaterOR` with `LessOR` both returned the 109,218.95 acres. The inclusive tests are `GreaterOR` and `LessOR`; `GreaterOrEqual` is refused with `Unsupported test` (see [filters.md](filters.md)).

### Raster stored as many tiles

When a raster table holds many tile rows, select only the tiles overlapping the shape before passing them to `rasterSource`. Leave that pre-filter unbounded with `take: -1`, since the shape decides how many tiles come back:

```jsonc
"rasterSource": { "query": {
  "table": "<raster table>",
  "join": { "table": { "function": { "name": "WktToShapeTableValuedFunction", "params": { "wkts": ["<shape WKT>"] } } },
    "leftcolumn": "grid_float", "rightcolumn": "shape", "method": "Overlaps" },
  "take": -1 } }
```

## Routing over a line network

`ShortestPathTableValuedFunction` routes between point pairs over a graph built from a line table. The graph can come from either of two forms, and both returned the same 5.19 km route across the `LZIP` 33183 streets of `ml_samples/Miami_Streets`:

- **Grouped:** a query over the line table with `groupby: ["<lineColumn>.build_graph(0)"]` and `sqlselect: ["*"]`. Its inner query **needs `withgeo: true`**; without it the route fails with `Object reference not set to an instance of an object`.
- **Table-valued:** `BuildGraphEdgeTableValuedFunction` with `mode: ""`, `lineColumnName`, `bufferInMeters` and `tableSource` (the line query). It returns `Edge`, `Connections` and `ML_SOURCE_ROW`.

Either way, pass `lineCol: "Edge"` and `graphCol: "Connections"` to the route; the grouped form routed with the same two names.

```jsonc
{
  "table": { "function": { "name": "ShortestPathTableValuedFunction", "params": {
    "graph": { "query": { "table": { "function": { "name": "BuildGraphEdgeTableValuedFunction", "params": {
      "mode": "", "lineColumnName": "Miami_Streets", "bufferInMeters": "0",
      "tableSource": { "query": { "table": "ml_samples/Miami_Streets", "where": [[{ "col": "LZIP", "test": "Equal", "value": 33183 }]], "take": -1 } } } } }, "take": -1 } },
    "point": { "query": { "table": { "function": { "name": "JsonToTableTableValuedFunction", "params": {
      "schema": [{ "name": "StartXY", "type": "XY" }, { "name": "EndXY", "type": "XY" }],
      "rows": [{ "StartXY": "POINT(-80.3844 25.7046)", "EndXY": "POINT(-80.4291 25.7015)" }] } } } } },
    "graphCol": "Connections", "lineCol": "Edge", "start": "StartXY", "end": "EndXY", "snapDistanceMeters": 50 } } },
  "sqlselect": ["routeMethod", "Length(Path) as km"]
}
```

- **Required parameters:** `point` (a query whose rows hold the start and end points), `start` and `end` (their column names), and `snapDistanceMeters`. Leaving out `snapDistanceMeters` fails with `MLE0031 ... missing required parameter snapDistanceMeters`. `graph`, `graphCol` and `lineCol` name the graph; `speedCol`, `maxSnapPoints` (default 8), `thresholdDistance` (default 200), `cost`, `costUnit`, `outputTurnDirections` and `limitResults` are optional.
- **Output columns:** `StartXY`, `EndXY`, `routeMethod`, `Path` (the route line), `TurnDirections` and `Hazards`. `RouteDuration` exists only on some graphs, and selecting it otherwise fails with `MLE0011`.
- **`routeMethod` is an output, not an option.** Passing `routeMethod: "OnlyPrivate"` as a parameter is silently ignored; the route and the returned `MapLarge` value were unchanged.

### Removing blocked lines before building the graph

To route around obstacles, drop every line that touches one: an outer, cartesian join to the obstacles, keeping the rows that found no match.

```jsonc
{
  "table": { "query": { "table": "ml_samples/Miami_Streets", "where": [[{ "col": "LZIP", "test": "Equal", "value": 33183 }]], "withgeo": true, "take": -1 } },
  "join": { "table": "<obstacle query with an obstacle shape column>",
    "method": "Overlaps", "leftcolumn": "Miami_Streets", "rightcolumn": "obstacle", "outer": true, "cartesian": true },
  "where": [[{ "col": "obstacle", "test": "IsNull", "value": "" }]]
}
```

With one rectangle as the obstacle, 333 of the 1,465 street lines touched it and this kept the other 1,132. Test the obstacle column with `IsNull`. A number joined from the obstacle side, such as a delay, reads as 0 on the unmatched rows, so testing it for zero kept the same 1,132 lines, but it would also keep a matched obstacle whose value really is 0.

## Inline rows: overriding stored rows for a session

`JsonToTableTableValuedFunction` turns `{ schema: [{ name, type }], rows: [...] }` into a table. Joined with `unionall`, it adds rows that exist only in the request, such as unsaved edits. Exclude the stored versions of the edited rows with `EqualNone`, so each id appears once:

```jsonc
{
  "table": "ml_samples/Miami_Busstops",
  "where": [[{ "col": "StopID", "test": "EqualAny", "value": "8558,8547" }, { "col": "StopID", "test": "EqualNone", "value": "8558" }]],
  "sqlselect": ["StopID", "StopName"],
  "unionall": [{ "table": { "function": { "name": "JsonToTableTableValuedFunction", "params": {
    "schema": [{ "name": "StopID", "type": "Int32" }, { "name": "StopName", "type": "String" }],
    "rows": [{ "StopID": 8558, "StopName": "Moved stop (session edit)" }] } } } }]
}
```

This returned stop 8547 from the table and stop 8558 from the inline row. The inline rows need the same columns as the base `sqlselect`. Through `Query.fromApiRequest`, `unionall` is dropped before sending (see [endpoint-parity.md](endpoint-parity.md)), so build this query with `getQueryFromJSON` or nest it.

## Related

- Drawing a raster on a map, gradients and coded bands: the `adk-map-layers` skill
- 3D terrain from an elevation raster: `raptor/reference/controls/map-3d-layers.md`
- Function names and parse errors in general: [expressions.md](expressions.md)
