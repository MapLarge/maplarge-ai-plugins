# Data Table - Cell Editing - Cell Editing Example

<!-- Automatically generated, do not edit -->

## Cell Editing Example

Double-click any cell to start editing.

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { dataTable } from "data-ui/data-table";

export type Row = { id: string; name: string; notes: string; status: string };

export class ViewModel extends RaptorViewModel {
    // templated editors wrap a live callback, so this one is built here and named from the View
    readonly statusEditor = dataTable.viewModel.editing.templatedCellEditor({
        contentTemplates: dataTable.viewModel.editing.cellEditorContent(({ s, bindingPaths }) => {
            s.quickSelect({
                labelProperty: "label",
                valueProperty: "value",
                clearable: false,
                bindings: { items: "statusOptions", value: bindingPaths.editValue },
                events: [{ event: "change", handler: bindingPaths.handlers.commitEdit }],
            });
        }),
    });

    readonly statusOptions = [
        { label: "Planned", value: "Planned" },
        { label: "In Progress", value: "In Progress" },
        { label: "Done", value: "Done" },
        { label: "Blocked", value: "Blocked" },
    ];

    readonly displayStatus = ({ value }: { value: string | string[] }): string =>
        Array.isArray(value) ? (value[0] ?? "") : value;

    async handleRowUpdate(args: { row: Row; changedFields: readonly (keyof Row)[] }): Promise<void> {
        console.log("row committed:", args);
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
    toPixels,
} from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const sampleRows: Row[] = [
    { id: "1", name: "Redesign homepage",   notes: "Update hero section and nav.",  status: "In Progress" },
    { id: "2", name: "Write release notes", notes: "Cover v2.4 and v2.5.",          status: "Planned" },
    { id: "3", name: "Fix login bug",       notes: "OAuth token refresh issue.",     status: "Done" },
    { id: "4", name: "Add dark mode",       notes: "CSS variable overrides.",        status: "Blocked" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        name:   schema.string(),
        notes:  schema.string(),
        status: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

const nameEditor  = dataTable.view.editing.descriptorCellEditor({ placement: "inline", onBlur: "commit" });
const notesEditor = dataTable.view.editing.dialogCellEditor({ dialogOptions: { width: 460, height: 280 } });

const columns = [
    column({ field: "name",   header: "Name - inline",      width: toPixels(220), editing: { triggers: { dblclick: { editor: nameEditor } } } }),
    column({ field: "notes",  header: "Notes - dialog",     width: toPixels(240), editing: { triggers: { dblclick: { editor: notesEditor } } } }),
    column({
        field: "status",
        header: "Status - QuickSelect",
        width: toPixels(200),
        customSlotCssClasses: "p-0",
        transformValue: { binding: "displayStatus" },
        // templated editor lives on the ViewModel; named here
        editing: { triggers: { dblclick: { editor: { binding: "statusEditor" } } } },
    }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCellEditors", "Cell Editors");
    s.view("main", (s) => {
        s.div({ padding: { around: 2 } }).contentTemplates((s) => {
            s.div({ height: 250 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    data: dataTable.view.data.arrayData({ data: sampleRows }),
                    schema: gridSchema,
                    columns,
                    onRowUpdate: { binding: "handleRowUpdate" },
                    rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(25) }),
                    storage: dataTable.view.storage.noPersistence(),
                }));
            });
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
    toPixels,
} from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const sampleRows: Row[] = [
    { id: "1", name: "Redesign homepage", notes: "Update hero section and nav.", status: "In Progress" },
    { id: "2", name: "Write release notes", notes: "Cover v2.4 and v2.5.", status: "Planned" },
    { id: "3", name: "Fix login bug", notes: "OAuth token refresh issue.", status: "Done" },
    { id: "4", name: "Add dark mode", notes: "CSS variable overrides.", status: "Blocked" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: { name: schema.string(), notes: schema.string(), status: schema.string() },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const nameEditor = dataTable.view.editing.descriptorCellEditor({ placement: "inline", onBlur: "commit" });
const notesEditor = dataTable.view.editing.dialogCellEditor({ dialogOptions: { width: 460, height: 280 } });

const columns = [
    column({ field: "name", header: "Name - inline", width: toPixels(220) }),
    column({ field: "notes", header: "Notes - dialog", width: toPixels(240) }),
    column({ field: "status", header: "Status - QuickSelect", width: toPixels(200), customSlotCssClasses: "p-0", transformValue: { binding: "displayStatus" } }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCellEditorsRule", "Cell Editors, rule");
    s.view("main", (s) => {
        s.div({ padding: { around: 2 } }).contentTemplates((s) => {
            s.div({ height: 250 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    data: dataTable.view.data.arrayData({ data: sampleRows }),
                    schema: gridSchema,
                    columns,
                    editable: {
                        triggers: ["dblclick"],
                        rules: [
                            { match: { type: "exact", value: "name" }, editor: nameEditor },
                            { match: { type: "exact", value: "notes" }, editor: notesEditor },
                            { match: { type: "exact", value: "status" }, editor: { binding: "statusEditor" } },
                        ],
                    },
                    onRowUpdate: { binding: "handleRowUpdate" },
                    rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(25) }),
                    storage: dataTable.view.storage.noPersistence(),
                }));
            });
        });
    });
    return s.commitPage();
}
```

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    dataTable,
    type EditableConfig,
} from "data-ui/data-table";

export type Row = { id: string; name: string; notes: string; status: string };

const statusTemplate = dataTable.viewModel.editing.cellEditorContent(({ s, bindingPaths }) => {
    s.quickSelect({
        labelProperty: "label",
        valueProperty: "value",
        clearable: false,
        bindings: { items: "statusOptions", value: bindingPaths.editValue },
        events: [{ event: "change", handler: bindingPaths.handlers.commitEdit }],
    });
});

export class ViewModel extends RaptorViewModel {
    readonly statusOptions = [
        { label: "Planned", value: "Planned" },
        { label: "In Progress", value: "In Progress" },
        { label: "Done", value: "Done" },
    ];

    readonly displayStatus = ({ value }: { value: string | string[] }): string =>
        Array.isArray(value) ? (value[0] ?? "") : value;

    // a binding names a member that holds the config; a method is not called
    readonly editableConfig: EditableConfig = {
        triggers: ["dblclick"],
        rules: [
            { match: { type: "exact", value: "name" }, editor: dataTable.view.editing.descriptorCellEditor({ placement: "inline", onBlur: "commit" }) },
            { match: { type: "exact", value: "notes" }, editor: dataTable.view.editing.dialogCellEditor({ dialogOptions: { width: 460, height: 280 } }) },
            { match: { type: "exact", value: "status" }, editor: dataTable.viewModel.editing.templatedCellEditor({ contentTemplates: statusTemplate }) },
        ],
    };

    async handleRowUpdate(args: { row: Row; changedFields: readonly (keyof Row)[] }): Promise<void> {
        console.log("row committed:", args);
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const sampleRows: Row[] = [
    { id: "1", name: "Redesign homepage", notes: "Update hero section and nav.", status: "In Progress" },
    { id: "2", name: "Write release notes", notes: "Cover v2.4 and v2.5.", status: "Planned" },
    { id: "3", name: "Fix login bug", notes: "OAuth token refresh issue.", status: "Done" },
    { id: "4", name: "Add dark mode", notes: "CSS variable overrides.", status: "Blocked" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: { name: schema.string(), notes: schema.string(), status: schema.string() },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "name", header: "Name - inline", width: toPixels(220) }),
    column({ field: "notes", header: "Notes - dialog", width: toPixels(240) }),
    column({ field: "status", header: "Status", width: toPixels(200), transformValue: { binding: "displayStatus" } }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCellEditorsBinding", "Cell Editors, binding");
    s.view("main", (s) => {
        s.div({ padding: { around: 2 } }).contentTemplates((s) => {
            s.div({ height: 250 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    data: dataTable.view.data.arrayData({ data: sampleRows }),
                    schema: gridSchema,
                    columns,
                    editable: { binding: "editableConfig" },
                    onRowUpdate: { binding: "handleRowUpdate" },
                    rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(25) }),
                    storage: dataTable.view.storage.noPersistence(),
                }));
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [cell-editing-global-editable-config](cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
