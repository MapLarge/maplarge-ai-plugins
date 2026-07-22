# Line series (`type: "line"`)

Connected series over an ordered category, value, or time axis — single lines, multi-line, area, stacked area, smooth, and step charts. Typed `ml.echarts.LineSeriesOption`.

## When to use

- Trends over time or an ordered sequence (one or more lines).
- Area / filled charts (`areaStyle`) and **stacked area** charts (`stack` + `areaStyle`) for part-to-whole over time.
- Smoothed curves (`smooth`) or step/staircase lines (`step`).
- Reference thresholds and shaded bands via `markLine` / `markArea`.

Use a sibling instead when: comparing discrete magnitudes by category → `bar.md`; plotting unconnected points / correlation → `scatter.md` (or `effectscatter.md` for animated points); OHLC financials → `candlestick.md`; distributions → `boxplot.md`. Color-by-value mapping is `visualmap.md`; zoom/pan is `datazoom.md`.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "axis" },
  legend: { data: ["Visits", "Signups"] },
  grid: { top: 30, left: 40, right: 16, bottom: 30, containLabel: true },
  xAxis: { type: "category", boundaryGap: false,
           data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
  yAxis: { type: "value" },
  series: [
    { name: "Visits",  type: "line", data: [820, 932, 901, 934, 1290, 1330, 1320] },
    { name: "Signups", type: "line", data: [120, 132, 101, 134, 90, 230, 210], smooth: true }
  ]
};
```

`boundaryGap: false` on a category xAxis pins the first/last point to the axis edges — standard for line/area charts.

## Data shape

`series.data` is `(LineDataValue | LineDataItemOption)[]` where `LineDataValue = OptionDataValue | OptionDataValue[]`.

- **Category axis:** one scalar per category, aligned by index → `[820, 932, 901, ...]`. `null` is a gap (see `connectNulls`).
- **Value / time axis:** pairs `[x, y]` → `[[1, 820], [2, 932], ...]`; for `type: "time"` use `[timestamp, value]` (epoch ms, ISO string, or `Date`).
- **Per-point styling:** an object `LineDataItemOption` → `{ value: 1290, name: "Peak", symbol: "diamond", symbolSize: 12, itemStyle: { color: "#e44" } }`.
- **dataset/encode:** omit `data`, set `datasetIndex` + `encode: { x: "day", y: "visits" }` (shared `SeriesEncodeOptionMixin`). Prefer this when several series read one table — see `dataset.md`.

## Key options

From `ml.echarts.LineSeriesOption` (+ injected `markLine`/`markArea`/`markPoint`/`tooltip`):

- `type: "line"` — required discriminant.
- `coordinateSystem: "cartesian2d" | "polar"` — default cartesian; `"polar"` draws on `angleAxis`/`radiusAxis`.
- `data` — see Data shape above.
- `lineStyle: ml.echarts.LineStyleOption` — `{ width, color, opacity, type: "solid"|"dashed"|"dotted"|number[], cap, join, dashOffset }`.
- `areaStyle: ml.echarts.AreaStyleOption & { origin }` — presence turns it into an **area chart**. `{ color, opacity }` + `origin: "auto"|"start"|"end"|number` (baseline the fill drops to).
- `stack: string` + `stackStrategy: "samesign"|"all"|"positive"|"negative"` — series sharing one `stack` name sum together (`SeriesStackOptionMixin`).
- `smooth: boolean | number` — curve smoothing; a number `0..1` is the smoothing amount. `smoothMonotone: "x"|"y"|"none"` prevents overshoot.
- `step: false | "start" | "end" | "middle"` — staircase line; where the riser sits between points.
- `symbol` / `symbolSize` / `symbolRotate` / `symbolOffset` (`SymbolOptionMixin`) — point markers: `"circle"|"rect"|"triangle"|"none"|"path://…"|"image://…"`.
- `showSymbol: boolean` — hide markers, keep the line (markers reappear on hover). `showAllSymbol: "auto"|boolean` — force every point's symbol on a dense line.
- `connectNulls: boolean` — bridge across `null` gaps instead of breaking the line.
- `sampling: "lttb"|"average"|"max"|"min"|"minmax"|"sum"|"none"` (`SeriesSamplingOptionMixin`) — downsample dense data for performance; `"lttb"` best preserves shape.
- `endLabel: ml.echarts.LineEndLabelOption` — label drawn at the line's end (`{ show: true, formatter }`), great for legend-free multi-line charts.
- `clip`, `label`, `emphasis.lineStyle` / `emphasis.areaStyle`, `markLine`, `markArea`, `markPoint`, `z`/`zlevel`.

## Patterns

### Stacked area (part-to-whole over time)
Give every series the same `stack` name and an `areaStyle`. Order matters — later series stack on top.
```ts
series: ["Direct", "Email", "Search"].map((name, i) => ({
  name, type: "line", stack: "traffic", areaStyle: {},
  emphasis: { focus: "series" }, data: rowsByChannel[name]
}));
```
`emphasis: { focus: "series" }` dims other bands on hover.

### Smooth vs step
`smooth: true` for organic trends; `step: "end"` for state/holding values (counts, status). They are mutually exclusive in practice — pick one per series.

### Threshold line + shaded band
`markLine` for a horizontal reference, `markArea` for a target zone (both injected onto the series option):
```ts
{ name: "Latency", type: "line", data: latency,
  markLine: { symbol: "none", data: [{ yAxis: 200, name: "SLA", lineStyle: { type: "dashed" } }] },
  markArea: { itemStyle: { color: "rgba(255,0,0,0.08)" }, data: [[{ yAxis: 200 }, { yAxis: "max" }]] } }
