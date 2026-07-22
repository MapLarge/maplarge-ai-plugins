## Table (plain semantic table)

Static, structural HTML `<table>` built declaratively from RSScriptor. It is *not* the DataGrid — there is no built-in sorting, paging, virtualization, or data source. Use it for fixed layouts you populate yourself (key/value pairs, small summaries, `foreach`-driven row lists). The rendered node is a thin `Table extends RaptorNode` that just wraps `ViewDefinitions.ITable`; all behavior is in the view definition.

## When to use
- A small/medium static or `foreach`-driven table where you control every cell.
- Bootstrap-styled tables (striped/bordered/hover/responsive/compact) with semantic `<thead>/<tbody>/<tfoot>`.
- Key/value or summary panels.
- Reach for **data-grid.md** instead when you need column sorting, paging, selection, virtualization, or binding to an `IPagedData`/data source.

## Builder
The container method is `s.table(options?: ViewDefinitions.ITable)` → node `type: "table"`. Children are added inside `.contentTemplates(...)`. Sub-builders and their node types:

| Builder | Node type | Option interface | Notes |
|---|---|---|---|
| `s.tableHead(opts?)` | `tableHead` (`<thead>`) | `ITableHead` | `groupDivider` |
| `s.tableBody(opts?)` | `tableBody` (`<tbody>`) | `ITableBody` | `groupDivider` |
| `s.tableFooter(opts?)` | `tableFooter` (`<tfoot>`) | `ITableFooter` | extends `ITextControl`; `groupDivider` |
| `s.tr(opts?)` | `tr` (`<tr>`) | `ITR` | `active`, `backgroundColor`, `color`, `verticalAlign` |
| `s.th(opts?)` | `th` (`<th>`) | `ITH` | `text`, `scope: 'Column'\|'Row'`, `color`, `colSpan` |
| `s.td(opts?)` | `td` (`<td>`) | `ITD` | extends `ITextControl`; `active`, `colSpan`, `color`, `verticalAlign` |
| `s.boundTd(field)` | `td` | — | shorthand for a `<td>` with `bindings.text = field` |

Key `ITable` flags: `striped`, `stripedColumns`, `bordered`, `borderless`, `hoverableRows`, `small`, `dark`, `fixed` (sets `table-layout: fixed`), `responsive` (`true \| 'sm'\|'md'\|'lg'\|'xl'\|'xxl'` — wraps in `.table-responsive*`), `color: ColorDefinitions.TableKind`, `borderColor: ColorDefinitions.BorderKind`, `verticalAlign`, `caption`, `captionTop`.

`ColorDefinitions.TableKind` = `'primary'|'secondary'|'success'|'danger'|'warning'|'info'|'light'|'dark'` (used on `table`/`tr`/`th`/`td` color).

Minimal example (typed via `RSScriptor.create<MyVm>()`):
```ts
s.table({ striped: true, hoverableRows: true, small: true })
 .contentTemplates(s => {
   s.tableHead().contentTemplates(s =>
     s.tr().contentTemplates(s => {
       s.th({ text: "Name", scope: "Column" });
       s.th({ text: "Value", scope: "Column" });
     }));
   s.tableBody().contentTemplates(s =>
     // one <tr> per item in vm.rows (item shape { name, value })
     s.foreach(s.getTypedProp("rows"), s =>
       s.tr().contentTemplates(s => {
         s.boundTd("name");
         s.boundTd("value");
       })));
 });
```

`th`/`td` render their `text` (or `bindings.text`) only when they have no child `contentTemplates`; otherwise the children win, so you can put any controls (button, badge, icon, link) inside a cell via `.contentTemplates(...)`.

## Bindings & events
- All seven elements accept `Bindings.IRaptorUniversalBindings` (e.g. `cssClass`, `style`, `visible`, `attr`, `disable`). `th` and `td` additionally accept `IRaptorTextBinding` → the `text` binding key (what `boundTd` sets).
- Events per element are `Events.IEvent_Table` / `_TableHead` / `_TableBody` / `_TableFooter` / `_Tr` / `_Th` / `_Td`. Every one accepts the same `event` set: pointer events (e.g. `click`), `contextmenu`, and keyboard events. Wire row/cell clicks via `.events([{ event: "click", handler: "onRowClick" }])` on the `tr`/`td`.
- For dynamic rows, drive the `<tbody>` with `foreach`/`foreachWithConfig` over a `TypedProp` array; the inner scriptor is data-context-scoped to the element type so `boundTd("field")` and `s.getTypedProp("field")` resolve against the item.

## Instance API
The `Table` node has only `nodeModel: ITable`; it holds no view state of its own — state lives in your ViewModel and re-renders via `update()` / `update(viewName)`. There is no dedicated table ViewModel to reach. If you must touch the node, register the `view('name', ...)` and use `raptorDom.nodeT<Table>("name")`, but for a static table this is rarely needed — mutate the backing VM array/properties and call `update()`.

