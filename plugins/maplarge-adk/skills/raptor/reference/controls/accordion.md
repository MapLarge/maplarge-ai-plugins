# Raptor Accordion

Collapsible, stacked content sections. Built from an outer `accordion` containing one or more `accordionItem`s, each with an `accordionItemHeader` (the clickable bar) and an `accordionItemBody` (the collapsing region).

## When to use

- Grouping content into expand/collapse panels (filter groups, settings sections, FAQ-style lists).
- A "only one open at a time" panel set — use `singleOpen`.
- A borderless, flush look inside a tight sidebar/card — use `accordionFlush`.
- Driving open/closed state reactively from a ViewModel boolean — bind `collapsed`.

For a non-stacked single dock/expand at a viewport edge, that is the separate `dockablePanel` node, not the accordion.

## Builder

`s.accordion(options?)` (node `type: "accordion"`) returns a templates scriptor; nest items inside `.contentTemplates(...)`. Items are `s.accordionItem(options?)` (`type: "accordionItem"`), and each item nests `s.accordionItemHeader()` (`type: "accordionItemHeader"`) and `s.accordionItemBody()` (`type: "accordionItemBody"`).

Key option fields:

- `IAccordion`: `singleOpen?: boolean` (only one item open; opening one closes the others), `accordionFlush?: boolean` (removes outer borders/rounded corners).
- `IAccordionItem`: `headerText?: string` (label shown in the header bar), `collapsed?: boolean` (initial state — `true` = closed, `false`/omit = open), `headerBorder?: DisplayUtilities.IBorder`, `headerBorderSubtle?: boolean`.
- `IAccordionItemHeader` / `IAccordionItemBody`: thin text-control wrappers; supports `text` binding and arbitrary nested content via their `contentTemplates`.

```ts
const s = RSScriptor.create<MyVm>();
s.view("myAccordion", s =>
  s.accordion({ singleOpen: true }).contentTemplates(s =>
    s.accordionItem({ headerText: "Section A" }).contentTemplates(s =>
      s.accordionItemBody().contentTemplates(s =>
        s.div({ text: "Body A content" })
      )
    )
    .accordionItem({ headerText: "Section B", collapsed: true }).contentTemplates(s =>
      s.accordionItemBody().contentTemplates(s => s.div({ text: "Body B content" }))
    )
  )
);
```

`headerText` is a shortcut; for rich/custom header content nest an `accordionItemHeader().contentTemplates(...)` instead and omit `headerText`.

## Bindings & events

- `accordionItem.bindings.collapsed` — two-way `BindingProp<T, boolean>`. Setting the bound VM property to `true` collapses the item, `false` expands it; user clicks write the new value back. This is the supported reactive path.
- Header/body accept `IRaptorTextBinding` (`text`, plus universal bindings: `visible`, `class`, tooltip, etc.) and `IRaptorUniversalBindings` on every node.
- Events: `IEvent_Accordion`, `IEvent_AccordionItem`, `IEvent_AccordionItemHeader`, `IEvent_AccordionItemBody` accept pointer / contextmenu / keyboard event types (no generic `change` event). Toggle is handled internally on header click, so you rarely wire events directly — bind `collapsed` instead.
- The accordion fires native Bootstrap-style DOM events on the collapsing panel during animation: `show.bs.collapse`, `shown.bs.collapse`, `hide.bs.collapse`, `hidden.bs.collapse` (bubbling, cancelable). Listen on the `.accordion-collapse` element if you need animation hooks.

## ViewModel / instance API

Two node classes back the markup:

- `Accordion` (outer, `@LateBoundNode`): `openItemByEl(el)`, `closeItemByEl(el)`, `openItemByControlTarget(key)`, `closeItemByControlTarget(key)` (async), and static `Accordion.isAccordionItemOpen(el)`.
- `AccordionItem` (per item): `toggleCollapsed()` flips state and writes back the `collapsed` binding; `handleCollapsedBinding(collapsed, el)` is the `@BindingHandler('collapsed')` that delegates open/close to the parent `Accordion`.

Reach an instance via the DOM or by view name:

```ts
const item = this.raptorDom.nodeT<AccordionItem>("myAccordion");
item?.toggleCollapsed();
// or, from an element inside the item:
const node = this.raptorDom.nodeByElement(accordionItemEl) as AccordionItem;
```

Prefer mutating the bound `collapsed` VM property + `update()` over calling these methods directly.

## Patterns

- **Single-open filter groups.** `s.accordion({ singleOpen: true, accordionFlush: true })` with one `accordionItem` per group; bind each item's `collapsed` to a VM flag so you can persist which group is open in serialized state.
- **Programmatic open from elsewhere.** Drop a `controlTarget` inside an item body, then call `nodeT<Accordion>(...).openItemByControlTarget("myTarget")` to expand it (e.g. to reveal the section holding an invalid field).
- **Custom header.** Omit `headerText`; nest `accordionItemHeader().contentTemplates(s => s.div(...).span(...))` for icons/badges alongside the title.

## Gotchas

- Clicks on interactive children inside the header (selects, nested buttons, anything matching the interactive-target check) do NOT toggle the item — by design, so embedded controls stay usable. A plain header label toggles normally.
- `collapsed: true` means closed. It is easy to invert; the default (omitted/`false`) renders expanded.
- `singleOpen` only closes siblings within the same `.accordion` root — nested accordions are independent.
- Toggling is animated (height transition) and guarded by a per-panel transition lock; rapid repeat calls during the animation are ignored. Await the `open*/close*` methods if you depend on completion.
- `Accordion` is late-bound: the node is instantiated when its element is inserted, so freshly injected accordion markup wires up on insertion rather than at parse time.
- Header and body are text-control wrappers — set the label via `headerText` or the `text` binding, not by assuming a child paragraph exists.

## Related skills

- `raptor` (parent) — View/VM split, RSScriptor.create, `.contentTemplates`, bindings/events, `update()`, `nodeT`/`nodeByElement`, control targets.
- `layout.md`, `card.md`, `sidebar.md` — common containers an accordion sits inside.
- `foreach.md` — render a dynamic list of `accordionItem`s from a VM array.
- `forms.md`, `select.md` — controls frequently placed inside accordion bodies (note the interactive-child click rule).
