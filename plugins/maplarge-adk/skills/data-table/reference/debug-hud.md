# Data Table - Debug HUD

<!-- Automatically generated, do not edit -->

The Debug HUD is a development overlay for inspecting data table rendering, caching, queues, and recent actions while the data table is running.

For development-use only.

## Turning It On

Pass `debugHud` on `s.dataTable(dataTableOptions<TRow>({ ... }))`. The option supports all three authoring arms (V - R - B).

**V**:

```ts
debugHud: { enabled: true }
```

**R**:

```ts
debugHud: { where: { field: "rowCount", test: "Greater", value: 0 }, applyValue: { enabled: true } }
```

**B**:

```ts
debugHud: { binding: "getDebugHudConfig" }
```

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly title: string;
    readonly status: string;
    readonly category: string;
    readonly score: number;
};

export class ViewModel extends RaptorViewModel {}
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

import type { Row, ViewModel } from "./view-model";

const sampleRows: Row[] = Array.from({ length: 5000 }, (_, index) => ({
    id: index + 1,
    title: `Record ${(index + 1).toString().padStart(4, "0")}`,
    status: index % 3 === 0 ? "Open" : index % 3 === 1 ? "Review" : "Closed",
    category: ["Alpha", "Beta", "Gamma", "Delta"][index % 4],
    score: 70 + (index % 25),
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        title: schema.string(),
        status: schema.string(),
        category: schema.string(),
        score: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "title", header: "Title" }),
    column({ field: "status", header: "Status" }),
    column({ field: "category", header: "Category" }),
    column({ field: "score", header: "Score" }),
];


export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataTableDebugHudExample", "DataTable Debug HUD");
    s.view("main", (s) => {
        s.div({ height: 360 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: sampleRows }),
                schema: gridSchema,
                columns,
                debugHud: { enabled: true },
                viewportOnlyEvaluation: true,
                columnMountBudgetMs: toMs(6),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
                storage: dataTable.view.storage.noPersistence(),
            }));
        });
    });
    return s.commitPage();
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

import type { Row, ViewModel } from "./view-model";

const sampleRows: Row[] = Array.from({ length: 5000 }, (_, index) => ({
    id: index + 1,
    title: `Record ${(index + 1).toString().padStart(4, "0")}`,
    status: index % 3 === 0 ? "Open" : index % 3 === 1 ? "Review" : "Closed",
    category: ["Alpha", "Beta", "Gamma", "Delta"][index % 4],
    score: 70 + (index % 25),
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        title: schema.string(),
        status: schema.string(),
        category: schema.string(),
        score: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "title", header: "Title" }),
    column({ field: "status", header: "Status" }),
    column({ field: "category", header: "Category" }),
    column({ field: "score", header: "Score" }),
];


export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataTableDebugHudRule", "DataTable Debug HUD (rule)");
    s.view("main", (s) => {
        s.div({ height: 360 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: sampleRows }),
                schema: gridSchema,
                columns,
                debugHud: {
                    where: { field: "rowCount", test: "Greater", value: 0 },
                    applyValue: { enabled: true },
                },
                viewportOnlyEvaluation: true,
                columnMountBudgetMs: toMs(6),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
                storage: dataTable.view.storage.noPersistence(),
            }));
        });
    });
    return s.commitPage();
}
```

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly title: string;
    readonly status: string;
    readonly category: string;
    readonly score: number;
};

export class ViewModel extends RaptorViewModel {
    getDebugHudConfig() {
        return { enabled: true };
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

import type { Row, ViewModel } from "./view-model";

const sampleRows: Row[] = Array.from({ length: 5000 }, (_, index) => ({
    id: index + 1,
    title: `Record ${(index + 1).toString().padStart(4, "0")}`,
    status: index % 3 === 0 ? "Open" : index % 3 === 1 ? "Review" : "Closed",
    category: ["Alpha", "Beta", "Gamma", "Delta"][index % 4],
    score: 70 + (index % 25),
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        title: schema.string(),
        status: schema.string(),
        category: schema.string(),
        score: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "title", header: "Title" }),
    column({ field: "status", header: "Status" }),
    column({ field: "category", header: "Category" }),
    column({ field: "score", header: "Score" }),
];


export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataTableDebugHudBinding", "DataTable Debug HUD (binding)");
    s.view("main", (s) => {
        s.div({ height: 360 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: sampleRows }),
                schema: gridSchema,
                columns,
                debugHud: { binding: "getDebugHudConfig" },
                viewportOnlyEvaluation: true,
                columnMountBudgetMs: toMs(6),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
                storage: dataTable.view.storage.noPersistence(),
            }));
        });
    });
    return s.commitPage();
}
```

### debugHudCounterMax

Ceiling for lifetime recycling counters displayed in the HUD before they roll over to 0. Pass as a top-level option on `s.dataTable(dataTableOptions({ ... }))`, or nest it inside `debugHud: { enabled: true, debugHudCounterMax: 5000 }`. Supports V - R - B authoring arms.

