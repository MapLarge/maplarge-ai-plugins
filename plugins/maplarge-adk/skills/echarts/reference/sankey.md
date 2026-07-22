# Sankey

Layered flow diagram: nodes in stages connected by ribbons whose width encodes a `value`. Built as a single `series` entry of `type: "sankey"` (`ml.echarts.SankeySeriesOption`).

## When to use

- Multi-stage flow where the **width of a link** = magnitude: budget allocation, energy/material flow, page/user funnels with branching, supply chains, conversion paths.
- You have a set of **named nodes** and weighted **links** between them, and want the layout (node columns, ribbon routing) computed automatically.

Use a different skill when:
- A single linear drop-off through ordered stages with no branching → `funnel.md`.
- A general node-link network (no enforced left-to-right layering, force/circular layout, edges both ways) → `graph.md`.
- Flows whose volume changes **over time** (stream/stacked-area by date) → `themeriver.md`.
- Strict hierarchy (one parent per node, part-to-whole) → `tree.md` / `sunburst.md` / `treemap.md`.

## Minimal config

A complete `ml.echarts.EChartsOption` that renders a 3-stage flow:
```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "item", triggerOn: "mousemove" },
  series: [{
    type: "sankey",
    orient: "horizontal",
    nodeAlign: "justify",
    nodeWidth: 14,
    nodeGap: 10,
    emphasis: { focus: "adjacency" },
    lineStyle: { color: "gradient", opacity: 0.5, curveness: 0.5 },
    data: [
      { name: "Source A" }, { name: "Source B" },
      { name: "Hub" }, { name: "Out X" }, { name: "Out Y" }
    ],
    links: [
      { source: "Source A", target: "Hub", value: 8 },
      { source: "Source B", target: "Hub", value: 4 },
      { source: "Hub", target: "Out X", value: 7 },
      { source: "Hub", target: "Out Y", value: 5 }
    ]
  }]
};
```
Sankey is its own `coordinateSystem: "view"` — there is **no** `xAxis`/`yAxis`/`grid`.

## Data shape

Two parallel arrays inside the series:
- **Nodes** — `data` (alias `nodes`): `SankeyNodeItemOption[]`, each at minimum `{ name: string }`. Names must be **unique**; links reference nodes by this `name` (or by index). Optional per-node: `value`, `depth`, `itemStyle`, `label`, `localX`/`localY`, `draggable`.
- **Links** — `links` (alias `edges`): `SankeyEdgeItemOption[]`, each `{ source, target, value }` where `source`/`target` are node `name` strings (or indices) and `value: number` sets ribbon width. Optional per-link: `lineStyle`, `edgeLabel`.

The graph must be a **DAG** — no cycles, and ideally one connected component. A node may appear in any column; ECharts infers columns from link direction unless you pin `depth`.

## Key options

From `ml.echarts.SankeySeriesOption`:
- `orient: 'horizontal' | 'vertical'` — flow direction (default horizontal, left→right).
- `nodeAlign: 'justify' | 'left' | 'right'` — how terminal nodes are pinned. `justify` spreads columns edge to edge; `left`/`right` push leaf nodes to that side.
- `nodeWidth: number` — thickness of each node rectangle (px).
- `nodeGap: number` — vertical gap between nodes in the same column.
- `layoutIterations: number` — relaxation passes that reduce ribbon crossings (default 32; set `0` to keep input order).
- `draggable: boolean` — let the user drag nodes to reposition.
- `levels: SankeyLevelOption[]` — per-depth defaults: `{ depth: number, itemStyle, lineStyle, label }`. Style a whole column at once.
- `lineStyle: SankeyEdgeStyleOption` — ribbon style; `color` accepts `'source' | 'target' | 'gradient'` (tie ribbon color to one endpoint or blend) or a fixed color; plus `opacity`, `curveness` (0–1 ribbon bow).
- `itemStyle: ItemStyleOption` — node fill/border; `color` here drives `'source'`/`'target'` link tinting.
- `label` / `edgeLabel: SeriesLabelOption` — node labels (default shown) and ribbon labels (`edgeLabel.position: 'inside'`).
- `emphasis.focus: 'adjacency' | 'trajectory'` — on hover, highlight directly-connected (`adjacency`) or the whole upstream+downstream path (`trajectory`).
- Position/size via `BoxLayoutOptionMixin`: `left`/`top`/`right`/`bottom`/`width`/`height`.
- `color?: ColorString[]` — palette linearly mapped across nodes.

## Patterns

**Link color tied to an endpoint.** Color each node, then let ribbons inherit:
```ts
data: [{ name: "Hub", itemStyle: { color: chartTheme.getSeriesColors()[0] } }, /* … */],
lineStyle: { color: "source", opacity: 0.45 }  // 'target' or 'gradient' also valid
```

**Per-column theming with `levels`.** Color stages instead of individual nodes:
```ts
levels: [
  { depth: 0, itemStyle: { color: c0 }, lineStyle: { color: "source", opacity: 0.4 } },
  { depth: 1, itemStyle: { color: c1 }, lineStyle: { color: "source", opacity: 0.3 } },
  { depth: 2, itemStyle: { color: c2 } }
]
```

**Vertical flow with inside edge labels.**
```ts
{ type: "sankey", orient: "vertical", label: { rotate: 0 },
  edgeLabel: { show: true, position: "inside", formatter: (p:any) => p.value } }
```

**Click to drill.** Sankey click params expose `dataType` (`'node'` or `'edge'`) and the item:
```ts
chart.on("click", (e: any) => {
  if (e.dataType === "node") this.selectNode(e.name);
  else if (e.dataType === "edge") this.selectLink(e.data.source, e.data.target);
});
```
(See the parent `echarts` skill for wiring events via `onChartCreated`.)

## Gotchas

- **No cycles.** A link path that loops back (A→B→A) makes the layout fail or hang; keep it a DAG.
- **Duplicate node names** silently merge into one node — names are the identity key.
- **Links by index are positional** — if you reorder `data`, index-based `source`/`target` shift. Prefer name strings.
- **`value` is required on links** for width; a missing/zero value collapses the ribbon to nothing.
- **Pinning some `depth`s but not others** can produce empty columns or overlaps — pin all or none.
- **Long node labels overflow** the view box; reserve room with `left`/`right` or set `label: { position }`, since there is no `grid` to `containLabel`.
- **Re-emitting the series merges** — return a fresh series array from the VM getter (or use notMerge) so removed nodes/links actually disappear. See the parent skill's merge gotcha.

## Related skills

- `echarts` (parent) — option model, `onChartCreated` events, theme-reactive CSS-variable colors, setOption merge behavior.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart`, `raptorDom.nodeT`).
- Siblings: `funnel.md` (linear drop-off), `graph.md` (general network), `themeriver.md` (flow over time), `tree.md` / `sunburst.md` / `treemap.md` (hierarchy).
