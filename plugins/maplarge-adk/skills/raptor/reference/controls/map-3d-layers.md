# Layers on the 3D globe

How each kind of MapLarge layer renders once a `RaptorMap` is a Cesium globe (`mapOptions.api: ml.ui.map.api.CESIUM`): which layers are draped flat, how to put features at a real height, how to add 3D Tiles, CZML files and models, what colors mean in each layer kind, and what one failing layer does to the rest. This page covers the globe only; layer queries and styles in general are not repeated here.

The behaviors on this page were run in a browser against MapLarge Server 4.139 and 4.142, except where a sentence says otherwise. The layers that need no table (client-side layers, entities layers and external services) were also run on 4.131, with the same results. Most server-layer results come from a map built with the classic JavaScript API, which fetches tiles over HTTP. A Raptor map on a server whose tile transport is WebSockets (the 4.142 test server) was run for draping, hide and show, a tile-failing layer, `mapOptions.ignoreErrors`, click and hover. The layer `opacity`, `zIndex`, `disableComposite`, `mapOptions.composite: false`, the layer-level `ignoreErrors` and the `geo.line` difference under "Version differences" were not run on that transport. `ml.version` in the browser console shows a server's version.

## When to use

A layer that should show on a 3D map; features placed at altitude; a `special.type` of `CesiumXYZLayer` or `CesiumEntitiesLayer`; a layer `czml` option; a `service.type` of `CESIUM3DTILESET`, `CZML` or `IMAGEOVERLAY`; a glTF model; terrain from a raster layer; layers that vanish or ignore `opacity` on the globe.

## At a glance

| Layer | How it draws on the globe | Height | MapLarge click and hover |
| --- | --- | --- | --- |
| Server layer (a `query`) | Draped on the surface. All visible server layers share one image, the composite. | Flat, whatever a column holds | Yes |
| Client-side layer (`geo.client.*`) | Draped on the surface, one image layer each | Flat | Dot, polygon and heat: yes. Line: no. |
| Server layer with a `czml` option | Cesium entities streamed from the server | From a column | Click: only with `skipCustomProperties: true`. Hover: no. |
| `special` `CesiumXYZLayer` | Points, lines or polygons built from a column of 3D WKT | From the WKT, in meters | No |
| `special` `CesiumEntitiesLayer` | Cesium entities you build, including glTF models | Yours | No. Cesium's own selection still works. |
| External `service`: `CESIUM3DTILESET`, `CZML` | A Cesium tileset or data source | From the file | Not run |
| External `service`: `XYZ`, `WMS`, `WMTS`, `IMAGEOVERLAY` | Draped imagery | Flat | Not run |

A `special` layer in the list draws nothing on a 2D map and does not disturb the other layers, so a map that switches between 2D and 3D can keep one layer list. On Server 4.139 a `special` layer left in the list sends tile requests of its own that fail while the map is 2D; leave it out of the list in 2D if that noise in the network log matters. Server 4.131 sends none. On the 4.142 test server only HTTP requests were watched, and its Raptor maps fetch tiles over a WebSocket, so that case is open.

## Draped layers

**A server layer needs no change for the globe.** The same tiles the 2D map shows are draped over the surface as imagery.

```ts
const busStops = {
    id: "busStops",
    visible: true,
    query: {
        select: { type: "geo.dot", column: "XY" },
        table: { query: { table: { name: "ml_samples/Miami_Busstops" }, withgeo: true } },
    },
    style: { method: "rules", rules: [{ style: { fillColor: "#E6D64545", size: 6 }, where: { col: "*", test: "CatchAll", value: 0 } }] },
} as ml.ui.map.IMlUiLayerOptionsInterface;

this.mapState = { ...this.mapState, layers: [busStops] };
this.update("mainMap");
```

