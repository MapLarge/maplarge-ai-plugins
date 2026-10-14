# Raptor DataTable

The tabular data control: virtualized rows, typed columns, sort, dialog filtering, inline editing, selection, CSV export, and map-viewport sync, fed by a data-store source, a paged API, or a plain array. It replaces the older grid control, which the SDK now marks `@deprecated Use the DataTable component (s.dataTable) instead`.

## When to use

Any grid of records: query results, layer attribute tables, editable admin lists, log viewers. For a small fixed-layout markup table (key/value pairs, a summary) use the sibling `table.md`; for charts use `echarts`.

## Imports and SDK versions

Everything comes from one barrel:

```ts
// View side: serializable registry refs
import {
    createViewSchema, data, dataTableOptions, defineColumns, descriptorCellEditor, filtering,
    footerEngine, integrationEngine, rowScrolling, schema, tableSelection, toPixels,
} from "data-ui/data-table";
// ViewModel side: factories that take live objects
import {
    actions, ArrayDataEngine, cellEditorContent, createDataTable, createSchema, dataStoreData,
    DataStoreDataEngine, defineVMColumns, footerToolbar, overlaySelection, templatedCellEditor,
} from "data-ui/data-table";
import type { CellEditorDef, DataTableOptions, DataTableStore } from "data-ui/data-table";
```

The API exists in two spellings:

- **Flat exports** (shown throughout this doc): `data("dataStoreData", ...)`, `filtering("dialogFiltering")`, `rowScrolling("virtualScroll", ...)`, `createViewSchema(...)`, `defineColumns<Row, VM>()`. These work on every SDK that ships the control.
- **The `dataTable` namespace** (`dataTable.view.*` / `dataTable.viewModel.*`), added to newer SDKs as a grouped alias of the same factories. Platform doc snippets use it. On an older SDK it does not exist and the import fails to compile.

Check what your SDK has before copying a snippet: Grep `.adk/types.d/MapLarge.Server.d.ts` for `declare module "data-ui/data-table` and look for `dataTable`. When in doubt, use the flat form.

## Two ways to author a table

Options live either in the **View** or in the **ViewModel**, never both for the same option.

| Author in | When | How |
| --- | --- | --- |
| View | Read-only or declarative tables; no code needs to touch the table later | `s.dataTable(dataTableOptions<Row>({ data, schema, columns, ... }))`. Every engine is a registry ref with `{ binding }` arguments; no functions, no live objects. |
| ViewModel | You need the `store` (programmatic sort, selection, mutations, refresh), custom `formatters`, or engines built from live objects | `const { options, store } = createDataTable<Row>({ ... })` in `initialize()`, assign `options` to a VM property, bind it from the View with `bindings: { data: "dataTableOptions" }`. Columns can still be authored in the View. |

Views must stay serializable: never construct an engine (`new ArrayDataEngine(...)`, `dataStoreData({ dataStore: this.dataStore })`) in a View.

## Minimal table over a data source (View-authored)

```ts
// ViewModel
export type BusStopRow = { readonly StopName: string; readonly MUNIC_NAME: string; readonly Benches: number };

export class MyVm extends DynamicViewModel {
    public initialize(): void {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
        this.update();
    }
}

// View
const busStopSchema = createViewSchema({
    entries: { StopName: schema.string(), MUNIC_NAME: schema.string(), Benches: schema.number() },
});
const { column } = defineColumns<BusStopRow, MyVm>();

export function MyView(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<MyVm>();
    s.page("MyPage", "Bus stops");
    s.view("main", s => s
        .div({ height: 400 })            // the table fills its container; give it a height
        .contentTemplates(s => s.dataTable(dataTableOptions<BusStopRow>({
            data: data("dataStoreData", { dataStore: { binding: "dataStore" }, dataSourceName: "busstops" }),
            schema: busStopSchema,
            columns: [
                column({ field: "StopName", header: "Stop Name", width: toPixels(240) }),
                column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160) }),
                column({ field: "Benches", header: "Benches", width: toPixels(100), align: "right" }),
            ],
            filtering: filtering("dialogFiltering"),
        }))));
    return s.commitPage();
}
```

