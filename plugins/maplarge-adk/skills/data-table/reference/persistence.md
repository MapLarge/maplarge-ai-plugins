# Data Table - Persistence

<!-- Automatically generated, do not edit -->

A data table persists sort, filter, column visibility, and column width through a pluggable storage engine. Pass `storage` on `s.dataTable(dataTableOptions<TRow>({ ... }))` in the View, or on `createDataTable({ ... })` when you need the store handle.

## Storage Engines

Choose a built-in engine ref or implement your own IPersistenceEngine.

**Storage Option**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `storage` | `IPersistenceEngine \| PersistenceEngineRef` | no | V B | Persistence engine for sort, filter, column visibility, and column width state. Omit to disable persistence. It also saves each column's order, header, format and display unit. | `dataTable.view.storage.localStore({ prefix: "myTable" })` |

**Storage Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `localStore` | Browser localStorage, keyed by a prefix. Portable, good for snippets, mostly for development. Does not differentiate between users. | On the View, pass `storage: dataTable.view.storage.localStore({ prefix: "..." })` inside `s.dataTable(dataTableOptions({... }))`. |
| `userPrefs` | MapLarge user preferences API to save settings per the logged-in user. | On the View, pass `storage: dataTable.view.storage.userPrefs({ preferenceKey: "..." })` inside `s.dataTable(dataTableOptions({... }))`. |

Or build a custom storage engine.

## Engine: `localStore`

Stores state as JSON in window.localStorage under `dataTable.${prefix}`. Engine ref and createDataTable factory are both `localStore`.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `prefix` | `string` | no | Unique key suffix for the localStorage entry. The full key is dataTable.${prefix}. Defaults to the dashboard id and view name on a dashboard. Outside a dashboard give one. |

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
    s.page("PersistenceDocLocalStoreView", "localStore (View)");
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
                // localStorage key will be "dataTable.my-grid"
                storage: dataTable.view.storage.localStore({ prefix: "my-grid" }),
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
            // localStorage key will be "dataTable.my-grid"
            storage: dataTable.viewModel.storage.localStore({ prefix: "my-grid" }),
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
    s.page("PersistenceDocLocalStoreViewModel", "localStore (ViewModel)");
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

## Engine: `userPrefs`

Reads and writes state through the MapLarge user preferences API.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `preferenceKey` | `string` | no | Key passed to getUserPreference and setUserPreference on the host user context. Defaults to the dashboard id and view name on a dashboard. Outside a dashboard give one. |

**Example: Authored in the View**:

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
    s.page("PersistenceDocUserPrefsView", "userPrefs (View)");
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
                // stored in the MapLarge user context under the key "my-grid"
                storage: dataTable.view.storage.userPrefs({ preferenceKey: "my-grid" }),
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
            // stored in the MapLarge user context under the key "my-grid"
            storage: dataTable.viewModel.storage.userPrefs({ preferenceKey: "my-grid" }),
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
    s.page("PersistenceDocUserPrefsViewModel", "userPrefs (ViewModel)");
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

## Persisted State

Storage engines read and write `DataTableSavedState` - the serialized view state:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `sort` | `SortState` | no | Active sort. key is the column key; field is the data field; direction is asc or desc. |
| `filters` | `Record<string, FilterExpression>` | no | Active filter expressions, keyed by column key. |
| `columnVisibility` | `Record<string, boolean>` | no | Visibility flag per column key. False means hidden. |
| `columnWidths` | `Record<string, string>` | no | Column width strings per column key, as set by the user resizing columns. |
| `columnOrder` | `readonly string[]` | no | Column keys in the order the user arranged them in the column picker. Omitted while the table is still in its authored order. |
| `columnHeaders` | `Record<string, string>` | no | Header text per column key, for columns the user renamed in the column picker. |
| `columnFormatters` | `Record<string, { formatter: string; formatterArgs?: object }>` | no | Format per column key, for columns the user changed in the column picker: the formatter name plus any args, such as the pattern a number column runs. |
| `columnDisplayUnits` | `Record<string, string>` | no | Display unit per column key, for unit columns the user changed in the column picker. |
| `metadata` | `{ version: string; savedAt: string }` | no | Envelope written alongside the saved state. version is the MapLarge client build version at save time; savedAt is an ISO 8601 timestamp of when the state was persisted. version is not a schema revision, and the table reads neither back. |

## When State Saves

The store dispatches actions.persist automatically after each of these user interactions:

- Sorting a column.
- Setting or clearing filters.
- Resizing a column.
- Toggling column visibility.

It also persists after reordering columns, and after changing a column's header, format or display unit in the column picker.

Dispatch persist or clearStorage from the ViewModel store (requires createDataTable):

**Persist Actions Code Snippet**:

