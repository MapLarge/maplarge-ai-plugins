# Raptor Layout (div / row / column / container / cssGrid / section)

The structural primitives that wrap and arrange other nodes. They render no data of their own — they group content, apply the box model (margin/padding/border/sizing/overflow), and define flex or grid layouts.

## When to use
- `s.div` — the default generic block wrapper. Reach for this first; it carries every shared box-model/flex/sizing option.
- `s.row` + `s.column` — Bootstrap 12-column responsive grid. Columns are the only valid direct children of a row.
- `s.container` — horizontally centers + pads page contents at responsive breakpoints (`fluid: true` for full width).
- `s.section` — a semantic `<section>` block; behaves like a div, accepts a single `columnSize`.
- `s.cssGrid` + `s.cssGridItem` — explicit CSS Grid with named row/column tracks, optional drag-to-resize gutters.

For flex-only stacking you usually do NOT need row/column — a single `s.div` with `flex: { dFlex: true, flexColumn: true, gap: 2 }` is the idiomatic stack.

## Builder
All live on the root scriptor (`IRootScriptor`). Each pushes a node with the matching `type` and opens a content-template scope.

| Builder | node `type` | option interface | node class |
|---|---|---|---|
| `s.div(opts?)` | `"div"` | `ViewDefinitions.IDiv` | `Div` |
| `s.row(opts?)` | `"row"` | `ViewDefinitions.IRow` | `Row` |
| `s.column(opts?)` | `"column"` | `ViewDefinitions.IColumn` | `Column` |
| `s.container(opts?)` | `"container"` | `ViewDefinitions.IContainer` | `Container` |
| `s.section(opts?)` | `"section"` | `ViewDefinitions.ISection` | `Section` |
| `s.cssGrid(opts)` | `"cssGrid"` | `ViewDefinitions.ICssGrid` | `CssGrid` |
| `s.cssGridItem(opts)` | `"cssGridItem"` | `ViewDefinitions.ICssGridItem` | (rendered child of CssGrid) |

`s.div/row/section/container/card` return `IRootScriptorWithTemplates`, so call `.contentTemplates(s => …)` (or chain a child builder directly) to nest. `s.row` returns an `IRowScriptor` whose only structural child builder is `.column(...)`. `s.cssGrid` returns `ICSSGridScriptor` whose child builder is `.cssGridItem(...)`.

```ts
const s = RSScriptor.create<MyVm>();
s.view("main", s =>
  s.div({ flex: { dFlex: true, flexColumn: true }, padding: { around: 3 }, gap: 2 })
   .contentTemplates(s => {
      s.row({ gutterSize: 3 }).contentTemplates(s => {
        s.column({ column: 8 }).contentTemplates(s => s.div({ text: "main" }));
        s.column({ column: 4 }).contentTemplates(s => s.div({ text: "side" }));
      });
   })
);
```

