# RaptorChart

A Raptor control that wraps an Apache ECharts instance. `s.chart({...})` declares the node; the ECharts option object inside `options` is everything ECharts knows about (defer that detail to the `echarts` skill).

## When to use
Any time a view needs a visualization (bar/line/pie/scatter/heatmap/custom-render timeline). Reach for this node, not a raw `ml.echarts.init`. If you only need a bare canvas with no Raptor chrome/binding, the lower-level `RawEChart` / `chart` (`type: "chart"`) nodes exist, but `raptorChart` is the standard control and the one with selection, theming, the overflow menu, async overlays, and data binding.

## Builder
`s.chart(options?: ViewDefinitions.IRaptorChart)` — emits a node with `type: "raptorChart"`, backed by the `RaptorChart` node class and the `RaptorChartViewModel` chrome (overflow menu, click-action toggles, properties panel). Key `IRaptorChart` fields:

- `options: IRaptorChartOption | ml.echarts.EChartsOption` — the ECharts option object (the bulk of the work; see `echarts`). `IRaptorChartOption` is `DeepAllowString<EChartsOption>`, i.e. an EChartsOption whose values may be **binding-path strings** resolved at render time when `traverseRaptorChart` is on.
- `noDataMessage?: string` — shown when bound data is empty.
- `disableSelection?: boolean` / `disableMenu?: boolean` — turn off click/brush selection and the overflow chrome.
- `availableClickActions?: ClickAction[]` and `defaultClickAction?: ClickAction` — `ClickAction = "click" | "brush" | "inspect"`.
- `width?` / `height?`, `configValues?: IRaptorChartConfigValues` (transform / async-overlay options — recipe/widget territory).

```ts
const s = RSScriptor.create<MyVm>();
s.view("myChart", s => s
    .chart({
        viewName: "myChart",
        noDataMessage: "No data",
        options: {} as ml.echarts.EChartsOption,   // start empty; feed via binding
        bindings: { chartOptions: "myChartOptions", value: "mySelection" }
    }));
```
A ViewModel getter typed `ml.echarts.EChartsOption` returns the option object; the chart re-renders when `update()` runs and the bound property changed.

## Bindings & events
`bindings` is `IRaptorUniversalBindings & IRaptorChartBinding & IRaptorDataBinding`:
- `chartOptions` — a VM property holding the full `ml.echarts.EChartsOption`. Preferred way to drive the chart.
- `data` — generic two-way data binding; the node's `applyBindingData({ data, options? })` runs on change (used by recipe/dataset wiring).
- `chartDataSet: { source, dataSource, property, pivotColumn, ... }` + `source: IChartDataSetSourceType` (`'ColumnBasedDictionary' | '2DArray' | 'RowBasedKeyValueObjectArray' | 'DataSource' | 'SingleValue' | 'ValueArray' | 'TreeData'`) — binds a query/data source to populate series.
- `traverseRaptorChart: boolean` — walk the option tree and resolve special string keys (`min`, `max`, `data`, `renderItem`, …) to VM functions/values. Needed when `options` embeds binding-path strings or a `renderItem` reference.
- `value` — receives the current selection as `IRaptorChartSelection[]` (see below).
- `chartData` is **deprecated** — use `chartDataSet` / `chartOptions`.

`events: IEvent_RaptorChart[]` — `event` is the usual pointer/keyboard/`change` union. The wrapper specifically dispatches a handler whose `event` is `"click"` **only in `inspect` mode**, calling `handler(param, null, e, null)` where `e.info` is `{ seriesIndex, dimensions, selectedValue, data }`. For `click`/`brush` selection, read the `value` binding instead of an event.

## Selection model
- `click` mode: toggles items into a selection set; pushes `IRaptorChartSelection[]` to the `value` binding and fires the change event. Clicking empty space clears.
- `brush` mode: rectangular brush selection over the data; same `value` output.
- `inspect` mode: no persisted selection — each click fires the `click` event with the full row object.