When both spellings are set at build time, the nested debugHud.debugHudCounterMax wins over the top-level one. Only the top-level debugHudCounterMax is applied on a live config update.

The HUD configuration inside debugHud (enabled, debugHudCounterMax, debugHudActionLogMax, or a debugHud rule) is read once, when the table is built, and is not re-applied on a live config update.

## Debug HUD Fields

| Property | Description |
| --- | --- |
| `row elements` | Row DOM elements currently mounted. |
| `header elements` | Rendered header cell elements. Should match the visible column count. |
| `viewport rows` | First and last visible row indexes. Useful for verifying the data table is tracking scroll position correctly. |
| `viewport cols` | First and last visible column indexes (inclusive range; the stored end is exclusive and is decremented by 1 for display). The range includes the extraColumnBuffer columns on each side of what is on screen. |
| `segments cached` | Segments currently in memory vs the configured maxCachedSegments limit. Hitting the limit evicts the oldest segment. |
| `loaded rows` | Rows available in the segment cache vs the known total row count. |
| `segment size` | Number of rows per cache segment, the table's page size of 50 rows. The data engine does not set it. |
| `loaded size` | Estimated in-memory size of all loaded segment data. |
| `states` | Segment counts by state: loaded / loading / pending / failed. The failed count should always be 0; a non-zero value means a data fetch returned an error. |
| `end reached` | Highlighted green when the data engine has confirmed there are no more rows. 'no' is normal for a dataset still loading. |
| `row slots` | DOM row elements vs row elements currently mapped to a row index. These should stay roughly equal during normal scroll. |
| `(orphaned)` | Sub-row below 'row slots'. Mounted row elements not mapped to any row index. Highlighted as a warning if > 0, should always be 0; a persistent non-zero count indicates a row recycling bug. |
| `col slots` | Total column slots in the pool vs slots currently assigned to columns. |
| `(unassigned)` | Sub-row below 'col slots'. Column slots not assigned to any column. Highlighted as a warning if > 0, though with virtualizedColumns it is normally above 0 and not a fault. With staticColumns it is always 0; with virtualizedColumns it is above 0 while the visible columns plus extraColumnBuffer are fewer than the slot pool (maxColumnCount, default 20). |
| `col window` | Shows 'ready' normally. Shows 'pending' (warning) when a column slot window update is queued but not yet processed. |
| `height cache` | Rows with cached column height measurements. Only relevant when using variable-height rows. |
| `seg load` | Shows 'idle' normally. Shows 'in-flight' (warning color) while a load-more request triggered by infiniteScroll is in progress. With virtualScroll it always shows 'idle'. Follow segment loading with the segments cached and states rows. |
| `rows (Recycling)` | Lifetime row recycling ((reload)) vs lifetime new DOM allocations. A healthy data table recycles far more often than it allocates new elements. |
| `cols (Recycling)` | Lifetime column slot recycling ((reload)) vs content-template unmount count (remount). A high remount count with virtualizedColumns may mean extraColumnBuffer is too small. |
| `scroll` | Shows [IDLE] at rest; [WORK] while a scroll frame is pending. The value shows 'dirty: no' normally; 'dirty: yes' (warning) means another scroll event arrived mid-frame. A persistently dirty scroll indicates very rapid input. |
| `bind eval` | Shows [IDLE] at rest; [WORK] while draining deferred binding evaluations. Queue and drain rate are shown. Queue should reach 0 once scrolling stops. |
| `col mount` | Shows [IDLE] at rest; [WORK] while draining the column content-template mount queue. Queue should reach 0 once columns finish initializing. |
| `pending rows` | Row updates queued for the next render pass. Should be 0 when the data table is idle. |
| `viewport-only eval` | Shows 'on' when viewportOnlyEvaluation is enabled. When on, the bind eval queue will grow during large scrolls and drain in subsequent frames. |
| `dom nodes` | Approximate DOM node count. Should stay stable after initialization; steady growth may indicate elements are not being cleaned up. |

## Tools

| Property | Description |
| --- | --- |
| `Log VM` | Prints the data table ViewModel to the browser console. |
| `Log seg cache` | Prints the current segment cache snapshot to the browser console. |
| `Log col heights` | Prints the column height cache snapshot to the browser console. |
| `Log saved state` | Prints any persisted data table state to the browser console. |
| `Clear saved state` | Permanently wipes persisted data table state. Irreversible. |
| `Break` | Pauses in the browser debugger with full data table context in scope. |

## Dispatch

Sends data table actions directly. Select an action type from the dropdown and supply a JSON params object.

## Actions

Rolling log of recent data table actions, newest first. High-frequency internal actions (loadSegments, setVisibleRange, etc.) are dimmed. Export downloads the full log as JSON.
