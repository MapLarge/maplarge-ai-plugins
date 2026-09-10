# visualMap

A top-level ECharts component (`option.visualMap`, an object or array) that maps one data dimension's numeric value to a visual channel — color, `symbolSize`, opacity, lightness, saturation — and optionally renders an interactive range legend.

## When to use

- A `heatmap` series (it **requires** a `visualMap` to color cells) — see `heatmap.md`.
- A `scatter`/`effectScatter` whose point color or size encodes a third value (see `scatter.md`, `effectscatter.md`).
- A `map`/choropleth where region color encodes a metric.
- Any chart that needs a value→color gradient legend the user can drag to filter (`calculable: true`).

Not the right tool when:

- You want a discrete category→color mapping purely for the **series legend** — that's `legend` + per-series `itemStyle.color`, see `line.md`/`bar.md`.
- You're zooming the data range on an axis — that's `datazoom.md`.

`visualMap` is a component, not a series; it never appears in the `series[]` array.

## Minimal config

A continuous color gradient over a scatter's 3rd dimension:

```ts
const option: ml.echarts.EChartsOption = {
  xAxis: { type: "value" },
  yAxis: { type: "value" },
  visualMap: {
    type: "continuous",
    min: 0, max: 100,
    dimension: 2,                 // color by the 3rd value in each data tuple
    calculable: true,             // draggable handles → emits datarangeselected
    orient: "vertical", right: 10, bottom: 20,
    text: ["High", "Low"],        // [hi, lo] — top label first
    inRange:  { color: ["#2c7bb6", "#ffffbf", "#d7191c"] },
    outOfRange: { color: ["#ccc"] }
  },
  series: [{
    type: "scatter", symbolSize: 12,
    data: [[10, 20, 5], [30, 40, 55], [55, 25, 90], [70, 60, 30]]
  }]
};
```

## Data shape

`visualMap` has no data of its own — it reads `series.data`. `dimension` selects which slot of each data item is mapped:

- Array data: `dimension: 2` reads index 2 of `[x, y, value]` (heatmap cells are `[xIdx, yIdx, value]`, mapped on dim 2 by default).
- Object/dataset data: `dimension` is the column index in the dataset's `dimensions`.
- If `dimension` is omitted, ECharts picks the last value dimension (the one most charts encode as the metric).
`min`/`max` must span the data's value range; values outside `range` get `outOfRange` styling.

## Key options

From `ml.echarts.VisualMapComponentOption` (= `ContinousVisualMapComponentOption | PiecewiseVisualMapComponentOption`):

Shared (`VisualMapOption`):

- `type` : `"continuous" | "piecewise"` — picks which sub-type below.
- `min` / `max` : `number` — value extent to map (required unless `pieces`/`categories` given).
- `dimension` : `number` — which data dimension to encode.
- `seriesIndex` : `'all' | number | number[]` — which series it applies to (default all).
- `inRange` / `outOfRange` : visual config for in/out of the selected range. Each is a `VisualOptionUnit`: `color`, `symbolSize`, `opacity`, `colorAlpha`, `colorLightness`, `colorSaturation`, `colorHue`, `symbol`. Array values are interpolated across the range (continuous) or assigned per piece (piecewise).
- `orient` : `'horizontal' | 'vertical'`; plus `left/right/top/bottom`, `itemWidth`, `itemHeight`, `padding`.
- `text` : `[string, string]` — end labels `[high, low]`; `textStyle`, `formatter`, `precision`.
- `inverse` : `boolean`; `show` : `boolean`; `realtime` : `boolean`.

Continuous (`ContinousVisualMapComponentOption`):

- `calculable` : `boolean` — show draggable handles (drives filtering + `datarangeselected`).
- `range` : `[number, number]` — currently selected sub-range (defaults to `[min, max]`, follows handles).
- `hoverLink` : `boolean` — hovering a data point highlights its spot on the bar (and vice-versa).
- `handleIcon` / `handleSize` / `handleStyle`, `indicatorIcon` / `indicatorStyle`.

Piecewise (`PiecewiseVisualMapComponentOption`):

- `pieces` : `{ min?, max?, lt?, gt?, lte?, gte?, value?, label?, color? }[]` — explicit bins.
- `splitNumber` : `number` — auto-split min..max into N equal bins (when `pieces` omitted).
- `categories` : `string[]` — discrete category names (ignores min/max).
- `selectedMode` : `'multiple' | 'single' | boolean`; `selected` : `{ [piece]: boolean }`.
- `minOpen` / `maxOpen` : `boolean` — open-ended first/last bin; `itemGap`, `itemSymbol`, `showLabel`.

## Patterns

### Theme the ramp from CSS variables

Build the `inRange.color` array from `--chart-heatmap-N` (resolved fresh per access) instead of hardcoding, so it tracks light/dark. See the parent `echarts` theming pattern.

```ts
visualMap: { type: "continuous", min, max, calculable: true,
  inRange: { color: chartTheme.getHeatmapColors() } }   // cool→warm, theme-reactive
```

### Map size, not just color

`inRange` can carry multiple channels. Encode the metric as both color and point size:

```ts
inRange: { symbolSize: [6, 30], color: ["#91cc75", "#fac858", "#ee6666"] }
```

### Piecewise bins with explicit thresholds

```ts
visualMap: { type: "piecewise", dimension: 2, splitNumber: 0,
  pieces: [
    { lt: 50, color: "#91cc75", label: "Low" },
    { gte: 50, lt: 200, color: "#fac858", label: "Mid" },
    { gte: 200, color: "#ee6666", label: "High" } ],
  outOfRange: { color: "#ccc" } }
```

### The `datarangeselected` event (its signature event)

On `calculable` continuous (or piece selection) the user drag fires `datarangeselected`. Wire it via `onChartCreated` (see parent `echarts`):

```ts
chart.on("datarangeselected", (p: { selected?: unknown }) => {
  // continuous: p.selected = [min, max]; piecewise: p.selected = { "0": true, ... }
});
```

Drive selection programmatically with `chart.dispatchAction({ type: "selectDataRange", visualMapIndex: 0, selected: [10, 80] })`.

## Gotchas

- **Heatmap needs it.** A `heatmap` with no `visualMap` renders invisible/uniform cells.
- **`min`/`max` are mandatory** for continuous and `splitNumber`-based piecewise; omit them and the mapping is undefined. Set them to the real data extent.
- **`dimension` defaults to the last value dim**, not dim 0 — set it explicitly when your value isn't last.
- **`text` order is `[high, low]`** (top-to-bottom), the reverse of what people expect.
- **Multiple `visualMap`s** must each target distinct `seriesIndex`/`dimension`, or they fight over the same channel.
- **`calculable` filters the data** (out-of-range points hide unless `outOfRange` is set) — set `outOfRange` to grey them instead of dropping them.
- **Type name typo:** the TS type is `ml.echarts.ContinousVisualMapComponentOption` ("Continous", one *u*), even though the `type` string is `"continuous"`.
- **Re-emitting the option merges** — to clear/replace a `visualMap`, return a fresh value from the bound getter (parent `echarts` setOption merge gotcha).

## Related skills

- `echarts` — parent: option model, `setOption` merge, `onChartCreated` event wiring, CSS-variable theming.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `nodeT<RaptorChart>`).
- `heatmap.md` — the series that requires a `visualMap`.
- `scatter.md`, `effectscatter.md` — value-driven color/size on points.
- `datazoom.md` — for ranging the axis instead of the visual channel.
