## Nav Tabs

A clickable tab strip (Bootstrap-style `nav`/`tabs`/`pills`/`underline`) plus optional content panes that show/hide on tab click. Use it for a header that switches between sub-views.

## When to use
- A small fixed or data-driven set of mutually exclusive views selected by a horizontal/vertical tab bar.
- Either let `navTabsContent`/`navTabPane` panes toggle automatically, OR (more common in app code) use just the tab strip as a header and swap a child-view region yourself on tab click.
- For a master/detail sidebar layout use `sidebar.md`; for collapsible stacked sections use `accordion.md`.

## Builder
The tab strip is `s.navTabs(options)` → node `type: "navTabs"` (node class `NavTabs`, view-def `ViewDefinitions.INavTabs`). Its content templates are tab items. Optional separate panes are `s.navTabsContent()` (type `"navTabsContent"`, class `NavTabsContent`) holding `s.navTabPane()` children (type `"navTabPane"`).

Key `INavTabs` option fields:
- `navKind?: NavKind` — `'nav' | 'tabs' | 'pills' | 'underline' | 'nav-links'` (default `'nav'`).
- `navFill?: boolean` — items stretch to fill width.
- `vertical?: boolean` — stack items vertically.
- `underline?: boolean` — adds underline styling to the active tab.
- `cardNavTabs?: boolean` — styling for use inside a card header.
- `navTabsContentId?: string` — id of the matching `navTabsContent` container; when set, the active pane is shown automatically.
- `textHidden?: boolean` / `iconsOnly?: boolean` — hide/disable text labels (icon-only).
- `viewName?: string` — set this to reach the node later via `nodeT`.

Tab items: `s.navTabItem(opts)` (`INavTabItem`: `text`, `active`, `svgOptions`, `activeKey`, `navLinkContentBindings`) wrapping an anchor, or the shortcut `s.navTabItemWithTextAnchor(heading, active)` which adds a `navTabItem` containing a `navLink` anchor for you.

```ts
const s = RSScriptor.create<MyVm>();
s.navTabs({ navKind: 'tabs', viewName: 'myTabs', navTabsContentId: 'myPanes' })
  .contentTemplates(t => t
    .navTabItemWithTextAnchor('Overview', true)
    .navTabItemWithTextAnchor('Details', false));
s.navTabsContent({ navTabsContentId: 'myPanes' })
  .contentTemplates(c => c
    .navTabPane({ active: true }).contentTemplates(p => p.div({ text: 'Overview pane' }))
    .navTabPane().contentTemplates(p => p.div({ text: 'Details pane' })));
```

## Bindings & events
All three nodes accept `bindings?: Bindings.IRaptorUniversalBindings` (`visible`, `css`, `style`, `attr`, `prefixes`). `navTabItem` instead uses `IRaptorNavTabItemBinding` (universal + `IRaptorSvgBinding` + `IRaptorTextBinding` — so `text` and `svg` are bindable per item).
Events: `INavTabs.events` is `IEvent_NavTabs[]`, `INavTabsContent.events` is `IEvent_NavTabsContent[]`, `INavTabPane.events` is `IEvent_NavBarPane[]`, and each `navTabItem` fires `IEvent_Anchor[]` — all accept pointer / contextmenu / keyboard `event` types with a `handler` (e.g. `{ event: 'click', handler: vm.getTypedProp('onTab') }`). Note the strip already listens for `pointerdown` internally to switch tabs, so a per-item click handler runs in addition to the built-in switch.

## ViewModel / instance API
Reach the strip with `const tabs = raptorDom.nodeT<NavTabs>("myTabs")`. Useful members:
- `setActiveTabByIndex(index: number)` — programmatically activate a tab (clears `active` on siblings, toggles the matching pane, no-op + console error if out of bounds).
- `setActiveTabPane()` — re-syncs the shown pane to the active tab (called automatically after fragment flush / foreach update).
- `getNumberOfTabs(): number`.
- `activeTabIndex` getter/setter — tracks the active index when foreach-bound.

`NavTabs` is a `RaptorNode`; it owns its own `pointerdown` + window `resize` listeners and removes them in `destroy()`.

## Patterns
- Tab-as-header + swapped region: give the strip a per-item `click` handler that sets a VM property (e.g. `_activeTab`) and calls `update("contentRegion")`, where `contentRegion` renders the chosen child view via `renderChildView`/a control target. This keeps each pane lazy and is the dominant pattern in app code (panes need not be `navTabsContent`).
- Auto panes: set the same `navTabsContentId` on the strip and the `navTabsContent`, mark one `navTabItem`/`navTabPane` `active: true`; clicking handles pane visibility for you.
- Dynamic tabs: build items with `foreach` over a VM array; set `activeKey` on each item so the engine knows which property to update on click, and read/set `activeTabIndex`.

## Gotchas
- Item-vs-pane order matters for auto panes: the Nth `navTabItem` maps to the Nth child of the `navTabsContent`; the active index is matched positionally.
- `navTabsContentId` must be unique and is matched within the strip's parent element, to avoid colliding with same-id tab content in other dialogs/regions.
- `showNavText()` only un-hides labels for `navKind: 'nav'` (and not when `iconsOnly`); `hideNavText` triggers at window width ≤ 767px.
- `setActiveTabByIndex` does nothing useful for foreach-bound strips (it early-returns the model mutations when a foreach binding is present and only re-styles the DOM); drive selection through your bound `activeKey`/`activeTabIndex` instead.

## Related skills
- Parent: `raptor` (View/VM split, RSScriptor.create, update(), child views / control targets, RaptorNodeBase).
- Siblings: `sidebar.md`, `accordion.md`, `navbar.md`, `layout.md`, `card.md` (cardNavTabs in a card header), `button.md`.
