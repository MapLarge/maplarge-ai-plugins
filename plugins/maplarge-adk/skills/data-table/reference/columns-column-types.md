# Data Table - Columns - Column Types and more

<!-- Automatically generated, do not edit -->

Column definitions control what the data table displays.

## Column Types

- Data column: backed by a real field on the underlying data row.
- Virtual column: not necessarily backed by a field on the underlying data row; useful for computed or action columns.

## Creating Data Columns

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
import { dataTable, dataTableOptions, schema, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "alpha", qty: 2 },
    { id: 2, name: "beta", qty: 5 },
    { id: 3, name: "gamma", qty: 9 },
];

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID", width: toPixels(80), sort: true }),
    column({ field: "name", header: "Name", sort: true }),
    column({ field: "qty", header: "Qty" }),
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocDataColumnsView", "Data Columns (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: dataTable.view.schema.createSchema({
                    entries: {
                        id: schema.number(),
                        name: schema.string(),
                        qty: schema.number(),
                    },
                }),
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

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

const { column } = dataTable.viewModel.defineColumns<Row>();

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
            columns: [
                column({ field: "id", header: "ID", width: toPixels(80), sort: true }),
                column({ field: "name", header: "Name", sort: true }),
                column({
                    field: "qty",
                    header: "Qty",
                    transformValue: ({ value }) => `${value} units`,
                }),
            ],
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
import type { ViewModel } from "./view-model";

// columns come from createDataTable; no duplicate columns array here
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocDataColumnsViewModel", "Data Columns (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

## Creating Virtual Columns

Virtual columns must provide a key, since there is no backing field to identify them.

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

const createScriptor = () => RSScriptor.create<ViewModel>();
const { column, virtualColumn, inlineContentTemplates } = dataTable.view.defineColumns<Row, ViewModel>({ createScriptor });

const qtySummaryTemplate = inlineContentTemplates((cell) => {
    cell.s.div().contentTemplates((cellDiv) => {
        cellDiv.span({ text: "Qty: " });
        cellDiv.span({ bindings: { text: `${cell.bindingPaths.row}.qty` } });
    });
});

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocVirtualColumnsView", "Virtual Columns (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: dataTable.view.schema.createSchema({
                    entries: {
                        id: schema.number(),
                        name: schema.string(),
                        qty: schema.number(),
                    },
                }),
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    virtualColumn({
                        key: "sumHint",
                        header: "Quantity Summary",
                        sortField: "qty",
                        contentTemplates: qtySummaryTemplate,
                    }),
                ],
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

const { column, virtualColumn } = dataTable.viewModel.defineColumns<Row>();

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
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                virtualColumn({
                    key: "sumHint",
                    header: "Quantity Summary",
                    sortField: "qty",
                    transformValue: ({ row }) => `Qty: ${row.qty}`,
                }),
            ],
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
import type { ViewModel } from "./view-model";

// columns come from createDataTable
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocVirtualColumnsViewModel", "Virtual Columns (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

## Column Properties

Accepted by both data columns and virtual columns.

| Property | Type | Required | Default | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `key` | `string` | no | - | V | Stable column id. For data columns, the key is defaulted to the field. | - |
| `header` | `string` | no | - | V | Header label; defaults to key. | - |
| `group` | `string` | no | - | V | Heading this column sits under in the column picker. | - |
| `formatter` | `string` | no | - | V | Name of the formatter that turns the value into cell text: a built-in or one registered with the formatters option. Defaults to the column type's formatter. See Cells and Content. Built-ins: number, integer, decimal, currency, percent, shortNumber, scientific, bytes, datetime, date, time, isoDate, boolean, uppercase, lowercase, titleCase, camelCase, location. The type's formatter (number columns show thousands separators) applies when the column has a schema type and sets neither transformValue nor contentTemplates; a column that sets either gets a formatter only when it names one. | `"currency"` |
| `formatterArgs` | `FormatterArgs` | no | - | V | Arguments for the formatter: format for number and dates, decimalPlaces for decimal and percent, currency for currency. A number format is a MapLarge pattern; "0" shows a whole number without thousands separators, as for ids. | `{ format: "0" }` |
| `columnType` | `string` | no | - | V | Column type to use instead of the schema entry's type, such as one added with columnTypeDefinitions. | - |
| `headerTransform` | `(key: string) => string` | no | - | V B | Returns the header text from the column's key. It receives the key, not the column's current header. | - |
| `width` | `Pixels` | no | - | V | Fixed column width in pixels. Takes precedence over flex. | `toPixels(200)` |
| `flex` | `number` | no | - | V | Proportional share of the leftover viewport space after fixed-width columns take theirs. Ignored when width is set or the user has resized the column; resetting the layout restores flex. | `2` |
| `minWidth` | `Pixels` | no | - | V | Minimum width in pixels. Clamps user resizing and flex sizing (flex default: 40). It clamps the authored width too. | `toPixels(80)` |
| `maxWidth` | `Pixels` | no | - | V | Maximum width in pixels. Clamps user resizing and flex sizing. It clamps the authored width too. | `toPixels(480)` |
| `sort` | `boolean` | no | - | V | Enable sorting for the column. Defaults to true: every column with a field sorts, and a virtual column sorts only when it has a sortField. Set false to turn sorting off. | - |
| `filtering` | `boolean \| ColumnFilterConfig` | no | - | V B | Enable or configure filtering for this column. | - |
| `resize` | `boolean` | no | `true` | V | Enable user resizing for the column. | - |
| `hide` | `boolean` | no | - | V | Initial hidden state of the column. | - |
| `contentHeight` | `Pixels` | no | - | V | Fixed cell content height hint for row height heuristics in variable-height row engines. | - |
| `textWrap` | `boolean` | no | - | V | When true, body cells wrap text onto multiple lines instead of truncating with an ellipsis. Ignored when the row scroll engine uses fixedRowHeight. | - |
| `align` | `"left" \| "right" \| "center"` | no | - | V | Horizontal alignment for body cells in this column. Sets justify-content on .ml-dt-column-slot and text-align on .ml-dt-cell. | - |
| `headerAlign` | `"left" \| "right" \| "center"` | no | - | V | Horizontal alignment for the column's header cell. Sets justify-content and text-align on .ml-dt-header-content (the inner wrapper, so sort and filter icons remain anchored). | - |
| `verticalAlign` | `"top" \| "bottom" \| "middle"` | no | - | V | Vertical alignment for body cells in this column. Sets align-items on .ml-dt-column-slot. | - |
| `verticalHeaderAlign` | `"top" \| "bottom" \| "middle"` | no | - | V | Vertical alignment for the column's header cell. Sets align-items on .ml-dt-header-cell. | - |
| `transformValue` | `ColumnTransformValueFn \| DeclarativeRule<unknown> \| ViewDefinitionBinding` | no | - | V B | Inline callback (ViewModel), `{ where, applyValue }` rule, or `{ binding }` on the View. See Cells and Content for examples of each arm. | `({ value }) => String(value).toUpperCase()` |
| `contentTemplates` | `InlineContentTemplates \| (cell) => void` | no | - | V B | Inline cell markup in the View, or a ViewModel method for custom cell rendering. | - |
| `scope` | `Record<string, ViewDefinitionBinding>` | no | - | V B | Bindings exposed to contentTemplates scope. | - |
| `editing` | `ColumnEditConfig \| boolean` | no | - | V B | Per-column editing configuration. true uses dataTable.viewModel.editing.descriptorCellEditor() on the default triggers; false disables editing on the column. | `{ triggers: { dblclick: { editor: dataTable.viewModel.editing.descriptorCellEditor() } } }` |

## Data Column-Only Options

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `field` | `keyof TRow` | yes | V | Row property to read. | `"name"` |
| `customCssClasses` | `string \| string[]` | no | V | Extra classes on the body cell span (.ml-dt-cell). Not applied to the header. | - |
| `customSlotCssClasses` | `string \| string[]` | no | V | Extra classes on the body column slot (.ml-dt-column-slot). Not applied to the header. | - |

## Virtual Column-Only Options

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `sortField` | `string` | no | V | Row field to sort by when this virtual column is sortable. Required for sort on a virtual column. |
| `customCssClasses` | `string \| string[]` | no | V | Extra classes on the body cell span (.ml-dt-cell). Not applied to the header. |
| `customSlotCssClasses` | `string \| string[]` | no | V | Extra classes on the body column slot (.ml-dt-column-slot). Not applied to the header. |

## Column Widths

A column is sized in one of two ways: it either has an exact pixel width, or it takes a share of whatever space is left once the fixed columns have taken theirs.

- `width`: the column is exactly this wide and stays that way as the window resizes.
- `flex`: the column takes a share of the leftover space. A column with flex: 2 gets twice as much of that space as a column with flex: 1. Flex columns fill the space the fixed columns leave unless their maxWidth caps them. With no flex column, or every flex column capped, the table does not fill its container.
- `minWidth` and `maxWidth`: limits on how far a column may shrink or grow. A column that reaches one of its limits stops there and the other flexible columns absorb the difference; once every column is at its minimum, the table scrolls sideways instead of shrinking further.

Click a layout name to apply it to the table. fixed fixed with limits flex flex with limits empty table space

| Layout | Description | Visual |
| --- | --- | --- |
| Fixed widths | Every column has an exact pixel width. | - |
| Last column fills | Fixed columns in front, last column stretches to fill. | - |
| All proportional | No fixed columns; everything splits by ratio. | - |
| Fixed then fluid | Two fixed columns; the last two split the rest. | - |
| Fluid with a min | A fluid column with a minimum; below it the table scrolls. | - |
| Fluid with a max | A fluid column with a cap; extra space goes to its neighbor. | - |
| Fluid within bounds | A fluid column with both a minimum and a maximum. | - |
| Bounded drag-resize | All fixed; the middle column drag-resizes only within its min and max. | - |
| Wider than the window | Too many columns to fit; the fluid ones sit at their minimums and the table scrolls. | - |
| Wrapping text | The last column wraps its text; rows grow taller as it narrows. | - |

## Per-Column CSS Classes

Both data and virtual columns accept two optional class hooks that apply to body cells.

- `customCssClasses`: classes are added to the inner cell span (.ml-dt-cell). Use this for styling that should sit on the text container itself, such as text alignment, font weight, or color utilities.
- `customSlotCssClasses`: classes are added to the outer column slot (.ml-dt-column-slot) that wraps the cell. Use this when you need to style the flex container itself.

Example: right-align a numeric column by setting justify-content-end on the slot.

**Per Column Css Classes Code Snippet**:

```ts
const { column } = dataTable.view.defineColumns<Row, ViewModel>();

s.dataTable(dataTableOptions<Row>({
    // ...
    columns: [
        column({ field: "name", header: "Name" }),
        column({ field: "qty", header: "Qty", customSlotCssClasses: "justify-content-end" }),
        column({ field: "status", header: "Status", customCssClasses: "fw-bold" }),
    ],
}));
```

## Column Rules

Apply Column Rules to set blanket defaults and rules for discovered columns.

### Matchers

`ExactMatcher` matches a single column key:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `type` | `"exact"` | yes | V | Discriminator for exact column key matching. |
| `value` | `string` | yes | V | Column key to match. |

`RegexMatcher` matches column keys with a regular expression:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `type` | `"regex"` | yes | V | Discriminator for regex column key matching. |
| `pattern` | `string` | yes | V | Regex pattern string matched against column keys. |

### Rule Fields

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `match` | `ViewMatcher` | no | V | Which columns this rule targets. Omit to target every column. | `{ type: "regex", pattern: "^x_", }` |
| `sideEffects` | `ViewColumnRuleConfig` | no | V | Column UI properties applied to matching columns. | `{ width: toPixels(120), sort: true, }` |

### Side Effects

Fields marked B below (headerTransform, contentTemplates, transformValue, scope, and filtering.contentTemplates) resolve a View-authored { binding: "methodName" } to the matching ViewModel method the same way a top-level Binding option does. A rule's sideEffects apply to every column the rule matches, so there is no per-column context to bind against beyond the ViewModel itself - scope and transformValue still receive the usual per-cell context when they are invoked.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `header` | `string` | no | V | Override column header text. | - |
| `group` | `string` | no | V | Heading these columns sit under in the column picker. Only View-authored rules pass it through: a rule given to createDataTable drops it, so set group on the columns themselves there. | - |
| `headerTransform` | `(key: string) => string` | no | V B | Returns the header text from the column's key. It receives the key, not the column's current header. | - |
| `sort / resize / hide` | `boolean` | no | V | Enable or disable matching column behaviors. | - |
| `width` | `Pixels` | no | V | Set fixed width (for example, toPixels(140)). Takes precedence over flex. | - |
| `flex` | `number` | no | V | Proportional share of the leftover viewport space after fixed-width columns. | - |
| `minWidth / maxWidth` | `Pixels` | no | V | Clamp user resizing and flex sizing. | - |
| `contentTemplates` | `(cell) => void` | no | V B | A ViewModel method for custom cell rendering; a column rule does not accept inline templates. In a View name the method with { binding }; in the ViewModel pass the function. Put inline templates on the column itself. | - |
| `transformValue` | `ViewDefinitionBinding \| ColumnTransformValueFn` | no | V B | Binding on the View, or an inline callback on the ViewModel. Rules are not supported in column-rule side effects. | `({ value }) => String(value).toUpperCase()` |
| `scope` | `Record<string, ViewDefinitionBinding>` | no | V B | Bindings exposed to contentTemplates scope. | - |
| `customCssClasses / customSlotCssClasses` | `string \| string[]` | no | V | Extra classes for matching column body cells and slots. | - |
| `align` | `"left" \| "center" \| "right"` | no | V | Horizontal alignment for body cells. Sets justify-content on the slot and text-align on the cell. | - |
| `headerAlign` | `"left" \| "center" \| "right"` | no | V | Horizontal alignment for the column header. | - |
| `verticalAlign` | `"top" \| "middle" \| "bottom"` | no | V | Vertical alignment for body cells. Sets align-items on the slot. | - |
| `verticalHeaderAlign` | `"top" \| "middle" \| "bottom"` | no | V | Vertical alignment for the column header cell. | - |
| `filtering` | `boolean \| ColumnFilterConfig` | no | V B | Enable or configure filtering for matching columns. | - |
| `editing` | `ColumnEditConfig` | no | V B | Per-column editing configuration for matching columns. Only View-authored rules pass it through: a rule given to createDataTable drops it, so set editing on the columns themselves there. | `{ triggers: { dblclick: { editor: dataTable.viewModel.editing.descriptorCellEditor() } } }` |

### Rule Examples

Example: column rules that configure metric columns and override one column width.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly qty: number;
    readonly metricA: number;
    readonly metricB: number;
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
    { id: 1, name: "alpha", qty: 2, metricA: 40, metricB: 12 },
    { id: 2, name: "beta", qty: 5, metricA: 22, metricB: 31 },
    { id: 3, name: "gamma", qty: 9, metricA: 61, metricB: 8 },
];

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocViewRulesView", "Column Rules (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: dataTable.view.schema.createSchema({
                    entries: {
                        id: schema.number(),
                        name: schema.string(),
                        qty: schema.number(),
                        metricA: schema.number(),
                        metricB: schema.number(),
                    },
                }),
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                    column({ field: "metricA", header: "Metric A" }),
                    column({ field: "metricB", header: "Metric B" }),
                ],
                columnRules: [
                    {
                        match: { type: "regex", pattern: "^metric" },
                        sideEffects: { width: toPixels(120), sort: true, filtering: true },
                    },
                    {
                        match: { type: "exact", value: "metricB" },
                        sideEffects: { width: toPixels(160) },
                    },
                ],
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
    readonly metricA: number;
    readonly metricB: number;
};

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2, metricA: 40, metricB: 12 },
            { id: 2, name: "beta", qty: 5, metricA: 22, metricB: 31 },
            { id: 3, name: "gamma", qty: 9, metricA: 61, metricB: 8 },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                    metricA: schema.number(),
                    metricB: schema.number(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({ field: "qty", header: "Qty" }),
                column({ field: "metricA", header: "Metric A" }),
                column({ field: "metricB", header: "Metric B" }),
            ],
            columnRules: [
                {
                    match: { type: "regex", pattern: "^metric" },
                    sideEffects: { width: toPixels(120), sort: true, filtering: true },
                },
                {
                    match: { type: "exact", value: "metricB" },
                    sideEffects: { width: toPixels(160) },
                },
            ],
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
import type { ViewModel } from "./view-model";