## Patterns
1. **Key/value panel**: a single `tableBody` whose rows are literal `tr` with one `th({scope:'Row', text:'Label'})` and one `boundTd('field')`.
2. **foreach row list**: `tableBody().contentTemplates(s => s.foreach(prop, s => s.tr()...))`; toggle row emphasis with `tr({ active: true })` or `tr({ color: 'warning' })` bound off the item.
3. **Scrollable wide table**: set `responsive: true` (or a breakpoint) so the renderer wraps the `<table>` in an `overflow-x` container; combine with `fixed: true` for stable column widths.

## Gotchas
- Not a grid. No sort/page/filter/selection comes for free; if you find yourself building those, switch to **data-grid.md**.
- `responsive` changes the returned root element to a wrapping `<div>` — account for that if you query/style by the table element directly.
- Cells show `text` only when empty of children; adding `contentTemplates` to a `td`/`th` suppresses its `text`/`text`-binding.
- `striped`+`stripedColumns` are mutually exclusive in effect (Bootstrap); pick one.
- Color enums are limited: `TableKind` has **no** `'white'` (unlike `BorderKind`).

## TablePicker (related node)
For "let the user choose a stored table", use the `tablePicker` node (`@RegisterNode key: 'tablePicker'`), configured by `ITablePickerOptions` and backed by `TablePickerViewModel`. Builder: `s.tablePicker(options: ITablePickerOptions)`. Two-way selection binds via `bindings.value` (a `account/name` string); `bindings.disable` disables it. Useful options: `placeholder`, `accountCodeFilter`, `requirements: ml.data.ISchemaRequirements`, `allowNew`, `showFilters`, `enableSorting`, `clearable`, `displayMode: 'standard'|'compact'`, `isRemote`/`remoteEndpointId`, `size`. The VM exposes `selectedTable`, `selectedTableItem`, `setRemoteMode()`, `setRequirements()`, `setOnSelectionChanged()`, `refreshTables()`, `clearSelection()`. See the Reference section below.

## Related skills
- **raptor** — parent skill: View/VM split, RSScriptor.create, `getTypedProp`, `update()`, `foreach`, bindings/events basics.
- **data-grid.md** — the interactive, sortable, paged grid; use it instead for real data tables.
- **foreach.md** — driving `<tbody>` rows from a VM array.
- **list-group.md**, **card.md** — alternative layouts for non-tabular records.
- **select.md**, **dropdown.md** — simpler pickers when you don't need the full TablePicker.

---

## ITable option fields (node type "table")
| Field | Type | Effect |
|---|---|---|
| `responsive` | `boolean \| 'sm'\|'md'\|'lg'\|'xl'\|'xxl'` | Wraps table in `.table-responsive[-bp]`; returned root becomes a `<div>` |
| `fixed` | `boolean` | `table-layout: fixed` |
| `striped` | `boolean` | `.table-striped` (alternating rows) |
| `stripedColumns` | `boolean` | alternating columns instead of rows |
| `dark` | `boolean` | dark bg / light text |
| `hoverableRows` | `boolean` | row hover effect |
| `bordered` | `boolean` | borders on all cells |
| `borderless` | `boolean` | remove all borders |
| `small` | `boolean` | `.table-sm` (compact padding/font) |
| `color` | `ColorDefinitions.TableKind` | background variant |
| `borderColor` | `ColorDefinitions.BorderKind` | border variant |
| `verticalAlign` | `DisplayUtilities.VerticalAlign` | `'top'\|'middle'\|'bottom'` |
| `caption` | `string` | `<caption>` text |
| `captionTop` | `boolean` | caption above table |
| `bindings` | `IRaptorUniversalBindings` | universal |
| `events` | `IEvent_Table[]` | pointer/contextmenu/keyboard |

## Section / row / cell fields
- `ITableHead` / `ITableBody` / `ITableFooter`: `groupDivider?: boolean` (`.table-group-divider`). `ITableFooter` also extends `ITextControl` (so `text`, `textAlignment`, etc.).
- `ITR`: `active?`, `backgroundColor?: string`, `color?: TableKind`, `verticalAlign?`.
- `ITH`: `text?`, `scope?: 'Column'|'Row'`, `color?: TableKind`, `colSpan?: number`; bindings include `IRaptorTextBinding` (`text`).
- `ITD`: extends `ITextControl` (`text`, `textAlignment`, `italic`, `textWrap`, …) plus `active?`, `colSpan?`, `color?: TableKind`, `verticalAlign?`; bindings include `IRaptorTextBinding` (`text`).

