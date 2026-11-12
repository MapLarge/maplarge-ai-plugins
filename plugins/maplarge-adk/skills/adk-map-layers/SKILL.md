---
name: adk-map-layers
description: Authoring and debugging server-side and client-side map layers in a MapLarge ADK extension. Covers the layer query shape (withgeo, geometry column, where placement), the create-then-tile render path and why one broken layer blanks every composited layer, mistakes that pass create and fail every tile, style rule matching, text labels, tile color formats, raster layers (gradients, coded bands such as a viewshed), and geo.client layers. Use when a layer draws nothing or only base tiles show, every layer vanished after adding one, tiles return HTTP 500, a ramp or raster draws in the wrong colors, or when adding a layer to a Raptor map. Triggers on "layer draws nothing", "map is blank", "layer not showing", "tile 500", "Index was outside the bounds of the array", "Unknown JSON attribute", "choropleth", "dynamic ramp", "withgeo", "select.column", "geo.client.dot", "geo.raster", "raster layer", "viewshed layer", "rasterGradient", "scaleTransparentBelow", "text label", "label not showing".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "ARC-75, ARC-98"
  verified-against: "MapLarge Server 4.139 (docs host): 48 layer behaviors re-run live on the create-then-tile render path and the JSON query route against ml_samples/Miami_* tables, each in at least 3 distinct requests, plus the grounding query through the CLI on 4 tables, 2026-09-29 (ARC-75); map wiring and client-side layer behavior read from the 4.139 framework bundle; table-inside-select and style.metaData refusals re-run against a local server and in the browser, LayerQuery annotation and cast behavior checked with tsc against the 4.141 declarations, 2026-10-14 (ARC-64); raster layer styles rendered through POST /restapi/v1/layers tiles on MapLarge Server 4.141 (2026-10-13 build) against ml_samples/Miami_Elevation and a computed viewshed, style keys read from core source a19113527d8, plus text labels under rules and dynamic styles on ml_samples/Miami_Busstops, 2026-10-16 (ARC-98)"
---

# ADK Map Layers

This skill covers the layer objects an ADK extension hands to a Raptor map: the query shape that returns drawable geometry, how style rules match rows, the colors the tile renderer accepts, and how to prove a layer draws or find out why it does not. It does not cover the map control's own options, bindings and events, the panels around the map, or query authoring in general: for map and control wiring use the `raptor` skill, for choosing a query form use `adk-query-dev`, and for expression and filter-test semantics behind a layer's query use `maplarge-query-dialect`. Most mistakes described here pass the type check and are accepted when the layer is created, so a layer is only proven once a tile has come back as an image.

## Grounding

