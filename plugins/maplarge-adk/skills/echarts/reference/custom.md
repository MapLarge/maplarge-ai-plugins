# Custom Series (renderItem)

The `type: "custom"` series — you supply a `renderItem(params, api)` callback that returns ECharts graphic elements per data item. The escape hatch for charts no built-in series can draw.

## When to use

Use a custom series when you need a bespoke mark anchored to a coordinate system: gantt/timeline bars (start→end on a category row), error bars, range/profit bands, dumbbell/lollipop pairs, single-cell overlays on a heatmap, or arbitrary shapes that track an axis as you zoom/pan.

Prefer a built-in series first — it is far less code and gets tooltips/legend/emphasis for free:

- Time/value bars → `bar.md`. Points → `scatter.md` (or `effectscatter.md`). Matrix cells → `heatmap.md`.
- OHLC candles → `candlestick.md`. Statistical min/Q1/median/Q3/max → `boxplot.md`.
Only drop to custom when none of those produce the geometry you need.

## Minimal config

A gantt-style timeline: each row is a category, each bar spans `start`→`end` on a value x-axis. Data tuple is `[rowIndex, start, end]`.

```ts
const option: ml.echarts.EChartsOption = {
  grid: { left: 90, right: 20, top: 20, bottom: 30 },
  xAxis: { type: "value", name: "t" },
  yAxis: { type: "category", data: ["Alpha", "Bravo", "Charlie"] },
  tooltip: {
    formatter: (p: any) => `${p.name}: ${p.value[1]}–${p.value[2]}`
  },
  series: [{
    type: "custom",
    coordinateSystem: "cartesian2d",
    encode: { x: [1, 2], y: 0 },           // dims used by axis pointer / dataZoom
    clip: true,                            // clip elements to the grid rect
    data: [
      { value: [0, 2, 7], itemStyle: { color: "#5470c6" } },
      { value: [1, 4, 9], itemStyle: { color: "#91cc75" } },
      { value: [2, 1, 5], itemStyle: { color: "#fac858" } }
    ],
    renderItem: (params, api) => {
      const rowIdx = api.value(0);
      const start  = api.coord([api.value(1), rowIdx]);
      const end    = api.coord([api.value(2), rowIdx]);
      const h = (api.size!([0, 1]) as number[])[1] * 0.6;
      return {
        type: "rect",
        shape: { x: start[0], y: start[1] - h / 2, width: end[0] - start[0], height: h },
        style: api.style()
      };
    }
  }]
};
```

## Data shape

`series.data` is an array of items, each a value tuple or `{ value: [...], itemStyle?, ... }`. There is no fixed dimension count — `renderItem` decides which slots mean what via `api.value(dim)`. Common conventions:

- Gantt/timeline: `[categoryIndex, start, end]`.
- Error bar: `[categoryIndex, low, high]` (often alongside a sibling bar series).
- Range band: `[x, yLow, yHigh]`.

`encode` does NOT drive your geometry (you read values yourself) — it tells ECharts which dims feed the axis pointer, dataZoom filtering, and the default tooltip. Set `encode: { x: [startDim, endDim], y: catDim }` so zoom/tooltip line up. You may also feed data via `dataset` + `datasetIndex` instead of inline `data`.

## Key options (`ml.echarts.CustomSeriesOption`)

- `renderItem : (params, api) => element | undefined | null` — the per-item callback. Returning `undefined`/`null` draws nothing for that item.
- `coordinateSystem : "cartesian2d" | "polar" | "geo" | "calendar" | "singleAxis" | "none"` — what `api.coord` maps against. `"none"` = raw pixels (use `api.getWidth()`/`getHeight()`).
- `encode : { x, y, tooltip, ... }` — dim→role map for axisPointer/dataZoom/tooltip (`OptionEncode`).
- `data` — the item array (see Data shape). Per-item `itemStyle`/`label` flow into `api.style()`/`api.styleEmphasis()`.
- `clip : boolean` — clip returned elements to the coordinate-system rect (set `true` for zoomable cartesian; cheaper than manual `clipRectByRect`).
- `xAxisIndex`/`yAxisIndex` (or `singleAxisIndex`/`calendarIndex`/`geoIndex`/`polarIndex`) — which axis/coord instance when several exist.
- `dimensions` — name the data dims so tooltip/`api.value("name")` can use names.
- Series-level `itemStyle`/`label`/`emphasis` are **deprecated** for custom — style per element inside `renderItem` instead.

See the Reference section below for the full `api.*` / `params.*` surface and the element-option shapes.

## Patterns

### Group multiple shapes per item

Return a `group` whose `children` is an array of elements (bar + label + whisker). Each child is itself a rect/line/text with its own `shape`/`style`.

```ts
return { type: "group", children: [
  { type: "rect", shape: barShape, style: api.style() },
  { type: "line", shape: { x1, y1, x2, y2 }, style: { stroke: api.visual("color") } }
]};
```

