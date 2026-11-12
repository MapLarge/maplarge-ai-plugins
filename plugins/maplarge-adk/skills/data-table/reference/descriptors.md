# Data Table - Descriptors

<!-- Automatically generated, do not edit -->

Descriptors derive schema and base columns from a declarative field map.

## Descriptor Quick Start

Pass `ColumnDescriptors` to `createDataTable({ descriptors })` to derive schema and columns. Descriptors are ViewModel-only - the derived schema carries live lookup functions, so it cannot be authored on the View.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `descriptors` | `ColumnDescriptors<TRow>` | yes | V | Per-field descriptor map used to derive schema entries and base columns. | `dataTable.viewModel.columns.defineColumnDescriptors<Row>()({ name: { type: "Text", label: "Name" } })` |

**Example: Descriptors Layer Quick Start Snippet**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly name: string; readonly category: string; readonly price: number };

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { name: "Widget", category: "Hardware", price: 12.5 },
            { name: "Bracket", category: "Hardware", price: 4.25 },
            { name: "Manual", category: "Docs", price: 0 },
        ];
        const descriptors = dataTable.viewModel.columns.defineColumnDescriptors<Row>()({
            name: { type: "Text", label: "Product", sortOrder: 1 },
            category: { type: "Text", label: "Category", sortOrder: 2 },
            price: { type: "Number", label: "Price", sortOrder: 3 },
        });
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            descriptors,
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

// columns come from createDataTable via descriptors; no duplicate columns array here
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DescriptorsDocLayerViewModel", "Descriptor Quick Start (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

## Column Configuration on Descriptors

Extend a descriptor with the `column` field and any normal data-column options.

**Descriptor Column Extras Extension Code Snippet**:

```ts
dataTable.viewModel.columns.defineColumnDescriptors<Row>()({
    name: { type: "Text", label: "Full Name" },
    score: {
        type: "Number",
        label: "Score",
        column: {
            sort: false,
            width: toPixels(80),
            align: "right",
            formatter: "number",
        },
    },
    createdAt: {
        type: "Text",
        label: "Created",
        column: {
            headerOverride: "Date Created",
            formatter: "date",
        },
    },
});
```

**Example: Descriptors Column Extras Snippet**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly name: string; readonly score: number; readonly createdAt: string };

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { name: "Alice Chen", score: 91, createdAt: "2026-01-04" },
            { name: "Ben Ortiz", score: 78, createdAt: "2026-02-19" },
            { name: "Cara Diaz", score: 85, createdAt: "2026-03-11" },
        ];
        const descriptors = dataTable.viewModel.columns.defineColumnDescriptors<Row>()({
            name: { type: "Text", label: "Full Name" },
            score: {
                type: "Number",
                label: "Score",
                column: {
                    sort: false,
                    width: toPixels(80),
                    align: "right",
                    formatter: "number",
                },
            },
            createdAt: {
                type: "Text",
                label: "Created",
                column: {
                    headerOverride: "Date Created",
                    formatter: "date",
                },
            },
        });
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            descriptors,
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

// columns come from createDataTable via descriptors; no duplicate columns array here
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DescriptorsDocColumnExtrasViewModel", "Column Configuration on Descriptors (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
            });
        });
    });
    return s.commitPage();
}
```

## Descriptor Adapter

An optional `DescriptorAdapter` controls how descriptor definitions are converted into schema and columns when passed to `createDataTable`.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `descriptorAdapter` | `DescriptorAdapter<TRow>` | no | V | Optional callback used to produce schema and descriptor-derived columns. If omitted, `schemaAndColumnsFromDescriptors` is used. | `({ descriptors }) => dataTable.viewModel.columns.schemaAndColumnsFromDescriptors({ descriptors })` |

```ts
import {
    createDataTable,
    dataTable,
} from "data-ui/data-table";

const descriptors = dataTable.viewModel.columns.defineColumnDescriptors<Row>()({
    name: { type: "Text", label: "Product" },
    category: { type: "Text", label: "Category" },
    score: { type: "Number", label: "Score" },
});

const { options } = createDataTable<Row>({
    data: dataTable.viewModel.data.arrayData({ data: [...rows] }),
    descriptors,
    descriptorAdapter: ({ descriptors: descriptorInput }) => {
        const descriptorDerivedResult = dataTable.viewModel.columns.schemaAndColumnsFromDescriptors({
            descriptors: descriptorInput,
        });
        return {
            schema: descriptorDerivedResult.schema,
            columns: descriptorDerivedResult.columns.map((columnDefinition) =>
                columnDefinition.key === "score"
                    ? { ...columnDefinition, header: "Score (adapted)", align: "left", formatter: undefined }
                    : columnDefinition,
            ),
        };
    },
});
this.dataTableOptions = options;

