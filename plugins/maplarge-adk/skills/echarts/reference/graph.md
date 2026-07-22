# Graph (network) series

A `type: "graph"` series draws a node-link network: circles (nodes) joined by lines (edges), laid out by force simulation, on a circle, or at fixed coordinates.

## When to use

- Relationship / network data: who-connects-to-whom, entity links, dependency or topology maps, org/social graphs.
- You have a set of **nodes** and a set of **edges** referencing nodes by id/name, and want them positioned automatically.
- Use a different skill when:
  - Edges carry a **conserved flow** quantity drawn as proportional ribbon width → `sankey.md`.
  - The data is a strict **hierarchy** (single root, parent→child) → `tree.md`.
  - You only need scattered points with no connections → `scatter.md`.

## Minimal config

A complete force-directed graph (`ml.echarts.EChartsOption`):
```ts
const option: ml.echarts.EChartsOption = {
  tooltip: {},
  legend: [{ data: ["Group A", "Group B"] }],
  series: [{
    type: "graph",
    layout: "force",
    roam: true,
    draggable: true,
    label: { show: true, position: "right" },
    edgeSymbol: ["none", "arrow"],
    edgeSymbolSize: [0, 8],
    force: { repulsion: 120, gravity: 0.1, edgeLength: 80 },
    categories: [{ name: "Group A" }, { name: "Group B" }],
    data: [
      { id: "1", name: "Alpha",   value: 10, category: 0, symbolSize: 30 },
      { id: "2", name: "Beta",    value: 6,  category: 0, symbolSize: 22 },
      { id: "3", name: "Gamma",   value: 8,  category: 1, symbolSize: 26 },
      { id: "4", name: "Delta",   value: 4,  category: 1, symbolSize: 18 }
    ],
    edges: [
      { source: "1", target: "2" },
      { source: "1", target: "3", value: 5 },
      { source: "3", target: "4" }
    ]
  } as ml.echarts.GraphSeriesOption]
};
```

## Data shape

Two parallel arrays on the series (aliases: `data` ≡ `nodes`, `edges` ≡ `links`):

- **Nodes** — `data` / `nodes`: `GraphNodeItemOption[]`. Each is an object, most commonly:
  `{ id, name, value, category, symbolSize, x, y, fixed, itemStyle, label }`.
  `id` is what edges reference; if omitted, edges match on `name`. `value` is free metadata (drives tooltip / `symbolSize` if you map it). For `layout: "none"` you **must** supply `x`/`y` per node.
- **Edges** — `edges` / `links`: `GraphEdgeItemOption[]`. Each: `{ source, target, value?, lineStyle?, symbol?, symbolSize? }`. `source`/`target` are node `id` (or `name`, or numeric index). `value` is optional edge metadata.
- **Categories** — `categories: GraphCategoryItemOption[]`: `[{ name }]`. A node's `category` (index or name) assigns it to a category → category color + legend toggling. Legend `data` must match category `name`s.

Nodes may also be bare value arrays, but object form is almost always what you want.

## Key options (`ml.echarts.GraphSeriesOption`)

- `layout` : `'none' | 'force' | 'circular'` — positioning engine. `none` = use node `x`/`y`; `force` = physics sim; `circular` = ring.
- `force` : `{ repulsion?, gravity?, edgeLength?, friction?, initLayout?, layoutAnimation? }` — only for `layout:"force"`. `repulsion` pushes nodes apart (number or `[min,max]`), `gravity` pulls toward center (0–1), `edgeLength` is target link length (number or `[min,max]`), `friction` damps motion.
- `circular` : `{ rotateLabel? }` — for `layout:"circular"`.
- `roam` : `boolean | 'scale' | 'move' | 'pan' | 'zoom'` — pan/zoom the canvas. Pairs with `center` and `zoom`.
- `draggable` : `boolean` — let the user drag nodes (dragged nodes become fixed during force layout).
- `categories` : `GraphCategoryItemOption[]` — groups for coloring + legend.
- `edgeSymbol` : `string | string[]` — end markers, e.g. `["none","arrow"]` for a directed edge. `edgeSymbolSize` : `number | number[]`.
- `label` : `SeriesLabelOption`, `edgeLabel` : `SeriesLineLabelOption` — node and edge text.
- `itemStyle` : `ItemStyleOption` (node fill/border), `lineStyle` : `{ ...LineStyleOption, curveness? }` (edge stroke; `curveness` 0–1 bows the line).
- `autoCurveness` : `boolean | number | number[]` — auto-bow parallel edges so multiple links between the same pair don't overlap.
- `emphasis` : `{ focus?: 'none'|'self'|'adjacency', scale?, label?, itemStyle?, lineStyle? }` — `focus:'adjacency'` highlights a hovered node plus its neighbors and dims the rest.
- `symbol` / `symbolSize` : node glyph + size (per-node `symbolSize` overrides; can be a callback of the node value).
- `nodeScaleRatio` : how much nodes shrink/grow during roam zoom.
- `center` / `zoom` / `scaleLimit` (from RoamOptionMixin): initial viewport + zoom clamp.

