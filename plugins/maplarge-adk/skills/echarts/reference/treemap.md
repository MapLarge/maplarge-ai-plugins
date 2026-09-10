# ECharts Treemap

Hierarchical part-of-whole data drawn as nested rectangles whose **area is proportional to `value`**, recursively subdivided by `children`. One `series` entry of `type: "treemap"`.

## When to use

- A tree of values where you want **area = magnitude** and nesting = hierarchy (disk usage, budget by org > team > line-item, sales by region > product).
- You want built-in **drill-down**: click a parent to zoom in, with a breadcrumb to climb back.
- Many leaves at once — a treemap packs far more nodes legibly than a pie.

Use a different skill when:

- **`sunburst.md`** — same hierarchy but you prefer concentric rings (better for showing depth at a glance, worse for many tiny leaves).
- **`tree.md`** — you care about the parent/child *connections* (node-link diagram), not area.
- **`pie.md`** — a single flat level of proportions, no nesting.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
  tooltip: { formatter: (p: any) => `${p.name}: ${p.value}` },
  series: [{
    type: "treemap",
    name: "Storage",
    roam: false,                       // disable pan/zoom drag
    nodeClick: "zoomToNode",           // click a parent to drill in
    leafDepth: 1,                      // show one level at a time (drilldown mode)
    upperLabel: { show: true, height: 20 }, // parent header band when leafDepth set
    levels: [
      { itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 } },
      { colorSaturation: [0.35, 0.6], itemStyle: { borderColorSaturation: 0.7, gapWidth: 1 } }
    ],
    data: [
      { name: "Documents", value: 120, children: [
        { name: "Reports", value: 80 },
        { name: "Drafts",  value: 40 }
      ]},
      { name: "Media", value: 200, children: [
        { name: "Images", value: 150 },
        { name: "Video",  value: 50 }
      ]},
      { name: "System", value: 60 }
    ] as ml.echarts.TreemapSeriesNodeItemOption[]
  }]
};
```

## Data shape

`series.data` is a recursive array of `TreemapSeriesNodeItemOption`:

```ts
{ name: "label",
  value: 120,                 // number, OR number[] — extra dims for visual/tooltip
  children: [ /* same shape, omit for a leaf */ ],
  id?, color?, decal?, cursor?,
  itemStyle?, label?, upperLabel? }   // per-node overrides
