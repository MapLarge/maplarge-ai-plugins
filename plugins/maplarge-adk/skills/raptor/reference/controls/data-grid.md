# Raptor DataGrid

Virtualized, sortable, filterable tabular control bound to a `DataGridViewModel` (which implements `IPagedData<any>`), driven by a live data source, paged API, or plain array.

## When to use
Show large tabular result sets with built-in column sort, per-column header-menu search/filter, column resize/pin/hide, inline edit, copy, and CSV download. Paged (`fromDataSource`/`fromApi`) grids load a page at a time as you scroll — **append-only infinite scroll**, not windowing: loaded rows stay in the DOM (see Gotchas) — so they handle large sources without fetching everything up front. For small static markup tables use the sibling `table.md`; for charts use `echarts`.

## Builder
Node `type: "dataGrid"`, builder `s.dataGrid(options)` where options is `ViewDefinitions.IDataGrid` (extends `ViewDefinitions.ITable`). The grid renders its own chrome and rows internally — you do NOT hand-author `<tr>` templates; you supply data via the `data` binding to a `DataGridViewModel`. The DGVM owns columns, formatting, and the per-row view-model factory.

```ts
// ViewModel
export class MyVm extends DynamicViewModel {
    public myGrid: DataGridViewModel;
    constructor() {
        super(...);
        this.myGrid = DataGridViewModel.fromDataSource(this, "myDataSource", {
            defaultSort: { field: "name", direction: "asc" },
            displayFields: [
                { name: "name",  label: "Name", width: "1fr" },
                { name: "count", label: "Count", width: "120px" },
            ],
        });
    }
}

// View
export function MyView(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<MyVm>();
    s.view("gridArea", s =>
        s.dataGrid({ bindings: { data: "myGrid" } })
    );
    return s.build();
}
```

Key `IDataGrid` / `ITable` option fields: `responsive`, `fixed`, `striped`, `hoverableRows`, `bordered`, `small`, `color`, `verticalAlign`. The real configuration lives on the bound `DataGridViewModel` (columns via `displayFields`, behaviors, sort) — see below.

