# Data Table - Schema - Schema Types and more

<!-- Automatically generated, do not edit -->

The schema tells the data table the logical types of each column.

## Schema Types

- Static schema: fields are defined only by your entries.
- Discoverable schema: starts with entries and adds discovered fields.

## Creating Schema Entries

Use schema helpers to define each schema entry.

Display is typical text shown in a grid cell. Editing is a typical value in the edit control.

| Type | Helper | Description | Server Types | Default Formatter | Display | Editing |
| --- | --- | --- | --- | --- | --- | --- |
| `string` | `schema.string(overrides?)` | String fields. | string, guid, text | (none) | `Acme Corp` | `Acme Corp` |
| `number` | `schema.number(overrides?)` | Numeric fields. | int, int32, int64, float, float32, float64, double, numeric | number | `1,234.5` | `1234.5` |
| `date` | `schema.date(overrides?)` | Date-only fields. A discovered date column gets datetime (both types claim the server type date, and datetime registers last), so declare a date-only column with schema.date(), columnType: "date" or a discovery rule. | date | date | `6/15/2024` | `6/15/2024` |
| `datetime` | `schema.datetime(overrides?)` | Date and time fields. | date, datetime | datetime | `6/15/2024 2:30 PM` | `6/15/2024 2:30 PM` |
| `time` | `schema.time(overrides?)` | Time fields. | time | time | `2:30 PM` | `2:30 PM` |
| `boolean` | `schema.boolean(overrides?)` | Boolean fields. | bool, boolean | (none) | `true` | `true` |
| `none` | `schema.none()` | No backing field; used for virtual columns. | (unmapped) | (none) | `-` | `-` |

### Overrides

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `filtering.type` | `string \| undefined` | no | V | Override the type used when filtering this column. Defaults to the column type when omitted. | - |
| `filtering.adapter` | `FilterAdapter \| undefined` | no | V | Override how operator, values, and field are converted into a FilterExpression for this column. | `({ operator, values, field }) => null` |
| `editing.type` | `string \| undefined` | no | V | Override the type used when editing this column. Defaults to the column type when omitted. | - |

#### Examples

**Schema Entry Examples Code Snippet**:

```ts
// entries for createSchema / createDiscoverableSchema (ViewModel)
const currencyFilterAdapter: FilterAdapter = ({ operator, values }) => {
    if (operator === "Equal") {
        return {
            field: "amountCents", operator: "Equal",
            values: { value: Math.round(Number(values.value) * 100) },
        };
    }
    return null;
};

const entries = {
    // built-in column types
    id: schema.number(),
    name: schema.string(),
    createdAt: schema.datetime(),   // date + time
    deletedDate: schema.date(),      // date only
    lastRunAt: schema.time(),        // time only
    active: schema.boolean(),

    // virtual column with no backing field
    rowActions: schema.none(),

    // custom type from dataTable.viewModel.columnTypes.defineColumnType({ name: "bigstring", ... })
    notes: bigstring(),

    // filtering and editing overrides
    amount: schema.number({
        filtering: {
            type: "currency",
            adapter: currencyFilterAdapter,
        },
        editing: {
            type: "currency",
        },
    }),
};
```

filtering.adapter and custom types such as bigstring() work only in the ViewModel (createDataTable); a View drops them without an error, so a View's entries use built-in types, filtering.type, editing.type and unitInfo.

## Creating a Static Schema

In a View, build the schema with `dataTable.view.schema.createSchema` and pass the result to `dataTableOptions` - it produces plain serializable data. On the ViewModel, use `createSchema` with `createDataTable({ schema: ... })` when you need a store handle at construction time, a custom filter adapter, custom column types, or a function matcher - none of which can cross a View definition.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `entries` | `Record<string, ColumnSchemaEntry>` | yes | V | One entry per column key you want typed in the data table. | `{ id: schema.number(), name: schema.string(), status: schema.string(), createdAt: schema.date(), active: schema.boolean(), }` |
| `rules` | `readonly SchemaRule[] \| undefined` | no | V | Optional matchers with side effects for manipulating columns. | `[ { match: { type: "exact", value: "id", }, sideEffects: { width: toPixels(72), resize: false, }, }, { match: { type: "regex", pattern: "^(status\|active)$", }, sideEffects: { filtering: true, sort: true, }, }, ]` |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly qty: number;
    readonly active: boolean;
};

