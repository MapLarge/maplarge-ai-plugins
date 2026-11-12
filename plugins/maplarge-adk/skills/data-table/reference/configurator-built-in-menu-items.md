# Data Table - Configurator - Built-in Menu Items and more

<!-- Automatically generated, do not edit -->

The status-bar configurator button opens built-in grid-management actions by default.

## Built-in Menu Items

The default contextMenuConfigurator always shows built-in actions first, followed by any extra items you supply.

- Reset Table: clears sort, filters, column widths, and column visibility back to defaults.
- Reset Table dispatches actions.resetGrid(), which also puts the column order back and keeps constraints. It also puts headers, formatters and display units back to what the table declares, and clears the selection, any edit in progress, hide-empty-columns and the saved layout.
- Clear All Filters: shown only when at least one column is currently filtered.
- Show All Columns: shown only when at least one column is hidden.
- Configure Columns: opens the column picker. Dispatch actions.configureColumns() to open it from anywhere else.

## configurator.enabled

Controls whether the status-bar configurator button is shown.

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `enabled` | `boolean \| DeclarativeRule<boolean> \| ViewDefinitionBinding` | no | `true` | V B | Pass false to hide the button; omit or pass true for the default. |

Examples for `enabled`:

Value (V):

```ts
configurator: { enabled: false },
```

Binding (B):

```ts
configurator: {
    enabled: { binding: "showConfigurator" },
},
```

## Configurator Engines

A configurator engine controls what happens when the configurator button is clicked.

**Configurator Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `contextMenuConfigurator` | Default. Opens a context menu at the click position with built-in items and optional extras. | Pass `configurator: { engine: dataTable.view.configurator.contextMenuConfigurator({... }) }` on s.dataTable (or dataTable.viewModel.configurator.contextMenuConfigurator({... }) on createDataTable; omit for the default). |

## Engine: `contextMenuConfigurator`

Opens a context menu.

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `extraItems` | `(context: ConfiguratorEngineInitContext) => Renderer.IMenuItem[]` | no | - | V B | Returns additional items appended after the built-in ones. |
| `configureColumns` | `boolean` | no | `true` | V B | Pass false to leave Configure Columns out of the menu. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import type { Renderer } from "raptor/renderer/Renderer";

export class ViewModel extends DynamicViewModel {
    configuratorExtraItems(): readonly Renderer.IMenuItem[] {
        return [
            { type: "action", label: "Export CSV", onClick: () => alert("Export CSV clicked") },
            { type: "action", label: "Print View", onClick: () => alert("Print View clicked") },
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

type Row = { id: number; name: string; status: string };

const sampleRows: Row[] = [
    { id: 1, name: "alpha", status: "active" },
    { id: 2, name: "beta", status: "inactive" },
    { id: 3, name: "gamma", status: "active" },
    { id: 4, name: "delta", status: "active" },
    { id: 5, name: "epsilon", status: "inactive" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        status: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "status", header: "Status" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocConfiguratorContextMenuB", "Configurator, extra items (B)");
    s.view("main", (s) => {
        s.div({ height: toPixels(280) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: sampleRows }),
                schema: gridSchema,
                columns,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                storage: dataTable.view.storage.noPersistence(),
                configurator: {
                    engine: dataTable.view.configurator.contextMenuConfigurator({
                        extraItems: { binding: "configuratorExtraItems" },
                    }),
                },
            }));
        });
    });
    return s.commitPage();
}
```

**Example: Authored in the ViewModel**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import {
    createDataTable,
    dataTable,
    schema,
    toPixels,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { id: number; name: string; status: string };

const sampleRows: Row[] = [
    { id: 1, name: "alpha", status: "active" },
    { id: 2, name: "beta", status: "inactive" },
    { id: 3, name: "gamma", status: "active" },
    { id: 4, name: "delta", status: "active" },
    { id: 5, name: "epsilon", status: "inactive" },
];

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: sampleRows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    status: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({ field: "status", header: "Status" }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.noPersistence(),
            configurator: {
                engine: dataTable.viewModel.configurator.contextMenuConfigurator({
                    extraItems: () => [
                        { type: "action", label: "Export CSV", onClick: () => alert("Export CSV clicked") },
                        { type: "action", label: "Print View", onClick: () => alert("Print View clicked") },
                    ],
                }),
            },
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
import { toPixels } from "data-ui/data-table";

import type { ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocConfiguratorContextMenuV", "Configurator, extra items (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: toPixels(280) }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

### configurator.engine

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `engine` | `ConfiguratorEngine \| ConfiguratorEngineRef` | no | V B | Built-in engine ref via dataTable.view.configurator(...), a custom ConfiguratorEngine instance, or a ViewModel binding. The built-in ref is dataTable.view.configurator.contextMenuConfigurator(...); a registered custom engine is dataTable.view.configurator.custom("name"). A ConfiguratorEngine instance goes only in createDataTable; the View passes a binding that returns one. | `dataTable.view.configurator.contextMenuConfigurator()` |

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
    s.page("ConfiguratorDocEngineView", "Configurator Engine (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                configurator: { enabled: true, engine: dataTable.view.configurator.contextMenuConfigurator() },
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
            configurator: { enabled: true, engine: dataTable.viewModel.configurator.contextMenuConfigurator() },
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
    s.page("ConfiguratorDocEngineViewModel", "Configurator Engine (ViewModel)");
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

## Related

- [configurator-build-a-custom-configurator-engine](configurator-build-a-custom-configurator-engine.md): Configurator - Build a Custom Configurator Engine
- [types](types.md): the declarations of the types used here, `DeclarativeRule`, `ConfiguratorEngineInitContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `DataEngine`, `DiscoveredColumnEntry`, `FilterCapabilities`, `FilterExpression`, `DataFreshness`, `SortState`, `IPersistenceEngine`, `DataTableSavedState`, `ColumnBase`, `InlineContentTemplates`, `ColumnEditConfig`, `EditTransformContext`, `EditTrigger`, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `CellEditorInitContext`, `FormatterArgs`, `CellContext`, `ConfiguratorEngine`, `ConfiguratorEngineClickContext`; search it for a name rather than reading it whole
