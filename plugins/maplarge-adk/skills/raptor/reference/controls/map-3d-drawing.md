# Drawing on the 3D globe

Letting users draw on a `RaptorMap` that is a Cesium globe (`mapOptions.api: ml.ui.map.api.CESIUM`): which of MapLarge's two drawing systems to use there, which shapes each one draws, the gestures, the WKT each hands back, turning a drawn shape into a filter, and what survives a reload or a switch to 2D. This page covers the globe only; the toolbar's options in general are not repeated here.

The behaviors on this page were run in a browser, with real button clicks and mouse gestures, against MapLarge Server 4.131, 4.139 and 4.142, except where a sentence says otherwise. The list of types that throw was run by calling the tools directly. The filter queries need a table and were run against 4.139 and 4.142. `ml.version` in the browser console shows a server's version.

## When to use

A drawing tool on a 3D map; draw-to-filter on a globe; a `drawingToolbar` or `globalGeoFilter` whose map has `api: CESIUM`; `drawingsVersion: 2` on a globe; the console message `Drawing type ... not supported.`

## At a glance

MapLarge has two drawing systems. V1 is the default. V2 is turned on with `drawingsVersion: 2`. Both draw on the globe, and they differ more there than in 2D.

| On the globe | V1 (default) | V2 (`drawingsVersion: 2`), Server 4.139 and later |
| --- | --- | --- |
| Shapes that draw | Polygon, rectangle, circle, polyline, marker. Every other type throws. | Every toolbar type. An image draws its frame without the picture. |
| Styling | None. Shapes are white at 70 percent. | `drawingStyle` applies, and looks the same as in 2D. |
| The `change` event delivers | `{ wkt, drawingObject, drawing }` | The drawing object. Call `drawing.toWKT()`. |
| A circle's WKT | A 361-point `POLYGON((...))` | `CIRCLE(lng lat, meters)`, or the polygon with `toWKT(true)` |
| Kept in `map.save()` and across a full map reload | No | Yes |
| Kept across a switch between 2D and 3D | No | Yes |
| Editing a finished shape | No | Click to select, drag a vertex to reshape |
| Toolbar undo and clear | Do not remove the shape | Work |
| Toolbar eye button | Works | Does nothing |
| To turn on | Nothing | `drawingsVersion: 2` on the map and on the toolbar |

**Which to use.** On Server 4.139 and later use V2, unless the five V1 shapes are all you need and you never style, edit, save or switch. On Server 4.131 stay with V1: V2 draws there, but as gray fills with no outlines, and it loses every shape on a switch.

**Use a `drawingToolbar` for draw-to-filter; do not rely on `globalGeoFilter`.** In the test page `globalGeoFilter` started the same tools and fired `change`, but wrote nothing to its bound data or to the data store's global filters, on the globe and in 2D alike. That page registered no data sources, and no case was found where it does write, so this is unconfirmed. Build the filter yourself from the `change` event, as below.

A "full map reload" on this page is the map rebuilding itself, as it does on a switch between 2D and 3D. It is not a browser refresh.

## V1 on the globe

**Give the toolbar an explicit `tools` list from the five shapes that draw.** With no `tools` the toolbar shows a single freehand-polygon button, and clicking it on the globe throws `Drawing type freehandpolygon not supported.` The user sees nothing: no message and no tool.

```ts
s.drawingToolbar({
    viewName: "drawTools",
    mapView: "mainMap",
    tools: [ml.data.drawing.DrawingType.Polygon, ml.data.drawing.DrawingType.Rectangle, ml.data.drawing.DrawingType.Circle],
    hideUndoButton: true, hideClearButton: true,
    events: [{ event: "change", handler: "onDrawn" }],
});

// ViewModel: the result is the handler's first argument.
// IDrawingResult is imported from raptor/raptorDom/controls/DrawingToolbar/DrawingToolbarViewModel.
public onDrawn(result: IDrawingResult): void {
    this.showStopsInside(result.wkt);
}
```

- **Five types draw: `Polygon`, `Rectangle`, `Circle`, `PolyLine` and `Marker`.** Every other `DrawingType` throws, including `FreehandPolygon`, `FreehandPolyline`, `RadiusCircle`, `Ellipse`, `OrientedBox`, `Label`, `Measure`, `Image` and `Point` (use `Marker`).
- **The gestures are not the 2D ones.** A rectangle or circle is two clicks; a drag pans the globe and draws nothing. A polygon or polyline is finished by clicking its last point again, or double-clicking it. Clicking the first point does not close a polygon.
- **Hide the undo and clear buttons.** On the globe they make the toolbar forget a shape but leave it drawn. Remove V1 shapes with `map.removeAllDrawings()`, or keep `result.drawing` and call its `destroy()`.
- **`drawingStyle` has no effect.** Shapes are always white at 70 percent, which cannot be seen on a white base map.
- **Shapes are not part of the map's state.** They are not in `map.save()`, so a full map reload or a switch to 2D drops them, while the toolbar's buttons stay enabled as if the shape were still there. Keep the WKT from the `change` event if a shape has to survive.
- **A finished shape cannot be edited.**
- **A shape drawn across the 180 degree meridian comes back inside out.** A rectangle 5 degrees wide returned a box 357 degrees wide.