- **Features lie flat on the surface.** A flight recorded at 35,000 ft paints at its ground position. Use one of the routes under "Features at a real height" to lift it.
- **Tiles stop at 85.05 degrees north and south** under the default Web Mercator projection. With `projection: "wgs84"` the same layers are fetched as WMS tiles on a geographic grid and reach the poles.
- **All visible server layers are fetched as one shared image, the composite.** The options `disableComposite` and `mapOptions.composite` refer to it. The last layer created is on top; `zIndex` reorders them.
- **The layer `opacity` option does nothing to a server layer** on the globe, because the layer is part of the composite. Put the transparency in the style color (`#80FF0000` is half-transparent red), or take the layer out of the composite with `disableComposite: true`, after which `opacity` works. `opacity` also works on external imagery (run on an `XYZ` layer) and, through `layer.opacity.set(...)`, on a `CesiumXYZLayer`; it does nothing on an entities layer.
- **Each client-side layer is its own image layer,** outside the composite. A `geo.client.line` layer paints but takes no click or hover; that is the same on the 2D map.
- **Replace a layer object to change it.** `layers[i].visible = false` followed by an update works once and is ignored from then on, because the map node compares the layer against the same object. Assign `{ ...layer, visible: false }` instead.

## Colors

The same eight hex digits mean different colors in different layer kinds.

| Where the color is written | 8-digit hex | Example |
| --- | --- | --- |
| Server layer style | Alpha first, `#AARRGGBB` | `#80FF0000` is half-transparent red |
| Client-side layer style | Alpha last, `#rrggbbaa` | `#FF000080` is half-transparent red; `#80FF0000` draws nothing |
| `CesiumXYZLayer` `appearance` | Alpha last, `#rrggbbaa` | `#ff000080` is half-transparent red |
| Entities layers and CZML files | Cesium's own types | `ml.Cesium.Color.RED` |

A layer with a `czml` option is still a server layer: its color comes from its style, alpha first. A six-digit hex is opaque everywhere. A decimal quad is alpha, red, green, blue everywhere: `"255-214-32-32"` is opaque red and `"214-32-32-255"` is blue. `rgba(255,0,0,0.5)` works in server, client-side and `CesiumXYZLayer` colors.

## When one layer fails

All visible server layers are fetched as one composite image, so one bad layer can blank the rest. Nothing is thrown in the page.

| The bad layer | The other server layers |
| --- | --- |
| Is refused when created (an unknown style key such as `style.opacity`, or a table that does not exist) | Still paint. The bad layer drops out. |
| Is accepted but its tiles fail (for example a `select.column` that does not exist) | **All blank** |
| Same, with `mapOptions.ignoreErrors: true` | Paint |
| Same, with `ignoreErrors: true` on the layer | All blank. The layer option does not reach the composite. |
| Same, with `disableComposite: true` on the bad layer, or `mapOptions.composite: false` | Paint |

To find the layer that fails, hide layers one at a time, or give the suspect `disableComposite: true`. `mapOptions.ignoreErrors: true` keeps the rest drawing, at the price of hiding the failure.

## Features at a real height

Four routes. Pick by what the data is:

| Route | Use it for | A click shows | Cost |
| --- | --- | --- | --- |
| The `czml` option | Rows of a server layer that has a height column | Cesium's info box, or the MapLarge balloon with `skipCustomProperties` | One Cesium entity per row, built in the browser |
| `CesiumXYZLayer` | Many points, lines or polygons, for display | Nothing | One query per 1,000 rows |
| `CesiumEntitiesLayer` | A few objects you build yourself, and models | Cesium's info box | Rebuilt on every update of the map view |
| A `service` layer | Data already in 3D Tiles or a CZML file | Not run | The file's own |

### A height column: the `czml` option

A server layer with a `czml` option leaves the composite and is streamed to the globe as Cesium entities, each at the height its row holds. The layer's query and style stay as they are.

```ts
const stopsAtHeight = {
    id: "stopsAtHeight",
    visible: true,
    query: {
        select: { type: "geo.dot", column: "XY" },
        table: { query: { table: { name: "ml_samples/Miami_Busstops" }, withgeo: true } },
        where: [[{ col: "StopID", test: "LessOR", value: 20 }]],
    },
    style: { method: "rules", rules: [{ style: { fillColor: "#FFD62020", size: 12 }, where: { col: "*", test: "CatchAll", value: 0 } }] },
    czml: { altitudeColumn: "StopID", altitudeUnits: "km" },
} as ml.ui.map.IMlUiLayerOptionsInterface;
```

