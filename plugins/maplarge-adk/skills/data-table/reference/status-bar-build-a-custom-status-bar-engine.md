# Data Table - Status Bar/Footer - Build a Custom Status Bar Engine and more

<!-- Automatically generated, do not edit -->

## Build a Custom Status Bar Engine

Implement `StatusBarEngine` directly to fully control the DOM structure inside the status bar.

### Status bar render context

`StatusBarRenderContext` is passed to contentTemplates at mount time. Use bindings.scrollState.statusText to wire up the reactive text.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `scriptor` | `IRootScriptor<DataTableScriptorVM>` | yes | Scriptor for building status bar DOM content. |
| `bindings` | `DataTableBindings` | yes | Data table bindings, including scrollState.statusText for reactive status text. |

### Status bar engine

Implement `StatusBarEngine` with the following properties:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `formatStatusText` | `(args: StatusBarArgs) => string` | no | V B | Controls the text value. |
| `contentTemplates` | `(context: StatusBarRenderContext) => void` | no | V B | Controls the DOM structure rendered inside .ml-data-table-status-bar at mount time. |

### Custom Status Bar Engine Example

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import type { StatusBarRenderContext } from "data-ui/data-table";

export class ViewModel extends RaptorViewModel {
    public initialize(): void {
        this.update();
    }

    // functions can't live in a View definition, so the View binds to these
    public formatStatusText({ firstVisible, lastVisible, totalRows }: {
        readonly firstVisible: number;
        readonly lastVisible: number;
        readonly totalRows: number | undefined;
    }): string {
        const first = (firstVisible + 1).toLocaleString();
        const last = (lastVisible + 1).toLocaleString();
        const total = totalRows?.toLocaleString() ?? "?";
        return `${first}-${last} of ${total} records`;
    }