`IRaptorChartSelection = { dimensions: {name, precision?}[]; values: any[]; dataSourceName?; chartName? }`. A platform helper `RaptorChartActions.buildRaptorChartFilter(action, selections, filterState)` converts selections into `IQueryWhere` for cross-filtering a data source.

## Instance API
Reach the node: `raptorDom.nodeT<RaptorChart>("myChart")` (or the convenience `getChartByViewName("myChart", raptorDom)`). The backing chrome VM is `chart.vm` (`RaptorChartViewModel`). Useful members:
- `onChartCreated(cb: ChartCreatedCallback): IDisposable` — `cb(chart: ml.echarts.ECharts)`; fires once the instance exists (immediately if already created). This is the hook for wiring native ECharts events (`chart.on("datazoom"/"click"/"datarangeselected", …)`) — keep the returned `IDisposable` and `dispose()` it on teardown.
- `onChartUpdated(cb: ChartUpdatedCallback): IDisposable` — `cb(options)` after each `setOption`.
- `chartInstance: ml.echarts.ECharts` — the live instance (null before creation; prefer `onChartCreated`).
- `setOption(options, data?, unfilteredData?)`, `updateChart()`, `applyOptionsFromEditor(options, { clearFirst? })`.
- `setClickAction(action: ClickAction)`, `setSelection(value: string | string[])`, `clearSelections("chart" | "external")`.
- `saveAsImage(): string | null`, `downloadChartAsPngFile()`, `resize()`.
- `static RaptorChart.ensureEChartsFramework(): Promise<void>` — awaits ECharts being loaded.

## Patterns
1. Reactive options from a getter:
```ts
public get myChartOptions(): ml.echarts.EChartsOption {
    return { xAxis: { type: "category", data: this.labels },
             yAxis: { type: "value" },
             series: [{ type: "bar", data: this.values }] };
}
// view: .chart({ viewName: "myChart", options: {} as ml.echarts.EChartsOption,
//                bindings: { chartOptions: "myChartOptions" } })
// changes appear after this.update("myChart")
```
2. Click-to-filter: bind `value: "myChartSelection"`; in the setter, build a `setFilter` / `buildRaptorChartFilter` query from `IRaptorChartSelection[]` and apply it to your data source.
3. Native event wiring (zoom persistence, drilldown):
```ts
const node = this.raptorDom.nodeT<RaptorChart>("myChart");
this._sub = node.onChartCreated(ec => {
    ec.on("dataZoom", () => { /* persist this.zoomState = ec.getOption().dataZoom */ });
});
// dispose this._sub in the VM/node teardown
```

## Gotchas
- The chart re-renders only when a **bound** property changes and `update()`/`update(viewName)` runs; mutating `options` in place without changing the bound reference may not repaint — return a fresh object or call the node's `setOption`/`updateChart`.
- `updateChart()` calls `setOption` with `replaceMerge: ['series','dataZoom','graphic']`. Switching chart families (cartesian↔pie↔treemap) can leak stale axes/encode; use `applyOptionsFromEditor(opts, { clearFirst: true })` (or rebuild the option object) for structural changes. Merge semantics are an `echarts` topic.
- Don't `echarts.init` on the chart's own root — ECharts owns an inner mount element; use `chartInstance` / `onChartCreated`.
- Selection only works on charts with selectable dimensions; `setSelection` throws "Selection not supported on this chart" otherwise. Set `disableSelection: true` for purely display charts.
- `chartInstance` is null before creation and after `destroy()`; always go through `onChartCreated` for setup so you don't race the async ECharts load.
- Theme/color: charts react to the app theme; drive colors via theme/CSS variables rather than hard-coding — see `echarts`.