`altitudeColumn` names any numeric column; the sample table has no height column, so this example uses `StopID`, and stop 13 is drawn 13 km up.

- **A click opens Cesium's info box, not the MapLarge balloon.** By default every column of the row travels with its entity, and a click lists them in Cesium's own info box; the layer's `onClick` is not called. With `czml: { ..., skipCustomProperties: true }` no row values are sent with the entities, the layer's `onClick` is called with the row, and the MapLarge balloon opens. `onHover` is not called either way.
- **Bound the layer with its `where`.** Every matching row becomes a Cesium entity in the browser, so a large layer belongs on the `CesiumXYZLayer` route.

### 3D WKT: `CesiumXYZLayer`

Draws points, lines or polygons from a string column of 3D WKT in longitude, latitude, height order, with the height in meters. `ToWKT3D(geoColumn, heightColumnOrNumber, unit)` in an `sqlselect` produces that column and converts the unit to meters: `ToWKT3D(XY, 0.5, 'km')` returns `POINT (-80.1597194373608 25.903050659151 500)`.

```ts
const xyzSpecial: ml.ui.map.CesiumXYZLayerSpecialOptions = {
    type: "CesiumXYZLayer",
    query: {
        table: { name: "ml_samples/Miami_Busstops" },
        sqlselect: ["ToWKT3D(XY, 0.5, 'km') as geom3d"],
        where: [[{ col: "StopID", test: "LessOR", value: 40 }]],
    },
    wktColumnName: "geom3d",
    renderGeoType: ml.data.map.layer.cesium.RenderGeoType.Point,
    appearance: { fillColor: "#ff0000ff", pixelSize: 8 },
};
const stops3d = { id: "stops3d", visible: true, special: xyzSpecial } as ml.ui.map.IMlUiLayerOptionsInterface;
```

- **Type the `special` object yourself.** The layer's `special` field is declared `any`, so only an explicitly typed object is checked.
- **Its `query` is a plain query:** a `table`, an `sqlselect` and a `where`. It does not need the `withgeo` wrapper a draped layer's table takes.
- **`ToWKT3D` works on line and polygon columns too.** Use `RenderGeoType.Polyline` with `appearance.strokeColor` and `strokeWidth`, or `RenderGeoType.Polygon` with `appearance.fillColor`. `ToLineWKT3D` is not the line version of `ToWKT3D`: it is an aggregate over several rows that takes an order-by argument (from the server code; that form was not run here). Called like `ToWKT3D` it is a server error.
- **Its cost is set by its `where`.** The layer sends one validation query, one count query, and then one query per 1,000 rows. A `take` inside `query` changes none of that, and the page size cannot be set.
- **`appearance.opacity` and `appearance.visible` are not read.** Use the layer's own `visible`, and put transparency in the color. An invalid color string draws nothing, with no error.
- **A `wktColumnName` that is not a string column raises an uncaught error,** and that layer then cannot be removed.
- **It takes no part in clicks or hover.**

### Your own Cesium entities and models: `CesiumEntitiesLayer`

Adds the entities returned by `constructorOptionsFunc()` as one layer that shows, hides and is removed like any other. This is also the way to place a glTF model.

```ts
const entitiesSpecial: ml.ui.map.CesiumEntitiesLayerSpecialOptions = {
    type: "CesiumEntitiesLayer",
    constructorOptionsFunc: () => [
        { id: "tower", name: "A point 2 km up", position: ml.Cesium.Cartesian3.fromDegrees(-80.19, 25.77, 2000), point: { pixelSize: 30, color: ml.Cesium.Color.RED } },
        { id: "model", position: ml.Cesium.Cartesian3.fromDegrees(-80.19, 25.77, 0), model: { uri: "https://example.com/model.gltf" } },
    ],
};
const myEntities = { id: "myEntities", visible: true, special: entitiesSpecial } as ml.ui.map.IMlUiLayerOptionsInterface;
```

