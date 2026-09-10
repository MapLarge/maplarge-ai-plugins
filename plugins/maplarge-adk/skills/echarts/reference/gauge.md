# Gauge

ECharts `type: "gauge"` — a needle on a circular dial showing one numeric value against a min/max range. Backed by `ml.echarts.GaugeSeriesOption`.

## When to use

- A single headline value against a known scale: percent complete, score, utilization, speed, SLA health, temperature.
- A small set of related needles on one dial (e.g. current vs. target), or a modern "progress arc + big number" KPI tile.
- Qualitative bands matter (red / amber / green zones) — gauges color the arc by value ratio.

Prefer a sibling when:

- Parts of a whole / proportions → **pie.md** (donut/ring).
- Comparing many categories or values → **bar.md**.
- Stage-to-stage conversion → **funnel.md**.
- Trend over time → **line.md**.
A gauge wastes space for more than ~1–3 values; do not use it as a generic "ring chart".

## Minimal config

A complete `ml.echarts.EChartsOption` rendering a percent gauge (paste into `s.chart({ options })`):

```ts
const option: ml.echarts.EChartsOption = {
  series: [{
    type: "gauge",
    min: 0, max: 100,
    startAngle: 220, endAngle: -40,   // sweep clockwise from lower-left to lower-right
    radius: "90%", center: ["50%", "55%"],
    splitNumber: 5,                   // 5 major labeled segments
    axisLine: { lineStyle: { width: 14, color: [
      [0.6, "#5470c6"], [0.85, "#fac858"], [1, "#ee6666"],
    ] } },                            // bands by VALUE RATIO (0..1), each [upToRatio, color]
    progress: { show: true, width: 14 },
    pointer: { show: true, length: "60%", width: 5 },
    anchor: { show: true, size: 12, itemStyle: { color: "#fff", borderColor: "#999", borderWidth: 2 } },
    axisTick: { distance: -14, length: 6 },
    splitLine: { distance: -14, length: 14 },
    axisLabel: { distance: 18, formatter: (v: number) => `${v}` },
    title: { offsetCenter: [0, "72%"], fontSize: 14 },
    detail: { valueAnimation: true, offsetCenter: [0, "40%"],
              formatter: "{value}%", fontSize: 28 },
    data: [{ value: 72, name: "Capacity" }],
  } as ml.echarts.GaugeSeriesOption],
};
```

A gauge needs **no `xAxis`/`yAxis`/`grid`** — it lays itself out in a circle inside the chart box.

## Data shape

`series.data` is an array of numbers or `GaugeDataItemOption` objects. Each object renders **one needle + one title/detail readout**:

```ts
data: [
  { value: 72, name: "Capacity" },                       // single needle
  // multi-needle: each gets its own pointer/title/detail
  { value: 90, name: "Target",
    title: { offsetCenter: ["-40%", "78%"] },
    detail: { offsetCenter: ["-40%", "92%"] } },
]
```

`value` is plotted on the `min..max` scale (NOT 0..1). `name` shows in `title`; `value` shows in `detail`. Per-item `pointer`, `progress`, `title`, `detail`, and `itemStyle` override the series-level versions.

## Key options

From `ml.echarts.GaugeSeriesOption`:

