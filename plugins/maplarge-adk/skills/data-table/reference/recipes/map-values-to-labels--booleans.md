# Data Table recipe - Show booleans as labels

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

### map-values-to-labels#booleans

**Show booleans as labels.** Show true and false as Yes and No, or any two labels, with the built-in boolean formatter.

Apply the recipe above, then:

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "inService", header: "In Service", formatter: "boolean", formatterArgs: { trueLabel: "In service", falseLabel: "Out of service" } }),
],
```

View definition JSON for this variant's options, merged over the recipe's:

```json
{
  "columns": [
    {
      "field": "inService",
      "header": "In Service",
      "formatter": "boolean",
      "formatterArgs": { "trueLabel": "In service", "falseLabel": "Out of service" },
      "key": "inService"
    }
  ]
}
```

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [map-values-to-labels](map-values-to-labels.md): Map values to labels
- [cells-and-content](../cells-and-content.md): Cell Values