## Scriptor surface (RSScriptorInterfaces)
- `ITableScriptor`: `tableHead()`, `tableBody()`, `tableFooter()`, `contentTemplates()`, `foreach()`, `foreachWithConfig()`, `pushDataContext()`.
- `ITableContentScriptor` (inside head/body/footer): `tr()`, plus `foreach`/`pushDataContext`.
- `ITableRowScriptorTemplates` → `contentTemplates()` to enter row cells.
- `ITableRowScriptor` (inside a `tr`): `th()`, `td()`, `boundTd(field)`, `contentTemplates()`, `foreach()`, `pushDataContext()`.
- `boundTd` overloads: `boundTd<T,K>(field: TypedProp<T,K>)` and `boundTd<K extends keyof TViewModel>(field: K | '$data')`. Impl: `this.td({ bindings: { text: field } })`.

## Events (all table elements)
`event` accepts: `PointerEventTypes` (click/pointer*), `ContextMenuEventType` (`contextmenu`), and `KeyboardEventTypes`. Interfaces: `IEvent_Table`, `IEvent_TableHead`, `IEvent_TableBody`, `IEvent_TableFooter`, `IEvent_Tr`, `IEvent_Th`, `IEvent_Td`.

## Color enums (ColorDefinitions)
- `TableKind = primary | secondary | success | danger | warning | info | light | dark`
- `BorderKind = primary | secondary | success | danger | warning | info | light | dark | white`

## Render behavior notes (Renderer.ts)
- `table()` registers the `Table` node, creates `<table class="table">`, prepends `<caption>` if `caption`, applies display utilities, then appends `contentTemplates`; if `responsive`, wraps in a `.table-responsive[-bp]` div and returns the wrapper.
- `th()`/`td()`: render child views if present, else `handleText(el, def)` (so `text`/text-binding only applies with no children).
- `tr()`/`td()`/`th()`/`tableFooter()` apply their `bindings` after children.

---

## TablePicker (node type "tablePicker")
Registration: `@RegisterNode({ key: 'tablePicker', svgKey: 'mlsvg-datagrid-outline', viewModel: TablePickerViewModel, hasEditorSupport: true })`. Builder: `s.tablePicker(options: ITablePickerOptions)`.

### ITablePickerOptions
`label?`, `placeholder?`, `accountCodeFilter?`, `requirements?: ml.data.ISchemaRequirements`, `allowNew?`, `hideImport?`, `showFilters?`, `enableSorting?`, `clearable?`, `displayMode?: 'standard'|'compact'`, `isRemote?`, `remoteEndpointId?`, `size?: DisplayUtilities.InputSize`, `minPopupWidth?: number`.
- `bindings`: `IRaptorUniversalBindings & { value?: string; disable?: string }` — `value` is the selected `account/name` (two-way).
- `events`: `Events.IEvent_Input[]`.

### TablePickerViewModel (extends RaptorViewModel)
Types: `TableTypes = 'Table'|'Query'|'View'|'External'`; `SortOption = 'name-asc'|'name-desc'|'records-asc'|'records-desc'|'modified-asc'|'modified-desc'`; `GeoTypes = 'Point'|'Line'|'Polygon'|'None'`; row shape `ITableItem` (`value`, `label`, `account`, `name`, `types`, `geoType`, `tableType`, `records`, `lastModified`, `hasDateTime`, `tags`, `columnTags`).

State / getters: `selectedTable: string|null` (setter fires callback + `update()`), `selectedTableItem: ITableItem|null`, `allTables`, `filteredTables` (computed+cached), `accounts`, `tableCount`, `mode`/`isExistingMode`/`isNewMode`, `newTableName`, `filterText`, `selectedAccount`, `selectedGeoTypes`, `selectedTableTypes`, `sortOption`, `showFiltersPanel`, `isLoading`, `errorMessage`/`hasError`.

Methods: `initialize()`, `destroy()`, `setRemoteMode(isRemote, endpointId?)`, `setRequirements(req|null)` (reloads), `setOnSelectionChanged(cb)`, `setModeExisting()`/`setModeNew()`, `refreshTables()`, `applyFilters()`, `toggleFiltersPanel()`, `toggleGeoTypeFilter(geo)`, `toggleTableTypeFilter(type)`, `clearFilters()`, `clearSelection()`, `handleTableSelect(item|string|null)`, `setExternalValue(value)`.

Data sources: local via `ml.servercache.FetchStoredTables` (+ `subscribeToTableCacheChange`); remote via `ml.remotetablecache.FetchRemoteStoredTables`.

Reach the VM (when given a `view` name): `raptorDom.nodeT<TablePicker>("name")` then its `._vm`, or prefer driving it through the `value`/`requirements` config and `setOnSelectionChanged` callback rather than poking internals.
