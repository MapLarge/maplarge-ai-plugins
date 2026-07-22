# RaptorMap

An interactive geospatial map node — base map, vector/raster layers, drawing, click/right-click interaction, and reactive geometry/layer state driven from a ViewModel.

## When to use

Adding or editing a map in a Raptor view; defining or toggling layers; reaching the live map object to add click/draw/right-click listeners; zooming to a WKT geometry or layer extents; syncing multiple maps; coordinate/scale display; per-layer click balloons. For the standalone legend control see `legend.md`; for the draw-to-select toolbar see `drawing-toolbar.md`.

## Builder

`s.raptorMap(options)` emits a node of `type: "raptorMap"`. The option object is `ViewDefinitions.IRaptorMap`. The map needs a non-zero-height container, so its host (a `s.view` region or wrapping `div`) must have layout height.

Key option fields: `mapOptions` (an `ml.ui.map.iMapOptions`: `lat`, `lng`, `z`, `rotation`, `baseLayer`/`mlBaseLayer`/`service`, `layers`, `searchBox`, `drawingTools`), `bindings`, `events`, `legendOptions?` (`IRaptorMapLegendOptions`), `showEditor?` (boolean or `{ showLayerList, showMapOptions }`), `mapChrome?` (`IMapChrome` right-button group), `gridRef?` (`IMapGridRefOptions`), `nonInteractive?`, `noLegacyButtons?`, `borderColor?`/`borderWidth?`.

```ts
// View
const s = RSScriptor.create<MyVm>();
s.view("mainMap", s => s.div({ style:{ width:"100%", height:"100%" } })
  .contentTemplates(s => s.raptorMap({
    viewName: "mainMap",
    mapOptions: { lat: 38.9, lng: -77.0, z: 6 },
    bindings: { data: s.getTypedProp("mapState") }
  })));

// ViewModel (DynamicViewModel) — `data` binds an IRaptorMapOptions instance
private _mapState = new RaptorMapOptions(this);
public get mapState(): RaptorMapOptions { return this._mapState; }
```

The preferred binding is `data` → a `RaptorMapOptions` instance. The map reads `mapOptions` + `layers` from it on render, and writes pan/zoom/rotate back into it on map change (two-way). Construct it as `new RaptorMapOptions(this /* the VM */, initialData?)`.

## Bindings & events

