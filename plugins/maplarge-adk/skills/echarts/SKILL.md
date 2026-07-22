---
name: echarts
description: "Builds and configures Apache ECharts charts inside MapLarge ADK Raptor views — the router for every chart type. Covers the option object model (title/legend/grid/xAxis/yAxis/series/tooltip/axisPointer/dataZoom/visualMap/dataset/graphic/toolbox) and how charts live in a Raptor codebase: declared via the RSScriptor s.chart({ options }) node with traverseRaptorChart bindings, option fragments returned from ViewModel getters typed as ml.echarts.* (BarSeriesOption/HeatmapSeriesOption/CustomSeriesOption/ECharts), events wired through RaptorChart.onChartCreated (click drilldown, dataZoom persistence, visualMap datarangeselected), and theme-reactive theming via CSS variables. Use when adding, editing, or debugging ANY chart in a MapLarge ADK extension, including these series and components (each has an on-demand reference doc): line/area/step, bar/column/stacked/horizontal, scatter/bubble, effectScatter (ripple), pie/doughnut/rose, funnel/pyramid, gauge/dial, radar/spider, heatmap (matrix/calendar/geo density), boxplot (quartiles), candlestick/OHLC/K-line, sankey (flow), graph (network/force-directed), tree (dendrogram), treemap, sunburst, themeRiver (stream); and the tooltip/axisPointer, visualMap (value→color, continuous/piecewise), dataZoom (slider/inside), dataset (encode/transform), and custom renderItem (timelines/gantt) components. Also for setOption merge/notMerge/replaceMerge behavior. Official refs: echarts.apache.org/en/option.html and echarts.apache.org/en/api.html."
---

# ECharts in MapLarge Raptor

How to build Apache ECharts charts and configure them inside MapLarge ADK Raptor views. ECharts is consumed two ways here: as a declarative `options` object inside an RSScriptor `s.chart({...})` node (bound to ViewModel getters), and via the live ECharts instance obtained from `RaptorChart.onChartCreated`.

## When to use

- Adding or editing a chart in a Raptor view (`s.chart({ options: {...} })`).
- Building a series in a ViewModel: line/bar/scatter/pie/heatmap/custom, stacked bars, datasets with `encode`.
- Writing a custom series `renderItem` (timelines, gantt bars, single-cell overlays).
- Wiring chart events: `click` drilldown, `dataZoom` persistence, `datarangeselected` from a `visualMap`.
- Theming chart colors so they follow the app's light/dark theme.

## Chart types & components — on-demand reference docs

This skill is the router. The framing below (the `s.chart` node, theming, events, gotchas) applies to
every chart; for the specific series or component you're building, read its doc under
`${CLAUDE_PLUGIN_ROOT}/skills/echarts/reference/` before writing the option.

| Task / keywords | Reference doc |
|---|---|
| line, area, stacked area, smooth, step, trend over time | `line.md` |
| bar, column, grouped, stacked, horizontal | `bar.md` |
| scatter, bubble, correlation, point cloud | `scatter.md` |
| effectScatter, ripple, pulsing/alarm points | `effectscatter.md` |
| pie, doughnut/donut, rose/nightingale, share | `pie.md` |
| funnel, pyramid, stage conversion, drop-off | `funnel.md` |
| gauge, dial, KPI, percent-complete, meter | `gauge.md` |
| radar, spider/web, indicators, scorecard | `radar.md` |
| heatmap, matrix, correlation grid, calendar/geo density | `heatmap.md` |
| boxplot, box-and-whisker, quartiles, distribution | `boxplot.md` |
| candlestick, OHLC, K-line, financial/stock | `candlestick.md` |
| sankey, flow, weighted links | `sankey.md` |
| graph, network, force-directed, node-link, topology | `graph.md` |
| tree, dendrogram, org chart, parent-child | `tree.md` |
| treemap, nested rectangles, area-sized hierarchy | `treemap.md` |
| sunburst, radial hierarchy, concentric rings | `sunburst.md` |
| themeRiver, stream graph, bands over time | `themeriver.md` |
| tooltip, axisPointer, crosshair, formatter | `tooltip.md` |
| visualMap, value→color, continuous/piecewise, color legend | `visualmap.md` |
| dataZoom, zoom/pan, slider, inside | `datazoom.md` |
| dataset, encode, shared columns, transform | `dataset.md` |
| custom series, renderItem, gantt/timeline, bespoke shapes | `custom.md` |

The deeper option/DSL cheatsheet is `reference/echarts-reference.md`.

## Mental model / how it works