Establish which project and server you are in before changing a layer. Run the bundled helpers from the plugin root. Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`):

```bash
node <plugin-root>/scripts/detect_maplarge_workspace.mjs --cwd "$PWD"
node <plugin-root>/scripts/check_adk_environment.mjs --cwd "$PWD"
```

Read one existing layer in the extension before writing a new one. Layers conventionally live one per file under `client/layers/`, each exporting a factory that returns the layer options object.

Find the geometry column before writing the layer, because a layer that selects the wrong column fails every tile:

```bash
maplarge query exec -profile <profile> -lang sql -input "SELECT * FROM <account>.<table> LIMIT 1"
```

Geometry columns print as WKT values (`POINT (...)`, `LINESTRING (...)`, `MULTIPOLYGON (...)`). Points commonly use a column named `XY`, lines and polygons a column named after the table, so `ml_samples/Miami_Streets` stores its lines in `Miami_Streets`. Go by the printed value, not the name: a table can carry more than one geometry column, and a non-geometry column can have a geometry-sounding name.

## The layer query shape

A server-side layer that draws `ml_samples/Miami_Streets`, restricted to three road classes:

```ts
{
  id: "streets",
  visible: true,
  query: {
    select: { type: "geo.line", column: "Miami_Streets" },
    table: {
      query: {
        table: { name: "ml_samples/Miami_Streets" },
        withgeo: true
      }
    },
    where: [[{ col: "CLASS", test: "EqualAny", value: "1,2,3" }]]
  },
  style: {
    method: "rules",
    rules: [{ style: { fillColor: "#FF3A7FC4", width: 1 }, where: { col: "*", test: "CatchAll", value: 0 } }]
  }
}
```

- **`table` is a sibling of `select`, not a field inside it.** `select: { type, table }` is refused at create with `Unknown JSON attribute in select block: table`, even when a sibling `table` is also present, and the layer never draws. An uncast, typed layer object catches this at compile time. A plain `as ml.ui.map.IMlUiLayerOptionsInterface` catches it only when `select.table` is the sole `table`; with a sibling `table` also present it compiles clean, and `as unknown as` or `as any` let it through either way. Declare the query as a `const query: ml.ui.map.LayerQuery` before putting it on the layer object, which catches it in every case. The layer's `style` gets no such protection, because the layer options type declares it `style.LayerStyle | any`.
- **`withgeo: true` inside the nested query.** Without it the nested result carries attribute columns and no geometry. The layer is still accepted at create, and then every tile fails with HTTP 500, because the geometry column the layer selects is missing from that result; a failing tile also takes down every other layer in the same composite request (next section). A plain table can be written flat instead, `table: { name: "ml_samples/Miami_Streets" }`, and draws the same tile. The examples here use the nested form, which is where they put a projection, a join or an aggregate.
- **`select.column` names the geometry column, and its kind must match the select type.** A `geo.line` pointed at a point column, or a `geo.dot` pointed at a String column, is accepted at create and fails every tile with a cast error. With the column omitted, the server resolved the geometry column matching the select type on every table tried, including one carrying both a polygon and a point column; naming it keeps the layer independent of that resolution and makes the kind visible in review.
- **`where` works at either level, and each level sees different columns.** Inside the nested query a clause runs against the base table. At the outer level, as a sibling of `table`, it runs against the nested query's result, so when the nested query has an `sqlselect` only the projected columns exist there, and a clause on any other column is accepted at create and fails every tile; the tile response carries only an opaque reference, and an extents call on the hash names the column (`Column '<name>' is not found in any table source`). Without a nested `sqlselect`, the two placements draw identical tiles.
- **The outer array is OR, each inner array is AND.** On `ml_samples/Miami_Streets`, `[[CLASS=1, CLASS=2]]` matches nothing, because no row is in both classes, while `[[CLASS=1], [CLASS=2]]` matches both classes. A condition shared by several OR groups has to be repeated inside each group. Written once as a group of its own it is ORed in and widens the match: "class 1 or 2, avenues only" is 755 rows as `[[CLASS=1, AVE], [CLASS=2, AVE]]` and 34,398 as `[[CLASS=1], [CLASS=2], [AVE]]`.
- **`visible: true`.** The core map shows a layer only when its `visible` option is truthy, and the Raptor map filters layers without it out of its update path before they load, so a layer without the flag never appears.

Two constraints on volume:

- **A `take` does not bound a layer.** The layer query type declares no `take`, and on a plain layer a `take` placed in the nested query or at the top level was accepted and produced a byte-identical tile. The `where` clause is what limits the rows a layer draws, so make the "nothing selected" state of a filter control fall back to a bounded clause rather than to no clause, which draws the whole table.
- **Keep the geometry column out of `sqlselect`.** `withgeo` already returns the geometry; naming the geometry column in `sqlselect` as well returns it a second time as a data column, which made the same rows 1.46 times larger on the JSON query route. Tiles are unaffected, but any query that feeds panels or tables pays for it.

Put the layer list on the `layers` member of the object bound through the map node's `data` binding (`IRaptorMapOptions`, usually a `RaptorMapOptions` instance), not on `mapOptions.layers` and not on the deprecated `layers` binding. In `RaptorMap.applyBindingData`, a change to the data object's `layers` goes through `updateLayers`, which compares each layer with its previous copy and reloads only the layers that changed. A change anywhere inside `mapOptions` other than `lat`, `lng`, `z`, `rotation`, `baseLayer`, `mlBaseLayer`, `service`, `drawings` or `drawingsV2` goes through `update`, which rebuilds the whole map and requests every layer again. Layers kept only in `mapOptions.layers` are worse off than slow: a quick update such as a change to `lat`, `lng` or `z` calls `updateLayers` with the data object's list, which removes map layers missing from it, so they can vanish on a programmatic pan or zoom (read from the framework code, not observed in a browser). Assigning `layers` on a `RaptorMapOptions` does not schedule a view update by itself (its `mapOptions` setter does), so update the map's view after changing the list. Map wiring beyond this belongs to the `raptor` skill.

## Proving a layer draws: the render path

The JSON query route is not what draws the map, so a query that returns the right rows proves nothing about the layer. The framework makes two calls per layer:

1. **Create.** The framework builds the request from the layer's `query`, `style` and `axes` plus a fixed allow-list of optional keys (among them `name`, `minZoom`, `maxZoom`, `ignoreErrors`, `raster` and `markers`), sends it to the server's layer cache, and gets a hash back. Anything outside that list, such as `id`, `visible`, `_meta`, hover settings, or a layer-level `opacity`, never reaches the server.
2. **Tile.** Tiles are fetched by hash. A layer accepted at create can still fail every tile, and most of the mistakes in the next section do exactly that.

**One layer that fails at tile time blanks every composited layer.** Compositing is on by default, so all visible server layers are fetched together, one multi-layer tile request per tile, and that request is all or nothing: a streets layer and a bus-stop layer that each draw on their own returned HTTP 500 and no image for either once a third layer whose tiles fail joined the request. The server treats an empty slot in the hash list, or an unknown hash, the same way. The symptom is that the whole map goes blank at once, and every filter and toggle on the page then appears to do nothing. A layer the server refuses at create is handled differently in the 4.139 framework: the composite keeps only the layers whose create succeeded and reports the refusal as a map error, so that one layer is missing while the rest still draw.

**A tile is the only sufficient check.** Fetch one and confirm it is an image larger than an empty tile, which is roughly 350 bytes. An extents call on the hash is not enough: a ramp with a keyframe at percentile 100, and a ramp on a column the nested query did not project, both returned a hash and a successful extents response and then failed every tile. The extents call is still worth making afterwards, because on a failing hash it often states the underlying problem (a missing column's name, for instance) where the tile response carries only an opaque reference.

Two ways to run that check outside the running app:

- `POST /restapi/v1/layers` with the layer's `query` and `style` (send whatever authentication the server requires) returns a hash and a templated tile link, `/restapi/v1/layers/tiles/{zoom}/{x}/{y}.{format}?hashes=<hash>`. It rejects an undeclared style key by name at create, and on the layers tried its tiles agreed with the map's on success or failure. Its images are not byte-identical to the map's tiles, so compare status and size, not checksums.
- The tile request carries an `ignoreErrors` flag, which the framework sends as false by default. With it set to true, the composite above drew the two good layers exactly as if the failing one were absent. That identifies the offender; it is not a fix, because the failing layer still draws nothing.

## Mistakes that pass create and fail every tile

Check these first when the map goes blank.

| In the layer | Create | Tiles | Message (tile or extents response) |
| --- | --- | --- | --- |
| Nested query without `withgeo` | Accepted | HTTP 500 | `Column '<geometry column>' not found in table ...` |
| `select.column` of the wrong kind (a `geo.line` on a point column, a `geo.dot` on a String column) | Accepted | HTTP 500 | `Unable to cast object of type ...`, or `columnXYInfo is not of type IXYColumn ...` |
| Outer `where` or a style rule's `where` naming a column the nested `sqlselect` does not project | Accepted | HTTP 500 | `Column '<name>' is not found in any table source` |
| `dynamic` ramp `column` not projected by the nested `sqlselect` | Accepted | HTTP 500 | `Could not get column stats for <column>` |
| `dynamic` ramp keyframe at `Percentile` position 100 | Accepted | HTTP 500 | `Index was outside the bounds of the array.` The same ramp with its top keyframe at 99 draws. |
| Style rule with an unrecognized `test` (a misspelling such as `NotARealTest`) | Accepted | HTTP 500 | Opaque reference in the tile response |
| Nested join query without `withgeo`, joining on a geometry column | Accepted | HTTP 500 | `Column 'XY' is not found in the table with alias ...` |

These mistakes are refused at create instead, so the layer never gets a hash and drops out of the composite:

| In the layer | Create | Message |
| --- | --- | --- |
| `opacity` in a style, at the style root or inside a rule's `style` | HTTP 500 | `Unknown JSON attribute in query style clause: opacity`. The style schema has no `opacity`; put the alpha in the color instead. |
| `table` inside `select`, `select: { type, table }`, with or without a sibling `table` | HTTP 500 | `Unknown JSON attribute in select block: table, ignoring contents and parsing next`. Move `table` out to sit beside `select`. |
| `metaData` in a style, a v4 leftover | HTTP 500 | `Unknown JSON attribute in query style clause: metadata`. Compiles clean, because the layer options type declares `style` as `style.LayerStyle \| any`. |
| `alias` inside a nested join query, `join.table: { query: { ..., alias } }` | HTTP 500 | `Unknown JSON attribute in query-query clause: alias`. The JSON query route refuses it too. A table reference with an alias, `join.table: { name, alias }`, is accepted. |

In the browser a refusal is easy to miss: the framework's create call (`/Api/CacheRequest`) returns HTTP 500, and the console gets a log-level line, not an error, that starts `Layer processing failure. Layer ID <id>` and ends with the attribute the server rejected (for example `Error:  metadata`). The rest of the map keeps drawing. `POST /restapi/v1/layers` refuses the same layers with HTTP 403 and the same message.

## Style rules on the tile path

- **The first matching rule wins.** Two rules matching the same rows drew exactly what the first drew alone, in either order, and a catch-all placed first took every row. Put specific rules first and a catch-all last. The style's `ruleMatchMode` changes this: `"Last"` drew the last matching rule instead.
- **A row that matches no rule is not drawn.** With a single rule for class 1 on a layer selecting classes 1 to 3, the tile drew about what a layer selecting class 1 alone draws, a fraction of what giving every class a rule draws. Cover every row the `where` selects, or use a catch-all as the last rule.
- **Rules see the nested query's result, not the base table.** A rule or a ramp column naming a column the nested `sqlselect` leaves out fails every tile (see the table above), so project every column the style names. A layer with no nested `sqlselect` has every base column available.
- The catch-all can be written `where: { col: "*", test: "CatchAll", value: 0 }`; the string `"CatchAll"` and the nested form `[[{ col: "*", test: "CatchAll", value: 0 }]]` drew identical tiles.

## Text labels

A rule's style can carry `text`, and the server draws it into the tile beside each point the rule styles. Labelling the stops over 8550 in `ml_samples/Miami_Busstops` and leaving the rest bare:

```ts
style: {
  method: "dynamic",
  rules: [
    {
      style: { fillColor: "#FFFF0000", shape: "round", size: 10, text: { text: "Stop ${StopID}", color: "#FF000000", bold: true, size: 14 } },
      where: [[{ col: "StopID", test: "Greater", value: 8550 }]]
    },
    { style: { fillColor: "#FF0000FF", shape: "round", size: 10 }, where: { col: "*", test: "CatchAll", value: 0 } }
  ]
}
```

- **`${column}` is filled in only under `method: "dynamic"`.** Under `"rules"`, a label containing a placeholder draws nothing at all, not even its fixed part: `Stop ${StopID}` left every dot bare, on a flat table and through a nested query alike. Fixed text draws under either method. Under `dynamic`, the same label drew `Stop 8558` beside each matching stop.
- **Computed columns work too.** `${sid10}`, over `StopID * 10 as sid10` in the nested `sqlselect`, drew under `dynamic` just like a stored column. As with any rule, the column has to be projected by the nested query.
- **Rules still match row by row under `dynamic`, and the first match wins.** With the rules above, the stops over 8550 drew red with their label, and the rest drew blue with none.
- **`maxWidth` with `wrapType: "WordWrap"` wraps long text**: a `${StopName}` label at `maxWidth: 80` drew on three lines. `backColor` appears beside them in demo layers and was not checked here, and neither was the `${column:Format(...)}` form that the server's style formatter accepts.

## Colors on the tile path

The tile renderer reads 8-digit colors alpha first, `#AARRGGBB`. Each row below was decoded from tile pixels:

| Value in the style | What the tile shows |
| --- | --- |
| `fillColor: "#FF3A7FC4"` | Opaque blue. |
| `fillColor: "#333A7FC4"` | Translucent per feature, and overlaps add up: on overlapping polygons single coverage has alpha 51, double coverage 91 to 92, rising to 240 where many overlap. This is what makes busy areas read darker. |
| `fillColor: "#3A7FC433"` (alpha written last) | Read alpha first anyway: alpha `3A`, color `7F C4 33`, so the blue becomes green. The first two digits always become the alpha. |
| `fillColor: "#3A7FC4"` (6 digits) in a `rules` style | Opaque, identical to `#FF3A7FC4`. |
| 6-digit keyframe colors in a `dynamic` ramp | Opaque on 4.139 (alpha 255, same colors as the 8-digit ramp). Use 8 digits when the ramp should be translucent. |
| `fillColor: "#GG0000"` (not valid hex) | Accepted and painted black, with no error at create or tile. Validate color strings before they reach a layer. |
| `color` instead of `fillColor` | Identical tile, but `color` is not declared in the style schema, so use `fillColor`. |
| `colorTransform: { alpha: 0.2 }` on the style | Every pixel capped at alpha 51, so overlaps cannot build up density. |

The layer-level `opacity` option (on the layer options object, not in its style) is not in the create allow-list, so the server never sees it. In the 4.139 framework a composited server-side layer, which is the default, has no tile layer of its own, and the option is not applied to it (read from the framework code, not observed in a browser). Put the alpha in the colors.

