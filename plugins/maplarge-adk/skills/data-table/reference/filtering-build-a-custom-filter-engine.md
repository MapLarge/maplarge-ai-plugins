# Data Table - Filtering - Build a Custom Filter Engine and more

<!-- Automatically generated, do not edit -->

## Build a Custom Filter Engine

Implement FilterEngine and pass it as filtering to createDataTable. The data table calls initialize with a fresh FilterEngineContext on every refresh, then update when the filters, the columns or the draft state change.

For a View-authored table, register a factory by name under createDataTable({ engines: { filtering: { name: () => new MyEngine() } } }) and select it from the View with dataTable.view.filtering.custom("name").

A refresh is the first load and each sort, filter or column-visibility change. Keep initialize safe to repeat: replace the stored context, do not add a new subscription each time, and do not clear state that update fills in.

### Filter engine context

`FilterEngineContext` is passed to FilterEngine.initialize. Use it to read column and filter state and to apply or clear filters.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `store` | `DataTableStore` | yes | The data table store (dispatch actions, listen with on, read state). It is the internal store, not the store createDataTable() returns: dispatch(action), on(actionCreator, handler) and getViewState() / getDataState(). on runs a handler when an action is dispatched and returns an unsubscribe function. The internal store has no subscribe, getRow or getCellByKey. |
| `columns` | `readonly FilterEngineColumnDescriptor[]` | yes | Metadata for every column (key, header, field, filterable, filterType). filterable is false for a column authored with filtering: false, so check it before offering a filter for that column. |
| `activeFilters` | `ReadonlyMap<string, FilterExpression>` | yes | Committed filters keyed by column key. |
| `applyFilter` | `(key: string, filter: FilterExpression \| null) => void` | yes | Apply or clear one column filter. |
| `clearAllFilters` | `() => void` | yes | Clear every active filter. |
| `schema` | `Schema` | yes | The data table schema. |
| `supportedFilterOps` | `readonly TFilterOps[]` | yes | Operator keys the data engine supports; limit UI to this set. |
| `getDistinctValues` | `(field: string) => Promise<readonly unknown[]>` | no | When provided, returns distinct values for a field (e.g. for checkbox filters). |

### Filter engine contract

Implement `FilterEngine` with the following methods your implementation must provide:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `initialize` | `(context: FilterEngineContext<TFilterOps>) => void` | yes | Called on every refresh with a fresh context. Receives columns, activeFilters, applyFilter, clearAllFilters, supportedFilterOps, and optional getDistinctValues. A refresh is the first load and each sort, filter or column-visibility change. |
| `update` | `(args: { activeFilters: ReadonlyMap<string, FilterExpression> }) => void \| Promise<void>` | yes | Called when the filters, the columns or the draft state change, with the current committed filter map. It is not called on every render. The map holds the committed grid filters plus any external filters the data engine reports. |
| `openForColumn` | `(args: { columnKey: string }) => void` | yes | Open the filter UI for the given column. |
| `isColumnFilterable` | `(args: { columnKey: string }) => boolean` | yes | Return true if this engine supports filtering the given column. |
| `getActiveFilterIndicators` | `() => readonly ActiveFilterIndicator[]` | yes | Return one ActiveFilterIndicator per currently filtered column. Called after update(). |
| `destroy` | `() => void` | yes | Tear down any UI or subscriptions owned by this engine. |
| `summarizeExpression` | `(args: { columnKey: string; expression: FilterExpression }) => string` | no | Return a human-readable summary of the active filter for a column. |
| `syncDialogs` | `() => void` | no | Called after refresh to synchronize open filter dialogs. |
| `getViewModelExtension` | `() => object` | no | Return an extension object to expose on vm.extensions for custom view bindings. The data table exposes it as vm.extensions.dialogFilter (the same slot the built-in dialog engine uses), so bind to it with that path. |

### Custom Filter Engine Example

Implements an exact-match, prompt-based filtering engine. Choosing Filter from a filterable column header's context menu opens a browser prompt; submitting a value applies an Equal filter on that column.

Clicking the funnel icon or a filter chip opens the prompt too; a plain click on the header still sorts.