export class ViewModel extends RaptorViewModel {
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "Widget", qty: 12, active: true },
    { id: 2, name: "Gadget", qty: 4, active: false },
    { id: 3, name: "Gizmo", qty: 30, active: true },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        qty: schema.number(),
        active: schema.boolean(),
    },
    rules: [
        {
            match: { type: "exact", value: "id" },
            sideEffects: { width: toPixels(72) },
        },
    ],
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name", width: toPixels(160) }),
    column({ field: "qty", header: "Qty", width: toPixels(100) }),
    column({ field: "active", header: "Active", width: toPixels(100) }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocStaticView", "Static Schema (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                schema: gridSchema,
                data: dataTable.view.data.arrayData({ data: rows }),
                columns,
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
import type { DataTableOptions } from "data-ui/data-table";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly qty: number;
    readonly active: boolean;
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "Widget", qty: 12, active: true },
            { id: 2, name: "Gadget", qty: 4, active: false },
            { id: 3, name: "Gizmo", qty: 30, active: true },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                    active: schema.boolean(),
                },
                rules: [
                    {
                        match: { type: "exact", value: "id" },
                        sideEffects: { width: toPixels(72) },
                    },
                ],
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
import { dataTable, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocStaticViewModel", "Static Schema (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name", width: toPixels(160) }),
                    column({ field: "qty", header: "Qty", width: toPixels(100) }),
                    column({ field: "active", header: "Active", width: toPixels(100) }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Creating a Discoverable Schema

Use `dataTable.view.schema.createDiscoverableSchema` (View) or `createDiscoverableSchema` (ViewModel) when columns need to be discovered through your data engine. Pass the result to `dataTableOptions` the same way as a static schema. Discovered columns resolve against the built-in column types; the `columnTypes` option, which registers custom types, is ViewModel-only because its factories are functions.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `entries` | `Record<string, ColumnSchemaEntry>` | yes | V | Static schema entries. | `{ id: schema.number(), name: schema.string(), }` |
| `rules` | `readonly SchemaRule[]` | no | V | Rules applied to all columns. | - |
| `discoveryRules` | `readonly DiscoveryRule[]` | no | V | Rules applied to discovered columns only. | - |
| `columnTypes` | `readonly ColumnTypeFactory[]` | no | V | Custom column type factories (from defineColumnType) available during discovery. | - |

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly region: string;
};

export class ViewModel extends RaptorViewModel {
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { applyRule, dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "Widget", region: "West" },
    { id: 2, name: "Gadget", region: "East" },
    { id: 3, name: "Gizmo", region: "North" },
];

const gridSchema = dataTable.view.schema.createDiscoverableSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
    },
    discoveryRules: [
        applyRule(
            { type: "exact", value: "region" },
            { filtering: true, width: toPixels(120) },
        ),
    ],
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name", width: toPixels(160) }),
    column({ field: "region", header: "Region", width: toPixels(120) }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocDiscoverableView", "Discoverable Schema (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                schema: gridSchema,
                data: dataTable.view.data.arrayData({ data: rows }),
                columns,
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
import { applyRule, createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly region: string;
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "Widget", region: "West" },
            { id: 2, name: "Gadget", region: "East" },
            { id: 3, name: "Gizmo", region: "North" },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createDiscoverableSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                },
                discoveryRules: [
                    applyRule(
                        { type: "exact", value: "region" },
                        { filtering: true, width: toPixels(120) },
                    ),
                ],
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
import { dataTable, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocDiscoverableViewModel", "Discoverable Schema (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name", width: toPixels(160) }),
                    column({ field: "region", header: "Region", width: toPixels(120) }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Schema Rules

Use rules to target columns by name.

If a discovered column matches an exclude rule in discoveryRules, that column is not created. If it matches include rules, side effects are applied to the column.

An exclude rule never removes a column you list in columns or entries, and in a schema's rules it has no effect. To start a column hidden, use an include rule with sideEffects { hide: true }.

Later rules override earlier values.

### Matchers

Matches by column key to activate a rule.

`ExactMatcher` matches a single column key:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `type` | `"exact"` | yes | V | Discriminator for exact column key matching. |
| `value` | `string` | yes | V | Column key to match. |

`RegexMatcher` matches column keys against a regular expression pattern:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `type` | `"regex"` | yes | V | Discriminator for regex column key matching. |
| `pattern` | `string` | yes | V | Regex pattern string matched against column keys. |

`FunctionMatcher` invokes a predicate for each column key. Because a function cannot be serialized into a View definition, use function matchers only in schema built on the ViewModel (for example via `createDataTable`).

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `type` | `"function"` | yes | V | Discriminator for function-based matching (view-model rules only). |
| `fn` | `(columnName: string) => boolean` | yes | V | Returns true when the column key should match. |

### Rule Fields

For columns that match the matcher, either exclude the column or apply side effects.

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `match` | `ViewModelMatcher` | no | - | V | Which columns this rule targets. Omit to target every column in that rule set. | `{ type: "regex", pattern: "^sku_", }` |
| `effect` | `"include" \| "exclude"` | no | `include` | V | "exclude" skips matching discovered columns (discoveryRules only). "include" keeps columns and applies side effects. An exclude rule removes no listed column and does nothing in rules. | `{ effect: "exclude", match: { type: "exact", value: "internalId", }, }` |
| `sideEffects` | `SchemaRuleConfig` | no | - | V | sort filtering resize width hide header | `{ sort: true, filtering: false, width: toPixels(200), }` |

### Rule Examples

Example: static schema rules that hide internal columns and configure metric columns.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly productName: string;
    readonly metricSales: number;
    readonly metricUnits: number;
    readonly internalId: string;
    readonly rawPayload: string;
};

export class ViewModel extends RaptorViewModel {
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { applyRule, dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, productName: "Widget", metricSales: 1200, metricUnits: 40, internalId: "INT-1", rawPayload: "{}" },
    { id: 2, productName: "Gadget", metricSales: 800, metricUnits: 15, internalId: "INT-2", rawPayload: "{}" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        productName: schema.string(),
        metricSales: schema.number(),
        metricUnits: schema.number(),
        internalId: schema.string(),
        rawPayload: schema.string(),
    },
    rules: [
        applyRule(
            { type: "regex", pattern: "^metric" },
            { sort: true, filtering: true, width: toPixels(120) },
        ),
        applyRule({ type: "exact", value: "metricUnits" }, { width: toPixels(90) }),
        applyRule({ type: "regex", pattern: "Payload$" }, { hide: true }),
    ],
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "productName", header: "Product", width: toPixels(160) }),
    column({ field: "metricSales", header: "Sales" }),
    column({ field: "metricUnits", header: "Units" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocRulesExamplesView", "Schema Rules (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                schema: gridSchema,
                data: dataTable.view.data.arrayData({ data: rows }),
                columns,
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

export type Row = {
    readonly id: number;
    readonly productName: string;
    readonly metricSales: number;
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, productName: "Widget", metricSales: 1200 },
            { id: 2, productName: "Gadget", metricSales: 800 },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    productName: schema.string(),
                    metricSales: schema.number(),
                },
                rules: [
                    {
                        match: {
                            type: "function",
                            fn: (columnName) => columnName.startsWith("metric"),
                        },
                        sideEffects: { filtering: true, sort: true },
                    },
                ],
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
    s.page("SchemaDocRulesExamplesViewModel", "Schema Rules (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "productName", header: "Product", width: toPixels(160) }),
                    column({ field: "metricSales", header: "Sales" }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Rule Helpers

Use these helpers to build rule objects for either rules or discoveryRules.

| Type | Helper | Description | Server Types | Default Formatter | Display | Editing |
| --- | --- | --- | --- | --- | --- | --- |
| - | `excludeRule(match?)` | Builds an exclude rule. Use it in discoveryRules to skip matching discovered columns. It does nothing in rules. | - | - | - | - |
| - | `applyRule(match, sideEffects)` | Builds an include rule. Use it to configure matching columns. | - | - | - | - |
| - | `applyRule(..., { columnType,... })` | columnType is intended for discovered columns (used in discoveryRules). | - | - | - | - |

Example: discoveryRules with helpers, including columnType override for discovered columns.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly metricRevenue: number;
    readonly metricCost: number;
    readonly testFlag: boolean;
};

export class ViewModel extends RaptorViewModel {
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { applyRule, dataTable, dataTableOptions, excludeRule, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "Widget", metricRevenue: 5000, metricCost: 1800, testFlag: false },
    { id: 2, name: "Gadget", metricRevenue: 3200, metricCost: 900, testFlag: false },
];

const gridSchema = dataTable.view.schema.createDiscoverableSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
    },
    discoveryRules: [
        excludeRule({ type: "regex", pattern: "^test" }),
        applyRule(
            { type: "regex", pattern: "^metric" },
            { sort: true, filtering: true, width: toPixels(110) },
        ),
        applyRule({ type: "exact", value: "metricCost" }, { width: toPixels(140) }),
    ],
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name", width: toPixels(160) }),
    column({ field: "metricRevenue", header: "Revenue", width: toPixels(110) }),
    column({ field: "metricCost", header: "Cost", width: toPixels(140) }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocDiscoveryRulesExamplesView", "Discovery Rules (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                schema: gridSchema,
                data: dataTable.view.data.arrayData({ data: rows }),
                columns,
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
import { applyRule, createDataTable, dataTable, excludeRule, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly metricRevenue: number;
    readonly metricCost: number;
    readonly testFlag: boolean;
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "Widget", metricRevenue: 5000, metricCost: 1800, testFlag: false },
            { id: 2, name: "Gadget", metricRevenue: 3200, metricCost: 900, testFlag: false },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createDiscoverableSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                },
                discoveryRules: [
                    excludeRule({ type: "regex", pattern: "^test" }),
                    applyRule(
                        { type: "regex", pattern: "^metric" },
                        { sort: true, filtering: true, width: toPixels(110) },
                    ),
                ],
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
import { dataTable, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocDiscoveryRulesExamplesViewModel", "Discovery Rules (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name", width: toPixels(160) }),
                    column({ field: "metricRevenue", header: "Revenue", width: toPixels(110) }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [schema-custom-column-types](schema-custom-column-types.md): Schema - Custom Column Types
- [types](types.md): the declarations of the types used here, `ColumnSchemaEntry`, `ColumnTypeDefinition`, `InputRenderArgs`, `FilterExpression`, `SchemaRule`, `ViewModelMatcher`, `SchemaRuleConfig`, `ColumnBase`, `InlineContentTemplates`, `ColumnEditConfig`, `EditTransformContext`, `EditTrigger`, `DeclarativeRule`, `CellEditor`, `CellEditorStartContext`, `CellEditorInitContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `FormatterArgs`, `CellContext`, `DiscoveryRule`; search it for a name rather than reading it whole
