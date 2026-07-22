# Raptor Legend & LayerControl

Map legend (layer icons + style-rule swatches) and the per-layer control button strip.

## When to use
- You want a **legend** that mirrors a map's layers — icon + name, optionally expandable into per-style-rule sub-entries. Reach for this whenever a `s.raptorMap` needs an inline or popup legend.
- You want the legend display compact (icons + labels only) vs. the default accordion.
- You need the **LayerControl** node — a small row of per-layer action buttons (zoom-to-extents, filter, view data, download).
- For the map itself, base layers, drawings, chrome buttons → see `map.md`. For chart legends → see `echarts`.

## Builder
There is **no dedicated `s.legend()` builder** — the legend is provisioned by the map. Set it up through the map's `legendOptions`:

```ts
const s = RSScriptor.create<MyVm>();
s.raptorMap({
    viewName: "myMap",
    mapOptions: { /* ... */ },
    legendOptions: {                         // ViewDefinitions.IRaptorMapLegendOptions
        legendMode: ViewDefinitions.LegendMode.SIMPLE,
        // legendViewName: "myLegendHost",   // bind to an external Legend view (optional)
        // initialLayerList: [...]           // hard-coded starting layers (optional)
    }
});
```

`legendOptions` fields (`ViewDefinitions.IRaptorMapLegendOptions`):
- `legendMode?: LegendMode` — `DEFAULT` ("Default", accordion), `SIMPLE` ("Simple", icon+label row, wraps), `SIMPLE_VERTICAL` ("SimpleVertical", icon+label column). Defaults to `DEFAULT`.
- `legendViewName?: string` — view name of an external Legend template you mounted yourself; when set, the map updates *that* legend instead of opening its own popup dialog.
- `initialLayerList?: any[]` — seed layers before the map reports its own.

When `legendViewName` is **omitted**, the map chrome "legend" button opens a built-in draggable dialog (`getDialogBasedLegend(anchorRect?)`, default width `LEGEND_DIALOG_WIDTH = 270`). When `legendViewName` is **set**, you own the placement — the chrome button does nothing and `showLegend()` returns early.

The separate **LayerControl** node has its own builder, `s.layerControl(options: ILayerControl)`, node `type: "layerControl"` (svg `mlsvg-LayerControl`). `ILayerControlOptions` is currently empty — it is `ViewDefinitions.IViewDefinition` plus its `contentTemplates`.

## Bindings & events
The Legend is a `RaptorViewModel`, not a view-definition node, so it has no `.bindings`/`.events` of its own — it re-renders via its own `update()` calls. You influence it through the map's `legendOptions` and by calling `setLayers`/`mode`.

Inside the legend view, entries are driven by `s.foreach` over `layers` / `subEntries`, with each icon rendered by an `s.svg` bound to `defaultModeSVGOptions` / `simpleModeSVGOptions`.

`LayerControl` buttons are plain `ILayerControlControl` objects with an imperative `onClick: () => void` and an `svgKey`; they are not Raptor event bindings.

## ViewModel / instance API
**`Legend` (key `LEGEND_KEY = "Legend"`)** — `RaptorViewModel`:
- `get layers(): LegendEntry[]`
- `set mode(mode: LegendMode)` — switches Default/Simple/SimpleVertical, calls `update()`.
- `setLayers(layers: ml.ui.map.IMlUiLayerOptionsInterface[]): void` — rebuilds entries; layers with `showOnLegendView === false` are skipped; entry label falls back to `Layer N`.
- `get hasLayers / hasNoLayers / isShowingDefaultLayout / isShowingSimpleLayout / isShowingSimpleVerticalLayout` — layout predicates the view binds `visible` to.
- `static ensureHtml2Canvas(): Promise<void>` — loads html2canvas (used for legend image capture).

**`LegendEntry`** (keys `LEGEND_ENTRY_KEY`, `LEGEND_SUB_ENTRY_KEY`) — one per layer:
- `index`, `isSubEntry`, `get/set label`, `get/set layer`, `get/set defaultModeSVGOptions`, `get/set simpleModeSVGOptions`, `get/set subEntries`.
- Setting `layer` auto-generates the icon SVGs (via `ml.data.map.layer.LayerIcon.getLayerIconSvg`) and, for top-level entries, sub-entries from `layer.style.rules` (each rule's `where` becomes the sub-entry label).

**Reaching the live legend VM** — the map manages it; from a map chrome context you get `Legend` via the chrome, and the map exposes `showLegend()`. If you mounted your own legend, grab the VM the standard way: `raptorDom.node("myLegendHost")?.getTemplateViewModel() as Legend` (or `nodeT`), then call `setLayers(...)`.

**`LayerControlViewModel`** — `RaptorViewModel`: `get/set defaultButtons: ILayerControlControl[]` (defaults: `ZOOM_TO_EXTENTS`, `FILTER`, `DATAGRID`, `DOWNLOAD`), `get/set selectedLayerControl`, `get userContext`. Preset controls live in the `LayerControlButtons` namespace (`ZOOM_TO_EXTENTS`, `FILTER`, `DATAGRID`, `DOWNLOAD`, `REMOVE`, `MOCKDATA`, plus string keys like `STYLE`, `ALPHA`, `VISIBLILITY`).

## Patterns
**Compact legend that auto-tracks the map.** Set `legendMode: SIMPLE` (or `SIMPLE_VERTICAL`) in `legendOptions` and let the map call `updateLegendLayers` for you — no manual `setLayers` needed; the legend reflects the map's current layers and styles.

**Externally-placed legend.** Mount a Legend template somewhere in your layout, e.g. `s.template(Legend, { viewName: "myLegendHost" })`, then point the map at it with `legendOptions.legendViewName: "myLegendHost"`. The map now pushes layer updates into your placed legend instead of opening a dialog.

**Custom per-layer buttons.** Render `s.layerControl({...})` and set its VM's `defaultButtons` to a curated list from `LayerControlButtons` (or your own `ILayerControlControl[]` with custom `label`/`svgKey`/`onClick`).

## Gotchas
- There is **no `s.legend()`**; the legend is always produced via `s.raptorMap(...).legendOptions` (or by mounting the `Legend` template manually). Don't look for a top-level builder.
- `LegendMode` enum string values are capitalized (`"Default"`, `"Simple"`, `"SimpleVertical"`) — use the enum, not raw lowercase strings.
- Layers are hidden from the legend by `layer.showOnLegendView === false`, not by an explicit legend filter.
- Sub-entries (style swatches) only appear in `DEFAULT` mode and only when `layer.style.rules` is non-empty; `SIMPLE`/`SIMPLE_VERTICAL` show one icon+label per layer with no expansion.
- `LayerControlButtons` preset `onClick`s in the framework are placeholder `console.log` stubs — wire real behavior by supplying your own `ILayerControlControl` objects.
- Setting `legendViewName` disables the chrome popup legend entirely; if your placed legend isn't visible, nothing else shows it.

## Related skills
- `raptor` (parent) — View/VM split, RSScriptor, `update()`, mounting templates, `raptorDom.node`/`nodeT`.
- `map.md` — the `s.raptorMap` host that owns `legendOptions`, map chrome buttons, layers, and drawings.
- `svg.md` — the `s.svg` node that renders each legend icon from `ISvgOptions`.
- `accordion.md` — the accordion structure used by `DEFAULT`-mode legend entries.
- `dialog.md` — the draggable dialog the built-in popup legend uses.
- `echarts` — for chart (not map) legends.
