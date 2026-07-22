# Candlestick (OHLC / K-line)

Financial open-high-low-close bars: a filled body from open→close plus high/low wicks, colored by direction (up vs down).

## When to use
- Price/OHLC over time: stocks, FX, commodities, any open/close/low/high series.
- You want bullish/bearish color encoding and high/low wicks per period, usually with `dataZoom` to scroll long histories and a companion volume bar series below.

Use a different skill when:
- The 5-number summary is statistical (min/Q1/median/Q3/max), not OHLC — use `boxplot.md`. The shapes look alike but the data semantics and 5-vs-4 value count differ.
- You only need a single price line or area — use `line.md`.

## Minimal config
A complete `ml.echarts.EChartsOption` with a candle grid on top, a volume bar grid below, and a shared `dataZoom`:
```ts
const dates  = ["2026-06-01","2026-06-02","2026-06-03","2026-06-04","2026-06-05"];
// [open, close, low, high]
const ohlc   = [[20,24,18,26],[24,22,21,27],[22,28,21,29],[28,25,24,30],[25,31,24,33]];
const volume = [1200, 900, 1500, 800, 1700];

const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
  axisPointer: { link: [{ xAxisIndex: "all" }] },
  grid: [
    { left: 60, right: 20, top: 20, height: 180 },
    { left: 60, right: 20, top: 230, height: 70 }
  ],
  xAxis: [
    { type: "category", data: dates, boundaryGap: true, axisLine: { onZero: false } },
    { type: "category", data: dates, gridIndex: 1, axisLabel: { show: false } }
  ],
  yAxis: [
    { type: "value", scale: true },
    { type: "value", gridIndex: 1, axisLabel: { show: false }, splitLine: { show: false } }
  ],
  dataZoom: [
    { type: "inside",  xAxisIndex: [0, 1], start: 0, end: 100 },
    { type: "slider",  xAxisIndex: [0, 1], bottom: 0, start: 0, end: 100 }
  ],
  series: [
    {
      type: "candlestick", name: "Price", data: ohlc,
      itemStyle: { color: "#26a69a", color0: "#ef5350",
                   borderColor: "#26a69a", borderColor0: "#ef5350" }
    } as ml.echarts.CandlestickSeriesOption,
    { type: "bar", name: "Volume", data: volume, xAxisIndex: 1, yAxisIndex: 1 }
  ]
};
```

## Data shape
`series.data` is an array of OHLC tuples in the **fixed order `[open, close, low, high]`** (note: close before low/high — not OHLC order):
```ts
data: [ [open, close, low, high], ... ]                 // CandlestickDataValue = OptionDataValue[]
data: [ { value: [o,c,l,h], itemStyle: {...} }, ... ]   // CandlestickDataItemOption for per-bar styling
```
The x positions come from a `category` x-axis `data` array (dates/labels), index-aligned to the tuples. With a `dataset`, set `encode: { x: 0, y: [1, 2, 3, 4] }` (the y dimensions are the four OHLC columns).

## Key options
From `ml.echarts.CandlestickSeriesOption` (+ `CandlestickItemStyleOption`):
- `type: "candlestick"` — required discriminant.
- `data: (CandlestickDataValue | CandlestickDataItemOption)[]` — the `[o,c,l,h]` tuples.
- `itemStyle.color` / `color0 : ZRColor` — body fill for **bullish** (close ≥ open) / **bearish** (close < open) bars.
- `itemStyle.borderColor` / `borderColor0 : ColorString` — wick+border color for bullish / bearish bars.
- `itemStyle.borderColorDoji : ZRColor` — border when open === close (the doji case).
- `itemStyle.borderWidth`, `opacity` — inherited from `ItemStyleOption`/`BorderOptionMixin`.
- `barWidth` / `barMaxWidth` / `barMinWidth : number | string` — bar body width (px or `"60%"` of the band).
- `large : boolean`, `largeThreshold : number` — enable the optimized renderer for many bars (default threshold 600).
- `clip : boolean` — clip bars outside the grid (default true).
- `xAxisIndex` / `yAxisIndex : number` — which axis/grid the candles use (`SeriesOnCartesianOptionMixin`); the volume bar series points at the second grid via these.
- `markLine` / `markArea` / `markPoint` — overlays (e.g. a target-price line) from the shared `SeriesOption` base.
- `encode` / `datasetIndex` / `dimensions` — `dataset`-driven mapping (`SeriesEncodeOptionMixin`).

## Patterns
- **Paired volume bars**: declare two `grid`s and two of each axis (`gridIndex: 1` on the second), put the candle series on grid 0 and a `bar` volume series on grid 1 via `xAxisIndex: 1, yAxisIndex: 1`. Link cursors with `axisPointer.link: [{ xAxisIndex: "all" }]` and share `dataZoom` across `xAxisIndex: [0, 1]`.
- **Per-bar coloring** (e.g. flag anomalies): use `CandlestickDataItemOption` rows `{ value: [o,c,l,h], itemStyle: { color, color0 } }` instead of plain tuples.
- **Themed up/down colors**: resolve CSS vars at access time (see `echarts` parent) — e.g. `color: chartTheme.up, color0: chartTheme.down` so light/dark swaps follow the app theme.
- **Crosshair tooltip**: `tooltip.trigger: "axis"` with `axisPointer.type: "cross"` reads all four OHLC values for the hovered period; the default formatter labels them Open/Close/Lowest/Highest.

## Gotchas
- **Tuple order is `[open, close, low, high]`**, not OHLC. Feeding `[o,h,l,c]` silently produces wrong wicks/bodies.
- **`color` = up, `color0` = down** (and likewise `borderColor`/`borderColor0`). Easy to invert; the `0` suffix is the bearish/down variant.
- Candlestick needs a **`category` (or `time`) x-axis and a `value` y-axis**; set `yAxis.scale: true` so the axis does not force a zero baseline and squash the bars.
- Bars do **not stack** — `stack` is meaningless here; the body already spans open→close.
- For thousands of bars enable `large: true` and rely on `dataZoom` (`type: "inside"` + `"slider"`); without zoom the bars overlap into a blur.
- A `bar` volume series on the second grid must repeat the x-axis `data` and set `gridIndex: 1` on its axes, or it renders against the wrong scale.

## Related skills
- `echarts` — parent: option model, `setOption` merge, theming via CSS vars, `onChartCreated` events.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart`, VM getters returning `ml.echarts.*` fragments).
- `boxplot.md` — sibling for statistical 5-number summaries (similar glyph, different data).
- `line.md`, `bar.md` — the plain price-line and the companion volume series.
- `datazoom.md`, `tooltip.md` — the zoom/scroll and crosshair components candlesticks almost always pair with.

Official option reference: https://echarts.apache.org/en/option.html#series-candlestick
