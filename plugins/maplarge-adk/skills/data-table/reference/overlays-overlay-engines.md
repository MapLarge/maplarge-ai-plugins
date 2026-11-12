# Data Table - Overlays - Overlay Engines and more

<!-- Automatically generated, do not edit -->

Data table overlays cover the table when:

- end-users should be prevented from interacting with the data
- there is no data to show due to a true empty table, filters, or errors

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
    type DataTableOptions,
    type DataTableStore,
    type OverlayType,
} from "data-ui/data-table";

export type Row = { readonly id: number; readonly status: string };

const overlayTypes: readonly OverlayType[] = ["loading", "noData", "noResults", "error"] as const;

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const { options, store } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({
                data: [
                    { id: 1, status: "active" },
                    { id: 2, status: "pending" },
                    { id: 3, status: "disabled" },
                ],
            }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    status: schema.string(),
                },
            }),
            testIds: true,
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public hideAllOverlays(): void {
        for (const overlayType of overlayTypes) {
            this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType }));
        }
    }

    private showOverlay(overlayType: OverlayType): void {
        this.hideAllOverlays();
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType }));
    }

    public showLoadingOverlay(): void { this.showOverlay("loading"); }
    public showNoDataOverlay(): void { this.showOverlay("noData"); }
    public showNoResultsOverlay(): void { this.showOverlay("noResults"); }
    public showErrorOverlay(): void { this.showOverlay("error"); }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocOverlaysMain", "Overlays");
    s.view("main", (s) => {
        s.div({ height: 520 }).contentTemplates((s) => {
            s.div({ height: 200 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    overlays: {
                        loading: dataTable.view.overlays.floatingBoxOverlayEngine({ spinner: true }),
                        noData: dataTable.view.overlays.floatingBoxOverlayEngine(),
                        noResults: dataTable.view.overlays.floatingBoxOverlayEngine({ text: "No rows match your filters" }),
                        error: dataTable.view.overlays.floatingBoxOverlayEngine(),
                    },
                    columns: [
                        column({ field: "id", header: "Id" }),
                        column({ field: "status", header: "Status" }),
                    ],
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show loading",
                    events: [{ event: "click", handler: "showLoadingOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no data",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoDataOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no results (custom text)",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoResultsOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show error",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showErrorOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Hide",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideAllOverlays" }],
                    kind: "secondary",
                });
            });
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
    type DataTableOptions,
    type DataTableStore,
    type OverlayType,
} from "data-ui/data-table";

export type Row = { readonly id: number; readonly status: string };

const overlayTypes: readonly OverlayType[] = ["loading", "noData", "noResults", "error"] as const;

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;

    public loadingOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine({ spinner: true });
    public noDataOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine();
    public errorOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine();

    // custom text
    public noResultsOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine({ text: "No rows match your filters" });

    public initialize(): void {
        const { options, store } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({
                data: [
                    { id: 1, status: "active" },
                    { id: 2, status: "pending" },
                    { id: 3, status: "disabled" },
                ],
            }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    status: schema.string(),
                },
            }),
            testIds: true,
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public hideAllOverlays(): void {
        for (const overlayType of overlayTypes) {
            this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType }));
        }
    }

    private showOverlay(overlayType: OverlayType): void {
        this.hideAllOverlays();
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType }));
    }

    public showLoadingOverlay(): void { this.showOverlay("loading"); }
    public showNoDataOverlay(): void { this.showOverlay("noData"); }
    public showNoResultsOverlay(): void { this.showOverlay("noResults"); }
    public showErrorOverlay(): void { this.showOverlay("error"); }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocOverlaysMain", "Overlays");
    s.view("main", (s) => {
        s.div({ height: 520 }).contentTemplates((s) => {
            s.div({ height: 200 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    overlays: {
                        loading:   { binding: "loadingOverlay" },
                        noData:    { binding: "noDataOverlay" },
                        noResults: { binding: "noResultsOverlay" },
                        error:     { binding: "errorOverlay" },
                    },
                    columns: [
                        column({ field: "id", header: "Id" }),
                        column({ field: "status", header: "Status" }),
                    ],
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show loading",
                    events: [{ event: "click", handler: "showLoadingOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no data",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoDataOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no results (custom text)",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoResultsOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show error",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showErrorOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Hide",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideAllOverlays" }],
                    kind: "secondary",
                });
            });
        });
    });
    return s.commitPage();
}
```

## Overlay Engines

Choose an overlay engine for each slot.

**Overlay Engine Summary**:

| Name | Description |
| --- | --- |
| `floatingBoxOverlayEngine` | Renders either a centered text box or a centered spinner. |
| `templateOverlayEngine` | Renders custom content built with a Raptor scriptor. |

## Engine: `floatingBoxOverlayEngine`

Renders either a centered text box or a centered spinner.

**Floating Box Overlay Engine Property**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `text` | `string` | no | `See table below` | V B | Label shown inside the floating box. When spinner is true, this renders below the spinner. | - |
| `spinner` | `boolean` | no | `false` | V B | When true, renders a spinner instead of the floating text box. | - |
| `spinnerOptions` | `ViewDefinitions.ISpinner<ForScriptorTrue \| ForScriptorFalse>` | no | `{}` | V | Options passed through to s.spinner(...) when spinner is true. | `{ textColor: "primary" }` |
| `coverage` | `OverlayCoverage` | no | `"full" ("body" for noData, noResults and error)` | V B | Container coverage. "body" leaves headers interactive. "body" covers only the scrolling rows and leaves the headers, filter indicators and footer interactive. | `"body"` |
| `containerTheme` | `DataTableThemeStyling` | no | `Semi-transparent (none for a custom slot)` | V | Theme to apply to the overlay container div. The four built-in slots are dimmed with a semi-transparent background; a custom slot has none until you add one with containerBaseTheme (for example { customCssClasses: "ml-dt-empty-overlay" }) or containerTheme. | `{ customCssClasses: "bg-light" }` |

### Default text by slot

| Slot | Default text | Default coverage |
| --- | --- | --- |
| `loading` | `"Spinner (no text)"` | `"full"` |
| `noData` | `"No data"` | `"body"` |
| `noResults` | `"No results match your filters"` | `"body"` |
| `error` | `"Error loading data"` | `"body"` |

The loading spinner with no text is shown only when overlays.loading is not set; a floatingBoxOverlayEngine you pass shows "Loading..." unless it sets spinner: true.

## Engine: `templateOverlayEngine`

Renders custom content built with a Raptor scriptor. Provide a contentTemplates callback that receives an OverlayRenderContext.

**Template Overlay Engine Property**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `contentTemplates` | `(context: OverlayRenderContext) => void` | yes | - | V B | Callback that receives an OverlayRenderContext and uses s (the scriptor) to declare inner elements. | - |
| `scope` | `Record<string, ViewDefinitionBinding>` | no | - | V | Map of named ViewModel property binding paths. Each key is surfaced as a resolved path string on bindingPaths.scope inside the callback. | - |
| `containerTheme` | `DataTableThemeStyling` | no | - | V | IViewDefinition properties spread onto the overlay container div. Use customCssClasses to apply a CSS class that controls the dimmer background and layout. Defaults to the built-in semi-transparent dimmer style (none for a custom slot). The four built-in slots are dimmed with a semi-transparent background; add one to a custom slot with containerBaseTheme or containerTheme. | `{ customCssClasses: "bg-light" }` |
| `coverage` | `OverlayCoverage` | no | `"full" ("body" for noData, noResults and error)` | V B | Container coverage. "body" leaves headers interactive. "body" covers only the scrolling rows and leaves the headers, filter indicators and footer interactive. | `"body"` |

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
    type DataTableOptions,
    type DataTableStore,
    type OverlayType,
} from "data-ui/data-table";

type Row = {
    readonly id: number;
    readonly status: string;
    readonly region: string;
};

const overlayTypes: readonly OverlayType[] = ["loading", "noData", "noResults", "error"] as const;

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;
    public loadingOverlayTitle = "Loading rows";
    public loadingOverlayMessage = "Waiting for rows...";
    public loadingOverlaySubText = "Data is loading in the background.";
    public noDataOverlayTitle = "No rows available";
    public noDataOverlayMessage = "This table has no rows yet.";
    public noDataOverlaySubText = "Try adding rows and refreshing this example.";
    public noResultsOverlayTitle = "No rows match your filters";
    public noResultsOverlayMessage = "Nothing matched the current filters.";
    public noResultsOverlaySubText = "Try clearing one filter to restore results.";
    public errorOverlayTitle = "Something went wrong";
    public errorOverlayMessage = "Please try again later.";
    public errorOverlaySubText = "If this persists, check the browser console for details.";

    public loadingOverlay = dataTable.viewModel.overlays.templateOverlayEngine({
        scope: {
            title: { binding: "loadingOverlayTitle" },
            message: { binding: "loadingOverlayMessage" },
            subText: { binding: "loadingOverlaySubText" },
        },
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({
                background: "primary",
                borderColor: "#3a78d8",
                borderWidth: 1,
                flex: { dInlineFlex: true, flexColumn: true, gap: 1 },
                padding: { x: 3, y: 2 },
                border: { rounded: 3 },
            }).contentTemplates((s) => {
                s.span({
                    bindings: { text: bindingPaths.scope.title },
                    fontWeight: "bold",
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.message },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.subText },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
            });
        },
        containerTheme: {
            background: "dark",
            backgroundOpacity: 25,
        },
    });

    public noDataOverlay = dataTable.viewModel.overlays.templateOverlayEngine({
        scope: {
            title: { binding: "noDataOverlayTitle" },
            message: { binding: "noDataOverlayMessage" },
            subText: { binding: "noDataOverlaySubText" },
        },
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({
                background: "success",
                borderColor: "#10b981",
                borderWidth: 1,
                flex: { dInlineFlex: true, flexColumn: true, gap: 1 },
                padding: { x: 3, y: 2 },
                border: { rounded: 3 },
            }).contentTemplates((s) => {
                s.span({
                    bindings: { text: bindingPaths.scope.title },
                    fontWeight: "bold",
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.message },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.subText },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
            });
        },
        containerTheme: {
            background: "dark",
            backgroundOpacity: 25,
        },
    });

    public noResultsOverlay = dataTable.viewModel.overlays.templateOverlayEngine({
        scope: {
            title: { binding: "noResultsOverlayTitle" },
            message: { binding: "noResultsOverlayMessage" },
            subText: { binding: "noResultsOverlaySubText" },
        },
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({
                background: "info",
                borderColor: "#6366f1",
                borderWidth: 1,
                flex: { dInlineFlex: true, flexColumn: true, gap: 1 },
                padding: { x: 3, y: 2 },
                border: { rounded: 3 },
            }).contentTemplates((s) => {
                s.span({
                    bindings: { text: bindingPaths.scope.title },
                    fontWeight: "bold",
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.message },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.subText },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
            });
        },
        containerTheme: {
            background: "dark",
            backgroundOpacity: 25,
        },
    });

    public errorOverlay = dataTable.viewModel.overlays.templateOverlayEngine({
        scope: {
            title: { binding: "errorOverlayTitle" },
            message: { binding: "errorOverlayMessage" },
            subText: { binding: "errorOverlaySubText" },
        },
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({
                background: "danger",
                borderColor: "#f43f5e",
                borderWidth: 1,
                flex: { dInlineFlex: true, flexColumn: true, gap: 1 },
                padding: { x: 3, y: 2 },
                border: { rounded: 3 },
            }).contentTemplates((s) => {
                s.span({
                    bindings: { text: bindingPaths.scope.title },
                    fontWeight: "bold",
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.message },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.subText },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
            });
        },
        containerTheme: {
            background: "dark",
            backgroundOpacity: 25,
        },
    });

    public initialize(): void {
        const { options, store } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({
                data: [
                    { id: 1, status: "active", region: "north" },
                    { id: 2, status: "pending", region: "south" },
                    { id: 3, status: "disabled", region: "east" },
                ],
            }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    status: schema.string(),
                    region: schema.string(),
                },
            }),
            testIds: true,
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public hideAllOverlays(): void {
        for (const overlayType of overlayTypes) {
            this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType }));
        }
    }

    private showOverlay(overlayType: OverlayType): void {
        this.hideAllOverlays();
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType }));
    }

    public showLoadingOverlay(): void { this.showOverlay("loading"); }
    public showNoDataOverlay(): void { this.showOverlay("noData"); }
    public showNoResultsOverlay(): void { this.showOverlay("noResults"); }
    public showErrorOverlay(): void { this.showOverlay("error"); }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomOverlaysEngine", "Overlays - templateOverlayEngine");
    s.view("main", (s) => {
        s.div({ height: 520 }).contentTemplates((s) => {
            s.div({ height: 200 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    overlays: {
                        loading:   { binding: "loadingOverlay" },
                        noData:    { binding: "noDataOverlay" },
                        noResults: { binding: "noResultsOverlay" },
                        error:     { binding: "errorOverlay" },
                    },
                    columns: [
                        column({ field: "id", header: "Id" }),
                        column({ field: "status", header: "Status" }),
                        column({ field: "region", header: "Region" }),
                    ],
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show loading",
                    events: [{ event: "click", handler: "showLoadingOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no data",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoDataOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no results",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoResultsOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show error",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showErrorOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Hide",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideAllOverlays" }],
                    kind: "secondary",
                });
            });
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
    type DataTableOptions,
    type DataTableStore,
    type OverlayType,
} from "data-ui/data-table";

export type Row = {
    readonly id: number;
    readonly status: string;
    readonly region: string;
};

const overlayTypes: readonly OverlayType[] = ["loading", "noData", "noResults", "error"] as const;

const buildTemplateOverlay = (
    background: string,
    borderColor: string,
    scope: {
        readonly title: { readonly binding: string };
        readonly message: { readonly binding: string };
        readonly subText: { readonly binding: string };
    },
) =>
    dataTable.viewModel.overlays.templateOverlayEngine({
        scope,
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({
                background,
                borderColor,
                borderWidth: 1,
                flex: { dInlineFlex: true, flexColumn: true, gap: 1 },
                padding: { x: 3, y: 2 },
                border: { rounded: 3 },
            }).contentTemplates((s) => {
                s.span({
                    bindings: { text: bindingPaths.scope.title },
                    fontWeight: "bold",
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.message },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
                s.span({
                    bindings: { text: bindingPaths.scope.subText },
                    textColor: "light",
                    fontSize: 5,
                    display: { dBlock: true },
                });
            });
        },
        containerTheme: {
            background: "dark",
            backgroundOpacity: 25,
        },
    });

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;
    public loadingOverlayTitle = "Loading rows";
    public loadingOverlayMessage = "Waiting for rows...";
    public loadingOverlaySubText = "Data is loading in the background.";
    public noDataOverlayTitle = "No rows available";
    public noDataOverlayMessage = "This table has no rows yet.";
    public noDataOverlaySubText = "Try adding rows and refreshing this example.";
    public noResultsOverlayTitle = "No rows match your filters";
    public noResultsOverlayMessage = "Nothing matched the current filters.";
    public noResultsOverlaySubText = "Try clearing one filter to restore results.";
    public errorOverlayTitle = "Something went wrong";
    public errorOverlayMessage = "Please try again later.";
    public errorOverlaySubText = "If this persists, check the browser console for details.";

    public initialize(): void {
        const { options, store } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({
                data: [
                    { id: 1, status: "active", region: "north" },
                    { id: 2, status: "pending", region: "south" },
                    { id: 3, status: "disabled", region: "east" },
                ],
            }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    status: schema.string(),
                    region: schema.string(),
                },
            }),
            overlays: {
                loading: buildTemplateOverlay("primary", "#3a78d8", {
                    title: { binding: "loadingOverlayTitle" },
                    message: { binding: "loadingOverlayMessage" },
                    subText: { binding: "loadingOverlaySubText" },
                }),
                noData: buildTemplateOverlay("success", "#10b981", {
                    title: { binding: "noDataOverlayTitle" },
                    message: { binding: "noDataOverlayMessage" },
                    subText: { binding: "noDataOverlaySubText" },
                }),
                noResults: buildTemplateOverlay("info", "#6366f1", {
                    title: { binding: "noResultsOverlayTitle" },
                    message: { binding: "noResultsOverlayMessage" },
                    subText: { binding: "noResultsOverlaySubText" },
                }),
                error: buildTemplateOverlay("danger", "#f43f5e", {
                    title: { binding: "errorOverlayTitle" },
                    message: { binding: "errorOverlayMessage" },
                    subText: { binding: "errorOverlaySubText" },
                }),
            },
            testIds: true,
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public hideAllOverlays(): void {
        for (const overlayType of overlayTypes) {
            this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType }));
        }
    }

    private showOverlay(overlayType: OverlayType): void {
        this.hideAllOverlays();
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType }));
    }

    public showLoadingOverlay(): void { this.showOverlay("loading"); }
    public showNoDataOverlay(): void { this.showOverlay("noData"); }
    public showNoResultsOverlay(): void { this.showOverlay("noResults"); }
    public showErrorOverlay(): void { this.showOverlay("error"); }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomOverlaysEngine", "Overlays - templateOverlayEngine");
    s.view("main", (s) => {
        s.div({ height: 520 }).contentTemplates((s) => {
            s.div({ height: 200 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "id", header: "Id" }),
                        column({ field: "status", header: "Status" }),
                        column({ field: "region", header: "Region" }),
                    ],
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show loading",
                    events: [{ event: "click", handler: "showLoadingOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no data",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoDataOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show no results",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showNoResultsOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Show error",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "showErrorOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Hide",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideAllOverlays" }],
                    kind: "secondary",
                });
            });
        });
    });
    return s.commitPage();
}
```

