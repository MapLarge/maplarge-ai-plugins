# Data Table - Data - Data Engines and more

<!-- Automatically generated, do not edit -->

The Data Table component is decoupled from fetching data through a Data Engine. Data engines handle row fetching, pagination, and routing sort and filter changes to your backend.

## Data Engines

Choose the engine that matches how your data is exposed.

**Data Engine Summary**:

| Name | Description |
| --- | --- |
| `DataStoreDataEngine` | Connects to a named data source on a shared DataStore. Supports dashboard-wide filters and optional row editing. |
| `DataSourceDataEngine` | Wraps a MapLarge data source directly when you are not using a DataStore. |
| `PagedApiCallDataEngine` | Adapts an existing PagedApiCall for offset pagination, sort, and filters. |
| `ArrayDataEngine` | In-memory rows with client-side sort and filter. Best for small, static datasets. |
| `AsyncOffsetDataEngine` | Offset pagination via your own async fetch callback (REST, GraphQL, etc.). |

Or create a custom data engine.

## Engine: `DataStoreDataEngine`

Connects to a named data source in the data store.

**Ref Arg**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `dataStore` | `IDataStore` | yes | - | V B | The shared DataStore instance. | `{ binding: "dataStore" }` |
| `dataSourceName` | `string` | yes | - | V B | Name of the data source registered with the DataStore. | `"hotels"` |
| `publishFilters` | `boolean` | no | `true` | V B | Whether the table's own filters are written into the shared DataStore, where every other component on that source picks them up. Set false to let the table filter itself without narrowing anything else on the dashboard. Constraints set by integrations are never published either way. | - |
| `respectExternalFilters` | `boolean` | no | `true` | V B | Whether filters other components set on the shared source narrow this table. Set false to make the table ignore them and re-query only for its own filters. | - |
| `geoField` | `string` | no | - | V B | Geometry column that geographic integrations filter on, such as mapViewportSync. dataStoreData and dataSourceData default to the data source's own default geometry column; pagedApiCallData has no default. Set it on pagedApiCallData before using such an integration (mapViewportSync throws without one). | `"geo"` |
| `defaultPageSize` | `number` | no | `50` | V B | Rows fetched per request when getRows is called with count: Infinity. Also the number of rows loaded when the data table first queries or re-queries after a sort or filter change. Only dataSourceData and dataStoreData pre-load this many rows on a first query or re-query. The data table itself requests rows in 50-row segments, so this does not change the count passed to fetchRows or to a PagedApiCall. | - |
| `includeRowId` | `boolean` | no | - | V B | Include row ids in results. | - |
| `defaultFields` | `readonly string[]` | no | - | V B | Default fields to request. Leave it out to request every field of the source; when set, rows hold only these fields, plus the primary key when the engine saves edits. | - |
| `stableSort` | `boolean` | no | `true` | V B | Appends the primary key as a sort tiebreaker so tied rows keep a deterministic order across re-queries. A table without a primary key gets the MapLarge row GUID instead, and an unsorted table keeps a deterministic order too. | - |
| `editable` | `boolean` | no | `true` | V B | When true (default), wires createRow, updateRow, and removeRow to MapLarge table APIs for backed data sources. Set false to omit default persistence handlers. It also wires removeRows when the table has a primary key; false saves nothing to the table. Either way the table is read-only in the UI unless the table's editable or a column's editing is set. | - |
| `createRow` | `(args: { readonly row: TRow; readonly atIndex?: GlobalRowIndex; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom row creation handler. Replaces the engine's entire default createRow pipeline when provided. When omitted and editable is true, the engine builds the payload and calls createRowImpl (defaults to ml.data.table.row.create). | - |
| `updateRow` | `(args: { readonly row: TRow; readonly changedFields: readonly (keyof TRow)[]; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom row update handler. Replaces the engine's entire default updateRow pipeline when provided. When omitted and editable is true, the engine builds the payload and calls updateRowImpl (PK mode) or updateRowByIdImpl (rowId mode). | - |
| `removeRow` | `(args: { readonly rowIndex: GlobalRowIndex; readonly row?: TRow; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom single-row delete handler. Replaces the engine's entire default removeRow pipeline when provided. When omitted and editable is true, the engine calls removeRowImpl (PK mode) or removeRowByIndexImpl (rowId mode). | - |
| `removeRows` | `(args: { readonly rowIndices: readonly GlobalRowIndex[]; readonly rows: readonly TRow[]; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom bulk-delete handler. Replaces the engine's entire default removeRows pipeline when provided. When omitted and editable is true (PK mode only), the engine issues a single removeRowImpl call with all PK values. Not available in rowId mode. | - |
| `createRowImpl` | `(data: ml.data.table.iRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | - | V B | Low-level hook for the default createRow path. Swap the underlying table API call while keeping the engine's row-to-payload mapping. Defaults to ml.data.table.row.create. | - |
| `updateRowImpl` | `(data: ml.data.table.iMultiRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | - | V B | Low-level hook for the default updateRow path when rowIdentity is primaryKey. Defaults to ml.data.table.row.editMultiRow. | - |
| `updateRowByIdImpl` | `(data: ml.data.table.iRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | - | V B | Low-level hook for the default updateRow path when rowIdentity is rowId. Defaults to a SQL update keyed on the row's MapLargeRowID. | - |
| `removeRowImpl` | `(tableName: string, query: { where: ml.data.query.IQueryWhere[][] }, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | - | V B | Low-level hook for the default removeRow/removeRows path when rowIdentity is primaryKey. Defaults to ml.data.table.row.removeByQuery. | - |
| `removeRowByIndexImpl` | `(data: ml.data.table.iRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | - | V B | Low-level hook for the default removeRow path when rowIdentity is rowId. Defaults to a SQL delete keyed on the row's MapLargeRowID. | - |
| `rowIdentity` | `"primaryKey" \| "rowId"` | no | - | V B | Controls which low-level update/remove hooks the default handlers use. primaryKey (default when a PK column exists) uses updateRowImpl/removeRowImpl. rowId uses updateRowByIdImpl/removeRowByIndexImpl for tables without a primary key. | - |
| `stringify` | `(value: unknown) => string` | no | - | V B | Injectable hash function used to detect no-op sort/filter re-queries. Defaults to ml.util.orderedStringify. | - |
| `getPrimaryKeyColumn` | `(ds: ml.data.IDataSource) => { readonly name: string } \| undefined` | no | - | V B | Injectable primary key lookup. Defaults to ml.data.dataSource.getPrimaryKeyColumn. | - |
| `queryDistinctValues` | `(ds: ml.data.IDataSource, field: string) => Promise<readonly unknown[]>` | no | - | V B | Injectable distinct-values query. Defaults to an ml.query() groupby chain. | - |

Examples for `dataStore`:

Value (V):

```ts
dataStore: this.dataStore,
```

Binding (B):

```ts
dataStore: { binding: "dataStore" },
```

This is the only engine that shares filters. By default the table publishes its filters to the shared source so every other component on it narrows too, and it narrows itself whenever another component filters that source. Turn either direction off with publishFilters and respectExternalFilters. Constraints applied by integrations stay local to the table no matter how those two are set. Default persistence handlers and store.mutations are documented on the CRUD page.

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

export type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly MUNIC_NAME: string;
    readonly Direction: string;
};

export class ViewModel extends DynamicViewModel {
    public initialize(): void {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { BusStopRow, ViewModel } from "./view-model";

const busStopSchema = dataTable.view.schema.createSchema({
    entries: {
            StopID: schema.number(),
            StopName: schema.string(),
            MUNIC_NAME: schema.string(),
            Direction: schema.string(),
        },
});

const { column } = dataTable.view.defineColumns<BusStopRow, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocDataStoreEngineView", "DataStoreDataEngine (View)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<BusStopRow>({
                data: dataTable.view.data.dataStoreData({
                    dataStore: { binding: "dataStore" },
                    dataSourceName: "busstops",
                }),
                schema: busStopSchema,
                columns: [
        column({ field: "StopID", header: "Stop ID", width: toPixels(90) }),
        column({ field: "StopName", header: "Stop Name", width: toPixels(200) }),
        column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160) }),
        column({ field: "Direction", header: "Direction", width: toPixels(110) }),
    ],
            }));
        });
    });
    return s.commitPage();
}
```

**Example: Authored in the ViewModel**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly MUNIC_NAME: string;
    readonly Direction: string;
};

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<BusStopRow> | null = null;

    public initialize(): void {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
        const { options } = createDataTable<BusStopRow>({
            data: dataTable.viewModel.data.dataStoreData({ dataStore: this.dataStore, dataSourceName: "busstops" }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
            StopID: schema.number(),
            StopName: schema.string(),
            MUNIC_NAME: schema.string(),
            Direction: schema.string(),
        },
            }),
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, toPixels } from "data-ui/data-table";
import type { BusStopRow, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<BusStopRow, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocDataStoreEngineViewModel", "DataStoreDataEngine (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
        column({ field: "StopID", header: "Stop ID", width: toPixels(90) }),
        column({ field: "StopName", header: "Stop Name", width: toPixels(200) }),
        column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160) }),
        column({ field: "Direction", header: "Direction", width: toPixels(110) }),
    ],
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [data-data-source-data-engine](data-data-source-data-engine.md): Data - Engine: DataSourceDataEngine
- [data-paged-api-call-data-engine](data-paged-api-call-data-engine.md): Data - Engine: PagedApiCallDataEngine and more
- [data-async-offset-data-engine](data-async-offset-data-engine.md): Data - Engine: AsyncOffsetDataEngine
- [data-build-a-custom-data-engine](data-build-a-custom-data-engine.md): Data - Build a Custom Data Engine
- [data-more-reference-tables](data-more-reference-tables.md): Data - More reference tables
- [types](types.md): the declarations of the types used here, `IPersistenceEngine`, `DataTableSavedState`, `FilterExpression`; search it for a name rather than reading it whole
