# Data Table - Cell Editing - Engine: dialogCellEditor and more

<!-- Automatically generated, do not edit -->

## Engine: `dialogCellEditor`

Opens a Raptor dialog with a custom view definition or a simple descriptor control with confirmation buttons.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `dialogOptions` | `ViewDefinitions.IDialog` | no | Dialog presentation overrides. |
| `viewDefinition` | `ViewDefinitions.IViewDefinition` | no | A view definition that replaces the whole generated dialog. When omitted, a dialog with the column's descriptor control and OK and Cancel is generated. It replaces the title, body, OK and Cancel; bind its input to dataTable.extensions.cellEditor.pendingEditValue and call dataTable.extensions.cellEditor.commitEdit and cancelEdit. dialogOptions is ignored when viewDefinition is set. The generated dialog is 300 x 150 unless dialogOptions says otherwise. |
| `optimisticUpdate` | `boolean` | no | Immediately patch the segment cache and re-render the row after commit, before the server round-trip completes. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = { readonly id: number; readonly name: string; readonly notes: string };

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
    { id: 1, name: "alpha", notes: "First batch, ready for review." },
    { id: 2, name: "beta", notes: "Needs another pass before release." },
    { id: 3, name: "gamma", notes: "Blocked on data migration." },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        notes: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellEditingDocDialogEngineView", "dialogCellEditor (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({
                        field: "notes",
                        header: "Notes",
                        editing: { triggers: { dblclick: { editor: dataTable.view.editing.dialogCellEditor({ dialogOptions: { width: 480, height: 300 } }) } } },
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
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly notes: string };

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", notes: "First batch, ready for review." },
            { id: 2, name: "beta", notes: "Needs another pass before release." },
            { id: 3, name: "gamma", notes: "Blocked on data migration." },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    notes: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({
                    field: "notes",
                    header: "Notes",
                    editing: { triggers: { dblclick: { editor: dataTable.viewModel.editing.dialogCellEditor({ dialogOptions: { width: 480, height: 300 } }) } } },
                }),
            ],
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
import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellEditingDocDialogEngineViewModel", "dialogCellEditor (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## Engine: `templatedCellEditor`

Renders a contentTemplates callback either directly inside the cell (inlineCell: true) or in a floating popover anchored to the cell (default). Use inlineCell for compact controls that fit within the cell row; use the popover mode when the editing UI needs more space.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `contentTemplates` | `Outcome<CellEditorContent, string>` | yes | What renders inside the cell or popover while editing. |
| `inlineCell` | `true \| false` | no | When true, renders directly inside the cell element and restores original cell content on cancel. When false (default), renders in a floating popover anchored to the cell. |
| `onBlur` | `"commit" \| "cancel"` | no | What to do when focus leaves the editor. "commit" auto-commits; "cancel" discards. When omitted nothing happens on blur. There is no default for templated editors: the editor stays open until a commit or cancel handler runs (descriptorCellEditor defaults to "commit"). |
| `optimisticUpdate` | `boolean` | no | Immediately patch the segment cache and re-render the row after commit, before the server round-trip completes. |
| `cellTheme` | `DataTableThemeStyling` | no | (inlineCell only) Styling applied to the cell slot element while editing is active. |
| `popoverTheme` | `DataTableThemeStyling` | no | (popover only) Additional styling applied to the popover wrapper element. |
| `verticalPlacement` | `"top" \| "center" \| "bottom"` | no | (popover only) Which side of the cell the popover opens on: "bottom", "top", or "center" on the cell. When omitted the table picks the side with more room. "bottom" puts the popover's top edge on the cell's bottom edge and "top" puts its bottom edge on the cell's top edge. The side with more room is "bottom" when there is at least as much room below the cell as above it, otherwise "top". |
| `horizontalPlacement` | `"left" \| "center" \| "right"` | no | (popover only) "left" lines the popover's left edge up with the cell's left edge, "right" lines its right edge up with the cell's right edge, "center" centers it on the cell. Defaults to "center". |
| `onMounted` | `ViewDefinitionBinding` | no | Called after the editor template is mounted. Receives the cell or popover element. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { dataTable } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly shelters: string };

// the template is a live callback, so the editor is built here and named from the View
export class ViewModel extends RaptorViewModel {
    readonly sheltersEditor = dataTable.viewModel.editing.templatedCellEditor({
        contentTemplates: dataTable.viewModel.editing.cellEditorContent(({ s, bindingPaths }) => {
            s.input({
                bindings: { value: bindingPaths.editValue },
                events: [{ event: "change", handler: bindingPaths.handlers.commitEdit }],
            });
        }),
    });
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "alpha", shelters: "Riverside" },
    { id: 2, name: "beta", shelters: "Downtown" },
    { id: 3, name: "gamma", shelters: "Hillcrest" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        shelters: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellEditingDocTemplatedEngineView", "templatedCellEditor (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({
                        field: "shelters",
                        header: "Shelters",
                        editing: { triggers: { dblclick: { editor: { binding: "sheltersEditor" } } } },
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
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly shelters: string };

const { column } = dataTable.viewModel.defineColumns<Row>();

const sheltersTemplate = dataTable.viewModel.editing.cellEditorContent(({ s, bindingPaths }) => {
    s.input({
        bindings: { value: bindingPaths.editValue },
        events: [{ event: "change", handler: bindingPaths.handlers.commitEdit }],
    });
});

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", shelters: "Riverside" },
            { id: 2, name: "beta", shelters: "Downtown" },
            { id: 3, name: "gamma", shelters: "Hillcrest" },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    shelters: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({
                    field: "shelters",
                    header: "Shelters",
                    editing: { triggers: { dblclick: { editor: dataTable.viewModel.editing.templatedCellEditor({ contentTemplates: sheltersTemplate }) } } },
                }),
            ],
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
import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellEditingDocTemplatedEngineViewModel", "templatedCellEditor (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## onRowUpdate

Called after a cell edit commits. Author an inline handler (V) or a ViewModel binding (B).

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `onRowUpdate` | `(args: { row: TRow; changedFields: readonly (keyof TRow)[] }) => Promise<void>` | no | V B | Runs after an edit commits, once the data engine has saved it. Use it to send the row elsewhere or react to the change. |

Examples for `onRowUpdate`:

Value (V):

```ts
// ViewModel
const { options } = createDataTable<Row>({
  onRowUpdate: async ({ row, changedFields }) => {
    console.log("row committed:", row, changedFields);
  },
});
```

Binding (B):

```ts
s.dataTable(dataTableOptions<Row>({
  onRowUpdate: { binding: "handleRowUpdate" },
}));

// ViewModel
async handleRowUpdate(args: {
  readonly row: Row;
  readonly changedFields: readonly (keyof Row)[];
}): Promise<void> {
  console.log("row committed:", args);
}
```

## Related

- [cell-editing-global-editable-config](cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [types](types.md): the declarations of the types used here, `IPersistenceEngine`, `DataTableSavedState`, `FilterExpression`, `DataTableThemeStyling`; search it for a name rather than reading it whole