```ts
import { createDataTable, actions } from "data-ui/data-table";

const { store } = createDataTable<Row>({ /* ... */ });

// flush the current state to storage immediately
store.dispatch(actions.persist());

// erase only the saved copy; the table on screen is unchanged until the next load
store.dispatch(actions.clearStorage());

// a "Reset to defaults" button: clears the saved copy and restores columns, sort and filters
store.dispatch(actions.resetGrid());
```

## Build a Custom Storage Engine

Implement IPersistenceEngine.

### Persistence engine contract

The contract is `IPersistenceEngine`.

Methods your persistence engine implementation must provide.

**Persistence Engine Contract**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `load` | `() => Outcome<DataTableSavedState \| undefined, Error>` | yes | Read and decode persisted state. Return ok(undefined) when there is nothing stored. Return ok(state) when data is present. Return notOk(error) on a hard failure. |
| `save` | `(state: DataTableSavedState) => Outcome<void, Error>` | yes | Write the full snapshot atomically. |
| `clear` | `() => Outcome<void, Error>` | yes | Remove stored state for this table. |

### Custom Storage Engine Example

sessionStorage example - state clears when the tab closes.

**Authored in View**:

```ts
import type { IPersistenceEngine, DataTableSavedState, Outcome } from "data-ui/data-table";
import { ok, notOk, decodeSavedState } from "data-ui/data-table";

class SessionStorageEngine implements IPersistenceEngine {
    private readonly storageKey: string;

    constructor(key: string) {
        this.storageKey = key;
    }

    load(): Outcome<DataTableSavedState | undefined, Error> {
        try {
            const raw = sessionStorage.getItem(this.storageKey);
            if (!raw) return ok(undefined);
            return decodeSavedState(JSON.parse(raw));
        } catch (e) {
            return notOk(e instanceof Error ? e : new Error(String(e)));
        }
    }

    save(state: DataTableSavedState): Outcome<void, Error> {
        try {
            sessionStorage.setItem(this.storageKey, JSON.stringify(state));
            return ok(undefined);
        } catch (e) {
            return notOk(e instanceof Error ? e : new Error(String(e)));
        }
    }

    clear(): Outcome<void, Error> {
        try {
            sessionStorage.removeItem(this.storageKey);
            return ok(undefined);
        } catch (e) {
            return notOk(e instanceof Error ? e : new Error(String(e)));
        }
    }
}

import { createDataTable, dataTable } from "data-ui/data-table";

// ViewModel: the engines registry reaches the table only through the options it is bound to
const { options } = createDataTable<Row>({
    data: dataTable.viewModel.data.dataStoreData({ /* ... */ }),
    schema,
    engines: {
        storage: {
            sessionStorage: (args: { key: string }) => new SessionStorageEngine(args.key),
        },
    },
});
this.dataTableOptions = options;

// View: bind those options, then select the engine by name
s.dataTable({
    bindings: { data: "dataTableOptions" },
    columns,
    storage: dataTable.view.storage.custom("sessionStorage", { key: "my-grid" }),
});
```

**Authored in ViewModel**:

```ts
import type { IPersistenceEngine, DataTableSavedState, Outcome } from "data-ui/data-table";
import { ok, notOk, decodeSavedState } from "data-ui/data-table";

class SessionStorageEngine implements IPersistenceEngine {
    private readonly storageKey: string;

    constructor(key: string) {
        this.storageKey = key;
    }

    load(): Outcome<DataTableSavedState | undefined, Error> {
        try {
            const raw = sessionStorage.getItem(this.storageKey);
            if (!raw) return ok(undefined);
            return decodeSavedState(JSON.parse(raw));
        } catch (e) {
            return notOk(e instanceof Error ? e : new Error(String(e)));
        }
    }

    save(state: DataTableSavedState): Outcome<void, Error> {
        try {
            sessionStorage.setItem(this.storageKey, JSON.stringify(state));
            return ok(undefined);
        } catch (e) {
            return notOk(e instanceof Error ? e : new Error(String(e)));
        }
    }

    clear(): Outcome<void, Error> {
        try {
            sessionStorage.removeItem(this.storageKey);
            return ok(undefined);
        } catch (e) {
            return notOk(e instanceof Error ? e : new Error(String(e)));
        }
    }
}

import { createDataTable, dataTable } from "data-ui/data-table";

// ViewModel
const { options } = createDataTable<Row>({
    data: dataTable.viewModel.data.dataStoreData({ /* ... */ }),
    schema,
    columns,
    storage: new SessionStorageEngine("my-grid"),
});
this.dataTableOptions = options;

// View
s.dataTable({ bindings: { data: "dataTableOptions" } });
```

## Related

- [types](types.md): the declarations of the types used here, `IPersistenceEngine`, `DataTableSavedState`, `FilterExpression`, `SortState`; search it for a name rather than reading it whole