An ECharts chart is one big **option object** passed to `chart.setOption(option)`. Components are top-level keys (`title`, `legend`, `grid`, `xAxis`, `yAxis`, `series`, `tooltip`, `dataZoom`, `visualMap`, `axisPointer`, `graphic`, `dataset`, `toolbox`). `series` is an array; each entry has a `type`. Setting a new option **merges** by default (deep-merge per component); pass `notMerge: true` to replace, or `replaceMerge` to replace named components.

In a Raptor codebase you almost never call `setOption` yourself. Raptor's `s.chart({ options })` node takes the option object, and Raptor diffs/applies it whenever the bound VM getters change. The TS types are exposed as the `ml.echarts.*` namespace (`ml.echarts.BarSeriesOption`, `ml.echarts.HeatmapSeriesOption`, `ml.echarts.CustomSeriesOption`, `ml.echarts.SeriesOption`, `ml.echarts.ECharts`, `ml.echarts.DatasetComponentOption`, the renderItem param/api/return types, `DefaultLabelFormatterCallbackParams`). Use them — they catch most option-shape mistakes.

The flow: **view declares `s.chart({ options })`** where most leaves are `s.prefix(vmKey).getTypedProp("...")` bindings → **VM getters return `ml.echarts.*` fragments** (series arrays, axis layouts, datasets) → Raptor re-renders the chart when those getters change → **events** are attached imperatively once the chart instance exists via `node.onChartCreated`.

## Core API / DSL

### The `s.chart()` node (RSScriptor)
```ts
s.chart({
    viewName: "myChart",              // look the node up later by this name
    height: 425, minHeight: 125,
    disableMenu: true,                // hide RaptorChart's right-click menu
    disableSelection: true,
    defaultClickAction: "inspect",
    availableClickActions: ["inspect"], // [] to disable click actions entirely
    options: { /* the ECharts option object — leaves bound to VM getters */ },
    bindings: { traverseRaptorChart: true }, // REQUIRED so Raptor walks the option tree for bindings
    events: [
        { event: "click", param: 0, handler: s.prefix(vmKey).getTypedProp("onChartSelectionChange") }
    ]
})
```
- `bindings: { traverseRaptorChart: true }` is on essentially every chart — without it the `getTypedProp(...)` leaves inside `options` are not wired up.
- Bind a leaf with `<any>s.prefix(vmKey).getTypedProp("mySeries")`; the `<any>` cast is normal because the binding token is not the option's static type.
- Function leaves (axis `formatter`, tooltip `formatter`, `renderItem`) are written inline in the view **or** bound to a VM method via `getTypedProp` (e.g. `renderItem: <any>s.prefix(vmKey).getTypedProp("renderTimelineBar")`).

### Live instance (RaptorChart node)
```ts
this.raptorDom.nodeT<RaptorChart>("myChart").onChartCreated(chart => {
    chart.on("click", e => { if (e.seriesIndex === 0) { /* e.data["allData"] */ } });
    chart.on("dataZoom", () => { const dz = chart.getOption().dataZoom; /* dz[0].start/end */ });
    chart.on("datarangeselected", (p: { selected?: unknown }) => { /* visualMap range */ });
});
// node.resize({ left, right, top, bottom });  chart.getDataURL(opts);  chart.getConnectedDataURL(opts)
```
- `chart` is `ml.echarts.ECharts`: `setOption`, `getOption`, `on/off`, `dispatchAction`, `resize`, `getDataURL`, `clear`, `dispose`, `showLoading/hideLoading`.
- `onChartCreated` may **re-fire** per chart instance (e.g. on theme/relayout). Guard one-time work with a flag (e.g. `_clickEventRegistered`) or an instance marker (e.g. `echart.__saveBgPatched`). The inner `chart.on(...)` re-attaches automatically each fire, which is what you want.
- Event names commonly used here: `click`, `dataZoom`, `datarangeselected`. Other common ones: `dblclick`, `mouseover/mouseout`, `legendselectchanged`, `brushselected`, `restore`, `finished`, `rendered`.

