# Data Table - Scrolling - Row Scroll Engines and more

<!-- Automatically generated, do not edit -->

Scrolling controls how a data table behaves as users move through rows: whether they can jump anywhere immediately, how quickly new rows appear, and how movement feels with differently sized and shaped datasets. Runnable examples default to View-side config via `s.dataTable(dataTableOptions<TRow>({ ... }))`; `rowScrolling` and `rowHeightHeuristic` also support the binding arm when a ViewModel must supply a custom engine.

## Row Scroll Engines

Choose how the data table sizes its scroll container and loads rows as the user moves.

**Row Scroll Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `Virtual scroll` | Sizes the scrollbar to represent the entire dataset immediately so users can jump to any position. Requires a known total row count. | Pass `rowScrolling: dataTable.view.rowScrolling.virtualScroll({... })` on s.dataTable({... }). |
| `Infinite scroll` | Grows the scroll container as rows load and fetches more when the user nears the bottom. Works with unknown total row counts. | Pass `rowScrolling: dataTable.view.rowScrolling.infiniteScroll({... })` on s.dataTable({... }). |

## Engine: `virtualScroll`

Sizes the scrollbar to represent the entire dataset immediately, so users can jump to any position without waiting for data to load. Requires a known total row count. Pass the options below to dataTable.view.rowScrolling.virtualScroll({ ... }) as rowScrolling on s.dataTable({ ... }).

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `rowHeightEstimate` | `RowHeightEstimate` | no | `runningAverage({ initialEstimate: 25px })` | V B | Strategy for estimating the height of rows not yet rendered. Used to size the scroll container and compute row offsets for off-screen rows. See Row Height Estimates, in the infinite scroll section, for the available strategies. The strategies are fixed, runningAverage, median and percentile. | `dataTable.view.rowHeightEstimate.runningAverage({ initialEstimate: 25 })` |
| `minRowHeight` | `Pixels` | no | `0` | V B | Minimum height enforced for all rows, even after measurement. | - |
| `fixedRowHeight` | `Pixels` | no | - | V B | Performance optimization: when every row is the same height, pass fixedRowHeight to allow the data table to skip unnecessary work. | `toPixels(40)` |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

export class ViewModel extends RaptorViewModel {
}
```

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
    s.page("ScrollingDocVirtualScrollAuthoringView", "virtualScroll (View)");
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
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
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
    s.page("ScrollingDocVirtualScrollAuthoringViewModel", "virtualScroll (ViewModel)");
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

**Example: Virtual Scroll Fixed Example**:

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
    s.page("ScrollingDocVirtualScrollFixed", "virtualScroll with fixedRowHeight");
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
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            }));
        });
    });
    return s.commitPage();
}
```

**Example: Virtual Scroll Variable Example**:

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
    s.page("ScrollingDocVirtualScrollVariable", "virtualScroll with wrapping text");
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
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({
                    rowHeightEstimate: dataTable.view.rowHeightEstimate.runningAverage({ initialEstimate: 25 }),
                }),
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [scrolling-infinite-scroll](scrolling-infinite-scroll.md): Scrolling - Engine: infiniteScroll and more
- [scrolling-row-height-heuristics](scrolling-row-height-heuristics.md): Scrolling - Row Height Heuristics
- [scrolling-build-a-custom-row-scroll-engine](scrolling-build-a-custom-row-scroll-engine.md): Scrolling - Build a Custom Row Scroll Engine
- [types](types.md): the declarations of the types used here, `RowHeightEstimate`; search it for a name rather than reading it whole
