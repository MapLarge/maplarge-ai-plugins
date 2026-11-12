# Data Table - Data - Engine: PagedApiCallDataEngine and more

<!-- Automatically generated, do not edit -->

## Engine: `PagedApiCallDataEngine`

Connects a data table to an existing PagedApiCall instance.

**Ref Arg**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `pagedApiCall` | `PagedApiCall` | yes | - | V B | PagedApiCall instance. | `{ binding: "pagedApiCall" }` |
| `defaultPageSize` | `number` | no | `50` | V B | Rows fetched per request when getRows is called with count: Infinity. Also the number of rows loaded when the data table first queries or re-queries after a sort or filter change. Only dataSourceData and dataStoreData pre-load this many rows on a first query or re-query. The data table itself requests rows in 50-row segments, so this does not change the count passed to fetchRows or to a PagedApiCall. | - |
| `filterCapabilities` | `FilterCapabilities` | no | - | V B | Allowed filter operators. The filter operators the engine applies, as { operators: [...] }; the filter dialog offers only these. Default: none for asyncData, all 18 built-in operators for pagedApiCallData. An asyncData engine without it gets filter dialogs with no condition. pagedApiCallData offers every built-in operator when it is left out; list fewer if your retrieve function cannot apply them all. | `{ operators: ["Equal", "Contains"] }` |
| `geoField` | `string` | no | - | V B | Geometry column that geographic integrations filter on, such as mapViewportSync. dataStoreData and dataSourceData default to the data source's own default geometry column; pagedApiCallData has no default. Set it on pagedApiCallData before using such an integration (mapViewportSync throws without one). | `"geo"` |
| `getDistinctValues` | `(args: { readonly field: string }) => Promise<readonly unknown[]>` | no | - | V B | Custom distinct-values lookup, used to hide empty columns. Used only when the engine has no getColumnEmptiness, to find columns that are empty across the whole dataset. The filter dialog's pick-list of values is switched off, so it feeds no filter dropdown. | - |
| `updateRow` | `(args: { readonly row: TRow; readonly changedFields: readonly (keyof TRow)[]; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Row update handler. | - |
| `removeRow` | `(args: { readonly rowIndex: GlobalRowIndex; readonly row?: TRow; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Row delete handler. | - |
| `createRow` | `(args: { readonly row: TRow; readonly atIndex?: GlobalRowIndex; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Row creation handler. | - |

Examples for `pagedApiCall`:

Value (V):

```ts
pagedApiCall: this.pagedApiCall,
```

Binding (B):

```ts
pagedApiCall: { binding: "pagedApiCall" },
```

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { PagedApiCall } from "raptor/stores/PagedData";

export type Row = { readonly id: number; readonly label: string };

const demoRows: Row[] = Array.from({ length: 40 }, (_unusedValue, index) => ({
    id: index + 1,
    label: "row-" + String(index + 1),
}));

async function fetchDemoPage(opts: { readonly start: number; readonly take: number }): Promise<{ readonly data: Row[]; readonly totalSize: number }> {
    return {
        data: demoRows.slice(opts.start, opts.start + opts.take),
        totalSize: demoRows.length,
    };
}

export class ViewModel extends RaptorViewModel {
    pagedApiCall: PagedApiCall | null = null;

    public initialize(): void {
        this.pagedApiCall = new PagedApiCall(fetchDemoPage, [{ name: "id" }, { name: "label" }]);
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rowSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        label: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocPagedApiCallEngineView", "PagedApiCallDataEngine (View)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.pagedApiCallData({
                    pagedApiCall: { binding: "pagedApiCall" },
                }),
                schema: rowSchema,
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80) }),
                    column({ field: "label", header: "Label", width: toPixels(200) }),
                ],
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
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
import { PagedApiCall } from "raptor/stores/PagedData";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly label: string };

const demoRows: Row[] = Array.from({ length: 40 }, (_unusedValue, index) => ({
    id: index + 1,
    label: "row-" + String(index + 1),
}));

async function fetchDemoPage(opts: { readonly start: number; readonly take: number }): Promise<{ readonly data: Row[]; readonly totalSize: number }> {
    return {
        data: demoRows.slice(opts.start, opts.start + opts.take),
        totalSize: demoRows.length,
    };
}

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const pagedApiCall = new PagedApiCall(fetchDemoPage, [{ name: "id" }, { name: "label" }]);
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.pagedApiCallData({ pagedApiCall }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    label: schema.string(),
                },
            }),
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
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
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocPagedApiCallEngineViewModel", "PagedApiCallDataEngine (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80) }),
                    column({ field: "label", header: "Label", width: toPixels(200) }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Engine: `ArrayDataEngine`

In-memory rows.

Sorted and filtered in the browser. The engine copies the array you pass, so adding, removing or reordering items in your array afterwards does nothing. It keeps your row objects: updateRow writes into them, while createRow (at atIndex, else at the end), removeRow and removeRows change only the engine's copy, so store.mutations work on it.

**Ref Arg**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `data` | `TRow[]` | yes | V B | Rows. | `[{ id: 1, label: "row-1" }]` |
| `getRowId` | `(row: TRow) => string \| number` | no | V B | Row id selector. updateRow finds the row to change by it, so set it on any table users edit or that updates live. Left out, updateRow matches only the identical row object, and an edit always arrives as a new object. | - |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = { readonly id: number; readonly label: string };

export class ViewModel extends RaptorViewModel {
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const demoRows: Row[] = [
    { id: 1, label: "row-1" },
    { id: 2, label: "row-2" },
    { id: 3, label: "row-3" },
];

const rowSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        label: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocArrayEngineView", "ArrayDataEngine (View)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: demoRows }),
                schema: rowSchema,
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80) }),
                    column({ field: "label", header: "Label", width: toPixels(200) }),
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

export type Row = { readonly id: number; readonly label: string };

const demoRows: Row[] = [
    { id: 1, label: "row-1" },
    { id: 2, label: "row-2" },
    { id: 3, label: "row-3" },
];

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: demoRows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    label: schema.string(),
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
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocArrayEngineViewModel", "ArrayDataEngine (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80) }),
                    column({ field: "label", header: "Label", width: toPixels(200) }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [data-data-engines](data-data-engines.md): Data - Data Engines and more
- [types](types.md): the declarations of the types used here, `FilterCapabilities`, `IPersistenceEngine`, `DataTableSavedState`, `FilterExpression`; search it for a name rather than reading it whole