### Render context

`OverlayRenderContext` is passed to the templateOverlayEngine contentTemplates callback.

**Overlay Render Context Property**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `s` | `IRootScriptor<TViewModel>` | yes | Declare elements to build the overlay content. |
| `bindingPaths.scope` | `{ [K in keyof TScope]: string }` | yes | Resolved binding path strings for each key declared in the engine's scope option. Bind to these to access outer ViewModel properties. |

## Overlays configuration

Map each built-in or custom slot on `s.dataTable({ overlays: { ... } })`. Pass an engine instance or a `{ strategy, args }` reference (V), or `{ binding: "viewModelProperty" }` (B). View-side config wins per slot when both surfaces set `overlays`.

Build the reference with dataTable.view.overlays.floatingBoxOverlayEngine(...), dataTable.view.overlays.templateOverlayEngine(...) or dataTable.view.overlays.custom("name", args).

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `overlays` | `Partial<Record<OverlayType \| string, OverlayEngine>>` | no | V B | Per-slot overlay engine. Built-in slots: loading, noData, noResults, error. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { actions, createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2 },
            { id: 2, name: "beta", qty: 5 },
            { id: 3, name: "gamma", qty: 9 },
        ];
        // no overlays here - the View authors them
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public showLoadingOverlay(): void {
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType: "loading" }));
    }

    public hideLoadingOverlay(): void {
        this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType: "loading" }));
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("OverlaysDocConfigView", "Overlays Configuration (View)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.div({ height: 260 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "id", header: "ID" }),
                        column({ field: "name", header: "Name" }),
                        column({ field: "qty", header: "Qty" }),
                    ],
                    overlays: {
                        loading: dataTable.view.overlays.floatingBoxOverlayEngine({ text: "Loading...", spinner: true }),
                    },
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show loading",
                    kind: "primary",
                    events: [{ event: "click", handler: "showLoadingOverlay" }],
                });
                buttons.button({
                    text: "Hide",
                    kind: "secondary",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideLoadingOverlay" }],
                });
            });
        });
    });
    return s.commitPage();
}
```

**Example: Authored in the ViewModel**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { actions, createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2 },
            { id: 2, name: "beta", qty: 5 },
            { id: 3, name: "gamma", qty: 9 },
        ];
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            overlays: {
                loading: dataTable.viewModel.overlays.floatingBoxOverlayEngine({ text: "Loading...", spinner: true }),
            },
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public showLoadingOverlay(): void {
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType: "loading" }));
    }

    public hideLoadingOverlay(): void {
        this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType: "loading" }));
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
    s.page("OverlaysDocConfigViewModel", "Overlays Configuration (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
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
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show loading",
                    kind: "primary",
                    events: [{ event: "click", handler: "showLoadingOverlay" }],
                });
                buttons.button({
                    text: "Hide",
                    kind: "secondary",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideLoadingOverlay" }],
                });
            });
        });
    });
    return s.commitPage();
}
```

