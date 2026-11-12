# Data Table recipe - Define columns with descriptors

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

Variants, each in its own file with this recipe: `define-columns-with-descriptors#from-a-field-list` (Build descriptors from a field list).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [descriptors](../descriptors.md): Descriptors
- [define-columns-with-descriptors#from-a-field-list](define-columns-with-descriptors--from-a-field-list.md): Build descriptors from a field list