`column({ field })` only accepts keys of the row type, so a renamed column is a compile error instead of a silently blank column. Declare a row type even for data-source tables.

## ViewModel-authored table with a store

```ts
export class MyVm extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<BusStopRow> | null = null;
    private store: DataTableStore<BusStopRow> | null = null;
    private engine: DataStoreDataEngine<BusStopRow> | null = null;
    private unsubscribe: (() => void) | null = null;

    public initialize(): void {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
        this.engine = dataStoreData<BusStopRow>({ dataStore: this.dataStore, dataSourceName: "busstops" });
        const { options, store } = createDataTable<BusStopRow>({
            data: this.engine,
            schema: createSchema({ entries: { StopName: schema.string(), MUNIC_NAME: schema.string(), Benches: schema.number() } }),
            tableSelection: overlaySelection({ type: "row" }),
        });
        this.dataTableOptions = options;
        this.store = store;
        this.unsubscribe = store.subscribe(actions.selectCell, ({ selection }) => {
            void this.onRowSelected(selection.coordinates.row as number);
        });
        this.update();                      // required when initialize() is async, harmless otherwise
    }

    private async onRowSelected(rowIndex: number): Promise<void> {
        const row = this.store?.getRow(rowIndex)
            ?? (await this.store?.getRowsFromDataEngine({ rowIndices: [rowIndex] }))?.[0];
        if (row) { /* e.g. zoom the map to it */ }
    }

    public destroy(): void {
        this.unsubscribe?.();
        this.engine?.dispose();            // removes the data-store subscription and published filter
    }
}

// View: columns stay here
s.dataTable(dataTableOptions<BusStopRow>({ bindings: { data: "dataTableOptions" }, columns: [ /* column(...) */ ] }));
```

`dataStoreData`, `overlaySelection`, `createSchema`, `defineVMColumns`, `footerToolbar`, and `ArrayDataEngine` are the ViewModel-side factories: they take live objects (`this.dataStore`, arrays, functions). The View-side equivalents are the registry refs (`data("dataStoreData", ...)`, `tableSelection("row")`, `footerEngine("footerToolbar", ...)`, `createViewSchema`, `defineColumns<Row, VM>()`).

## Data engines

| Source | View (registry ref) | ViewModel (factory) |
| --- | --- | --- |
| Registered data source on the VM's data store | `data("dataStoreData", { dataStore: { binding: "dataStore" }, dataSourceName })` | `dataStoreData({ dataStore: this.dataStore, dataSourceName })` |
| In-memory array | `data("arrayData", { data: { binding: "rows" } })` | `new ArrayDataEngine<Row>({ data: rows })` or pass the array directly as `data: rows` |
| Paged API call | `data("pagedApiCallData", ...)` | `pagedApiCallData(...)` |
| Async offset loader | `data("asyncData", ...)` | `asyncData(...)` |

Data-store engine behavior:

- **Filters are shared both ways by default.** `publishFilters: true` writes the table's column filters into the data store, so a map layer on the same source filters too; `respectExternalFilters: true` lets other controls' filters narrow the table. Set either to `false` to cut that direction. It is the only engine that shares filters.
- **Sort stays local** to the table; it never changes the shared source.
- Rows load in segments as you scroll (default page size 50). The default row scroller is `virtualScroll` (fixed 25px rows); it needs a known row count. Use `rowScrolling("infiniteScroll", { fixedRowHeight: toPixels(28) })` when the count is unknown or very large.

## Schema

The schema types each field, which drives the filter control and default formatting:

- `schema.string()`, `schema.number()`, `schema.date()`, `schema.datetime()`, each optionally with `{ editing: { descriptor }, filtering: { descriptor } }`.
- `createViewSchema({ entries })` in a View, `createSchema({ entries })` in a ViewModel. `createDiscoverableSchema({ entries: {} })` lets engines that support it discover columns from the source.
- Use `schema.date()` for date-only values: a datetime column shows the time component and shifts with the viewer's timezone.

## Columns

