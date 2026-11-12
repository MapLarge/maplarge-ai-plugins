# Data Table - Integrations

<!-- Automatically generated, do not edit -->

An integration is a self-contained package mounted alongside the table, with access to its store and data engine, that extends it with behavior it does not ship with - usually by connecting it to something outside, like a map.

## Using Integrations

Add an entry per integration. Listing one is opting in, so it runs until something turns it off; give two entries of the same engine distinct keys.

```ts
integrations: [
    { engine: mapViewportSync({ mapId: "main" }) },
    { key: "inset", engine: mapViewportSync({ mapId: "inset" }), enabled: false },    // installed, waiting to be turned on
]
```

**Integration Entry**:

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `engine` | `TableIntegration \| IntegrationEngineRef` | yes | - | V B | The integration itself: a built-in by name, a custom one registered by name, or an instance built in the ViewModel. | `dataTable.view.integrations.mapViewportSync({ mapId: "abc123" })` |
| `key` | `string` | no | `the engine's own key` | V B | This entry's unique id. Defaults to the engine's own key, so a lone mapViewportSync entry is keyed "mapViewportSync" - set it on custom entries you toggle or reference from code. A custom integration gets "integration-\<position in the list>" unless its object sets integrationKey. | `"followMainMap"` |
| `enabled` | `boolean \| ViewDefinitionBinding` | no | `true` | V B | Whether this entry runs - listing an integration is opting in, so only an explicit false holds it back. Changing the value, including through a binding, starts or stops that one entry without rebuilding the table. Starting enabled waits for the first load, since a data engine cannot say what it supports until it has resolved its source. A { where, applyValue } rule is not evaluated here (the integration stays on); to switch it with table state, bind enabled to a ViewModel boolean and call this.update(), or dispatch actions.enableIntegration and disableIntegration. | - |

Examples for `enabled`:

Value (V):

```ts
integrations: [{ engine: ..., enabled: false }],
```

Binding (B):

```ts
integrations: [{
    engine: ...,
    enabled: { binding: "followMap" },
}],
```

## Built-in Integrations

**Integration Summary**:

| Name | Description |
| --- | --- |
| `mapViewportSync` | Constrains the rows to a MapLarge map's visible area, re-querying as the user pans and zooms. |

## Integration: `mapViewportSync`

Constrains the table to a MapLarge map's visible bounding box, re-querying as the user pans and zooms.

The map recipe (filter-to-map-view) has the whole setup: the raptorMap node, its layer of the table's rows, and this integration.

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `map` | `ml.ui.map.Map \| (() => ml.ui.map.Map \| null \| undefined)` | no | - | V B | A live map, or a getter for one that may not exist yet. | - |
| `mapId` | `string` | no | - | V B | Looks the map up in ml.ui.map.allMaps. | `"abc123"` |
| `debounceMs` | `number` | no | `0` | V B | Trailing debounce applied to map movement. | `250` |
| `scrollBehavior` | `"top" \| "preserve"` | no | `"preserve"` | V B | Passed along with every constraint it dispatches, deciding where the grid lands after the re-query. | `"top"` |

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, createDiscoverableSchema, dataStoreData, schema, toPixels, virtualScroll } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = {
    readonly StopID: number;
    readonly StopName: string;
    readonly MUNIC_NAME: string;
};