    public renderStatusBar({ scriptor, bindings }: StatusBarRenderContext): void {
        scriptor.strong({ text: "Viewing:" });
        scriptor.span({
            customCssClasses: "ml-dt-status-text",
            bindings: { text: bindings.scrollState.statusText },
        });
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
} from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = { id: number; name: string; region: string };

const rows: Row[] = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    name: "item-" + String(index + 1),
    region: ["North", "South", "East", "West"][index % 4],
}));

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        region: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "region", header: "Region" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocStatusBarCustomEngineView", "Status Bar - custom engine (View)");
    s.view("main", (s) => {
        s.div({ height: 240 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                storage: dataTable.view.storage.localStore({ prefix: "doc-status-bar-custom-engine" }),
                statusBar: {
                    formatStatusText: { binding: "formatStatusText" },
                    contentTemplates: { binding: "renderStatusBar" },
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
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, StatusBarArgs, StatusBarRenderContext } from "data-ui/data-table";

export type Row = { id: number; name: string; region: string };

const rows: Row[] = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    name: "item-" + String(index + 1),
    region: ["North", "South", "East", "West"][index % 4],
}));

const gridSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        region: schema.string(),
    },
});

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: gridSchema,
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({ field: "region", header: "Region" }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-status-bar-custom-engine-view-model" }),
            // on the ViewModel the callbacks are passed directly; no { binding } indirection
            statusBar: {
                formatStatusText: (args: StatusBarArgs): string => {
                    const first = (args.firstVisible + 1).toLocaleString();
                    const last = (args.lastVisible + 1).toLocaleString();
                    const total = args.totalRows?.toLocaleString() ?? "?";
                    return `${first}-${last} of ${total} records`;
                },
                contentTemplates: (context: StatusBarRenderContext): void => {
                    context.scriptor.strong({ text: "Viewing:" });
                    context.scriptor.span({
                        customCssClasses: "ml-dt-status-text",
                        bindings: { text: context.bindings.scrollState.statusText },
                    });
                },
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

import type { ViewModel } from "./view-model";

// schema, columns and the status bar all come from createDataTable
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocStatusBarCustomEngineViewModel", "Status Bar - custom engine (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 240 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

### Register a Named Status Bar Engine

A ViewModel can register status bar engines by name on createDataTable({ engines: { statusBar: { ... } } }), the same way data, filtering, storage and the other engine options accept custom factories. A View then selects one by name, without holding a reference to the engine itself.

In the View, select a registered engine with dataTable.view.statusBar.custom("name", args), which builds a { strategy: "name", args } reference. A registered name wins over the built-in viewportCountStatusBar.

```ts
// ViewModel
import { createDataTable } from "data-ui/data-table";
import type { StatusBarEngine, StatusBarRenderContext } from "data-ui/data-table";

const { options } = createDataTable<Row>({
    // data, schema, columns...
    engines: {
        statusBar: {
            selectionCount: (args: { readonly label?: string }): StatusBarEngine => ({
                contentTemplates: (context: StatusBarRenderContext) => {
                    context.scriptor.span({ text: args.label ?? "Selected" });
                    context.scriptor.span({ bindings: { text: context.bindings.scrollState.statusText } });
                },
            }),
        },
    },
});
this.dataTableOptions = options;

// View
s.dataTable(dataTableOptions<Row>({
    bindings: { data: "dataTableOptions" },
    statusBar: dataTable.view.statusBar.custom("selectionCount"),
    // ...or with args:
    // statusBar: dataTable.view.statusBar.custom("selectionCount", { label: "Rows" }),
}));
```

## Footer

The region beside the status bar. A FooterEngine controls what goes in it.

## Footer Engines

**Footer Engine Summary**:

| Name | Description |
| --- | --- |
| `footerToolbar` | Renders the built-in toolbar. |
| `footerTemplate` | Renders your own markup into the footer. |

## Engine: `footerToolbar`

Renders the built-in toolbar.

**Footer Toolbar Arg**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `showHideEmptyColumns` | `boolean` | no | `false` | V B | Shows a Hide Empty Columns checkbox, bound to the table's empty-column mode. What counts as empty is the emptyColumns option's engine. | `true` |
| `showSyncWithViewport` | `boolean` | no | `false` | V B | Shows a Sync With Viewport checkbox. | `true` |
| `syncIntegrationKey` | `string` | no | `"mapViewportSync"` | V B | Which integrations entry the checkbox toggles. | `"inset"` |
| `showExport` | `boolean` | no | `false` | V B | Shows an export button. See Exporting below. | `true` |

### Exporting

The export button dispatches the exportData action; onExport decides what that action does. Dispatch it from your own button, or from outside the table entirely, and exporting behaves the same.

Supported automatically on dataSourceData and dataStoreData, which open the standard export dialog on the rows the table is currently showing, filters and all. Other data engines require onExport. Without it, exporting does nothing and warns.

```ts
// opens the built-in dialog
const { options, store } = createDataTable<Row>({
    data: dataSourceData({ dataSource }),
    schema,
    footer: footerToolbar({ showExport: true }),
});

// or do it yourself
const { options, store } = createDataTable<Row>({
    data: dataSourceData({ dataSource }),
    schema,
    onExport: () => exportToMyBackend(store.getExportSource()),
    footer: footerToolbar({ showExport: true }),
});

// trigger it from anywhere
store.dispatch(actions.exportData());

// or skip the action and take the filtered source yourself
const source = store.getExportSource();
```

### Footer Toolbar Example

The toolbar sits to the right of the status bar. Check Sync With Viewport and the grid narrows to the map's bounds; pan the map to see it follow.

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

export type Row = { StopID: number; StopName: string; MUNIC_NAME: string };

export class ViewModel extends DynamicViewModel {
    public initialize(): void {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

const MAP_ID = "footerToolbarMapViewArm";

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        StopID: schema.number(),
        StopName: schema.string(),
        MUNIC_NAME: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "StopID", header: "Stop ID" }),
    column({ field: "StopName", header: "Stop Name" }),
    column({ field: "MUNIC_NAME", header: "Municipality" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocFooterToolbarView", "Footer - toolbar (View)");

    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            s.div({ height: 240 }).contentTemplates((mapHost) => {
                mapHost.raptorMap({
                    viewName: MAP_ID,
                    mapOptions: { mapId: MAP_ID, lat: 25.76, lng: -80.19, z: 11, api: "LEAFLET", composite: true, layers: [], drawings: [] },
                });
            });
            s.div({ height: 320, margin: { top: 2 } }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    data: dataTable.view.data.dataStoreData({ dataStore: { binding: "dataStore" }, dataSourceName: "busstops" }),
                    schema: gridSchema,
                    columns,
                    integrations: [{ engine: dataTable.view.integrations.mapViewportSync({ mapId: MAP_ID }), enabled: false }],
                    footer: dataTable.view.footer.footerToolbar({
                        showHideEmptyColumns: true,
                        showSyncWithViewport: true,
                        showExport: true,
                    }),
                }));
            });
        });
    });
    return s.commitPage();
}
```

**Example: Authored in the ViewModel**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, footerToolbar, mapViewportSync, schema } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { StopID: number; StopName: string; MUNIC_NAME: string };

const SOURCE = "busstops";
const MAP_ID = "footerToolbarMapViewModelArm";

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        this.dataStore.register({ name: SOURCE, dataSource: "ml_samples/Miami_Busstops" });

        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.dataStoreData({ dataStore: this.dataStore, dataSourceName: SOURCE }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    StopID: schema.number(),
                    StopName: schema.string(),
                    MUNIC_NAME: schema.string(),
                },
            }),
            columns: [
                column({ field: "StopID", header: "Stop ID" }),
                column({ field: "StopName", header: "Stop Name" }),
                column({ field: "MUNIC_NAME", header: "Municipality" }),
            ],
            integrations: [{ engine: mapViewportSync({ mapId: MAP_ID }), enabled: false }],
            footer: footerToolbar({
                showHideEmptyColumns: true,
                showSyncWithViewport: true,
                showExport: true,
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

const MAP_ID = "footerToolbarMapViewModelArm";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocFooterToolbarViewModel", "Footer - toolbar (ViewModel)");

    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            s.div({ height: 240 }).contentTemplates((mapHost) => {
                mapHost.raptorMap({
                    viewName: MAP_ID,
                    mapOptions: { mapId: MAP_ID, lat: 25.76, lng: -80.19, z: 11, api: "LEAFLET", composite: true, layers: [], drawings: [] },
                });
            });

            s.div({ height: 320, margin: { top: 2 } }).contentTemplates((s) => {
                s.dataTable({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "StopID", header: "Stop ID" }),
                        column({ field: "StopName", header: "Stop Name" }),
                        column({ field: "MUNIC_NAME", header: "Municipality" }),
                    ],
                });
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [status-bar-status-bar](status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
- [types](types.md): the declarations of the types used here, `StatusBarEngine`, `StatusBarRenderContext`, `StatusBarArgs`; search it for a name rather than reading it whole