## V2 on the globe

**Set `drawingsVersion: 2` on the map options and on the toolbar, to be safe.** A V2 toolbar on a map without the flag throws `V2 DrawingManager not available.` on every version. A toolbar without the flag on a V2 map works only in some arrangements:

- **On Server 4.139 and 4.142 the toolbar reads the map's flag first, but only when it initializes and when its `map` is assigned** (from the client code). In the test it picked the flag up in one arrangement of four: the flag on the map node's own `mapOptions`, with the toolbar declared before the map in the view. With the flag only in the bound map state, or with the toolbar declared after the map, the map did not exist yet at that moment, so the toolbar got the V1 view model and its first click threw.
- **On Server 4.131 the toolbar reads only its own flag when it initializes,** so it threw in all four.
- **Assigning the toolbar node's `map` once the map exists picks the right view model** on all three versions.

```ts
const drawGlobe: ml.ui.map.iMapOptions = {
    api: ml.ui.map.api.CESIUM,
    drawingsVersion: 2,
    lat: 25.77, lng: -80.19, z: 10,
    searchBox: false,
};
const redArea: ml.drawing.PolygonDrawingStyle = { stroke: "#ff0000", strokeOpacity: 1, strokeWidth: 4, fill: "#ff0000", fillOpacity: 0.3 };

s.drawingToolbar({
    viewName: "drawTools",
    mapView: "mainMap",
    drawingsVersion: 2,
    tools: [ml.data.drawing.DrawingType.Polygon, ml.data.drawing.DrawingType.Rectangle, ml.data.drawing.DrawingType.Circle, ml.data.drawing.DrawingType.FreehandPolygon],
    drawingStyle: redArea,
    hideVisibilityToggle: true,
    events: [{ event: "change", handler: "onDrawnV2" }],
});

// ViewModel: the drawing itself is the handler's first argument. It has no wkt property.
public onDrawnV2(drawing: ml.drawing.UnifiedDrawing): void {
    const wkt = drawing.toWKT();
    if (typeof wkt === "string") this.showStopsInside(wkt);
}
```

- **Every toolbar type draws,** including freehand shapes, ellipses, labels and measurements. An image drawing shows its frame but not its picture.
- **Style keys are `stroke`, `strokeOpacity`, `strokeWidth`, `fill` and `fillOpacity`.** The older `color`, `width` and `opacity` do nothing.
- **Gestures match V2 in 2D.** A rectangle or circle is two clicks or a drag. A polygon finishes on a double-click, a second click on its last point, or a click on its first point. Freehand is a drag.
- **Shapes are part of the map's state.** They are in `map.save().drawingsV2`, come back after a full map reload, and cross a switch between 2D and 3D in both directions.
- **To bring shapes back after a browser refresh, store that state yourself.** `map.save().drawingsV2` is plain JSON. Put it back in the `mapOptions` the map is built from, together with `drawingsVersion: 2`, and the globe draws the shapes again.
- **A finished shape can be selected and reshaped:** click it, then drag a vertex. Dragging its body moves it on Server 4.142; on 4.139 that pans the globe.
- **Hide the eye button.** It does not hide V2 drawings. Undo and clear work.
- **There is no mouse or keyboard delete on the globe.** Remove a shape in code.

Working with V2 drawings in code goes through the map's drawing manager:

```ts
const manager = this.raptorDom.nodeT<RaptorMap>("mainMap").map.getDrawingManagerV2();
manager.removeDrawing(drawing);
manager.setDrawingVisible(drawing, false);
manager.addDrawing({ type: "circle", crs: "EPSG:4326", geometry: { cX: -80.19, cY: 25.77, r: 5, rUnits: "km" }, style: { stroke: "#ff0000", strokeWidth: 2 } });
```

A toolbar that ended up with the V1 view model throws on a V2 map. On a V2 map remove shapes through the manager.

## Draw to filter

The server accepts the WKT exactly as the event delivers it, wrapped as `WKT(<wkt>),COL(<geometry column>)`. Without the wrapper the query is a server error. `busStops` below is a server layer whose table has a point column `XY`, such as `ml_samples/Miami_Busstops`.

```ts
private showStopsInside(wkt: string): void {
    const inside = { ...busStops, query: { ...busStops.query, where: [[{ col: "XY", test: "Overlaps", value: `WKT(${wkt}),COL(XY)` }]] } } as ml.ui.map.IMlUiLayerOptionsInterface;
    this.mapState = { ...this.mapState, layers: [inside] };
    this.update("mainMap");
}
```

