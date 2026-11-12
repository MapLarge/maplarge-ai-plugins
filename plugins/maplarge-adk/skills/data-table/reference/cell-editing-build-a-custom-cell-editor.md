# Data Table - Cell Editing - Build a Custom Cell Editor

<!-- Automatically generated, do not edit -->

## Build a Custom Cell Editor

Custom editors have two parts: a serializable descriptor (CellEditorDef) used in the column config, and a CellEditorRegistration that builds the live editor from that descriptor. Registrations are passed via `createDataTable({ cellEditors })` on the ViewModel - built-in editors need no registration.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `cellEditors` | `Record<string, CellEditorRegistration>` | no | Custom cell editor registry. createDataTable-only; reference editor kinds from column `editing` triggers. |

### Cell editor contract

Implement `CellEditor` with the following methods:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `initialize` | `(context: CellEditorInitContext) => void` | no | Called after setup and again on every table refresh (after a sort, filter or column visibility change). It runs once per editor instance each time. Keep it safe to repeat: only store the context, and add no listeners or subscriptions here. |
| `startEdit` | `(context: CellEditorStartContext) => void` | yes | Start an edit session. Mount editor UI into cellElement or open a dialog. |
| `getEditValue` | `() => unknown` | yes | Pure read. Return the current edited value. The table calls it when Enter commits, in the cellEditor.commitEdit handler and in store.commitCurrentEdit(); an editor that dispatches actions.commitEdit({ newValue }) itself supplies the value and is not asked. |
| `endEdit` | `() => void` | yes | Cleanup only. Remove editor DOM or tear down Raptor content. Called once after a commit has been handled. It runs in a microtask after the commit. |
| `cancelEdit` | `() => void` | yes | Cleanup only. Same as endEdit but invoked on cancel. Do not dispatch updateRow here. It is also called when another edit starts, when the table is destroyed, and when a commit leaves a unit column's value untouched. |
| `syncDialogs` | `() => void` | no | Called after every DataTable refresh to synchronize open dialog state. |
| `destroy` | `() => void` | no | Called when the DataTable is torn down. Release any subscriptions or global listeners. |
| `optimisticUpdate` | `boolean` | no | When true, the DataTable immediately patches the segment cache and re-renders the row after commit, before the updateRow handler completes. |

### Init context

`CellEditorInitContext` is passed to CellEditor.initialize:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `store` | `DataTableStore` | yes | Store interop package for dispatching actions and reading state/selectors. |
| `raptorDom` | `RaptorDom` | no | The host RaptorDom instance. Available when the DataTable is mounted inside a Raptor view. |
| `hostViewModel` | `RaptorViewModel` | no | The host view model. Available when the DataTable is mounted inside a Raptor view. |
| `schema` | `Schema` | yes | The DataTable schema. Use to query column types via schema.getEditType. |

### Start context

`CellEditorStartContext` is passed to CellEditor.startEdit:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `rowIndex` | `GlobalRowIndex` | yes | Global row index of the row being edited. |
| `columnKey` | `string` | yes | Key of the column being edited. |
| `field` | `string \| undefined` | yes | Data field name on the row object. Undefined for virtual columns. |
| `editType` | `string \| undefined` | yes | Schema-declared column type (e.g. "string", "number"). Used to infer input type. |
| `getColumnTypeDefinition` | `(editType: string \| undefined) => ColumnTypeDefinition` | yes | Resolves the column type definition for the current edit type, including built-in fallback behavior. |
| `row` | `UnknownObject` | yes | Full row data at the time editing starts. |
| `pristineValue` | `unknown` | yes | The cell value before any edits. |
| `displayValue` | `unknown` | yes | The rendered display value (after transform, if any). |
| `cellElement` | `HTMLElement \| undefined` | yes | The DOM cell element. Undefined when the cell is not currently rendered. For example a programmatic startEdit on a row scrolled out of view; inline and popover editors should return early then. |
| `trigger` | `EditTrigger` | yes | The trigger that started the editing: "dblclick", "enter", "contextMenu", or "programmatic". |
| `getPendingEditValue` | `() => unknown` | yes | Reads extensions.cellEditor.pendingEditValue from the latest ViewModel. Useful in contentTemplates-based editors. |