`const { column, virtualColumn } = defineColumns<Row, VM>()` (View) or `defineVMColumns<Row>()` (ViewModel, for columns passed to `createDataTable`).

Column options: `field` (data columns), `key` (required on virtual columns), `header`, `width` (`toPixels(n)`), `flex`, `minWidth`, `maxWidth`, `align`, `headerAlign`, `verticalAlign`, `sort` (default true), `resize` (default true), `hide`, `filtering`, `textWrap`, `formatter`, `formatterArgs`, `transformValue`, `editing`, `contentTemplates`, `scope`, `customCssClasses` (the cell), `customSlotCssClasses` (the content slot inside it, e.g. `"justify-content-end"`). Virtual columns sort only with an explicit `sortField`.

- **Display transforms**: `transformValue: { binding: "yesNo" }` in a View (the VM method receives `{ value }`), or an inline function in a ViewModel. Functions cannot be authored in a View.
- **Formatters**: built-ins like `formatter: "currency", formatterArgs: { currency: "EUR", locale: "de-DE" }` or `formatter: "unit"`; custom ones register through `createDataTable({ formatters: { bps: fn } })` (ViewModel only). Columns whose server metadata carries `unitInfo` convert and label units on their own.
- **Cell content**: a `virtualColumn({ key, header, contentTemplates: cell => cell.s.button({...}), scope: { deleteRow: { binding: "deleteRow" } } })` renders controls per row; wire handlers through `cell.bindingPaths.scope.<name>`.
- **Runtime changes**: `store.dispatch(actions.setColumnVisibility(...))`, `actions.setColumnWidth({ key, width: toPixels(n) })`, `actions.setColumnOrder(...)`, `actions.setColumnHeaders(...)`.

## Interaction and built-in UI

- **Selection is off by default**; clicks do nothing until you set `tableSelection("row")` / `("cell")` / `("cell-or-row")` (View) or `overlaySelection({ type })` (ViewModel). There is no row-click event: subscribe to `actions.selectCell` and read `selection.coordinates.row`. Select from code with `actions.selectCell({ selection, scrollIntoView: true })`; clear with `actions.clearSelection()`.
- **Checkbox rows**: `checkboxRows: { showSelectAll: true }`; read `store.getCheckboxRowsSelectedIndices()`, subscribe to `actions.checkboxToggleRow` / `checkboxSelectAll` / `checkboxUnselectAll`.
- **Header menu** (on by default): Filter (when a `filtering` engine is set), Sort Asc/Desc, Hide Column, Show All Columns.
- **Configurator** (right-click; on by default): Reset Table, Clear All Filters, Show All Columns, Configure Columns (visibility and order).
- **Status bar** (on by default): visible-row count.
- **Footer** (off by default): `footer: footerEngine("footerToolbar", { showExport: true, showSyncWithViewport: true, showHideEmptyColumns: true })`.
- **Export**: the footer button or `store.dispatch(actions.exportData())` opens the standard export dialog for data-source engines; pass `onExport` to handle it yourself. Array engines have no built-in export.
- **Overlays**: built-in loading, no-data, no-results-for-filters, and error states; override with `overlays` / `overlaySlots`.

## Editing and CRUD

- Mark the table `editable: { optimisticUpdate: true }`, give schema fields an `editing.descriptor` (`Text`, `Number` with `min`/`max`/`invalidMessage`, `Select`, `MultiSelect`, `Switch`, `Checkbox`, `TextArea`; `toDescriptor`/`fromDescriptor` convert stored values like `"Y"`/`"N"`), and give each editable column triggers:

```ts
const editor = descriptorCellEditor({ optimisticUpdate: true });
const editable = (ed: CellEditorDef) =>
    ({ triggers: { dblclick: { editor: ed }, enter: { editor: ed }, contextMenu: { editor: ed } } });
column({ field: "StopName", header: "Stop Name", editing: editable(editor) });
column({ field: "StopID", header: "Stop ID", editing: false });
```