## Custom Overlay Slot

Register a new slot with `overlaySlots`, then map an engine in `overlays`. Built-in slots are `loading`, `noData`, `noResults`, and `error`.

### overlaySlots

Declares new per-instance overlay slot types that can be controlled with `overlay/show` and `overlay/hide` actions. Each entry is an `OverlaySlotDescriptor` merged with the built-in slots.

**Overlay Slot Descriptor Property**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `type` | `string` | yes | V | Unique slot key used by overlays config and overlay/show, overlay/hide actions. | - |
| `cssClass` | `string` | yes | V | Single CSS class that uniquely identifies this slot's container element. | - |
| `containerBaseTheme` | `DataTableThemeStyling` | no | V | Extra theme merged on top of the structural theme. | `{ customCssClasses: "bg-light" }` |
| `testId` | `string` | no | V | Apply a data-test-id to the container element. Emitted only when the table's testIds option is true. | - |

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
    type DataTableOptions,
    type DataTableStore,
} from "data-ui/data-table";

type Row = { readonly id: number; readonly status: string };

const maintenanceOverlayType = "maintenance";
const overlayTypes: readonly string[] = ["loading", "noData", "noResults", "error", maintenanceOverlayType] as const;

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const { options, store } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({
                data: [
                    { id: 1, status: "active" },
                    { id: 2, status: "pending" },
                ],
            }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    status: schema.string(),
                },
            }),
            testIds: true,
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public hideAllOverlays(): void {
        for (const overlayType of overlayTypes) {
            this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType }));
        }
    }

    public showMaintenanceOverlay(): void {
        this.hideAllOverlays();
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType: maintenanceOverlayType }));
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { ViewModel } from "./view-model";