### Custom Cell Editor Example

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    actions,
    ArrayDataEngine,
    createDataTable,
    dataTable,
    schema,
    toPixels,
    type CellEditor,
    type CellEditorDef,
    type CellEditorInitContext,
    type CellEditorRegistration,
    type CellEditorStartContext,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { id: string; name: string; notes: string };

export interface MyEditorDef extends CellEditorDef {
    readonly kind: "myEditor";
    readonly placeholder?: string;
}

class MyEditor implements CellEditor {
    private inputElement: HTMLInputElement | undefined;
    private cellElement: HTMLElement | undefined;
    private cellContent: DocumentFragment | undefined;
    private store: CellEditorInitContext["store"] | undefined;
    private readonly placeholder: string | undefined;
    private finished = false;

    public constructor(args: { readonly placeholder: string | undefined }) {
        this.placeholder = args.placeholder;
    }

    public initialize({ store }: CellEditorInitContext): void {
        this.store = store;
    }

    public startEdit({ cellElement, pristineValue }: CellEditorStartContext): void {
        if (cellElement === undefined) return;
        this.finished = false;

        const inputElement = document.createElement("input");
        inputElement.value = String(pristineValue ?? "");
        inputElement.placeholder = this.placeholder ?? "";
        inputElement.className = "form-control form-control-sm";
        inputElement.style.width = "100%";
        const finish = (mode: "commit" | "cancel"): void => {
            if (this.finished) return;
            this.finished = true;
            if (mode === "commit") {
                this.store?.dispatch(actions.commitEdit({ newValue: inputElement.value }));
            } else {
                this.store?.dispatch(actions.cancelEdit());
            }
        };
        inputElement.addEventListener("blur", () => { finish("commit"); });
        inputElement.addEventListener("keydown", (event) => {
            if (event.key === "Enter") finish("commit");
            if (event.key === "Escape") finish("cancel");
        });

        // keep the cell's own nodes; the table does not redraw the cell after a cancel
        this.cellElement = cellElement;
        this.cellContent = document.createDocumentFragment();
        this.cellContent.append(...Array.from(cellElement.childNodes));
        cellElement.appendChild(inputElement);
        inputElement.focus();
        inputElement.select();
        this.inputElement = inputElement;
    }

    public getEditValue(): unknown {
        return this.inputElement?.value ?? "";
    }

    public endEdit(): void {
        this.restoreCell();
    }

    public cancelEdit(): void {
        this.restoreCell();
    }

    private restoreCell(): void {
        if (this.cellElement !== undefined && this.cellContent !== undefined) this.cellElement.replaceChildren(this.cellContent);
        this.cellElement = undefined;
        this.cellContent = undefined;
        this.inputElement = undefined;
    }
}

const myEditorRegistration: CellEditorRegistration<MyEditorDef> = {
    kind: "myEditor",
    build: (editorDef) => new MyEditor({ placeholder: editorDef.placeholder }),
};

// the def is plain data, so a View can author it too
export const myEditor = (placeholder?: string): MyEditorDef => ({
    kind: "myEditor",
    ...(placeholder !== undefined ? { placeholder } : {}),
});