/** the data engine needs the DataStore, so it is built here; the View still authors the integrations */
export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    followMap = true;

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });

        const { options } = createDataTable<Row>({
            data: dataStoreData<Row>({ dataStore: this.dataStore, dataSourceName: "busstops", editable: false }),
            schema: createDiscoverableSchema({
                entries: {
                    StopID: schema.number(),
                    StopName: schema.string(),
                    MUNIC_NAME: schema.string(),
                },
            }),
            rowScrolling: virtualScroll({ fixedRowHeight: toPixels(25) }),
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
import { dataTable, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("IntegrationsDocView", "Integrations (View)");
    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            // the map registers itself under this id, so the integration finds it without a control reference
            // the map fills its container, so the container needs a real height
            s.div({ height: 300 }).contentTemplates((mapWrapper) => {
                mapWrapper.raptorMap({
                    viewName: "docsIntegrationsViewMap",
                    mapOptions: { mapId: "docsIntegrationsViewMap", lat: 25.76, lng: -80.19, z: 11, api: "LEAFLET", composite: true, layers: [], drawings: [] },
                });
            });
            s.div({ height: 300, margin: { top: 2 } }).contentTemplates((tableWrapper) => {
                tableWrapper.dataTable({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "StopID", header: "Stop ID", width: toPixels(90) }),
                        column({ field: "StopName", header: "Stop Name", width: toPixels(220) }),
                        column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160) }),
                    ],
                    // authored here in the View, merged onto the ViewModel's options
                    integrations: [
                        {
                            engine: dataTable.view.integrations.mapViewportSync({ mapId: "docsIntegrationsViewMap", debounceMs: 250 }),
                            enabled: { binding: "followMap" },
                        },
                    ],
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
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import {
    createDataTable,
    createDiscoverableSchema,
    dataStoreData,
    mapViewportSync,
    schema,
    toPixels,
    virtualScroll,
} from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Row = {
    readonly StopID: number;
    readonly StopName: string;
    readonly MUNIC_NAME: string;
};

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    dataTableStore: DataTableStore<Row> | null = null;

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });

        const { options, store } = createDataTable<Row>({
            data: dataStoreData<Row>({ dataStore: this.dataStore, dataSourceName: "busstops", editable: false }),
            schema: createDiscoverableSchema({
                entries: {
                    StopID: schema.number(),
                    StopName: schema.string(),
                    MUNIC_NAME: schema.string(),
                },
            }),
            rowScrolling: virtualScroll({ fixedRowHeight: toPixels(25) }),
            integrations: [
                { engine: mapViewportSync({ mapId: "docsIntegrationsVmMap", debounceMs: 250, scrollBehavior: "preserve" }) },
            ],
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("IntegrationsDocViewModel", "Integrations (ViewModel)");
    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            // the map fills its container, so the container needs a real height
            s.div({ height: 300 }).contentTemplates((mapWrapper) => {
                mapWrapper.raptorMap({
                    viewName: "docsIntegrationsVmMap",
                    mapOptions: { mapId: "docsIntegrationsVmMap", lat: 25.76, lng: -80.19, z: 11, api: "LEAFLET", composite: true, layers: [], drawings: [] },
                });
            });
            s.div({ height: 300, margin: { top: 2 } }).contentTemplates((tableWrapper) => {
                tableWrapper.dataTable({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "StopID", header: "Stop ID", width: toPixels(90) }),
                        column({ field: "StopName", header: "Stop Name", width: toPixels(220) }),
                        column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160) }),
                    ],
                });
            });
        });
    });
    return s.commitPage();
}
```

## The Constraint Channel

An integration that narrows the rows dispatches actions.setConstraint rather than filtering. A constraint is ANDed onto whatever the user has filtered but never becomes one of their filters: no chip, no filter dialog, no saved layout, and Clear All Filters leaves it standing.

**Constraint Action**:

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `key` | `string` | yes | - | Which source this constraint belongs to. Pass the key from the start context; every source owns its own entry. |
| `filter` | `FilterExpression \| null` | yes | - | The constraint. Null lifts this key's constraint. |
| `scrollBehavior` | `"top" \| "preserve"` | no | `"preserve"` | Where the grid lands after this re-query. "preserve" holds the scroll position; "top" returns to the first row. |

## Build a Custom Integration

### Contract

Implement `TableIntegration`, which is a single method:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `start` | `(context: TableIntegrationContext) => (() => void) \| Promise<() => void>` | yes | Applies the current state immediately (or once ready, when async), then keeps up with it. Returns a cleanup function that undoes whatever was applied. |

### Start context

`TableIntegrationContext` is passed to start:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `store` | `DataTableStore` | yes | The table's store. The table's internal store, not the object createDataTable returns: dispatch(action), on(actionCreator, handler), selectors, getViewState() and getDataState(). on returns an unsubscribe function. It has no subscribe, getRow or mutations. |
| `dataEngine` | `DataEngine` | yes | The table's data engine. |
| `key` | `string` | yes | This entry's resolved key. Pass it back on anything keyed you set, such as a constraint, so two integrations never overwrite one another.. |

### Custom Integration Example

scopeTo pins the table to one slice of the data. Because it goes through the constraint channel rather than the filters, Clear All Filters leaves it standing - toggle it by key instead. The View arm registers the factory by name and selects it with integrations.custom(); the ViewModel arm hands the instance straight to the entry.

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { actions, createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore, TableIntegration } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly region: string };

export type ScopeArgs = { readonly field: string; readonly value: string };

/** Pins the table to one slice of the data. A constraint, not a filter, so Clear All Filters leaves it standing. */
const scopeTo = (args: ScopeArgs): TableIntegration => ({
    start: ({ store, key }) => {
        store.dispatch(actions.setConstraint({
            key,                                            // always under our own key
            filter: { field: args.field, operator: "Equal", values: { value: args.value } },
            scrollBehavior: "top",
        }));
        // whatever an integration applies, it undoes
        return () => store.dispatch(actions.setConstraint({ key, filter: null }));
    },
});

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", region: "east" },
            { id: 2, name: "beta", region: "west" },
            { id: 3, name: "gamma", region: "east" },
            { id: 4, name: "delta", region: "west" },
        ];
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: { id: schema.number(), name: schema.string(), region: schema.string() },
            }),
            // register the factory by name; the View selects it with integrations.custom("scopeTo", { ... })
            engines: {
                integrations: {
                    scopeTo: (args) => scopeTo(args as ScopeArgs),
                },
            },
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    readonly toggleScope = (): void => {
        const running = this.dataTableStore?.isIntegrationEnabled({ key: "eastOnly" }) === true;
        this.dataTableStore?.dispatch(running
            ? actions.disableIntegration({ key: "eastOnly" })
            : actions.enableIntegration({ key: "eastOnly" }));
    };

    readonly clearFilters = (): void => {
        // clears the user's filters only - the scope is a constraint and survives
        this.dataTableStore?.dispatch(actions.clearFilters());
    };
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
    s.page("IntegrationsDocCustomView", "Custom Integration (View)");
    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            s.div({ flex: { dFlex: true, gap: 2 }, margin: { bottom: 2 } }).contentTemplates((bar) => {
                bar.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "toggleScope" }] })
                    .contentTemplates((b) => { b.span({ text: "Toggle east-only scope" }); });
                bar.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "clearFilters" }] })
                    .contentTemplates((b) => { b.span({ text: "Clear All Filters" }); });
            });
            s.div({ height: 220 }).contentTemplates((tableWrapper) => {
                tableWrapper.dataTable({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "id", header: "ID" }),
                        column({ field: "name", header: "Name" }),
                        column({ field: "region", header: "Region" }),
                    ],
                    // serializable ref; the live integration comes from the ViewModel's engines registry
                    integrations: [
                        { key: "eastOnly", engine: dataTable.view.integrations.custom("scopeTo", { field: "region", value: "east" }) },
                    ],
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
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { actions, createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore, TableIntegration } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly region: string };

export type ScopeArgs = { readonly field: string; readonly value: string };

/** Pins the table to one slice of the data. A constraint, not a filter, so Clear All Filters leaves it standing. */
const scopeTo = (args: ScopeArgs): TableIntegration => ({
    start: ({ store, key }) => {
        store.dispatch(actions.setConstraint({
            key,                                            // always under our own key
            filter: { field: args.field, operator: "Equal", values: { value: args.value } },
            scrollBehavior: "top",
        }));
        // whatever an integration applies, it undoes
        return () => store.dispatch(actions.setConstraint({ key, filter: null }));
    },
});

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", region: "east" },
            { id: 2, name: "beta", region: "west" },
            { id: 3, name: "gamma", region: "east" },
            { id: 4, name: "delta", region: "west" },
        ];
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: { id: schema.number(), name: schema.string(), region: schema.string() },
            }),
            // no registry needed - hand the instance straight to the entry
            integrations: [{ key: "eastOnly", engine: scopeTo({ field: "region", value: "east" }) }],
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    readonly toggleScope = (): void => {
        const running = this.dataTableStore?.isIntegrationEnabled({ key: "eastOnly" }) === true;
        this.dataTableStore?.dispatch(running
            ? actions.disableIntegration({ key: "eastOnly" })
            : actions.enableIntegration({ key: "eastOnly" }));
    };

    readonly clearFilters = (): void => {
        // clears the user's filters only - the scope is a constraint and survives
        this.dataTableStore?.dispatch(actions.clearFilters());
    };
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
    s.page("IntegrationsDocCustomViewModel", "Custom Integration (ViewModel)");
    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            s.div({ flex: { dFlex: true, gap: 2 }, margin: { bottom: 2 } }).contentTemplates((bar) => {
                bar.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "toggleScope" }] })
                    .contentTemplates((b) => { b.span({ text: "Toggle east-only scope" }); });
                bar.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "clearFilters" }] })
                    .contentTemplates((b) => { b.span({ text: "Clear All Filters" }); });
            });
            s.div({ height: 220 }).contentTemplates((tableWrapper) => {
                tableWrapper.dataTable({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "id", header: "ID" }),
                        column({ field: "name", header: "Name" }),
                        column({ field: "region", header: "Region" }),
                    ],
                });
            });
        });
    });
    return s.commitPage();
}
```

## Toggling From Code

```ts
import { actions } from "data-ui/data-table";

// the key defaults to the strategy name, so a single mapViewportSync entry is "mapViewportSync"
table.store.dispatch(actions.enableIntegration({ key: "mapViewportSync" }));
table.store.dispatch(actions.disableIntegration({ key: "mapViewportSync" }));

table.store.isIntegrationEnabled({ key: "mapViewportSync" });   // is it running

table.store.subscribe(actions.enableIntegration, (a) => { if (a.key === "mapViewportSync") checkbox.checked = true; });
table.store.subscribe(actions.disableIntegration, (a) => { if (a.key === "mapViewportSync") checkbox.checked = false; });
```

## Related

- [types](types.md): the declarations of the types used here, `TableIntegration`, `TableIntegrationContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `DataEngine`, `DiscoveredColumnEntry`, `FilterCapabilities`, `FilterExpression`, `DataFreshness`, `SortState`, `IPersistenceEngine`, `DataTableSavedState`; search it for a name rather than reading it whole