type Row = { readonly id: number; readonly status: string };

const maintenanceOverlayType = "maintenance";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomOverlaySlot", "Overlays, custom slot");
    s.view("main", (s) => {
        s.div({ height: 460 }).contentTemplates((s) => {
            s.div({ height: 200 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    overlaySlots: [{
                        type: maintenanceOverlayType,
                        cssClass: "dt-maintenance-overlay",
                        testId: "dt-maintenance-overlay",
                        containerBaseTheme: { customCssClasses: "ml-dt-empty-overlay" },
                    }],
                    overlays: {
                        loading: dataTable.view.overlays.floatingBoxOverlayEngine(),
                        noData: dataTable.view.overlays.floatingBoxOverlayEngine(),
                        noResults: dataTable.view.overlays.floatingBoxOverlayEngine(),
                        error: dataTable.view.overlays.floatingBoxOverlayEngine(),
                        maintenance: dataTable.view.overlays.floatingBoxOverlayEngine({
                            text: "Scheduled maintenance in progress",
                            coverage: "full",
                        }),
                    },
                    columns: [
                        column({ field: "id", header: "Id" }),
                        column({ field: "status", header: "Status" }),
                    ],
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show maintenance",
                    events: [{ event: "click", handler: "showMaintenanceOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Hide",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideAllOverlays" }],
                    kind: "secondary",
                });
            });
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
    type DataTableOptions,
    type DataTableStore,
} from "data-ui/data-table";

type Row = { readonly id: number; readonly status: string };

const maintenanceOverlayType = "maintenance";
const overlayTypes: readonly string[] = ["loading", "noData", "noResults", "error", maintenanceOverlayType] as const;

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;

    public loadingOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine();
    public noDataOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine();
    public noResultsOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine();
    public errorOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine();
    public maintenanceOverlay = dataTable.viewModel.overlays.floatingBoxOverlayEngine({
        text: "Scheduled maintenance in progress",
        coverage: "full",
    });

    public initialize(): void {
        const { options, store } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({
                data: [
                    { id: 1, status: "active" },
                    { id: 2, status: "pending" },
                ],
            }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    status: schema.string(),
                },
            }),
            overlaySlots: [{
                type: maintenanceOverlayType,
                cssClass: "dt-maintenance-overlay",
                testId: "dt-maintenance-overlay",
                containerBaseTheme: { customCssClasses: "ml-dt-empty-overlay" },
            }],
            testIds: true,
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public hideAllOverlays(): void {
        for (const overlayType of overlayTypes) {
            this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType }));
        }
    }

    public showMaintenanceOverlay(): void {
        this.hideAllOverlays();
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType: maintenanceOverlayType }));
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { ViewModel } from "./view-model";

