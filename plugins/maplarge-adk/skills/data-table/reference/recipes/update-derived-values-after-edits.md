# Data Table recipe - Update computed values and totals after edits

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## update-derived-values-after-edits

**Update computed values and totals after edits.** Recompute values that depend on edited fields, such as a ratio in its own column and a total under the table, as soon as an edit is saved.

ViewModel members `[members]`:

```ts
public totalCost = "";
private readonly currentAssets = new Map(assets.map((asset) => [asset.id, asset]));

private updateTotalCost(): void {
    const total = [...this.currentAssets.values()].reduce((sum, asset) => sum + asset.cost, 0);
    this.totalCost = "Total cost: $" + total.toLocaleString();
}
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "cost", header: "Cost", editing: true }),
    column({ field: "lengthMeters", header: "Length (m)", editing: true }),
    virtualColumn({
        key: "costPerMeter",
        header: "Cost per m",
        align: "right",
        transformValue: ({ row }) => (row.lengthMeters > 0 ? "$" + Math.round(row.cost / row.lengthMeters).toLocaleString() : ""),
    }),
],
onRowUpdate: async ({ row }) => {
    this.currentAssets.set(row.id, row);
    this.updateTotalCost();
    this.update();
},
```

After createDataTable `[afterCreate]`:

```ts
this.updateTotalCost();
```

Below the table (view) `[viewAfter]`:

```ts
s.div({ margin: { top: 2 }, fontWeight: "semibold", bindings: { text: "totalCost" } });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "cost", "header": "Cost", "editing": true, "key": "cost" },
    { "field": "lengthMeters", "header": "Length (m)", "editing": true, "key": "lengthMeters" }
  ]
}
```

Code only, not in the JSON form: ViewModel members; setup code; view nodes; columns[2] (its transformValue is code); onRowUpdate.

- After an edit is saved the row repaints and transformValue runs again on the new values, so the computed column needs no extra code.
- Cost per m tests lengthMeters > 0 only to avoid dividing by zero. A sum or a difference needs no such test and must still show 0 and negative results; test for undefined (an empty row slot) instead.
- The total comes from your own copy of the rows (currentAssets), kept current in onRowUpdate. Bind it under the table, or return it from a status bar's formatStatusText.
- To sort by a computed value, store it in each row as a field (set it in the starting data) and push its new value through the engine in onRowUpdate: create the engine in a variable, as update-rows-live does, and call assetEngine.updateRow({ row: { ...row, field: value }, changedFields: ["field"] }). A virtual column's sortField can then name that field.

Reference: `cell-editing-global-editable-config`, `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