```

- A **parent's `value` is optional** — if omitted it is computed as the sum of its children's values. Set it explicitly only to override the sum.
- `value` may be a `number[]` (`TreemapSeriesDataValue = number | number[]`). The first element drives area by default; `visualDimension` picks which element drives color (see visualMin/Max).
- There is **no top-level root node** — the array entries are the first visible level. Wrap them in a single node if you want one root rectangle.

## Key options

From `ml.echarts.TreemapSeriesOption` and its mixins:

- `data : TreemapSeriesNodeItemOption[]` — the hierarchy (above).
- `levels : TreemapSeriesLevelOption[]` — **styling per depth** (index 0 = top level). Each level sets `itemStyle`, `color`/`colorSaturation`/`colorAlpha`, `label`, `upperLabel`, `decal`, `visualMin`/`visualMax`, `borderColorSaturation`. This is the primary theming surface.
- `itemStyle : TreemapSeriesItemStyleOption` — `borderColor`, `borderWidth`, `gapWidth` (gap between sibling rects), `borderColorSaturation`, `borderRadius`, `colorAlpha`, `colorSaturation`.
- `label / upperLabel : TreemapSeriesLabelOption` — `label` is the text inside a leaf; `upperLabel` is the **header band drawn on a parent rectangle** (set `upperLabel.show: true` + a `height` to reveal parents while their children fill the body).
- `leafDepth : number` — nodes at this depth are treated as leaves: **enables drill-down** (only `leafDepth` levels shown at once). Omit to render the full tree flat.
- `nodeClick : "zoomToNode" | "link" | false` — leaf/parent click behavior. `"zoomToNode"` (default) drills/zooms; `false` disables.
- `breadcrumb : { show, height, itemStyle, emphasis }` — the climb-back trail shown at bottom during drilldown.
- `visualMin / visualMax : number` + `visualDimension` — value range mapped to the color ramp; `colorMappingBy: "value" | "index" | "id"` chooses how a node picks its color.
- `colorSaturation / colorAlpha : number[]` — `[min, max]` saturation/opacity range applied across siblings (gives the gradient look).
- `squareRatio : number` — target width:height ratio for tiles (default golden ratio ≈ 0.618 → 2.618); tune for squarer or more elongated rects.
- `visibleMin : number` — hide a node whose pixel area < this (px²). `childrenVisibleMin` — collapse children when the parent is below this area.
- `roam : boolean | "scale" | "move" | "pan" | "zoom"` — pan/zoom the treemap.
- `sort : boolean | "asc" | "desc"` — sibling ordering by value (default desc; asc looks odd).
- `zoomToNodeRatio`, `clipWindow`, `drillDownIcon` — drilldown tuning.
- Box layout (`left`/`top`/`right`/`bottom`/`width`/`height`) positions the whole treemap in the canvas.

## Patterns

**Drilldown one level at a time** — set `leafDepth: 1`, `nodeClick: "zoomToNode"`, `upperLabel.show: true`, and `breadcrumb.show: true`. Clicking a parent makes it the new root; the breadcrumb climbs back. Listen for the change via the live instance:

```ts
chart.on("click", (e: any) => { /* e.data = clicked node, e.treePathInfo / e.treeAncestors = path */ });
```

**Color by a value range (heat-style)** — drive color from a numeric dimension instead of per-node palette:

```ts
series: [{ type: "treemap", visualDimension: 1, visualMin: 0, visualMax: 100,
  colorMappingBy: "value",
  levels: [{ color: ["#2c7bb6", "#ffffbf", "#d7191c"] }],   // ramp low→high
  data: rows /* value: [area, heatMetric] */ }]
```

**Theme-reactive borders/gaps** — resolve CSS vars at access time (see parent `echarts` skill) and feed them into `levels[].itemStyle`:

```ts
levels: [{ itemStyle: { borderColor: chartTheme.background, gapWidth: 2 } },
         { itemStyle: { borderColor: chartTheme.border, gapWidth: 1 } }]
