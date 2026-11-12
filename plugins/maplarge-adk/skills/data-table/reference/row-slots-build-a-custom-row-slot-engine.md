# Data Table - Row Slots - Build a Custom Row Slot Engine

<!-- Automatically generated, do not edit -->

## Build a Custom Row Slot Engine

Implement the `RowSlotEngine` type to take full control of slot allocation and recycling.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `computeSlotCount` | `(args: { totalRows: number }) => number` | yes | How many row DOM slots to allocate. Called when the row count changes. The return value should not exceed totalRows. |
| `computeRecycleOperations` | `(args: { firstVisibleGlobalRow: number; lastVisibleGlobalRow: number; effectiveTotalRows: number; activeRowSlotCount: number; recycleBuffer: number; globalRowIndexBySlotIndex: ReadonlyMap<RowSlotIndex, GlobalRowIndex>; slotIndexByGlobalRowIndex: ReadonlyMap<GlobalRowIndex, RowSlotIndex> }) => readonly RecycleOperation[]` | yes | Called after every scroll or data update. Return an array of { rowSlotIndex, globalRowIndex } reassignments that redirect physical slots to new logical rows. Return an empty array when no recycling is needed this pass. |
| `recyclesSlots` | `boolean` | yes | Whether this engine reassigns slots as visibility changes. virtualizedRows is true; staticRows is false. |

### Recycle Operations

Each element returned by computeRecycleOperations is a `RecycleOperation`: a pair of a physical slot index and the logical row index that slot should now display. The view engine applies these reassignments in order, rebinding cell content for each redirected slot.

RowSlotIndex and GlobalRowIndex are opaque branded number types. Use toRowSlotIndex and toGlobalRowIndex to construct them from plain numbers.

### Custom Row Slot Engine Example

Implements RowSlotEngine as a windowed engine with a configurable slot count. Eligible slots are recycled farthest-from-centre first so that rows near the scroll position stay stable as long as possible. The engine class lives in the ViewModel - Views must stay serializable, so never construct an engine in a View. Register it on createDataTable({ engines: { rowSlots: { ... } } }) and select it with dataTable.view.rowSlots.custom("name"), or pass the instance to createDataTable directly.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    createDataTable,
    dataTable,
    schema,
    toGlobalRowIndex,
    toRowSlotIndex,
} from "data-ui/data-table";
import type {
    DataTableOptions,
    GlobalRowIndex,
    RowSlotEngine,
    RowSlotIndex,
} from "data-ui/data-table";

export type Row = { id: number; name: string; category: string };

class WindowedRowSlotEngine implements RowSlotEngine {
    readonly recyclesSlots = true;

    private readonly slotCount: number;

    constructor(slotCount: number) {
        this.slotCount = slotCount;
    }

    computeSlotCount({ totalRows }: { readonly totalRows: number }): number {
        return Math.min(this.slotCount, totalRows);
    }

