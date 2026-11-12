# Data Table recipe - Map values to labels

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## map-values-to-labels

**Map values to labels.** Show readable names for codes or ids, such as "In Maintenance" for maintenance.

Module scope `[module]`:

```ts
const statusLabels: Readonly<Record<string, string>> = {
    active: "Active",
    maintenance: "In Maintenance",
    retired: "Retired",
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "status", header: "Status", transformValue: ({ value }) => statusLabels[value] ?? value }),
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code; columns[0] (its transformValue is code).

- transformValue changes what the cell shows; sorting and filtering still use the stored value.

Reference: `cells-and-content`

Variants, each in its own file with this recipe: `map-values-to-labels#booleans` (Show booleans as labels).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [cells-and-content](../cells-and-content.md): Cell Values
- [map-values-to-labels#booleans](map-values-to-labels--booleans.md): Show booleans as labels
