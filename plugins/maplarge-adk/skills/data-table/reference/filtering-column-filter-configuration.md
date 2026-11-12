# Data Table - Filtering - Column Filter Configuration and more

<!-- Automatically generated, do not edit -->

Right-click a column header and choose Filter to open the filter dialog for that column.

**Example: Filter Column**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

export type Row = { id: number; name: string; qty: number };

export class ViewModel extends DynamicViewModel {
    public initialize(): void {}
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

const rows: Row[] = [
    { id: 1, name: "alpha", qty: 2 },
    { id: 2, name: "beta", qty: 5 },
    { id: 3, name: "gamma", qty: 2 },
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
    s.page("DataDocFilterColumn", "Filterable columns");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) }),
                storage: dataTable.view.storage.localStore({ prefix: "doc-filter-column-snippet" }),
                filtering: dataTable.view.filtering.dialogFiltering(),
                filterIndicators: {
                    headerCell: dataTable.view.filterIndicators.filterFunnelIndicator(),
                    belowGrid: dataTable.view.filterIndicators.filterChipsIndicator(),
                },
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

## Column Filter Configuration

Filtering is configured per column.

```ts
column({ field: "name", header: "Name", filtering: true })
virtualColumn({ key: "nameHint", header: "Name", filtering: { operators: [...], contentTemplates: ... } })
```

### Column filter config

`ColumnFilterConfig` configures filtering per column:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `operators` | `readonly TFilterOps[]` | no | Restrict which operators appear for this column. Must be supported by the engine's filterCapabilities.operators. It replaces the operator list the column type would offer, and can also add operators the type does not offer by default, such as StartsWithNot. An operator is shown only if the data engine lists it in filterCapabilities.operators and the dialog's operatorSet defines it; one missing from either list is dropped silently. |
| `scope` | `Record<string, ViewDefinitionBinding>` | no | Bindings passed into custom filter contentTemplates. |
| `contentTemplates` | `ViewDefinitionBinding` | no | Binding to a method that renders the filter input instead of the built-in one. It renders the input for each filter slot of this column in the filter dialog, runs once per slot and receives { s, columnKey, bindingPaths, valueChangeHandlerPath }; the operator picker, Add condition and the Clear, Cancel and Apply buttons stay. Only the built-in dialog engine uses it. |

TFilterOps: Equal, EqualNot, Greater, GreaterOR, Less, LessOR, Contains, ContainsAny, StartsWith, StartsWithNot, EqualAny, Between, NotBetween, WithinLast, DistinctValues, IsNull, IsNotNull.

## Filtering Engines

A filter engine drives how filters are opened, presented, and applied.

**Filtering Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `DialogFilteringEngine` | Default engine. Opens a per-column filter dialog with an interactive expression builder. | Pass `filtering: dataTable.view.filtering.dialogFiltering({... })` on s.dataTable (or omit for the default dialog engine). |

## Engine: `DialogFilteringEngine`

Provides a filter dialog with an interactive expression builder.

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `operatorSet` | `OperatorSet<TFilterOps>` | no | `defaultOperators` | V B | Set of filter operators available across all columns. | `myCustomOperatorSet` |
| `dialogOptions` | `ViewDefinitions.IDialog` | no | - | V B | Dialog option overrides. | `{ width: 480 }` |

defaultOperators: Equal, EqualNot, Greater, GreaterOR, Less, LessOR, Contains, ContainsAny, StartsWith, StartsWithNot, EqualAny, Between, NotBetween, WithinLast, DistinctValues, IsNull, IsNotNull.

The dialog offers each column the operators of its type: text columns Contains, StartsWith, Equal, EqualNot, ContainsAny, EqualAny, IsNull and IsNotNull; number columns Equal, EqualNot, Greater, GreaterOR, Less, LessOR, Between, NotBetween, IsNull and IsNotNull. ContainsAny and EqualAny take several typed values. DistinctValues, a pick-list of the column's values, is not offered yet.

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
    s.page("FilteringDocDialogEngineView", "DialogFilteringEngine (View)");
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
                filtering: dataTable.view.filtering.dialogFiltering({
                    operatorSet: dataTable.view.operators.defaultOperators, // optional
                    dialogOptions: { width: 480 }, // optional
                }),
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
            filtering: dataTable.viewModel.filtering.dialogFiltering({
                operatorSet: dataTable.viewModel.operators.defaultOperators,
                dialogOptions: { width: 480 },
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

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("FilteringDocDialogEngineViewModel", "DialogFilteringEngine (ViewModel)");
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

### Registering a Custom Filtering Engine

```ts
// view-model.ts: register the factory, keyed by name, under engines.filtering
const { options } = createDataTable<Row>({
    // data, schema, columns...
    engines: {
        filtering: {
            exactMatch: (args: { readonly operator?: string }) => new ExactMatchFilterEngine(args),
        },
    },
});

// view.ts: select it by name from either surface
s.dataTable(dataTableOptions<Row>({
    filtering: dataTable.view.filtering.custom("exactMatch", { operator: "Equal" }),
}));
```

## Related

- [filtering-filter-controls](filtering-filter-controls.md): Filtering - Filter Controls
- [filtering-build-a-custom-filter-engine](filtering-build-a-custom-filter-engine.md): Filtering - Build a Custom Filter Engine and more
- [filtering-filter-indicators](filtering-filter-indicators.md): Filtering - Filter Indicators and more
- [types](types.md): the declarations of the types used here, `ColumnBase`, `OperatorSet`; search it for a name rather than reading it whole
