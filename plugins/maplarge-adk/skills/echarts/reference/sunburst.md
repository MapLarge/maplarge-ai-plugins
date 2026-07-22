# Sunburst

A multi-level pie: concentric rings where each ring is one tree depth and each arc's angular sweep is proportional to its `value`. The radial analogue of `treemap`.

## When to use

- Hierarchical part-of-whole data nested 2+ levels deep (category > subcategory > leaf), with built-in click-to-drill.
- You want depth encoded as radius and magnitude encoded as arc angle in one compact circular view.

Use a sibling instead when:
- **One level only** (a ring/donut) → `pie.md` (`roseType` for nightingale).
- **Rectangular nesting / many leaves / area emphasis** → `treemap.md`.
- **Topology over magnitude** (a node-link dendrogram, no value-sized arcs) → `tree.md`.

## Minimal config

A complete `ml.echarts.EChartsOption` that renders a 3-level sunburst:

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "item", formatter: "{b}: {c}" },
  series: [{
    type: "sunburst",
    radius: [0, "95%"],
    center: ["50%", "50%"],
    nodeClick: "rootToNode",
    sort: "desc",
    label: { rotate: "radial", minAngle: 5 },
    itemStyle: { borderColor: "#fff", borderWidth: 1, borderRadius: 2 },
    data: [
      { name: "Alpha", value: 10, children: [
        { name: "A1", value: 4 },
        { name: "A2", value: 6, children: [
          { name: "A2a", value: 3 }, { name: "A2b", value: 3 } ] } ] },
      { name: "Beta", children: [           // parent value omitted → summed from children
        { name: "B1", value: 5 },
        { name: "B2", value: 7 } ] }
    ]
  }]
};
```

## Data shape

`series.data` is a **nested tree** of `SunburstSeriesNodeItemOption` (`OptionDataItemObject` + sunburst fields). Not flat rows, not `[x,y]` tuples.

```ts
{
  name: string,                 // ring label
  value?: number,               // arc sweep; omit on a parent to auto-sum children
  children?: NodeItem[],        // next ring out; absent → leaf
  itemStyle?: {...},            // per-node fill/border (overrides level/series)
  label?: {...}, link?: string, target?: string, collapsed?: boolean
}
```
Leaves drive the geometry; a parent with no `value` is the sum of its descendants. Depth 0 is the innermost ring (or center disc if `radius[0] === 0`).

## Key options

From `ml.echarts.SunburstSeriesOption`:

- `data : SunburstSeriesNodeItemOption[]` — the root nodes (see above).
- `radius : (number|string)[] | number | string` — `[inner, outer]`, e.g. `[0, "95%"]`. `0` inner = solid center; nonzero = donut hole.
- `center : (number|string)[]` — `["50%","50%"]`, the disc center in container coords.
- `levels : SunburstSeriesLevelOption[]` — per-depth styling. **Index 0 is reserved/empty**; index 1 = first data ring, index 2 = next, etc. Each entry takes `radius`, `itemStyle`, `label`, `highlight`.
- `nodeClick : "rootToNode" | "link" | false` — click behavior: drill so the clicked node becomes the root (`rootToNode`, default), open node `link`, or disable.
- `sort : "desc" | "asc" | (a,b)=>number | null` — order of siblings; `null` keeps data order.
- `startAngle : number` (default 90), `clockwise : boolean` (default true), `minAngle : number` — drop slivers below this angle.
- `label : SunburstLabelOption` — `rotate: "radial" | "tangential" | <deg>`, `position: "inside"|"outside"`, `minAngle` (hide labels on tiny arcs), `silent`, plus standard `color`/`fontSize`/`formatter`.
- `itemStyle : SunburstItemStyleOption` — `ItemStyleOption` + `borderRadius` for rounded arcs (`color`, `borderColor`, `borderWidth`, `opacity`).
- `emphasis.focus : "self" | "ancestor" | "descendant" | "relative" | "none"` — what to keep highlighted on hover (the sunburst signature behavior).
- `colorBy : "series" | "data"`, `stillShowZeroSum`, `renderLabelForZeroData`, `animationType: "expansion" | "scale"`.

## Patterns

### Per-depth styling via `levels` (remember the empty index 0)
```ts
levels: [
  {},                                                   // 0: reserved — leave empty
  { r0: "0%",  r: "35%", itemStyle: { borderWidth: 2 },
    label: { rotate: "tangential" } },                  // first ring
  { r0: "35%", r: "70%", label: { align: "right" } },   // second ring
  { r0: "70%", r: "72%", itemStyle: { opacity: 0.5 },   // thin outer band
    label: { position: "outside", silent: true } }
]
```
`radius: ["35%","70%"]` per level is the modern form; `r0`/`r` are the deprecated equivalents still in the type.

### Drilldown via `nodeClick` (free) or a click handler
`nodeClick: "rootToNode"` gives drill-in/out with zero JS. For custom drilldown, read the path off the click param — `params.treePathInfo` is the array of `{ name, dataIndex, value }` from root to the clicked node:
```ts
chart.on("click", (p: ml.echarts.SunburstDataParams) => {
  const path = p.treePathInfo.map(n => n.name).join(" / ");  // "Alpha / A2 / A2a"
  this._selectedPath = path; this.update();
});
```

### Theming hook
Set arc separators to the themed border and let the series palette flow from CSS vars (see the parent `echarts` theming pattern). Inner-ring legibility usually wants `label.rotate: "radial"`; outer thin bands read better with `position: "outside"`.
```ts
itemStyle: { borderColor: chartTheme.background, borderWidth: 2 },
color: chartTheme.getSeriesColors()
```

## Gotchas

- **`levels[0]` is reserved.** Styling must start at index 1; putting your first ring's style at index 0 silently does nothing.
- **No axes / no `coordinateSystem`.** Like pie, sunburst is self-positioned via `radius`/`center`; `grid`/`xAxis`/`yAxis` are ignored.
- **Parent `value` vs. sum.** If you set a parent `value` smaller than its children's sum the ring math goes inconsistent — omit `value` on parents and let ECharts sum, or keep them consistent.
- **`tooltip.trigger` must be `"item"`** (sunburst has no axis); `"axis"` shows nothing.
- **Tiny arcs clutter.** Use `minAngle` on the series and `label.minAngle` to suppress slivers and their labels rather than rendering unreadable spokes.
- **`label.rotate` is sunburst-specific** (`"radial"`/`"tangential"`); the base label `rotate`/`position` enums are overridden here, so `"outside"` is valid for `position` only on sunburst.
- **Merge semantics** apply to the whole nested `data` getter — return a fresh tree to replace it; partial re-emits deep-merge and can leave stale branches.

## Related skills

- `echarts` — parent: option model, `s.chart` binding, `onChartCreated`, CSS-var theming.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart node mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `nodeT<RaptorChart>`).
- `pie.md` — single-level ring/donut/nightingale sibling.
- `treemap.md` — rectangular hierarchy sibling.
- `tree.md` — node-link dendrogram sibling.
