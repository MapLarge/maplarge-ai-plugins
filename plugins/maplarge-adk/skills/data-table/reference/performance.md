# Data Table - Performance

<!-- Automatically generated, do not edit -->

The Data Table exposes knobs to fine-tune rendering and caching performance. Author them on the View via `s.dataTable(dataTableOptions<TRow>({ ... }))` - each option supports the value (V), declarative rule (R), and binding (B) arms. `createDataTable({ ... })` on the ViewModel still accepts the same keys when you need a store handle at construction time.

## Options

Declarative rules evaluate against `TableContext` (`rowCount`, `isFiltered`, `isSorted`, `visibleColumnCount`).

**V**:

```ts
viewportOnlyEvaluation: true,
columnMountBudgetMs: toMs(12),
bindingEvalBudgetMs: toMs(12),
rowRecycleBuffer: 8,
extraColumnBuffer: 4,
maxCachedSegments: 20,
maxNeedsLoadingSegments: 4,
```

**R**:

```ts
viewportOnlyEvaluation: {
    where: { field: "rowCount", test: "Greater", value: 1000 },
    applyValue: true,
},
maxCachedSegments: {
    where: { field: "visibleColumnCount", test: "Greater", value: 20 },
    applyValue: 30,
},
```

**B**:

```ts
viewportOnlyEvaluation: { binding: "deferOffscreenBindingEvaluation" },
rowRecycleBuffer: { binding: "rowRecycleBufferSize" },
maxCachedSegments: { binding: "maxCachedSegmentCount" },
```

## Example

The Value (V) example authors literals on `s.dataTable`. The Binding (B) example wires a few options to ViewModel methods that read live table context.

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

export class ViewModel extends DynamicViewModel {}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    dataTable,
    dataTableOptions,
    schema,
    toMs,
    toPixels,
} from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = { id: number; name: string; category: string; score: number };

const sampleRows: Row[] = Array.from({ length: 2000 }, (_, index) => ({
    id: index + 1,
    name: `Record ${(index + 1).toString().padStart(4, "0")}`,
    category: ["Alpha", "Beta", "Gamma", "Delta"][index % 4],
    score: 70 + (index % 25),
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        category: schema.string(),
        score: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID", width: toPixels(80) }),
    column({ field: "name", header: "Name", width: toPixels(200) }),
    column({ field: "category", header: "Category", width: toPixels(120) }),
    column({ field: "score", header: "Score", width: toPixels(100) }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataTablePerformanceExampleV", "Performance - Value (V)");
    s.view("main", (s) => {
        s.div({ height: toPixels(360) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: sampleRows }),
                schema: gridSchema,
                columns,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                columnSlots: dataTable.view.columnSlots.virtualizedColumns(),
                storage: dataTable.view.storage.noPersistence(),
                viewportOnlyEvaluation: true,
                columnMountBudgetMs: toMs(12),
                bindingEvalBudgetMs: toMs(12),
                rowRecycleBuffer: 8,
                extraColumnBuffer: 4,
                maxCachedSegments: 20,
                maxNeedsLoadingSegments: 4,
            }));
        });
    });
    return s.commitPage();
}
```

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

export class ViewModel extends DynamicViewModel {
    deferOffscreenBindingEvaluation(): boolean {
        return true;
    }

    rowRecycleBufferSize(ctx: { readonly rowCount: number | undefined }): number {
        return (ctx.rowCount ?? 0) > 5000 ? 15 : 8;
    }

    maxCachedSegmentCount(ctx: { readonly isFiltered: boolean }): number {
        return ctx.isFiltered === true ? 12 : 24;
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
    toMs,
    toPixels,
} from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = { id: number; name: string; category: string; score: number };

const sampleRows: Row[] = Array.from({ length: 2000 }, (_, index) => ({
    id: index + 1,
    name: `Record ${(index + 1).toString().padStart(4, "0")}`,
    category: ["Alpha", "Beta", "Gamma", "Delta"][index % 4],
    score: 70 + (index % 25),
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        category: schema.string(),
        score: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID", width: toPixels(80) }),
    column({ field: "name", header: "Name", width: toPixels(200) }),
    column({ field: "category", header: "Category", width: toPixels(120) }),
    column({ field: "score", header: "Score", width: toPixels(100) }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataTablePerformanceExampleB", "Performance - Binding (B)");
    s.view("main", (s) => {
        s.div({ height: toPixels(360) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: sampleRows }),
                schema: gridSchema,
                columns,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                columnSlots: dataTable.view.columnSlots.virtualizedColumns(),
                storage: dataTable.view.storage.noPersistence(),
                viewportOnlyEvaluation: { binding: "deferOffscreenBindingEvaluation" },
                columnMountBudgetMs: toMs(12),
                bindingEvalBudgetMs: toMs(12),
                rowRecycleBuffer: { binding: "rowRecycleBufferSize" },
                extraColumnBuffer: 4,
                maxCachedSegments: { binding: "maxCachedSegmentCount" },
                maxNeedsLoadingSegments: 4,
            }));
        });
    });
    return s.commitPage();
}
```