- `min` / `max` : number — value range the dial spans (default 0 / 100).
- `splitNumber` : number — count of major axis segments (label/tick divisions).
- `startAngle` / `endAngle` : number — sweep in degrees (default 225 / -45; 0°=3 o'clock, CCW positive).
- `clockwise` : boolean — sweep direction (default true).
- `center` : `(number|string)[]` — `["50%","55%"]` dial center. `radius` : number|string — outer radius (e.g. `"90%"`).
- `axisLine.lineStyle.color` : `GaugeColorStop[]` = `[ratio, color][]` — **band colors by value RATIO 0..1**, ascending, last must be `1`. `axisLine.lineStyle.width`, `axisLine.roundCap`.
- `progress` : `{ show, width, roundCap, overlap, clip, itemStyle }` — fills the arc from min up to the value (modern KPI look). Hides `axisLine` color bands visually under it when shown.
- `pointer` : `{ show, length, width, icon, offsetCenter, itemStyle, showAbove }` — the needle. `length`/`width` accept % strings.
- `anchor` : `{ show, size, icon, itemStyle, showAbove }` — the hub dot at the dial center.
- `splitLine` : `{ show, length, distance, lineStyle }` — major tick lines at each `splitNumber` division.
- `axisTick` : `{ show, splitNumber, length, distance, lineStyle }` — minor ticks between splits.
- `axisLabel` : `{ show, distance, color, fontSize, formatter, rotate }` — numeric scale labels; `rotate: "tangential" | "radial" | number`.
- `title` : `{ show, offsetCenter, formatter, color, fontSize, valueAnimation }` — renders the data item's `name`.
- `detail` : `{ show, offsetCenter, formatter, color, fontSize, valueAnimation }` — renders the value (`"{value}"`); `valueAnimation` counts up.
- `itemStyle` : `ItemStyleOption` — overall color used by `progress`/`pointer` when not otherwise styled.

## Patterns

**Theme-reactive colors** — resolve CSS vars at access time (see parent skill), don't hardcode. Build the band array from theme getters:

```ts
axisLine: { lineStyle: { width: 14, color: [
  [0.6, chartTheme.series(0)], [0.85, "#fac858"], [1, chartTheme.danger] ] } }
detail: { color: chartTheme.text, formatter: "{value}%" }
```

**Progress-arc KPI (no scale clutter)** — hide ticks/labels, show only the arc + big number:

```ts
{ type: "gauge", startAngle: 90, endAngle: -270, radius: "100%",
  pointer: { show: false }, progress: { show: true, width: 18, roundCap: true },
  axisLine: { lineStyle: { width: 18 } },
  splitLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false },
  detail: { valueAnimation: true, fontSize: 36, offsetCenter: [0, 0], formatter: "{value}%" },
  data: [{ value: 64 }] }
```

**Bind from a ViewModel getter** — return the whole series fragment typed, bind it in the view (requires `bindings: { traverseRaptorChart: true }`):

```ts
// VM
private _gaugeSeries: ml.echarts.GaugeSeriesOption[] = null;
public get gaugeSeries() { return this._gaugeSeries; }
// view: series: s.prefix(vmKey).getTypedProp("gaugeSeries") as any
```

**Animated update** — set `detail.valueAnimation: true` and just change `data[0].value`; ECharts tweens the needle and counts the number.

**Events** — `chart.on("click", e => { /* e.data is the GaugeDataItemOption */ })`; gauges have no brush/axis selection.

## Gotchas

- `axisLine` color stops are **ratios 0..1**, NOT data values. `[[60,...]]` with `max:100` is wrong; use `[[0.6,...]]`. The array must end at `1`.
- When `progress.show: true`, the progress arc paints over the `axisLine` bands — pick one look (graded bands OR progress fill), not both, unless you intend the overlap.
- Angles are degrees with 0° at 3 o'clock and **counter-clockwise positive**; the default `startAngle: 225, endAngle: -45` is the classic bottom-gap dial. To make a full ring use `startAngle: 90, endAngle: -270`.
- `value` is on the `min..max` scale. For a percent gauge set `min:0, max:100` and pass `72`, not `0.72`.
- Negative `distance` on `splitLine`/`axisTick` pulls ticks **inside** the axis line (common for the modern inset look); positive pushes them outward.
- No `grid`/`xAxis`/`yAxis` — adding them does nothing. Position with `center`/`radius`, not `grid`.
- Multiple `data` items share one dial; give each its own `title.offsetCenter` / `detail.offsetCenter` or the readouts stack on top of each other.
- Tooltip uses `trigger: "item"` by default; there is no axis trigger for gauges.

## Related skills

- `echarts` — parent: option model, `s.chart` binding, theming, `onChartCreated` events.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart node mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `raptorDom.nodeT<RaptorChart>`).
- `pie.md` — proportions / donut ring (the usual alternative for "share of total").
- `bar.md` — comparing many values; `funnel.md` — stage conversion; `line.md` — trend over time.
