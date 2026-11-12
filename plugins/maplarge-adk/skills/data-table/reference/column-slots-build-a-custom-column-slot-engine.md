# Data Table - Column Slots - Build a Custom Column Slot Engine

<!-- Automatically generated, do not edit -->

## Build a Custom Column Slot Engine

Implement the `ColumnSlotEngine` type to take full control of slot allocation and recycling. Methods your custom column slot engine must implement.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `computeSlotCount` | `(args: { activeColumnCount: number }) => number` | yes | How many column DOM slots to allocate. Called each time the table rebuilds its view model. The return value should not exceed activeColumnCount. That is on first load, and after a sort, filter or column visibility change. activeColumnCount counts all columns, hidden ones included. The pool only grows: a smaller number returned later does not remove slots. |
| `computeRecycleOperations` | `(args: { viewportStart, viewportEnd, activeColumnCount, slotCount, columnIndexBySlotIndex, slotIndexByColumnIndex }) => readonly ColumnRecycleOperation[]` | yes | Called after a horizontal scroll moves the window of columns that should be mounted. Return an array of slot-to-column reassignments that keep that window covered, or an empty array when no recycling is needed this pass. The window is the visible columns plus extraColumnBuffer; return an empty array when every column in it already has a slot. It is not called on every scroll event, nor on column visibility changes, where the table lays the slots out itself. viewportEnd is exclusive. |

### Recycle Operations

Each element returned by computeRecycleOperations is a `ColumnRecycleOperation`: a pair of a physical slot index and the active column index that slot should now display. The view engine applies these reassignments in order, rebinding cell content for each redirected slot.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `columnSlotIndex` | `ColumnSlotIndex` | yes | Which physical DOM slot to reuse. |
| `activeColumnIndex` | `number` | yes | Which logical column to show in that slot. |

```ts
// ColumnRecycleOperation = {
//   columnSlotIndex: number;   which physical DOM slot to reuse
//   activeColumnIndex: number; which logical column to show in it
// }

// example: redirect slot 2 to display active column 7
const op = {
    columnSlotIndex: 2,
    activeColumnIndex: 7,
};

// computeRecycleOperations returns an array of these
// return [] when all slots are already assigned to the right columns
```

### Custom Column Slot Engine Example

Implement the engine in the ViewModel - Views must stay serializable, so never construct an engine in a View. Register the factory by name on createDataTable({ engines: { columnSlots: { ... } } }) and select it from the View with dataTable.view.columnSlots.custom("name").

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    createDataTable,
    dataTable,
    schema,
    toColumnSlotIndex,
    toPixels,
} from "data-ui/data-table";
import type { ColumnRecycleOperation, ColumnSlotEngine, DataTableOptions } from "data-ui/data-table";

type Row = {
    id: number;
    col1: string; col2: string; col3: string; col4: string;
    col5: string; col6: string; col7: string; col8: string;
    col9: string; col10: string; col11: string;
};

// 8 DOM slots for 12 columns; 4 columns are always recycled away
class WindowedColumnSlotEngine implements ColumnSlotEngine {
    private readonly maxSlots: number;

    constructor(maxSlots: number) {
        this.maxSlots = maxSlots;
    }

    computeSlotCount({ activeColumnCount }: { readonly activeColumnCount: number }): number {
        return Math.min(this.maxSlots, activeColumnCount);
    }

    computeRecycleOperations({
        viewportStart,
        viewportEnd,
        activeColumnCount,
        slotCount,
        columnIndexBySlotIndex,
        slotIndexByColumnIndex,
    }: {
        readonly viewportStart: number;
        readonly viewportEnd: number;
        readonly activeColumnCount: number;
        readonly slotCount: number;
        readonly columnIndexBySlotIndex: ReadonlyMap<number, number>;
        readonly slotIndexByColumnIndex: ReadonlyMap<number, number>;
    }): readonly ColumnRecycleOperation[] {
        const targetEnd = Math.min(viewportEnd, activeColumnCount);

        const unassigned: number[] = [];
        for (let columnIndex = viewportStart; columnIndex < targetEnd; columnIndex++) {
            if (!slotIndexByColumnIndex.has(columnIndex)) unassigned.push(columnIndex);
        }
        if (unassigned.length === 0) return [];

        const center = (viewportStart + targetEnd) / 2;
        const recyclable: number[] = [];
        for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
            const columnIndex = columnIndexBySlotIndex.get(slotIndex);
            if (columnIndex === undefined || columnIndex < viewportStart || columnIndex >= targetEnd) {
                recyclable.push(slotIndex);
            }
        }

