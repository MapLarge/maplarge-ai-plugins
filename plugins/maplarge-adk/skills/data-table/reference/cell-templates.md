# Data Table - Cell Templates

<!-- Automatically generated, do not edit -->

## Content Templates

contentTemplates replaces the default cell renderer with arbitrary Raptor markup.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `contentTemplates` | `ViewDefinitionBinding \| InlineContentTemplates` | no | V B | ViewModel binding or inline template object for custom cell rendering. | `inlineContentTemplates((cell) => { cell.s.span({ text: "Custom" }); })` |
| `scope` | `Record<string, ViewDefinitionBinding>` | no | V B | Bindings exposed inside contentTemplates as bindingPaths.scope paths. | - |

There are two ways to define a content template:

### Authored in the View Model

A ViewModel method named in a binding string.

`contentTemplates: { binding: "renderMyCell" }` See more

### Authored in the View

An inlineContentTemplates(...) call defined next to the column.

`contentTemplates: inlineContentTemplates(...)` See more

Both forms receive the same `CellContext`:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `s` | `IRootScriptor<TViewEngineViewModel>` | yes | Scriptor for building cell markup. |
| `field` | `TField` | yes | The column field, or undefined for virtual columns. In an inline template it is a placeholder that becomes the field name only in binding paths and text. In a ViewModel template method it is the real field name. Never compare an inline template's field or branch on it. |
| `bindingPaths` | `CellBindingPaths` | yes | Binding paths for display value, raw value, row, and scope. See CellBindingPaths. |

The following `CellBindingPaths` are available on CellContext.bindingPaths:

| Property | Type | Description |
| --- | --- | --- |
| `bindingPaths.displayValue` | `string` | Path to the display value: the result of unit conversion, transformValue and formatter when the column has them, otherwise the field value as text. |
| `bindingPaths.rawValue` | `string` | Path to the pristine field value, regardless of transformValue. |
| `bindingPaths.row` | `string` | Path to the entire row object. |
| `bindingPaths.scope` | `Record<string, string>` | Paths to ViewModel methods declared in the column's scope map. Empty when no scope is declared. |

### Authoring a Content Template

In the View, use inlineContentTemplates(...) to define cell markup next to the column definitions. In the View Model, set contentTemplates to a string binding naming a method that receives a CellContext and builds the cell's content with the scriptor.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = { readonly id: number; readonly name: string; readonly status: string };

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
    { id: 1, name: "alpha", status: "active" },
    { id: 2, name: "beta", status: "paused" },
    { id: 3, name: "gamma", status: "active" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        status: schema.string(),
    },
});

const createScriptor = () => RSScriptor.create<ViewModel>();
const { column, inlineContentTemplates } = dataTable.view.defineColumns<Row, ViewModel>({ createScriptor });