Key option fields (from `IViewDefinition`, shared by every node):
- **Spacing** — `margin?: ISpacing`, `padding?: ISpacing`. `ISpacing` keys: `around | x | y | top | right | bottom | left` (+ `*Sm/Md/Lg/Xl/Xxl` breakpoints), each `SpacingValue = 0|1|2|3|4|5|'auto'`; plus raw `topPx/rightPx/bottomPx/leftPx` and `topREM/…`.
- **Flex** — `flex?: FlexUtilities.IFlexBehavior`. Enable with `dFlex`/`dInlineFlex`; direction `flexRow`/`flexColumn`(+`*Reverse`); `justifyContent{Start|End|Center|Between|Around|Evenly}`; `alignItems{Start|End|Center|Baseline|Stretch}`; `flexWrap`/`flexNowrap`; `flexGrow`/`flexShrink` (`0|1|boolean`); `flexBasis?: string`; `flex?: number` (raw flex shorthand); `gap?: 0..5`. All have responsive `*Sm/Md/Lg/Xl/Xxl` variants.
- **Sizing** — px: `width/height/minWidth/maxWidth/maxHeight`; percent: `widthPercentage/heightPercentage`; vh: `heightVH`; utility (`25|50|75|100|'auto'`): `widthUtility/heightUtility/maxWidthUtility/maxHeightUtility`; `minViewportWidth100`/`minViewportHeight100` force 100%.
- **Box** — `border?: IBorder | boolean`, `borderSubtle`, `background?`, `backgroundOpacity`, `shadow?`, `overflow?` (`'visible'|'hidden'|'scroll'|'auto'|'clip'` or `IOverflowBehavior`), `gap?: GapSize(1..5)` (grid/flex parent gap), `aspectRatio?`, `zIndex?`.
- **Alignment** — `horizontalAlign?: 'left'|'right'`, `verticalAlign?: 'baseline'|'top'|'middle'|'bottom'`, `textAlignment?`.
- **Escape hatches** — `customCssClasses?: string | string[]`, `cssCalc?` (e.g. `calc(100% - 80px)`), `id?`, `testId?`, `metaData?`, `visible?: boolean` (static).
- **Region keys** — `viewName?: string` (names this node for runtime lookup/`s.view` switching), `controlTargetKey?: string` and `childViewRenderingTarget?: string` (mark this node as a target a child view renders into).

Row/Column specifics:
- `IRow`: `gutterSize?: 0..5`, `gutterType?: 'x'|'y'`, `rowColumns{Xs..Xxl}?: ColumnSize` (auto column count).
- `IColumn`: `column?: ColumnSize` and breakpoint variants `columnXs/Sm/Md/Lg/Xl/Xxl`; `ColumnSize = 1..12 | 'auto' | 'col'`. Plus `order?/orderXs..` (`ColumnOrder = 1..5`) and `offsetXs..offsetXxl`.

CssGrid specifics (`ICssGrid`): `rows: string[]` and `columns: string[]` are **required** track lists (e.g. `['auto','1fr','auto']`); `rowGapPx?`, `columnGapPx?`, `setFullHeight?`, `dragToResize?` (+ `minResizeRowPx`/`minResizeColumnPx`, default 50px). `ICssGridItem`: required `rowStart/columnStart/rowEnd/columnEnd` (1-based line numbers), `align?`/`justify?` (`'start'|'end'|'center'|'stretch'`), and `resizeFromEdges?: ('north'|'east'|'south'|'west')[]` for explicit drag handles.

