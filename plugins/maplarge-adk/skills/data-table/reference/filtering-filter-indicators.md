# Data Table - Filtering - Filter Indicators and more

<!-- Automatically generated, do not edit -->

## Filter Indicators

Filter indicators render around the data table to surface active filter state. Both built-in indicators are enabled by default: a funnel icon in each filtered column header, and a row of filter chips below the data table.

Indicators render into two slots:

- headerCell: renders inside each column header. Used for per-column affordances like a funnel icon.
- belowGrid: renders beneath the data table. Used for summary UI like active filter chips.

The following built-in indicator engines are available for the headerCell and belowGrid slots:

- filterFunnelIndicator - funnel icon per column header (headerCell slot).
- filterChipsIndicator - active filter chips below the data table (belowGrid slot).

filterFunnelIndicator

Renders a filled funnel icon in each column header when that column has an active filter. Clicking the icon engages the filter engine for that column.

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `filterIconSize` | `{ width: number; height: number }` | no | `{ width: 14, height: 14 }` | Width and height of the funnel icon in pixels. |

filterChipsIndicator

Renders a row of chips below the data table, one per active filter. Each chip shows the column name and a summary of the expression. Clicking a chip engages the filter engine for that column; clicking the X clears that column's filter.

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `chipFilterIconSize` | `{ width: number; height: number }` | no | `{ width: 12, height: 12 }` | Width and height of the funnel icon on each chip. |
| `chipClearIconSize` | `{ width: number; height: number }` | no | `{ width: 10, height: 10 }` | Width and height of the X (clear) icon on each chip. |
| `summarizeExpression` | `(args: { columnKey: string; expression: FilterExpression }) => string` | no | - | Override how chip summary text is built. |

Use summarizeExpression to override how chip summary text is built.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { isSingleFilterExpression } from "data-ui/data-table";
import type { FilterExpression } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

// summarizeExpression is a function, so it cannot live in the View definition;
// the View references it with { binding: "summarizeChip" }
export class ViewModel extends RaptorViewModel {
    summarizeChip({ expression }: { readonly expression: FilterExpression }): string {
        // FilterExpression is a union; narrow to the leaf before reading operator/values
        if (!isSingleFilterExpression(expression)) return "";
        return `${expression.operator} ${String(expression.values.value ?? "")}`;
    }
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
    s.page("FilteringDocChipsSummarizeView", "Filter Chip Summary (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID", filtering: true }),
                    column({ field: "name", header: "Name", filtering: true }),
                    column({ field: "qty", header: "Qty", filtering: true }),
                ],
                filterIndicators: {
                    // summarizeExpression is a function, so the View binds a ViewModel method
                    belowGrid: dataTable.view.filterIndicators.filterChipsIndicator({
                        summarizeExpression: { binding: "summarizeChip" },
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
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, isSingleFilterExpression, schema } from "data-ui/data-table";
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
            filterIndicators: {
                belowGrid: dataTable.viewModel.filterIndicators.filterChipsIndicator({
                    // FilterExpression is a union; narrow to the leaf before reading operator/values
                    summarizeExpression: ({ expression }) =>
                        isSingleFilterExpression(expression)
                            ? `${expression.operator} ${String(expression.values.value ?? "")}`
                            : "",
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
import { dataTable } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("FilteringDocChipsSummarizeViewModel", "Filter Chip Summary (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", filtering: true }),
                    column({ field: "name", header: "Name", filtering: true }),
                    column({ field: "qty", header: "Qty", filtering: true }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

### Disabling Filter Indicators

Slots are merged with the defaults. Omit a slot to keep its default; set a slot to null to disable it (write null as never, because the option types do not list null).

Setting a slot to undefined does not disable it: undefined is dropped while the options are resolved, so the default indicator comes back.

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
    s.page("FilteringDocIndicatorsDisableView", "Disabling Filter Indicators (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID", filtering: true }),
                    column({ field: "name", header: "Name", filtering: true }),
                    column({ field: "qty", header: "Qty", filtering: true }),
                ],
                // disable only the funnel icons in column headers; the chips row below stays on
                filterIndicators: { headerCell: null as never },
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
            // headerCell disabled; belowGrid kept (rebuilding it explicitly is equivalent to leaving it default)
            filterIndicators: {
                headerCell: null as never,
                belowGrid: dataTable.viewModel.filterIndicators.filterChipsIndicator(),
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
import { dataTable } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("FilteringDocIndicatorsDisableViewModel", "Disabling Filter Indicators (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", filtering: true }),
                    column({ field: "name", header: "Name", filtering: true }),
                    column({ field: "qty", header: "Qty", filtering: true }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Filter Adapters

A filter adapter translates a user's raw filter intent into a FilterExpression before it is sent to the data engine.

Use an adapter when the shape the UI builds does not match what your backend expects.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `operator` | `string` | yes | The operator key chosen in the filter UI. |
| `values` | `Readonly<Record<string, unknown>>` | yes | The slot values from the filter UI (e.g. { value: "alpha" }). |

The adapter returns a FilterExpression or null for each condition of the column's filter. Returning null drops that condition.

It is called once per condition with operator, values and field; when a column filter has several conditions, the others still apply.

```ts
dataTable.viewModel.schema.createSchema({
    entries: {
        status: schema.string({
            filtering: {
                adapter: ({ operator, values }) => {
                    // remap UI Equal on a string to a backend enum check
                    if (operator === "Equal") {
                        return { field: "statusCode", operator: "EqualAny", values: { value: [values.value] } };
                    }
                    return null;
                },
            },
        }),
    },
});
```

## Related

- [filtering-column-filter-configuration](filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [types](types.md): the declarations of the types used here, `FilterExpression`; search it for a name rather than reading it whole