## Bindings & events
- `bindings.data` — the only load-bearing binding; a `BindingProp` to a `DataGridViewModel` (the node's `applyBindingData()` consumes it). Passing `null` shows the no-data state; passing a non-DGVM creates an empty grid.
- Inherits `Bindings.IRaptorUniversalBindings` (`visible`, `css`, `class`, `style`, `prefixes`, etc.).
- `events` — `Events.IEvent_Table` universal element events. Row/cell interaction (click select, sort, header-menu search, resize, pin, hide, right-click copy/delete, double-click edit, arrow-key navigation) is handled internally by the `DataGrid` node, gated by `behaviors` + per-column flags — not wired through view-level events.

## ViewModel / instance API
Backing data model: `DataGridViewModel` (`import` from `index`/the controls path). Construct via the statics — do NOT `new` it directly in normal use:
- `DataGridViewModel.fromDataSource(vm, dataSourceName, opts?)` — live `IDataStore` source; auto-rewires on `vm.onDataSourceChanged`, supports `headerLoadingPropertyName` for a floating-dialog header spinner. Filters/sort go through the data store (`vm.setFilter`).
- `DataGridViewModel.fromApi(vm, retrieveDataFunc, opts?)` — paged API call (`PagedApiCall`); calls `vm.update()` when the first page resolves.
- `DataGridViewModel.fromArray(vm, data, opts?)` — static in-memory array.

`opts` is `IDataSourceDataGridViewModelOptions` / `IDataGridViewModelOptions`: `displayFields` (`IQueryDataColumnInfo[]`), `dataConfig`, `defaultSort` (`{ field, direction? }`), `viewModelFactory` (custom row VM), and (fromDataSource) `applyExternalFilter`/`getExternalFilter`/`headerLoadingPropertyName`.

Useful DGVM members: `fields` / `allFields` / `unpinnedFields` / `pinnedFields`, `size`, `dataHash`, `positionLabel`, `refreshData()`, `sort(field, dir)`, `toggleSort(field)`, `applyFilter(name, where)`, `getFilter(name)`, `pinColumn`/`unpinColumn`/`hideColumn`/`showAllColumns`, `showRowIndex`/`toggleShowRowIndex()`, `downloadData()`, `invalidateDisplayFormat()`, and the `behaviors` object (see the Reference section below).

Reach the live node when you must call `resetColumnWidths()`/`calculateColumnWidths()`/`resize()`: `raptorDom.nodeT<DataGrid>("gridViewName")`.

## Patterns
1. **Data-source grid with fixed columns.** `DataGridViewModel.fromDataSource(this, "myDataSource", { displayFields: [...] })`; widths support `auto` (content), `120px`, `25%` (of viewport), or `1fr` (share of free space). Omit `displayFields` to auto-derive every column from the source schema.
2. **Custom row view-model for computed/clickable cells.** Pass `viewModelFactory: (dgvm, data) => new MyRowVm(dgvm, data)` extending `BasicDataGridRowViewModel`; override `formatValue(name, value)` to customize a cell's `formatted` string, or `isActionAllowed(action, field)` to gate `select`/`edit`/`delete`/`copy` per row. Each row exposes `fields[name]` (`IFieldValue`: `label`/`value`/`formatted`) and `visibleCells`/`pinnedCells`/`unpinnedCells`.
3. **Header spinner inside a floating dialog.** Pass `headerLoadingPropertyName: "isGridLoading"` so the DGVM toggles that DVM boolean while loading/refreshing.

## Gotchas
- The grid does NOT render cell templates you author — children/`contentTemplates` are managed internally. Configure columns and formatting on the `DataGridViewModel`, not in the view.
- Inline edit + Delete-Row + `rowUpdated`/`deleteRow` only work when `behaviors.enableEdit` is true AND the row has a real `_ml_row_id` AND `sourceTable` resolves to a single table (only happens for `fromDataSource` grids over one table). They run raw SQL `update`/`delete`.
- `showDownloadButton` is true only when backed by a `PagedDataSource` (i.e. `fromDataSource`), not for array/API grids.
- Per-column behavior flags live on `IQueryDataColumnInfo`: `sortable:false`, `disableSearch`, `disableHiding`, `disableSelection`, `disableHeaderMenu`, plus global `behaviors.headerActions` toggles. An action is allowed only if both the column flag and the matching behavior permit it.
- Header-menu search maps by `columnType`: String→`Contains`, Int32→`Equal`, Double→`Equal`, DateTime→partial-date `Between` (falls back to `HourOfDay`). Filters are keyed `"<col>-TextSearch"` etc.; `fromDataSource` routes them through the data store.
- Column auto-resize is governed by `behaviors.autoColumnResize` (`"Never"` | `"OnQueryChange"` | `"OnSchemaChange"`, default `OnSchemaChange`). After programmatic column changes call `dataGridNode.calculateColumnWidths()`.
- **Paged rendering is append-only infinite scroll, not windowed.** Initial page ≈ 50 rows; each later page is the body-row `foreach`'s `pageSize` (default 25), fetched when the scroll viewport (`.ml-datagrid-content`, `overflow:auto`) comes within ~50px of the bottom. Loaded rows accumulate in the DOM and are not discarded. (A true windowing `VirtualItems` foreach mode exists but paged grids don't use it.)
- **No scroll-to-row / scroll-to-index API** — only `resetScroll()` (jump to top). To bring a specific row on-screen it must first be loaded into the DOM (e.g. drive `.ml-datagrid-content.scrollTop` toward the bottom to page it in), then `scrollIntoView` its `<tr>`. There is also **no key→row-index lookup**: rows are keyed by the internal `_ml_row_id`, not a business key, and a row's index is meaningful only for the current sort+filter.
- Set the infinite-scroll page size via the body-row `foreach` binding (`bindings.foreach: { property, pageSize }`, or `foreachWithConfig`). It can be read/mutated at runtime through the node's `raptorBindingMap` foreach binding (e.g. to widen it for one programmatic load, then restore).
- **`applyFilter`/sort on a `fromDataSource` grid route through the shared data source** (`vm.setFilter`), so they affect every other consumer of that source (a map on the same source will also filter). To filter the grid independently, back it with its own source — e.g. a `{{parent:asSubQuery}}` child (see `data-store.md`).
- Syncing the grid to a **map viewport** is built in only to the legacy `MLDataGrid` control (`showSyncWithViewportCheckbox` / `applySyncWithMapViewport`), not the Raptor `DataGrid` — wire map-bounds → a geo `where` yourself (see `map.md`).

