# Data Table - Selection - Checkbox Rows and more

<!-- Automatically generated, do not edit -->

## Checkbox Rows

Enable multi-row checkbox selection by setting `checkboxRows` on `s.dataTable`. This adds a static checkbox column as the first column that cannot be resized or hidden. Use `createDataTable()` when you need the store handle for `getCheckboxRowsSelectedIndices()` or `checkboxRowsSelectAll()` - see the Store page.

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `showSelectAll` | `boolean` | no | `true` | V B | When true, renders a header checkbox that toggles select all/unselect all. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly Direction: string;
    readonly MUNIC_NAME: string;
};

export class ViewModel extends DynamicViewModel {
    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { ViewModel } from "./view-model";

type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly Direction: string;
    readonly MUNIC_NAME: string;
};

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        StopID: schema.number(),
        StopName: schema.string(),
        Direction: schema.string(),
        MUNIC_NAME: schema.string(),
    },
});
const { column } = dataTable.view.defineColumns<BusStopRow, ViewModel>();
const columns = [
    column({ field: "StopID", header: "Stop ID", width: toPixels(90), align: "right" }),
    column({ field: "StopName", header: "Stop Name", width: toPixels(220) }),
    column({ field: "Direction", header: "Direction", width: toPixels(100) }),
    column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160) }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCheckboxRows", "Checkbox Rows");
    s.view("main", (s) => {
        s.div({ height: 360 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<BusStopRow>({
                data: dataTable.view.data.dataStoreData({
                    dataStore: { binding: "dataStore" },
                    dataSourceName: "busstops",
                }),
                schema: gridSchema,
                columns,
                defaultSort: { key: "StopID", direction: "asc" },
                checkboxRows: { showSelectAll: true },
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(25) }),
                storage: dataTable.view.storage.localStore({ prefix: "doc-checkbox-rows" }),
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
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly Direction: string;
    readonly MUNIC_NAME: string;
};

const gridSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        StopID: schema.number(),
        StopName: schema.string(),
        Direction: schema.string(),
        MUNIC_NAME: schema.string(),
    },
});