## Bindings & events
All layout nodes accept `bindings: Bindings.IRaptorUniversalBindings` — the universal keys: `visible` (two-way show/hide), `css` (`{ property, trueClasses, falseClasses, classes, class }`), `style` (`StyleBinding`), `attr` (HTML/data-* attributes), `viewDefinition` (swap the node's whole subtree from a VM property), `foreach` (deprecated v1 — prefer `s.foreach`), and `prefixes` (path prefix applied to every binding on the node). `IDiv` additionally allows `IRaptorTextBinding` (`text`, `textColor`, `textBgColor`).

Events are pointer/keyboard/context-menu only — `IEvent_Div/Row/Column/Container/CssGrid/CssGridItem/Section`, each `event: PointerEventTypes | ContextMenuEventType | KeyboardEventTypes`. Wire via `.events([{ event: 'click', handler: 'onClick' }])` where `handler` is a VM method key. No `change`/`input` (layout nodes hold no value).

## Instance API
The node classes (`Div`, `Row`, `Column`, `Container`, `Section`, `CssGrid`) extend `RaptorNode`/`RaptorNodeBase` and expose only `nodeModel` plus the base lifecycle — they have almost no public surface of their own. `Div.getFirstChildNode()` returns the first child `RaptorNode`. `CssGrid` manages a `GridResizeAdapter` when `dragToResize` is set (`createResizeAdaptor`, `destroyResizeAdapter`, `handleResize`) and writes resized px tracks back into `nodeModel.rows/columns`.

Reach a node you named with `viewName`: `this.raptorDom.nodeT<Div>("myThing")`. Reaching layout nodes is rarely needed — bind state on the VM and let `update()` re-render instead.

## Patterns
- **Flex stack (vertical), no row/column:** `s.div({ flex: { dFlex: true, flexColumn: true, gap: 2 }, padding: { around: 3 } })`.
- **Header / scroll-body / footer with CSS grid:** `s.cssGrid({ rows: ['auto','1fr','auto'], columns: ['1fr'], setFullHeight: true })` then three `s.cssGridItem({ rowStart, columnStart: 1, rowEnd, columnEnd: 2 })`; give the middle item `overflow: 'auto'`.
- **Two resizable panes:** `s.cssGrid({ columns: ['1fr','1fr'], rows: ['1fr'], dragToResize: true })` with `s.cssGridItem({ ..., resizeFromEdges: ['east'] })` on the left pane only (a single shared gutter).
- **Child-view mount point:** `s.div({ controlTargetKey: "detailRegion" })` (or `childViewRenderingTarget`), then render a child view into it from the VM (see parent `raptor`).
- **Conditional region:** `s.div({ bindings: { visible: "showPanel" } })` — toggling the VM `showPanel` bool shows/hides without re-render.

## Gotchas
- `s.cssGrid` **requires** `rows` and `columns`; omitting them throws. Use `'1fr'`/`'auto'`/px strings, not numbers.
- Only `column`s may be direct children of a `row`; nesting a div directly under a row breaks Bootstrap's grid CSS. Conversely `cssGridItem` only renders correctly inside `cssGrid`.
- `gap` exists in two places: `IViewDefinition.gap` (`GapSize 1..5`, the parent flex/grid gap) and `flex.gap` (`0..5`). For a flex parent either works; prefer one consistently.
- `dragToResize` stores resized tracks as **px** back into `nodeModel.rows/columns`; on page resize the grid reapplies those px (it does not re-fluid to `fr`). Nested grids skip the parent resize cascade.
- `flex: { flex: 0 }` is ignored (the adapter treats 0 as unset); use `flexGrow: 0` to actually pin a child.
- `visible` binding (universal) toggles via CSS; for true conditional mount/unmount of a subtree use the `viewDefinition` binding or `s.view` switching instead.

## Related skills
- Parent: `raptor` (View/VM split, `RSScriptor.create`, `.contentTemplates`, `.bindings`/`.events`, `update()`, child views, control targets).
- `foreach.md` — repeating layout from an array (modern replacement for the `foreach` binding).
- `card.md`, `accordion.md`, `nav-tabs.md`, `sidebar.md` — higher-level containers built on these primitives.
- `theming.md` — background/border/text color kinds and CSS-variable theming used by these options.
- `custom-nodes.md` — when a reusable compound layout warrants a `RaptorNodeBase` of its own.

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## Layout primitives — full option reference

### Shared base (`ViewDefinitions.IViewDefinition`) — available on every layout node
Box model & spacing:
- `margin?: DisplayUtilities.ISpacing`, `padding?: DisplayUtilities.ISpacing`
- `border?: DisplayUtilities.IBorder | boolean`, `borderSubtle?: boolean`
- `background?: ColorDefinitions.BackgroundKind`, `backgroundSubtle?: boolean`, `backgroundOpacity?`, `opacity?`
- `shadow?: DisplayUtilities.ShadowClass`, `dropShadow?: IDropShadow`
- `overflow?: OverflowUtility | IOverflowBehavior` (`'visible'|'hidden'|'scroll'|'auto'|'clip'`)
- `gap?: DisplayUtilities.GapSize` (`1|2|3|4|5`)
- `aspectRatio?`, `stackType?`, `zIndex?: ZIndexUtility | number`

Sizing:
- px: `width?`, `height?`, `minWidth?`, `maxWidth?`, `maxHeight?`, `minHeight?`
- percent: `widthPercentage?`, `heightPercentage?`
- vh: `heightVH?`
- utility (`SizingValue = 25|50|75|100|'auto'`): `widthUtility?`, `heightUtility?`, `maxWidthUtility?`, `maxHeightUtility?`
- `minViewportWidth100?: boolean`, `minViewportHeight100?: boolean`
- `cssCalc?: ICssCalc`

Layout / display:
- `flex?: FlexUtilities.IFlexBehavior`
- `float?: IFLoatBehavior`, `position?: IPositionBehavior`, `display?: IDisplayBehavior`, `printDisplay?`
- `horizontalAlign?: 'left'|'right'`, `verticalAlign?: 'baseline'|'top'|'middle'|'bottom'`, `textAlignment?`
- `placement?: IPlacement`, `draggableResizable?: boolean`, `centerOnShow?`, `fitContentWidth?`, `fitContentHeight?`, `rect?` (internal)

Text (mostly relevant to `div`/`section`):
- `textColor?`, `textBgColor?`, `textOpacity?`, `textTruncate?`, `addEmphasis?`, `fontWeight?`, `fontStyle?`, `fontSize?`

Identity / behavior:
- `id?`, `testId?` (→ `data-test-id`), `metaData?` (→ data attr), `viewName?`, `customCssClasses?: string|string[]`
- `controlTargetKey?`, `childViewRenderingTarget?`
- `visible?: boolean` (static), `cursor?`, `pointerEvents?`, `selection?`, `tabIndex?`, `ariaRole?`, `ariaHidden?`, `visuallyHidden?`, `visuallyHiddenFocusable?`
- `runAutoEventWireUp?: boolean`, `runDataBinding?: boolean`, `forceNode?: boolean`
- `tooltip?: string | ITooltip` (+ `tooltipOrientation/OffsetX/OffsetY/DelayMS/Style`)
- `svgKey?`, `svgOptions?`, `svgBeforeText?`
- `actions?: IAction[]`, `viewModel?` (attach a VM to a template subtree)

### `DisplayUtilities.ISpacing` (margin / padding)
Per-side: `top/right/bottom/left` (+ `*Sm/Md/Lg/Xl/Xxl`), axis `x`/`y` (+ breakpoints), `around` (+ breakpoints) — all `SpacingValue = 0|1|2|3|4|5|'auto'`. Raw: `topPx/rightPx/bottomPx/leftPx` (number), `topREM/rightREM/bottomREM/leftREM` (number).

### `DisplayUtilities.IBorder`
`width?: 1..5`, `top?/start?/bottom?/end?: boolean`, `none?: boolean`, `rounded?: 0..5 | 'top'|'end'|'bottom'|'start'|'circle'|'pill' | boolean`, `color?: ColorDefinitions.BorderKind`.

### `FlexUtilities.IFlexBehavior` (selected; all have `Sm/Md/Lg/Xl/Xxl` variants)
- Enable: `dFlex`, `dInlineFlex`
- Direction: `flexRow`, `flexRowReverse`, `flexColumn`, `flexColumnReverse`
- Justify (main axis): `justifyContentStart|End|Center|Between|Around|Evenly`
- Align items (cross axis): `alignItemsStart|End|Center|Baseline|Stretch`
- Align self (per item): `alignSelfStart|End|Center|Baseline|Stretch`
- Align content (multi-line): `alignContentStart|End|Center|Around|Stretch`
- Wrap: `flexWrap`, `flexNowrap`, `flexWrapReverse`
- Fill/grow/shrink: `flexFill`; `flexGrow?: 0|1|boolean`; `flexShrink?: 0|1|boolean`
- `flexBasis?: string` (raw CSS), `flex?: number` (raw `flex:` shorthand, 0 ignored), `gap?: 0..5`
- Order: `orderFirst`, `orderLast`, `order0..order5`

### `ViewDefinitions.IRow`
`gutterSize?: 0|1|2|3|4|5`, `gutterType?: 'x'|'y'`, `rowColumnsXs/Sm/Md/Lg/Xl/Xxl?: ColumnSize`. bindings: `IRaptorUniversalBindings`. events: `IEvent_Row[]`.

### `ViewDefinitions.IColumn`
`ColumnSize = 1..12 | 'auto' | 'col'`; `ColumnOrder = 1..5`.
- Width: `column?`, `columnXs/Sm/Md/Lg/Xl/Xxl?`
- Order: `order?`, `orderXs/Sm/Md/Lg/Xl/Xxl?`
- Offset: `offsetXs/Sm/Md/Lg/Xl/Xxl?: ColumnSize`
- `label?: ILabel | string`
- bindings: `IRaptorUniversalBindings`; events: `IEvent_Column[]`.

### `ViewDefinitions.IContainer`
`fluid?: boolean` (true = 100% width). events: `IEvent_Container[]`. (No bindings beyond base.)

### `ViewDefinitions.ISection`
`columnSize?: ColumnSize`. bindings: `IRaptorUniversalBindings`; events: `IEvent_Section[]`.

### `ViewDefinitions.IDiv`
`title?: string`. bindings: `IRaptorUniversalBindings & IRaptorTextBinding` (adds `text`, `textColor`, `textBgColor`). events: `IEvent_Div[]`.

### `ViewDefinitions.ICssGrid`
- `rows: string[]` (required), `columns: string[]` (required) — track lists like `['auto','1fr','120px']`
- `rowGapPx?: number`, `columnGapPx?: number`
- `setFullHeight?: boolean`
- `dragToResize?: boolean`, `minResizeRowPx?: number` (default 50, `0` allows full collapse), `minResizeColumnPx?: number`
- bindings: `IRaptorUniversalBindings`; events: `IEvent_CssGrid[]`.

### `ViewDefinitions.ICssGridItem`
- `rowStart: number`, `columnStart: number`, `rowEnd: number`, `columnEnd: number` (1-based grid lines, required)
- `align?: CssGridAlign` / `justify?: CssGridJustify` — `'start'|'end'|'center'|'stretch'`
- `resizeFromEdges?: Array<'north'|'east'|'south'|'west'>` — explicit drag handles (only honored when parent `dragToResize` and ≥1 item sets it; otherwise legacy internal-edge algorithm). Prefer `east`/`south` on the upper-left pane; the mirrored `west`/`north` on the neighbor is dropped.
- bindings: `IRaptorUniversalBindings`; events: `IEvent_CssGridItem[]`.

### Universal bindings (`Bindings.IRaptorUniversalBindings`)
`visible` (two-way bool), `css { property, trueClasses, falseClasses, classes: {name: prop}, class }`, `style: StyleBinding`, `attr: IRaptorAttrBindings_Global`, `viewDefinition` (swap subtree from a VM `IViewDefinition` prop), `foreach` (deprecated v1), `prefixes: string[]`.

### Events
`IEvent` shape: `{ event, handler, param?, paramKey? }`. `handler` is a VM method key string. Layout-node events are limited to `PointerEventTypes | ContextMenuEventType | KeyboardEventTypes` (e.g. `'click'`, `'dblclick'`, `'mouseover'`, `'contextmenu'`, `'keydown'`).

### Node classes & lookup
`Div`, `Row`, `Column`, `Container`, `Section`, `CssGrid` extend `RaptorNode`/`RaptorNodeBase`. Lookup a named node: `raptorDom.nodeT<CssGrid>("viewName")`; by key: `raptorDom.nodeK(key)`. `Div.getFirstChildNode(): RaptorNode`. `CssGrid`: `createResizeAdaptor()`, `destroyResizeAdapter()`, `handleResize(rect?)`, `resizeAdapter: GridResizeAdapter`.
