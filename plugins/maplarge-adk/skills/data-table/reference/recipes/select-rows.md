# Data Table recipe - Select rows

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## select-rows

**Select rows.** Highlight the clicked row, or let users check several rows with checkboxes.

ViewModel members `[members]`:

```ts
public checkedNames(): readonly string[] {
    const store = this.store;
    if (!store) return [];
    return store.getCheckboxRowsSelectedIndices().map((rowIndex) => store.getRow(rowIndex)?.name ?? "");
}
```

Merge into createDataTable({ ... }) `[options]`:

```ts
tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "row" }),
checkboxRows: { showSelectAll: true },
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "tableSelection": { "strategy": "row" }, "checkboxRows": { "showSelectAll": true } }
```

Code only, not in the JSON form: ViewModel members.

- overlaySelection({ type: "cell" }) selects single cells instead of rows.

Reference: `cell-selection-selection-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-selection-selection-engines](../cell-selection-selection-engines.md): Selection - Selection Engines and more