## More reference tables

**Performance Option**:

| Property | Type | Required | Default | Description | Notes |
| --- | --- | --- | --- | --- | --- |
| `viewportOnlyEvaluation` | `boolean` | no | `false` | When true, binding evaluation is deferred for columns that are outside the horizontal viewport. Off-screen cells in the same row are skipped until they scroll into view, at which point they are drained by the queue. | Cells must tolerate deferred evaluation: do not read cell content synchronously after render if this is on. |
| `columnMountBudgetMs` | `Milliseconds` | no | `toMs(10)` | Per animation frame, the maximum time spent draining the queue that mounts column cell content templates before yielding back to the browser. | Use toMs(n) to construct the value. |
| `bindingEvalBudgetMs` | `Milliseconds` | no | `toMs(10)` | Per frame, the maximum time spent draining the deferred binding-evaluation queue. Higher values process more rows per frame; lower values keep frames shorter at the cost of slower catch-up after a large scroll jump. The queue holds rows recycled or loaded off screen or before their data arrived, plus, with viewportOnlyEvaluation, rows whose newly visible columns still need their bindings. A plain number works as well as toMs(n). | Applies whether or not viewportOnlyEvaluation is on. Use toMs(n) to construct the value. |
| `rowRecycleBuffer` | `number` | no | `10` | How many additional rows to keep bound above and below the visible vertical range. A larger buffer means small scroll nudges find their rows already bound, at the cost of more rows to bind per scroll step. The actual buffer is also capped at 25% of the number of currently active virtualized rows. It adds no DOM nodes; the rowSlots engine sets the row pool size (the virtualizedRows slots, default 100). The buffer is also capped at half of the slots left after the visible rows. | - |
| `extraColumnBuffer` | `number` | no | `5` | How many additional active columns to include on each side of the horizontal viewport when computing the column slot window. A larger buffer pre-renders columns before they scroll into view, reducing pop-in; a smaller buffer keeps fewer off-screen columns bound. The number of DOM slots is the engine's maxColumnCount either way. The buffer is capped at half of the slots left after the visible columns. | Only applies when using the virtualizedColumns column slot engine. For staticColumns all columns are always mounted regardless of this setting. |
| `maxCachedSegments` | `number` | no | `50` | Upper bound on the number of row segments kept resident in the in-memory segment cache. More segments mean that random scroll jumps can often be served from cache rather than triggering a new data fetch. Fewer segments reduce memory at the cost of more fetches. | - |
| `maxNeedsLoadingSegments` | `number` | no | `2` | Upper bound on how many segments in the needsLoading state the cache retains before evicting the oldest. Limits memory held for scroll targets that have been requested but not yet fetched. | - |
