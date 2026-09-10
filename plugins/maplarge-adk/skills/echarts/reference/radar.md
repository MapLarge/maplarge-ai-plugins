# Radar (spider) chart

Plots each data item as a closed polygon across several shared radial axes, so a few entities can be compared at a glance across many metrics.

## When to use

- Comparing a small number of items (roughly 2–6) across the **same set of metrics** — capability profiles, scorecards, feature/skill comparisons, before/after.
- The metrics share a meaningful per-axis scale and you want shape/area to read as "overall profile".

Use a different chart when:

- Many series or a continuous/ordered dimension → **echarts-parallel** (parallel coordinates) or **line.md**.
- One quantity ranked across categories, or axes with wildly different units → grouped **bar.md**.
- A single value vs a target → **gauge.md**.

Radar needs few items: 8+ overlapping polygons become unreadable.

## Minimal config

A complete `ml.echarts.EChartsOption`. The top-level `radar` component is **required** — the series only references it; the axes live there.

```ts
const option: ml.echarts.EChartsOption = {
  legend: { data: ["Team A", "Team B"] },
  radar: {
    shape: "polygon",            // or "circle"
    radius: "65%",
    indicator: [
      { name: "Speed",     max: 100 },
      { name: "Accuracy",  max: 100 },
      { name: "Coverage",  max: 100 },
      { name: "Cost",      max: 100 },
      { name: "Stability", max: 100 },
    ],
  },
  tooltip: { trigger: "item" },
  series: [{
    type: "radar",
    data: [
      { name: "Team A", value: [88, 72, 64, 40, 90], areaStyle: { opacity: 0.25 } },
      { name: "Team B", value: [60, 95, 80, 70, 55], areaStyle: { opacity: 0.25 } },
    ],
  }],
};
```

## Data shape

`series.data` is an array of items, one polygon each. Each item is either a bare value array or `{ name, value }`:

```ts
data: [
  { name: "Team A", value: [88, 72, 64, 40, 90] },  // RadarSeriesDataItemOption
  [60, 95, 80, 70, 55],                              // bare RadarSeriesDataValue (number[])
]
```

- `value` is a **tuple whose length and order match `radar.indicator[]`** — `value[i]` is the reading on `indicator[i]`. Mismatched length silently drops/misaligns axes.
- `name` drives the legend and tooltip label; prefer the object form so legend works.
- There is no `dataset`/`encode` workflow for radar — author `data` (and `indicator`) directly.

## Key options

Component `ml.echarts.RadarComponentOption` (the top-level `radar` key):

- `indicator : RadarIndicatorOption[]` — the axes. Each: `name : string`, `max : number`, `min : number` (default 0), `color : string` (axis-name color), `axisType : "value"|"log"`.
- `shape : "polygon" | "circle"` — straight web vs concentric rings (default polygon).
- `radius : number|string|(number|string)[]` and `center : (number|string)[]` — size/position, e.g. `radius: "65%"`, `center: ["50%","50%"]`. Use `[inner, outer]` for a ring.
- `startAngle : number` — rotation of the first axis (default 90).
- `splitNumber : number` — number of concentric grid bands (default 5).
- `scale : boolean` — auto-fit min/max instead of forcing 0-based.
- `splitArea`, `splitLine`, `axisLine`, `axisTick`, `axisLabel` — the web grid styling (reuse axis-style shapes).
- `axisName : { show, formatter } & LabelOption`, `axisNameGap : number` — the per-axis name labels.

Series `ml.echarts.RadarSeriesOption`:

- `type : "radar"`, `coordinateSystem : "radar"` (implied).
- `radarIndex : number` / `radarId : string` — which `radar` component to bind when several exist (default 0).
- `data : (RadarSeriesDataItemOption | number[])[]` — see Data shape.
- `lineStyle : LineStyleOption` — polygon edge (`color`, `width`, `type`).
- `areaStyle : AreaStyleOption` — polygon fill (`color`, `opacity`); **omit for outline-only** radar.
- `symbol` / `symbolSize` — vertex markers (`"none"` to hide).
- `label : SeriesLabelOption` — value labels at each vertex.
- `itemStyle`, and `emphasis` (`RadarStatesMixin`) for hover.

## Patterns

Fill vs outline: set `areaStyle: { opacity: 0.25 }` per data item for translucent overlapped fills; drop `areaStyle` entirely for clean outline-only comparison.

Per-axis scales: give each `indicator` its own `max` (and `min`) when metrics differ in range — `{ name: "Cost ($k)", max: 500 }` next to `{ name: "Score", max: 100 }`. Radar normalizes each axis independently, so the polygon stays comparable.

Theming: pull colors from the app palette (see parent skill's theming pattern), e.g. set per-item `lineStyle.color` / `areaStyle.color` from `chartTheme.getSeriesColors()` and the web grid via `radar.splitLine.lineStyle.color: chartTheme.border`, `radar.axisName.color: chartTheme.textMuted`. Resolve at access time so light/dark switches apply.

Events: radar items fire standard `click` / `mouseover` carrying `params.name` (the item) and `params.value` (the tuple). With `radar.triggerEvent: true`, clicking an axis name fires events too. Wire via the chart instance as covered in the parent skill.

Multiple radars: declare `radar: [{...},{...}]` and point series at them with `radarIndex`/`center` to lay out small multiples.

## Gotchas

- **The `radar` component is mandatory.** A `type: "radar"` series with no top-level `radar` renders nothing — there are no axes to project onto.
- `indicator` lives on the **component**, never on the series. The series carries only `data`.
- `value` length must equal `indicator.length` in the same order; extra/short entries misalign.
- `max` is not auto-derived per axis unless you set `scale: true`; otherwise axes default to a 0-based range and an unset `max` can flatten the chart.
- `radar` here is a polar coordinate system, **unrelated** to any map/RF "radar" layer.
- Overlapping filled polygons hide each other — keep `areaStyle.opacity` low or use outlines for 3+ items.
- This is the radar **chart**, distinct from `polar`/`angleAxis`/`radiusAxis` (the generic polar coordinate used by some bar/scatter charts).

## Related skills

- `echarts` — parent: option model, the `s.chart` wiring, theming, event wiring on the live instance.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart node mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `getTypedProp` bindings).
- `echarts-parallel`, `line.md`, `bar.md`, `gauge.md` — siblings to prefer for many series, ordered dimensions, ranked categories, or single-value-vs-target.
