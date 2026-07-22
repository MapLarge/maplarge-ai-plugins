# Raptor List Group & Lists

Vertical lists of repeated items: the styled `listGroup` card and plain `list` (ul/ol). Almost always paired with `foreach` to render one item per data row.

## When to use
- A clickable/selectable stack of rows (a "list group" card) — use `s.listGroup`.
- A plain semantic bulleted/numbered list, or nav/tab/dropdown menu styling — use `s.list`.
- Term/description pairs — `s.descriptionList` (see Related).
- For data tables with columns/sorting, use `s.dataGrid` instead (data-grid.md).

## Builder

### Styled list group — `s.listGroup`
`s.listGroup(options: ViewDefinitions.IListGroup)` emits node `type: "listGroup"` and returns `IListGroupScriptor`, whose children are:
- `.listGroupItem(options: ViewDefinitions.IListGroupItem)` — node `type: "listGroupItem"`.
- `.button(options: ViewDefinitions.IButton)` — a button styled as a list-group item with hover state.
- `.contentTemplates(s => ...)` and `.foreach(...)` for repeated items.

`IListGroup` fields: `flush?` (borderless), `numbered?` (auto-numbering), `bindings?` (universal), `events?: IEvent_ListGroup[]`.
`IListGroupItem` fields: `text?`, `listGroupItemBgColor?: ColorDefinitions.ListGroupItemKind`, `bindings?` (universal + text), `events?: IEvent_ListGroupItem[]`.

```ts
const s = RSScriptor.create<MyVm>();
s.listGroup({ flush: true })
 .contentTemplates(s =>
    s.foreach(s.getTypedProp("items"), s =>
        s.listGroupItem({
            bindings: { text: s.getTypedProp("label") },
            events: [{ event: "click", handler: "onItemClick" }],
        })
    )
 );
```

### Plain list — `s.list`
`s.list(options: ViewDefinitions.IList)` emits node `type: "list"` and returns `IListScriptor`, whose children are `.li(...)` / `.listItem(...)` (both node `type: "listItem"`, `li` is an alias).

`IList` fields: `ordered?` (ol vs ul), `listStyleType?: ListStyleType`, `navbarList?`, `navTabs?`, `navFill?`, `navPills?`, `dropdownMenu?`, `events?: IEvent_List[]`.
`IListItem` fields (extends `ITextControl`): `text?`, `navItem?`, `listStyleType?`, `dropdownRemainOpen?`, `counterIncrement?`, `bindings?` (universal + text), `events?: IEvent_ListItem[]`.

```ts
s.list({ ordered: false, listStyleType: "disc" })
 .contentTemplates(s =>
    s.foreach(s.getTypedProp("rows"), s =>
        s.listItem({ bindings: { text: s.getTypedProp("name") } })
    )
 );
```

## Bindings & events
- Item text: bind `text` (an `IRaptorTextBinding`, also exposes `textColor` / `textBgColor` / tooltip). Static text via the `text` option.
- Universal bindings on group and items: `visible`, `css`, `prefixes`, etc.
- Events on all four node types (`IEvent_ListGroup`, `IEvent_ListGroupItem`, `IEvent_List`, `IEvent_ListItem`) accept `event` of pointer (`click`, etc.), context-menu, or keyboard types; `handler` names a VM method. The data context inside a `foreach` item is the row item, so the handler receives that row.

## ViewModel / instance API
A `listGroup` node materializes as the `ListGroup extends RaptorNode` class. Reach it from the VM with `this.raptorDom.nodeT<ListGroup>("viewName")` (import `ListGroup` from `raptor/raptorDom/controls/ListGroup/ListGroup`). Useful methods:
- `getVisibleViewModels(): any[]` — the data-context object for each currently-rendered item (respects foreach virtualization/filtering). Cast to your row type.
- `getVisibleListItems(): HTMLElement[]` — inherited from `RaptorNode`; the live `<li>` elements.

`list` / `listItem` are plain DOM nodes with no dedicated control class.

## Patterns
- Bound row list: `s.listGroup` + `.contentTemplates(s => s.foreach(prop, s => s.listGroupItem({ bindings: { text }, events: [...] })))`. Mutate the backing array in the VM and call `update("viewName")` to re-render.
- Colored status rows: set `listGroupItemBgColor` to a `ListGroupItemKind` (`"success"` / `"danger"` / `"warning"` / `"info"` / ...) per item.
- Numbered list: `s.listGroup({ numbered: true })`, or `s.list({ ordered: true, listStyleType: "decimal" })`.
- Nav/tab/dropdown menus: `s.list({ navPills: true })` / `{ navTabs: true }` / `{ dropdownMenu: true }` with `navItem: true` on items (see nav-tabs.md, navbar.md, dropdown.md).

