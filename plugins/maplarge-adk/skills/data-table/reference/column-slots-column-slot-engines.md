# Data Table - Column Slots - Column Slot Engines and more

<!-- Automatically generated, do not edit -->

The Column Slot Engine controls how column DOM elements are allocated as the user scrolls horizontally. For most tables, the default staticColumns is the right choice. Switch to virtualizedColumns only when column count is large enough that keeping all columns in the DOM hurts performance.

## Column Slot Engines

Choose how column DOM slots are allocated and recycled as the user scrolls horizontally.

**Column Slot Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `staticColumns` | One permanent DOM slot per column. No recycling overhead. Default. | Pass `columnSlots: dataTable.view.columnSlots.staticColumns()` on `s.dataTable(dataTableOptions<TRow>({... }))` (or omit for the default). |
| `virtualizedColumns` | Maintains a bounded slot pool and recycles slots as the viewport moves. Use for wide tables with many columns. | Pass `columnSlots: dataTable.view.columnSlots.virtualizedColumns({... })` on `s.dataTable(dataTableOptions<TRow>({... }))`. |

## Engine: `staticColumns`

Allocates one permanent DOM element per active column. Every column is always in the DOM.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export class ViewModel extends RaptorViewModel {
    public initialize(): void {
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    dataTable,
    dataTableOptions,
    schema,
} from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = { id: number; name: string; category: string; qty: number; price: number };

const categories = ["alpha", "beta", "gamma", "delta"] as const;
const rows: Row[] = Array.from({ length: 500 }, (_, index) => ({
    id: index + 1,
    name: "item-" + String(index + 1),
    category: categories[index % categories.length],
    qty: (index * 7 + 3) % 100,
    price: (index * 13 + 5) % 500,
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        category: schema.string(),
        qty: schema.number(),
        price: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "category", header: "Category" }),
    column({ field: "qty", header: "Qty" }),
    column({ field: "price", header: "Price" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnSlotsDocStaticColumnsView", "staticColumns - 500 rows, 5 columns");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(
                dataTableOptions<Row>({
                    data: dataTable.view.data.arrayData({ data: rows }),
                    schema: gridSchema,
                    columns,
                    rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                    columnSlots: dataTable.view.columnSlots.staticColumns(),
                    storage: dataTable.view.storage.localStore({ prefix: "doc-static-columns-view" }),
                }),
            );
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
    toPixels,
} from "data-ui/data-table";
import type { ColumnSlotEngine, DataTableOptions } from "data-ui/data-table";

type Row = { id: number; name: string; category: string; qty: number; price: number };

const categories = ["alpha", "beta", "gamma", "delta"] as const;
const rows: Row[] = Array.from({ length: 500 }, (_, index) => ({
    id: index + 1,
    name: "item-" + String(index + 1),
    category: categories[index % categories.length],
    qty: (index * 7 + 3) % 100,
    price: (index * 13 + 5) % 500,
}));

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    columnSlotEngine(): ColumnSlotEngine {
        return dataTable.viewModel.columnSlots.staticColumns();
    }

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    category: schema.string(),
                    qty: schema.number(),
                    price: schema.number(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({ field: "category", header: "Category" }),
                column({ field: "qty", header: "Qty" }),
                column({ field: "price", header: "Price" }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-static-columns-binding" }),
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
import { dataTableOptions } from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = { id: number; name: string; category: string; qty: number; price: number };

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnSlotsDocStaticColumnsBinding", "staticColumns - binding arm");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(
                dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    columnSlots: { binding: "columnSlotEngine" },
                }),
            );
        });
    });
    return s.commitPage();
}
```

## Engine: `virtualizedColumns`

Allocates up to a fixed number of column DOM slots and recycles them as the user scrolls horizontally. For example, a table with 200 columns can stay under 20 DOM column elements, reassigning them as the horizontal viewport moves. Use this when column count is large enough that keeping all columns in the DOM is a concern.

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `maxColumnCount` | `number` | no | `20` | V B | Maximum number of column DOM slots to maintain in the pool. |

### Extra Column Buffer

virtualizedColumns renders the columns in the visible horizontal range plus a buffer on each side. extraColumnBuffer (default 5) sets how many columns that buffer holds. Those extra columns are already in the DOM, so a small horizontal scroll does not cause any re-rendering. Increase this if users frequently scroll by small amounts and column content is expensive to render; decrease it to keep fewer off-screen columns bound.

It does not change the number of DOM slots, which is maxColumnCount. extraColumnBuffer is capped at half of the slots left after the visible columns, so with a small maxColumnCount the effective buffer is smaller.

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `extraColumnBuffer` | `number` | no | V B | Extends the horizontal slot window by N active columns on each side of the viewport. Pass on s.dataTable. |

Examples for `extraColumnBuffer`:

Value (V):

```ts
extraColumnBuffer: 4,
```

Binding (B):

```ts
// View
extraColumnBuffer: { binding: "extraColumnBuffer" },

// ViewModel
extraColumnBuffer(): number {
    return 4;
}
```

**Example: Authored in the View**:

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    dataTable,
    dataTableOptions,
    schema,
} from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = {
    id: number;
    col1: string; col2: string; col3: string; col4: string;
    col5: string; col6: string; col7: string; col8: string;
    col9: string; col10: string; col11: string; col12: string;
};

const rows: Row[] = Array.from({ length: 500 }, (_, index) => ({
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
    col12: "r" + String(index + 1) + "-c12",
}));

const gridSchema = dataTable.view.schema.createSchema({
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
        col12: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
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
    column({ field: "col12", header: "Col 12" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnSlotsDocVirtualizedColumnsView", "virtualizedColumns - 500 rows, 13 columns, 8 slots");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(
                dataTableOptions<Row>({
                    data: dataTable.view.data.arrayData({ data: rows }),
                    schema: gridSchema,
                    columns,
                    rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                    columnSlots: dataTable.view.columnSlots.virtualizedColumns({ maxColumnCount: 8 }),
                    storage: dataTable.view.storage.localStore({ prefix: "doc-virtualized-columns-view" }),
                }),
            );
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
    toPixels,
} from "data-ui/data-table";
import type { ColumnSlotEngine, DataTableOptions } from "data-ui/data-table";

type Row = {
    id: number;
    col1: string; col2: string; col3: string; col4: string;
    col5: string; col6: string; col7: string; col8: string;
    col9: string; col10: string; col11: string; col12: string;
};

const rows: Row[] = Array.from({ length: 500 }, (_, index) => ({
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
    col12: "r" + String(index + 1) + "-c12",
}));

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    columnSlotEngine(): ColumnSlotEngine {
        return dataTable.viewModel.columnSlots.virtualizedColumns({ maxColumnCount: 8 });
    }

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
                    col12: schema.string(),
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
                column({ field: "col12", header: "Col 12" }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-virtualized-columns-binding" }),
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
import { dataTableOptions } from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = {
    id: number;
    col1: string; col2: string; col3: string; col4: string;
    col5: string; col6: string; col7: string; col8: string;
    col9: string; col10: string; col11: string; col12: string;
};

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnSlotsDocVirtualizedColumnsBinding", "virtualizedColumns - binding arm");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(
                dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    columnSlots: { binding: "columnSlotEngine" },
                }),
            );
        });
    });
    return s.commitPage();
}
```

## Related

- [column-slots-build-a-custom-column-slot-engine](column-slots-build-a-custom-column-slot-engine.md): Column Slots - Build a Custom Column Slot Engine
