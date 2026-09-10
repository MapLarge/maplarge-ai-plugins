# ECharts Funnel

Funnel/pyramid series (`type: "funnel"`): ordered horizontal bands whose width encodes each item's value, drawn widest-to-narrowest to show stage drop-off or proportion.

## When to use

- A single ordered set of magnitudes you want read as a conversion/drop-off shape: pipeline stages, signup funnel, capacity tiers. Each datum is `{ name, value }`; band width = value mapped between `minSize` and `maxSize`.
- A pyramid (just `sort: "ascending"`, narrow-to-wide).

Use a sibling instead when:

- The values are part-of-a-whole shares without a natural order, or you want a ring/donut → `pie.md`.
- Volume flows *between* multiple stages/nodes (with branching) → `sankey.md`.
- You're comparing magnitudes across categories with axes → `bar.md`.

## Minimal config

A complete `ml.echarts.EChartsOption` that renders a funnel:

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
  legend: { data: ["Visited", "Signed up", "Activated", "Paid"] },
  series: [{
    type: "funnel",
    name: "Conversion",
    left: "10%", right: "10%", top: 40, bottom: 20,   // box layout
    min: 0, max: 1000,
    minSize: "0%", maxSize: "100%",
    sort: "descending",
    gap: 2,
    funnelAlign: "center",
    label: { show: true, position: "inside" },
    labelLine: { length: 10, lineStyle: { width: 1 } },
    itemStyle: { borderColor: "#fff", borderWidth: 1 },
    emphasis: { label: { fontSize: 16 } },
    data: [
      { value: 1000, name: "Visited" },
      { value: 600,  name: "Signed up" },
      { value: 320,  name: "Activated" },
      { value: 120,  name: "Paid" },
    ],
  }],
};
```

## Data shape

`series.data` is an array of `OptionDataValueNumeric | OptionDataValueNumeric[] | FunnelDataItemOption`:

- Plain numbers: `data: [1000, 600, 320, 120]` (no names → legend/labels fall back to index).
- Objects (typical): `{ name: string, value: number }`, plus optional per-item `itemStyle`, `label`, `labelLine`, `emphasis`.
- Per-item band geometry is unusual but allowed: `FunnelDataItemOption.itemStyle` extends `ItemStyleOption` with `width?: number | string` and `height?: number | string` to override that band's size.

`{d}` in tooltip/label formatters is the percentage; the funnel computes percent from value vs. the series total (or vs. `max`). `FunnelCallbackDataParams` adds `percent` for function formatters.

## Key options

From `ml.echarts.FunnelSeriesOption`:

- `sort: "ascending" | "descending" | "none"` — band ordering. `descending` = classic funnel (wide top), `ascending` = pyramid, `none` = keep data order. Default `descending`.
- `min: number` / `max: number` — value range mapped to size. Values are clamped; default 0 / max of data.
- `minSize: number | string` / `maxSize: number | string` — pixel/percent band width for `min`/`max` values, e.g. `"0%"`..`"100%"`. Set `minSize: "20%"` to keep the smallest band visibly wide.
- `gap: number` — vertical (or horizontal) pixels between bands.
- `funnelAlign: "left" | "center" | "right"` — horizontal alignment of bands within the box (for vertical orient). For `orient: "horizontal"` it's `"top" | "middle" | "bottom"`.
- `orient: "vertical" | "horizontal"` — stack direction. Default `"vertical"`.
- `width` / `height` / `top` / `left` / `right` / `bottom` (`BoxLayoutOptionMixin`) — number | percent string positioning the funnel box.
- `label: FunnelLabelOption` — `SeriesLabelOption` plus extended `position`: `"inside" | "left" | "right" | "leftTop" | "leftBottom" | "rightTop" | "rightBottom" | "center" | "outer" | "inner"`.
- `labelLine: { length, lineStyle }` — connector when labels sit outside (`position: "left"`/`"right"`).
- `itemStyle: ItemStyleOption` — `color`, `borderColor`, `borderWidth`, `opacity`, `borderRadius`.
- `emphasis` — hover state; commonly `emphasis: { label: { fontSize } }` or a focus color.
- `color` (series-level palette) is applied band-by-band from the global/theme palette when items don't set `itemStyle.color`.

## Patterns

### Pyramid (narrow-to-wide)

```ts
{ type: "funnel", sort: "ascending", funnelAlign: "center",
  label: { position: "inside" }, data }
```

### Side-by-side comparison (two funnels)

Two series in one box, each half the width, mirrored via `funnelAlign`:

```ts
series: [
  { type: "funnel", name: "Plan",   left: "5%",  width: "40%", funnelAlign: "right",
    label: { position: "left" }, data: planData },
  { type: "funnel", name: "Actual", left: "55%", width: "40%", funnelAlign: "left",
    label: { position: "right" }, data: actualData },
]
```

### Theming hook

Pull colors from the app's CSS variables (see parent skill) rather than hardcoding:

```ts
itemStyle: { borderColor: chartTheme.border, borderWidth: 1 },
label: { color: chartTheme.text },
```

Leave per-band fill to the resolved series palette (`color: chartTheme.getSeriesColors()` at the option root) so light/dark themes track.

### Signature event (click drilldown)

Funnels emit standard item events; `params.data` is the clicked datum, `params.percent` the share.

```ts
chart.on("click", (p) => { if (p.seriesType === "funnel") this.drillInto(p.name); });
```

## Gotchas

- **`sort` defaults to `descending`**, so emitted data order is ignored unless you set `sort: "none"`. A "wrong order" funnel is almost always this.
- **`maxSize`/`minSize` are sizes, `max`/`min` are values.** Tiny tail bands vanishing? Raise `minSize` (e.g. `"15%"`), don't touch `max`.
- **Percent `{d}` is relative to the series total**, not to the first/largest band. For true conversion-vs-top-of-funnel rates, compute the ratio yourself in a function `label.formatter`/`tooltip.formatter` using `FunnelCallbackDataParams`.
- **`funnelAlign` axis flips with `orient`**: for `orient: "horizontal"` the valid values become `top`/`middle`/`bottom`.
- **Labels overlapping bands**: use `position: "left"`/`"right"` with `labelLine.length` to push them outside, or `position: "inside"` to keep them on the band.
- **Box layout, not grid.** Funnel ignores `grid`; size it with `left`/`right`/`top`/`bottom`/`width`/`height` on the series. Re-emitting `series` is a merge (see parent skill) — return a fresh array to clear stale bands.

## Related skills

- `echarts` — parent: the option object model, `ml.echarts.*` types, theming via CSS vars, `setOption` merge behavior, events through `onChartCreated`.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart` bindings, `raptorDom.nodeT<RaptorChart>`).
- `pie.md` — unordered part-of-whole shares / donut.
- `sankey.md` — multi-node branching flow between stages.
- `bar.md` — axis-based magnitude comparison across categories.