## Related skills
- `raptor` (parent) — View/VM split, RSScriptor, bindings/events, `update()`, `nodeT`, RaptorNode lifecycle.
- `echarts` — the ECharts option object model (series/axis/tooltip/visualMap/dataZoom/`renderItem`), `setOption` merge modes, theming. Everything inside `options` lives here.
- `data-grid.md`, `map.md`, `legend.md` — siblings often paired with a chart for cross-filtering/highlighting.

See the Reference section below for the full `IRaptorChart` field table, binding keys, and `RaptorChart` public method list.

---

## ViewDefinitions.IRaptorChart fields

| Field | Type | Notes |
|---|---|---|
| `type` | `"raptorChart"` | Set automatically by `s.chart()`. |
| `options` | `IRaptorChartOption \| ml.echarts.EChartsOption` | The ECharts option object. `IRaptorChartOption = DeepAllowString<EChartsOption>` (values may be binding-path strings when `traverseRaptorChart`). |
| `chartType` | `ChartType?` | Editor-oriented preset enum (see below); not required for hand-authored charts. |
| `width` / `height` | `number?` | Optional fixed size; usually let the container size it (auto-resize is built in). |
| `disableSelection` | `boolean?` | Turns off click/brush selection. |
| `disableMenu` | `boolean?` | Hides the overflow / click-action chrome. |
| `noDataMessage` | `string?` | Empty-state message. |
| `availableClickActions` | `ClickAction[]?` | Which of click/brush/inspect the chrome offers. |
| `defaultClickAction` | `ClickAction?` | Initial mode. |
| `configValues` | `IRaptorChartConfigValues?` | Transform + async-overlay options (recipe/widget/dataset-contract usage): `loadingPropertyName`, `chartBodyPlaceholderSvgKey`, `dataSource`, `recipeId`, `aggregation`, `behaviors`, etc. |
| `bindings` | `IRaptorUniversalBindings & IRaptorChartBinding & IRaptorDataBinding` | see below. |
| `events` | `IEvent_RaptorChart[]` | `event` ∈ pointer/keyboard/context-menu/`change`; only `"click"` is dispatched by the wrapper, in `inspect` mode. |

## IRaptorChartBinding keys

| Key | Type | Purpose |
|---|---|---|
| `chartOptions` | `BindingProp<EChartsOption>` | Full option object from a VM property. Preferred driver. |
| `data` | `BindingProp<TData>` | Generic two-way; triggers node `applyBindingData({ data, options? })`. |
| `chartDataSet` | `IChartDataSetSourceBinding` | Bind a data source/query: `{ source, dataSource?, property?, pivotColumn?, ... }`. |
| `source` | `IChartDataSetSourceType` | Data shape selector. |
| `traverseRaptorChart` | `boolean` | Resolve string keys (`min`/`max`/`data`/`renderItem`) in `options` to VM funcs/values. |
| `value` | `BindingProp` | Receives current selection (`IRaptorChartSelection[]`). |
| `chartData` | `IChartDataBinding[]` | **Deprecated** — use `chartDataSet`/`chartOptions`. |

`IChartDataSetSourceType = 'ColumnBasedDictionary' | '2DArray' | 'RowBasedKeyValueObjectArray' | 'DataSource' | 'SingleValue' | 'ValueArray' | 'TreeData'`

Plus all universal bindings (`visible`, `css`, `attr`, `prefixes`, …) from `IRaptorUniversalBindings`.

## Enums / types

- `ClickAction = "click" | "brush" | "inspect"`
- `ChartCreatedCallback = (chart: ml.echarts.ECharts) => void`
- `ChartUpdatedCallback = (chartOptions: any) => void`
- `IRaptorChartSelection = { dimensions: { name: string; precision?: string }[]; values: any[]; dataSourceName?: string; chartName?: string }`
- `ChartType` (editor presets): `basic_line_chart | smoothed_line_chart | basic_area_chart | stacked_line_chart | stacked_area_chart | gradient_stacked_area_chart | step_line | basic_bar_chart | basic_bar_chart_with_background | waterfall_bar_chart | bar_chart_with_negative_value | donut_chart_with_rounded_corners | pie_chart | nightingale_chart | box_plot | treemap | gauge`

