# Data Table - Scrolling - Engine: infiniteScroll and more

<!-- Automatically generated, do not edit -->

## Engine: `infiniteScroll`

The scroll container grows as rows load rather than being sized to the full dataset upfront. When the user scrolls to the bottom of loaded content, the data table fetches more rows. Works with unknown total row counts. Pass the options below to dataTable.view.rowScrolling.infiniteScroll({ ... }) as rowScrolling on s.dataTable({ ... }).

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `rowHeightEstimate` | `RowHeightEstimate` | no | `runningAverage({ initialEstimate: 25px })` | V B | Strategy for estimating the height of rows not yet rendered. Used to size the scroll spacer and compute row offsets for off-screen rows. | `dataTable.view.rowHeightEstimate.runningAverage({ initialEstimate: 25 })` |
| `minRowHeight` | `Pixels` | no | `0` | V B | Minimum height enforced for all rows. | - |
| `loadThreshold` | `Pixels` | no | `200px` | V B | Distance from the bottom of loaded content at which loading more rows is triggered. | - |
| `fixedRowHeight` | `Pixels` | no | - | V B | Performance optimization: when every row is the same height, pass fixedRowHeight to allow the data table to skip unnecessary work. | `toPixels(40)` |

**Example: Authored in the View**:

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = Array.from({ length: 40 }, (_unusedValue, index) => ({
    id: index + 1,
    name: "row-" + String(index + 1),
    qty: (index % 20) + 1,
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        qty: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ScrollingDocInfiniteScrollAuthoringView", "infiniteScroll (View)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80) }),
                    column({ field: "name", header: "Name", width: toPixels(160) }),
                    column({ field: "qty", header: "Qty" }),
                ],
                rowScrolling: dataTable.view.rowScrolling.infiniteScroll({ fixedRowHeight: toPixels(32) }),
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

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = Array.from({ length: 40 }, (_unusedValue, index) => ({
            id: index + 1,
            name: "row-" + String(index + 1),
            qty: (index % 20) + 1,
        }));
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            rowScrolling: dataTable.viewModel.rowScrolling.infiniteScroll({ fixedRowHeight: toPixels(32) }),
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
    s.page("ScrollingDocInfiniteScrollAuthoringViewModel", "infiniteScroll (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80) }),
                    column({ field: "name", header: "Name", width: toPixels(160) }),
                    column({ field: "qty", header: "Qty" }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

**Example: Infinite Scroll Fixed Example**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type FixedHeightRow = { readonly id: number; readonly name: string; readonly value: number };

export class ViewModel extends RaptorViewModel {
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { FixedHeightRow, ViewModel } from "./view-model";

const fixedHeightRows: FixedHeightRow[] = Array.from({ length: 500 }, (_, rowIndex) => ({
    id: rowIndex + 1,
    name: "row-" + String(rowIndex + 1),
    value: (rowIndex * 37 + 13) % 1000,
}));

const fixedHeightGridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        value: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<FixedHeightRow, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ScrollingDocInfiniteScrollFixed", "infiniteScroll with fixedRowHeight");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<FixedHeightRow>({
                data: dataTable.view.data.arrayData({ data: fixedHeightRows }),
                schema: fixedHeightGridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "value", header: "Value" }),
                ],
                rowScrolling: dataTable.view.rowScrolling.infiniteScroll({ fixedRowHeight: toPixels(32) }),
            }));
        });
    });
    return s.commitPage();
}
```

**Example: Infinite Scroll Variable Example**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type VariableHeightRow = { readonly id: number; readonly name: string; readonly description: string };

export class ViewModel extends RaptorViewModel {
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";
import type { VariableHeightRow, ViewModel } from "./view-model";

const variableHeightDescriptions = [
    "Short.",
    "A bit longer description that takes up more space.",
    "This is a longer description that will likely wrap onto multiple lines, causing this row to be taller than its neighbors.",
    "Medium length description here.",
    "An extra-long description to demonstrate variable row heights: this row contains enough text that it wraps several times and is noticeably taller than shorter rows.",
];

const variableHeightRows: VariableHeightRow[] = Array.from({ length: 200 }, (_, rowIndex) => ({
    id: rowIndex + 1,
    name: "row-" + String(rowIndex + 1),
    description: variableHeightDescriptions[rowIndex % variableHeightDescriptions.length],
}));

const variableHeightGridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        description: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<VariableHeightRow, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ScrollingDocInfiniteScrollVariable", "infiniteScroll with wrapping text");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<VariableHeightRow>({
                data: dataTable.view.data.arrayData({ data: variableHeightRows }),
                schema: variableHeightGridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "description", header: "Description", textWrap: true }),
                ],
                rowScrolling: dataTable.view.rowScrolling.infiniteScroll({
                    rowHeightEstimate: dataTable.view.rowHeightEstimate.runningAverage({ initialEstimate: 25 }),
                }),
            }));
        });
    });
    return s.commitPage();
}
```