For point `shape`, the declared tokens are `round`, `rectangle`, `triangle`, `diamond`, `plus`, `star`, `x` and `chevron`. An undeclared token is not rejected: `circle`, `square` and a made-up token all drew exactly like the default round marker, while `rectangle` and `star` drew differently. Layer factories usually return their object through a cast, so a wrong token passes the type check as well.

## Raster layers

A raster layer paints one color per cell of a `Raster` column: an elevation tint, a land-cover class, a viewshed. Band names, `Raster` versus `Image` columns and NoData are covered in `maplarge-query-dialect`'s `reference/raster.md`; read it first if the raster came out of a query. 3D terrain is covered in the `raptor` skill's `reference/controls/map-3d-layers.md`.

The layer selects the raster column with `select.type: "geo.raster"`, and the style needs no `method` or `rules`:

```ts
{
  id: "elevation",
  visible: true,
  query: {
    select: { type: "geo.raster", column: "grid_float" },
    table: { name: "ml_samples/Miami_Elevation" }
  },
  style: { rasterType: "pixel", gradient: "#FF0000FF,#FFFF0000", scaleMin: 0, scaleMax: 10 }
}
```

- **A raster computed by a query is drawn the same way.** Put the query in `table.query`, return the raster under an alias in its `sqlselect`, and name the alias in `select.column`. A viewshed drew this way with no `withgeo`.
- **`select.column` names the raster.** With one `Raster` column on the table it can be left out. Some demos put `layerType: { column }` in the style instead; `POST /restapi/v1/layers` refuses that with `Unknown JSON attribute in query style clause: layertype`. It works only on a data-source layer in a `LayerStore`, where the framework moves it into `select` and deletes it from the style before creating the layer. On a layer with its own `query`, use `select.column`.

