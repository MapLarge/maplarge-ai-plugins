# Data Table - Cell Editing - Global editable config and more

<!-- Automatically generated, do not edit -->

Cell editing is configured per column (`editing`) or globally (`editable`) inside `s.dataTable(dataTableOptions<TRow>({ ... }))`. Commits dispatch `onRowUpdate`. Use `createDataTable({ cellEditors })` on the ViewModel only when registering custom editor kinds.

## Global editable config

Set `editable: true` to enable descriptor-driven editing on every column, or pass an `EditableConfig` object to apply default triggers and per-column rules. Column-level `editing` always wins over global defaults.

Any `editable` value, object included, makes every column editable that does not set its own `editing`. Rules refine that per column: the first rule whose `match` fits a column wins, and `editor: false` keeps it read-only.

To edit only some columns, either set `editing: true` on those columns and leave `editable` out, or list rules for the editable columns and end with a catch-all `{ match: { type: "regex", pattern: "." }, editor: false }`.

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `editable` | `boolean \| EditableConfig \| ViewDefinitionBinding` | no | V B | Enable editing globally, pass an EditableConfig literal (V), or a binding to a ViewModel member that holds one (B). A method named by the binding is not called, and editing is then switched on for every column with the defaults. There is no rule form for the whole option: an object with where/applyValue is ignored and editing goes on for every column. Columns that match no rule get the default editor; the rules choose editors, they do not limit which columns edit. |

Examples for `editable`:

Value (V):

```ts
editable: {
  triggers: ["dblclick"],
  rules: [
    { match: { type: "exact", value: "name" }, editor: dataTable.view.editing.descriptorCellEditor({ placement: "inline" }) },
    { match: { type: "exact", value: "notes" }, editor: dataTable.view.editing.dialogCellEditor() },
  ],
}
```

Binding (B):

```ts
editable: { binding: "editableConfig" },

// ViewModel: a member that holds the config (a method is not called)
readonly editableConfig: EditableConfig = {
  triggers: ["dblclick"],
  rules: [
    { match: { type: "exact", value: "name" }, editor: dataTable.view.editing.descriptorCellEditor({ placement: "inline" }) },
    { match: { type: "exact", value: "notes" }, editor: dataTable.view.editing.dialogCellEditor() },
  ],
};
```

### EditableConfig

`EditableConfig` is the shape of the object passed to `editable` (V arm):

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `triggers` | `readonly EditTrigger[]` | no | V | Default triggers applied when a matched rule does not override them. Defaults to dblclick, enter, and contextMenu. |
| `optimisticUpdate` | `boolean` | no | V B | Applied to auto-picked descriptor editors when a rule does not override it. |
| `rules` | `readonly EditableRule[]` | no | V | Evaluated in order; first match wins per column. Each rule can set editor, triggers, or optimisticUpdate for matched columns. |

### EditableRule

**Editable Rule**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `match` | `ViewMatcher` | yes | V | Column matcher (e.g. { type: "exact", value: "fieldName" }). It is compared with the column's key, which is its field unless the column sets key. | `{ type: "exact", value: "fieldName" }` |
| `editor` | `CellEditorDef \| false \| ViewDefinitionBinding` | no | V B | Explicit editor, false for read-only, or omitted to use the default descriptorCellEditor. | `dataTable.view.editing.descriptorCellEditor()` |
| `triggers` | `readonly EditTrigger[]` | no | V | Overrides global triggers for columns matched by this rule. | - |
| `optimisticUpdate` | `boolean` | no | V | Overrides global optimisticUpdate for auto-picked editors on matched columns. | - |

## Cell Editing Engines

Built-in cell editors are configured per column trigger entry.

**Cell Editing Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `descriptorCellEditor` | Renders the column's registered descriptor input inline in the cell or in a popover. | Pass `dataTable.view.editing.descriptorCellEditor({... })` on a column trigger entry. |
| `dialogCellEditor` | Opens a dialog. | Pass `dataTable.view.editing.dialogCellEditor({... })` on a column trigger entry. |
| `templatedCellEditor` | Renders a contentTemplates callback inline in the cell (inlineCell: true) or in a floating popover anchored to the cell (default). | Pass `templatedCellEditor({ contentTemplates:... })` on a column trigger entry. |

## Column edit config

The `editing` property on a column maps each EditTrigger to editor configuration.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `editing` | `ColumnEditConfig \| boolean` | no | V B | Per-column editing configuration. true uses dataTable.view.editing.descriptorCellEditor() on the default triggers; false disables editing on the column. | `{ triggers: { dblclick: { editor: dataTable.view.editing.descriptorCellEditor() } } }` |

### Edit config

`ColumnEditConfig` is the shape of the column edit property:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `triggers` | `Partial<Record<EditTrigger, TriggerEditConfig>>` | yes | V B | Maps each EditTrigger to a TriggerEditConfig. Different triggers on the same column can use different editors. |

#### Triggers

**Edit Trigger Variant**:

| Variant | Description |
| --- | --- |
| `dblclick` | Double-clicking the cell. |
| `enter` | Pressing Enter when the cell is selected. |
| `contextMenu` | Right-clicking and choosing "Edit" from the context menu. |
| `programmatic` | Dispatching actions.startEdit() from code. The column has to list this trigger; the defaults (dblclick, enter, contextMenu) do not include it. Add it with editing: { triggers: { programmatic: { editor } } } or editable: { triggers: [..., "programmatic"] }. actions.startEdit({ rowIndex, columnKey, trigger }) starts an editor only for a trigger the column lists, and an unlisted trigger is cancelled with a console warning. |

### Trigger config

Each trigger entry is a `TriggerEditConfig` with an editor and optional transformEditValue binding:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `editor` | `CellEditorDef` | yes | V B | The editor descriptor to mount when this trigger fires. | `dataTable.view.editing.descriptorCellEditor()` |
| `transformEditValue` | `ViewDefinitionBinding` | no | B | Binding to a ViewModel method that transforms the post-coerce value before it is committed to the server. The method receives an EditTransformContext and returns the transformed value. Each trigger entry has its own transform, so different editors on the same column can apply different transforms. | - |

### Transform context

`EditTransformContext` is passed to transformEditValue:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `unknown` | yes | Post-coerce, pre-commit value. |
| `row` | `TRow` | yes | Pre-update row snapshot. |
| `field` | `string` | yes | Column field name. |
| `columnKey` | `string` | yes | Column key. |
| `rowIndex` | `GlobalRowIndex` | yes | Row position in the table as currently sorted and filtered. It is not an index into your own array. |
| `trigger` | `EditTrigger` | yes | The trigger that initiated the edit. |

## Engine: `descriptorCellEditor`

Renders the column's registered descriptor input inline in the cell (`placement: "inline"`) or in a popover anchored to the cell (the default for types like TextArea/DateTime/MultiSelect). Uses the full descriptor widget (number min/max, select options, etc.). Switch and Checkbox default inline and auto-commit after a short UI delay. Descriptor editors no longer show confirm/cancel buttons; commits happen through autoCommit and blur handling. It uses the descriptor on the column's schema entry, or else the default descriptor of the column's schema type, so most columns need no descriptor.

The schema entry's descriptor comes from schema.string({ editing: { descriptor } }) or defineColumnDescriptors; the type defaults are Text for string and geo, Number for number, DateTime for date, datetime and time, and Checkbox for boolean. If none resolves (a virtual column, or a column of type none), a warning is logged and no control is mounted, but the edit is not cancelled.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `placement` | `"inline" \| "popover"` | no | Where to mount the editor. When omitted, each descriptor type uses its own default (Text/Number/Select/Switch/Checkbox usually inline; TextArea/DateTime/MultiSelect usually popover). |
| `autoCommit` | `boolean \| { delayMs: number } \| { fallbackMs?: number; maxMs?: number; endBufferMs?: number }` | no | Overrides per-type auto-commit behavior. true commits immediately on value change; delayMs waits a fixed duration; an object without delayMs waits max(fallbackMs, computed CSS transition/animation duration + endBufferMs), capped by maxMs. |
| `onBlur` | `"commit" \| "cancel"` | no | What to do when focus leaves the editor. Defaults to "commit". Set to "cancel" to discard on blur. |
| `selectAllOnFocus` | `boolean` | no | When placement is inline, select all text when the input is focused. |
| `optimisticUpdate` | `boolean` | no | Immediately patch the segment cache and re-render the row after commit, before the server round-trip completes. |
| `cellTheme` | `DataTableThemeStyling` | no | Styling applied to the cell element while an inline edit is active. It goes on the cell's column slot element and is removed when the edit ends. |

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
    entries: {
        id: schema.number(),
        name: schema.string(),
        qty: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CellEditingDocDescriptorEngineView", "descriptorCellEditor (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({
                        field: "name",
                        header: "Name",
                        editing: { triggers: { dblclick: { editor: dataTable.view.editing.descriptorCellEditor({ placement: "inline", onBlur: "commit" }) } } },
                    }),
                    column({ field: "qty", header: "Qty" }),
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

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

const { column } = dataTable.viewModel.defineColumns<Row>();

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
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({
                    field: "name",
                    header: "Name",
                    editing: { triggers: { dblclick: { editor: dataTable.viewModel.editing.descriptorCellEditor({ placement: "inline", onBlur: "commit" }) } } },
                }),
                column({ field: "qty", header: "Qty" }),
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
    s.page("CellEditingDocDescriptorEngineViewModel", "descriptorCellEditor (ViewModel)");
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

## Related

- [cell-editing-dialog-cell-editor](cell-editing-dialog-cell-editor.md): Cell Editing - Engine: dialogCellEditor and more
- [cell-editing-cell-editing-example](cell-editing-cell-editing-example.md): Cell Editing - Cell Editing Example
- [cell-editing-build-a-custom-cell-editor](cell-editing-build-a-custom-cell-editor.md): Cell Editing - Build a Custom Cell Editor
- [types](types.md): the declarations of the types used here, `EditTrigger`, `ViewModelMatcher`, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `FilterExpression`, `CellEditorInitContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `ColumnEditConfig`, `EditTransformContext`, `DeclarativeRule`, `DataTableThemeStyling`; search it for a name rather than reading it whole
