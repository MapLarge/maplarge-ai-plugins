# Data Table - Configurator - Build a Custom Configurator Engine

<!-- Automatically generated, do not edit -->

## Build a Custom Configurator Engine

Implement the engine in the ViewModel - Views must stay serializable, so never construct an engine in a View. Register the factory by name on `createDataTable({ engines: { configurator: { ... } } })` and select it from the View with `dataTable.view.configurator.custom("name")`, or pass the instance to `configurator.engine` on `createDataTable` directly. The data table calls `initialize` every time it rebuilds its view model, then `handleConfiguratorClick` on every button click.

Keep initialize repeatable; destroy runs when the table tears down. initialize runs on the first load and again after a refresh, sort, filter, column change or newly discovered columns: replace what you captured instead of adding to it, and add no store subscriptions, timers or DOM listeners there without removing the earlier ones.

### Init context

`ConfiguratorEngineInitContext` is passed to initialize. Replace what you captured on every call; each rebuild passes a new context:

After the table rebuilds or reboots, the same engine is initialized again with a new context, and a context kept from an earlier call can point at a destroyed store.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `store` | `DataTableStore` | yes | Access DataTable state and actions. It is the table's internal store, not the object createDataTable returns: dispatch(action), on(actionCreator, handler), selectors, getViewState(), getDataState() and getCheckboxRowsState(). on is the internal subscribe. It has no getRow, getRowsFromDataEngine, getCellByKey, getState, subscribe or mutations; to use those, hand the engine the store from createDataTable yourself. |
| `raptorDom` | `RaptorDom \| undefined` | yes | The host RaptorDom instance. Use to open context menus, dialogs, or other UI. |
| `hostViewModel` | `object \| undefined` | yes | The ViewModel instance hosting the DataTable, if available. It is the data table's own internal ViewModel (a DataTableViewModel), not the page ViewModel that called createDataTable; never cast it to your ViewModel. To reach your own ViewModel from an engine, pass `this` to the engine's constructor when you build it. |
| `dataEngine` | `DataEngine<UnknownObject> \| undefined` | no | The table's data engine. |

### Click context

`ConfiguratorEngineClickContext` is passed to handleConfiguratorClick on every button click:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `anchorElement` | `HTMLElement` | yes | The configurator button DOM element. Useful for positioning popups relative to the button. |
| `clickEvent` | `MouseEvent` | yes | The raw click event. clientX and clientY reflect the pointer position at click time. When the table opens the configurator itself it is a synthetic click at the button's bottom-left corner. That happens for Enter or Space on the focused button and for the configurator extension's openConfigurator(): clientX is the button's left edge and clientY its bottom edge. |

### Engine contract

Implement `ConfiguratorEngine` with the following methods:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `initialize` | `(context: ConfiguratorEngineInitContext) => void` | yes | Called before the first render and again each time the table rebuilds its view model. Keep it repeatable. |
| `handleConfiguratorClick` | `(context: ConfiguratorEngineClickContext) => void` | yes | Called each time the configurator button is clicked. |
| `destroy` | `() => void` | no | Called when the DataTable tears down. Use to release any subscriptions or UI owned by the engine. |

### Custom Configurator Engine Example

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { actions, createDataTable, dataTable, schema } from "data-ui/data-table";
import type {
    ConfiguratorEngine,
    ConfiguratorEngineClickContext,
    ConfiguratorEngineInitContext,
    DataTableOptions,
} from "data-ui/data-table";

export type Row = { id: number; name: string; status: string; qty: number; region: string };

type Preset = {
    readonly label: string;
    readonly visibleKeys: readonly string[];
};

const columnPresets: readonly Preset[] = [
    { label: "All Columns", visibleKeys: ["id", "name", "status", "qty", "region"] },
    { label: "Summary", visibleKeys: ["name", "status", "region"] },
    { label: "Compact", visibleKeys: ["id", "name"] },
];

const allColumnKeys = ["id", "name", "status", "qty", "region"] as const;

class PresetPanelConfiguratorEngine implements ConfiguratorEngine {
    private initContext: ConfiguratorEngineInitContext | null = null;
    private panelEl: HTMLElement | null = null;
    private removeOutsideClickListener: (() => void) | null = null;

    initialize(context: ConfiguratorEngineInitContext): void {
        this.initContext = context;
    }

    handleConfiguratorClick(context: ConfiguratorEngineClickContext): void {
        if (this.panelEl) {
            this.closePanel();
            return;
        }
        this.openPanel(context.anchorElement);
    }