### Option components (quick reference)
- `grid: { top, bottom, left, right, containLabel }` — plot rectangle. `containLabel: true` keeps axis labels inside; otherwise reserve room manually (`grid.bottom: 85`).
- `xAxis` / `yAxis`: `type: "category" | "value" | "time" | "log"`, `data: string[]` (category), `name`, `nameLocation: "middle"|"center"`, `nameGap`, `min`/`max`, `axisLabel: { interval, rotate, formatter }`, `axisLine.lineStyle.color`. Either axis can be an array for multiple axes (`xAxis: [{...},{...}]`).
- `series[]` per type — `data`, `encode`, `itemStyle`, `label`, `emphasis`, `markLine`, `markArea`, `tooltip`, `z`/`zlevel`, `stack`.
- `tooltip: { trigger: "item"|"axis"|"none", axisPointer: { type: "shadow"|"line"|"cross" }, formatter, renderMode: "html", appendTo: "body", confine, textStyle }`.
- `dataZoom: [{ type: "slider"|"inside", xAxisIndex, yAxisIndex, filterMode: "filter"|"weakFilter"|"empty"|"none", start, end, realtime }]`.
- `visualMap: { min, max, range, calculable, orient, inRange: { color: string[] }, text: [hi,lo] }` — maps a value dimension to color; emits `datarangeselected`.
- `dataset: [{ dimensions, source }]` + per-series `encode: { x, y }` or `datasetIndex`.
- `graphic: { elements: [...] }` — free-floating shapes/text (no-data overlays).
- `toolbox: { feature: { dataZoom: {...}, saveAsImage: {...} } }`.

## Patterns

### Theming — read CSS variables, never hardcode
Colors live as `--chart-*` / `--bs-*` CSS vars in the extension's `style.less` and adapt to light/dark. Resolve them **at access time** so theme switches take effect. A common pattern is a small theme helper/service that reads the computed CSS variables fresh on each access and exposes getters (e.g. `text`, `textMuted`, `border`, `neutral`) plus a series palette and a heatmap ramp built by iterating `--chart-series-N` / `--chart-heatmap-N` with sensible fallbacks.
```ts
// resolve a single var (read from the themed element, not :root)
function resolveCssVariable(v: string): string { /* getComputedStyle(...).getPropertyValue */ }

// expose theme-reactive getters on a small helper object/service
const palette = chartTheme.getSeriesColors();    // --chart-series-1..N (with fallback)
const heat    = chartTheme.getHeatmapColors();   // --chart-heatmap-1..N (cool→warm)
const border  = chartTheme.border;               // fresh each access → reactive
```
Use them in options: `itemStyle: { borderColor: chartTheme.border }`, `visualMap.inRange.color: heat`. View bindings can reference a getter as a string path token too: `color: ${vmKey}.chartTheme.textMuted`.

### Build a series in the VM, bind it in the view
VM returns a typed fragment; the view binds it.
```ts
// VM
private _myChartSeries: ml.echarts.BarSeriesOption[] = null;
public get myChartSeries() { return this._myChartSeries; }
```
```ts
// view
.chart({ viewName: "myChart", disableMenu: true,
  options: {
    grid: { top: 10, bottom: 5, left: 15, right: 10, containLabel: true },
    legend: { show: false },
    xAxis: { type: "category" }, yAxis: { type: "value" },
    tooltip: makeStackedSumTooltip(),
    series: s.prefix(vmKey).getTypedProp("myChartSeries") as any
  },
  bindings: { traverseRaptorChart: true } })
```

### Heatmap with markArea / markLine overlays
Cells are `[xIndex, yIndex, value]`; `visualMap` colors them; gaps drawn as `markLine` (multi-band) / `markArea` (full-scope spans), each with its own per-mark tooltip formatter.
```ts
const heatmapSeries: ml.echarts.HeatmapSeriesOption = {
  type: "heatmap", name: "Coverage", data /* [x,y,v][] */,
  itemStyle: { borderWidth: 1, borderColor: chartTheme.border },
  tooltip: { formatter: (p: ml.echarts.DefaultLabelFormatterCallbackParams) => {...} },
  markLine: { symbol: "none", silent: false, z: 5, lineStyle: { type: [4,3], color: gap, width: 2 }, data: lines },
  markArea: { z: 5, itemStyle: { color: gap, opacity: 0.7 }, data: areas },
};
```
Gotcha: on a **category** axis, `markLine`/`markArea` collapse to nothing when start === end, so single-band marks go through a custom series instead.

### Custom series + renderItem (timelines, single-cell overlays)
`type: "custom"` + a `renderItem(params, api)` that returns a primitive shape. Use `api.value(dim)` to read the data tuple, `api.coord([x,y])` to convert data→pixels, `api.size([dx,dy])` for cell size, `api.style()` for the themed style. Clip to the plot rect with `ml.echarts.graphic.clipRectByRect`.
```ts
public renderTimelineBar(params: ml.echarts.CustomSeriesRenderItemParams, api: ml.echarts.CustomSeriesRenderItemAPI): ml.echarts.CustomSeriesRenderItemReturn {
  const categoryIndex = api.value(0);
  const start = api.coord([api.value(1), categoryIndex]);
  const end   = api.coord([api.value(2), categoryIndex]);
  const height = api.size([0, 1])[1] * 0.6;
  const rectShape = ml.echarts.graphic.clipRectByRect(
    { x: start[0], y: start[1] - height/2, width: end[0]-start[0], height },
    { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height });
  return rectShape && { type: "rect", transition: ["shape"], shape: rectShape, style: api.style() };
}
```
The custom series declares `encode: { x: [1,2], y: 0 }` and `coordinateSystem: "cartesian2d"`. `renderItem` runs **per data item with no `this`** — capture needed values (e.g. `gapColor`, `groupCount`) in the closure before defining it. A full-height "all-rows" rect spans `api.coord([x,0])`→`api.coord([x, count-1])` ± half a cell (the single-band gap custom series pattern).