## Patterns

**Coloring by category + legend toggle.** Give each node a `category`, declare `categories: [{ name }]`, and a `legend` whose `data` matches the names. Clicking a legend entry shows/hides that category. Node colors come from the chart palette per category — theme it by setting the palette `color: [...]` at option root (resolve from CSS vars; see parent skill).

**Sizing nodes by a metric.** Set `symbolSize` per node from your data when you build the series in the VM, or pass a callback: `symbolSize: (val) => Math.sqrt(val[/*dim*/]) * k`. Keep the math in the VM (no `this` available inside ECharts callbacks).

**Fixed schematic (no physics).** Use `layout: "none"` and give every node `x`/`y` (and optionally `fixed: true`). Good for stable topology diagrams that must not reflow between renders.

**Signature events.** On the live instance (`onChartCreated`, see the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`)), `chart.on("click", e => ...)` fires with `e.dataType === "node"` or `"edge"`; `e.data` is the node/edge object you supplied. Use it for drilldown or selection. `mouseover`/`mouseout` pair well with `emphasis.focus:'adjacency'`.

## Gotchas

- **`source`/`target` must resolve.** They match node `id` first; if your nodes only set `name`, reference that name. A typo silently drops the edge.
- **`layout:"none"` needs coordinates.** Without `x`/`y` on nodes, everything stacks at the origin.
- **Force layout is non-deterministic** and animates. For reproducible positions set `force.layoutAnimation: false`, or pre-compute and switch to `layout:"none"`. Re-emitting the option restarts the simulation (jumpy) — see the parent skill's merge note; return a stable series or guard re-render.
- **`repulsion`/`edgeLength` scale with node count.** Dense graphs need larger `repulsion` and `edgeLength` (or `[min,max]` ranges) to avoid a hairball.
- **Legend only toggles categories**, not individual nodes; a node with no `category` won't be hidden by any legend entry.
- **Parallel edges overlap** unless you set `autoCurveness: true` or per-edge `lineStyle.curveness`.
- **`graph` has no cartesian axes.** Don't add `xAxis`/`yAxis`/`grid` (unless using a non-default `coordinateSystem`); they do nothing for the default layout.

## Related skills

- `echarts` — parent skill: the option object model, `setOption` merge behavior, theming via CSS variables, `onChartCreated`.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart`, reaching the instance via `raptorDom.nodeT<RaptorChart>`).
- `sankey.md` — flow graphs with ribbon-width-encoded magnitude (sibling for weighted, conserved flows).
- `tree.md` — strict hierarchy / parent-child layout.
- `scatter.md` — points without connecting edges.

---
*A deeper option/field cheatsheet lives in the Reference section below.*

---

# Graph series — field cheatsheet

Grounded in `ml.echarts.GraphSeriesOption` (and `GraphNodeItemOption`, `GraphEdgeItemOption`, `GraphCategoryItemOption`) from the bundled d.ts. Official section: https://echarts.apache.org/en/option.html#series-graph

## Series-level (`GraphSeriesOption`)