| Drawn on the globe | V1 `result.wkt` | V2 `drawing.toWKT()` |
| --- | --- | --- |
| Polygon, rectangle | `POLYGON((lng lat,...))` | `POLYGON((lng lat,...))` |
| Circle | `POLYGON((...))` with 361 points | `CIRCLE(lng lat, meters)` |
| Polyline | `LINESTRING(lng lat,...)` | `LINESTRING(lng lat,...)` |
| Marker | `POINT(lng lat)` | `POINT(lng lat)` |

- **Use `Overlaps` for a drawn area, and `DWithin:<meters>` for a drawn line or marker.** A point almost never lies exactly on a line, so against a point column `{ col: "XY", test: "DWithin:2000", value: ... }` is the test that matches rows near it.
- **Code that parses the WKT itself must accept both polygon forms.** The 2D V1 tools write a single-parenthesis `POLYGON(lng lat,...)` and a `CIRCLE(lng lat,meters)`; the globe writes the standard double-parenthesis form.
- **Numbers can be in exponent notation,** for example `POINT(0 8.032449967771706e-19)`.
- **`drawing.toWKT()` is declared to return a string, an array or `null`,** so check for a string.

## Other rules

- **On a page with two maps, a V1 toolbar draws on the map created last, whatever its `mapView` says.** Set the toolbar node's map once the map exists: `this.raptorDom.nodeT<DrawingToolbar>("drawTools").map = this.raptorDom.nodeT<RaptorMap>("mainMap").map;` (`DrawingToolbar` is imported from `raptor/raptorDom/controls/DrawingToolbar/DrawingToolbar`).
- **The map's own drawing panel never shows on a globe.** `mapOptions.drawingTools: true` does nothing there. The drawing toolbox that a map with `showEditor` offers lists the five V1 shapes.
- **Change drawings through the map, not through the bound options.** On Server 4.139 and later a changed `drawings` or `drawingsV2` in the bound `mapOptions` is ignored on a live map.
- **A V1 shape drawn in 2D is not shown on the globe.** On Server 4.139 and later it stays in the map's options and comes back when the map returns to 2D.
- **Drawing works in Cesium's 2D and Columbus scene modes.** V2 was also run on a tilted view. Shapes lie on the surface; there is no height.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Console shows `Drawing type freehandpolygon not supported.` and nothing happens | A V1 toolbar with no `tools` list, or a V1 tool the globe does not have | List the five V1 shapes, or switch to V2. |
| A drag pans the globe and draws nothing | V1 rectangles and circles are two clicks | Click twice, or use V2. |
| Undo and clear leave the shape on the globe | V1 toolbar buttons do not remove globe shapes | Hide them and call `map.removeAllDrawings()`, or use V2. |
| The shape cannot be seen | V1 shapes are white; the base map is light | Use a dark base map, or V2 with a style. |
| Code that reads `CIRCLE(` gets a polygon | V1 circles on the globe are polygons | Accept both, or use V2. |
| `V2 DrawingManager not available.` | A V2 toolbar on a map without `drawingsVersion: 2` | Set it in the map options. |
| `Cannot read properties of undefined (reading 'enableDrawing')` | A toolbar without its own `drawingsVersion: 2` did not pick up the map's flag, because the map did not exist yet when the toolbar initialized (always the case on Server 4.131) | Set `drawingsVersion: 2` on the toolbar as well. |
| The shape is drawn on the other map | Two maps on the page | Set the toolbar node's `map`. |
| Shapes vanish on a switch to 2D | V1 globe shapes are not part of the map's state | Keep the WKT, or use V2. |
| Clicking the first point does not close a polygon | The V1 gesture on the globe | Click the last point again, or double-click it. |
| A shape across the 180 degree meridian selects nearly the whole world | V1 returns it inside out | Draw one shape on each side of the meridian (not run). |
| `globalGeoFilter` draws but nothing is filtered | It wrote no filter in the test (unconfirmed) | Use a `drawingToolbar` and build the filter from `change`. |
| Shapes are gone after a browser refresh | Nothing stores them for you | With V2, store `map.save().drawingsV2` and build the map from it. |

## Version differences

| Behavior | 4.131 | 4.139 | 4.142 |
| --- | --- | --- | --- |
| V1 on the globe | Five shapes | Same | Same |
| V2 on the globe | Draws, but as gray fills with no outlines; images paint nothing | All types, styled | Same as 4.139 |
| V2 shapes across a 2D and 3D switch | Lost | Kept | Kept |
| Dragging a V2 shape's body | Pans the globe | Pans the globe | Moves the shape |
| A V1 shape drawn in 2D, after a switch to 3D and back | Lost | Comes back in 2D | Comes back in 2D |
| `DrawingType` values | 14 | 16 (`EllipticalArc` and `Spline` added) | 16 |
| A toolbar without the flag picks up the map's `drawingsVersion` | Never when it initializes | In one arrangement of four (see "V2 on the globe") | Same as 4.139 |

## Related

- `drawing-toolbar.md`: drawing toolbar options, events and patterns, written for the 2D map.
- `map-3d.md`: turning the globe on, switching 2D and 3D, the camera, the Cesium viewer.
- `map-3d-layers.md`: how layers render on the globe.
