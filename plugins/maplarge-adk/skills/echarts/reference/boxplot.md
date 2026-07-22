# Boxplot series

Statistical box-and-whisker series (`type: "boxplot"`) that draws one box per category from a five-number summary, ideal for comparing distributions side by side.

## When to use

- Comparing the **distribution** (median, quartiles, spread, range) of a numeric metric across several categories or groups.
- Showing variability/skew at a glance — box = IQR (Q1–Q3), line in box = median, whiskers = min/max, dots = outliers.
- Pairs naturally with a sibling `scatter` series for outlier points (the ECharts boxplot transform emits those separately).

Use a different series when:
- **OHLC / financial candles** → `candlestick.md` (different 4-value semantics: open/close/low/high).
- **Single aggregate per category** (just a mean or count) → `bar.md`.
- **Raw points, no summarization** → `scatter.md`.
- Continuous value-over-value spread → consider `scatter.md` with regression.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "item" },
  xAxis: { type: "category", data: ["Alpha", "Bravo", "Charlie", "Delta"],
           boundaryGap: true, nameGap: 30 },
  yAxis: { type: "value", name: "Latency (ms)", splitArea: { show: true } },
  series: [{
    type: "boxplot",
    name: "Latency",
    // each datum is [min, Q1, median, Q3, max]
    data: [
      [12, 18, 25, 33, 51],
      [ 8, 15, 21, 29, 44],
      [20, 27, 34, 41, 60],
      [ 5, 11, 16, 22, 39]
    ],
    itemStyle: { borderWidth: 1.5 }
  }] as ml.echarts.BoxplotSeriesOption[]
};
```

## Data shape

`series.data` is an array, one entry per category (aligned to the category axis):

- **Tuple form** — `BoxplotDataValue = number[]` ordered exactly `[min, Q1, median, Q3, max]` (5 numbers; the d.ts types it as `OptionDataValueNumeric[]`).
- **Object form** — `BoxplotDataItemOption = { value: [min,Q1,median,Q3,max], itemStyle?, label?, emphasis? }` to style/annotate a single box.

You supply the **summary**, not raw samples. Two ways to compute it from raw arrays:
- **ECharts dataset transform** (client-side): a raw dataset (rows of `[category, sample…]`) plus a transform dataset `{ transform: { type: "boxplot", config: { itemNameFormatter: "Grp {value}" } } }`. It outputs the 5-number boxes on `datasetIndex` 1 and the outliers as a named secondary result you bind to a `scatter` series. The boxplot series then uses `datasetIndex: 1`.
- **MapLarge query transform** (server-side aggregation): `CalcGroupBoxplot` (`ICalcGroupBoxplotOptions { groupColumn, valueColumn, groupPrecision? }`) returns columns `group, min, q1, median, q3, max` per group. Map those columns into the tuples (or feed via `dataset` + `encode`).

## Key options (`ml.echarts.BoxplotSeriesOption`)

- `type: "boxplot"` — required discriminant.
- `data: (number[] | BoxplotDataItemOption)[]` — the per-category summaries above.
- `layout: "horizontal" | "vertical"` — box orientation; defaults to the **value axis** direction. Set `"horizontal"` to lay boxes left-to-right (value axis = x).
- `boxWidth: (string | number)[]` — `[min, max]` box width as px or `"%"` of the category band (default `["7%", "50%"]`); clamps box thickness as category count changes.
- `itemStyle: ItemStyleOption` — `color` (box fill), `borderColor`, `borderWidth`, `opacity`, `shadow*`. Border color is the box/whisker stroke.
- `label`, `emphasis` (with `emphasis.focus`, `emphasis.scale`) — hover/highlight styling; per-box overrides go in the object-form datum.
- `xAxisIndex` / `yAxisIndex` (and `*Id`) — target axes when the grid has multiple.
- `datasetIndex` / `encode` / `dimensions` / `seriesLayoutBy` — dataset binding (from `SeriesEncodeOptionMixin`); pair with the boxplot transform above.
- `coordinateSystem: "cartesian2d"` — only supported system (needs one `category` + one `value` axis).

## Patterns

**Outliers as a companion scatter.** The boxplot transform splits outliers out; render them as a second series so points beyond the whiskers stay visible:
```ts
series: [
  { type: "boxplot", datasetIndex: 1 },
  { type: "scatter", datasetIndex: 2, symbolSize: 6 }
] as ml.echarts.SeriesOption[]
```

**Horizontal layout for long category names.** Swap axis roles and set `layout: "horizontal"`:
```ts
xAxis: { type: "value" }, yAxis: { type: "category", data: groups },
series: [{ type: "boxplot", layout: "horizontal", data }]
```

**Theme-reactive styling.** Don't hardcode colors — pull from the theme helper (see parent `echarts` skill): `itemStyle: { color: chartTheme.neutral, borderColor: chartTheme.border }`.

**Per-box highlight.** Use the object datum to flag an outlier group:
```ts
{ value: [20,27,34,41,60], itemStyle: { borderColor: chartTheme.danger, borderWidth: 2 } }
```

**Events.** Wire `click` on the chart instance (parent skill's `onChartCreated`); `params.data` is the `[min,Q1,median,Q3,max]` tuple and `params.dataIndex` the category index — use it to drilldown to the underlying samples.

## Gotchas

- **Order is fixed**: `[min, Q1, median, Q3, max]` — not `[low, open, close, high]`. Swapping with candlestick semantics renders garbage. ECharts does no validation.
- **No raw-sample input.** A boxplot series never aggregates; you must precompute (transform or server). Feeding raw samples draws nothing meaningful.
- **Use the category axis for boxes.** Both axes `value`, or no category axis, yields empty/misplaced boxes; one axis must be `type: "category"`.
- **`layout` follows the value axis by default** — if boxes appear rotated, you set `layout` opposite to your axis arrangement.
- **Outliers vanish without a scatter series.** The box only spans min→max of the *non-outlier* range when using the transform; standalone tuples include whatever you put in min/max.
- **Stacking/`stack` does not apply** — boxplots aren't stackable like bars; ignore that field.
- Tooltip default shows the raw tuple; supply `tooltip.formatter` to label min/Q1/median/Q3/max for readability.

## Related skills

- `echarts` — parent: option model, dataset transforms, theming, `onChartCreated` events, `setOption` merge behavior.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart`, VM getters typed `ml.echarts.BoxplotSeriesOption[]`).
- `candlestick.md` — sibling 4-value OHLC series (use for financial bars, not distributions).
- `scatter.md` — companion for outlier points and for raw, unsummarized data.
- `bar.md` — single aggregate per category when distribution isn't needed.
- `dataset.md` — the `dataset` + `transform: "boxplot"` + `encode` plumbing.

Official option reference (SPA — open in a browser): https://echarts.apache.org/en/option.html#series-boxplot
