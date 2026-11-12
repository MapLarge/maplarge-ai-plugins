# Data Table - Context Menus - Context Menu Engines and more

<!-- Automatically generated, do not edit -->

A data table has header and cell right-click menu engines.

## Context Menu Engines

**Context Menu Engine Summary**:

| Name | Description |
| --- | --- |
| `headerContextMenuEngine` | Right-click menus on column headers. Built-in sort, filter, and column visibility actions plus contributed items. |
| `cellContextMenuEngine` | Right-click menus on body cells. Built-in Copy and conditional Edit actions plus contributed items. |

### Configuration options

**Context Menu Option**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `headerContextMenu` | `HeaderContextMenuEngine \| HeaderContextMenuEngineRef` | no | V B | Header right-click menu engine. Omit for the built-in default, or pass dataTable.view.contextMenu.headerContextMenuEngine(). | `dataTable.view.contextMenu.headerContextMenuEngine()` |
| `cellContextMenu` | `CellContextMenuEngine \| CellContextMenuEngineRef` | no | V B | Body-cell right-click menu engine. Omit for the built-in default, or pass dataTable.view.contextMenu.cellContextMenuEngine(). | `dataTable.view.contextMenu.cellContextMenuEngine()` |
| `headerContextMenuItems` | `readonly HeaderContextMenuContributor[]` | no | V B | Extra contributors registered on the header menu engine. | - |
| `cellContextMenuItems` | `readonly CellContextMenuContributor[]` | no | V B | Extra contributors registered on the cell menu engine. | - |
| `arrangeHeaderContextMenuItems` | `ContextMenuItemsArranger` | no | V B | Optional final reorder pass for header menu items before render. | `(items) => [...items].sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""))` |
| `arrangeCellContextMenuItems` | `ContextMenuItemsArranger` | no | V B | Optional final reorder pass for cell menu items before render. | `(items) => [...items].reverse()` |
| `contextMenuScrollDismissX` | `number` | no | V B | Horizontal scroll distance (px) before an open context menu is dismissed. | - |
| `contextMenuScrollDismissY` | `number` | no | V B | Vertical scroll distance (px) before an open context menu is dismissed. | - |

Examples for `headerContextMenuItems`:

Binding (B):

```ts
// View
headerContextMenuItems: [{ binding: "extraHeaderItems" }],

// ViewModel
extraHeaderItems({ column }: HeaderContextMenuContext): readonly Renderer.IMenuItem[] {
    return [{ type: "action", label: "Pin " + column.key, onClick: () => {} }];
}
```

Examples for `cellContextMenuItems`:

Binding (B):

```ts
// View
cellContextMenuItems: [{ binding: "extraCellItems" }],

// ViewModel
extraCellItems({ displayText }: CellContextMenuContext): readonly Renderer.IMenuItem[] {
    return [{ type: "action", label: "Search: " + displayText, onClick: () => {} }];
}
```

Examples for `arrangeHeaderContextMenuItems`:

Value (V):

```ts
// ViewModel
arrangeHeaderContextMenuItems: (items) =>
    [...items].sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "")),
```

Binding (B):

```ts
arrangeHeaderContextMenuItems: { binding: "sortMenuItemsByLabel" },
```

Examples for `arrangeCellContextMenuItems`:

Value (V):

```ts
// ViewModel
arrangeCellContextMenuItems: (items) => [...items].reverse(),
```

Binding (B):

```ts
arrangeCellContextMenuItems: { binding: "reverseMenuItems" },
```

Examples for `contextMenuScrollDismissX`:

Value (V):

```ts
contextMenuScrollDismissX: 40,
```

Binding (B):

```ts
contextMenuScrollDismissX: { binding: "contextMenuScrollDismissX" },
```

Examples for `contextMenuScrollDismissY`:

Value (V):

```ts
contextMenuScrollDismissY: 40,
```

Binding (B):

```ts
contextMenuScrollDismissY: { binding: "contextMenuScrollDismissY" },
```

