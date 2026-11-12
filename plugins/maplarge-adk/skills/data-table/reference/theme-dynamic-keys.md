# Data Table - Theme - Dynamic Keys and more

<!-- Automatically generated, do not edit -->

## Dynamic Keys

Unlike table-scoped options, a theme rule's where is not evaluated against table context (rowCount, isFiltered, ...) - each entry type has its own subject: rowThemes and cellThemes evaluate against the row, columnThemes and headerThemes against the column definition (key, field, header). For cellThemes, matchColumns - not where - selects the columns the entry runs for.

### rowThemes

Themes that apply to entire rows. Each entry is exactly one of:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `callback` | `(context) => DataTableThemeStyling \| undefined` | no | V B | Inline callback or ViewModel binding that returns styling for the row. | - |
| `rule` | `DeclarativeRule<DataTableThemeStyling>` | no | R | Declarative rule evaluated against the row; applyValue is used when it matches. | `{ background: "danger" }` |

Examples for `rule`:

**Example: Theme Row Themes**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    type GetRowThemeStylingContext,
    type DataTableThemeStyling,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

export class ViewModel extends RaptorViewModel {
    getRowDownStyling({ row }: GetRowThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return row.status === "down" ? { background: "danger", customTextColor: "#fff", fontWeight: "bold" } : undefined;
    }

    getRowHighLatencyStyling({ row }: GetRowThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return row.latencyMs > 1500 ? { opacity: 50 } : undefined;
    }

    public initialize(): void {
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
    schema,
    toPixels,
} from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

function generateRows(count: number): Row[] {
    const services = ["api-gateway", "auth-service", "payment-api", "user-service", "email-worker", "cache-proxy", "report-svc", "search-api"];
    const regions = ["us-east", "us-west", "eu-central", "ap-south"];
    const statuses = ["healthy", "degraded", "down"] as const;
    return Array.from({ length: count }, (_, i) => ({
        service: services[i % services.length],
        region: regions[i % regions.length],
        latencyMs: Math.floor(Math.random() * 3501) + 500,
        status: statuses[i % statuses.length],
    }));
}

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocThemeRowThemes", "Theme - rowThemes");
    s.view("main", (s) => {
        s.div({ height: 380 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: generateRows(200) }),
                schema: dataTable.view.schema.createSchema({
                    entries: {
                        service: schema.string(),
                        region: schema.string(),
                        latencyMs: schema.number(),
                        status: schema.string(),
                    },
                }),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(26) }),
                columns: [
                    column({ field: "service", header: "Service", width: toPixels(160) }),
                    column({ field: "region", header: "Region", width: toPixels(120) }),
                    column({ field: "latencyMs", header: "Latency (ms)", width: toPixels(130) }),
                    column({ field: "status", header: "Status", width: toPixels(110) }),
                ],
                theme: {
                    rowThemes: [
                        { callback: { binding: "getRowDownStyling" } },
                        { callback: { binding: "getRowHighLatencyStyling" } },
                    ],
                },
            }));
        });
    });
    return s.commitPage();
}
```

The callback receives `GetRowThemeStylingContext`:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `row` | `TRow` | yes | The data row assigned to this slot. It is an empty object ({}) while the row's data is still loading, and the callback is called again once the data arrives. Guard reads such as row.status?.toLowerCase(), or use a declarative rule. |
| `globalRowIndex` | `GlobalRowIndex` | yes | Zero-based index of the row in the full dataset. |

### columnThemes

Column-slot theme rules (use cellThemes for the cell span inside it, which has row data). Each entry is exactly one of:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `callback` | `(context) => DataTableThemeStyling \| undefined` | no | V B | Inline callback or ViewModel binding that returns styling for the column slot. | - |
| `rule` | `DeclarativeRule<DataTableThemeStyling>` | no | R | Declarative rule evaluated against the column definition; applyValue is used when it matches. | `{ background: "danger" }` |

Examples for `rule`:

**Example: Theme Column Themes**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    type GetColumnThemeStylingContext,
    type DataTableThemeStyling,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

export class ViewModel extends RaptorViewModel {
    getColumnLatencyStyling({ columnKey }: GetColumnThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return columnKey === "latencyMs" ? { background: "danger", customTextColor: "#fff", fontWeight: "bold" } : undefined;
    }

    getColumnStatusStyling({ columnKey }: GetColumnThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return columnKey === "status" ? { fontStyle: "italic", customTextColor: "#6c757d" } : undefined;
    }

    public initialize(): void {
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
    schema,
    toPixels,
} from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

function generateRows(count: number): Row[] {
    const services = ["api-gateway", "auth-service", "payment-api", "user-service", "email-worker", "cache-proxy", "report-svc", "search-api"];
    const regions = ["us-east", "us-west", "eu-central", "ap-south"];
    const statuses = ["healthy", "degraded", "down"] as const;
    return Array.from({ length: count }, (_, i) => ({
        service: services[i % services.length],
        region: regions[i % regions.length],
        latencyMs: Math.round(10 + (i * 37 + i * i * 3) % 2200),
        status: statuses[i % statuses.length],
    }));
}

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocThemeColumnThemes", "Theme - columnThemes");
    s.view("main", (s) => {
        s.div({ height: 380 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: generateRows(200) }),
                schema: dataTable.view.schema.createSchema({
                    entries: {
                        service: schema.string(),
                        region: schema.string(),
                        latencyMs: schema.number(),
                        status: schema.string(),
                    },
                }),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(26) }),
                columns: [
                    column({ field: "service", header: "Service", width: toPixels(160) }),
                    column({ field: "region", header: "Region", width: toPixels(120) }),
                    column({ field: "latencyMs", header: "Latency (ms)", width: toPixels(130) }),
                    column({ field: "status", header: "Status", width: toPixels(110) }),
                ],
                theme: {
                    columnThemes: [
                        { callback: { binding: "getColumnLatencyStyling" } },
                        { callback: { binding: "getColumnStatusStyling" } },
                        {
                            rule: {
                                where: { field: "key", test: "Equal", value: "region" },
                                applyValue: { customTextColor: "#d63384" },
                            },
                        },
                    ],
                },
            }));
        });
    });
    return s.commitPage();
}
```

