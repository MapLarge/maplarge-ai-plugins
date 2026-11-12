# Data Table - Data - Build a Custom Data Engine

<!-- Automatically generated, do not edit -->

## Build a Custom Data Engine

Implement one of the interfaces below.

A table built on an ICursorDataEngine shows no rows. For a token-based backend, write an offset engine (or use asyncData) and keep the page tokens inside your own fetch code.

- Limit-based pagination (see the IOffsetDataEngine contract below).
- Token-based pagination (see the ICursorDataEngine contract below).

### IOffsetDataEngine Contract

The `IOffsetDataEngine` contract:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"offset"` | yes | Engine type tag. |
| `getRows` | `(args: { readonly start: number; readonly count: number; }) => Promise<{ readonly rows: TRow[]; readonly hasMore: boolean; }>` | yes | Returns rows for start/count and hasMore. |
| `rowCount` | `number` | no | Optional total row count. Omit when total is unknown; requires infiniteScroll. |
| `setSort` | `(args: { readonly sort: SortState \| null; }) => void \| Promise<void>` | yes | Sets current sort state. |
| `setFilters` | `(args: { readonly filter: FilterExpression<TFilterOps> \| null; readonly constraints?: readonly FilterExpression[]; }) => void \| Promise<void>` | yes | Sets the current filter expression and constraints. Constraints come from actions.setConstraint and integrations such as mapViewportSync. Apply both, AND-ing the constraints onto the filter, or those narrowings are ignored. |
| `updateRow` | `(args: { readonly row: TRow; readonly changedFields: readonly (keyof TRow)[]; }) => Promise<Outcome<void, unknown>>` | no | Optional row update handler. Default MapLarge wiring is provided by DataSourceDataEngine when editable is true. |
| `createRow` | `(args: { readonly row: TRow; readonly atIndex?: GlobalRowIndex; }) => Promise<Outcome<void, unknown>>` | no | Optional row creation handler. |
| `removeRow` | `(args: { readonly rowIndex: GlobalRowIndex; readonly row?: TRow; }) => Promise<Outcome<void, unknown>>` | no | Optional row deletion handler. |
| `removeRows` | `(args: { readonly rowIndices: readonly GlobalRowIndex[]; readonly rows: readonly TRow[]; }) => Promise<Outcome<void, unknown>>` | no | Optional bulk-delete handler. store.mutations.removeBulk() throws when the engine does not implement it. |
| `filterCapabilities` | `FilterCapabilities<TFilterOps>` | no | Allowed filter operators. The filter operators the engine applies, as { operators: [...] }. The filter dialog offers only these, so an engine without it gets filter dialogs with no condition. |
| `getColumnEmptiness` | `(args: { readonly fields: readonly string[]; }) => Promise<ReadonlyMap<string, boolean>>` | no | Whole-dataset emptiness probe: true for a field means the engine holds no data for it, regardless of what the viewport loaded. |
| `getColumnMetadata` | `() => readonly DiscoveredColumnEntry[]` | no | Optional. Column metadata for discoverable schema. Synchronous - the node does not await it. |

### ICursorDataEngine Contract

The `ICursorDataEngine` contract:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"cursor"` | yes | Engine type tag. |
| `getRows` | `(args: { readonly cursor: string \| null; readonly count: number; readonly direction?: "forward" \| "backward"; }) => Promise<{ readonly rows: TRow[]; readonly hasMore: boolean; readonly cursors: { readonly next: string \| null; readonly prev: string \| null; }; }>` | yes | Returns rows and next/prev cursors. |
| `rowCount` | `number` | no | Optional total row count. |
| `setFilters` | `(args: { readonly filter: FilterExpression<TFilterOps> \| null; readonly constraints?: readonly FilterExpression[]; }) => void \| Promise<void>` | yes | Sets the current filter expression and constraints. Constraints come from actions.setConstraint and integrations such as mapViewportSync. Apply both, AND-ing the constraints onto the filter, or those narrowings are ignored. |
| `updateRow` | `(args: { readonly row: TRow; readonly changedFields: readonly (keyof TRow)[]; }) => Promise<Outcome<void, unknown>>` | no | Optional row update handler. |
| `filterCapabilities` | `FilterCapabilities<TFilterOps>` | no | Allowed filter operators. The filter operators the engine applies, as { operators: [...] }. The filter dialog offers only these, so an engine without it gets filter dialogs with no condition. |
| `getColumnEmptiness` | `(args: { readonly fields: readonly string[]; }) => Promise<ReadonlyMap<string, boolean>>` | no | Whole-dataset emptiness probe: true for a field means the engine holds no data for it, regardless of what the viewport loaded. |
| `getColumnMetadata` | `() => readonly DiscoveredColumnEntry[]` | no | Optional. Column metadata for discoverable schema. Synchronous - the node does not await it. |