    computeRecycleOperations({
        firstVisibleGlobalRow,
        lastVisibleGlobalRow,
        effectiveTotalRows,
        activeRowSlotCount,
        recycleBuffer,
        globalRowIndexBySlotIndex,
        slotIndexByGlobalRowIndex,
    }: {
        readonly firstVisibleGlobalRow: number;
        readonly lastVisibleGlobalRow: number;
        readonly effectiveTotalRows: number;
        readonly activeRowSlotCount: number;
        readonly recycleBuffer: number;
        readonly globalRowIndexBySlotIndex: ReadonlyMap<RowSlotIndex, GlobalRowIndex>;
        readonly slotIndexByGlobalRowIndex: ReadonlyMap<GlobalRowIndex, RowSlotIndex>;
    }): readonly { readonly rowSlotIndex: RowSlotIndex; readonly globalRowIndex: GlobalRowIndex }[] {
        const buffer = Math.min(recycleBuffer, Math.floor(activeRowSlotCount / 4));
        const targetStart = Math.max(0, firstVisibleGlobalRow - buffer);
        const targetEnd = Math.min(effectiveTotalRows, lastVisibleGlobalRow + 1 + buffer);

        const unassigned: GlobalRowIndex[] = [];
        for (let globalRowIndex = targetStart; globalRowIndex < targetEnd; globalRowIndex++) {
            if (!slotIndexByGlobalRowIndex.has(toGlobalRowIndex(globalRowIndex))) {
                unassigned.push(toGlobalRowIndex(globalRowIndex));
            }
        }
        if (unassigned.length === 0) return [];

        const center = (firstVisibleGlobalRow + lastVisibleGlobalRow) / 2;
        const recyclable: number[] = [];
        for (let slotIndex = 0; slotIndex < activeRowSlotCount; slotIndex++) {
            const assignedGlobalRow = globalRowIndexBySlotIndex.get(toRowSlotIndex(slotIndex));
            if (assignedGlobalRow === undefined || assignedGlobalRow < targetStart || assignedGlobalRow >= targetEnd) {
                recyclable.push(slotIndex);
            }
        }

        recyclable.sort((slotIndexA, slotIndexB) => {
            const globalRowA = globalRowIndexBySlotIndex.get(toRowSlotIndex(slotIndexA)) ?? 0;
            const globalRowB = globalRowIndexBySlotIndex.get(toRowSlotIndex(slotIndexB)) ?? 0;
            return Math.abs(globalRowB - center) - Math.abs(globalRowA - center);
        });

        const operationCount = Math.min(unassigned.length, recyclable.length);
        const operations: { rowSlotIndex: RowSlotIndex; globalRowIndex: GlobalRowIndex }[] = [];
        for (let operationIndex = 0; operationIndex < operationCount; operationIndex++) {
            operations.push({
                rowSlotIndex: toRowSlotIndex(recyclable[operationIndex]),
                globalRowIndex: unassigned[operationIndex],
            });
        }
        return operations;
    }
}

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = Array.from({ length: 200 }, (_, rowIndex) => ({
            id: rowIndex + 1,
            name: "row-" + String(rowIndex + 1),
            category: ["alpha", "beta", "gamma"][rowIndex % 3],
        }));
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    category: schema.string(),
                },
            }),
            // register the engine factory by name; the View selects it via rowSlots.custom("windowed")
            engines: {
                rowSlots: {
                    windowed: (): RowSlotEngine => new WindowedRowSlotEngine(40),
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
import { dataTable, dataTableOptions, toPixels } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "category", header: "Category" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("RowSlotsDocCustomRowSlotEngineView", "Custom RowSlotEngine - engine ref");
    s.view("main", (s) => {
        s.div({ height: toPixels(280) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                columns,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                // serializable ref; the live engine comes from the ViewModel's engines registry
                rowSlots: dataTable.view.rowSlots.custom("windowed"),
                storage: dataTable.view.storage.localStore({ prefix: "doc-custom-row-slot-engine-view" }),
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
import {
    createDataTable,
    dataTable,
    schema,
    toGlobalRowIndex,
    toPixels,
    toRowSlotIndex,
} from "data-ui/data-table";
import type {
    DataTableOptions,
    GlobalRowIndex,
    RowSlotEngine,
    RowSlotIndex,
} from "data-ui/data-table";

export type Row = { id: number; name: string; category: string };

class WindowedRowSlotEngine implements RowSlotEngine {
    readonly recyclesSlots = true;

    private readonly slotCount: number;

    constructor(slotCount: number) {
        this.slotCount = slotCount;
    }

    computeSlotCount({ totalRows }: { readonly totalRows: number }): number {
        return Math.min(this.slotCount, totalRows);
    }

    computeRecycleOperations({
        firstVisibleGlobalRow,
        lastVisibleGlobalRow,
        effectiveTotalRows,
        activeRowSlotCount,
        recycleBuffer,
        globalRowIndexBySlotIndex,
        slotIndexByGlobalRowIndex,
    }: {
        readonly firstVisibleGlobalRow: number;
        readonly lastVisibleGlobalRow: number;
        readonly effectiveTotalRows: number;
        readonly activeRowSlotCount: number;
        readonly recycleBuffer: number;
        readonly globalRowIndexBySlotIndex: ReadonlyMap<RowSlotIndex, GlobalRowIndex>;
        readonly slotIndexByGlobalRowIndex: ReadonlyMap<GlobalRowIndex, RowSlotIndex>;
    }): readonly { readonly rowSlotIndex: RowSlotIndex; readonly globalRowIndex: GlobalRowIndex }[] {
        const buffer = Math.min(recycleBuffer, Math.floor(activeRowSlotCount / 4));
        const targetStart = Math.max(0, firstVisibleGlobalRow - buffer);
        const targetEnd = Math.min(effectiveTotalRows, lastVisibleGlobalRow + 1 + buffer);

        const unassigned: GlobalRowIndex[] = [];
        for (let globalRowIndex = targetStart; globalRowIndex < targetEnd; globalRowIndex++) {
            if (!slotIndexByGlobalRowIndex.has(toGlobalRowIndex(globalRowIndex))) {
                unassigned.push(toGlobalRowIndex(globalRowIndex));
            }
        }
        if (unassigned.length === 0) return [];

        const center = (firstVisibleGlobalRow + lastVisibleGlobalRow) / 2;
        const recyclable: number[] = [];
        for (let slotIndex = 0; slotIndex < activeRowSlotCount; slotIndex++) {
            const assignedGlobalRow = globalRowIndexBySlotIndex.get(toRowSlotIndex(slotIndex));
            if (assignedGlobalRow === undefined || assignedGlobalRow < targetStart || assignedGlobalRow >= targetEnd) {
                recyclable.push(slotIndex);
            }
        }

        recyclable.sort((slotIndexA, slotIndexB) => {
            const globalRowA = globalRowIndexBySlotIndex.get(toRowSlotIndex(slotIndexA)) ?? 0;
            const globalRowB = globalRowIndexBySlotIndex.get(toRowSlotIndex(slotIndexB)) ?? 0;
            return Math.abs(globalRowB - center) - Math.abs(globalRowA - center);
        });

        const operationCount = Math.min(unassigned.length, recyclable.length);
        const operations: { rowSlotIndex: RowSlotIndex; globalRowIndex: GlobalRowIndex }[] = [];
        for (let operationIndex = 0; operationIndex < operationCount; operationIndex++) {
            operations.push({
                rowSlotIndex: toRowSlotIndex(recyclable[operationIndex]),
                globalRowIndex: unassigned[operationIndex],
            });
        }
        return operations;
    }
}

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = Array.from({ length: 200 }, (_, rowIndex) => ({
            id: rowIndex + 1,
            name: "row-" + String(rowIndex + 1),
            category: ["alpha", "beta", "gamma"][rowIndex % 3],
        }));
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    category: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({ field: "category", header: "Category" }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            // the ViewModel holds the live instance; nothing engine-shaped crosses the View
            rowSlots: new WindowedRowSlotEngine(40),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-custom-row-slot-engine-binding" }),
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
import { dataTableOptions, toPixels } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("RowSlotsDocCustomRowSlotEngineBinding", "Custom RowSlotEngine - ViewModel");
    s.view("main", (s) => {
        s.div({ height: toPixels(280) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [row-slots-virtualized-rows](row-slots-virtualized-rows.md): Row Slots - Engine: virtualizedRows and more
- [types](types.md): the declarations of the types used here, `RowSlotEngine`, `RecycleOperation`; search it for a name rather than reading it whole