```ts
// view-model.ts
class PromptFilterEngine implements FilterEngine {
    private context: FilterEngineContext | undefined;

    initialize(context: FilterEngineContext): void {
        this.context = context;
    }

    update(_args: { readonly activeFilters: ReadonlyMap<string, FilterExpression> }): void {}

    openForColumn(args: { readonly columnKey: string }): void {
        const column = this.context?.columns.find(c => c.key === args.columnKey);
        if (!column?.field) return;
        const value = window.prompt(`Filter "${args.columnKey}":`);
        if (value === null) return;
        this.context?.applyFilter(args.columnKey, value.trim() === "" ? null : {
            field: column.field,
            operator: "Equal",
            values: { value: value.trim() },
        });
    }

    isColumnFilterable(_args: { readonly columnKey: string }): boolean { return true; }
    getActiveFilterIndicators(): readonly ActiveFilterIndicator[] { return []; }

    summarizeExpression(args: { readonly columnKey: string; readonly expression: FilterExpression }): string {
        return "values" in args.expression ? String(args.expression.values.value ?? "") : "";
    }

    destroy(): void {}
}

export class ViewModel extends RaptorViewModel {
    // register by name; the View selects it with filtering.custom("prompt")
    dataTableOptions = createDataTable<Row>({
        // data, schema, columns...
        engines: {
            filtering: {
                prompt: () => new PromptFilterEngine(),
            },
        },
    }).options;
}

// view.ts
s.dataTable(dataTableOptions<Row>({
    bindings: { data: "dataTableOptions" },
    filtering: dataTable.view.filtering.custom("prompt"),
}));
```

**Example: Custom Filter Engine**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, schema } from "data-ui/data-table";
import type {
    ActiveFilterIndicator,
    DataTableOptions,
    FilterEngine,
    FilterEngineColumnDescriptor,
    FilterEngineContext,
    FilterExpression,
} from "data-ui/data-table";

export type Row = { id: number; name: string; qty: number };

class PromptFilterEngine implements FilterEngine {
    private context: FilterEngineContext | undefined;
    private readonly activeFilterMap = new Map<string, FilterExpression>();

    initialize(context: FilterEngineContext): void {
        this.context = context;
    }

    update(args: { readonly activeFilters: ReadonlyMap<string, FilterExpression> }): void {
        this.activeFilterMap.clear();
        args.activeFilters.forEach((expression, key) => {
            this.activeFilterMap.set(key, expression);
        });
    }

    private getColumn(columnKey: string): FilterEngineColumnDescriptor | undefined {
        return this.context?.columns.find(column => column.key === columnKey);
    }

    openForColumn(args: { readonly columnKey: string }): void {
        const column = this.getColumn(args.columnKey);
        if (!column?.field) return;

        const value = window.prompt(`Filter "${args.columnKey}": enter an exact match (blank to clear):`);
        if (value === null) return;
        if (value.trim() === "") {
            this.context?.applyFilter(args.columnKey, null);
        } else {
            this.context?.applyFilter(args.columnKey, {
                field: column.field,
                operator: "Equal",
                values: { value: value.trim() },
            });
        }
    }

    isColumnFilterable(_args: { readonly columnKey: string }): boolean {
        return true;
    }

    getActiveFilterIndicators(): readonly ActiveFilterIndicator[] {
        return Array.from(this.activeFilterMap.entries()).flatMap(([columnKey, expression]) => {
            const column = this.getColumn(columnKey);
            if (!column) return [];
            return [{ columnKey, columnHeader: column.header, expression }];
        });
    }

    summarizeExpression(args: { readonly columnKey: string; readonly expression: FilterExpression }): string {
        return "values" in args.expression ? String(args.expression.values.value ?? "") : "";
    }

    destroy(): void {}
}

