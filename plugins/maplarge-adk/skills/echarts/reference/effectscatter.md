# EffectScatter

A scatter series whose markers continuously ripple/pulse to draw the eye. Same data and coordinate model as plain scatter, plus an animated ripple effect.

## When to use

- Spotlighting a **small set** of emphasis points: alarms, anomalies, the current/selected item, peak values, "you are here" markers — typically overlaid on a quieter base layer.
- Geo highlights: pulsing dots on a `geo`/`map` coordinate system for active sites.
- As a second series on top of a plain `scatter` or `line` to make a few points stand out.

Prefer a sibling when:

- You have the **full point cloud / dense bubbles** → use `scatter.md` (effectScatter animates every point and is expensive; keep it to a handful).
- You want value→color/size mapping across many points → `scatter.md` + `visualmap.md`.
- You want a static highlight with no animation → plain `scatter.md` with a distinct `itemStyle`/`symbolSize`.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "item" },
  xAxis: { type: "value", name: "X" },
  yAxis: { type: "value", name: "Y" },
  series: [
    {
      type: "effectScatter",
      name: "Alerts",
      symbolSize: 18,
      showEffectOn: "render",                 // animate continuously
      rippleEffect: { period: 4, scale: 3, brushType: "stroke" },
      itemStyle: { color: "#e4572e" },
      data: [
        [12, 40],
        [28, 75],
        [55, 22]
      ]
    }
  ]
};
```

This renders three continuously rippling points. Drop the same series alongside a plain `scatter` series to highlight a few items within a larger cloud.

## Data shape

`series.data` is identical to plain scatter — an array of points:

- **Tuple form:** `[x, y]` (or `[x, y, extra...]` with `encode`/tooltip reading higher dims). On `value`/`time` axes both are numbers; on a `category` axis the first is a category index or label.
- **Object form (`EffectScatterDataItemOption`):** `{ name, value: [x, y], symbolSize, itemStyle, rippleEffect, label, emphasis }` — use this to give individual points their own ripple, size, or color.
- **Geo:** `value: [lng, lat, magnitude?]` with `coordinateSystem: "geo"`.

```ts
data: [
  { name: "Site A", value: [12, 40], itemStyle: { color: "#e4572e" } },
  { name: "Site B", value: [28, 75], symbolSize: 24,
    rippleEffect: { scale: 5 } }            // per-point override
]
```

## Key options

From `ml.echarts.EffectScatterSeriesOption`:

- `type: "effectScatter"` — required discriminant.
- `coordinateSystem?: string` — `"cartesian2d"` (default), `"geo"`, `"polar"`, `"calendar"`, `"singleAxis"`.
- `showEffectOn?: "render" | "emphasis"` — ripple always (`render`) vs. only on hover/highlight (`emphasis`). Default `render`.
- `effectType?: "ripple"` — only ripple is supported.
- `rippleEffect?: { period, scale, brushType, number, color }` — the animation (see below).
- `symbol?: string` / `symbolSize?: number | number[] | (val,params)=>number` — marker shape and size; `symbolSize` callback lets size encode a data dimension.
- `symbolRotate?`, `symbolOffset?`, `symbolKeepAspect?` — marker orientation/placement.
- `itemStyle?: ItemStyleOption` — `color`, `opacity`, `borderColor`, `borderWidth`, shadow. The ripple inherits this color unless `rippleEffect.color` overrides.
- `label?` / `emphasis?: { focus, scale }` — text labels and hover behavior (`focus: "series"` dims others).
- `clip?: boolean` — clip points outside the coord system.
- `data?: (EffectScatterDataItemOption | [x,y])[]`, plus `encode` / `datasetIndex` for dataset-driven points.
- `z` / `zlevel` — keep the effect layer above the base layer.

### `rippleEffect` fields

- `period?: number` — seconds per ripple cycle (smaller = faster). Default ~4.
- `scale?: number` — how far the ripple expands beyond the symbol. Default ~2.5; raise for a bigger halo.
- `brushType?: "fill" | "stroke"` — solid expanding disc vs. expanding ring. `"stroke"` reads as a cleaner pulse.
- `number?: number` — concurrent ripple rings (default 3).
- `color?: ZRColor` — ripple color independent of the marker fill.

## Patterns

### Highlight layer over a base scatter

Two series in one chart: a quiet `scatter` cloud plus a few rippling points on top.

```ts
series: [
  { type: "scatter", symbolSize: 6, itemStyle: { color: "#9aa5b1", opacity: 0.6 }, data: cloud },
  { type: "effectScatter", z: 10, symbolSize: 16,
    rippleEffect: { period: 3, scale: 4, brushType: "stroke" },
    itemStyle: { color: "#e4572e" }, data: highlights }
]
```

### Ripple only on hover

Keep the chart calm until the user interacts.

```ts
{ type: "effectScatter", showEffectOn: "emphasis",
  rippleEffect: { scale: 3 }, data: points }
```

### Theme-reactive color

Resolve a CSS variable at access time (see parent skill) instead of hardcoding.

```ts
{ type: "effectScatter", itemStyle: { color: chartTheme.accent },
  rippleEffect: { color: chartTheme.accent, brushType: "stroke" }, data }
```

### Click on a highlight

Wire via `onChartCreated` (see parent skill); `e.data` is the clicked point's tuple/object.

```ts
chart.on("click", e => { if (e.componentSubType === "effectScatter") { /* e.data */ } });
```

## Gotchas

- **Cost scales with point count.** Every point animates every frame; keep effectScatter to a handful (tens, not thousands). For large sets switch the base to plain `scatter` and ripple only the few that matter.
- **`showEffectOn` controls timing, not on/off.** There is no `show` flag — to stop animation entirely use a plain `scatter` series.
- **Ripple color follows `itemStyle.color`** unless you set `rippleEffect.color`. With `brushType: "stroke"` over a busy background, an explicit ripple color reads better.
- **The halo extends past `symbolSize`.** Account for `scale` so ripples near the plot edge aren't clipped (or set `clip: false` / pad the `grid`).
- **`rippleEffect` is a deep-merged object.** Re-emitting a partial `rippleEffect` merges into the previous one (parent skill's merge note) — return the full object when you change it.
- **Layer it above other series** with `z`/`zlevel`; otherwise base series can paint over the highlights.

## Related skills

- `echarts` — parent skill: option model, `ml.echarts.*` types, `onChartCreated` events, theming.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how a chart mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `getTypedProp` bindings).
- `scatter.md` — the plain (non-animated) scatter; use it for the full cloud and bubble charts.
- `visualmap.md` — map a value dimension to color/size across many scatter points.
