# Data Table recipe - Build descriptors from a field list

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## define-columns-with-descriptors

**Define columns with descriptors.** Describe each field once (type, label, limits, editor) and get the schema, columns, editors and filters from it.

Module scope `[module]`:

```ts
const assetDescriptors = dataTable.viewModel.columns.defineColumnDescriptors<Asset>()({
    name: { type: "Text", label: "Name", sortOrder: 1, required: true, column: { width: toPixels(220) } },
    category: { type: "Text", label: "Category", sortOrder: 2 },
    cost: { type: "Number", label: "Cost", sortOrder: 3, min: 0, column: { align: "right", formatter: "currency" } },
    lastInspected: { type: "Text", label: "Last Inspected", sortOrder: 4, column: { formatter: "datetime" } },
    inService: { type: "Checkbox", label: "In Service", sortOrder: 5 },
});
```

Merge into createDataTable({ ... }) `[options]`:

```ts
descriptors: assetDescriptors,
schema: undefined,
columns: undefined,
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code.

- A schema passed alongside descriptors wins over the one descriptors derive, so leave schema out. Leave columns out too unless a column needs more than its descriptor gives, such as a cell template: columns passed alongside descriptors merge over the descriptor-made columns by key, so pass only the ones you change.
- When a server sends the list of fields, build the descriptors from it instead of writing them out (the from-a-field-list variant below).

Reference: `descriptors`

### define-columns-with-descriptors#from-a-field-list

**Build descriptors from a field list.** Turn a list of fields sent by a server (name, label, type and, for a pick-list, its options) into descriptors at runtime, so the columns, schema and editors follow the list instead of being written by hand.

Apply the recipe above, then:

Imports `[imports]`:

```ts
import type { ColumnDescriptors } from "data-ui/data-table";
```

Module scope `[module]`, in place of the recipe's block:

```ts
type FieldSpec = {
    readonly field: string;
    readonly label: string;
    readonly type: "text" | "number" | "date" | "select";
    readonly options?: readonly string[];
};

const assetFieldSpecs: readonly FieldSpec[] = [
    { field: "name", label: "Name", type: "text" },
    { field: "category", label: "Category", type: "select", options: ["Pump", "Valve", "Hydrant", "Pipe"] },
    { field: "cost", label: "Cost", type: "number" },
    { field: "lastInspected", label: "Last Inspected", type: "date" },
];

function toDescriptor(spec: FieldSpec, sortOrder: number): Record<string, unknown> {
    switch (spec.type) {
        case "number":
            return { type: "Number", label: spec.label, sortOrder, column: { align: "right" } };
        case "date":
            return { type: "DateTime", label: spec.label, sortOrder, showTime: false, column: { formatter: "date" } };
        case "select":
            return { type: "Select", label: spec.label, sortOrder, clearable: false, options: (spec.options ?? []).map((option) => ({ value: option, label: option })) };
        default:
            return { type: "Text", label: spec.label, sortOrder };
    }
}

const assetDescriptors = Object.fromEntries(assetFieldSpecs.map((spec, index) => [spec.field, toDescriptor(spec, index + 1)])) as ColumnDescriptors<Asset>;
```

Merge into createDataTable({ ... }) `[options]`:

```ts
editable: true,
```

View definition JSON for this variant's options, merged over the recipe's:

```json
{ "editable": true }
```

- Each field's descriptor type picks its column type, its editor and its filter input: Text, Number, DateTime (showTime: false for a date alone), Select with { value, label } options, Checkbox. column carries the column extras such as align and formatter.
- editable: true makes every column editable with its descriptor's editor; a Select field edits with a dropdown of its options.
- Object.fromEntries does not know the field names, hence the cast to ColumnDescriptors\<Asset>: a name in the list that is not a field of the row type is not a type error, so keep the list and the row type in step.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [define-columns-with-descriptors](define-columns-with-descriptors.md): Define columns with descriptors
- [descriptors](../descriptors.md): Descriptors
