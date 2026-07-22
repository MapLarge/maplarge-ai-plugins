# Raptor Drawing Toolbar & Geo Filtering

A ribbon of map-drawing buttons bound to a RaptorMap, plus a geo-filter variant that converts drawings into Overlaps/NotOverlaps query clauses. See parent `raptor` for View/VM split, `update()`, and `RSScriptor.create`; `map.md` for the map itself.

## When to use
- Let users draw shapes (polygon, rectangle, circle, point, line) on a map to select or filter features ("draw to select").
- Read back the drawn geometry as WKT and react to it (change event / bound VM property).
- Provide visibility-toggle, undo, and clear-all controls for drawings.
- `globalGeoFilter` when the drawing should directly become a spatial WHERE filter (Overlaps) on the dashboard's data.

## Builder
Two builder methods, two node `type`s:

- `s.drawingToolbar(options: IDrawingTool)` -> node type `"drawingToolbar"`, svgKey `mlsvg-drawingtools`.
- `s.globalGeoFilter(options: IGlobalGeoFilter)` -> node type `"globalGeoFilter"`, svgKey `mlsvg-geofilter-outline`. Its render func internally renders a `drawingToolbar`, so all the same options apply.

Key fields on `IDrawingToolOptions` (which `IDrawingTool` and `IGlobalGeoFilterOptions` extend; it also extends `ViewDefinitions.IButton`):

| Field | Type | Meaning |
|---|---|---|
| `tools` | `DrawingType[]` | Which draw buttons to render, in order. Defaults to a single `FreehandPolygon` if omitted. |
| `mapView` | `string` | viewName of the target `raptorMap`. If omitted, uses `ml.ui.map.last`. |
| `keepDrawings` | `boolean` | Keep prior drawings when a new one is made (default true; set `false` to replace). |
| `iconSize` | `number` | Button icon px (default 14). |
| `hideVisibilityToggle` | `boolean` | Hide the show/hide-eye button. |
| `hideUndoButton` | `boolean` | Hide the undo button. |
| `hideClearButton` | `boolean` | Hide the clear-all (trashcan) button. |
| `drawingStyle` | `IDrawingStyle` | `{ color?, width?, opacity? }` stroke styling (V1). |
| `events` | `Events.IEvent_DrawingToolbar[]` | Event handlers (see below). |
| `drawingsVersion` | `number` | `2` selects the V2 unified-drawing VM; otherwise V1. Migration flag — usually inherited from the map's `mapOptions.drawingsVersion`. |

```ts
const s = RSScriptor.create<MyVm>();
s.raptorMap({ viewName: "myMap" /* ... */ });
s.drawingToolbar({
    viewName: "myDrawTools",
    mapView: "myMap",
    tools: [
        ml.data.drawing.DrawingType.Rectangle,
        ml.data.drawing.DrawingType.FreehandPolygon,
        ml.data.drawing.DrawingType.RadiusCircle,
    ],
    keepDrawings: false,
    events: [{ event: "change", handler: "onDrawn" }],
});
```

`DrawingType` (`ml.data.drawing.DrawingType`) values: `FreehandPolygon`, `Polygon`, `Rectangle`, `OrientedBox`, `Circle`, `RadiusCircle`, `Ellipse`, `PolyLine`, `FreehandPolyline`, `Point`, `Marker`, `Label`, `Measure`, `Image`. `ml.data.drawing.drawingTypeOptions[type]` maps each to its `{ name, svg }` (tooltip + icon).

## Bindings & events
The toolbar registers its VM for scoped bindings, so child buttons bind to VM getters:
- `enable: "canUndo"` (undo button), `enable: "canClear"` (clear + visibility buttons).
- `tooltip: "drawingToolbar.showHideTooltip"` (visibility button tooltip flips Show/Hide).

