# Raptor Foreach

Repeats one content template per element of a bound array (or `IPagedData`) — the universal Raptor primitive behind every dynamic list, card grid, tab strip, and option group.

## When to use

- The number of rendered elements comes from a ViewModel array/collection (cards, rows, chips, tabs, radio options, legend entries).
- You need lazy/infinite scroll for long lists, or drag-to-reorder.
- Many higher-level controls (`s.listGroup`, `s.navTabs`, `s.radioButtonGroup`, `s.table`, `s.accordion`, `s.breadcrumb`, `s.pagination`, cards) expose `.foreach(...)` themselves — same engine, same options.

## Builder

`s.foreach(prop, options?)` → returns an `IContentTemplatesScriptor`; chain `.contentTemplates(s => ...)` with **exactly one root element** (which may not itself be a `foreach`). Node `type` is `"foreach"`; view definition is `IForeachViewDefinition`, options `IForeach`.

```ts
// MyVm has: items: { value: string }[]
s.foreach(s.getTypedProp("items")).contentTemplates(s => {
    s.div({ cssClass: "row" }).contentTemplates(s =>
        s.span({ bindings: { text: s.getTypedProp("value") } }),
    );
});
```

Key `IForeach` fields (all optional):

- `mode?: IForeachMode` — `{ type: "ShowAll" }` (render every item) or `{ type: "LazyLoad", direction?, threshold?, pageSize?, scrollParentSelector? }`. **Default when omitted is LazyLoad, threshold 100, pageSize 25, Vertical.**
- `dragAndDrop?: IForeachDragAndDrop` — enables reorder (see below). Off by default.
- `noAutoBindings?: boolean` — when true the foreach syncs DOM structure but does **not** call `applyRaptorBindings()`; the caller updates cell values (used by virtualized grids).
- `viewName?: string` — names the foreach view for `update(viewName)` / instance lookup.

```ts
s.foreach(s.getTypedProp("rows"), { mode: { type: "ShowAll" } })
 .contentTemplates(s => s.card({...}).contentTemplates(...));
```

## Item scoping & reaching the parent

Inside `contentTemplates`, the scriptor type is `ForeachType<T[K], TViewModel>` = **the item type merged with the parent ViewModel**. So:

- `s.getTypedProp("value")` resolves against the **current item** first.
- Parent-VM members are still in scope (the parent data context stays on the stack), so handler/method names and other parent props resolve too.
- To dot into a nested object use `s.prefix("child").getTypedProp("field")`, or wrap a region with `s.pushDataContext("child", s => ...)`. The `prefixes` binding key does the same at the binding level.
- Binding `text`/`attr`/`if`/etc. inside the loop all evaluate per item.

## Bindings & events

`IForeachBindings` on the foreach node: `data` (the array / `IPagedData` to iterate — set automatically from the `prop` arg) and `prefixes`. All normal element bindings and `.events(...)` declared **inside** the template are wired up per cloned item; the foreach re-runs event/form wiring as rows are added during lazy scroll. Item VMs implementing `IForeachAwareViewModel` (`{ foreachIndex: number }`) get `foreachIndex` set after each update by the `ForeachAwareViewModelBehavior`.

## Reordering (drag-and-drop)

`IForeachDragAndDrop`: `itemCssClass`, `handleCssClass`, `dragAxis` (`"x"`|`"y"`, default `"y"`), `dragThreshold` (default 10), `connectWith` (CSS selector of a connected list to drag between), and `dragAndDropHandler` (name of a parent-VM method receiving `IDragAndDropHandlerArgs { indexA, indexB, fromArray?, toArray? }`).

- The `data` binding must resolve to a plain **array** (not `IPagedData`) for drag to work.
- If you supply `dragAndDropHandler`, **your method owns the array mutation**. If omitted, the behavior reorders the bound array itself (`swapItems` / `moveItemTo`) and writes it back.
- Cannot combine drag with sibling foreaches on the same parent element.

## Instance / lifecycle notes

A `Foreach` instance is created per loop. Public surface you may touch from a host control: `data` (current visible items), `visibleCount`, `boundDataSize`, `getDataFor(index)`, `update(runValidation?)`, `handleNewData(data)`, `resetVisibleCount(count?)`, `evaluateBindings(indices?)`. Behaviors (`behaviors/`) are auto-selected via each ctor's static `isNeeded(context)`: drag-and-drop, unique-attribute (rewrites `id`/`for` to `{id}-{key}-{index}`), nav-tabs, foreach-vm, radio-button-group. Reactivity is normal: mutate the array on the VM and call `this.update()` (or `update(viewName)`).

## Patterns

1. **Simple reactive list** — VM holds `myThings: T[]`; render with `s.foreach(s.getTypedProp("myThings"))`; on data change reassign the array and call `update()`.
2. **Show-all small list** — pass `{ mode: { type: "ShowAll" } }` to skip lazy-load entirely (e.g. a fixed set of filter chips / radio options).
3. **Per-item action wired to parent** — inside the template, an element's `.events({ click: "onItemClicked" })` resolves `onItemClicked` on the parent VM; pair with `IForeachAwareViewModel.foreachIndex` (or read it back from the item) to know which row fired.

## Gotchas

- **One root element** per `contentTemplates`, and it can't be a nested `foreach` directly — wrap a child region instead.
- Default mode is **LazyLoad**: only ~`threshold` (100) items render until the scroll parent scrolls. If your list lives in a non-scrolling container and looks truncated, set `mode: { type: "ShowAll" }` or a `scrollParentSelector`.
- LazyLoad needs a real scroll parent; with none, `canLazyLoad` is false and it falls back to rendering all.
- Drag-and-drop silently no-ops if `data` is `IPagedData` rather than an array.
- `noAutoBindings` means cell values won't update on their own — only use it when a host control drives value updates.
- Item templates are deep-cloned from a cached first render; don't rely on element identity across updates.
- **v1 is deprecated**: `s.foreach(prop, build => ...)`, `s.foreachWithConfig(...)`, the `Bindings.IForEachBinding` object (`mode: "Auto"|"RenderAll"|"InfiniteScroll"|"InfiniteHorizontalScroll"|"VirtualItems"`), and `enableNewForeach()` are slated for removal. Always use the `s.foreach(prop, options).contentTemplates(...)` form with `IForeach`/`IForeachMode`.

## Related skills

- `raptor` — parent skill: View/VM split, RSScriptor basics, bindings/events, `getTypedProp`/`prefix`/`pushDataContext` scoping, `update()`.
- `list-group.md`, `nav-tabs.md`, `select.md`, `table.md`, `accordion.md`, `card.md`, `carousel.md`, `pagination.md`, `breadcrumb.md` — controls that build on / expose `.foreach(...)`.
- `data-grid.md` — its row rendering is foreach-backed (`IForeachAwareViewModel`, `noAutoBindings`); see for large virtualized lists.