The callback receives `GetColumnThemeStylingContext`:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `columnKey` | `string` | yes | The field key of the column. |
| `column` | `Column<TRow>` | no | The full column definition; present whenever the column is resolvable. |

### cellThemes

Per-cell theming rules. Each entry is exactly one of:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `callback` | `(context) => DataTableThemeStyling \| undefined` | no | V B | Inline callback or ViewModel binding that returns styling for the cell. | - |
| `rule` | `DeclarativeRule<DataTableThemeStyling>` | no | R | Declarative rule evaluated against the row; applyValue is used when it matches. | `{ background: "danger" }` |

Examples for `rule`:

#### Scoping to Columns

By default an entry runs for every column. `matchColumns` restricts it to specific columns - use an exact matcher for one column, or a regex matcher to target several.

**Cell Theme Column Scope**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `matchColumns` | `ViewMatcher` | no | V | A matcher restricting the entry to specific columns; a regex matcher can target several at once. | `{ type: "regex", pattern: "^metric" }` |

**Example: Theme Cell Themes**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    type GetCellThemeStylingContext,
    type DataTableThemeStyling,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

export class ViewModel extends RaptorViewModel {
    getCellLatencyStyling({ row }: GetCellThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return row.latencyMs > 1000 ? { customTextColor: "#fd7e14", fontWeight: "bold" } : undefined;
    }

    getCellStatusStyling({ row }: GetCellThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return row.status === "down" ? { background: "danger", textColor: "white" } : undefined;
    }

