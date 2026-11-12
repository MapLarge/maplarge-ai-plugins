# Data Table - Data - Engine: DataSourceDataEngine

<!-- Automatically generated, do not edit -->

## Engine: `DataSourceDataEngine`

Wraps a raw data source directly. The source is the table's own, so filters are applied per query and never reach anything else.

Like DataStoreDataEngine it loads only the rows near the viewport and reports the total row count, and a discoverable schema discovers the source's columns, leaving out geometry columns unless the source's query asks for geometry (withgeo).

**Ref Arg**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `dataSource` | `ml.data.IDataSource` | yes | - | V B | Data source instance. | `{ binding: "dataSource" }` |
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

Examples for `dataSource`:

Value (V):

```ts
dataSource: this.dataSource,
```

Binding (B):

```ts
dataSource: { binding: "dataSource" },
```

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly MUNIC_NAME: string;
    readonly Direction: string;
};

export class ViewModel extends RaptorViewModel {
    dataSource: Promise<ml.data.IDataSource> | null = null;

    public initialize(): void {
        this.dataSource = ml.data.dataSource.fromTableAsync("ml_samples/Miami_Busstops");
        this.update();
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
    s.page("DataDocDataSourceEngineView", "DataSourceDataEngine (View)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<BusStopRow>({
                data: dataTable.view.data.dataSourceData({
                    dataSource: { binding: "dataSource" },
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
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly MUNIC_NAME: string;
    readonly Direction: string;
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<BusStopRow> | null = null;

    public async initialize(): Promise<void> {
        const dataSource = await ml.data.dataSource.fromTableAsync("ml_samples/Miami_Busstops");
        const { options } = createDataTable<BusStopRow>({
            data: dataTable.viewModel.data.dataSourceData({ dataSource }),
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
    s.page("DataDocDataSourceEngineViewModel", "DataSourceDataEngine (ViewModel)");
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

- [data-data-engines](data-data-engines.md): Data - Data Engines and more
- [types](types.md): the declarations of the types used here, `IPersistenceEngine`, `DataTableSavedState`, `FilterExpression`; search it for a name rather than reading it whole