- **Build `ml.Cesium` objects inside the function.** `ml.Cesium` does not exist until the first globe loads, and on a 2D map the function is never called.
- **In a Raptor map the layer is rebuilt each time the map view is updated** (`update("mainMap")`), and the function runs again. A pan or zoom by the user does not rebuild it. Keep the function cheap. The old entities are discarded, so anything your code set on them afterwards is gone.
- **MapLarge `onClick` is not called,** but Cesium's own picking works: a click selects the entity and opens Cesium's info box.
- **The layer `opacity` option does nothing here.** Set alpha on the entity's own colors.

### 3D Tiles and CZML files: external `service` layers

```ts
const tiles3d = { id: "tiles3d", visible: true, service: { type: "CESIUM3DTILESET", url: "https://example.com/tiles/tileset.json" } } as ml.ui.map.IMlUiLayerOptionsInterface;
const czmlFile = { id: "czmlFile", visible: true, service: { type: "CZML", url: "https://example.com/doc.czml" } } as ml.ui.map.IMlUiLayerOptionsInterface;
```

Both show, hide and are removed with the layer. `service.type` values `GEOJSON` and `VECTOR` are refused on the globe, as an uncaught promise rejection that a `try` around the layer does not catch.

## Imagery from other services

```ts
const xyz = { id: "xyz", visible: true, service: { type: "XYZ", url: "https://example.com/{z}/{x}/{y}.png", options: {} } } as ml.ui.map.IMlUiLayerOptionsInterface;
const wms = { id: "wms", visible: true, service: { type: "WMS", url: "https://example.com/wms", options: { layers: "demo", version: "1.3.0" } } } as ml.ui.map.IMlUiLayerOptionsInterface;
const overlay = { id: "overlay", visible: true, service: { type: "IMAGEOVERLAY", url: "https://example.com/overlay.png", options: { bounds: [-80.3, 25.7, -80.1, 25.85] } } } as ml.ui.map.IMlUiLayerOptionsInterface;
```

- **An `XYZ` service needs `options`, even an empty one.** Without it the page throws while reading `username` and nothing is added.
- **An `IMAGEOVERLAY` needs `options.bounds`,** as `[west, south, east, north]`. Without it the layer throws `Service options.bounds is not specified.`
- **Transparency goes on the layer.** The layer's `opacity` works (run on an `XYZ` layer); `service.options.opacity` does not.

## Terrain from a layer

A raster layer whose query sets `select.terrain: true` gives the globe its terrain as well as being draped as imagery. This was run on Server 4.142 only. The run used a rasterized point table, not an elevation raster, so the terrain heights were that raster's values. `myaccount/elevation` below stands for your own raster table.

```ts
const terrain = {
    id: "terrain",
    visible: true,
    query: { select: { type: "geo.raster", terrain: true }, table: { name: "myaccount/elevation" } },
    style: { rasterType: "pixel" },
} as ml.ui.map.IMlUiLayerOptionsInterface;
```

- **Hiding or removing the layer does not give the smooth globe back.** The terrain provider stays in place.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Every data layer vanished after one was added | That layer's tiles are failing | See "When one layer fails". |
| `opacity` does nothing | A composited server layer, or an entities layer | Alpha in the color, or `disableComposite: true`. |
| A color is wrong or missing | Alpha-first and alpha-last hex were mixed up | See "Colors". |
| Features are flat at ground level | Draped layers ignore height | Use the `czml` option or a `special` layer. |
| A client-side line cannot be clicked | Line layers take no click or hover | Use a polygon or dot layer for the click target. |
| `Cannot read properties of undefined (reading 'username')` | An `XYZ` service with no `options` | Add `options: {}`. |
| A click on a `czml` layer opens a Cesium box, not the MapLarge balloon | Entity properties are on | `czml: { skipCustomProperties: true }`. |
| Changes made to an entities layer's entities disappear | The layer is rebuilt from its function on every update of the map view | Make the change inside the function, or add the entities to the viewer yourself. |
| `Service options.bounds is not specified.` | An `IMAGEOVERLAY` service with no `options.bounds` | Add `bounds: [west, south, east, north]`. |
| An uncaught promise rejection after adding a `GEOJSON` or `VECTOR` service layer | Those service types are refused on the globe | Use a client-side layer. |
| An `Invalid wktColumnName` error, and the layer cannot be removed | A `CesiumXYZLayer` whose `wktColumnName` is not a string column | Name the `ToWKT3D(...)` alias. |
| The terrain stays after its layer is hidden | A terrain layer's provider is not removed with the layer | Call `hideTerrain()` on `map.mapAdapter`, cast to `ml.ui.map.MapCesium` (run with other providers, not after a terrain layer). |