    private openPanel(anchor: HTMLElement): void {
        const panel = document.createElement("div");
        panel.style.position = "fixed";
        panel.style.background = "#ffffff";
        panel.style.border = "1px solid #d0d0d0";
        panel.style.borderRadius = "6px";
        panel.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
        panel.style.padding = "8px 0";
        panel.style.zIndex = "9999";
        panel.style.minWidth = "180px";
        panel.style.fontFamily = "inherit";
        panel.style.fontSize = "13px";

        const rect = anchor.getBoundingClientRect();
        panel.style.bottom = (window.innerHeight - rect.top + 4) + "px";
        panel.style.left = rect.left + "px";

        const heading = document.createElement("div");
        heading.textContent = "Column Preset";
        heading.style.padding = "4px 12px 8px";
        heading.style.fontWeight = "600";
        heading.style.color = "#555555";
        heading.style.borderBottom = "1px solid #eeeeee";
        heading.style.marginBottom = "4px";
        panel.appendChild(heading);

        columnPresets.forEach((preset) => {
            const btn = document.createElement("button");
            btn.textContent = preset.label;
            btn.style.display = "block";
            btn.style.width = "100%";
            btn.style.textAlign = "left";
            btn.style.padding = "6px 12px";
            btn.style.border = "none";
            btn.style.background = "none";
            btn.style.cursor = "pointer";
            btn.style.color = "#1a1a1a";
            btn.addEventListener("mouseenter", () => { btn.style.background = "#f5f5f5"; });
            btn.addEventListener("mouseleave", () => { btn.style.background = "none"; });
            btn.addEventListener("click", () => {
                if (!this.initContext) return;
                this.initContext.store.dispatch(
                    actions.setColumnVisibilities({
                        changes: allColumnKeys.map((key) => ({
                            key,
                            visible: (preset.visibleKeys as readonly string[]).includes(key),
                        })),
                    })
                );
                this.closePanel();
            });
            panel.appendChild(btn);
        });

        document.body.appendChild(panel);
        this.panelEl = panel;

        const handleOutsideClick = (event: MouseEvent): void => {
            if (!this.panelEl?.contains(event.target as Node)) {
                this.closePanel();
            }
        };
        const timeoutId = window.setTimeout(() => {
            document.addEventListener("click", handleOutsideClick);
        }, 0);
        this.removeOutsideClickListener = () => {
            window.clearTimeout(timeoutId);
            document.removeEventListener("click", handleOutsideClick);
        };
    }

    private closePanel(): void {
        this.panelEl?.remove();
        this.panelEl = null;
        this.removeOutsideClickListener?.();
        this.removeOutsideClickListener = null;
    }

    destroy(): void {
        this.closePanel();
        this.initContext = null;
    }
}


