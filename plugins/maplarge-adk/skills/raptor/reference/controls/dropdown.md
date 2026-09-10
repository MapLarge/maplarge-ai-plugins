# Raptor Dropdown

A click-to-open menu: a toggle (button or anchor) plus a popup menu that is detached and rendered to `document.body` while open, then positioned next to the toggle. Backed by the `Dropdown` node (`type: "dropdown"`).

## When to use

- Action / overflow ("...") menus, option pickers, layer toggles, nested submenus.
- Multi-select dropdowns (a menu of checkboxes that stays open on click).
- NOT for a single value bound to the VM from a list of options — use `select.md` (deprecated `s.select`) or `quick-select.md` (`s.quickSelect`), which manage selected value/state for you. The dropdown is a pure menu container; you wire its items' behavior yourself.

## Builder

`s.dropdown(options).contentTemplates(s => …)` — node `type: "dropdown"`. The DSL forces `contentTemplates: []` then populates it. The renderer treats the templates specially:

- **All templates except the last** render inside the visible `.dropdown` container (the toggle, and for split buttons the action button).
- **The last template is the menu** — it is cloned, force-given the `dropdown-menu` class, prepended to `<body>` on `show()`, and positioned. So the last template is typically an `s.list` (`ul`) or `s.div`.

Mark the toggle with `dropdownToggle: true` (on `s.button` or `s.anchor`). The node finds it via the `.dropdown-toggle` (or `.dropdown-toggle-no-arrow`) class.

Key `ViewDefinitions.IDropdown` fields:

- `dropDirection?: 'down' | 'up' | 'side'` — menu opens below (default), above, or beside the toggle. `'up'` also switches the container class to `dropup`.
- `menuAlign?: 'start' | 'end'` — for down/up menus, align menu's left edge to toggle left (`start`, default) or right edge to toggle right (`end`, for right-side overflow menus).
- `split?: boolean` — split button: a separate action button + a toggle caret (adds `btn-group`).
- `onlyCloseWhenClickOutside?: boolean` — menu stays open on item clicks; only an outside click closes it.
- `isNestedDropdown?: boolean` — this dropdown lives inside another dropdown's menu (nudges position; enables nested open/close tracking).
- `positionOffsets?: { left?: number; translateX?: number }` — manual pixel nudges.

```ts
// View — generic action menu
const s = RSScriptor.create<MyVm>();
s.dropdown({ dropDirection: "down", menuAlign: "end" }).contentTemplates(s => {
  s.button({ dropdownToggle: true, text: "Actions" });
  s.list({}).contentTemplates(s => {
    s.li({ text: "Rename", events: [{ event: "click", handler: "onRename" }] });
    s.li({ text: "Delete", events: [{ event: "click", handler: "onDelete" }] });
  });
});
```

## Bindings & events

- `bindings?: Bindings.IRaptorUniversalBindings` on the dropdown container — `visible`, `css`, `style`, `attr`, `prefixes` (no value/data binding; it holds no value).
- `events?: Events.IEvent_Dropdown[]` — `PointerEventTypes | ContextMenuEventType | KeyboardEventTypes` on the container.
- Wire actual behavior on the **menu items** (`s.li` / `s.button` / `s.anchor`) via their own `events`, or use a `foreach` on the menu list to render items from a VM array.
- `ViewDefinitions.IListItem.dropdownRemainOpen?: boolean` — keep the menu open when this specific item is clicked.
- Closing is automatic on: item click (unless overridden), outside click, window resize/scroll, and any descendant nav action.

## Node / instance API

The backing class is `Dropdown` (extends `RaptorNode`, decorated `@LateBoundNode`). Reach it through the dom if you need imperative control:

```ts
const dd = raptorDom.nodeT<Dropdown>("myDropdownViewName");
dd.show();            // open + position the menu
dd.hide(true);        // close; true also tears down menu DOM
dd.ddButtonAction();  // toggle
dd.ddShowing;         // boolean — currently open
```

Useful members: `show()`, `hide(clean?)`, `ddButtonAction()`, getters `ddShowing`, `dropdownButton`, `ddMenu`, `nodeModel` (the `IDropdown`). Static helper type `DDOpenDirection = 'top'|'right'|'bottom'|'left'`. You usually never call these directly — the node self-manages open/close from pointer events.

## Patterns

**Data-driven menu (foreach):** render the last-template list from a VM array.

```ts
s.dropdown({}).contentTemplates(s => {
  s.button({ dropdownToggle: true, bindings: { text: s.getTypedProp("label") } });
  s.list({}).contentTemplates(s => {
    s.foreach(s.getTypedProp("items")).contentTemplates(s => {
      s.li({ bindings: { text: s.getTypedProp("name") },
             events: [{ event: "click", handler: "onPick" }] });
    });
  });
});
```

**Multi-select (stay open):** set `onlyCloseWhenClickOutside: true` on the dropdown, or `dropdownRemainOpen: true` per `li`; put `s.checkbox`/`s.switch` inside each item. (Items containing a visible checkbox bound via `foreach` already auto-stay-open.)

**Nested submenu:** put another `s.dropdown({ isNestedDropdown: true, dropDirection: "side" })` inside a menu `li`. The node tracks parent/child chains and closes them together.

**Split button:** `s.dropdown({ split: true })`, with a main `s.button` (the action) plus a `s.button({ dropdownToggle: true, dropdownToggleSplit: true })` caret, then the menu list.

## Gotchas

- The menu is **moved to `<body>`**, not nested in your view tree — never query it via the dropdown's own root; use `raptorDom.nodeT<Dropdown>(...).ddMenu`. CSS targeting the menu must be global, not scoped under the container.
- The **last** content template is always consumed as the menu. Don't add stray trailing templates, and don't forget a menu template (the toggle alone won't open anything).
- The toggle must carry `dropdownToggle: true` (so it gets `.dropdown-toggle`); otherwise the node falls back to the first `<button>` or the root, which may misbehave.
- Window **resize and scroll auto-close** all open dropdowns — expected; do not fight it.
- It holds no selected value — it will not reflect or persist a choice. For value semantics use `quick-select.md` / `select.md`.
- High z-index is computed against popups/ancestors on open; for a dropdown inside another popup it stacks above automatically — don't hardcode z-index.

## Related skills

- Parent: `raptor` (View/VM split, RSScriptor.create, update(), foreach, `getTypedProp`).
- `select.md`, `quick-select.md` — value-bound option pickers (use instead when you need a selected value).
- `button.md`, `list-group.md`, `navbar.md`, `nav-tabs.md` — common toggle/menu hosts and item containers.
- `foreach.md` — data-driven menu items.
- `tree.md` — a tree placed inside a menu keeps the dropdown open on item clicks.
