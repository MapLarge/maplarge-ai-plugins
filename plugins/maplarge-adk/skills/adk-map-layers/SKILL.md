---
name: adk-map-layers
description: Authoring and debugging server-side and client-side map layers in a MapLarge ADK extension. Covers the layer query shape (a nested table query with withgeo, an explicit geometry column, where placement), the create-then-tile render path and why one broken layer blanks every composited layer, mistakes that pass layer creation and then fail every tile, how style rules match, the color formats the tile renderer accepts, and client-side geo.client layers. Use when a layer draws nothing, the map shows base tiles only, every layer vanished after adding one, tiles return HTTP 500, a choropleth or ramp draws wrong, colors come out in the wrong hue, or when adding a layer to a Raptor map. Triggers on "layer draws nothing", "map is blank", "base map only", "layer not showing", "tile 500", "Index was outside the bounds of the array", "Unknown JSON attribute", "is not found in any table source", "choropleth", "dynamic ramp", "withgeo", "select.column", "style rules", "fillColor", "geo.client.dot".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "ARC-75"
  verified-against: "MapLarge Server 4.139 (docs host): 48 layer behaviors re-run live on the create-then-tile render path and the JSON query route against ml_samples/Miami_* tables, each in at least 3 distinct requests, plus the grounding query through the CLI on 4 tables, 2026-09-29 (ARC-75); map wiring and client-side layer behavior read from the 4.139 framework bundle"
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

Two mistakes are refused at create instead, so the layer never gets a hash and drops out of the composite:

| In the layer | Create | Message |
| --- | --- | --- |
| `opacity` in a style, at the style root or inside a rule's `style` | HTTP 500 | `Unknown JSON attribute in query style clause: opacity`. The style schema has no `opacity`; put the alpha in the color instead. |
| `alias` inside a nested join query, `join.table: { query: { ..., alias } }` | HTTP 500 | `Unknown JSON attribute in query-query clause: alias`. The JSON query route refuses it too. A table reference with an alias, `join.table: { name, alias }`, is accepted. |

## Style rules on the tile path

- **The first matching rule wins.** Two rules matching the same rows drew exactly what the first drew alone, in either order, and a catch-all placed first took every row. Put specific rules first and a catch-all last. The style's `ruleMatchMode` changes this: `"Last"` drew the last matching rule instead.
- **A row that matches no rule is not drawn.** With a single rule for class 1 on a layer selecting classes 1 to 3, the tile drew about what a layer selecting class 1 alone draws, a fraction of what giving every class a rule draws. Cover every row the `where` selects, or use a catch-all as the last rule.
- **Rules see the nested query's result, not the base table.** A rule or a ramp column naming a column the nested `sqlselect` leaves out fails every tile (see the table above), so project every column the style names. A layer with no nested `sqlselect` has every base column available.
- The catch-all can be written `where: { col: "*", test: "CatchAll", value: 0 }`; the string `"CatchAll"` and the nested form `[[{ col: "*", test: "CatchAll", value: 0 }]]` drew identical tiles.

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

## Client-side layers

When the data lives in the browser, the layer's `query.table.retrieveData` callback returns `{ columns, data }` rows, and the select type is one of `geo.client.dot`, `geo.client.line`, `geo.client.poly` or `geo.client.heat`. There is no `geo.client.point`: any other type throws `Layer options not supported for clientside layer.`

- **Coordinates are `[lat, lng]`.** The client-side adapter swaps each pair into GeoJSON order itself, so rows written in GeoJSON order land transposed.
- **Geometry type comes from array depth**: depth 1 is a point, 2 a line, 3 a polygon, 4 a multipolygon. A depth-2 array on a `geo.client.poly` layer is wrapped into a polygon, a depth-2 array on a dot layer becomes a multi-point, and a depth-3 array on a line layer becomes a multi-line; other mismatches keep the type their depth implies, so match the depth to the layer type.
- **Style rules match the column names you return.** The geometry column defaults to the name `geom`. Unlike the tile path, every matching rule is collected for a row, and a row matching none gets no style, so keep client-side rules mutually exclusive and complete. An unrecognized `test` here falls through to a catch-all that matches every row, where the same typo in a server-side layer fails every tile. Several tests the server does support, among them `Overlaps`, `DWithin` and `DayOfWeek`, have no client-side implementation and fall through the same way (read from the framework code), so filter client-side rows before returning them rather than with those tests.
- **A changed callback alone does not redraw.** The map compares new layer options with the previous copy and treats any two functions as equal, so if only the `retrieveData` callback changed between updates the layer is not reloaded and keeps showing old data. Change a primitive on the layer options object alongside the data, for example a frame counter under `_meta`, which is declared as consumer metadata that MapLarge does not act on. Hiding and showing the layer does reload it, because `visible` is a primitive and the comparison catches the change.

## Examples

**"Show the major roads from ml_samples/Miami_Streets, classes 1 and 2 in different colors."** Nested query with `withgeo`, the line column named, the class filter at the outer level, and one rule per class so every selected row matches exactly one rule:

```ts
// client/layers/streetsLayer.ts
export function streetsLayer(): ml.ui.map.IMlUiLayerOptionsInterface {
  return {
    id: "streets",
    visible: true,
    query: {
      select: { type: "geo.line", column: "Miami_Streets" },
      table: { query: { table: { name: "ml_samples/Miami_Streets" }, withgeo: true } },
      where: [[{ col: "CLASS", test: "EqualAny", value: "1,2" }]]
    },
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
- Aggregation expressions, filter-test semantics and differences between query endpoints behind a layer's query: use `maplarge-query-dialect`.
- Building, packaging and serving the extension the layer lives in: use `adk-extension-dev`.