### Custom Data Engine Example

Implements IOffsetDataEngine over an in-memory list and returns rows by start/count. The engine class lives in the ViewModel - Views must stay serializable, so never construct an engine in a View. A View-authored table references it by name with data: { binding: "buildDataEngine" }; a ViewModel-authored table passes the instance to createDataTable directly.

Its setSort and setFilters do nothing, so the sample's columns turn sort and filtering off.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import type {
    DataEngine,
    FilterExpression,
    IOffsetDataEngine,
    RowsResult,
    SortState,
} from "data-ui/data-table";

export type Row = { id: number; label: string };

class ListOffsetEngine implements IOffsetDataEngine<Row> {
    readonly type = "offset" as const;

    private readonly sourceRows: readonly Row[];

    constructor(sourceRows: readonly Row[]) {
        this.sourceRows = sourceRows;
    }

    setSort(_args: { readonly sort: SortState | null }): void {}

    setFilters(_args: { readonly filter: FilterExpression | null }): void {}

    async getRows(args: {
        readonly start: number;
        readonly count: number;
    }): Promise<RowsResult<Row>> {
        const slice = this.sourceRows.slice(args.start, args.start + args.count);
        const hasMore = args.start + slice.length < this.sourceRows.length;
        return { rows: [...slice], hasMore };
    }

    get rowCount(): number {
        return this.sourceRows.length;
    }
}

export class ViewModel extends RaptorViewModel {
    buildDataEngine(): DataEngine<Row> {
        const demoRows: readonly Row[] = Array.from({ length: 20 }, (_unusedValue, index) => ({
            id: index + 1,
            label: "row-" + String(index + 1),
        }));
        return new ListOffsetEngine(demoRows);
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

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        label: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomOffsetEngineViewArm", "Custom IOffsetDataEngine (View)");
    s.view("main", (s) => {
        s.div({ height: 280 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                // serializable name ref; the live engine is built by the ViewModel
                data: { binding: "buildDataEngine" },
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80), sort: false, filtering: false }),
                    column({ field: "label", header: "Label", width: toPixels(200), sort: false, filtering: false }),
                ],
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 }),
                storage: dataTable.view.storage.localStore({ prefix: "doc-custom-offset-engine-v" }),
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
import type {
    DataTableOptions,
    FilterExpression,
    IOffsetDataEngine,
    RowsResult,
    SortState,
} from "data-ui/data-table";

export type Row = { id: number; label: string };

const { column } = dataTable.viewModel.defineColumns<Row>();

class ListOffsetEngine implements IOffsetDataEngine<Row> {
    readonly type = "offset" as const;

    private readonly sourceRows: readonly Row[];

    constructor(sourceRows: readonly Row[]) {
        this.sourceRows = sourceRows;
    }

    setSort(_args: { readonly sort: SortState | null }): void {}

    setFilters(_args: { readonly filter: FilterExpression | null }): void {}

    async getRows(args: {
        readonly start: number;
        readonly count: number;
    }): Promise<RowsResult<Row>> {
        const slice = this.sourceRows.slice(args.start, args.start + args.count);
        const hasMore = args.start + slice.length < this.sourceRows.length;
        return { rows: [...slice], hasMore };
    }

