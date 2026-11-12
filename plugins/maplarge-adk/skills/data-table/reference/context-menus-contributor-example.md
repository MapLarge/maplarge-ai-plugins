# Data Table - Context Menus - Contributor example and more

<!-- Automatically generated, do not edit -->

## Contributor example

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { actions } from "data-ui/data-table";
import type { Renderer } from "raptor/renderer/Renderer";
import type {
    CellContextMenuContext,
    HeaderContextMenuContext,
} from "data-ui/data-table";

// contributors are functions, so they cannot live in the View definition;
// the View references these methods with { binding: "..." }
export class ViewModel extends RaptorViewModel {
    extraHeaderItems({ column, onAction }: HeaderContextMenuContext): readonly Renderer.IMenuItem[] {
        return [
            {
                type: "action",
                label: "Export Column: " + column.key,
                onClick: () => { console.log("export column", column.key); },
            },
            ...(column.field !== undefined
                ? [{
                    type: "action" as const,
                    label: "Sort Asc (custom)",
                    onClick: () => {
                        onAction(actions.sort({
                            sort: { key: column.key, field: column.field, direction: "asc" },
                        }));
                    },
                }]
                : []),
        ];
    }

    extraCellItems({ displayText, rowIndex, column, onAction }: CellContextMenuContext): readonly Renderer.IMenuItem[] {
        return [
            {
                type: "action",
                label: "Search: " + displayText,
                onClick: () => { console.log("search", displayText); },
            },
            ...(rowIndex !== undefined
                ? [{
                    type: "action" as const,
                    label: "Edit Row (custom)",
                    onClick: () => {
                        onAction(actions.startEdit({
                            rowIndex,
                            columnKey: column.key,
                            trigger: "contextMenu",
                        }));
                    },
                }]
                : []),
        ];
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

import type { ViewModel } from "./view-model";

type Row = {
    id: number;
    name: string;
    status: "active" | "paused" | "error";
};

const rows: Row[] = [
    { id: 1, name: "alpha", status: "active" },
    { id: 2, name: "beta", status: "paused" },
    { id: 3, name: "gamma", status: "error" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number({ editing: { descriptor: { type: "Number" } } }),
        name: schema.string({ editing: { descriptor: { type: "Text" } } }),
        status: schema.string({ editing: { descriptor: { type: "Text" } } }),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

// the "Edit Row (custom)" contributor dispatches startEdit with trigger "contextMenu",
// so every column it can target must declare that trigger
const editor = dataTable.view.editing.descriptorCellEditor({ placement: "inline", onBlur: "commit" });
const editable = { triggers: { dblclick: { editor }, contextMenu: { editor } } };

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocContextMenusViewArm", "Context Menus, View arm");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                editable: { optimisticUpdate: true },
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
                storage: dataTable.view.storage.localStore({ prefix: "doc-context-menus-v" }),
                headerContextMenu: dataTable.view.contextMenu.headerContextMenuEngine(),
                cellContextMenu: dataTable.view.contextMenu.cellContextMenuEngine(),
                // contributor functions live on the ViewModel; the View binds them by name
                headerContextMenuItems: [{ binding: "extraHeaderItems" }],
                cellContextMenuItems: [{ binding: "extraCellItems" }],
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(90), sort: true, editing: editable }),
                    column({ field: "name", header: "Name", width: toPixels(180), sort: true, filtering: true, editing: editable }),
                    column({ field: "status", header: "Status", width: toPixels(160), sort: true, filtering: true, editing: editable }),
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
    createDataTable,
    dataTable,
    schema,
    toPixels,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";
import type { Renderer } from "raptor/renderer/Renderer";
import type {
    CellContextMenuContext,
    HeaderContextMenuContext,
} from "data-ui/data-table";

export type Row = {
    id: number;
    name: string;
    status: "active" | "paused" | "error";
};

const rows: Row[] = [
    { id: 1, name: "alpha", status: "active" },
    { id: 2, name: "beta", status: "paused" },
    { id: 3, name: "gamma", status: "error" },
];

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const gridSchema = dataTable.viewModel.schema.createSchema({
            entries: {
                id: schema.number({ editing: { descriptor: { type: "Number" } } }),
                name: schema.string({ editing: { descriptor: { type: "Text" } } }),
                status: schema.string({ editing: { descriptor: { type: "Text" } } }),
            },
        });
        const { column } = dataTable.viewModel.defineColumns<Row>();
        // the "Edit Row (custom)" contributor dispatches startEdit with trigger "contextMenu",
        // so every column it can target must declare that trigger
        const editor = dataTable.viewModel.editing.descriptorCellEditor({ placement: "inline", onBlur: "commit" });
        const editable = { triggers: { dblclick: { editor }, contextMenu: { editor } } };
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: gridSchema,
            editable: { optimisticUpdate: true },
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-context-menus-b" }),
            columns: [
                column({ field: "id", header: "ID", width: toPixels(90), sort: true, editing: editable }),
                column({ field: "name", header: "Name", width: toPixels(180), sort: true, filtering: true, editing: editable }),
                column({ field: "status", header: "Status", width: toPixels(160), sort: true, filtering: true, editing: editable }),
            ],
        });
        this.dataTableOptions = options;
        this.update();
    }

    headerContextMenu() {
        return dataTable.viewModel.contextMenu.headerContextMenuEngine();
    }

    cellContextMenu() {
        return dataTable.viewModel.contextMenu.cellContextMenuEngine();
    }

    extraHeaderItems({ column, onAction }: HeaderContextMenuContext): readonly Renderer.IMenuItem[] {
        return [
            {
                type: "action",
                label: "Export Column: " + column.key,
                onClick: () => { console.log("export column", column.key); },
            },
            ...(column.field !== undefined
                ? [{
                    type: "action" as const,
                    label: "Sort Asc (custom)",
                    onClick: () => {
                        onAction(actions.sort({
                            sort: { key: column.key, field: column.field, direction: "asc" },
                        }));
                    },
                }]
                : []),
        ];
    }

    extraCellItems({ displayText, rowIndex, column, onAction }: CellContextMenuContext): readonly Renderer.IMenuItem[] {
        return [
            {
                type: "action",
                label: "Search: " + displayText,
                onClick: () => { console.log("search", displayText); },
            },
            ...(rowIndex !== undefined
                ? [{
                    type: "action" as const,
                    label: "Edit Row (custom)",
                    onClick: () => {
                        onAction(actions.startEdit({
                            rowIndex,
                            columnKey: column.key,
                            trigger: "contextMenu",
                        }));
                    },
                }]
                : []),
        ];
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
    s.page("DataDocContextMenusBindingArm", "Context Menus, Binding arm");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                headerContextMenu: { binding: "headerContextMenu" },
                cellContextMenu: { binding: "cellContextMenu" },
                headerContextMenuItems: [{ binding: "extraHeaderItems" }],
                cellContextMenuItems: [{ binding: "extraCellItems" }],
            }));
        });
    });
    return s.commitPage();
}
```

### Scroll dismiss thresholds

`contextMenuScrollDismissX` and `contextMenuScrollDismissY` control how far the user can scroll before an open menu closes.

## Register a Named Context Menu Engine

A context menu engine is a class, so it must be built in the ViewModel. Register the factory by name on createDataTable({ engines: { cellContextMenu: { ... } } }) and select it from the View with dataTable.view.contextMenu.custom("name", args). Use engines.headerContextMenu for the header menu.

**Example: Custom Cell Context Menu Engine**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type { RaptorDom } from "raptor/raptorDom/RaptorDom";
import type { Renderer } from "raptor/renderer/Renderer";
import type {
    CellContextMenuContext,
    CellContextMenuContributor,
    CellContextMenuEngine,
    DataTableOptions,
} from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string };

const rows: Row[] = [
    { id: 1, name: "alpha" },
    { id: 2, name: "beta" },
    { id: 3, name: "gamma" },
];

// a minimal engine without the built-in Copy item; the table still adds its own contributors, such as Edit
class MinimalCellContextMenuEngine implements CellContextMenuEngine {
    private readonly contributors: CellContextMenuContributor[] = [];
    private readonly title: string;

    constructor(args: { title?: string }) {
        this.title = args.title ?? "Actions";
    }

    public addContributor(contributor: CellContextMenuContributor): { dispose(): void } {
        this.contributors.push(contributor);
        return {
            dispose: () => {
                const index = this.contributors.indexOf(contributor);
                if (index >= 0) this.contributors.splice(index, 1);
            },
        };
    }

    public show({ ev, ctx, raptorDom, tracker }: { ev: MouseEvent; ctx: CellContextMenuContext; raptorDom: RaptorDom; tracker: { track(render: () => void): void } }): void {
        const items = this.contributors.flatMap((contribute) => [...contribute(ctx)]);
        tracker.track(() => raptorDom.renderer.renderContextMenu({
            posX: ev.clientX,
            posY: ev.clientY,
            items: [{ type: "heading", label: this.title }, ...items],
        }));
    }
}

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        // register the factory by name; the View selects it with contextMenu.custom("minimal", { ... })
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                },
            }),
            engines: {
                cellContextMenu: {
                    minimal: (args: { title?: string }) => new MinimalCellContextMenuEngine(args),
                },
            },
        });
        this.dataTableOptions = options;
        this.update();
    }

    public extraCellItems({ displayText }: CellContextMenuContext): readonly Renderer.IMenuItem[] {
        return [{ type: "action", label: "Copy: " + displayText, onClick: () => { console.log("copy", displayText); } }];
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomCellContextMenuEngine", "Custom Cell Context Menu Engine");
    s.view("main", (s) => {
        s.div({ height: 280 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                // select the registered engine by name; the ref stays serializable
                cellContextMenu: dataTable.view.contextMenu.custom("minimal", { title: "Row actions" }),
                cellContextMenuItems: [{ binding: "extraCellItems" }],
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(90) }),
                    column({ field: "name", header: "Name", width: toPixels(200) }),
                ],
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [context-menus-context-menu-engines](context-menus-context-menu-engines.md): Context Menus - Context Menu Engines and more