```

## Gotchas

- **Parent value vs. sum.** If you set a parent `value` smaller than its children's total, child areas no longer fill the parent correctly. Leave parent `value` out to auto-sum unless you mean to override.
- **`levels` is indexed by depth, not by node.** `levels[0]` styles the top rectangles, `levels[1]` their children, etc. Style a single node via that node's own `itemStyle`, not `levels`.
- **`upperLabel` only appears on nodes that have visible children.** Without `upperLabel.show: true` (and a `height`), parents are fully covered by children and unlabeled — confusing in drilldown.
- **No root by default.** Top-level `data` entries are siblings filling the canvas; there is no enclosing root rect unless you add one.
- **`leafDepth` changes the interaction model.** Omitting it renders the entire tree flat (no drilldown); setting it shows only that many levels and turns clicks into zoom/root-change.
- **`colorSaturation`/`colorAlpha` are `[min,max]` arrays**, not single numbers — they distribute a gradient across siblings; a scalar is ignored.
- **Tooltip params carry the path.** Use `params.treeAncestors` (array of `{name, value, dataIndex}`) to build a breadcrumb-style tooltip; `treePathInfo` is the deprecated alias.

## Related skills

- `echarts` — parent skill: the option model, `s.chart` binding, `onChartCreated`, theming via CSS vars.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart node mounts in a Raptor view (`s.chart({ options })`, `traverseRaptorChart`, `nodeT<RaptorChart>`).
- `sunburst.md` — radial sibling for the same hierarchy.
- `tree.md` — node-link layout when connections matter more than area.
- `pie.md` — single flat level of proportions.

---
*A deeper option/field cheatsheet lives in the Reference section below.*

---

## Treemap option cheatsheet

### `TreemapSeriesOption` (own + notable inherited fields)

| Field | Type | Meaning |
| --- | --- | --- |
| `type` | `'treemap'` | required |
| `data` | `TreemapSeriesNodeItemOption[]` | recursive hierarchy (first visible level) |
| `levels` | `TreemapSeriesLevelOption[]` | per-depth styling (index = depth) |
| `leafDepth` | `number` | nodes at this depth are leaves → enables drilldown |
| `nodeClick` | `'zoomToNode' \| 'link' \| false` | click behavior (default zoomToNode) |
| `breadcrumb` | `{ show, height, emptyItemWidth, itemStyle, emphasis }` + box-layout | climb-back trail |
| `squareRatio` | `number` | target tile aspect ratio (default ≈ golden) |
| `sort` | `boolean \| 'asc' \| 'desc'` | sibling order by value (default desc) |
| `clipWindow` | `'origin' \| 'fullscreen'` | clip window on zoom |
| `zoomToNodeRatio` | `number` | target node area fraction after zoom |
| `drillDownIcon` | `string` | glyph shown on drillable nodes (default '▶') |
| `roam` | `boolean \| 'scale' \| 'move' \| 'pan' \| 'zoom'` | pan/zoom |
| `left/top/right/bottom/width/height` | box layout | position in canvas |
| `label` | `TreemapSeriesLabelOption` | leaf text label |
| `upperLabel` | `TreemapSeriesLabelOption` | parent header band (needs `show: true` + `height`) |
| `itemStyle` | `TreemapSeriesItemStyleOption` | global node fill/border/gap |

### `TreemapSeriesVisualOption` (inherited; also valid on levels & nodes)

| Field | Type | Meaning |
| --- | --- | --- |
| `visualDimension` | `number \| string` | which value-array element drives color |
| `visualMin` / `visualMax` | `number` | value range mapped to color ramp |
| `colorMappingBy` | `'value' \| 'index' \| 'id'` | how a node selects its color |
| `colorAlpha` | `number[] \| 'none'` | `[min,max]` opacity across siblings |
| `colorSaturation` | `number[] \| 'none'` | `[min,max]` saturation across siblings |
| `visibleMin` | `number` | hide node if pixel area < value (px²) |
| `childrenVisibleMin` | `number` | hide children if parent area < value (px²) |

### `TreemapSeriesNodeItemOption` (a data node)

```ts
{ id?, name?, value?: number | number[], children?: TreemapSeriesNodeItemOption[],
  color?: ColorString[] | 'none', decal?, cursor?,
  itemStyle?, label?, upperLabel?,           // from TreemapStateOption
  visualDimension?, visualMin?, visualMax?,  // from TreemapSeriesVisualOption
  colorAlpha?, colorSaturation?, visibleMin?, childrenVisibleMin? }
```

- `value` omitted on a parent → auto-summed from children.
- `color: ColorString[]` on a node/level supplies the palette its children cycle through.

### `TreemapSeriesLevelOption`

Extends the visual + state options, plus:

```ts
{ color?: ColorString[] | 'none', decal?: DecalObject[] | 'none',
  itemStyle?, label?, upperLabel?, emphasis?, blur?, select?,
  visualMin?, visualMax?, colorSaturation?, colorAlpha?, ... }
```

### `TreemapSeriesItemStyleOption`

```ts
{ borderColor?, borderWidth?, gapWidth?,        // gapWidth = px gap between sibling rects
  borderColorSaturation?,                       // derive border color saturation from fill
  borderRadius?: number | number[],
  colorAlpha?: number, colorSaturation?: number,
  color?, opacity?, shadowBlur?, shadowColor? /* + standard ItemStyleOption */ }
```

### Callback params (`TreemapSeriesCallbackDataParams`)

`name`, `value`, `dataIndex`, `data`, `color`, plus:

- `treeAncestors?: { name, dataIndex, value }[]` — path from root to node (use for tooltips/breadcrumbs).
- `treePathInfo` — deprecated alias of `treeAncestors`.

Official reference: <https://echarts.apache.org/en/option.html#series-treemap>