`Bindings.IRaptorMapBinding`: `data` (`IRaptorMapOptions` — preferred, two-way), `mapOptions` (`ml.ui.map.iMapOptions`). `Bindings.IRaptorLayersBinding`: `layers` (**deprecated** — supply layers through the `data` object's `layers` instead). Plus `IRaptorUniversalBindings` (`visible`, `class`, …).

Events use `IEvent_RaptorMap` — `event` is a `PointerEventTypes` (`click`, `dblclick`, `mousedown`/`mouseup`, `mouseover`/`mouseout`, `pointer*`), `ContextMenuEventType` (`contextmenu`), or `KeyboardEventTypes`. These fire on the map container element. For *geographic* clicks (with lat/lng + clicked layer rows) prefer the imperative map listeners below, not DOM events.

## Node / instance API

Backing node class `RaptorMap` (`raptor/raptorDom/controls/Map/RaptorMap`, extends `RaptorNode`). Reach it after render with `this.raptorDom.nodeT<RaptorMap>("mainMap")`.

- `onMapCreated(cb: (rm: RaptorMap) => void)` — runs `cb` once the underlying `ml.ui.map.Map` exists (immediately if already created). The only safe place to attach listeners.
- `map: ml.ui.map.Map` — the live map (null until created).
- `waitForLayer(layerId, maxMs?) : Promise<void>` — resolve once a layer is loaded.
- `additionalLayers` (get/set) — extra layers merged on top of bound layers (auto-diffed/removed).
- `setLayerBalloon(layerId, config: IRaptorBalloonConfig)` / `removeLayerBalloon(layerId)` — custom Raptor click balloon per layer.
- `showDrawingTools()` / `hideDrawingTools()`, `showLegend()`, `resize()`, `zoomLevel`.

On `rm.map` (`ml.ui.map.Map`): `zoomToWKT(wkt, maxZoom?)`, `zoomToExtents(opts?) : Promise<...>`, `center` (`BindableLatLng`, `.get()`/`.set({lat,lng})`), `zoom` (`.get()`/`.set(z)`), `rotation`, `layers`, `save() : iMapOptions`, `load(iMapOptions)`, `updateBaseLayer(...)`, `invalidateSize()`, `getInternalMap()`, `getVisibleBB()` (`{minLat,maxLat,minLng,maxLng}`) / `getVisiblePolygon()` / `getVisibleProjectedBB()` (current viewport extent), `onError(cb)`, `onInternalMapAvailable(cb)`, `mouseMoved` (Knockout observable). Add a layer imperatively via `ml.layer(rm.map, layerOptions, onLoad?)`.

Click/right-click: `rm.map.addClickListener(fn) : {dispose}`, `addMultiClickListener(fn)`, `registerRightClickListener(key, opts)` + `addRightClickListener(key, listener)`. Pan/zoom: `rm.map.center.addChangeListener(fn)` / `rm.map.zoom.addChangeListener(fn)` (+ `removeChangeListener`) fire on every viewport change — the reactive analog to the click listener (debounce them for query-driving work). Draw events come from the drawing environment (`rm.map.mapDrawingInterface` / its drawing manager): `on('drawComplete', d => …)`, `'drawingChanged'`, `'drawingRemoved'` — see `drawing-toolbar.md`.

## RaptorMapOptions model

`RaptorMapOptions` implements `IRaptorMapOptions` and is the state object you bind via `data`. Useful members: `mapOptions` (proxied — setting any sub-prop triggers a VM update), `layers` (filtered by `layersMode`), `legendOptions`, `syncMode`/`syncedMapObjectNames`/`syncZoomOffset` (multi-map sync), `layersMode`/`activeLayerIds`, `coordinateDisplayFormat`, `scaleRatioNumerator`, `viewsToUpdateOnMapStateChange`, `pointerLatLng`, `displayInformation` (formatted center/pointer/scale getters). Methods: `serialize()` / construct with `ISerializedRaptorMapOptions` for state persistence (note: layers are intentionally **not** serialized), `updateFromMap(map)`, `updateLayers(layers)`, `updateDisplaySettings({coordinateDisplayFormat, scaleRatioNumerator}, map?)`.

Enums: `RaptorMapSyncMode` (`None`/`AllMaps`/`SelectedMaps`), `RaptorMapLayerMode` (`AllLayers`/`SelectedLayers`/`ExcludeLayers`), `CoordinateFormat` (`DD`/`DMS`/`DDM`/`MGRS`), `ScaleRatioNumerator` (`feet`/`meters`), `LegendMode` (`Default`/`Simple`/`SimpleVertical`).

## Patterns

**Zoom to a row's geometry**

```ts
const rm = this.raptorDom.nodeT<RaptorMap>("mainMap");
rm?.onMapCreated(m => m.map.zoomToWKT(wkt, 14));
```

**Wire a geographic click after creation**

```ts
this.raptorDom.nodeT<RaptorMap>("mainMap")?.onMapCreated(rm => {
  this._clickSub = rm.map.addClickListener((ll: ml.geo.LatLng) => this.onMapClick(ll));
});
// dispose this._clickSub in the VM's destroy/teardown
```

**Drive layers from data sources** — on a `DynamicViewModel`, build `ml.ui.map.IMlUiLayerOptionsInterface[]` (each with a stable `id`, `query`/`sourceTable`, `style`, `visible`) and assign them to `mapState.layers` (or `registerLayers`); changing a layer's JSON reloads only that layer, hidden layers are removed.

**Filter a data source (or grid) to the current viewport** — there is no built-in viewport filter on the Raptor DataGrid (only the legacy `MLDataGrid` has one), so wire it: on `center`/`zoom` change (debounced), read `getVisibleBB()`, build an `Overlaps` rectangle where-clause, and apply it as a named data-store filter.

```ts
const geo = ml.data.dataSource.getDefaultGeoColumn(ds);       // resolve the geo column
const bb = rm.map.getVisibleBB();
const wkt = `POLYGON((${bb.minLng} ${bb.minLat}, ${bb.minLng} ${bb.maxLat}, ${bb.maxLng} ${bb.maxLat}, ${bb.maxLng} ${bb.minLat}, ${bb.minLng} ${bb.minLat}))`;
this.dataStore.setFilter(sourceName, { name: "viewport", filter: [[{ col: geo.name, test: "Overlaps", value: `WKT(${wkt}),COL(${geo.name})` }]] });
```

Clear/skip the filter near whole-world span (≥360°). For a radius instead of a box use the `DWithin:<meters>` test with a `WKT(POINT(lng lat))` value; `ml.data.query.createGeoQueryWhere(col, test, wkt, dir)` builds either. To scope a grid to the viewport *without* affecting the map, apply this filter to a `{{parent:asSubQuery}}` child source the grid binds to (see `data-store.md`).

## Gotchas

- Never touch `rm.map` directly in your render path — it may be null. Always go through `onMapCreated`.
- Each layer needs a stable, unique `id`; the node diffs by `id` to decide load vs. hide vs. remove. Reusing an id across different intents causes the wrong layer to update.
- Only `lat`/`lng`/`z`/`rotation`/`baseLayer`/`drawings` apply as quick updates; changing any other `mapOptions` prop forces a full `map.load()` reload.
- Drawings are intentionally **not** re-applied from bound `mapOptions` on update — mutate drawings directly on `rm.map`.
- Map state persistence: serialize `RaptorMapOptions.serialize()`, but re-register layers yourself on restore (they aren't serialized).
- The map needs container height at creation; inside CSS grid/flex it self-calls `invalidateSize()` on the next frame, but if it stays blank call `rm.resize()` after the container gains size.

## Related skills

- Parent: `raptor` (View/VM split, RSScriptor, `update()`, `nodeT`).
- `legend.md` — the legend control / `IRaptorMapLegendOptions` / `LegendMode`.
- `drawing-toolbar.md` — drawing tools and `drawComplete`/draw-to-select.
- `data-grid.md` — the common map + grid linked-selection pairing.
- See the Reference section below for the full option/enum/method tables.

---

# RaptorMap — Reference

## Import paths

```ts
import { RaptorMap, CoordinateFormat, ScaleRatioNumerator, IRaptorMapOptions } from "raptor/raptorDom/controls/Map/RaptorMap";
import { RaptorMapOptions, RaptorMapSyncMode, RaptorMapLayerMode, ISerializedRaptorMapOptions } from "raptor/raptorDom/controls/Map/RaptorMapOptions";
import { ViewDefinitions } from "index"; // IRaptorMap, IRaptorMapLegendOptions, LegendMode, IMapChrome, IMapGridRefOptions
```

Builder method: `s.raptorMap(options: ViewDefinitions.IRaptorMap)`. Node `type`: `"raptorMap"`.

## ViewDefinitions.IRaptorMap (option fields)

| Field | Type | Notes |
|---|---|---|
| `mapOptions` | `ml.ui.map.iMapOptions` | initial map config (see below) |
| `bindings` | `IRaptorUniversalBindings & IRaptorMapBinding & IRaptorLayersBinding` | `data`, `mapOptions`, deprecated `layers` |
| `events` | `IEvent_RaptorMap[]` | DOM-level pointer/contextmenu/keyboard events |
| `legendOptions` | `IRaptorMapLegendOptions` | `initialLayerList?`, `legendMode?`, `legendViewName?` |
| `showEditor` | `boolean \| { showLayerList?, showMapOptions? }` | built-in editor chrome; `showMapOptions` can hide individual editor rows |
| `mapChrome` | `IMapChrome` | `rightButtonGroup` of zoom/home/layers/legend/custom buttons |
| `widgetGridFlyout` | `IWidgetGridFlyoutConfig` | flyout opened by a chrome widgets button |
| `gridRef` | `IMapGridRefOptions` | MGRS/grid-reference overlay |
| `nonInteractive` | `boolean` | adds `ml-non-interactive-map` (disables map interaction) |
| `noLegacyButtons` | `boolean` | hides legacy on-map buttons |
| `borderColor` / `borderWidth` / `borderStrokeDashArray` | string / number / string | artboard frame border |

## ml.ui.map.iMapOptions (common fields)

`lat`, `lng`, `z` (zoom), `rotation`; `layers: IMlUiLayerOptionsInterface[]`; base map via `baseLayer` / `mlBaseLayer` / `service`; `searchBox?: boolean | "AlwaysShow"`; `drawingTools?`, `drawingsVersion?`, `drawings`/`drawingsV2`; `scale?`, `scalePosition?`, `minZoom`/`maxZoom`/`constrainMinZoom`; `api?`. `map.save()` returns this shape; `map.load(opts)` applies it.

Quick-update props (no full reload): `lat`, `lng`, `z`, `rotation`, `baseLayer`, `mlBaseLayer`, `service`, `drawings`, `drawingsV2`. Any other changed prop triggers a full `map.load()`.

## ml.ui.map.IMlUiLayerOptionsInterface (layer, common fields)

`id` (stable unique key — required for diffing), `visible`, `name`, `style` (`style.LayerStyle`), `query` (`LayerQuery`), `sourceTable`, `filterString`, `opacity`, `zIndex`, `minZoom`/`maxZoom`, `type`, `service` (`iLayerService` for tiles), `legend` (`LayerLegend`), `showOnLegendView`. Click/hover: `onClick` (`boolean | string | IClickHandler`), `clickTemplate`, `clickContextMenu`, `onDoubleClick`, `onHover`, `hoverTemplate`, `hoverFields`. Add imperatively: `ml.layer(map, layerOptions, onLoad?, triggerCallback?)`.

## RaptorMap (node class) — public API

| Member | Signature | Purpose |
|---|---|---|
| `onMapCreated` | `(cb: (rm: RaptorMap) => void) => void` | run when `map` exists (now or later) |
| `map` | `ml.ui.map.Map` (get/set) | live map; null pre-create |
| `mapContainer` | `HTMLElement` (get) | inner map div |
| `zoomLevel` | `number` (get) | effective zoom |
| `additionalLayers` | `IMlUiLayerOptionsInterface[]` (get/set) | extra always-on layers, auto-managed |
| `waitForLayer` | `(layerId, maxTimeMs=5000) => Promise<void>` | resolve when a layer is loaded |
| `setLayerBalloon` | `(layerId, config: IRaptorBalloonConfig) => void` | custom Raptor click balloon |
| `removeLayerBalloon` | `(layerId) => void` | revert to default balloon |
| `showDrawingTools` / `hideDrawingTools` | `() => boolean` | toggle draw toolbar |
| `showLegend` | `() => void` | open the legend |
| `resize` | `() => void` | invalidate size after container resize |
| `update` | `(mapOptions, layers?) => void` | full reload (usually driven by binding) |
| `updateLayers` | `(layers, removeOld=true) => void` | reconcile layer set |
| `injectEditorPanelsButton` | `() => void` | editor integration |

## ml.ui.map.Map — frequently used members

`center: BindableLatLng` (`.get()`, `.set({lat,lng})`, `.addChangeListener`/`.removeChangeListener`), `zoom: bindable.Value<number>`, `rotation: bindable.Value<number>`, `layers: Layer[]`, `mouseMoved: KnockoutObservable<ml.geo.LatLng>`, `mapId`, `mapDrawingInterface: MapDrawingInterface`.

Methods: `zoomToWKT(wkt, maxZoom?)`, `zoomToExtents(): Promise<GetLayerExtentsResult>` (overloads: `(vizLayers?, maxZoom?)`, `(options?: zoomToExtentsOptions)`), `save(): iMapOptions`, `load(iMapOptions, triggerCallback?)`, `updateBaseLayer(baseLayer | externalService, baseSettings?)`, `invalidateSize()`, `getInternalMap()`, `onError(cb: (error, layerId?) => void)`, `onInternalMapAvailable(cb)`, `destroy()`.

Interaction: `click(ll, ignoreMotion?, zoom?)`, `addClickListener(fn): {dispose}`, `addMultiClickListener(fn): {dispose}`, `clearClickListners()`, `registerRightClickListener(key, opts)`, `addRightClickListener(key, listener): disposable`, `removeRightClickListener(key, listener)`, `getClickResultPromise(layer, lat, lng, zoom)`, `getMultiClickResultPromise(lat, lng, zoom)`.

## Drawing environment events

Reached from the drawing manager (`map.mapDrawingInterface.getDrawingManager()` / drawing environment). Events: `'drawComplete'`, `'drawingChanged'`, `'drawingsUpdated'`, `'drawingRemoved'`, `'drawingClick'`, `'contextMenuClicked'`, `'doubleClicked'` — handlers receive `OneOrMany<ml.drawing.UnifiedDrawing>`. Use `on(event, handler)` / `off(event, handler)`. Full coverage in `drawing-toolbar.md`.

## RaptorMapOptions — members

State object bound via `data`. Constructor `new RaptorMapOptions(vm: DynamicViewModel, initialData?: ISerializedRaptorMapOptions)`.

Get/set: `mapOptions` (Proxy — sub-prop sets mark dirty + trigger VM update), `layers` (setter filters by `layersMode`/`activeLayerIds`), `legendOptions`, `pointerLatLng`, `coordinateDisplayFormat`, `scaleRatioNumerator`, `viewsToUpdateOnMapStateChange`, `syncMode`, `syncedMapObjectNames`, `syncZoomOffset`, `layersMode`, `activeLayerIds`. Read-only: `displayInformation` (`RaptorMapDisplayInformation`), `dataHash`.

Methods: `serialize(): ISerializedRaptorMapOptions` (omits `layers`), `updateFromMap(map, {refreshScale?})`, `updateLayers(layers)`, `updateMousePosition(ll)`, `updateDisplaySettings(settings, map?)`.

`RaptorMapDisplayInformation` getters: `centerLatLngFormatted`, `centerLLinDMS`, `pointerLatLngFormatted`, `currentZoom`, `scaleLabel`, `scaleWidth`, `scaleRatio`, `rotationStyleTransform`.

## ISerializedRaptorMapOptions (persistence shape)

`mapOptions`, `legendOptions`, `syncMode`, `syncedMapObjectNames`, `syncZoomOffset`, `layersMode`, `activeLayerIds: string[]`, `coordinateDisplayFormat?`, `scaleRatioNumerator?`, `viewsToUpdateOnMapStateChange?`. Layers are not persisted — re-register them on restore.

## Enums

- `CoordinateFormat`: `DD`, `DMS`, `DDM`, `MGRS`
- `ScaleRatioNumerator`: `FEET`="feet", `METERS`="meters"
- `RaptorMapSyncMode`: `None`, `AllMaps`, `SelectedMaps`
- `RaptorMapLayerMode`: `AllLayers`, `SelectedLayers`, `ExcludeLayers`
- `ViewDefinitions.LegendMode`: `DEFAULT`="Default", `SIMPLE`="Simple", `SIMPLE_VERTICAL`="SimpleVertical"
- `IEvent_RaptorMap.event` ∈ `PointerEventTypes` (`pointerdown`/`pointerup`/`pointerover`/`pointerout`/`pointerenter`/`pointerleave`/`click`/`dblclick`/`mousedown`/`mouseup`/`mouseover`/`mouseout`/`mouseenter`/`mouseleave`), `ContextMenuEventType` (`contextmenu`), `KeyboardEventTypes`.

## IMapChrome right button group

`mapChrome: { rightButtonGroup: { enabled, position: "topRight"|"middleRight"|"bottomRight", offsetX, offsetY, buttons | buttonGroups } }`. Each button: `{ id, action: "zoomIn"|"zoomOut"|"home"|"layers"|"legend"|"custom", customActionId?, icon?, tooltip?, visible?, enabled? }`.