        recyclable.sort((slotA, slotB) => {
            const columnA = columnIndexBySlotIndex.get(slotA) ?? 0;
            const columnB = columnIndexBySlotIndex.get(slotB) ?? 0;
            return Math.abs(columnB - center) - Math.abs(columnA - center);
        });

        const operationCount = Math.min(unassigned.length, recyclable.length);
        const operations: ColumnRecycleOperation[] = [];
        for (let operationIndex = 0; operationIndex < operationCount; operationIndex++) {
            operations.push({
                // columnSlotIndex is an opaque type; convert from the raw slot number
                columnSlotIndex: toColumnSlotIndex(recyclable[operationIndex]),
                activeColumnIndex: unassigned[operationIndex],
            });
        }
        return operations;
    }
}

const rows: Row[] = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    col1: "r" + String(index + 1) + "-c1",
    col2: "r" + String(index + 1) + "-c2",
    col3: "r" + String(index + 1) + "-c3",
    col4: "r" + String(index + 1) + "-c4",
    col5: "r" + String(index + 1) + "-c5",
    col6: "r" + String(index + 1) + "-c6",
    col7: "r" + String(index + 1) + "-c7",
    col8: "r" + String(index + 1) + "-c8",
    col9: "r" + String(index + 1) + "-c9",
    col10: "r" + String(index + 1) + "-c10",
    col11: "r" + String(index + 1) + "-c11",
}));

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    col1: schema.string(),
                    col2: schema.string(),
                    col3: schema.string(),
                    col4: schema.string(),
                    col5: schema.string(),
                    col6: schema.string(),
                    col7: schema.string(),
                    col8: schema.string(),
                    col9: schema.string(),
                    col10: schema.string(),
                    col11: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "col1", header: "Col 1" }),
                column({ field: "col2", header: "Col 2" }),
                column({ field: "col3", header: "Col 3" }),
                column({ field: "col4", header: "Col 4" }),
                column({ field: "col5", header: "Col 5" }),
                column({ field: "col6", header: "Col 6" }),
                column({ field: "col7", header: "Col 7" }),
                column({ field: "col8", header: "Col 8" }),
                column({ field: "col9", header: "Col 9" }),
                column({ field: "col10", header: "Col 10" }),
                column({ field: "col11", header: "Col 11" }),
            ],
            // register the engine factory by name; the View selects it via columnSlots.custom("windowed")
            engines: {
                columnSlots: {
                    windowed: (): ColumnSlotEngine => new WindowedColumnSlotEngine(8),
                },
            },
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            extraColumnBuffer: 0,
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-col-slot-custom-binding" }),
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

import type { ViewModel } from "./view-model";

type Row = {
    id: number;
    col1: string; col2: string; col3: string; col4: string;
    col5: string; col6: string; col7: string; col8: string;
    col9: string; col10: string; col11: string;
};

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnSlotsDocCustomColumnSlotEngine", "Custom ColumnSlotEngine - engine ref");
    s.view("main", (s) => {
        s.div({ height: 280 }).contentTemplates((s) => {
            s.dataTable(
                dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    // serializable ref; the live engine comes from the ViewModel's engines registry
                    columnSlots: dataTable.view.columnSlots.custom("windowed"),
                }),
            );
        });
    });
    return s.commitPage();
}
```

## Related

- [column-slots-column-slot-engines](column-slots-column-slot-engines.md): Column Slots - Column Slot Engines and more
- [types](types.md): the declarations of the types used here, `ColumnSlotEngine`, `ColumnRecycleOperation`; search it for a name rather than reading it whole
