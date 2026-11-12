# Raptor DataTable

The tabular data control (`s.dataTable` from `data-ui/data-table`): virtualized rows, typed columns, sort, filtering, inline editing, selection, export and map-viewport sync. It replaces the older grid control, which the SDK marks `@deprecated Use the DataTable component (s.dataTable) instead`.

## When to use

For any table or grid of records, use the `data-table` skill: it holds the rules every table follows, recipes and starters for common tasks, and references for every option, engine and type, written as ViewModel code, View options or view definition JSON. For a small fixed-layout markup table (key/value pairs, a summary) use `table.md`; for charts use `echarts`.

## Migrating older grid code

Existing extensions may still use the deprecated grid builder and its view model. Map them across like this, then build the table with the `data-table` skill:

| Older grid | DataTable |
| --- | --- |
| `fromDataSource(vm, dsName, opts)` | `dataTable.view.data.dataStoreData({ dataStore: { binding: "dataStore" }, dataSourceName })` in the View, or `dataTable.viewModel.data.dataStoreData({ dataStore: this.dataStore, dataSourceName })` with `createDataTable` in the VM |
| `fromArray(vm, rows)` / `fromApi(vm, fn)` | `dataTable.viewModel.data.arrayData({ data, getRowId })` / `asyncData({ fetchRows })` or `pagedApiCallData` |
| `displayFields: [{ name, label, width }]` | `columns: [column({ field, header, width: toPixels(n) })]` plus a `schema` |
| `defaultSort: { field, direction }` | `defaultSort: { key, direction }` |
| `viewModelFactory` row VM with `formatValue` | `transformValue`, `formatter`, or a `virtualColumn` with `contentTemplates` |
| `behaviors.enableEdit` | `editable`, or per-column `editing` |
| `behaviors.headerActions.*` / column `disableSearch` etc. | column `sort` / `resize` / `hide` / `filtering` |
| `applyFilter(name, where)` | `filtering: dataTable.view.filtering.dialogFiltering()`, or a data-store filter (`vm.setFilter`) the table respects |
| `downloadData()` | the footer toolbar's Export button (`footerToolbar({ showExport: true })`) and `onExport` |
| `syncWithViewport` | the `mapViewportSync` integration |
| `bindings: { data: "grid" }` on the old builder | `s.dataTable(dataTableOptions({ bindings: { data: "dataTableOptions" }, columns }))` |

## Related skills

- `data-table` — every option, engine, recipe and starter for the control; start there.
- Parent: `raptor` (View/VM split, RSScriptor, bindings, `update()`, data sources and `IDataStore`).
- Siblings: `data-store.md` (data sources and filters feeding `dataStoreData`), `map.md` (viewport and click wiring), `layout.md` (heights in flex layouts), `forms.md`.
- `echarts` for charting the same data.
