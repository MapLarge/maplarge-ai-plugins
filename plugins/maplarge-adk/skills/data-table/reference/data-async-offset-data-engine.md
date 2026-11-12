# Data Table - Data - Engine: AsyncOffsetDataEngine

<!-- Automatically generated, do not edit -->

## Engine: `AsyncOffsetDataEngine`

Generic async implementation.

You supply fetchRows. The sample's fetchRows ignores sort and filter, so its columns turn both off; to keep them, apply sort and filter inside fetchRows and list filterCapabilities.

**Ref Arg**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `fetchRows` | `(args: AsyncOffsetFetchRowsArgs<TFilterOps>) => Promise<{ readonly rows: TRow[]; readonly totalSize: number; }>` | yes | - | V B | Returns rows and totalSize for start/count. | `async ({ start, count }) => ({ rows, totalSize, })` |
| `defaultPageSize` | `number` | no | `50` | V B | Rows fetched per request when getRows is called with count: Infinity. Also the number of rows loaded when the data table first queries or re-queries after a sort or filter change. Only dataSourceData and dataStoreData pre-load this many rows on a first query or re-query. The data table itself requests rows in 50-row segments, so this does not change the count passed to fetchRows or to a PagedApiCall. | - |
| `filterCapabilities` | `FilterCapabilities` | no | - | V B | Allowed filter operators. The filter operators the engine applies, as { operators: [...] }; the filter dialog offers only these. Default: none for asyncData, all 18 built-in operators for pagedApiCallData. An asyncData engine without it gets filter dialogs with no condition. pagedApiCallData offers every built-in operator when it is left out; list fewer if your retrieve function cannot apply them all. | `{ operators: ["Equal", "Contains"] }` |
| `getDistinctValues` | `(args: { readonly field: string }) => Promise<readonly unknown[]>` | no | - | V B | Custom distinct-values lookup, used to hide empty columns. Used only when the engine has no getColumnEmptiness, to find columns that are empty across the whole dataset. The filter dialog's pick-list of values is switched off, so it feeds no filter dropdown. | - |
| `updateRow` | `(args: { readonly row: TRow; readonly changedFields: readonly (keyof TRow)[]; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Row update handler. | - |
| `removeRow` | `(args: { readonly rowIndex: GlobalRowIndex; readonly row?: TRow; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Row delete handler. | - |
| `createRow` | `(args: { readonly row: TRow; readonly atIndex?: GlobalRowIndex; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Row creation handler. | - |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = { readonly id: number; readonly label: string };

const allRows: Row[] = Array.from({ length: 40 }, (_unusedValue, index) => ({
    id: index + 1,
    label: "row-" + String(index + 1),
}));

// fetchRows is a function, so it cannot live in the View definition;
// the View references it with { binding: "fetchRows" }
export class ViewModel extends RaptorViewModel {
    async fetchRows({ start, count }: { readonly start: number; readonly count: number }): Promise<{
        readonly rows: Row[];
        readonly totalSize: number;
    }> {
        return {
            rows: allRows.slice(start, start + count),
            totalSize: allRows.length,
        };
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
    s.page("DataDocAsyncOffsetEngineView", "AsyncOffsetDataEngine (View)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.asyncData({
                    fetchRows: { binding: "fetchRows" },
                }),
                schema: rowSchema,
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80), sort: false, filtering: false }),
                    column({ field: "label", header: "Label", width: toPixels(200), sort: false, filtering: false }),
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
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly label: string };

const allRows: Row[] = Array.from({ length: 40 }, (_unusedValue, index) => ({
    id: index + 1,
    label: "row-" + String(index + 1),
}));

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.asyncData({
                fetchRows: async ({ start, count }) => ({
                    rows: allRows.slice(start, start + count),
                    totalSize: allRows.length,
                }),
            }),
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
    s.page("DataDocAsyncOffsetEngineViewModel", "AsyncOffsetDataEngine (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80), sort: false, filtering: false }),
                    column({ field: "label", header: "Label", width: toPixels(200), sort: false, filtering: false }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [data-data-engines](data-data-engines.md): Data - Data Engines and more
- [types](types.md): the declarations of the types used here, `AsyncOffsetFetchRowsArgs`, `FilterExpression`, `SortState`, `FilterCapabilities`, `IPersistenceEngine`, `DataTableSavedState`; search it for a name rather than reading it whole
