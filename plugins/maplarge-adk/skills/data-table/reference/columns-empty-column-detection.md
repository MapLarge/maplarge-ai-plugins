# Data Table - Columns - Empty Column Detection and more

<!-- Automatically generated, do not edit -->

## Empty Column Detection

**Empty Columns Option**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `engine` | `EmptyColumnEngine` | no | `dataEngineEmptyColumns()` | V B | Decides which columns are empty. | `dataTable.viewModel.emptyColumns.dataEngineEmptyColumns()` |
| `watch` | `boolean` | no | `false` | V B | While empty columns are hidden, re-probe on data changes, cache-only row edits, and column discovery. | `true` |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

// notes is null in every row and region is "" in every row, so both read as empty
export type Row = {
    readonly id: number;
    readonly name: string;
    readonly notes: string | null;
    readonly region: string;
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    private store: DataTableStore<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", notes: null, region: "" },
            { id: 2, name: "beta", notes: null, region: "" },
            { id: 3, name: "gamma", notes: null, region: "" },
        ];
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    notes: schema.string(),
                    region: schema.string(),
                },
            }),
        });
        this.dataTableOptions = options;
        this.store = store;
        this.update();
    }

    readonly hideEmpty = (): void => {
        this.store?.hideEmptyColumns();
    };

    // restores only what hideEmptyColumns hid; a column the user hid stays hidden
    readonly showEmpty = (): void => {
        this.store?.showEmptyColumns();
    };
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocEmptyColumnsView", "Empty Columns (View)");
    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ height: 260 }).contentTemplates((s) => {
                s.dataTable({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "id", header: "ID" }),
                        column({ field: "name", header: "Name" }),
                        column({ field: "notes", header: "Notes" }),
                        column({ field: "region", header: "Region" }),
                    ],
                    emptyColumns: {
                        watch: true,
                        engine: dataTable.view.emptyColumns.dataEngineEmptyColumns(),
                    },
                });
            });
            s.div({ flex: { dFlex: true, gap: 2 }, margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "hideEmpty" }] })
                    .contentTemplates((b) => { b.span({ text: "Hide Empty Columns" }); });
                buttons.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "showEmpty" }] })
                    .contentTemplates((b) => { b.span({ text: "Show Empty Columns" }); });
            });
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
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

// notes is null in every row and region is "" in every row, so both read as empty
export type Row = {
    readonly id: number;
    readonly name: string;
    readonly notes: string | null;
    readonly region: string;
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", notes: null, region: "" },
            { id: 2, name: "beta", notes: null, region: "" },
            { id: 3, name: "gamma", notes: null, region: "" },
        ];
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    notes: schema.string(),
                    region: schema.string(),
                },
            }),
            emptyColumns: {
                watch: true,
                engine: dataTable.viewModel.emptyColumns.dataEngineEmptyColumns(),
            },
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    readonly hideEmpty = (): void => {
        this.dataTableStore?.hideEmptyColumns();
    };

    // restores only what hideEmptyColumns hid; a column the user hid stays hidden
    readonly showEmpty = (): void => {
        this.dataTableStore?.showEmptyColumns();
    };
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocEmptyColumnsViewModel", "Empty Columns (ViewModel)");
    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ height: 260 }).contentTemplates((s) => {
                s.dataTable({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "id", header: "ID" }),
                        column({ field: "name", header: "Name" }),
                        column({ field: "notes", header: "Notes" }),
                        column({ field: "region", header: "Region" }),
                    ],
                });
            });
            s.div({ flex: { dFlex: true, gap: 2 }, margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "hideEmpty" }] })
                    .contentTemplates((b) => { b.span({ text: "Hide Empty Columns" }); });
                buttons.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "showEmpty" }] })
                    .contentTemplates((b) => { b.span({ text: "Show Empty Columns" }); });
            });
        });
    });
    return s.commitPage();
}
```

## Actions for Toggling Empty Columns

Dispatch actions.hideEmptyColumns() to hide the columns that hold no data, and actions.showEmptyColumns() to put them back.

**Empty Columns Action**:

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `actions.hideEmptyColumns` | `() => HideEmptyColumnsAction` | no | Probes the engine and hides the empty columns that are currently visible. Emits hideEmptyColumns/done with the hidden keys. | `store.dispatch(actions.hideEmptyColumns())` |
| `actions.showEmptyColumns` | `() => ShowEmptyColumnsAction` | no | Restores what hideEmptyColumns hid. A column the user hid stays hidden. | `store.dispatch(actions.showEmptyColumns())` |

## Empty Column Engines

An empty-column engine decides which columns count as empty.

**Empty Column Engine Summary**:

| Name | Description |
| --- | --- |
| `dataEngineEmptyColumns` | Default. Asks the data engine whether a column holds data anywhere in the dataset, not just in the loaded viewport. |
| `loadedRowsEmptyColumns` | Judges only the rows already in the segment cache. For data engines that cannot answer whole-dataset emptiness. |

## Engine: `dataEngineEmptyColumns`

Default. Asks the data engine about the whole dataset to see if a column is empty.

**Data Engine Empty Columns Arg**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `isEmptyValue` | `(value: unknown) => boolean` | no | `null, undefined, "" and []` | V B | Overrides which cell values count as empty. | `(value) => value === null \|\| value === "" \|\| value === 0` |
| `probeConcurrency` | `number` | no | `5` | V | Ceiling on distinct-value queries in flight, used when the data engine has no getColumnEmptiness or when isEmptyValue is set. One query is needed per field, so raise it for fast sources and lower it for rate-limited ones. A custom isEmptyValue skips getColumnEmptiness and checks each field's distinct values; an engine with no getDistinctValues then reports no empty columns. | `10` |

## Engine: `loadedRowsEmptyColumns`

Judges only the rows that have already been loaded.

**Loaded Rows Empty Columns Arg**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `isEmptyValue` | `(value: unknown) => boolean` | no | `null, undefined, "" and []` | V B | Overrides which cell values count as empty. | `(value) => value === null \|\| value === "" \|\| value === 0` |

## Related

- [columns-column-types](columns-column-types.md): Columns - Column Types and more