    get rowCount(): number {
        return this.sourceRows.length;
    }
}

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const demoRows: readonly Row[] = Array.from({ length: 20 }, (_unusedValue, index) => ({
            id: index + 1,
            label: "row-" + String(index + 1),
        }));
        const { options } = createDataTable<Row>({
            data: new ListOffsetEngine(demoRows),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    label: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID", width: toPixels(80), sort: false, filtering: false }),
                column({ field: "label", header: "Label", width: toPixels(200), sort: false, filtering: false }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-custom-offset-engine-b" }),
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
import { dataTableOptions } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomOffsetEngineBindingArm", "Custom IOffsetDataEngine (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 280 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

### Custom Engine Without rowCount (Infinite Scroll)

When the backend never reports a total, e.g. a streaming log or a paginated API that only says 'there is more', omit rowCount entirely and pair the engine with infiniteScroll.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import type {
    DataEngine,
    FilterExpression,
    IOffsetDataEngine,
    RowsResult,
    SortState,
} from "data-ui/data-table";

export type Row = { id: number; label: string };

class PagedLogEngine implements IOffsetDataEngine<Row> {
    readonly type = "offset" as const;

    private readonly allRows: readonly Row[];

    constructor(allRows: readonly Row[]) {
        this.allRows = allRows;
    }

    setSort(_args: { readonly sort: SortState | null }): void {}

    setFilters(_args: { readonly filter: FilterExpression | null }): void {}

    async getRows(args: {
        readonly start: number;
        readonly count: number;
    }): Promise<RowsResult<Row>> {
        await new Promise((resolve) => setTimeout(resolve, 120));
        const slice = this.allRows.slice(args.start, args.start + args.count);
        const hasMore = args.start + slice.length < this.allRows.length;
        return { rows: [...slice], hasMore };
    }
}

export class ViewModel extends RaptorViewModel {
    buildDataEngine(): DataEngine<Row> {
        const demoRows: readonly Row[] = Array.from({ length: 50 }, (_unusedValue, index) => ({
            id: index + 1,
            label: "log-entry-" + String(index + 1),
        }));
        return new PagedLogEngine(demoRows);
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

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        label: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocNoRowCountEngineViewArm", "IOffsetDataEngine, no rowCount (View)");
    s.view("main", (s) => {
        s.div({ height: 280 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                // serializable name ref; the live engine is built by the ViewModel
                data: { binding: "buildDataEngine" },
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(80), sort: false, filtering: false }),
                    column({ field: "label", header: "Label", width: toPixels(200), sort: false, filtering: false }),
                ],
                rowScrolling: dataTable.view.rowScrolling.infiniteScroll({ fixedRowHeight: 32 }),
                storage: dataTable.view.storage.localStore({ prefix: "doc-no-rowcount-engine-v" }),
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
import type {
    DataTableOptions,
    FilterExpression,
    IOffsetDataEngine,
    RowsResult,
    SortState,
} from "data-ui/data-table";

export type Row = { id: number; label: string };

const { column } = dataTable.viewModel.defineColumns<Row>();

class PagedLogEngine implements IOffsetDataEngine<Row> {
    readonly type = "offset" as const;

    private readonly allRows: readonly Row[];

    constructor(allRows: readonly Row[]) {
        this.allRows = allRows;
    }

    setSort(_args: { readonly sort: SortState | null }): void {}

    setFilters(_args: { readonly filter: FilterExpression | null }): void {}

    async getRows(args: {
        readonly start: number;
        readonly count: number;
    }): Promise<RowsResult<Row>> {
        await new Promise((resolve) => setTimeout(resolve, 120));
        const slice = this.allRows.slice(args.start, args.start + args.count);
        const hasMore = args.start + slice.length < this.allRows.length;
        return { rows: [...slice], hasMore };
    }
}

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const demoRows: readonly Row[] = Array.from({ length: 50 }, (_unusedValue, index) => ({
            id: index + 1,
            label: "log-entry-" + String(index + 1),
        }));
        const { options } = createDataTable<Row>({
            data: new PagedLogEngine(demoRows),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    label: schema.string(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID", width: toPixels(80), sort: false, filtering: false }),
                column({ field: "label", header: "Label", width: toPixels(200), sort: false, filtering: false }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.infiniteScroll({ fixedRowHeight: toPixels(32) }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-no-rowcount-engine-b" }),
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
import { dataTableOptions } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocNoRowCountEngineBindingArm", "IOffsetDataEngine, no rowCount (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 280 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [data-data-engines](data-data-engines.md): Data - Data Engines and more
- [types](types.md): the declarations of the types used here, `DataEngine`, `SortState`, `FilterExpression`, `IPersistenceEngine`, `DataTableSavedState`, `FilterCapabilities`, `DiscoveredColumnEntry`; search it for a name rather than reading it whole
