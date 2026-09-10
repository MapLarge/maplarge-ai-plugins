# ThemeRiver

A stream graph: each category becomes a colored band stacked symmetrically around a center baseline along a single time axis; band thickness encodes the value. Good for showing how a total's composition shifts over time.

## When to use

- Several categories whose **share of a total changes over a continuous timeline** (e.g. topic volume, channel traffic, ticket types by day) and the *shape/flow* matters more than exact numbers.
- You want an organic, "river" aesthetic rather than rigid bars.

Prefer a sibling instead when:

- You need to read **absolute values** off a fixed zero baseline → `line.md` (stacked area via `areaStyle` + `stack`) or `bar.md` (stacked bars).
- You're showing **flow/transfer between nodes**, not composition over time → `sankey.md`.
- It's a **single time period's** breakdown → `pie.md` / `funnel.md`.
- Many categories (>~7): a themeRiver gets muddy; switch to stacked area.

## Minimal config

A themeRiver needs exactly one `singleAxis` (the time axis) and `tooltip.trigger: "axis"`.

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "rgba(0,0,0,0.2)", width: 1, type: "solid" } } },
  legend: { data: ["Alpha", "Bravo", "Charlie"], top: 0 },
  singleAxis: {
    type: "time",
    top: 40, bottom: 30, left: 40, right: 20,
    axisTick: {}, axisLabel: {}, splitLine: { show: false }
  },
  series: [{
    type: "themeRiver",
    boundaryGap: ["10%", "10%"],
    label: { show: true },
    emphasis: { focus: "self" },
    data: [
      ["2024-01-01", 12, "Alpha"], ["2024-01-02", 18, "Alpha"], ["2024-01-03", 9,  "Alpha"],
      ["2024-01-01", 7,  "Bravo"], ["2024-01-02", 11, "Bravo"], ["2024-01-03", 16, "Bravo"],
      ["2024-01-01", 4,  "Charlie"], ["2024-01-02", 6,  "Charlie"], ["2024-01-03", 13, "Charlie"]
    ] as ml.echarts.ThemeRiverSeriesOption["data"]
  }]
};
```

## Data shape

`series.data` is `[time, value, category][]` (the d.ts alias `ThemerRiverDataItem = [OptionDataValueDate, OptionDataValueNumeric, string]`):

- **time** — a value the `singleAxis` can place: an ISO date string / timestamp (`type: "time"`), a number (`type: "value"`), or a category label (`type: "category"`). Same axis for every row.
- **value** — non‑negative thickness contribution at that time.
- **category** — the band name; the set of distinct names is the legend and the band colors.

It's one **flat** array of triples (NOT one series per category, NOT nested). Each category should have a row at each time tick; missing ticks leave gaps in that band. The category strings drive `legend.data` and the color cycle.

## Key options

From `ml.echarts.ThemeRiverSeriesOption`:

- `type: "themeRiver"` — required discriminant.
- `data: [time, value, name][]` — the triples above.
- `coordinateSystem?: "singleAxis"` — fixed; you don't set another. There is no `xAxis`/`yAxis` — layout comes from `singleAxis`.
- `boundaryGap?: (string|number)[]` — `[start, end]` padding **orthogonal** to the time axis (the gap above/below the river inside its box), as px or `"%"`. Controls how much vertical room the bands get; e.g. `["10%","10%"]`.
- `color?: ZRColor[]` — per-band color cycle (one entry per category in legend order). Omit to use the global palette.
- `label?: ThemeRiverSeriesLabelOption` — band labels (extends `SeriesLabelOption`, adds `margin?: number`, the inset of the text from the band edge). `{ show: false }` to hide.
- `itemStyle?: ItemStyleOption` — band fill/border/opacity (`color`, `borderColor`, `borderWidth`, `opacity`, `shadowBlur`).
- `emphasis` (via `ThemeRiverStatesMixin`) — hover state; `emphasis: { focus: "self" }` dims the other bands.
- Box layout (`BoxLayoutOptionMixin`): `left/right/top/bottom/width/height` position the **river region itself** (often better to position the `singleAxis` instead).
- `singleAxisIndex?` / `singleAxisId?` — bind to a specific `singleAxis` when there are several.

The companion `singleAxis` component carries the axis: `type` (`"time" | "value" | "category"`), `position` (`top|bottom|left|right`), `orient`, `min`/`max`, `axisLabel`, `splitLine`, plus its own `left/right/top/bottom` box.

## Patterns

**Bind from a ViewModel** — build the flat triples in a getter typed `ml.echarts.ThemeRiverSeriesOption["data"]` and bind `series` with `getTypedProp`; keep `bindings: { traverseRaptorChart: true }` on the `s.chart` node (see the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`)).

**Theming** — set band colors from CSS variables via `series.color: chartTheme.getSeriesColors()` and axis text via `singleAxis.axisLabel.color: chartTheme.textMuted`, resolved fresh per access so light/dark switches apply (see the parent `echarts` theming section). Style edges with `itemStyle: { borderColor: chartTheme.border, opacity: 0.9 }`.

**Tooltip** — `trigger: "axis"` lists every band's value at the hovered time. Each tooltip param's `value` is the `[time, value, name]` triple; format with `(params) => params.map(p => p.marker + p.value[2] + ": " + p.value[1]).join("<br/>")`.

**Hover isolation** — `emphasis: { focus: "self" }` highlights one band and fades the rest, useful when bands overlap visually.

## Gotchas

- **No `xAxis`/`yAxis`.** ThemeRiver lives on `singleAxis`; declaring an x/y axis does nothing and omitting `singleAxis` renders an empty chart.
- **Negative values break it.** Bands stack by magnitude; feed only non‑negative `value`s.
- **Data is flat triples, not per-series.** A common mistake is one `series` per category — instead it's one themeRiver series with all `[time,value,name]` rows.
- **`boundaryGap` here is orthogonal padding**, not the axis category gap you know from bar charts — it's the inset around the river thickness.
- **Mixed time formats** in column 0 confuse `type: "time"`; keep them uniform (all ISO strings or all timestamps) and match the `singleAxis.type`.
- **Sparse categories distort the flow.** If a category lacks a row at some ticks its band pinches/disappears there; backfill zeros for smooth bands.
- **Merge semantics**: re-emitting a smaller `data` array merges at the instance level — return a fresh array from the getter to clear stale points (see parent skill).

## Related skills

- `echarts` — parent: option model, theming via CSS vars, `setOption` merge behavior, event wiring.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — mounting: the `s.chart({ options })` node, `traverseRaptorChart`, `getTypedProp` bindings, `onChartCreated`.
- `line.md` / `bar.md` — stacked area / stacked bars when absolute values and a zero baseline matter.
- `sankey.md` — flow between nodes rather than composition over time.
- `pie.md` / `funnel.md` — single-period composition.
- `tooltip.md`, `datazoom.md` — richer tooltips and zooming the time axis.