const rows: Row[] = [
    { id: 1, name: "alpha", qty: 2 },
    { id: 2, name: "beta", qty: 5 },
    { id: 3, name: "gamma", qty: 2 },
];

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            // register the engine factory by name; the View selects it via filtering.custom("prompt")
            engines: {
                filtering: {
                    prompt: (): FilterEngine => new PromptFilterEngine(),
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
import {
    dataTable,
    dataTableOptions,
    toPixels,
} from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomFilterEngineB", "Custom FilterEngine via engines registry");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
                // serializable ref; the live engine comes from the ViewModel's engines registry
                filtering: dataTable.view.filtering.custom("prompt"),
                columns: [
                    column({ field: "id", header: "ID", filtering: true }),
                    column({ field: "name", header: "Name", filtering: true }),
                    column({ field: "qty", header: "Qty", filtering: true }),
                ],
            }));
        });
    });
    return s.commitPage();
}
```

## Filtering with Actions

Use the Store to apply or clear filters programmatically from outside the filter engine. This requires `createDataTable()` in the ViewModel to obtain a `store` handle.

**Filtering Store Action**:

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `setFilter` | `{ key: string; filter: FilterExpression \| null }` | no | Apply or clear (with null) a single column's filter. | `// apply a filter on a column store.dispatch(actions.setFilter({ key: "name", filter: { field: "name", operator: "Contains", values: { value: "alpha" } }, })); // clear a single column's filter store.dispatch(actions.setFilter({ key: "name", filter: null }));` |
| `setFilterDone` | `{ key: string; filter: FilterExpression \| null }` | no | Emitted after a single column filter has been applied or cleared. | `store.subscribe(actions.setFilterDone, (action) => { console.log("filter changed:", action.key, action.filter); });` |
| `clearFilters` | `{}` | no | Clear all active filters at once. | `store.dispatch(actions.clearFilters());` |
| `clearFiltersDone` | `{}` | no | Emitted after all filters have been cleared. | `store.subscribe(actions.clearFiltersDone, () => { console.log("all filters cleared"); });` |
| `setConstraint` | `{ key: string; filter: FilterExpression \| null; scrollBehavior?: "top" \| "preserve" }` | no | Apply or lift a constraint: an expression ANDed onto the user's filters that is not one of them. It appears in no chip, no filter dialog and no saved layout, and clearFilters leaves it standing. Keyed by source rather than by column, and used mostly by integrations. Constraints reach the rows through arrayData, dataSourceData, dataStoreData and pagedApiCallData; asyncData, and a custom data engine whose setFilters ignores constraints, never receive them, so setConstraint changes nothing there. | `store.dispatch(actions.setConstraint({ key: "regionOfInterest", filter: { field: "state", operator: "Equal", values: { value: "FL" } }, })); // lift only that key's constraint store.dispatch(actions.setConstraint({ key: "regionOfInterest", filter: null }));` |
| `setConstraintDone` | `{ key: string; filter: FilterExpression \| null; scrollBehavior?: "top" \| "preserve" }` | no | Emitted after a constraint has been applied or lifted. | `store.subscribe(actions.setConstraintDone, (action) => { console.log("constraint changed:", action.key, action.filter); });` |

```ts
// view-model.ts
const { options, store } = createDataTable<Row>({ data: dataEngine, schema, ... });
this.dataTableOptions = options;
this.dataTableStore = store;

public filterIdEquals1(): void {
    this.dataTableStore?.dispatch(actions.setFilter({
        key: "id",
        filter: { field: "id", operator: "Equal", values: { value: 1 } },
    }));
}

public clearAllFilters(): void {
    this.dataTableStore?.dispatch(actions.clearFilters());
}

// view.ts
s.dataTable({ bindings: { data: "dataTableOptions" }, columns: [/* ... */] });
s.button({ events: [{ event: "click", handler: s.getTypedProp("filterIdEquals1") }] });
s.button({ events: [{ event: "click", handler: s.getTypedProp("clearAllFilters") }] });
```

**Example: Filter State**:

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
} from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Row = { id: number; name: string; qty: number };

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2 },
            { id: 2, name: "beta", qty: 5 },
            { id: 3, name: "gamma", qty: 2 },
        ];
        const dataEngine = new ArrayDataEngine<Row>({ data: rows });
        const { options, store } = createDataTable<Row>({
            data: dataEngine,
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-filter-state-snippet" }),
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public filterIdEquals1(): void {
        this.dataTableStore?.dispatch(
            actions.setFilter({
                key: "id",
                filter: { field: "id", operator: "Equal", values: { value: 1 } },
            })
        );
    }

    public clearAllFilters(): void {
        this.dataTableStore?.dispatch(actions.clearFilters());
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
    s.page("DataDocFilterState", "Programmatic filters");
    s.view("main", (s) => {
        s.div({ height: 340 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                filtering: dataTable.view.filtering.dialogFiltering(),
                columns: [
                    column({ field: "id", header: "ID", filtering: true }),
                    column({ field: "name", header: "Name", filtering: true }),
                    column({ field: "qty", header: "Qty", filtering: true }),
                ],
            });
            s.button({
                text: "Filter id = 1",
                margin: { top: 2 },
                events: [{ event: "click", handler: s.getTypedProp("filterIdEquals1") }],
            });
            s.button({
                text: "Clear all filters",
                margin: { top: 1 },
                events: [{ event: "click", handler: s.getTypedProp("clearAllFilters") }],
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [filtering-column-filter-configuration](filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [types](types.md): the declarations of the types used here, `FilterEngineContext`, `DataTableStore`, `FilterEngineColumnDescriptor`, `FilterExpression`, `FilterEngine`, `SelectionState`, `RowMutationsFactory`, `ActiveFilterIndicator`, `ConfiguratorEngine`; search it for a name rather than reading it whole
