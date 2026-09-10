# ECharts Reference Cheatsheet (MapLarge ADK)

Sources: Apache ECharts option/API docs (echarts.apache.org/en/option.html, echarts.apache.org/en/api.html) for the general model; the MapLarge-specific binding/theming layer is the Raptor `s.chart` node + `ml.echarts.*` types. The api.html / option.html pages are SPAs that often do not fetch as text, so the general API/option lists below come from established ECharts knowledge; the MapLarge-specific layer is described generically so it applies to any ADK extension.

## Instance / global API (echarts.ECharts, typed `ml.echarts.ECharts`)

Global (echarts namespace):

- `echarts.init(dom, theme?, opts?)` → ECharts. `opts: { renderer: "canvas"|"svg", width, height, devicePixelRatio, useDirtyRect, locale }`.
- `echarts.use([...])` — register tree-shaken components (modern builds).
- `echarts.registerTheme(name, themeObj)`, `echarts.registerMap(name, geoJson)`, `echarts.getMap(name)`.
- `echarts.connect(group)` / `echarts.disconnect(group)` — link multiple charts (shared tooltip/zoom); `getConnectedDataURL` exports the group.
- `echarts.getInstanceByDom(dom)`, `echarts.dispose(dom|instance)`.
- `echarts.graphic.clipRectByRect(targetRect, frameRect)` → clipped rect or undefined. **Used in renderItem** to clip a gantt/timeline bar to the plot rect. Other `echarts.graphic` helpers: `extendShape`, `LinearGradient`, `RadialGradient`.

Instance methods:

- `setOption(option, notMerge?, lazyUpdate?)` or `setOption(option, { notMerge, replaceMerge, lazyUpdate, silent })`. Default = deep merge per component. `replaceMerge: "series"` replaces all series. `notMerge: true` wipes prior option.
- `getOption()` → the full resolved option (used to read `dataZoom[0].start/end` on the `dataZoom` event).
- `getWidth()`, `getHeight()`, `getDom()`.
- `getDataURL(opts?)` / `getConnectedDataURL(opts?)`. `opts: { type: "png"|"jpg"|"svg", pixelRatio, backgroundColor, excludeComponents }`. **Wrap it** to force `backgroundColor: var(--bs-body-bg)` for theme-correct exports.
- `convertToPixel(finder, value)` / `convertFromPixel(finder, px)` / `containPixel(finder, px)`.
- `dispatchAction(payload)` — programmatic actions, e.g. `{ type: "dataZoom", start, end }`, `{ type: "highlight", seriesIndex, dataIndex }`, `{ type: "showTip" }`, `{ type: "legendToggleSelect", name }`, `{ type: "brush" }`, `{ type: "restore" }`.
- `on(eventName, handler)` / `on(eventName, query, handler)` / `off(eventName, handler?)`.
- `resize(opts?)` — `{ width, height, silent, animation }`. RaptorChart node exposes `node.resize({left,right,top,bottom})`.
- `showLoading(type?, opts?)` / `hideLoading()`.
- `appendData({ seriesIndex, data })` — large streaming datasets.
- `clear()`, `dispose()`, `isDisposed()`.

Events (`chart.on(name, ...)`): mouse — `click`, `dblclick`, `mousedown/up/move`, `mouseover/out`, `globalout`, `contextmenu`. Component — `legendselectchanged`, `legendselected/unselected`, `datazoom`, `datarangeselected` (visualMap), `timelinechanged`, `restore`, `dataviewchanged`, `magictypechanged`, `geoselectchanged`, `brush/brushselected/brushEnd`, `axisareaselected`. Lifecycle — `rendered`, `finished`. Click `params`: `{ componentType, seriesType, seriesIndex, seriesName, name, dataIndex, data, value, color, event }`.

## RaptorChart node (MapLarge)

- Look up: `this.raptorDom.nodeT<RaptorChart>(viewName)` or `this.raptorDom.raptorNodes.getByView(viewName) as RaptorChart`.
- `node.onChartCreated((chart: ml.echarts.ECharts) => {...})` — fires when the underlying instance is created; may re-fire per instance (guard one-time setup).
- `node.resize({ left, right, top, bottom })`.
- `RaptorChart` imported from `raptor/raptorDom/controls/RaptorCharts/RaptorChart` (framework, provided by the platform).