## Gotchas
- Repeated items belong inside `.contentTemplates(...)`; the foreach v1 `.foreach(prop, build)` / `.foreachWithConfig` overloads are deprecated (CORD-45597) — use the content-templates `s.foreach` form (foreach.md).
- `getVisibleViewModels()` only returns rendered rows; off-screen/filtered rows are excluded.
- `listGroupItemBgColor` only accepts the eight `ListGroupItemKind` variants (validated); arbitrary CSS colors go through `bindings.textBgColor` or `css`.
- `s.list` produces raw `ul`/`ol`/`li`; use `s.listGroup` for the carded, clickable, theme-styled look.

## Related skills
- Parent: `raptor` (View/VM split, RSScriptor, foreach/contentTemplates, update()).
- `foreach.md` — the repeating-content pattern these lists rely on.
- `nav-tabs.md`, `navbar.md`, `dropdown.md` — list styling variants (navTabs/navPills/dropdownMenu).
- `data-grid.md` — when columns/sorting are needed; `tree.md` — hierarchical/expandable lists; `card.md`, `button.md` — common item content.

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## Enums

`ColorDefinitions.ListGroupItemKind` (item background variants): `primary` | `secondary` | `success` | `danger` | `warning` | `info` | `light` | `dark`.

`ViewDefinitions.ListStyleType` (for `list` / `listItem` `listStyleType`): `disc` | `circle` | `square` | `decimal` | `decimal-leading-zero` | `lower-roman` | `upper-roman` | `lower-greek` | `lower-alpha` | `upper-alpha` | `none`.

## Option tables

### IListGroup (node type "listGroup")
| field | type | notes |
|---|---|---|
| flush | boolean | borderless, no outer padding |
| numbered | boolean | auto-number items |
| bindings | IRaptorUniversalBindings | visible/css/prefixes/... |
| events | IEvent_ListGroup[] | pointer / contextmenu / keyboard |

### IListGroupItem (node type "listGroupItem")
| field | type | notes |
|---|---|---|
| text | string | static item text |
| listGroupItemBgColor | ListGroupItemKind | colored row variant |
| bindings | universal + IRaptorTextBinding | `text`, `textColor`, `textBgColor`, tooltip + universal |
| events | IEvent_ListGroupItem[] | pointer / contextmenu / keyboard |

### IList (node type "list")
| field | type | notes |
|---|---|---|
| ordered | boolean | ol (true) vs ul (false) |
| listStyleType | ListStyleType | bullet/number style |
| navbarList | boolean | navbar styling |
| navTabs | boolean | tab styling |
| navFill | boolean | tabs stretch to fill width |
| navPills | boolean | pill styling |
| dropdownMenu | boolean | dropdown menu below a dropdown button |
| events | IEvent_List[] | pointer / contextmenu / keyboard |

### IListItem (node type "listItem"; extends ITextControl)
| field | type | notes |
|---|---|---|
| text | string | static text (via ITextControl) |
| navItem | boolean | nav-item styling |
| listStyleType | ListStyleType | per-item bullet/number style |
| dropdownRemainOpen | boolean | keep dropdown open on click |
| counterIncrement | string | CSS counter-increment (e.g. 'step-counter') |
| bindings | universal + IRaptorTextBinding | text/textColor/textBgColor + universal |
| events | IEvent_ListItem[] | pointer / contextmenu / keyboard |

## Builder return chains
- `IRootScriptor.listGroup(...)` -> `IRootScriptorWithTemplates<TViewModel, IListGroupScriptor<TViewModel>>`.
  - `IListGroupScriptor`: `.listGroupItem(IListGroupItem)`, `.button(IButton)`, `.contentTemplates(...)`, `.foreach(...)`.
- `IRootScriptor.list(...)` -> `IRootScriptorWithTemplates<TViewModel, IListScriptor<TViewModel>>`.
  - `IListScriptor`: `.li(IListItem)`, `.listItem(IListItem)`, `.contentTemplates(...)`, `.foreach(...)`.
- `IRootScriptor.descriptionList(...)` -> `IDescriptionListScriptor` with `.descriptionListItem(IDescriptionListItem)` (`dtColumn`, `ddColumn`, `dtTextOptions`, `ddTextOptions`).

## ListGroup node class (public surface)
`class ListGroup extends RaptorNode`:
- `nodeModel: ViewDefinitions.IListGroup` (get/set, backed by `_nodeModel`).
- `getVisibleViewModels(): any[]` — per-rendered-item data context (foreach-aware).
- `getVisibleListItems(): HTMLElement[]` — inherited from `RaptorNode`.

Retrieve: `const lg = this.raptorDom.nodeT<ListGroup>("myListView"); const rows = lg.getVisibleViewModels() as MyRow[];`