const statusBadgeTemplate = inlineContentTemplates((cell) => {
    cell.s.span({
        badge: true,
        background: "info",
        bindings: { text: cell.bindingPaths.displayValue },
    });
});

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellTemplatesDocContentTemplatesView", "Content Templates (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "status", header: "Status", contentTemplates: statusBadgeTemplate }),
                ],
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
import type { CellContext, DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly status: string };

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", status: "active" },
            { id: 2, name: "beta", status: "paused" },
            { id: 3, name: "gamma", status: "active" },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    status: schema.string(),
                },
            }),
        });
        this.dataTableOptions = options;
        this.update();
    }

    public renderStatusBadge({ s, bindingPaths }: CellContext<Row, "status", ViewModel>): void {
        s.span({
            badge: true,
            background: "info",
            bindings: { text: bindingPaths.displayValue },
        });
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
    s.page("CellTemplatesDocContentTemplatesViewModel", "Content Templates (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "status", header: "Status", contentTemplates: { binding: "renderStatusBadge" } }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

### Scope

Scope declares extra ViewModel bindings available as paths inside `bindingPaths.scope`. Use it to pass ViewModel-driven boolean predicates, labels, or click handlers into the cell template. Scope is always declared on the column definition, for both authoring forms.

Each entry is a function: a binding to a ViewModel method in the View, the function itself in the ViewModel. A scope function receives { row, rowIndex, globalRowIndex }; as an event handler it runs on the event, and as a value binding it shows what it returns for that row. An entry that is not a function, such as a plain string, is dropped.

**Scope Code Snippet**:

```ts
// s.dataTable({ columns: [...] }): scope on the column
column({
    field: "status",
    header: "Status",
    contentTemplates: { binding: "renderStatusCell" },   // or: inlineContentTemplates(...)
    scope: { statusLabel: { binding: "resolveStatusLabel" } },   // a binding to a function; a plain string is dropped
})

// ViewModel: runs per row; a value binding shows what it returns
resolveStatusLabel({ row }: { row: Row }): string {
    return row.status === "active" ? "Running" : "Stopped";
}

// ViewModel
renderStatusCell({ s, bindingPaths }: CellContext<Row, "status", ViewModel, { statusLabel: ViewDefinitionBinding }>): void {
    s.span({ margin: { right: 2 }, bindings: { text: bindingPaths.scope.statusLabel } });
    s.span({ bindings: { text: bindingPaths.displayValue } });
}

// Inline form: scope is declared on the column
const statusTemplate = inlineContentTemplates(
    (cell) => {
        cell.s.span({ margin: { right: 2 }, bindings: { text: cell.bindingPaths.scope.statusLabel } });
        cell.s.span({ bindings: { text: cell.bindingPaths.displayValue } });
    },
);
```

#### Buttons in Cells

Declare the handler on the column's scope and reference it via bindingPaths.scope inside the template. The handler receives { row, rowIndex, globalRowIndex } for the row it was clicked in.

rowIndex is the row slot; globalRowIndex is the row's position in the table, which store.getRow and store.mutations take.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = { readonly id: number; readonly name: string };

export class ViewModel extends RaptorViewModel {
    // scope handlers receive a ctx object (row, rowIndex, globalRowIndex), not the row directly
    public logRow(ctx: { readonly row: Row }): void {
        console.log("Log Row:", ctx.row);
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "alpha" },
    { id: 2, name: "beta" },
    { id: 3, name: "gamma" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
    },
});

const createScriptor = () => RSScriptor.create<ViewModel>();
const { column, virtualColumn, inlineContentTemplates } = dataTable.view.defineColumns<Row, ViewModel>({ createScriptor });

const logRowButton = inlineContentTemplates((cell) => {
    cell.s
        .button({
            kind: "secondary",
            events: [{ event: "click", handler: cell.bindingPaths.scope.logRow }],
        })
        .contentTemplates((btn) => { btn.span({ text: "Log Row" }); });
});

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellTemplatesDocButtonsInCellsView", "Buttons in Cells (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    virtualColumn({
                        key: "logRow",
                        header: "Log Row",
                        scope: { logRow: { binding: "logRow" } },
                        contentTemplates: logRowButton,
                    }),
                ],
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
import type { CellContext, DataTableOptions, ViewDefinitionBinding } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string };

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha" },
            { id: 2, name: "beta" },
            { id: 3, name: "gamma" },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                },
            }),
        });
        this.dataTableOptions = options;
        this.update();
    }

    // scope handlers receive a ctx object (row, rowIndex, globalRowIndex), not the row directly
    public logRow(ctx: { readonly row: Row }): void {
        console.log("Log Row:", ctx.row);
    }

    public renderLogRowButton({ s, bindingPaths }: CellContext<Row, undefined, ViewModel, { logRow: ViewDefinitionBinding }>): void {
        s.button({
            kind: "secondary",
            events: [{ event: "click", handler: bindingPaths.scope.logRow }],
        }).contentTemplates((btn) => { btn.span({ text: "Log Row" }); });
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column, virtualColumn } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellTemplatesDocButtonsInCellsViewModel", "Buttons in Cells (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    virtualColumn({
                        key: "logRow",
                        header: "Log Row",
                        scope: { logRow: { binding: "logRow" } },
                        contentTemplates: { binding: "renderLogRowButton" },
                    }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Column Display Options

Additional per-column options that control how the cell element itself is presented.

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `customCssClasses` | `string \| string[]` | no | V | CSS class names added to the cell's text span (.ml-dt-cell). On a column with contentTemplates that span is hidden; use customSlotCssClasses to style the column slot around the template, or put the classes on the template's own elements. |
| `contentHeight` | `Pixels` | no | V | Declared content height of this column in pixels, used by the row height heuristics while the column is scrolled out of view (variable-height rows only). It does not set the row height; fixedRowHeight does. It keeps a row from jumping when the column scrolls into view; visible columns are still measured from the DOM. |

**Column Display Options Code Snippet**:

```ts
column({
    field: "priority",
    header: "Priority",
    contentHeight: toPixels(32),    // height used while this column is off screen (variable-height rows only)
    customCssClasses: "center-cell", // added to the cell's text span
})
```

## Template Evaluation Semantics

An inline template runs once, at definition time, to build a static view definition. A ViewModel template method runs each time a cell slot is mounted, with no row data either. In both forms there is no row to inspect, so the output depends only on bindingPaths, and imperative logic like this cannot work:

```ts
// WRONG: runs once, before any data exists; there is no row to branch on
inlineContentTemplates((cell) => {
    if (cell.row.status === "active") {   // no such property
        cell.s.span({ text: "Active" });
    }
});
```

This follows the same contract as the rest of Raptor. For example, s.foreach stamps the same static template for each item, and per-item variation comes entirely from bindings resolved against each item's scope:

```ts
s.foreach(s.getTypedProp("items")).contentTemplates((item) => {
    // one definition, stamped for every item; the binding resolves per item
    item.span({ bindings: { text: item.getTypedProp("name") } });
});
```

Cell templates keep exactly that contract: the template is stamped per cell, and bindingPaths resolve against each row's scope. When a cell needs real logic, put it on the ViewModel and reach it through scope, where it runs per row:

```ts
// View: the template only declares bindings
column({
    field: "status",
    header: "Status",
    contentTemplates: { binding: "renderStatus" },
    scope: { badgeText: { binding: "statusBadgeText" } },
})

// ViewModel: the logic lives here and runs per row
statusBadgeText({ row }: { row: Row }): string {
    return row.status === "active" ? "Active" : "Paused";
}

renderStatus({ s, bindingPaths }: CellContext<Row, "status", ViewModel, { badgeText: ViewDefinitionBinding }>): void {
    s.span({ badge: true, background: "info", bindings: { text: bindingPaths.scope.badgeText } });
}
```

## Related

- [types](types.md): the declarations of the types used here, `InlineContentTemplates`, `CellContext`; search it for a name rather than reading it whole