## Version differences

| Behavior | 4.139 | 4.142 |
| --- | --- | --- |
| A `geo.line` layer whose `select.column` is a point column | Paints nothing itself; the other layers still paint | Blanks every server layer |

The layers that need no table (client-side and entities layers) behave the same on 4.131.

## Related

- `map-3d.md`: turning the globe on, switching 2D and 3D, the camera, the Cesium viewer, terrain from Cesium ion.
- `map-3d-drawing.md`: drawing on the globe.
- `map.md`: the map node and its layer bindings.
- The `adk-map-layers` skill: layer queries, styles and the tile path in general, on any map.

---

## Reference

### `special` for a `CesiumXYZLayer` (`ml.ui.map.CesiumXYZLayerSpecialOptions`)

| Field | Type | Meaning |
| --- | --- | --- |
| `type` | `"CesiumXYZLayer"` | |
| `query` | `ml.data.query.IQuery` | The rows to draw. A plain query; its `where` is the only bound. |
| `wktColumnName` | `string` | A string column of 3D WKT. |
| `renderGeoType` | `ml.data.map.layer.cesium.RenderGeoType` | `Point`, `Polygon` or `Polyline`. |
| `appearance` | `CesiumXYZLayerAppearanceParameters` | `fillColor`, `strokeColor` (alpha-last hex, `rgba()` or `rgb()`), `strokeWidth`, `pixelSize`. Defaults: half-transparent blue fill, black outline, size 5. |

### `special` for a `CesiumEntitiesLayer` (`ml.ui.map.CesiumEntitiesLayerSpecialOptions`)

| Field | Type | Meaning |
| --- | --- | --- |
| `type` | `"CesiumEntitiesLayer"` | |
| `constructorOptionsFunc` | `() => Cesium.Entity.ConstructorOptions[]` | Called when the layer is created on a globe. |

### `czml` (`ml.ui.map.LayerCzmlOptions`)

Only `altitudeColumn`, `altitudeUnits` and `skipCustomProperties` were run for this page. The rest are listed from the typings.

| Field | Meaning |
| --- | --- |
| `altitudeColumn` | Column holding the height. |
| `altitudeUnits` | Unit of that column, for example `"km"` or `"m"`. |
| `skipCustomProperties` | `true` sends no row values with the entities, and gives clicks back to MapLarge. |
| `startAltitudeColumn`, `endAltitudeColumn`, `extrudeHeight` | Heights for extruded shapes. |
| `pointToLine`, `groupByColumn`, `orderByColumn` | Join points into a line per group, in order. |
| `timeColumn`, `interpolationType`, `interpolationDegrees` | A path over time, from a date-time column. |
| `wallType` | `"None"`, `"WallOnly"` or `"Both"`. |
| `idColumn` | A unique id per entity, so updates change entities in place. |

### `service.type` on the globe

| Value | On the globe |
| --- | --- |
| `XYZ`, `WMS`, `WMTS` | Draped imagery. |
| `IMAGEOVERLAY` | One image draped over `options.bounds`. |
| `CESIUM3DTILESET` | A Cesium 3D Tiles tileset from `url`. |
| `CZML` | A CZML document from `url`. |
| `GEOJSON`, `VECTOR` | Refused. |
