# Data Table - Selection - Selection Engines and more

<!-- Automatically generated, do not edit -->

A selection engine wires the selection overlay, click handling, and keyboard navigation. Author `tableSelection` on `s.dataTable(dataTableOptions<TRow>({ ... }))` - use `createDataTable()` only when you need the store handle at construction time (see Dispatching and Observing Selection below).

## Selection Engines

Pass a selection engine as `tableSelection` on `s.dataTable`. The built-in overlay engines are referenced via `dataTable.view.tableSelection.<engine>(args)`.

**Selection Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `Cell` | Single click selects a cell; all four arrow keys navigate cell by cell. | Pass `tableSelection: dataTable.view.tableSelection.cell(...)` on s.dataTable. |
| `Row` | Single click selects the full row; up/down arrow keys navigate by row. | Pass `tableSelection: dataTable.view.tableSelection.row(...)` on s.dataTable. |
| `Cell-or-row` | Single click selects a cell; double-click promotes to row selection. | Pass `tableSelection: dataTable.view.tableSelection["cell-or-row"](...)` on s.dataTable. |

Or implement a custom selection engine.

## Engine: `tableSelection`

The built-in overlay selection engines cover the three most common modes, configured by the engine name and optional args.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `engine` | `"cell" \| "row" \| "cell-or-row"` | yes | V B | Built-in overlay selection mode passed to dataTable.view.tableSelection.\<engine>(args). | - |
| `theme` | `DataTableThemeStyling` | no | V | Optional theme for the selection overlay in cell or row mode. | `{ styleProperties: { "border-color": "#e74c3c", "border-width": "2px" } }` |
| `cellTheme` | `DataTableThemeStyling` | no | V | Optional theme applied in cell selection mode (cell-or-row only). | `{ styleProperties: { "border-color": "#e74c3c", "border-width": "2px" } }` |
| `rowTheme` | `DataTableThemeStyling` | no | V | Optional theme applied in row selection mode (cell-or-row only). | `{ styleProperties: { "border-color": "#2980b9", "border-width": "2px" } }` |

### Cell mode

"cell": single click selects a cell; all four arrow keys navigate cell by cell.

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
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "alpha", qty: 2 },
    { id: 2, name: "beta", qty: 5 },
    { id: 3, name: "gamma", qty: 9 },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: { id: schema.number(), name: schema.string(), qty: schema.number() },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SelectionDocCellEngineView", "Cell mode (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                tableSelection: dataTable.view.tableSelection.cell(),
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
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

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
            tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "cell" }),
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
    s.page("SelectionDocCellEngineViewModel", "Cell mode (ViewModel)");
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

### Row mode

"row": single click selects the full row; up/down arrow keys navigate by row.

**Example: Authored in the View**:

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "alpha", qty: 2 },
    { id: 2, name: "beta", qty: 5 },
    { id: 3, name: "gamma", qty: 9 },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: { id: schema.number(), name: schema.string(), qty: schema.number() },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SelectionDocRowEngineView", "Row mode (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                tableSelection: dataTable.view.tableSelection.row(),
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
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

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
            tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "row" }),
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
    s.page("SelectionDocRowEngineViewModel", "Row mode (ViewModel)");
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

### Cell-or-row mode

"cell-or-row": single click selects a cell; double-click promotes to row selection.

**Example: Authored in the View**:

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "alpha", qty: 2 },
    { id: 2, name: "beta", qty: 5 },
    { id: 3, name: "gamma", qty: 9 },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: { id: schema.number(), name: schema.string(), qty: schema.number() },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SelectionDocCellOrRowEngineView", "Cell-or-row mode (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                tableSelection: dataTable.view.tableSelection["cell-or-row"]({
                    cellTheme: { styleProperties: { "border-color": "#e74c3c", "border-width": "2px" } },
                    rowTheme: { styleProperties: { "border-color": "#2980b9", "border-width": "2px" } },
                }),
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
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

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
            tableSelection: dataTable.viewModel.tableSelection.overlaySelection({
                type: "cell-or-row",
                cellTheme: { styleProperties: { "border-color": "#e74c3c", "border-width": "2px" } },
                rowTheme: { styleProperties: { "border-color": "#2980b9", "border-width": "2px" } },
            }),
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
    s.page("SelectionDocCellOrRowEngineViewModel", "Cell-or-row mode (ViewModel)");
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

### Selection Options

Control how selection interacts with keyboard behavior using data table option flags on s.dataTable.

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `blockArrowKeydownPropagation` | `boolean` | no | `false` | V B | When true, an arrow-key keydown inside the table that the selection engine does not use is stopped from bubbling to parent listeners and from scrolling the page. For example at the first or last row, or with nothing selected. A key that moves the selection, and every other key, still bubbles. |

**Example: Selection Options**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export class ViewModel extends RaptorViewModel {}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { ViewModel } from "./view-model";
type Row = {
    id: number;
    region: string;
    owner: string;
    status: "active" | "paused" | "error";
    priority: string;
    score: number;
    month: string;
    notes: string;
};

const rows: Row[] = Array.from({ length: 40 }, (_, index) => ({
    id: index + 1,
    region: "region " + ((index % 8) + 1),
    owner: "owner " + ((index % 5) + 1),
    status: (index % 3 === 0 ? "active" : index % 3 === 1 ? "paused" : "error"),
    priority: ["low", "medium", "high"][index % 3],
    score: 60 + (index % 35),
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        region: schema.string(),
        owner: schema.string(),
        status: schema.string(),
        priority: schema.string(),
        score: schema.number(),
    },
});
const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID", width: toPixels(90), sort: true }),
    column({ field: "region", header: "Region", width: toPixels(150), sort: true }),
    column({ field: "owner", header: "Owner", width: toPixels(150), sort: true }),
    column({ field: "status", header: "Status", width: toPixels(140), sort: true }),
    column({ field: "priority", header: "Priority", width: toPixels(130), sort: true }),
    column({ field: "score", header: "Score", width: toPixels(120), sort: true }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocSelectionOptions", "Selection options");
    s.view("main", (s) => {
        s.div({ height: 330 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns,
                tableSelection: dataTable.view.tableSelection.cell(),
                blockArrowKeydownPropagation: true,
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [cell-selection-checkbox-rows](cell-selection-checkbox-rows.md): Selection - Checkbox Rows and more
- [cell-selection-dispatching-and-observing-selection](cell-selection-dispatching-and-observing-selection.md): Selection - Dispatching and Observing Selection
- [types](types.md): the declarations of the types used here, `DataTableThemeStyling`; search it for a name rather than reading it whole