Defaults in the Data Table component are dialed to perform well for typical use cases. These options provide advanced control over scrolling behavior if tweaks are needed to align with the dataset being consumed or the load being put on the data table rendering loops.

## Scrolling behavior options

Top-level `s.dataTable` flags that tune wheel momentum, keyboard propagation, and scroll-settle timing.

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `wheelGlideWindowMs` | `Milliseconds` | no | `toMs(300)` | V B | After a wheel tick, treat subsequent scroll reconciliation as continuous momentum for this many milliseconds. Covers one flick without misclassifying a later scrollbar drag as wheel glide. |
| `blockArrowKeydownPropagation` | `boolean` | no | `false` | V B | When true, unhandled arrow-key keydown events processed by the data table do not bubble to parent document listeners. Unhandled means the selection engine does not use the key, for example at the first or last row, or with nothing selected; such a key is also kept from scrolling the page. A key that moves the selection, and every other key, still bubbles. |
| `scrollSettleDebounceMs` | `Milliseconds` | no | `toMs(20)` | V B | Debounce interval after scrolling stops before the view engine loads the segments now in view. Row positioning, recycling and visible-range tracking still run on every animation frame; this only delays segment loading. |

**Advanced Scrolling Summary**:

| Name | Description |
| --- | --- |
| `Row height estimates` | Strategies for estimating the height of rows not yet rendered when sizing the scroll container and row offsets. |
| `Row height heuristics` | Controls how rendered rows measure column heights in the DOM (linear scan, first N columns, by keys, etc.). |
| `Offscreen column height heuristics` | Estimates height for columns outside the horizontal viewport when there is no DOM node to measure. |

## Row Height Estimates

The scroll engine must estimate the height of rows that have not yet been rendered to size the scroll container effectively. For example, with virtualScroll over a 10,000-row dataset where only rows 0-50 have been rendered, the engine needs an estimated height for rows 51-9999 to know how tall to make the scrollbar.

infiniteScroll sizes the container for the rows loaded so far, so it uses the estimate only for loaded rows not yet measured.

### rowHeightEstimates.runningAverage

(default) Returns the running average of all measured row heights, falling back to initialEstimate before any rows have been measured.

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `initialEstimate` | `Pixels` | yes | Height used as the spacer estimate before any rows have been measured. | `toPixels(25)` |

### rowHeightEstimates.fixed

Always returns the same height.

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `height` | `Pixels` | yes | The fixed height returned for every unmeasured row. | `toPixels(25)` |

### rowHeightEstimates.median

Returns the median measured row height, falling back to initialEstimate before any rows have been measured. More robust than runningAverage when a few outlier-tall rows exist, because the median is unaffected by extreme values. Spacer height shifts less dramatically as new rows are measured.

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `initialEstimate` | `Pixels` | yes | Height used as the spacer estimate before any rows have been measured. | `toPixels(25)` |

### rowHeightEstimates.percentile

Returns the measured height at the given percentile (0-1), falling back to initialEstimate. Use e.g. 0.75 to conservatively overestimate the spacer: the scrollbar thumb will be slightly smaller than needed, but there are fewer jarring shifts as rows are measured.

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `percentile` | `number` | yes | Target percentile as a fraction (0-1). 0 gives the minimum measured height; 1 gives the maximum. | `0.75` |
| `initialEstimate` | `Pixels` | yes | Height used as the spacer estimate before any rows have been measured. | `toPixels(25)` |

## Related

- [scrolling-row-scroll-engines](scrolling-row-scroll-engines.md): Scrolling - Row Scroll Engines and more
- [types](types.md): the declarations of the types used here, `RowHeightEstimate`; search it for a name rather than reading it whole