```

### Theme-reactive color
Resolve CSS vars at access time rather than hardcoding (see parent `echarts`): `lineStyle: { color: chartTheme.series(i) }`, `areaStyle: { color: chartTheme.series(i), opacity: 0.15 }`.

### Signature events
`click` fires per data point (`e.dataIndex`, `e.value`, `e.data`); `legendselectchanged` toggles series visibility. Wire via `RaptorChart.onChartCreated` (see the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`)). For per-point hit-testing on a line whose symbols are hidden, set `triggerLineEvent: true` to get clicks on the line segment itself.

## Gotchas

- **Area chart needs `areaStyle` present even if empty** — `areaStyle: {}` turns it on; omitting it leaves a plain line.
- **Stacked areas with `null`/gaps render oddly** — stacking sums positions, so a `null` in one band breaks the cumulative baseline. Use `connectNulls: true` or zero-fill before stacking.
- **`connectNulls` only bridges `null`** — `undefined`/missing indices on a category axis still break; align data to the axis length.
- **`smooth` can overshoot below zero** — set `smoothMonotone: "x"` (or per-axis) to clamp the curve to monotonic segments.
- **Dense data is slow without `sampling`** — for thousands of points add `sampling: "lttb"`; symbols also cost — `showSymbol: false`.
- **`step` + `areaStyle`** fills under the staircase (a step-area); confirm that is intended, not a smooth fill.
- **Re-emitting `series` is a merge** — return a fresh array from the VM getter to drop stale lines (see parent `echarts`).

## Related skills

- `echarts` — parent: option model, `setOption` merge semantics, theming helper, event wiring.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `onChartCreated`).
- `bar.md` — categorical magnitude comparison (shares `stack`, `markLine`).
- `scatter.md` / `effectscatter.md` — unconnected / animated points.
- `candlestick.md`, `boxplot.md` — OHLC / distribution over an axis.
- `dataset.md` — `dataset` + `encode` for multi-series from one table.
- `datazoom.md`, `visualmap.md`, `tooltip.md` — zoom/pan, value-color mapping, axis tooltips.