- `templatedCellEditor({ contentTemplates: cellEditorContent(({ s, bindingPaths }) => ...) })` builds a custom popover editor; commit with `bindingPaths.handlers.commitEditWithValue`. It wraps live callbacks, so build it in the ViewModel and reference it from the View as `{ binding: "directionEditor" }`.
- Programmatic writes go through the store: `await store.mutations.insert({ row }).run()`, `update({ rowIndex, row, fields })`, `remove({ rowIndex })`, `removeBulk([...])`. If you write to the table yourself (`ml.data.table.row.*`), reconcile with `store.rows.applyUpdate(...)` / `applyRemove(...)` or `store.dispatch(actions.refresh())`.

## Map viewport sync

```ts
integrations: [{
    key: "mapViewportSync",
    enabled: false,                       // otherwise it starts on and silently hides off-screen rows
    engine: integrationEngine("mapViewportSync", { map: { binding: "map" } }),
}],
```

Constrains rows to the map's visible bounds and re-queries as the map moves (map to table only). The engine needs a geometry field (`geoField`). Toggle with `actions.enableIntegration` / `disableIntegration` by key, or the footer's sync checkbox. There is no built-in table-to-map zoom; do that from your `selectCell` handler.

## Gotchas

- **Give the container a height.** The table measures itself against its parent (`height: 100%`, node default 300px); a collapsed parent, such as an unsized dialog body or a flex child without a constrained ancestor, draws the header over no rows. Use a sized `div` or the flex rules in `layout.md`.
- `store.getRow(i)` returns `undefined` for rows not loaded yet; use `getRowsFromDataEngine({ rowIndices })` for those.
- `textWrap` is ignored when the row scroller sets `fixedRowHeight`. `flex` is ignored once `width` is set or the user resizes the column.
- `header` is static; it cannot follow a runtime display-unit change.
- An unresolvable `{ binding }` throws at init. Check the VM property name.
- The table does not dispose engines you build in a ViewModel: call `engine.dispose()` in `destroy()` (for the data-store engine this also removes its published filter), and unsubscribe store listeners there.
- `selection` is a reserved, deprecated option name; use `tableSelection`.
- Not supported: column pinning, double-click auto-fit, percentage or `fr` widths, automatic column resize on schema change, a row-number column for paged data, Delete-key cell clearing.

## Migrating older grid code

Existing extensions may still use the deprecated grid builder and its view model. Map them across like this, and check the unsupported list above first:

| Older grid | DataTable |
| --- | --- |
| `fromDataSource(vm, dsName, opts)` | `data("dataStoreData", ...)` in the View, or `dataStoreData(...)` + `createDataTable` in the VM |
| `fromArray(vm, rows)` / `fromApi(vm, fn)` | `ArrayDataEngine` / `pagedApiCallData` |
| `displayFields: [{ name, label, width }]` | `columns: [column({ field, header, width: toPixels(n) })]` plus a `schema` |
| `defaultSort: { field, direction }` | `defaultSort: { key, field, direction }` |
| `viewModelFactory` row VM with `formatValue` | `transformValue`, `formatter`, or a `virtualColumn` with `contentTemplates` |
| `behaviors.enableEdit` | `editable` + per-column `editing` |
| `behaviors.headerActions.*` / column `disableSearch` etc. | column `sort` / `resize` / `hide` / `filtering` |
| `applyFilter(name, where)` | `filtering("dialogFiltering")`, or a data-store filter (`vm.setFilter`) the table respects |
| `downloadData()` | `actions.exportData()` or the footer export button |
| `syncWithViewport` | the `mapViewportSync` integration |
| `bindings: { data: "grid" }` on the old builder | `s.dataTable(dataTableOptions({ bindings: { data: "dataTableOptions" }, columns }))` |

## Editor placement

The control is placeable from the visual editor: its data-set contract creates a transform named `<dataSource>_<placement>_dtvm` and binds the table to it. Code-authored views build options directly as shown above.

## Related skills

- Parent: `raptor` (View/VM split, RSScriptor, bindings, `update()`, data sources and `IDataStore`).
- Siblings: `table.md` (static markup table), `data-store.md` (data sources and filters feeding `dataStoreData`), `map.md` (viewport and click wiring), `layout.md` (heights in flex layouts), `forms.md`.
- `echarts` for charting the same data.