// columns come from createDataTable
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocViewRulesViewModel", "Column Rules (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

## Discovered Column Rules

Use discoveredColumnRules to style columns discovered at runtime. columnRules apply to all columns, listed and discovered, and win over discoveredColumnRules. A data source's geometry columns are discovered only when it asks for geometry ({ table, withgeo: true }), since a query returns none otherwise.

discoveredColumnRules are the lowest-priority rules for every column, listed ones included; columnRules win over them when both set the same property, and a column's own properties win over any rule.

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly qty: number;
    readonly metricA: number;
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
    { id: 1, name: "alpha", qty: 2, metricA: 40 },
    { id: 2, name: "beta", qty: 5, metricA: 22 },
    { id: 3, name: "gamma", qty: 9, metricA: 61 },
];

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocDiscoveredRulesView", "Discovered Column Rules (View)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: dataTable.view.schema.createDiscoverableSchema({
                    entries: {
                        id: schema.number(),
                        name: schema.string(),
                        qty: schema.number(),
                    },
                }),
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                // metricA is discovered, not listed in entries or columns above
                discoveredColumnRules: [
                    {
                        match: { type: "regex", pattern: "^metric" },
                        sideEffects: { width: toPixels(100), filtering: true },
                    },
                ],
                columnRules: [
                    {
                        match: { type: "exact", value: "name" },
                        sideEffects: { width: toPixels(220) },
                    },
                ],
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
    readonly metricA: number;
};

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2, metricA: 40 },
            { id: 2, name: "beta", qty: 5, metricA: 22 },
            { id: 3, name: "gamma", qty: 9, metricA: 61 },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createDiscoverableSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID" }),
                column({ field: "name", header: "Name" }),
                column({ field: "qty", header: "Qty" }),
            ],
            discoveredColumnRules: [
                {
                    match: { type: "regex", pattern: "^metric" },
                    sideEffects: { width: toPixels(100), filtering: true },
                },
            ],
            columnRules: [
                {
                    match: { type: "exact", value: "name" },
                    sideEffects: { width: toPixels(220) },
                },
            ],
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
import type { ViewModel } from "./view-model";

// columns come from createDataTable
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ColumnsDocDiscoveredRulesViewModel", "Discovered Column Rules (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

### Showing Only Some Columns

A table whose schema is discovered shows every column of the source, not only the ones listed. Discovered column rules also apply to listed columns, but a listed column's own properties win, so hide everything with a rule and set hide: false on the columns to show:

**Show Only Some Columns Snippet**:

```ts
discoveredColumnRules: [
    { match: { type: "regex", pattern: "." }, sideEffects: { hide: true } },
],
columns: [
    column({ field: "StopName", header: "Stop Name", hide: false }),
    column({ field: "MUNIC_NAME", header: "Municipality", hide: false }),
],
```

The other columns are hidden, not removed: users can still show them from the header menu or the column configurator.

## Related

- [columns-empty-column-detection](columns-empty-column-detection.md): Columns - Empty Column Detection and more
- [types](types.md): the declarations of the types used here, `FormatterArgs`, `ColumnBase`, `InlineContentTemplates`, `ColumnEditConfig`, `EditTransformContext`, `EditTrigger`, `DeclarativeRule`, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `FilterExpression`, `CellEditorInitContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `CellContext`, `ViewModelMatcher`, `ViewColumnRuleConfig`; search it for a name rather than reading it whole
