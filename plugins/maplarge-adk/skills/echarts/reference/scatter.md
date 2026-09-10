# Scatter (and bubble)

Discrete `type: "scatter"` points on a cartesian (or polar/geo/calendar) coordinate system. A bubble chart is just a scatter whose `symbolSize` is computed from a third data dimension.

## When to use

- Each datum is an independent `[x, y]` observation — correlation, distribution, outliers.
- Bubble chart: encode a third magnitude as point size via `symbolSize`, a fourth as color via `visualMap`.
- Prefer a different chart when:
  - Points form a connected trend over an ordered axis → `line.md` (with `showSymbol`).
  - Density is so high points overlap into a blob → bin it with `heatmap.md`.
  - You want animated ripple/halo markers (live events, endpoints) → sibling `effectscatter.md` (`type: "effectScatter"`, same option shape).

## Minimal config

A bubble scatter: x = value, y = value, third dim drives radius.

```ts
const option: ml.echarts.EChartsOption = {
  grid: { left: 48, right: 24, top: 24, bottom: 40, containLabel: true },
  xAxis: { type: "value", name: "Latency (ms)" },
  yAxis: { type: "value", name: "Error rate (%)" },
  tooltip: { trigger: "item" },
  series: [{
    type: "scatter",
    symbolSize: (v: number[]) => Math.sqrt(v[2]) * 3, // 3rd dim → radius
    itemStyle: { opacity: 0.75 },
    data: [
      [120, 1.2, 480],
      [240, 3.4, 120],
      [ 80, 0.6, 900],
      [310, 5.1,  60]
    ]
  }] as ml.echarts.ScatterSeriesOption[]
};
```

## Data shape

`series.data` accepts, per point:

- A tuple `[x, y]` — plain scatter. Extra trailing values (`[x, y, size, group]`) are kept and reachable in callbacks/tooltip via `params.value[i]`.
- An object `ScatterDataItemOption`: `{ value: [x, y, ...], name?, symbol?, symbolSize?, itemStyle?, label? }` — per-point overrides.
- A flat typed array (`ArrayLike<number>`) when `large: true`.

Category axes: use the category index (or label string) as the x/y entry. With a `dataset`, omit `data` and use `encode` (below).

## Key options

From `ml.echarts.ScatterSeriesOption` (+ its mixins):

- `type: "scatter"` — required discriminator.
- `symbolSize: number | [w, h] | (rawValue, params) => number | number[]` — point size. The **callback form is what makes a bubble chart**; it receives the raw data value (the tuple) and returns a radius. `params.data`/`params.dataIndex` are available.
- `symbol: string` — `"circle"` (default), `"rect"`, `"roundRect"`, `"triangle"`, `"diamond"`, `"pin"`, `"arrow"`, `"path://..."` SVG, or `"image://url"`.
- `symbolRotate`, `symbolOffset`, `symbolKeepAspect` — orientation/position tweaks (from `SymbolOptionMixin`).
- `itemStyle: ItemStyleOption` — `color` (string or `(params) => color`), `opacity`, `borderColor`, `borderWidth`, `decal`. Opacity is essential when bubbles overlap.
- `label / labelLayout`, `emphasis: { focus: "series"|"self", scale }` — hover behavior.
- `large: boolean`, `largeThreshold: number` — turn on the high-perf renderer for tens of thousands of points (drops per-point interactivity/styling; expects numeric tuples).
- `encode: { x, y, tooltip, itemName }` — dimension mapping when fed by a `dataset` instead of inline `data`. **Note:** there is no `encode.size`/`encode.color` for scatter — drive size via the `symbolSize` callback (read `v[n]`) and color via a `visualMap`.
- `coordinateSystem: "cartesian2d" | "polar" | "geo" | "calendar"` (default cartesian2d), `xAxisIndex`/`yAxisIndex`, `cursor`, `clip`.
- `markLine` / `markArea` — reference thresholds/zones (e.g. an SLA line).

## Patterns

**Bubble from a dataset (encode + symbolSize):**

```ts
dataset: [{ dimensions: ["lat", "err", "vol", "team"], source: rows }],
series: [{ type: "scatter",
  encode: { x: "lat", y: "err", tooltip: ["lat", "err", "vol", "team"], itemName: "team" },
  symbolSize: (v: any) => Math.sqrt(v[2]) * 2 }]
```

**Color a 4th dimension with visualMap** (see `visualmap.md`):

```ts
visualMap: { dimension: 3, min: 0, max: 100, calculable: true,
  inRange: { color: ["#3b82f6", "#f59e0b", "#ef4444"] } },
series: [{ type: "scatter", data: rows /* [x,y,size,colorVal] */,
  symbolSize: (v: number[]) => Math.sqrt(v[2]) }]
```

**Multiple groups / legend filtering:** one scatter series per category (each its own `name` + color) so the legend toggles them and the tooltip labels them.
**Overplotting (jitter):** spread identical points on a category axis. In ECharts 5.6+ a `jitter` field exists on the series; the bundled type predates it, so cast (`{ type: "scatter", jitter: 0.5 } as any`) or jitter the data manually by adding a small random offset to one coordinate.
**Events:** `chart.on("click", e => e.value /* the [x,y,...] tuple */)` and `brushselected` for rubber-band selection of points (wire via `RaptorChart.onChartCreated`).

## Gotchas

- `symbolSize` is a **radius/diameter in pixels**, not a data unit. Scale through `Math.sqrt` so area (not radius) is proportional to magnitude, or large values dwarf small ones.
- A `symbolSize` callback runs per point on every render — keep it cheap; precompute lookups in the closure.
- `large: true` ignores per-point `itemStyle`/object data and disables most interaction; only use it for dense numeric clouds.
- Color by data dimension needs a `visualMap` (or an `itemStyle.color` callback) — `encode` has no color/size slot for scatter.
- Heavy overlap hides density: lower `itemStyle.opacity`, jitter, or switch to `heatmap.md`.
- On a `value` axis, set `min`/`max` or points clip at the edges; with `clip: false` they can draw outside the grid.

## Related skills

- `echarts` (parent) — option model, `setOption` merge semantics, theming via CSS variables.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — mounting the option in a Raptor view (`s.chart`, `traverseRaptorChart`, `onChartCreated`).
- `effectscatter.md` — animated ripple sibling (same data/option shape).
- `visualmap.md` — map a data dimension to point color/size.
- `heatmap.md` — binned alternative when points overlap into a mass.
- `line.md` — connected-trend alternative.