Default engines (omit both keys for the same result):

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

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ContextMenusDocEngineView", "Context Menu Engines (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: dataTable.view.schema.createSchema({ entries: { id: schema.number(), name: schema.string(), qty: schema.number() } }),
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                cellContextMenu: dataTable.view.contextMenu.cellContextMenuEngine(),
                headerContextMenu: dataTable.view.contextMenu.headerContextMenuEngine(),
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
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            cellContextMenu: dataTable.viewModel.contextMenu.cellContextMenuEngine(),
            headerContextMenu: dataTable.viewModel.contextMenu.headerContextMenuEngine(),
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
    s.page("ContextMenusDocEngineViewModel", "Context Menu Engines (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
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

## Engine: `headerContextMenuEngine`

Right-clicking a column header shows built-in actions plus any contributed items.

- Filter (only when the column is filterable)
- Sort Asc / Sort Desc (only when the column has a field and is sortable)
- Sort Asc and Sort Desc also show on a virtual column with a sortField, and not on a column with sort: false.
- Hide Column
- Show All Columns

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `arrange` | `ContextMenuItemsArranger` | no | V B | Optional final reorder pass for all header menu items before render. | `(items) => [...items].reverse()` |

**Header Context Menu Engine Method**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `addContributor` | `(c: HeaderContextMenuContributor) => { dispose(): void }` | yes | Register a contributor callback. Returns a dispose handle. |
| `show` | `(args: { ev: MouseEvent; ctx: HeaderContextMenuContext; raptorDom: RaptorDom; tracker: ContextMenuTracker; arrange?: ContextMenuItemsArranger }) => void` | yes | Collect contributor items and render the context menu. Render it through tracker.track(() => raptorDom.renderer.renderContextMenu({ ... })), so the table can close it when it is rebuilt or destroyed. The table registers its own header items (Filter, Sort Asc, Sort Desc, Hide Column, Show All Columns) as contributors on every engine. |

### Contributor context for header menus

`HeaderContextMenuContext` is passed to each header contributor callback:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `column` | `ContextMenuColumnInfo` | yes | Right-clicked column metadata. |
| `onAction` | `OnAction` | yes | Dispatch helper for DataTable actions from menu callbacks. |

### Column info

The `ContextMenuColumnInfo` on ctx.column is shared by header and cell contributors:

| Property | Type | Description |
| --- | --- | --- |
| `column.key` | `string` | Canonical key of the right-clicked column. |
| `column.header` | `string \| undefined` | Header label from the right-clicked column definition. |
| `column.field` | `string \| undefined` | Bound data field for data columns. Undefined for virtual columns. |

## Engine: `cellContextMenuEngine`

Right-clicking a body cell shows built-in actions plus any contributed items.

- Copy (writes the slot's trimmed display text to the clipboard)
- Edit (shown only when the column enables context-menu editing and a row is resolved)

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `arrange` | `ContextMenuItemsArranger` | no | V B | Optional final reorder pass for all cell menu items before render. | `(items) => [...items].reverse()` |

**Cell Context Menu Engine Method**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `addContributor` | `(c: CellContextMenuContributor) => { dispose(): void }` | yes | Register a contributor callback. Returns a dispose handle. |
| `show` | `(args: { ev: MouseEvent; ctx: CellContextMenuContext; raptorDom: RaptorDom; tracker: ContextMenuTracker; arrange?: ContextMenuItemsArranger }) => void` | yes | Collect contributor items and render the context menu. Render it through tracker.track(() => raptorDom.renderer.renderContextMenu({ ... })), so the table can close it when it is rebuilt or destroyed. Copy belongs to the built-in engine's show(); the table registers Edit (for columns with the contextMenu edit trigger) as a contributor on every engine. |

### Contributor context for cell menus

`CellContextMenuContext` is passed to each cell contributor callback:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `displayText` | `string` | yes | Trimmed text content of the right-clicked cell slot, the same value that Copy would write to the clipboard. |
| `rowIndex` | `GlobalRowIndex \| undefined` | yes | Global row index of the right-clicked cell. Undefined when the row slot is not mapped to a row. |
| `column` | `ContextMenuColumnInfo` | yes | Right-clicked column metadata. |
| `onAction` | `OnAction` | yes | Dispatch helper for DataTable actions from menu callbacks. |

## Related

- [context-menus-contributor-example](context-menus-contributor-example.md): Context Menus - Contributor example and more
- [types](types.md): the declarations of the types used here, `HeaderContextMenuEngine`, `CellContextMenuEngine`; search it for a name rather than reading it whole
