# Data Table recipe - Add a computed column

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## add-computed-column

**Add a computed column.** Show a value calculated from other fields, such as a ratio or a combined label.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    virtualColumn({
        key: "costPerMeter",
        header: "Cost / m",
        align: "right",
        transformValue: ({ row }) => (row.lengthMeters > 0 ? (row.cost / row.lengthMeters).toFixed(2) : ""),
    }),
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: columns[0] (its transformValue is code).

- A virtual column has no field, so it needs a key, and without a sortField its header does not sort. sortField sorts by a stored field, never by the computed value: sortField: "cost" here would order Cost / m by cost, and a sortField naming a field the rows do not have sorts nothing.
- To let users sort by the computed value itself, work it out into each row in code when you build the rows (rows.map((row) => ({ ...row, costPerMeter: ... }))), never by typing the results into the data by hand, add it to the row type and the schema, and show it with column({ field: "costPerMeter" }) instead of a virtual column. If the inputs change later (an edit, a live update), recompute it and pass it in changedFields too (update-derived-values-after-edits, update-rows-live-in-place).
- transformValue also runs for empty row slots with an empty row; this one returns "" because the comparison is false when lengthMeters is missing. Guard any field you call a method on.

Reference: `columns-column-types`, `cells-and-content`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
- [cells-and-content](../cells-and-content.md): Cell Values
