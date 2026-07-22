# Pie / Doughnut / Rose

A `type: "pie"` series renders a circle divided into proportional slices — one slice per category — for showing parts of a whole. Typed `ml.echarts.PieSeriesOption`.

## When to use

- A categorical breakdown where slices sum to a meaningful whole (share %, composition, status mix).
- Few slices (≈2–7). Past that, slices and labels become unreadable — use **`bar.md`** instead for many categories or when precise magnitude comparison matters.
- Doughnut variant (`radius: [inner, outer]`) when you want a hole for a centered total/label.
- Rose / nightingale variant (`roseType`) to encode a second magnitude as slice radius while keeping equal angles less misleading.

Reach for a sibling instead when: stage-to-stage funnel drop-off → **`funnel.md`**; hierarchical part-of-whole → **`sunburst.md`** or **`treemap.md`**; trend over time → **`line.md`**.

## Minimal config

A complete doughnut that renders on its own:

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
  legend: { orient: "vertical", left: "left" },
  series: [{
    type: "pie",
    name: "Traffic Source",
    radius: ["40%", "70%"],          // [inner, outer] → doughnut; single value → full pie
    center: ["50%", "50%"],
    avoidLabelOverlap: true,
    label: { show: true, formatter: "{b}\n{d}%" },
    labelLine: { show: true },
    data: [
      { name: "Direct", value: 1048 },
      { name: "Search", value: 735 },
      { name: "Email", value: 580 },
      { name: "Referral", value: 484 },
      { name: "Social", value: 300 }
    ]
  }]
};
```

`{b}` = name, `{c}` = value, `{d}` = percent — available in `tooltip`/`label` formatter strings.

## Data shape

`series.data` is an array where each entry is one slice. Idiomatic form is an object per slice:

```ts
data: [{ name: "Direct", value: 1048 }, { name: "Search", value: 735 }]
```

- `value` must be numeric; `name` keys the legend, label, color, and `dispatchAction`/`select` lookups.
- A bare number is accepted (`data: [1048, 735]`) but then slices have no names — avoid it.
- Percentages are computed by ECharts from the values; do not pre-divide. Set `stillShowZeroSum: true` to still draw the ring when all values are 0.
- Per-slice overrides go on the item: `{ name, value, itemStyle: { color }, label: {...}, selected: true }`.
- Pie does not use `xAxis`/`yAxis`/`grid` — it is not on a cartesian coordinate system. Color comes from the global `color` palette by slice order, or per-item `itemStyle.color`.

## Key options

From `ml.echarts.PieSeriesOption` (and its `CircleLayoutOptionMixin`):

- `radius : (string|number) | [inner, outer]` — slice radius. Single value = solid pie; two-element array = doughnut (inner > 0 leaves a hole). Percentages are of the viewport's smaller side.
- `center : [x, y]` — pie center as %/px, e.g. `["50%", "50%"]`. Move it to make room for a legend.
- `roseType : "radius" | "area"` — Nightingale rose. `"radius"`: slice angle equal, radius ∝ value. `"area"`: angle ∝ value, radius encodes too.
- `startAngle : number` (default 90) / `endAngle : number | "auto"` / `clockwise : boolean` — sweep direction and extent. A half-doughnut gauge uses `startAngle: 180, endAngle: 360`.
- `padAngle : number` — gap (in degrees) between slices; pairs well with `itemStyle.borderRadius` for a segmented look.
- `minAngle : number` — minimum sweep so tiny slices stay clickable. `minShowLabelAngle` hides labels below an angle.
- `selectedOffset : number` — how far a selected slice pops out; `selectedMode: "single" | "multiple"` (from base series) enables click-to-select.
- `avoidLabelOverlap : boolean` (default true) — nudges outside labels apart.
- `label : PieLabelOption` — `position: "outside" | "inside" | "center" | "edge"`, `formatter`, `alignTo: "edge" | "labelLine"`, `edgeDistance`. `label.position: "center"` + a doughnut hole is the classic centered-total pattern.
- `labelLine : PieLabelLineOption` — `show`, `length`, `length2`, `smooth`, `maxSurfaceAngle` for the leader lines to outside labels.
- `itemStyle` — `borderWidth`, `borderColor`, `borderRadius` (rounded slices), `color`.
- `percentPrecision : number` — decimal places for `{d}`. `emphasis.scale` / `emphasis.scaleSize` control hover pop.

## Patterns

**Doughnut with a centered total.** Use a hole plus a label anchored in the center:
```ts
series: [{ type: "pie", radius: ["55%", "80%"],
  label: { show: false }, emphasis: { label: { show: true } },
  data }]
// then a graphic/title text in the middle, or a second label series with position:"center"
```

**Rose chart (varying value range).** When slice values span a wide range, equal-angle rose reads better than tiny slivers:
```ts
{ type: "pie", roseType: "area", radius: [20, 140], data }
```

**Theme hook (follow light/dark).** Let slices use the app palette and theme the chrome from CSS variables (see parent `echarts` theming pattern):
```ts
itemStyle: { borderColor: chartTheme.background, borderWidth: 2 },
label: { color: chartTheme.text }
```
Setting `borderColor` to the page background with a 2px border gives clean slice separation in both themes.

**Click / select event.** Pie click fires with `seriesType: "pie"`, `name`, `value`, `percent`, `dataIndex`:
```ts
chart.on("click", e => { if (e.seriesType === "pie") this.drillInto(e.name); });
// programmatic highlight/select:
chart.dispatchAction({ type: "pieSelect", seriesIndex: 0, dataIndex: 2 });
```
`legendselectchanged` toggles slices when a legend is present.

## Gotchas

- **Pie ignores `grid`/axes.** Adding `xAxis`/`yAxis` does nothing; layout is `center` + `radius` only.
- **Too many slices = unreadable.** Bucket a long tail into an "Other" slice or switch to `bar.md`.
- **Label overlap on small charts.** Keep `avoidLabelOverlap: true`, or use `label.position: "inside"`/`alignTo: "edge"`, or hide labels and rely on `legend` + `tooltip`.
- **Tiny slices vanish/aren't clickable.** Raise `minAngle`; raise `minShowLabelAngle` to suppress their labels.
- **All-zero data draws nothing.** Set `stillShowZeroSum: true` (or `showEmptyCircle`) to keep the ring visible as a placeholder.
- **`radius`/`center` percentages are of the smaller viewport dimension**, not width — a wide-but-short container yields a smaller pie than expected.
- **Multiple pies in one chart** need distinct `center` (and usually `radius`) values or they stack on top of each other.
- **Merge semantics:** re-emitting `data` deep-merges per slice; to drop slices return a fresh array (or `notMerge` at the instance) — see parent `echarts`.

## Related skills

- `echarts` — parent: the option model, `setOption` merge behavior, theming via CSS variables, event wiring through `onChartCreated`.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how a chart mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart`, `getTypedProp` bindings, `raptorDom.nodeT<RaptorChart>`).
- Siblings: `bar.md` (many categories / precise comparison), `funnel.md` (stage drop-off), `sunburst.md` / `treemap.md` (hierarchical part-of-whole), `gauge.md` (single-value dial), `radar.md` (multi-axis profile).