## Related skills
- Parent: `raptor` (View/VM split, RSScriptor, bindings, `update()`, data sources / `IDataStore` / `setFilter` / `onDataSourceChanged`).
- Siblings: `table.md` (static markup table), `data-store.md` (data sources & filters feeding `fromDataSource`), `pagination.md`, `forms.md`.
- `echarts` for charting the same data.

---

# Raptor DataGrid — Reference

## Builder & node
- RSScriptor: `s.dataGrid(options?: ViewDefinitions.IDataGrid): IRootScriptorWithTemplates<TViewModel, ITableScriptor>`
- Node `type`: `"dataGrid"`; node class `DataGrid extends RaptorNode` (decorated `@EditorContextMenuControl("dataGrid")`).
- Option interface: `ViewDefinitions.IDataGrid<T> extends ViewDefinitions.ITable<T>` with
  `bindings?: IRaptorUniversalBindings<T> & IRaptorDataBinding<IPagedData<any>, T>`.

## IQueryDataColumnInfo (display field config)
`extends ml.data.table.IColumnMetaData` and adds:

| field | type | meaning |
|-------|------|---------|
| `name` | string | column key (required) |
| `width` | string | `auto` (content) / `100px` / `25%` (of viewport) / `1fr` (share of remaining free space) |
| `minWidth` | string | e.g. `100px` (default min 25px) |
| `pinned` | `"left"` | pin to left frozen region |
| `activeSort` | boolean | set internally by sort |
| `activeSortDirection` | `"asc"\|"desc"` | internal |
| `activeSortSvg` | string | internal (`mlsvg-caret-up`/`-down`) |
| `disableSearch` | boolean | hide header-menu Search |
| `disableHiding` | boolean | disallow Hide Column |
| `disableSelection` | boolean | cell not selectable |
| `disableHeaderMenu` | boolean | suppress entire header context menu |

Inherited from `IColumnMetaData` / `IColumnDisplayFormat`: `label`, `shortLabel`, `sortOrder`, `sortable`, `hidden`, `tags`, `unitInfo`, `columnType` (`ml.data.enums.ColumnTypes`), `displayType` (`'DateTime'|'Time'|'Date'|'TimeSpan'|'MultiLine'`), `displayFormat`, `allowedValues`, `defaultValue`.

## Options interfaces
`IDataGridViewModelOptions`:
- `displayFields?: IQueryDataColumnInfo[]` — explicit column set/order (omit = derive from schema)
- `defaultSort?: { field: string; direction?: "asc"|"desc" }`
- `viewModelFactory?: (dgvm, data) => any` — custom row VM
- `applyExternalFilter?: (name, filter) => Promise<void>`
- `getExternalFilter?: (name) => DataSourceFilter`

`IDataSourceDataGridViewModelOptions extends IDataGridViewModelOptions`:
- `dataConfig?: ml.data.table.IColumnMetaDataCollection`
- `headerLoadingPropertyName?: string` — DVM bool toggled while loading (floating-dialog header spinner)

`DataGridColumnActions = "resize" | "reorder" | "sort" | "filter" | "hide" | "pin" | "openHeaderMenu"`

## DataGridViewModel statics
- `fromDataSource(vm: DynamicViewModel, dataSourceName: string, opts?: IDataSourceDataGridViewModelOptions): DataGridViewModel`
- `fromApi(vm: RaptorViewModel, retrieveDataFunc: PagedApiFunction, opts?: IDataGridViewModelOptions): DataGridViewModel`
- `fromArray(vm: RaptorViewModel, data: any[], opts?: IDataGridViewModelOptions): DataGridViewModel`
- `getDataConfigForDataSource(ds): IColumnMetaDataCollection | null`

`fromDataSource` wires `applyExternalFilter` → `vm.setFilter(dsName, {name, filter})` and `getExternalFilter` → `vm.dataStore.getFilter(dsName, name)`, and re-derives columns + reloads (`start:0, take:50`) on `vm.onDataSourceChanged`.