const sampleRows: Row[] = [
    { id: 1, name: "alpha", status: "active", qty: 5, region: "North" },
    { id: 2, name: "beta", status: "inactive", qty: 2, region: "South" },
    { id: 3, name: "gamma", status: "active", qty: 9, region: "East" },
    { id: 4, name: "delta", status: "active", qty: 1, region: "West" },
    { id: 5, name: "epsilon", status: "inactive", qty: 7, region: "North" },
];

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: sampleRows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    status: schema.string(),
                    qty: schema.number(),
                    region: schema.string(),
                },
            }),
            // register the engine factory by name; the View selects it via configuratorEngine.custom("presetPanel")
            engines: {
                configurator: {
                    presetPanel: (): ConfiguratorEngine => new PresetPanelConfiguratorEngine(),
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
import { dataTable, dataTableOptions, toPixels } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
    column({ field: "status", header: "Status" }),
    column({ field: "qty", header: "Qty" }),
    column({ field: "region", header: "Region" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocPresetPanelConfiguratorV", "Configurator, preset panel (View)");
    s.view("main", (s) => {
        s.div({ height: toPixels(300) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                columns,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                storage: dataTable.view.storage.noPersistence(),
                // serializable ref; the live engine comes from the ViewModel's engines registry
                configurator: {
                    engine: dataTable.view.configurator.custom("presetPanel"),
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
import { actions, createDataTable, dataTable, schema } from "data-ui/data-table";
import type {
    ConfiguratorEngine,
    ConfiguratorEngineClickContext,
    ConfiguratorEngineInitContext,
    DataTableOptions,
} from "data-ui/data-table";

export type Row = { id: number; name: string; status: string; qty: number; region: string };

type Preset = {
    readonly label: string;
    readonly visibleKeys: readonly string[];
};

const columnPresets: readonly Preset[] = [
    { label: "All Columns", visibleKeys: ["id", "name", "status", "qty", "region"] },
    { label: "Summary", visibleKeys: ["name", "status", "region"] },
    { label: "Compact", visibleKeys: ["id", "name"] },
];

const allColumnKeys = ["id", "name", "status", "qty", "region"] as const;

class PresetPanelConfiguratorEngine implements ConfiguratorEngine {
    private initContext: ConfiguratorEngineInitContext | null = null;
    private panelEl: HTMLElement | null = null;
    private removeOutsideClickListener: (() => void) | null = null;

    initialize(context: ConfiguratorEngineInitContext): void {
        this.initContext = context;
    }

    handleConfiguratorClick(context: ConfiguratorEngineClickContext): void {
        if (this.panelEl) {
            this.closePanel();
            return;
        }
        this.openPanel(context.anchorElement);
    }

    private openPanel(anchor: HTMLElement): void {
        const panel = document.createElement("div");
        panel.style.position = "fixed";
        panel.style.background = "#ffffff";
        panel.style.border = "1px solid #d0d0d0";
        panel.style.borderRadius = "6px";
        panel.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
        panel.style.padding = "8px 0";
        panel.style.zIndex = "9999";
        panel.style.minWidth = "180px";
        panel.style.fontFamily = "inherit";
        panel.style.fontSize = "13px";

        const rect = anchor.getBoundingClientRect();
        panel.style.bottom = (window.innerHeight - rect.top + 4) + "px";
        panel.style.left = rect.left + "px";

        const heading = document.createElement("div");
        heading.textContent = "Column Preset";
        heading.style.padding = "4px 12px 8px";
        heading.style.fontWeight = "600";
        heading.style.color = "#555555";
        heading.style.borderBottom = "1px solid #eeeeee";
        heading.style.marginBottom = "4px";
        panel.appendChild(heading);

        columnPresets.forEach((preset) => {
            const btn = document.createElement("button");
            btn.textContent = preset.label;
            btn.style.display = "block";
            btn.style.width = "100%";
            btn.style.textAlign = "left";
            btn.style.padding = "6px 12px";
            btn.style.border = "none";
            btn.style.background = "none";
            btn.style.cursor = "pointer";
            btn.style.color = "#1a1a1a";
            btn.addEventListener("mouseenter", () => { btn.style.background = "#f5f5f5"; });
            btn.addEventListener("mouseleave", () => { btn.style.background = "none"; });
            btn.addEventListener("click", () => {
                if (!this.initContext) return;
                this.initContext.store.dispatch(
                    actions.setColumnVisibilities({
                        changes: allColumnKeys.map((key) => ({
                            key,
                            visible: (preset.visibleKeys as readonly string[]).includes(key),
                        })),
                    })
                );
                this.closePanel();
            });
            panel.appendChild(btn);
        });

        document.body.appendChild(panel);
        this.panelEl = panel;

        const handleOutsideClick = (event: MouseEvent): void => {
            if (!this.panelEl?.contains(event.target as Node)) {
                this.closePanel();
            }
        };
        const timeoutId = window.setTimeout(() => {
            document.addEventListener("click", handleOutsideClick);
        }, 0);
        this.removeOutsideClickListener = () => {
            window.clearTimeout(timeoutId);
            document.removeEventListener("click", handleOutsideClick);
        };
    }

    private closePanel(): void {
        this.panelEl?.remove();
        this.panelEl = null;
        this.removeOutsideClickListener?.();
        this.removeOutsideClickListener = null;
    }

    destroy(): void {
        this.closePanel();
        this.initContext = null;
    }
}


const sampleRows: Row[] = [
    { id: 1, name: "alpha", status: "active", qty: 5, region: "North" },
    { id: 2, name: "beta", status: "inactive", qty: 2, region: "South" },
    { id: 3, name: "gamma", status: "active", qty: 9, region: "East" },
    { id: 4, name: "delta", status: "active", qty: 1, region: "West" },
    { id: 5, name: "epsilon", status: "inactive", qty: 7, region: "North" },
];

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: sampleRows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    status: schema.string(),
                    qty: schema.number(),
                    region: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({ field: "status", header: "Status" }),
                column({ field: "qty", header: "Qty" }),
                column({ field: "region", header: "Region" }),
            ],
            // the ViewModel holds the live instance; nothing engine-shaped crosses the View
            configurator: {
                engine: new PresetPanelConfiguratorEngine(),
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
import { dataTableOptions, toPixels } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocPresetPanelConfiguratorB", "Configurator, preset panel (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: toPixels(300) }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [configurator-built-in-menu-items](configurator-built-in-menu-items.md): Configurator - Built-in Menu Items and more
- [types](types.md): the declarations of the types used here, `ConfiguratorEngineInitContext`, `DataTableStore`, `DataEngine`, `DiscoveredColumnEntry`, `FilterCapabilities`, `FilterExpression`, `DataFreshness`, `SortState`, `IPersistenceEngine`, `DataTableSavedState`, `ConfiguratorEngineClickContext`, `ConfiguratorEngine`, `SelectionState`, `RowMutationsFactory`, `ColumnBase`, `InlineContentTemplates`, `ColumnEditConfig`, `EditTransformContext`, `EditTrigger`, `DeclarativeRule`, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `CellEditorInitContext`, `FormatterArgs`, `CellContext`; search it for a name rather than reading it whole
