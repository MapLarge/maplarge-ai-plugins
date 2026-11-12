# Data Table recipe - Update rows from code: a live feed, a refresh button, undo

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

Variants, each in its own file with this recipe: `update-rows-live#refresh-button` (A Refresh button), `update-rows-live#repaint-only` (Show a change made elsewhere), `update-rows-live#undo-last-edit` (An Undo button for edits).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
- [update-rows-live#refresh-button](update-rows-live--refresh-button.md): A Refresh button
- [update-rows-live#repaint-only](update-rows-live--repaint-only.md): Show a change made elsewhere
- [update-rows-live#undo-last-edit](update-rows-live--undo-last-edit.md): An Undo button for edits