| Field | Type | Notes |
|---|---|---|
| `type` | `'graph'` | required |
| `coordinateSystem` | `string` | default is the graph's own view; can be `'cartesian2d'`/`'polar'`/`'geo'`/`'calendar'`/`'none'` via the SeriesOn* mixins (advanced) |
| `layout` | `'none' \| 'force' \| 'circular'` | positioning engine |
| `data` / `nodes` | `(GraphNodeItemOption \| GraphDataValue)[]` | aliases for the same node list |
| `edges` / `links` | `GraphEdgeItemOption[]` | aliases for the same edge list |
| `categories` | `GraphCategoryItemOption[]` | `[{ name, value, symbol... }]` |
| `roam` | `boolean \| 'pan' \| 'move' \| 'zoom' \| 'scale'` | pan/zoom |
| `center` | `(number \| string)[]` | viewport center |
| `zoom` | `number` | initial zoom (default 1) |
| `scaleLimit` | `{ min?, max? }` | zoom clamp |
| `draggable` | `boolean` | drag nodes |
| `nodeScaleRatio` | `number` | node size response to roam zoom |
| `legendHoverLink` | `boolean` | hover legend ⇄ highlight series |
| `edgeSymbol` | `string \| string[]` | e.g. `['none','arrow']` |
| `edgeSymbolSize` | `number \| number[]` | arrowhead size |
| `symbol` / `symbolSize` / `symbolRotate` / `symbolOffset` / `symbolKeepAspect` | from `SymbolOptionMixin` | default node glyph; `symbolSize` accepts a `(rawValue, params) => number\|number[]` callback |
| `label` | `SeriesLabelOption` | node labels |
| `edgeLabel` | `SeriesLineLabelOption` | edge labels |
| `itemStyle` | `ItemStyleOption` | node fill/border/opacity/decal |
| `lineStyle` | `GraphEdgeLineStyleOption` = `LineStyleOption & { curveness? }` | edge stroke |
| `autoCurveness` | `boolean \| number \| number[]` | bow parallel edges (ignored if `lineStyle.curveness` set) |
| `emphasis` | `{ focus?, scale?, label?, edgeLabel?, itemStyle?, lineStyle? }` | `focus`: `'none' \| 'self' \| 'adjacency'` |
| `blur` | `{ label?, edgeLabel?, itemStyle?, lineStyle? }` | dimmed state |
| `select` | `{ label?, edgeLabel?, itemStyle?, lineStyle? }` | selected state |
| `circular` | `{ rotateLabel? }` | for `layout:'circular'` |
| `force` | see below | for `layout:'force'` |

### `force` object
| Field | Type | Notes |
|---|---|---|
| `initLayout` | `'circular' \| 'none'` | starting positions before sim |
| `repulsion` | `number \| number[]` | inter-node repulsion; range scales by node value |
| `gravity` | `number` | pull toward center (0–1 typical) |
| `friction` | `number` | velocity damping (0–1) |
| `edgeLength` | `number \| number[]` | target edge length; range maps to edge value |
| `layoutAnimation` | `boolean` | `false` = settle instantly (deterministic) |

## Node (`GraphNodeItemOption`)
| Field | Type | Notes |
|---|---|---|
| `id` | `string` | edge reference key |
| `name` | `string` | label + fallback edge key |
| `value` | `OptionDataValue \| OptionDataValue[]` | metadata / tooltip |
| `x`, `y` | `number` | required for `layout:'none'` |
| `fixed` | `boolean` | pin during force layout |
| `category` | `number \| string` | category index or name |
| `symbol` / `symbolSize` / `symbolRotate` / `symbolOffset` / `symbolKeepAspect` | from `SymbolOptionMixin` | per-node glyph overrides |
| `draggable` | `boolean` | per-node drag |
| `cursor` | `string` | CSS cursor |
| `itemStyle` | `ItemStyleOption` | per-node style |
| `label` | `SeriesLabelOption` | per-node label |
| `emphasis` / `blur` / `select` | states | per-node, `emphasis.focus` adds `'adjacency'` |

## Edge (`GraphEdgeItemOption`)
| Field | Type | Notes |
|---|---|---|
| `source` | `string \| number` | node id / name / index |
| `target` | `string \| number` | node id / name / index |
| `value` | `number` | metadata; can drive `edgeLength`/`repulsion` ranges |
| `symbol` | `string \| string[]` | per-edge end markers |
| `symbolSize` | `number \| number[]` | per-edge marker size |
| `lineStyle` | `GraphEdgeLineStyleOption` | per-edge stroke + `curveness` |
| `label` | `SeriesLineLabelOption` | per-edge label |
| `ignoreForceLayout` | `boolean` | edge exerts no force |
| `emphasis` / `blur` / `select` | states | per-edge |

## Category (`GraphCategoryItemOption`)
`{ name, value, ...SymbolOptionMixin, itemStyle?, label?, emphasis?/blur?/select? }` — `name` ties to node `category` and legend `data`; supplies the category's default color/symbol.

## Choosing a layout
- **force** — exploratory networks, clusters emerge naturally. Tune `repulsion` up and `gravity` down for sparser spread; set `layoutAnimation:false` for static output.
- **circular** — show all nodes on a ring; good for relatively small node sets and chord-like relationship views (`circular.rotateLabel:true` for radial labels).
- **none** — you control every `x`/`y`; deterministic schematic / saved layout.