### dataset + encode (switchable X/Y/color axes)
Switchable axes are easiest with a `dataset` and `encode` referencing dimension names.
```ts
this._myDataset = [{ dimensions: ["x", "y", "group"], source: rows }];
// series entry: { type: "bar", datasetIndex, encode: { x: "x", y: "y" }, stack }
```
Reference lines for a selected/comparison value are a `markLine` on a dummy zero-data `line` series:
```ts
{ name: label, type: "line", z: 100, data: [], silent: true, tooltip: { show: false },
  markLine: { symbol: ["none","none"], label: { formatter: label.toUpperCase(), position: "insideEndTop", color },
              lineStyle: { color, width: 2, type: "dashed" }, data: [{ xAxis: markX }] } }
```

### No-data overlay via `graphic`
Bind `options.graphic` to a VM getter; set it to a `{ elements: [{ type: "group", children: [rect, text] }] }` when empty, `[]` otherwise.
```ts
this.myGraphicElements = { elements: [{ type: "group", left: "center", top: "middle", children: [
  { type: "rect", z: 100, shape: { width: 240, height: 90 }, style: {...} },
  { type: "text", z: 100, style: { text: "No data available", font: "14px Roboto" } } ] }] };
```

### Click drilldown + dataZoom persistence
```ts
chart.on("click", e => { if (e.seriesIndex === 0) { this._selectedRowData = e.data["allData"]; this.update(); } });
chart.on("dataZoom", () => { const dz = chart.getOption().dataZoom; this._savedZoom = { start: dz[0].start, end: dz[0].end }; });
```

### Manual resize (chart in a collapsing/hidden container)
A chart sized while its container is collapsed/`display:none` renders at the wrong size. Resize after layout settles.
```ts
public resizeCharts() {
  const node = this.raptorDom.nodeT("myChart");
  setTimeout(() => { node?.resize({ left: 0, right: 0, top: 0, bottom: 0 }); this.update("myChart"); }, 250);
}
```

## Gotchas

- **`traverseRaptorChart: true` is mandatory** for any `getTypedProp` bindings inside `options`; forget it and leaves render as literal binding tokens.
- **`renderItem` has no `this`.** Capture VM values in the closure; it runs once per data item, hot path — precompute lookups (`Map`) rather than `indexOf` inside it.
- **`markLine`/`markArea` collapse on category axes when start === end.** Use a `custom` series with `api.coord` for single-cell marks.
- **`onChartCreated` can re-fire per instance.** Guard one-time registration with a flag/instance marker; let the inner `chart.on` re-attach.
- **Look the chart up after mount.** `setTimeout(() => this.attach..., 0)` so `raptorNodes.getByView(viewName)` finds the node.
- **Tooltip series-name prefix.** Per-mark tooltips show the series name ("series0") unless you give the mark its own `tooltip.formatter`. Tooltip border takes the hovered series color — set `tooltip.borderColor` for a stable border.
- **HTML tooltips inherit framework opacity.** A framework rule like `.ml-raptor-root span { opacity: 0.6 }` compounds across nested spans; add `opacity: 1 !important` on tooltip swatch HTML.
- **`getDataURL` defaults to a white background.** Wrap it to inject `var(--bs-body-bg)` for theme-correct PNG exports.
- **Use `ml.echarts.*` types**, not `any`, for series/axis/dataset fields you build in the VM — they catch most shape errors before runtime.
- **Setting `series`/`xAxis` is a merge.** Re-emitting a smaller option won't clear stale series unless you replace the whole getter value (return a fresh array) or use notMerge at the instance level.

## Related skills

- `raptor` — the framework charts are mounted in (RSScriptor `s.chart`, `getTypedProp` bindings, ViewModel getters, `raptorDom.nodeT`).

---
*A deeper option/DSL cheatsheet lives in `${CLAUDE_PLUGIN_ROOT}/skills/echarts/reference/echarts-reference.md`.*