const { column } = dataTable.viewModel.defineColumns<BusStopRow>();

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<BusStopRow> | null = null;
    private store: DataTableStore<BusStopRow> | null = null;

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
        const { options, store } = createDataTable<BusStopRow>({
            data: dataTable.viewModel.data.dataStoreData({
                dataStore: this.dataStore,
                dataSourceName: "busstops",
            }),
            schema: gridSchema,
            defaultSort: { key: "StopID", direction: "asc" },
            checkboxRows: { showSelectAll: true },
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(25) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-checkbox-rows-view-model" }),
            columns: [
                column({ field: "StopID", header: "Stop ID", width: toPixels(90), align: "right" }),
                column({ field: "StopName", header: "Stop Name", width: toPixels(220) }),
                column({ field: "Direction", header: "Direction", width: toPixels(100) }),
                column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160) }),
            ],
        });
        this.dataTableOptions = options;
        this.store = store;
        this.update();
    }

    // the store handle is only available from createDataTable
    public logSelected(): void {
        console.log(this.store?.getCheckboxRowsSelectedIndices());
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import type { BusStopRow, ViewModel } from "./view-model";

// schema, columns and checkboxRows all come from createDataTable
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCheckboxRowsViewModel", "Checkbox Rows (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 360 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

## Custom Selection Engine

Implement SelectionEngine to build a custom selection behavior. Implement it in the ViewModel - Views must stay serializable, so never construct an engine in a View. Register the factory by name on `createDataTable({ engines: { tableSelection: { ... } } })` and select it from the View with `dataTable.view.tableSelection.custom("name")`, or pass the instance to `tableSelection` on `createDataTable` directly.

Type `SelectionEngine`: Methods your selection engine implementation must provide. (definition under Types below).

**Selection Engine Method**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `resolveClickSelection` | `(args: { clickedCoordinates: SelectionCoordinates; currentState: SelectionState \| null }) => SelectionState` | yes | Returns the new SelectionState after a single click. |
| `resolveDblClickSelection` | `(args: { clickedCoordinates: SelectionCoordinates }) => SelectionState \| null` | no | Returns the new SelectionState after a double-click, or null to leave selection unchanged. |
| `resolveKeyNavigation` | `(args: { current: SelectionState; key: string; totalRowCount: number; activeColumnCount: number }) => SelectionState \| null` | yes | Returns the new SelectionState after an arrow key press, or null when the key does not apply or would move out of bounds. |
| `computeOverlayDescriptors` | `(args: { cell: ElementGeometry; row: ElementGeometry; selectionMode: "row" \| "cell" }) => readonly SelectionOverlayDescriptor[]` | yes | Returns overlay descriptors (absolute geometry + className) that the view engine renders as the selection highlight. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, schema, toActiveColumnIndex, toGlobalRowIndex } from "data-ui/data-table";
import type { DataTableOptions, SelectionEngine, SelectionState } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

const dotted = { styleProperties: { "border-style": "dotted" } };

const customSelectionEngine: SelectionEngine = {
    resolveClickSelection: ({ clickedCoordinates }) => ({
        coordinates: clickedCoordinates,
        selectionMode: "cell",
    }),
    resolveDblClickSelection: ({ clickedCoordinates }) => ({
        coordinates: clickedCoordinates,
        selectionMode: "row",
    }),
    resolveKeyNavigation: ({ current, key, totalRowCount, activeColumnCount }) => {
        const currentRow = current.coordinates.row as number;
        const currentColumn = current.coordinates.column as number;
        const nextCell = (row: number, column: number, selectionMode: SelectionState["selectionMode"]): SelectionState => ({
            coordinates: { row: toGlobalRowIndex(row), column: toActiveColumnIndex(column) },
            selectionMode,
        });

        if (key === "ArrowUp" && currentRow > 0) {
            return nextCell(currentRow - 1, currentColumn, current.selectionMode);
        }
        if (key === "ArrowDown" && currentRow < totalRowCount - 1) {
            return nextCell(currentRow + 1, currentColumn, current.selectionMode);
        }
        if (current.selectionMode === "cell" && key === "ArrowLeft" && currentColumn > 0) {
            return nextCell(currentRow, currentColumn - 1, "cell");
        }
        if (current.selectionMode === "cell" && key === "ArrowRight" && currentColumn < activeColumnCount - 1) {
            return nextCell(currentRow, currentColumn + 1, "cell");
        }
        return null;
    },
    computeOverlayDescriptors: ({ cell, row, selectionMode }) => {
        if (selectionMode === "row") {
            return [{
                className: "ml-dt-selection ml-dt-selection-row",
                left: row.left,
                top: row.top,
                width: row.width,
                height: row.height,
                theme: dotted,
            }];
        }
        return [
            {
                className: "ml-dt-selection ml-dt-selection-cell",
                left: cell.left,
                top: cell.top,
                width: cell.width,
                height: cell.height,
                theme: dotted,
            },
            {
                className: "ml-dt-selection ml-dt-selection-cell",
                left: cell.left + 2,
                top: cell.top + 2,
                width: Math.max(0, cell.width - 4),
                height: Math.max(0, cell.height - 4),
                theme: dotted,
            },
        ];
    },
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2 },
            { id: 2, name: "beta", qty: 5 },
            { id: 3, name: "gamma", qty: 9 },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: { id: schema.number(), name: schema.string(), qty: schema.number() },
            }),
            // register the engine factory by name; the View selects it via tableSelection.custom("dotted")
            engines: {
                tableSelection: {
                    dotted: (): SelectionEngine => customSelectionEngine,
                },
            },
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
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SelectionDocCustomEngineView", "Custom Selection Engine (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                // serializable ref; the live engine comes from the ViewModel's engines registry
                tableSelection: dataTable.view.tableSelection.custom("dotted"),
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
import { createDataTable, dataTable, schema, toActiveColumnIndex, toGlobalRowIndex } from "data-ui/data-table";
import type { DataTableOptions, SelectionEngine, SelectionState } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

const dotted = { styleProperties: { "border-style": "dotted" } };

const customSelectionEngine: SelectionEngine = {
    resolveClickSelection: ({ clickedCoordinates }) => ({
        coordinates: clickedCoordinates,
        selectionMode: "cell",
    }),
    resolveDblClickSelection: ({ clickedCoordinates }) => ({
        coordinates: clickedCoordinates,
        selectionMode: "row",
    }),
    resolveKeyNavigation: ({ current, key, totalRowCount, activeColumnCount }) => {
        const currentRow = current.coordinates.row as number;
        const currentColumn = current.coordinates.column as number;
        const nextCell = (row: number, column: number, selectionMode: SelectionState["selectionMode"]): SelectionState => ({
            coordinates: { row: toGlobalRowIndex(row), column: toActiveColumnIndex(column) },
            selectionMode,
        });

        if (key === "ArrowUp" && currentRow > 0) {
            return nextCell(currentRow - 1, currentColumn, current.selectionMode);
        }
        if (key === "ArrowDown" && currentRow < totalRowCount - 1) {
            return nextCell(currentRow + 1, currentColumn, current.selectionMode);
        }
        if (current.selectionMode === "cell" && key === "ArrowLeft" && currentColumn > 0) {
            return nextCell(currentRow, currentColumn - 1, "cell");
        }
        if (current.selectionMode === "cell" && key === "ArrowRight" && currentColumn < activeColumnCount - 1) {
            return nextCell(currentRow, currentColumn + 1, "cell");
        }
        return null;
    },
    computeOverlayDescriptors: ({ cell, row, selectionMode }) => {
        if (selectionMode === "row") {
            return [{
                className: "ml-dt-selection ml-dt-selection-row",
                left: row.left,
                top: row.top,
                width: row.width,
                height: row.height,
                theme: dotted,
            }];
        }
        return [
            {
                className: "ml-dt-selection ml-dt-selection-cell",
                left: cell.left,
                top: cell.top,
                width: cell.width,
                height: cell.height,
                theme: dotted,
            },
            {
                className: "ml-dt-selection ml-dt-selection-cell",
                left: cell.left + 2,
                top: cell.top + 2,
                width: Math.max(0, cell.width - 4),
                height: Math.max(0, cell.height - 4),
                theme: dotted,
            },
        ];
    },
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2 },
            { id: 2, name: "beta", qty: 5 },
            { id: 3, name: "gamma", qty: 9 },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: { id: schema.number(), name: schema.string(), qty: schema.number() },
            }),
            tableSelection: customSelectionEngine,
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
import { dataTable } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SelectionDocCustomEngineViewModel", "Custom Selection Engine (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [cell-selection-selection-engines](cell-selection-selection-engines.md): Selection - Selection Engines and more
- [types](types.md): the declarations of the types used here, `SelectionEngine`, `SelectionState`, `DataTableThemeStyling`; search it for a name rather than reading it whole