const rows: Row[] = [
    { id: "1", name: "Deploy checklist", notes: "Confirm release gates." },
    { id: "2", name: "Docs update", notes: "Sync API examples." },
];

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        // the editor builder is registered by kind; the View selects it with myEditor(...)
        const { options } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({ data: rows, getRowId: (row) => row.id }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    name: schema.string(),
                    notes: schema.string(),
                },
            }),
            cellEditors: { myEditor: myEditorRegistration },
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(30) }),
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
import { dataTable, dataTableOptions, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

// the def is plain data; a View builds it itself, since it can import only types from the ViewModel file
const myEditor = (placeholder?: string) => ({ kind: "myEditor", ...(placeholder !== undefined ? { placeholder } : {}) });

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomCellEditorView", "Custom editor selected on the View");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "name", header: "Task", width: toPixels(220), sort: true }),
                    column({
                        field: "notes",
                        header: "Notes (custom editor)",
                        width: toPixels(360),
                        sort: true,
                        // myEditor() returns a plain { kind, placeholder } def, so it serializes
                        editing: { triggers: { dblclick: { editor: myEditor("Enter notes") } } },
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
import {
    actions,
    ArrayDataEngine,
    createDataTable,
    dataTable,
    schema,
    toPixels,
    type CellEditor,
    type CellEditorDef,
    type CellEditorInitContext,
    type CellEditorRegistration,
    type CellEditorStartContext,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { id: string; name: string; notes: string };

export interface MyEditorDef extends CellEditorDef {
    readonly kind: "myEditor";
    readonly placeholder?: string;
}

class MyEditor implements CellEditor {
    private inputElement: HTMLInputElement | undefined;
    private cellElement: HTMLElement | undefined;
    private cellContent: DocumentFragment | undefined;
    private store: CellEditorInitContext["store"] | undefined;
    private readonly placeholder: string | undefined;
    private finished = false;

    public constructor(args: { readonly placeholder: string | undefined }) {
        this.placeholder = args.placeholder;
    }

    public initialize({ store }: CellEditorInitContext): void {
        this.store = store;
    }

    public startEdit({ cellElement, pristineValue }: CellEditorStartContext): void {
        if (cellElement === undefined) return;
        this.finished = false;

        const inputElement = document.createElement("input");
        inputElement.value = String(pristineValue ?? "");
        inputElement.placeholder = this.placeholder ?? "";
        inputElement.className = "form-control form-control-sm";
        inputElement.style.width = "100%";
        const finish = (mode: "commit" | "cancel"): void => {
            if (this.finished) return;
            this.finished = true;
            if (mode === "commit") {
                this.store?.dispatch(actions.commitEdit({ newValue: inputElement.value }));
            } else {
                this.store?.dispatch(actions.cancelEdit());
            }
        };
        inputElement.addEventListener("blur", () => { finish("commit"); });
        inputElement.addEventListener("keydown", (event) => {
            if (event.key === "Enter") finish("commit");
            if (event.key === "Escape") finish("cancel");
        });

        // keep the cell's own nodes; the table does not redraw the cell after a cancel
        this.cellElement = cellElement;
        this.cellContent = document.createDocumentFragment();
        this.cellContent.append(...Array.from(cellElement.childNodes));
        cellElement.appendChild(inputElement);
        inputElement.focus();
        inputElement.select();
        this.inputElement = inputElement;
    }

    public getEditValue(): unknown {
        return this.inputElement?.value ?? "";
    }

    public endEdit(): void {
        this.restoreCell();
    }

    public cancelEdit(): void {
        this.restoreCell();
    }

    private restoreCell(): void {
        if (this.cellElement !== undefined && this.cellContent !== undefined) this.cellElement.replaceChildren(this.cellContent);
        this.cellElement = undefined;
        this.cellContent = undefined;
        this.inputElement = undefined;
    }
}

const myEditorRegistration: CellEditorRegistration<MyEditorDef> = {
    kind: "myEditor",
    build: (editorDef) => new MyEditor({ placeholder: editorDef.placeholder }),
};

// the def is plain data, so a View can author it too
export const myEditor = (placeholder?: string): MyEditorDef => ({
    kind: "myEditor",
    ...(placeholder !== undefined ? { placeholder } : {}),
});

const rows: Row[] = [
    { id: "1", name: "Deploy checklist", notes: "Confirm release gates." },
    { id: "2", name: "Docs update", notes: "Sync API examples." },
];

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        // columns and editor selection both live here
        const { options } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({ data: rows, getRowId: (row) => row.id }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    name: schema.string(),
                    notes: schema.string(),
                },
            }),
            columns: [
                column({ field: "name", header: "Task", width: toPixels(220), sort: true }),
                column({
                    field: "notes",
                    header: "Notes (custom editor)",
                    width: toPixels(360),
                    sort: true,
                    editing: { triggers: { dblclick: { editor: myEditor("Enter notes") } } },
                }),
            ],
            cellEditors: { myEditor: myEditorRegistration },
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(30) }),
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

// schema, columns and the custom editor all come from createDataTable
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomCellEditorViewModel", "Custom editor on the ViewModel");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [cell-editing-global-editable-config](cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [types](types.md): the declarations of the types used here, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `FilterExpression`, `EditTrigger`, `CellEditorInitContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `ConfiguratorEngine`; search it for a name rather than reading it whole