`s.chart({...})` builder fields: `viewName`, `id`, `type: "raptorChart"`, `height`, `minHeight`, `widthPercentage`/`widthUtility`, `flex`, `padding`, `overflow`, `disableMenu`, `disableSelection`, `defaultClickAction`, `availableClickActions: string[]` (`["inspect"]` or `[]`), `options` (ECharts option object), `bindings: { traverseRaptorChart: true }`, `events: [{ event, param?, handler }]`.

## Option tree (top-level components)

| Key | Purpose | Notable sub-keys |
| ----- | --------- | ------------------ |
| `title` | chart title | `text`, `subtext`, `left/top`, `textStyle` |
| `legend` | series toggles | `show`, `data`, `type: "plain" \| "scroll"`,`orient`,`selectedMode` |
| `grid` | cartesian plot rect | `top/bottom/left/right`, `containLabel`, `show`, `backgroundColor`; array for multi-grid |
| `xAxis`/`yAxis` | axes (array allowed) | `type`, `data`, `name`, `nameLocation`, `nameGap`, `nameRotate`, `min/max`, `axisLabel{interval,rotate,formatter,color}`, `axisLine.lineStyle`, `splitLine`, `boundaryGap`, `position` |
| `polar`/`radiusAxis`/`angleAxis` | polar coords | for pie-alt, radar-ish |
| `radar` | radar indicator | `indicator: [{name,max}]` |
| `dataZoom` | zoom/pan | `type:"slider" \| "inside"`,`xAxisIndex`,`yAxisIndex`,`filterMode`,`start/end`,`startValue/endValue`,`realtime`,`showDataShadow`,`labelFormatter` |
| `visualMap` | value→color | `type:"continuous" \| "piecewise"`,`min/max`,`range`,`calculable`,`orient`,`inRange.color`,`text`,`dimension`,`seriesIndex` |
| `tooltip` | hover info | `trigger:"item" \| "axis" \| "none"`,`axisPointer.type:"line" \| "shadow" \| "cross"`,`formatter`,`renderMode:"html" \| "richText"`,`appendTo`,`confine`,`showContent`,`textStyle`,`borderColor` |
| `axisPointer` | global pointer | `type`, `link`, `label` |
| `toolbox` | built-in tools | `feature.{dataZoom,saveAsImage,restore,dataView,magicType,brush}` |
| `brush` | region select | `toolbox`, `brushType`, `brushLink` |
| `graphic` | free shapes | `elements: [{type:"group" \| "rect" \| "text" \| "circle" \| "line" \| "image", left/top, shape, style, z, children}]` |
| `dataset` | shared data | `dimensions`, `source`; series pick via `datasetIndex` + `encode` |
| `aria` | accessibility | — |
| `series` | the data | array; each `{ type, ... }` |
| `color` | default palette | `string[]` |
| `backgroundColor`, `textStyle`, `animation`, `animationEasing`, `useUTC` | globals | e.g. `useUTC: true`, `animationEasing: "quinticInOut"` |

## Series types (common)

- **line**: `data`, `smooth`, `step`, `areaStyle`, `stack`, `symbol`, `lineStyle`, `connectNulls`, `markLine`, `markArea`, `markPoint`.
- **bar**: `data`, `stack`, `barWidth/barGap/barCategoryGap`, `itemStyle`, `label.position`, `encode`. (typed `ml.echarts.BarSeriesOption`.)
- **scatter** (`effectScatter` for ripple): `data`, `symbol` (incl. `path://...` SVG), `symbolSize` (number | [w,h] | fn), `encode`, `emphasis.scale`. (e.g. a target overlay with `symbol: path://...`, `symbolSize: () => [w,h]`.)
- **pie**: `data:[{name,value}]`, `radius`, `center`, `roseType`, `label`, `labelLine`.
- **heatmap**: `data:[[x,y,value]]`, needs a `visualMap` for color, `itemStyle`, category x/y axes. (typed `ml.echarts.HeatmapSeriesOption`.)
- **custom**: `renderItem(params, api)`, `coordinateSystem`, `encode`, `data`, `clip`. See renderItem API below. (typed `ml.echarts.CustomSeriesOption`.)
- others: `candlestick`, `boxplot`, `graph`, `tree`, `treemap`, `sunburst`, `sankey`, `funnel`, `gauge`, `parallel`, `themeRiver`, `pictorialBar`, `lines`, `map`, `geo`.