### Manual clipping for single-band marks on a category axis

`markLine`/`markArea` collapse to nothing on a category axis when start === end. Draw the mark as a custom rect and clip it to the plot rect:

```ts
const r = ml.echarts.graphic.clipRectByRect(
  { x, y, width, height },
  { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height });
return r && { type: "rect", shape: r, style: api.style() };
```

(`params.coordSys` carries `x/y/width/height` at runtime even though it is typed as `{ type }`; cast as needed.)

### Theme the fill from the series palette

`api.style()` already merges the item's `itemStyle` and the assigned series color, so it respects per-item `itemStyle.color` you set in `data`. For a custom stroke, read `api.visual("color")` or capture a themed CSS-variable color in the closure (renderItem has no `this`).

### Transitions on zoom

Add `transition: ["shape"]` to a returned element so bars animate smoothly when `data`/zoom changes rather than snapping.

## Gotchas

- **`renderItem` has no `this` and runs once per data item** (hot path). Capture VM/theme values in the closure; precompute `Map` lookups instead of `indexOf` inside it.
- **`api.size` is optional in the types** — guard or `!`-assert. It returns the pixel extent of one data unit: `api.size([0,1])[1]` = one category row's height.
- **`api.coord` takes a full coordinate tuple**, e.g. `[xValue, categoryIndex]`, and returns `[px, py]`. Passing a scalar gives wrong results on cartesian.
- **Geometry comes from your code, not `encode`.** Forgetting `encode` still draws, but the axisPointer/dataZoom/tooltip will be wrong.
- **Set `clip: true`** (or clip manually) on zoomable cartesian charts, or shapes spill outside the grid when panned.
- **No automatic legend/emphasis.** Custom series gives you pixels; wire hover via element `emphasis`/`focus` and tooltips via `tooltip.formatter`.
- **In Raptor**, bind `renderItem` like any function leaf (`renderItem: <any>s.prefix(vmKey).getTypedProp("renderRowBar")`) and keep `bindings: { traverseRaptorChart: true }`.

## Related skills

- `echarts` — parent: option model, the `s.chart` node, theming, events. the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view.
- Built-in alternatives to try first: `bar.md`, `scatter.md`, `heatmap.md`, `candlestick.md`, `boxplot.md`, `effectscatter.md`.
- `dataset.md` — feed `data` via dataset + `encode` instead of inline tuples.

Official option reference: <https://echarts.apache.org/en/option.html#series-custom>

---

render# Custom series — renderItem cheatsheet

Grounded in `ml.echarts.CustomSeriesOption`, `CustomSeriesRenderItemParams`, `CustomSeriesRenderItemAPI`, and `CustomRootElementOption` in the bundled d.ts.

## `params` — `CustomSeriesRenderItemParams`

| field | type | meaning |
| --- | --- | --- |
| `context` | `Dictionary<unknown>` | scratch object you may write to; persists across calls for the same series render |
| `dataIndex` | `number` | index into the original `data` array |
| `dataIndexInside` | `number` | index after dataZoom filtering — use for `api.value(dim, dataIndexInside)` |
| `dataInsideLength` | `number` | count of currently-visible items |
| `seriesId` / `seriesName` / `seriesIndex` | `string`/`string`/`number` | identity of this series |
| `encode` | `Dictionary<number[]>` | resolved dim→indices map (what `encode` config became) |
| `coordSys` | typed `{ type: string }` | **at runtime also carries `x, y, width, height`** for cartesian — cast to read the plot rect |
| `actionType` | `string?` | the action that triggered this render, if any |

## `api` — `CustomSeriesRenderItemAPI`

Data access:

- `value(dim, dataIndexInside?) : ParsedValue` — read a slot of the current (or given) data tuple. `dim` is index or dimension name.
- `ordinalRawValue(dim, dataIndexInside?)` — raw category value (before ordinal→index conversion).

Coordinate mapping (`CustomSeriesRenderItemCoordinateSystemAPI`):

- `coord(data, clamp?) : number[]` — data tuple → pixel `[x, y]`. e.g. `api.coord([xVal, catIdx])`.
- `size?(dataSize, dataItem?) : number | number[]` — pixel extent of a data delta. `api.size([0,1])` → `[0, rowHeightPx]`; `api.size([1,0])` → `[unitWidthPx, 0]`. **Optional — guard it.**

Styling:

- `style(userProps?, dataIndexInside?) : ZRStyleProps` — merged normal style (item `itemStyle` + series color + your overrides). Deprecated in types but the standard way to style.
- `styleEmphasis(userProps?, idx?)` — emphasis-state style.
- `visual(visualType, idx?)` — a single resolved visual, e.g. `api.visual("color")`, `"opacity"`, `"symbolSize"`.
- `font(opt)` — build a CSS font string from `{ fontStyle, fontWeight, fontSize, fontFamily }` for `text` elements.