    public initialize(): void {
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
    schema,
    toPixels,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

function generateRows(count: number): Row[] {
    const services = ["api-gateway", "auth-service", "payment-api", "user-service", "email-worker", "cache-proxy", "report-svc", "search-api"];
    const regions  = ["us-east", "us-west", "eu-central", "ap-south"];
    const statuses = ["healthy", "degraded", "down"] as const;
    return Array.from({ length: count }, (_, i) => ({
        service:   services[i % services.length],
        region:    regions[i % regions.length],
        latencyMs: Math.floor(Math.random() * 3501) + 500,
        status:    statuses[i % statuses.length],
    }));
}

import type { ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocThemeCellThemes", "Theme - cellThemes");
    s.view("main", (s) => {
        s.div({ height: 380 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: generateRows(200) }),
            schema: dataTable.view.schema.createSchema({
                entries: {
                    service:   schema.string(),
                    region:    schema.string(),
                    latencyMs: schema.number(),
                    status:    schema.string(),
                },
            }),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(26) }),
                columns: [
                    column({ field: "service",   header: "Service",      width: toPixels(160) }),
                    column({ field: "region",    header: "Region",       width: toPixels(120) }),
                    column({ field: "latencyMs", header: "Latency (ms)", width: toPixels(130) }),
                    column({ field: "status",    header: "Status",       width: toPixels(110) }),
                ],
                theme: {
                    cellThemes: [
                        { matchColumns: { type: "exact", value: "latencyMs" }, callback: { binding: "getCellLatencyStyling" } },
                        { matchColumns: { type: "exact", value: "status" }, callback: { binding: "getCellStatusStyling" } },
                        {
                            matchColumns: { type: "exact", value: "region" },
                            rule: {
                                where: { field: "region", test: "Equal", value: "ap-south" },
                                applyValue: { fontStyle: "italic" },
                            },
                        },
                    ],
                },
            }));
        });
    });
    return s.commitPage();
}
```

The callback receives `GetCellThemeStylingContext`:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `row` | `TRow` | yes | The data row assigned to this row slot. It is an empty object ({}) while the row's data is still loading, and the callback is called again once the data arrives. Guard field reads, or use a declarative rule. |
| `globalRowIndex` | `GlobalRowIndex` | yes | Zero-based index of the row in the full dataset. |
| `column` | `Column<TRow>` | yes | The column definition for the cell being themed. |

### headerThemes

Per-header-cell theming rules. Scope to specific columns by testing context.column in a callback, or by writing rule.where against the column.

**Header Theme Styling Source**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `callback` | `(context) => DataTableThemeStyling \| undefined` | no | V B | Inline callback or ViewModel binding that returns styling for the header cell. | - |
| `rule` | `DeclarativeRule<DataTableThemeStyling>` | no | R | Declarative rule evaluated against the column definition; applyValue is used when it matches. | `{ background: "danger" }` |

Examples for `rule`:

#### Modifiers

Independent of which one you use, an optional modifier:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `target` | `"headerCell" \| "headerContent"` | no | V | Which sub-element receives the styling; the outer header cell (headerCell), or its inner text/label wrapper (headerContent). Defaults to "headerCell". |

**Example: Theme Header Themes**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    type GetHeaderThemeStylingContext,
    type DataTableThemeStyling,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

export class ViewModel extends RaptorViewModel {
    getHeaderLatencyStyling({ column }: GetHeaderThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return column.key === "latencyMs" ? { fontWeight: "bold", customTextColor: "#dc3545" } : undefined;
    }

    getHeaderStatusStyling({ column }: GetHeaderThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return column.key === "status" ? { background: "primary", customTextColor: "#fff" } : undefined;
    }

    public initialize(): void {
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
    schema,
    toPixels,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

function generateRows(count: number): Row[] {
    const services = ["api-gateway", "auth-service", "payment-api", "user-service", "email-worker", "cache-proxy", "report-svc", "search-api"];
    const regions  = ["us-east", "us-west", "eu-central", "ap-south"];
    const statuses = ["healthy", "degraded", "down"] as const;
    return Array.from({ length: count }, (_, i) => ({
        service:   services[i % services.length],
        region:    regions[i % regions.length],
        latencyMs: Math.floor(Math.random() * 3501) + 500,
        status:    statuses[i % statuses.length],
    }));
}

import type { ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocThemeHeaderThemes", "Theme - headerThemes");
    s.view("main", (s) => {
        s.div({ height: 380 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: generateRows(200) }),
            schema: dataTable.view.schema.createSchema({
                entries: {
                    service:   schema.string(),
                    region:    schema.string(),
                    latencyMs: schema.number(),
                    status:    schema.string(),
                },
            }),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(26) }),
                columns: [
                    column({ field: "service",   header: "Service",      width: toPixels(160) }),
                    column({ field: "region",    header: "Region",       width: toPixels(120) }),
                    column({ field: "latencyMs", header: "Latency (ms)", width: toPixels(130) }),
                    column({ field: "status",    header: "Status",       width: toPixels(110) }),
                ],
                theme: {
                    headerThemes: [
                        { target: "headerContent", callback: { binding: "getHeaderLatencyStyling" } },
                        { callback: { binding: "getHeaderStatusStyling" } },
                        {
                            rule: {
                                where: { field: "key", test: "Equal", value: "region" },
                                applyValue: { fontStyle: "italic" },
                            },
                        },
                    ],
                },
            }));
        });
    });
    return s.commitPage();
}
```