### Raster style keys

Measured on tiles:

| Key | What it does |
| --- | --- |
| `rasterType` | `"pixel"` paints each cell. The parser also accepts `contour`, `arrow` and `barb` |
| `gradient` | Comma-separated colors, lowest value first, stretched evenly between `scaleMin` and `scaleMax` |
| `scaleMin`, `scaleMax` | The values the gradient's ends sit on. Left out, they default to the band's stored minimum and maximum: the tile was byte-identical to one with those values pinned |
| `rasterGradient` | Explicit stops as `[{ position, value }]`, with the color in `value`. A `{ color, position }` shape is refused at create. Positions are **raw cell values**, not fractions: stops at `"0"` and `"10"` drew the same as `gradient` over a 0 to 10 scale, while stops at `"0"` and `"1"` pushed nearly every cell past the top color. Write `"0%"` and `"100%"` for positions relative to the scale |
| `scaleTransparentBelow` | Leaves cells below `scaleMin` unpainted instead of clamping them to the bottom color. `scaleTransparentAbove` is its counterpart above `scaleMax` (read from the parser) |
| `rasterSelect` | The band to draw. Leave it out to draw the first band. A name that does not exist is accepted at create and fails every tile with `Could not get raster function band <name>`, which on a map looks like a grey or empty raster |
| `rasterCellSelect` | A comma-separated list of exact values to paint. It is applied after the raster is downsampled for the zoom, so cells whose value was blended by downsampling drop out |