## RaptorChart public methods / accessors

| Member | Signature | Use |
|---|---|---|
| `onChartCreated` | `(cb: ChartCreatedCallback) => IDisposable` | Wire native ECharts events once instance exists. |
| `onChartUpdated` | `(cb: ChartUpdatedCallback) => IDisposable` | After each `setOption`. |
| `chartInstance` | `ml.echarts.ECharts` (get/set) | Live instance (null pre-create). |
| `nodeModel` | `ViewDefinitions.IRaptorChart` | The view definition. |
| `options` | `ml.echarts.EChartsOption` | Current options field. |
| `combinedOptions` | `ml.echarts.EChartsOption` (get) | Last merged options actually applied. |
| `vm` | `RaptorChartViewModel` (get) | Chrome VM. |
| `currentSelectMode` | `ClickAction` | Active mode. |
| `setOption` | `(options, data?, unfilteredData?) => void` | Apply options + data. |
| `updateChart` | `() => void` | Re-merge & repaint (`replaceMerge: series/dataZoom/graphic`). |
| `applyOptionsFromEditor` | `(options, { clearFirst? }) => void` | Apply structural/style changes; `clearFirst` for family/axis-flip changes. |
| `setClickAction` | `(action: ClickAction) => void` | Switch selection mode. |
| `setSelection` | `(value: string \| string[]) => void` | Programmatic select (throws if unsupported). |
| `clearSelections` | `(source: "chart" \| "external") => void` | Clear selection/brush. |
| `saveAsImage` | `() => string \| null` | Data-URL PNG. |
| `downloadChartAsPngFile` | `() => void` | Trigger PNG download. |
| `resize` / `handleResize` | `() => void` / `(rect?) => void` | Manual resize (auto-resize already wired). |
| `showError` | `(errors: string[]) => void` | Render error overlay. |
| `showDataSourceRequirement` | `() => void` | Prompt for data source. |
| `applyBindingData` | `({ data, options? }) => void` | Invoked by the `data` binding. |
| `destroy` | `() => void` | Tear down (disposes instance + bindings). |
| `static ensureEChartsFramework` | `() => Promise<void>` | Await ECharts load. |

Lookup helpers: `getChartByViewName(viewName, raptorDom)` ≡ `raptorDom.nodeT<RaptorChart>(viewName)`.

## Selection → filter

`RaptorChartActions.buildRaptorChartFilter(action: ViewDefinitions.IDataSourceFilterAction, selections: IRaptorChartSelection[], filterState: IFilterActionState): IQueryWhere | IQueryWhere[][]` — turn a chart selection into a query predicate for cross-filtering a data source. Pair with `value` binding + a data-source `setFilter` (see `raptor` data-source section).

## Dataset contract (recipe / data-source charts)

`RaptorChartDataSetContract extends DataSetContract<IRaptorChart>` registers a `CalcGroupMetric` (single-group) or `CalcDoubleGroupMetric` transform (for `stackedBarChart`, `heatgrid`, `stackedPolarBarChart`, `multiLineRadarChart`, `multiLineChart`, `stackedAreaChart`, `clusteredBarChart`) based on `viewDefinition.originalType`, requires `configValues.groupColumn`, and sets a `ColumnBasedDictionary` data binding. Relevant when binding a chart to a data source/query rather than hand-feeding `chartOptions`.

## Related node types (not raptorChart)

- `type: "chart"` (`Chart` node, `s` simplified chart helpers like `BarChart`/`LineChart`/`PieChart` in the legacy chart folder) — older simplified chart definitions converted via `Chart.convertSimpleChartToFullChart`; supports `method: "echarts" | "plottable"`.
- `RawEChart` — minimal node that just `ml.echarts.init`s its element; no bindings/chrome.

Prefer `raptorChart` for new work.