The callback receives `GetHeaderThemeStylingContext`:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `column` | `Column<TRow>` | yes | The column definition for the header cell being themed. |

## Triggering reapply from outside

Theme callbacks only receive the context the engine passes (row, column, globalRowIndex). If a callback closes over an external value (flag, a selection state, a setting) the engine has no way to know that value changed. Dispatch actions.reapplyThemes() after the external value updates to force re-evaluation of the visible rows and columns. When you need a store handle to dispatch, use createDataTable() in the ViewModel and pass its options to s.dataTable via bindings.

**Reapply Themes Action**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `ReapplyThemesKind` | no | Which callbacks to re-run. Defaults to "all". |
| `columnKeys` | `readonly string[]` | no | Limit to these column keys. Ignored for kinds that are not column-scoped. |
| `globalRowIndexes` | `readonly GlobalRowIndex[]` | no | Limit to these global row indexes. Ignored for kinds that are not row-scoped. |

**Reapply Themes Code Snippet**:

```ts
let showHighlights = false;
const highlightStyling = { background: "info", textColor: "warning" };

// view model - createDataTable is still used when you need the store handle
class MyViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    private store: DataTableStore<Row> | null = null;

    getCellHighlightStyling(context: GetCellThemeStylingContext<Row>): DataTableThemeStyling | undefined {
        return showHighlights ? highlightStyling : undefined;
    }

    toggleHighlights(): void {
        showHighlights = !showHighlights;
        this.store?.dispatch(actions.reapplyThemes({ kind: "cells" }));
    }

    public initialize(): void {
        const { options, store } = createDataTable<Row>({ data: dataEngine, schema });
        this.dataTableOptions = options;
        this.store = store;
        this.update();
    }
}

// view - theme on s.dataTable (B arm); data/options from createDataTable for store access
s.dataTable({
    bindings: { data: "dataTableOptions" },
    columns: [...],
    theme: {
        cellThemes: [{ callback: { binding: "getCellHighlightStyling" } }],
    },
});

// scoped variants - only reapply for specific columns or rows:
this.store?.dispatch(actions.reapplyThemes({ kind: "cells", columnKeys: ["amount"] }));
this.store?.dispatch(actions.reapplyThemes({ kind: "rows", globalRowIndexes: [toGlobalRowIndex(selectedRowIndex)] }));
```

## Related

- [theme-theme-options](theme-theme-options.md): Theme - Theme Options and more
- [types](types.md): the declarations of the types used here, `DataTableThemeStyling`, `DeclarativeRule`, `GetRowThemeStylingContext`, `GetColumnThemeStylingContext`, `ViewModelMatcher`, `GetCellThemeStylingContext`, `GetHeaderThemeStylingContext`, `ReapplyThemesKind`; search it for a name rather than reading it whole