Read from the style parser and not rendered here: `aggregate` (`Avg`, the default, `Min`, `Max` or `TopOnly`, for how cells are combined when downsampled; a different list from the query-side `GridLookup` aggregates), `nodata`, `scaleLog`, `interpolate`, `interpolateStartZoom`, `uniformDownsampling`, and `contourStart` and `contourStep` for `rasterType: "contour"`. NoData cells are skipped in 2D, so they show the map beneath.

### Codes are not scores

Decide what the band's values mean before choosing a style:

- **A score** (elevation, a count, a probability) is ordered, so a multi-stop `gradient` reads correctly.
- **A code** (a land-cover class, a viewshed's -1 not visible, 1 partly visible, 2 visible, 0 no data) has no order, and a ramp across codes invents one. On a 1 m observer's viewshed, a red-yellow-green ramp painted the not-visible majority of the area red, with a yellow fringe wherever downsampling blended a -1 into a 2.

To show one class, paint a flat ramp (the same color at both ends) and drop everything under it:

```ts
style: { rasterType: "pixel", gradient: "#FF55FF00,#FF55FF00", scaleMin: 1, scaleMax: 3, scaleTransparentBelow: true }
```

That drew only the visible ground, with the not-visible cells left transparent. `scaleMin: 1` also drops the blended cells between -1 and 1. `rasterCellSelect: "2"` paints only cells that are exactly 2 after downsampling, which leaves the class looking speckled at most zooms. To show several classes, give each its own layer with its own flat ramp.

## Client-side layers

When the data lives in the browser, the layer's `query.table.retrieveData` callback returns `{ columns, data }` rows, and the select type is one of `geo.client.dot`, `geo.client.line`, `geo.client.poly` or `geo.client.heat`. There is no `geo.client.point`: any other type throws `Layer options not supported for clientside layer.`

- **Coordinates are `[lat, lng]`.** The client-side adapter swaps each pair into GeoJSON order itself, so rows written in GeoJSON order land transposed.
- **Geometry type comes from array depth**: depth 1 is a point, 2 a line, 3 a polygon, 4 a multipolygon. A depth-2 array on a `geo.client.poly` layer is wrapped into a polygon, a depth-2 array on a dot layer becomes a multi-point, and a depth-3 array on a line layer becomes a multi-line; other mismatches keep the type their depth implies, so match the depth to the layer type.
- **Style rules match the column names you return.** The geometry column defaults to the name `geom`. Unlike the tile path, every matching rule is collected for a row, and a row matching none gets no style, so keep client-side rules mutually exclusive and complete. An unrecognized `test` here falls through to a catch-all that matches every row, where the same typo in a server-side layer fails every tile. Several tests the server does support, among them `Overlaps`, `DWithin` and `DayOfWeek`, have no client-side implementation and fall through the same way (read from the framework code), so filter client-side rows before returning them rather than with those tests.
- **A changed callback alone does not redraw.** The map compares new layer options with the previous copy and treats any two functions as equal, so if only the `retrieveData` callback changed between updates the layer is not reloaded and keeps showing old data. Change a primitive on the layer options object alongside the data, for example a frame counter under `_meta`, which is declared as consumer metadata that MapLarge does not act on. Hiding and showing the layer does reload it, because `visible` is a primitive and the comparison catches the change.

## Examples

**"Show the major roads from ml_samples/Miami_Streets, classes 1 and 2 in different colors."** An annotated `LayerQuery`, a nested query with `withgeo`, the line column named, the class filter at the outer level, and one rule per class so every selected row matches exactly one rule:

```ts
// client/layers/streetsLayer.ts
export function streetsLayer(): ml.ui.map.IMlUiLayerOptionsInterface {
  // Annotated so a misplaced `table` fails the build even if the layer object is later cast through unknown.
  const query: ml.ui.map.LayerQuery = {
    select: { type: "geo.line", column: "Miami_Streets" },
    table: { query: { table: { name: "ml_samples/Miami_Streets" }, withgeo: true } },
    where: [[{ col: "CLASS", test: "EqualAny", value: "1,2" }]]
  };
  return {
    id: "streets",
    visible: true,
    query,
    style: {
      method: "rules",
      rules: [
        { style: { fillColor: "#FFB5281C", width: 2 }, where: [[{ col: "CLASS", test: "Equal", value: 1 }]] },
        { style: { fillColor: "#FF3A7FC4", width: 1 }, where: [[{ col: "CLASS", test: "Equal", value: 2 }]] }
      ]
    }
  } as ml.ui.map.IMlUiLayerOptionsInterface;
}
```

**"I added a block-group population layer from ml_samples/Miami_Census_Block_Group_2020 and now the whole map is blank, including the streets that worked before."** Suspect the new layer, not the map: a layer that fails at tile time blanks every composited layer. Switch the new layer off; if the streets return, fetch one tile for the new layer on its own and read the message, or make an extents call on its hash if the tile carries only an opaque reference. For a population ramp the usual causes are a top keyframe at percentile 100 (`Index was outside the bounds of the array.`) or a ramp column the nested `sqlselect` left out (`Could not get column stats for POP100`). The fix is a top keyframe at 99 and `POP100` in the projection:

```ts
table: { query: { table: { name: "ml_samples/Miami_Census_Block_Group_2020" }, sqlselect: ["GEOID", "POP100"], withgeo: true } }
// ...
keyframes: [
  { position: 0, positionType: "Percentile", value: "#CCFFF3D9" },
  { position: 50, positionType: "Percentile", value: "#CCF59E42" },
  { position: 99, positionType: "Percentile", value: "#CCB5281C" }
]
```

Then fetch a tile again and confirm it is an image well above 350 bytes before switching the other layers back on.

**"Shade each census block group by how many bus stops it contains."** Aggregate on the server with a spatial `Overlap` join from the polygons to `ml_samples/Miami_Busstops`, count a real column, and ramp on the count with 8-digit colors and a top keyframe at 99:

```ts
{
  id: "stopsPerBlockGroup",
  visible: true,
  query: {
    select: { type: "geo.poly", column: "Miami_Census_Block_Group_2020" },
    table: {
      query: {
        table: { name: "ml_samples/Miami_Census_Block_Group_2020" },
        sqlselect: ["GEOID", "count(StopID) as Stops"],
        join: {
          leftcolumn: "Miami_Census_Block_Group_2020", method: "Overlap", rightcolumn: "XY",
          table: { name: "ml_samples/Miami_Busstops" }
        },
        withgeo: true
      }
    }
  },
  style: {
    method: "dynamic",
    rules: [{ style: { fillColor: { column: "Stops", interpolateMode: "Linear", keyframes: [
      { position: 0, positionType: "Percentile", value: "#B3FFF3D9" },
      { position: 50, positionType: "Percentile", value: "#B3F59E42" },
      { position: 99, positionType: "Percentile", value: "#B3B5281C" }
    ] } } }]
  }
}
```

Only block groups containing at least one stop draw (1,384 of 1,843), because the join keeps only polygons with a match; add an unjoined block-group layer underneath if the empty ones should show. Count a named column: a bare `Count()` in a join aggregate is moved into the response totals, so the result has no `Stops` column for the ramp to read.

## Hand-offs

- Map options, base layers, the `data` binding, map events and control wiring: use the `raptor` skill.
- Choosing between JSON, fluent and SQL query forms, and query data access in general: use `adk-query-dev`.
- Aggregation expressions, filter-test semantics and differences between query endpoints behind a layer's query: use `maplarge-query-dialect`. Raster bands, NoData and grid functions are in its `reference/raster.md`.
- 3D terrain from an elevation raster: the `raptor` skill's `reference/controls/map-3d-layers.md`.
- Building, packaging and serving the extension the layer lives in: use `adk-extension-dev`.