## DataGridViewModel members (selected)
Getters: `fields`, `allFields`, `unpinnedFields`, `pinnedFields`, `hasPinnedFields`, `size`, `dataHash`, `positionLabel`, `noDataMessage`, `showNoDataMessage`, `showDownloadButton`, `showConfigMenu`, `availableConfigOptions`, `showRowCount`, `dataConfig`, `sourceTable`, `dataGridNode`, `viewportRange`, `updatingFromUserAction`.
State: `showRowIndex`, `hideEmptyColumns`, `syncWithViewport`.
Methods: `refreshData()`, `setPagedData(data)`, `getPagedData()`, `retrieveData(opts)`, `getFilteredSize(opts)`, `isActionAllowed(action, field)`, `pinColumn`/`unpinColumn`/`hideColumn`/`showAllColumns`, `numHideableFields()`, `sort(field, dir?)`, `toggleSort(field)`, `applyFilter(name, IQueryWhere)`, `getFilter(name)`, `rowUpdated(row, fields)`, `deleteRow(row)`, `downloadData()`, `toggleShowRowIndex()`, `toggleHideEmptyColumns()`, `toggleSyncWithViewport()`, `invalidateDisplayFormat()`, unit helpers (`fieldHasUnit`, `getAvailableUnitsForField`, `getDisplayUnitForField`, `getHeaderLabelWithUnit`, `getDataSource`).

## behaviors object (defaults)
```
behaviors = {
  config: { enablehideEmptyColumns:false, enableSyncWithViewport:false, enableShowRowNumber:true },
  headerActions: { enable:true, enableSort:true, enableFilter:true, enableHiding:true,
                   enableResize:true, enableReorder:false, enablePinning:true },
  enableDownload:true, enableEdit:false, enableSelection:true, enableCopy:true,
  enableRowCount:true, fullWidth:false,
  autoColumnResize:"OnSchemaChange",   // "Never" | "OnQueryChange" | "OnSchemaChange"
  noDataMessage:"No Data Found"
}
```
`isActionAllowed(action, field)` ANDs the behavior flag with the column flag (e.g. `sort` needs `enableSort` && `field.sortable !== false` && the column exists in paged data).

## Row view-models
`BasicDataGridRowViewModel implements IForeachAwareViewModel` (default factory). Per-data property it creates `fields[prop]: IFieldValue` = `{ label, value, formatted (getter) }` and an instance `prop` + `prop_formatted` getter. Auto `_auto_rowIndex` cell when `showRowIndex`.
- Getters: `fields`, `visibleCells`, `pinnedCells`, `unpinnedCells`, `mlRowId`, `hasMLRowId`, `foreachIndex`.
- `isActionAllowed(action: "select"|"edit"|"delete"|"copy", field)` — gates per behaviors + column flags + `_ml_row_id`/`sourceTable` for edit/delete.
- `updateValue(field, value)` → `formatValue` + `context.rowUpdated(...)`.
- `protected formatValue(field, value)` — override for custom display; default formats DateTime via user timezone/format, numerics with unit conversion + commas/short-number.
`CheckboxDataGridRowViewModel extends BasicDataGridRowViewModel` — preserves accessor (get/set) data properties (live values) instead of snapshotting; use when source rows expose getters/setters.

`IFieldValue = { readonly label; readonly value; readonly formatted }`.
Helper types: `FormattedDataGridFields<T>` (`${K}_formatted`), `AllDataGridFields<T> = T & FormattedDataGridFields<T>`.

## DataGrid node members (rarely needed)
Reach via `raptorDom.nodeT<DataGrid>("viewName")`. Public: `boundGridViewModel`, `mainTable`, `pinningSupported`, `searchInput`, `resize()`, `resetColumnWidths(recalculate=true)`, `calculateColumnWidths()`, `resolveCellHitFromMenuTarget(target)`. Handles all pointer/keyboard/context-menu interaction internally.

## Built-in header context menu (right-click a header)
Search (per `columnType`), Sort Asc/Desc, Display Unit (unit-aware columns), Pin/Unpin Column, Hide Column / Show All Columns — each gated by the corresponding `isActionAllowed`. Cell right-click: Copy / Copy Raw Value / Delete Row.

## DataSetContract (editor / config-driven placement)
`DataGridDataSetContract` registers a `DataGridTransform` named `<dataSource>_<placementKey>_dgvm` and binds `data` to it; config schema exposes one `dataSource` (`type:"DATASOURCE"`) setting. This is how editor-placed grids get their VM — code-authored views call the `fromXxx` statics directly instead.
