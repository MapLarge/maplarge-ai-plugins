# Tree (node-link hierarchy)

A dendrogram: a hierarchy drawn as nodes joined by edges, laid out left-to-right, top-down, or radially. `type: "tree"`, typed `ml.echarts.TreeSeriesOption`.

## When to use

- Parent/child structures where the **lineage (edges) is the point**: org charts, file trees, taxonomies, decision/dependency trees, nested categories.
- Data is naturally recursive `{ name, children: [...] }` and you want collapse/expand drilldown.

Use a different skill when:
- **Leaf magnitude matters more than structure** (sizes/proportions of leaves) → `treemap.md` (nested rectangles) or `sunburst.md` (radial rings).
- **It's a general network**, not a single-rooted tree (cycles, many-to-many) → `graph.md`.
- Flat category counts → `bar.md`/`pie.md`.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { trigger: "item", triggerOn: "mousemove" },
  series: [{
    type: "tree",
    data: [{
      name: "Root",
      children: [
        { name: "Branch A", children: [{ name: "Leaf A1" }, { name: "Leaf A2" }] },
        { name: "Branch B", collapsed: true, children: [{ name: "Leaf B1" }] }
      ]
    }],
    top: "5%", left: "8%", bottom: "5%", right: "20%",   // BoxLayout, not grid
    layout: "orthogonal", orient: "LR", edgeShape: "curve",
    symbol: "circle", symbolSize: 8,
    initialTreeDepth: 2,         // -1 = expand all
    expandAndCollapse: true, roam: true,
    label: { position: "left", verticalAlign: "middle", align: "right", fontSize: 12 },
    leaves: { label: { position: "right", verticalAlign: "middle", align: "left" } },
    emphasis: { focus: "descendant" },
    animationDuration: 550, animationDurationUpdate: 750
  }]
};
```
A tree uses **no `grid`/`xAxis`/`yAxis`** — it positions itself in the chart box via `top/left/bottom/right` (BoxLayoutOptionMixin). Reserve `right` (or `bottom` for `TB`) for outward-growing labels.

## Data shape

`series.data` is an **array with one root object** (multiple roots = a forest, allowed). Each node (`TreeSeriesNodeItemOption`):
```ts
{
  name: "Node label",       // shown as the label
  value?: number | string,  // optional payload; surfaces in tooltip/params.value
  collapsed?: boolean,      // true => start collapsed (overrides initialTreeDepth for this node)
  children?: Node[],        // recurse; omit/[] => leaf
  // per-node overrides: itemStyle, lineStyle, label, symbol, symbolSize, link, target
}
```
There is **no dataset/encode path** for trees — data must be the nested object form. Build it recursively in the VM from flat rows (group by parent id).

## Key options (`ml.echarts.TreeSeriesOption`)

- `layout : 'orthogonal' | 'radial'` — rectangular tree vs. circular ring layout.
- `orient : 'LR' | 'TB' | 'RL' | 'BT'` — direction of an orthogonal tree (`'horizontal'`=LR, `'vertical'`=TB accepted). Ignored when `layout: 'radial'`.
- `edgeShape : 'curve' | 'polyline'` — smooth bezier vs. elbow connectors. `polyline` only valid for orthogonal.
- `edgeForkPosition : string | number` — where polyline edges fork (e.g. `"50%"`).
- `expandAndCollapse : boolean` — click a node to collapse/expand its subtree.
- `initialTreeDepth : number` — depth expanded on first render; `-1` expands everything. Default 2.
- `roam : boolean | 'scale' | 'move' | 'zoom' | 'pan'` — drag/zoom the whole tree (RoamOptionMixin; also `center`, `zoom`, `scaleLimit`).
- `nodeScaleRatio : number` — how much nodes shrink/grow on zoom (default 0.4).
- `symbol / symbolSize / symbolRotate / symbolOffset` — node marker (SymbolOptionMixin); `symbolSize` may be a callback `(value, params) => number`.
- `leaves : { label, itemStyle, lineStyle, emphasis }` — styling applied only to leaf nodes (commonly a different label `position`).
- `itemStyle` — node fill/stroke (`color`, `borderColor`, `borderWidth`).
- `lineStyle : CurveLineStyleOption` — edge style; adds `curveness` on top of width/color/type.
- `label : SeriesLabelOption` — node text; `position` typically `'left'`/`'right'`/`'top'`/`'bottom'`.
- `emphasis.focus : 'ancestor' | 'descendant' | 'relative' | 'self' | 'none'` — hover highlights the lineage; fade the rest.

## Patterns

**Theming.** Resolve CSS vars at access time (see parent skill): `itemStyle: { color: chartTheme.neutral, borderColor: chartTheme.border }`, `lineStyle: { color: chartTheme.border, curveness: 0.5 }`, `label: { color: chartTheme.text }`. For radial trees set `label.rotate` off and rely on ECharts auto-rotation.

**Lazy drilldown without re-rooting.** Keep `expandAndCollapse: true` and seed deep nodes with `collapsed: true`; ECharts toggles subtrees internally — no `setOption` needed. To react to expansion, listen for `'click'` and read `params.data` / `params.treeAncestors`.

**Re-root on click (focus a subtree).** On `'click'`, find the clicked node in your source hierarchy and re-emit `series[0].data` as `[thatSubtree]`. Because `setOption` merges, return a **fresh data array** from the bound VM getter so stale branches are replaced.

**Radial org/taxonomy.** `layout: "radial"`, drop `orient`, use `symbolSize` smaller, `label: { rotate: 0, fontSize: 11 }`; give the box equal margins so the circle isn't clipped.

**Signature event.** `chart.on("click", e => { if (e.seriesType === "tree") { /* e.data: {name, value, children}; e.treeAncestors: path */ } })`.

## Gotchas

- **No axes/grid.** Sizing is `top/left/bottom/right` on the series, not `grid`. Forgetting margin for label-side overflow clips text — reserve space opposite the root (`right` for `LR`).
- **`data` is one-root nested objects only.** No `[x,y]` tuples, no dataset/encode. Build the tree recursively before binding.
- **`initialTreeDepth` vs `collapsed`.** A node's explicit `collapsed: true` wins over `initialTreeDepth`. Use `-1` to force fully-expanded, then override specific branches.
- **`polyline` edges require orthogonal layout.** `edgeShape: "polyline"` is ignored (or misbehaves) under `layout: "radial"`.
- **Merge clears nothing.** Re-emitting a smaller tree won't remove old branches unless the bound getter returns a brand-new `data` array (or use `notMerge` at the instance).
- **`roam` + scroll.** With `roam: true` the chart captures wheel events for zoom; if the chart sits in a scrollable panel this can trap page scroll — set `roam: "move"` (pan only) or `false`.
- **Large trees are slow.** Hundreds of always-expanded nodes hurt; lean on `collapsed`/`initialTreeDepth` to render lazily.

## Related skills

- `echarts` — parent: the option model, `setOption` merge semantics, theme-from-CSS-vars helper.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart`, `onChartCreated`, `getTypedProp` bindings).
- `treemap.md` / `sunburst.md` — hierarchy by **area/magnitude** instead of node-link lineage.
- `graph.md` — general (non-tree) node-edge networks.