Events use `Events.IEvent_DrawingToolbar` (`{ event, handler }`). The supported event is `"change"`, fired after a drawing finishes; the handler receives the drawing result (V1 `IDrawingResult` `{ wkt, drawingObject, drawing }`, V2 `ml.drawing.UnifiedDrawing`). It also accepts pointer/keyboard/context-menu event types inherited from `IEvent_Button`.

## ViewModel / instance API
Reach the node via `raptorDom.nodeT<DrawingToolbar>("myDrawTools")` (or `GlobalGeoFilter`). The node delegates to an internal abstract `DrawingToolbarViewModel` (concrete `DrawingToolbarV1ViewModel` using `ml.ui.map.RegionSelect`/`IDrawing`, or `DrawingToolbarV2ViewModel` using `getDrawingManagerV2()`/`UnifiedDrawing`), chosen by the map's `drawingsVersion`.

Useful node members:
- `drawingResult` — last `IDrawingResult | ml.drawing.UnifiedDrawing`.
- `drawings` (V1) — `IDrawings` `{ last, all: ml.ui.map.IDrawing[] }`.
- `currentDrawingState` (V1) — `IDrawingState` `{ drawings }`.
- `drawingsVisible`, `visibilityButtonSvgKey`.
- `map` — resolved `ml.ui.map.Map` (throws if none found).
- `deleteDrawing(i)` (V1) — remove the i-th drawing.

VM (abstract) surface: getters `canClear`, `canUndo`, `drawingCount`, `drawingResult`, `drawingsVisible`, `showHideTooltip`; methods `beginDrawing(type)`, `undoDrawing()`, `clearDrawings()`, `drawingVisToggled(e)`, `handleDrawingFinished(result)`.

`GlobalGeoFilter extends DrawingToolbar`: adds `applyGlobalGeoFilters`, `addSavedGeoFiltersToMaps(globalFilterList)` (rehydrates saved `GlobalGeoFilter` clauses onto every `RaptorMap` on the page), and overrides `getRegionSelectOptions` to push the drawing as bound data.

## Patterns
1. **Draw-to-select with WKT** — give a `change` handler; in the VM read `result.wkt` (V1) or `ml.transforms.GeoQuery.getWKT(result)` and feed it into a `createGeoQueryWhere(col, "Overlaps", wkt, "Column within Shape")` filter applied via your data store.
2. **Single replaceable selection box** — `tools: [DrawingType.Rectangle]`, `keepDrawings: false`, `hideUndoButton: true` so each draw replaces the prior shape.
3. **Saved global geo filter** — use `s.globalGeoFilter(...)`; persist the `GlobalGeoFilter` clause list and call `addSavedGeoFiltersToMaps()` on load to redraw and re-apply.
4. **Overlaps/NotOverlaps multi-shape filter** — `util.drawing.getWhereClauseFromDrawing(state, { overlaps }, column, layerData)` builds the include/exclude WHERE matrix (include shapes ORed, exclude shapes ANDed into each); `overlaps[i] === false` marks shape i as NotOverlaps.

## Gotchas
- The toolbar needs a map: it uses `mapView`, else the node named in it, else `ml.ui.map.last`. With multiple maps, always set `mapView` or you may bind to the wrong one.
- V1 vs V2 diverge: V1 exposes `drawings`/`currentDrawingState` and per-drawing `show()/hide()`; V2 returns empty stubs for those and manages drawings through `map.getDrawingManagerV2()`. Check which version your map runs before relying on V1-only members.
- V2 `beginDrawing` throws if the map's `mapOptions.drawingsVersion !== 2` (no V2 DrawingManager). Keep `drawingsVersion` consistent between map and toolbar.
- Undo/clear/visibility buttons start `disabled` and are enabled via the `canUndo`/`canClear` bindings only after the VM is registered and a drawing exists — don't enable them manually.
- `change` only fires on draw completion, not on every vertex/move.

## Related skills
- `raptor` (parent), `map.md` (the map these tools attach to), `svg.md` (the button/toolbar icons), `button.md` (the underlying `IButton` options).