// View
s.dataTable(dataTableOptions<Row>({
    bindings: { data: "dataTableOptions" },
}));
```

## Descriptor Attribute Behavior

How descriptor attributes map to data table behavior.

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `label` | `string` | no | V | Sets the generated column header when it resolves to a static value; otherwise the field key is used. |
| `hidden` | `boolean` | no | V | Hides or shows the column. |
| `sortOrder` | `number` | no | V | Controls column order. Missing sortOrder is treated as last. |

### Descriptor Type

| Descriptor type | Schema column type | Alignment | Formatter |
| --- | --- | --- | --- |
| `Text` | `string` | left | - |
| `TextArea` | `string` | left | - |
| `Number` | `number` | right | number |
| `DateTime` | `datetime` | left | datetime |
| `Checkbox` | `boolean` | left | - |
| `Switch` | `boolean` | left | - |
| `Select` | `string` | left | - |
| `MultiSelect` | `string` | left | - |

Options each descriptor type takes of its own:

- Text: placeholder.
- TextArea: placeholder, rows.
- Number: placeholder, min, max, step, unitInfo.
- DateTime: placeholder, min, max, showTime, timeZone, autoOpen.
- Checkbox and Switch: none.
- Select and MultiSelect: options ({ value, label }[]), placeholder, clearable, enableFiltering, enableSorting.

Every descriptor also takes label, description, hidden, disabled, required, defaultValue, sortOrder and invalidMessage, plus column for the column's own options. toDescriptor and fromDescriptor convert a stored value the editor cannot read directly, such as "Y" and "N" strings for a Checkbox.

DateTime editors work with luxon DateTime values and convert ISO 8601 strings, epoch milliseconds and JavaScript Dates on their own, saving the value back in the shape it came in (a string is saved as a full ISO date-time); any other format, such as "6/15/2024", needs toDescriptor and fromDescriptor.

### Descriptor Column

The `column` field on a `ColumnDescriptor` entry can override presentation defaults:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `column.headerOverride` | `string` | no | V | Overrides the generated header text. Falls back to descriptor label, then field key. | - |
| `column.formatter` | `string` | no | V | Applies a formatter override on top of descriptor defaults. | - |
| `column.width` | `Pixels` | no | V | Sets an explicit column width. | - |
| `column.minWidth` | `Pixels` | no | V | Sets the minimum column width while the user resizes. Applies however the width is set (authored, flex share or user drag). | - |
| `column.maxWidth` | `Pixels` | no | V | Sets the maximum column width while the user resizes. Applies however the width is set (authored, flex share or user drag). | - |
| `column.sort` | `boolean` | no | V | Enables or disables sorting for the column. | - |
| `column.filtering` | `boolean \| ColumnFilterConfig` | no | V | Enables or configures filtering for the column. | - |
| `column.resize` | `boolean` | no | V | Enables or disables user resizing for the column. | - |
| `column.hide` | `boolean` | no | V | Hides the column when true. | - |
| `column.contentHeight` | `Pixels` | no | V | Sets a fixed content height hint for row height calculations. | - |
| `column.textWrap` | `boolean` | no | V | Wraps cell text onto multiple lines instead of truncating. | - |
| `column.align` | `"left" \| "right" \| "center"` | no | V | Sets body cell horizontal alignment. | - |
| `column.headerAlign` | `"left" \| "right" \| "center"` | no | V | Sets header horizontal alignment. | - |
| `column.verticalAlign` | `"top" \| "middle" \| "bottom"` | no | V | Sets body cell vertical alignment. | - |
| `column.verticalHeaderAlign` | `"top" \| "middle" \| "bottom"` | no | V | Sets header vertical alignment. | - |
| `column.transformValue` | `ColumnTransformValueFn<TRow, StringKeyOf<TRow>>` | no | V | Transforms a cell value before display. ViewModel-only on descriptor column extras. | - |
| `column.scope` | `Record<string, (ctx: unknown) => unknown>` | no | V | Scope values used by bindings and contentTemplates. | - |
| `column.contentTemplates` | `ContentTemplatesFn<TRow, StringKeyOf<TRow>> \| InlineContentTemplates` | no | V | Custom cell rendering templates. | - |
| `column.customCssClasses` | `string \| string[]` | no | V | CSS class names on cell content. | - |
| `column.customSlotCssClasses` | `string \| string[]` | no | V | CSS class names on the column slot element. | - |
| `column.formatterArgs` | `FormatterArgs` | no | V | Extra arguments used by the selected formatter. | `{ decimalPlaces: 2 }` |
| `column.headerTransform` | `(header: string) => string` | no | V | Transforms header text before render. | - |
| `column.editing` | `ColumnEditConfig` | no | V | Configures inline cell editing behavior. | `{ triggers: { dblclick: { editor: dataTable.viewModel.editing.descriptorCellEditor() } } }` |

## Column Type Descriptors

The `columnTypeDefinitions` option maps custom schema column type strings to descriptor factories tied to a `ColumnTypeDefinition`. ViewModel only.

Use this when a custom schema type (such as "money") should inherit filter and edit behavior from a built-in descriptor type.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `columnTypeDefinitions` | `Readonly<Record<string, () => { type: string }>>` | no | V | Maps custom schema column type strings to a factory that returns a built-in-compatible descriptor shape. ViewModel only. | `{ money: () => ({ type: "Number" }), }` |

```ts
import {
    createDataTable,
    dataTable,
} from "data-ui/data-table";

const { options } = createDataTable<Row>({
    data: dataTable.viewModel.data.arrayData({
        data: [
            { name: "Paper", amount: 9.75 },
            { name: "Ink", amount: 17.2 },
        ],
    }),
    schema: dataTable.viewModel.schema.createSchema({
        entries: {
            name: { type: "string" as const },
            amount: { type: "money" as const },
        },
    }),
    columnTypeDefinitions: {
        money: () => ({ type: "Number" }),
    },
});
this.dataTableOptions = options;

// View
s.dataTable(dataTableOptions<Row>({
    bindings: { data: "dataTableOptions" },
}));
```

## Related

- [types](types.md): the declarations of the types used here, `ColumnDescriptors`, `ColumnDescriptor`, `ColumnBase`, `InlineContentTemplates`, `ColumnEditConfig`, `EditTransformContext`, `EditTrigger`, `DeclarativeRule`, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `FilterExpression`, `CellEditorInitContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `FormatterArgs`, `CellContext`, `DescriptorAdapter`; search it for a name rather than reading it whole