Per-series shared: `name`, `type`, `z`, `zlevel`, `silent`, `tooltip`, `itemStyle`, `emphasis`, `label`, `labelLine`, `markLine`, `markArea`, `markPoint`, `encode`, `datasetIndex`, `dimensions`, `animation`.

`markLine`/`markArea`/`markPoint`:

- `markLine.data`: `[{ xAxis|yAxis|coord:[x,y]|type:"average"|"min"|"max", name }]` or pairs `[{coord},{coord}]` for segments. `symbol`, `lineStyle`, `label`, `silent`, `z`.
- `markArea.data`: pairs `[{ xAxis, name }, { xAxis }]`. `itemStyle`, `label`.
- **Category-axis collapse**: a `markLine`/`markArea` where start === end has zero extent; emit those via a custom series with `api.coord` instead.

## Custom series renderItem API (`ml.echarts.Custom*` types)

`renderItem(params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) → CustomSeriesRenderItemReturn`

`api`:

- `api.value(dimIndex)` — value of the current item at a dimension.
- `api.coord([x, y])` → `[px, py]` data→pixel (interpolates between category band centers — works for single-cell marks where markLine fails).
- `api.size([dx, dy])` → `[pxW, pxH]` size of a data delta (`api.size([1,1])` = one heatmap cell).
- `api.style(extra?)` — themed style object (fill/stroke from series).
- `api.visual(key)`, `api.barLayout(...)`, `api.currentSeriesIndices()`, `api.font(opts)`.

`params`: `{ context, seriesId, seriesName, seriesIndex, dataIndex, dataIndexInside, coordSys: { type, x, y, width, height }, encode }`. Use `params.coordSys.{x,y,width,height}` as the clip frame.

Return: a graphic element — `{ type: "rect"|"group"|"text"|"circle"|"line"|"polygon"|"sector"|"image", shape, style, transition, z, children }`, or `undefined`/falsy to draw nothing (return `rectShape && {...}` so clipped-out items vanish).

```ts
// canonical gantt-bar renderItem
const start = api.coord([api.value(1), api.value(0)]);
const end   = api.coord([api.value(2), api.value(0)]);
const h = api.size([0,1])[1] * 0.6;
const rect = ml.echarts.graphic.clipRectByRect(
  { x: start[0], y: start[1]-h/2, width: end[0]-start[0], height: h },
  { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height });
return rect && { type:"rect", transition:["shape"], shape: rect, style: api.style() };
```

## MapLarge theming layer

Charts should never hardcode colors — resolve `--chart-*` / `--bs-*` CSS variables at access time so light/dark theme switches apply. A typical extension wraps this in a small theme helper/service:

- `resolveCssVariable("var(--name)")` → computed color (read from the themed element carrying the active theme attribute, not `:root`).
- `resolveColorArray(string[])`, `readCssColorArray(prefix, fallback)` — iterate `--prefix-1..N` to build a palette with a fallback.
- Theme-reactive getters such as `text`, `textMuted`, `border`, `neutral`, `gapOverlay` (recomputed on each access).
- Status colors keyed by `success | warning | error | neutral | info`.
- A singleton service exposing `getSeriesColors()` → `--chart-series-N` (with contextual fallback), `getHeatmapColors()` → `--chart-heatmap-N` (cool→warm fallback), and `getStatusColor(key)`.

## Where charts live in an extension

A chart in a MapLarge ADK extension is the node class + its View + ViewModel working together:

- The **view** (`client/views/...`) declares `s.chart({ viewName, options, bindings: { traverseRaptorChart: true }, events })`, with option leaves bound to `s.prefix(vmKey).getTypedProp("...")`.
- The **ViewModel** (`client/view-models/...` or `client/viewModels/...` — match whichever folder the file you are editing uses) exposes getters returning `ml.echarts.*` option fragments (series arrays, datasets, axis layouts, `graphic` elements) and, after mount, attaches imperative behavior in `node.onChartCreated` (click drilldown, `dataZoom` persistence, `datarangeselected` filtering).
- A reusable chart **helper** module often centralizes data loading, gap-marker computation (markLine/markArea pairs + single-band custom markers), gantt defaults, and HTML tooltip swatch builders (remember `opacity: 1 !important` on swatches to escape inherited framework opacity).

Build with `mlcomp "<Ext>"`; keep CLI/ADK current with `maplarge adk update-version`. Do not edit files under `.adk/`.
