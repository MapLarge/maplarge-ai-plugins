# Data Table recipe - React to row selection: details beside the table, related rows in a second table

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## react-to-row-selection

**React to row selection: details beside the table, related rows in a second table.** Do something when a row is clicked: subscribe to the selection, read the row with store.getRow, set ViewModel members and update. The variants show the row's fields in a panel beside the table, or its related rows in a second table (master-detail).

ViewModel members `[members]`:

```ts
public selectedName = "Select a row";
private unsubscribeSelection: (() => void) | null = null;
```

Merge into createDataTable({ ... }) `[options]`:

```ts
tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "row" }),
```

After createDataTable `[afterCreate]`:

```ts
this.unsubscribeSelection = store.subscribe(actions.selectCell, ({ selection }) => {
    this.selectedName = store.getRow(selection.coordinates.row)?.name ?? "";
    this.update();
});
```

In destroy() `[destroy]`:

```ts
this.unsubscribeSelection?.();
```

Below the table (view) `[viewAfter]`:

```ts
s.div({ margin: { top: 2 }, bindings: { text: "selectedName" } });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "tableSelection": { "strategy": "row" } }
```

Code only, not in the JSON form: ViewModel members; setup code; cleanup code; view nodes.

- selection.coordinates.row is the row's index in the table's current order; read the row with store.getRow before the rows change again.
- These skills document no map or layer methods. To highlight or zoom to the selected row on a map, the developer supplies that code; never guess map calls such as allMaps lookups or style overrides.
- Both variants keep this shape and change what the subscription sets and what the view shows: members for the panel's fields, or the selected id a second table's fetchRows reads.

Reference: `cell-selection-selection-engines`, `store-store-api`

Variants, each in its own file with this recipe: `react-to-row-selection#details-panel` (Details beside the table), `react-to-row-selection#second-table` (Related rows in a second table).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-selection-selection-engines](../cell-selection-selection-engines.md): Selection - Selection Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
- [react-to-row-selection#details-panel](react-to-row-selection--details-panel.md): Details beside the table
- [react-to-row-selection#second-table](react-to-row-selection--second-table.md): Related rows in a second table
