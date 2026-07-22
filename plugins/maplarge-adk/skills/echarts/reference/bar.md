# ECharts Bar / Column Series

Categorical bar and column charts: `type: "bar"`, typed `ml.echarts.BarSeriesOption`. One bar per category value, grouped across series, optionally stacked.

## When to use
- Comparing a measure across **discrete categories** (counts, totals, per-group breakdowns).
- **Grouped** bars: several `bar` series sharing one category axis (e.g. this-week vs last-week).
- **Stacked** bars: parts that sum to a category total — give series the same `stack` id.
- **Horizontal** bars (long labels, ranked lists): put the category axis on `yAxis`.

Use a sibling instead when:
- Trend over a continuous/time axis → `line.md`.
- One total split into slices → `pie.md`.
- Ordered conversion/drop-off stages → `funnel.md`.
- Density/matrix of two categoricals → `heatmap.md`.

## Minimal config
A complete vertical grouped bar `ml.echarts.EChartsOption`:
```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
  legend: {},
  grid: { left: 8, right: 16, bottom: 8, top: 32, containLabel: true },
  xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  yAxis: { type: "value" },
  series: [
    { name: "Planned",  type: "bar", data: [120, 200, 150, 80, 70] },
    { name: "Actual",   type: "bar", data: [90, 180, 170, 60, 110] }
  ]
};
```
- `tooltip.trigger: "axis"` + `axisPointer.type: "shadow"` is the standard bar tooltip (highlights the whole category band).
- `containLabel: true` keeps rotated/long axis labels inside the grid.

## Data shape
`series.data` is one entry per category, **aligned to the category axis `data` order**:
- Plain values: `data: [120, 200, 150]` (paired positionally with `xAxis.data`).
- Per-bar styling: `data: [{ value: 200, itemStyle: { color: "#c0392b" } }, ...]` — a `BarDataItemOption` ( `value`, `name`, `itemStyle`, `label`, `cursor`, `emphasis`).
- Use `null` for a missing category (leaves a gap, keeps alignment).
- With a shared `dataset`, omit `data` and use `encode: { x: "category", y: "amount" }` (datasetIndex/seriesLayoutBy) — see `dataset.md`.

## Key options (from `ml.echarts.BarSeriesOption` / `BaseBarSeriesOption`)
- `type: "bar"` — required discriminant.
- `coordinateSystem?: "cartesian2d" | "polar"` — default cartesian; `"polar"` draws radial/angular bars.
- `stack?: string` (`SeriesStackOptionMixin`) — series with the **same stack id** stack together. `stackStrategy?: "samesign" | "all" | "positive" | "negative"` controls how mixed-sign values pile.
- `barWidth?: number | string` — fixed width (px) or percent of category band (`"60%"`).
- `barMaxWidth? / barMinWidth?: number | string` — clamp auto-computed width.
- `barGap?: string | number` — gap **between series within a category** (default `"30%"`; `"-100%"` overlaps series — the background-bar trick).
- `barCategoryGap?: string | number` — gap **between categories** (default `"20%"`; `"0%"` = touching, histogram look).
- `barMinHeight?: number` — minimum pixel height so tiny/zero values stay visible.
- `barMinAngle?: number` — polar equivalent.
- `label?` (via `BarStateOption.label`) — `{ show, position, formatter, color }`. Bar positions: `"top"`, `"inside"`, `"insideTop"`, `"insideRight"` (use `"insideRight"`/`"right"` for horizontal).
- `itemStyle?: BarItemStyleOption` — `color`, `opacity`, `borderColor`, `borderWidth`, plus **`borderRadius`** (number or `[tl,tr,br,bl]`) for rounded bars.
- `emphasis?` (`BarStatesMixin`) — hover state (`itemStyle`, `label`, `focus: "series"`).
- `showBackground?: boolean` + `backgroundStyle?` (ItemStyle + `borderRadius`) — track behind each bar (progress-bar look).
- `large?: boolean` / `largeThreshold?: number` — fast path that batches bar drawing for very dense category sets (drops some per-item interactivity).
- `clip?`, `startValue?`, `realtimeSort?` (animated bar-race when sorting a single series), `sampling?` (downsample dense data).

## Patterns
**Horizontal bars** — swap the axis types so categories run down the y-axis (good for long names / ranked lists). Order top-to-bottom by reversing the arrays since y grows upward:
```ts
xAxis: { type: "value" },
yAxis: { type: "category", data: ["Alpha", "Bravo", "Charlie"] },
series: [{ type: "bar", data: [42, 30, 18], label: { show: true, position: "right" } }]
```

**Stacked + total** — same `stack` id across series; show only the top label, and compute the category total in an axis-trigger tooltip formatter:
```ts
series: [
  { name: "A", type: "bar", stack: "total", data: [10, 20, 30] },
  { name: "B", type: "bar", stack: "total", data: [15, 5, 25],
    label: { show: true, position: "top",
      formatter: (p: ml.echarts.DefaultLabelFormatterCallbackParams) => `${p.value}` } }
]
```

**Theming hook** — never hardcode colors; resolve series colors from CSS vars at access time (see parent `echarts`): `itemStyle: { color: chartTheme.getSeriesColors()[i], borderColor: chartTheme.border }`.

**Click drilldown** — bars emit `click` with `seriesIndex`, `dataIndex`, `name`, `value`. Wire via `RaptorChart.onChartCreated`:
```ts
chart.on("click", e => { if (e.componentType === "series") this.drillInto(e.name); });
```
Use the axis-trigger tooltip for `mouseover`; `legendselectchanged` toggles series visibility.

## Gotchas
- **Series must share the category axis order.** `data` is positional — a misaligned array silently shifts bars. Prefer `dataset` + `encode` when categories vary per series.
- **`stack` is a string group id, not a boolean.** Bars only stack when ids match exactly; a typo splits them into a side-by-side group.
- **`barGap` vs `barCategoryGap`** are different axes of spacing: `barGap` is within a category (between series), `barCategoryGap` is between categories. Setting one when you meant the other is a common layout bug.
- **`barWidth` set on one series in a group** applies to the whole group's slot math; set it consistently or let ECharts auto-size.
- **Horizontal bars render bottom-up** on a category yAxis — reverse your data (or set `yAxis.inverse: true`) for natural top-down ranking.
- **`large: true` reduces interactivity** (hover/emphasis per bar) — only use it past `largeThreshold` density.
- **Tooltip default is `trigger: "item"`** (single bar). For grouped/stacked bars set `trigger: "axis"` so the whole category shows at once.
- **Stale series on merge** — ECharts `setOption` merges; returning a shorter series array won't drop old bars unless you return a fresh array (Raptor) or use `notMerge`. See parent `echarts`.

## Related skills
- `echarts` (parent) — option model, `s.chart` flow, theming, `setOption` merge semantics.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart node mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `onChartCreated`).
- `line.md` (trends), `pie.md` (part-of-whole), `funnel.md` (stage drop-off), `heatmap.md` (categorical matrix), `dataset.md` (dataset + encode), `tooltip.md` (axis/shadow tooltip formatting).
