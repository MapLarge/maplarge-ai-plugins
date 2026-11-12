# Data Table recipe - Show a change made elsewhere

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## update-rows-live

**Update rows from code: a live feed, a refresh button, undo.** Change rows held in code while the table is open, keeping the user's sort and filters: readings from a live feed on a timer, a Refresh button, a repaint of a change made elsewhere, or an Undo button that reverts the last edit.

ViewModel members `[members]`:

```ts
private liveTimer: number | undefined;
private liveAssets: Asset[] = [...assets];
```

Before createDataTable `[beforeCreate]`:

```ts
const assetEngine = dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id });
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: assetEngine,
```

After createDataTable `[afterCreate]`:

```ts
this.liveTimer = window.setInterval(() => {
    this.liveAssets = this.liveAssets.map((asset) => ({
        ...asset,
        utilization: Math.min(1, Math.max(0, asset.utilization + (Math.random() - 0.5) / 5)),
    }));
    for (const asset of this.liveAssets) {
        void assetEngine.updateRow({ row: asset, changedFields: ["utilization"] });
    }
    store.dispatch(actions.refresh());
}, 5000);
```

In destroy() `[destroy]`:

```ts
window.clearInterval(this.liveTimer);
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; setup code; cleanup code.

- arrayData copies the array you give it but keeps your row objects, so adding or removing entries in the original array changes nothing on screen. Keep the current rows yourself (liveAssets here), and push changes through the engine: updateRow (matched by getRowId), createRow and removeRow.
- updateRow on arrayData changes its copy before it returns, so the refresh right after sees the new values without awaiting.
- actions.refresh() re-reads the rows with the current sort and filters, and row themes and cell templates re-run on the new values. It shows no loading overlay (that is for sort and filter), but it scrolls the table back to the top; for a table long enough to scroll, use update-rows-live-in-place.
- A selection, and a cell being edited, stay at their row position when a refresh re-sorts the rows, so they can end up on a different row. Pause the timer while the user edits, or keep live tables read-only.

Reference: `data-data-engines`, `store-store-api`

### update-rows-live#repaint-only

**Show a change made elsewhere.** Show a change made somewhere else, such as a save through another API, in the rows already on screen without re-querying or saving again.

Apply the recipe above, then:

ViewModel members `[members]`:

```ts
public markInspected(rowIndex: number): void {
    const row = this.store?.getRow(rowIndex);
    if (row === undefined) return;
    this.store?.rows.applyUpdate({
        rowIndex,
        row: { ...row, lastInspected: new Date().toISOString() },
        fields: ["lastInspected"],
    });
}
```

Leave out the recipe's `[afterCreate]`, `[destroy]` blocks.

- rowIndex is the row's position in the table as sorted and filtered now, the same index store.getRow and a selection's coordinates.row use; never the row's index in your own array.
- store.rows.applyUpdate replaces the whole cached row with the row you pass, so always pass the complete row, as the code does. It does not call the server or change the data engine, so the next sort, filter or refresh shows the engine's rows again.
- store.rows.applyInsert and store.rows.applyRemove do not work this way: each is followed at once by a full refresh (the table re-reads the engine's rows and scrolls back to the top), so the change vanishes unless the data engine already has it. For an added or removed row, change the engine (store.mutations.insert or remove; add-rows, delete-rows) and let the refresh show it.
- To change a row because the user did something in this table (a menu item, a button in the row, a click on a cell), use store.mutations.update({ rowIndex, row, fields }).run() instead: it repaints the row and saves it through the data engine, so the change survives sorting (right-click-menus, add-action-buttons).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [update-rows-live](update-rows-live.md): Update rows from code: a live feed, a refresh button, undo
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
