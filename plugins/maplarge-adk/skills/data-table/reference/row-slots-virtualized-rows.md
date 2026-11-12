# Data Table - Row Slots - Engine: virtualizedRows and more

<!-- Automatically generated, do not edit -->

The Data Table component prefers to keep a fixed pool of row DOM elements and reuse them as the user scrolls so memory and render cost stay stable across large datasets. Configure rowSlots on s.dataTable(dataTableOptions({ ... })) when the default virtualizedRows pool does not fit: switch to staticRows for small datasets that can keep every row in the DOM, or tune virtualizedRows to adjust pool size.

The rowSlots option supports the Value (V) and Binding (B) authoring arms:

| Name | Description | Inputs |
| --- | --- | --- |
| `virtualizedRows` | Maintains a bounded slot pool and recycles slots as the viewport moves. Default. | Pass `rowSlots: dataTable.view.rowSlots.virtualizedRows({... })` on `s.dataTable(dataTableOptions({... }))` (or omit for the default). |
| `staticRows` | One permanent DOM element per row. No recycling. Only for small datasets. | Pass `rowSlots: dataTable.view.rowSlots.staticRows()` on `s.dataTable(dataTableOptions({... }))`. |

## Engine: `virtualizedRows`

Allocates up to a fixed number of row DOM elements, recycling them as the user scrolls. (E.g. a data table with 1,000,000 rows just uses the same 100 DOM rows recycled repeatedly.)

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `slots` | `number` | no | `100` | V B | Maximum number of row DOM slots to maintain in the pool. Pass in the engine ref args on the View, or as factory options on the ViewModel binding. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

export type Row = { id: number; name: string; category: string };

export class ViewModel extends DynamicViewModel {}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        category: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "category", header: "Category" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("RowSlotsDocVirtualizedRows", "virtualizedRows - 500 rows, 200 slots");
    s.view("main", (s) => {
        s.div({ height: toPixels(300) }).contentTemplates((s) => {
            const rows: Row[] = Array.from({ length: 500 }, (_, rowIndex) => ({
                id: rowIndex + 1,
                name: "row-" + String(rowIndex + 1),
                category: ["alpha", "beta", "gamma"][rowIndex % 3],
            }));
            s.dataTable(dataTableOptions<Row>({
                data: rows,
                schema: gridSchema,
                columns,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                rowSlots: dataTable.view.rowSlots.virtualizedRows({ slots: 200 }),
                storage: dataTable.view.storage.localStore({ prefix: "doc-virtualized-rows-example" }),
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
import {
    ArrayDataEngine,
    createDataTable,
    dataTable,
    schema,
    toPixels,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { id: number; name: string; category: string };

const gridSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        category: schema.string(),
    },
});

const { column } = dataTable.viewModel.defineColumns<Row>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "category", header: "Category" }),
];

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = Array.from({ length: 500 }, (_, rowIndex) => ({
            id: rowIndex + 1,
            name: "row-" + String(rowIndex + 1),
            category: ["alpha", "beta", "gamma"][rowIndex % 3],
        }));
        const { options } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({ data: rows }),
            schema: gridSchema,
            columns,
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            rowSlots: dataTable.viewModel.rowSlots.virtualizedRows({ slots: 200 }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-virtualized-rows-viewmodel" }),
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
    s.page("RowSlotsDocVirtualizedRowsViewModel", "virtualizedRows - ViewModel");
    s.view("main", (s) => {
        s.div({ height: toPixels(300) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

### Recycle Buffer

By default, virtualizedRows keeps 10 extra rendered rows on each side of the visible range (rowRecycleBuffer). This keeps edge rows in the DOM so small scrolls don't immediately see harsh transitions. Increase the buffer if your rows are expensive to render and users frequently scroll back; decrease it if you want fewer active bindings.

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `rowRecycleBuffer` | `number` | no | `10` | V B | Extra row DOM slots kept mounted above and below the visible range. Also capped at 25% of the active virtualized row slot count. Also capped at half of the slots left after the visible rows. |

Examples for `rowRecycleBuffer`:

Value (V):

```ts
s.dataTable(dataTableOptions<Row>({
    rowRecycleBuffer: 25,
}));
```

Binding (B):

```ts
s.dataTable(dataTableOptions<Row>({
    rowRecycleBuffer: { binding: "getRowRecycleBuffer" },
}));

getRowRecycleBuffer(): number {
    return 25;
}
```

## Engine: `staticRows`

Allocates one DOM element per loaded row and never recycles. Every loaded row stays in the DOM, which makes this engine unsuitable for large datasets but eliminates all recycling overhead for small ones.

Rows load in segments (50 rows by default), so the DOM grows by one segment each time the user scrolls to rows that have not loaded yet.

**Example: Authored in the View**:

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        category: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "category", header: "Category" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("RowSlotsDocStaticRows", "staticRows - 50 rows");
    s.view("main", (s) => {
        s.div({ height: toPixels(300) }).contentTemplates((s) => {
            const rows: Row[] = Array.from({ length: 50 }, (_, rowIndex) => ({
                id: rowIndex + 1,
                name: "row-" + String(rowIndex + 1),
                category: ["alpha", "beta", "gamma"][rowIndex % 3],
            }));
            s.dataTable(dataTableOptions<Row>({
                data: rows,
                schema: gridSchema,
                columns,
                rowScrolling: dataTable.view.rowScrolling.infiniteScroll({ fixedRowHeight: 40 }),
                rowSlots: dataTable.view.rowSlots.staticRows(),
                storage: dataTable.view.storage.localStore({ prefix: "doc-static-rows-example" }),
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
import {
    ArrayDataEngine,
    createDataTable,
    dataTable,
    schema,
    toPixels,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { id: number; name: string; category: string };

const gridSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        category: schema.string(),
    },
});

const { column } = dataTable.viewModel.defineColumns<Row>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "category", header: "Category" }),
];

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = Array.from({ length: 50 }, (_, rowIndex) => ({
            id: rowIndex + 1,
            name: "row-" + String(rowIndex + 1),
            category: ["alpha", "beta", "gamma"][rowIndex % 3],
        }));
        const { options } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({ data: rows }),
            schema: gridSchema,
            columns,
            rowScrolling: dataTable.viewModel.rowScrolling.infiniteScroll({ fixedRowHeight: toPixels(40) }),
            rowSlots: dataTable.viewModel.rowSlots.staticRows(),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-static-rows-viewmodel" }),
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
    s.page("RowSlotsDocStaticRowsViewModel", "staticRows - ViewModel");
    s.view("main", (s) => {
        s.div({ height: toPixels(300) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [row-slots-build-a-custom-row-slot-engine](row-slots-build-a-custom-row-slot-engine.md): Row Slots - Build a Custom Row Slot Engine