Canvas / layout:

- `getWidth()` / `getHeight()` — canvas size (use with `coordinateSystem: "none"`).
- `getZr()` / `getDevicePixelRatio()`.
- `barLayout(opt) : BarGridLayoutResult` — compute bar-band geometry matching built-in bars (for bar-aligned custom marks).
- `currentSeriesIndices()` — indices of all currently-rendered series.

## Return value — `CustomRootElementOption`

A single element option, or a `group`, or `undefined`/`null` to draw nothing. Root element may also carry `focus`, `blurScope`, `emphasisDisabled`.

### Element `type` values (`CustomElementOption`)

Built-in shapes (`type` + `shape`):

| type | key `shape` fields |
| --- | --- |
| `rect` | `x, y, width, height, r?` |
| `circle` | `cx, cy, r` |
| `ring` | `cx, cy, r, r0` |
| `sector` | `cx, cy, r, r0, startAngle, endAngle, clockwise` |
| `arc` | `cx, cy, r, startAngle, endAngle, clockwise` |
| `polygon` | `points: [x,y][]` |
| `polyline` | `points: [x,y][]` |
| `line` | `x1, y1, x2, y2, percent?` |
| `bezierCurve` | `x1,y1,x2,y2,cpx1,cpy1, cpx2?,cpy2?, percent?` |
| `ellipse` | `cx, cy, rx, ry` |
| `compoundPath` | `paths: [...]` |

Other element types:

- `path` — SVG path: `shape: { pathData / d, x, y, width, height, layout: "center" | "cover" }`.
- `image` — `style: { image, x, y, width, height }`.
- `text` — `style: { text, x, y, fill, font, fontSize, align, verticalAlign, ... }`.
- `group` — `{ type: "group", children: CustomElementOption[], width?, height?, diffChildrenByName?, $mergeChildren? }`.

### Common element fields (`CustomDisplayableOption` / `CustomBaseElementOption`)

- `style` — `ZRStyleProps`: `fill`, `stroke`, `lineWidth`, `opacity`, `shadowBlur`, `lineDash`, plus text props for `text` elements.
- `shape` — geometry (see table); supports `TransitionOptionMixin`.
- `transition` — array of prop names to animate, e.g. `["shape"]`, `["x","y"]`. `enterAnimation`/`updateAnimation`/`leaveAnimation`/`during`/`keyframeAnimation` for finer control.
- `x` / `y` / `rotation` / `scaleX` / `scaleY` / `originX` / `originY` — transform props (animatable).
- `z` / `z2` / `zlevel` — stacking order; `invisible`, `ignore`, `silent` (no events).
- `clipPath` — a `path`/`rect` element option, or `false`.
- `info` — arbitrary data attached to the element (read in click handlers via `params.info`).
- `emphasis` / `blur` / `select` — per-state `{ style, z2, ...transform }`.
- `focus: "none" | "self" | "series" | number[]` and `blurScope` — emphasis fade behavior (root element only).
- `textContent` — a child `text` element + `textConfig` for positioned labels on a shape.

## Coordinate systems

`coordinateSystem` controls what `api.coord` maps against:

- `"cartesian2d"` — `api.coord([xVal, yVal])`; pair with `xAxisIndex`/`yAxisIndex`.
- `"polar"` — `api.coord([radiusVal, angleVal])`; `polarIndex`.
- `"calendar"` — `api.coord([timestamp])` → cell center; `calendarIndex`. Use `api.size` for cell size.
- `"geo"` — `api.coord([lng, lat])`; `geoIndex`.
- `"singleAxis"` — `api.coord([val])`; `singleAxisIndex`.
- `"none"` — no mapping; position with raw pixels via `getWidth()`/`getHeight()`.

## `graphic.clipRectByRect`

`ml.echarts.graphic.clipRectByRect(targetRect, clipRect) : ZRRectLike | undefined`

Intersects `targetRect` with `clipRect` (both `{ x, y, width, height }`); returns the clipped rect or `undefined` when fully outside. Use to keep a custom rect inside the plot area when you are not using series-level `clip: true`. Returns falsy → return nothing for that item.

## Raptor binding note

Bind `renderItem` (and any data getters) like other function leaves:

```ts
series: [{ type: "custom", coordinateSystem: "cartesian2d",
  encode: { x: [1, 2], y: 0 },
  data: <any>s.prefix(vmKey).getTypedProp("rows"),
  renderItem: <any>s.prefix(vmKey).getTypedProp("renderRowBar") }]
// keep bindings: { traverseRaptorChart: true } on the s.chart node
```

Type the VM method as `(params: ml.echarts.CustomSeriesRenderItemParams, api: ml.echarts.CustomSeriesRenderItemAPI) => ml.echarts.CustomSeriesRenderItemReturn`.