type Row = { readonly id: number; readonly status: string };

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomOverlaySlot", "Overlays, custom slot");
    s.view("main", (s) => {
        s.div({ height: 460 }).contentTemplates((s) => {
            s.div({ height: 200 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    overlays: {
                        loading: { binding: "loadingOverlay" },
                        noData: { binding: "noDataOverlay" },
                        noResults: { binding: "noResultsOverlay" },
                        error: { binding: "errorOverlay" },
                        maintenance: { binding: "maintenanceOverlay" },
                    },
                    columns: [
                        column({ field: "id", header: "Id" }),
                        column({ field: "status", header: "Status" }),
                    ],
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({
                    text: "Show maintenance",
                    events: [{ event: "click", handler: "showMaintenanceOverlay" }],
                    kind: "primary",
                });
                buttons.button({
                    text: "Hide",
                    margin: { left: 1 },
                    events: [{ event: "click", handler: "hideAllOverlays" }],
                    kind: "secondary",
                });
            });
        });
    });
    return s.commitPage();
}
```

### suppressSortLoadingOverlay

When true, the loading overlay is not shown during sort operations.

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `suppressSortLoadingOverlay` | `boolean` | no | V B | Set on `s.dataTable(dataTableOptions({ ... }))` as a top-level option. |

## Related

- [overlays-register-a-named-overlay-engine](overlays-register-a-named-overlay-engine.md): Overlays - Register a Named Overlay Engine
- [types](types.md): the declarations of the types used here, `OverlaySlotDescriptor`, `DataTableThemeStyling`, `OverlayRenderContext`; search it for a name rather than reading it whole
