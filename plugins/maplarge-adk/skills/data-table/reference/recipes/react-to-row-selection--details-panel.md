# Data Table recipe - Details beside the table

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

### react-to-row-selection#details-panel

**Details beside the table.** Show the clicked row's fields in a panel next to the table.

Apply the recipe above, then:

ViewModel members `[members]`, in place of the recipe's block:

```ts
public selectedName = "Select an asset";
public selectedCategory = "";
public selectedLength = "";
public selectedNotes = "";
private unsubscribeSelection: (() => void) | null = null;
```

After createDataTable `[afterCreate]`, in place of the recipe's block:

```ts
this.unsubscribeSelection = store.subscribe(actions.selectCell, ({ selection }) => {
    const asset = store.getRow(selection.coordinates.row);
    if (asset === undefined) return;
    this.selectedName = asset.name;
    this.selectedCategory = asset.category;
    this.selectedLength = asset.lengthMeters.toLocaleString() + " m";
    this.selectedNotes = asset.notes;
    this.update();
});
```

table `[table]`:

```ts
s.div({ height: 400, flex: { dFlex: true, gap: 3 } }).contentTemplates((row) => {
    row.div({ flex: { flex: 1 }, overflow: "hidden" }).contentTemplates((s) => {
        s.dataTable(dataTableOptions<Asset>({
            bindings: { data: "dataTableOptions" },
        }));
    });
    row.div({ width: 300, padding: { x: 3, y: 2 }, flex: { flexShrink: 0 }, overflow: "auto" }).contentTemplates((panel) => {
        panel.div({ fontSize: 5, fontWeight: "bold", bindings: { text: "selectedName" } });
        panel.div({ margin: { top: 2 }, fontWeight: "semibold", text: "Category" });
        panel.div({ bindings: { text: "selectedCategory" } });
        panel.div({ margin: { top: 2 }, fontWeight: "semibold", text: "Length" });
        panel.div({ bindings: { text: "selectedLength" } });
        panel.div({ margin: { top: 2 }, fontWeight: "semibold", text: "Notes" });
        panel.div({ wordBreak: true, bindings: { text: "selectedNotes" } });
    });
});
```

Leave out the recipe's `[viewAfter]` block.

- store.getRow returns the whole row the data engine loaded, including fields that have no column; a MapLarge source loads every field unless the engine's defaultFields lists some.
- width on a div is in pixels and flex: { flex: 1 } gives the table the rest of the row. overflow: "hidden" lets the table's pane shrink below the width of all its columns, so a wide table scrolls sideways inside its pane instead of pushing the panel out of view.
- Each field is a label node and a value node. A node has no prefix or suffix: build the text in the ViewModel, as selectedLength does, and bind it. Text with line breaks, such as JSON.stringify(value, null, 2), keeps them on a div with textWrap2: "pre-wrap".

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [react-to-row-selection](react-to-row-selection.md): React to row selection: details beside the table, related rows in a second table
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-selection-selection-engines](../cell-selection-selection-engines.md): Selection - Selection Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
