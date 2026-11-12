# Data Table recipe - An Undo button for edits

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

### update-rows-live#undo-last-edit

**An Undo button for edits.** An Undo button above an editable table that reverts the most recent edit, then the one before, and is disabled when there is nothing to undo.

Apply the recipe above, then:

ViewModel members `[members]`:

```ts
public nothingToUndo = true;
private readonly editHistory: { readonly id: number; readonly cost: number }[] = [];
private readonly lastCosts = new Map(assets.map((asset) => [asset.id, asset.cost]));

public readonly undo = async (): Promise<void> => {
    const store = this.store;
    const entry = this.editHistory.pop();
    if (store === null || entry === undefined) return;
    const rows = await store.getRowsFromDataEngine({ rowIndices: assets.map((_asset, index) => index), checkCache: true });
    const rowIndex = rows.findIndex((row) => row !== undefined && row.id === entry.id);
    const row = rows[rowIndex];
    if (row !== undefined) await store.mutations.update({ rowIndex, row: { ...row, cost: entry.cost }, fields: ["cost"] }).run();
    this.lastCosts.set(entry.id, entry.cost);
    this.nothingToUndo = this.editHistory.length === 0;
    this.update();
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "cost", header: "Cost", align: "right", editing: true, formatter: "currency", formatterArgs: { currency: "USD" } }),
],
onRowUpdate: async ({ row }) => {
    const before = this.lastCosts.get(row.id);
    if (before !== undefined && before !== row.cost) this.editHistory.push({ id: row.id, cost: before });
    this.lastCosts.set(row.id, row.cost);
    this.nothingToUndo = this.editHistory.length === 0;
    this.update();
},
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "undo" }], bindings: { disable: "nothingToUndo" } })
    .contentTemplates((button) => { button.span({ text: "Undo" }); });
```

Leave out the recipe's `[afterCreate]`, `[destroy]` blocks.

View definition JSON for this variant's options, merged over the recipe's:

```json
{
  "columns": [
    {
      "field": "cost",
      "header": "Cost",
      "align": "right",
      "editing": true,
      "formatter": "currency",
      "formatterArgs": { "currency": "USD" },
      "key": "cost"
    }
  ]
}
```

- onRowUpdate runs after each committed edit with the new row, so the value before it comes from your own record (lastCosts); each edit pushes { id, cost before } onto editHistory.
- Undo finds the row's current position by reading the rows with store.getRowsFromDataEngine (the table's order changes with sorting, and store.getRow sees only rows loaded near the screen) and reverts it with store.mutations.update, which saves through the engine and repaints without calling onRowUpdate, so the undo itself is not recorded.
- Rewriting the original array (products.length = 0; products.push(...)) and refreshing changes nothing: arrayData copied that array when the table was built.
- The button binds disable to nothingToUndo, a true/false member set wherever the history changes; a binding cannot negate a member, so keep the flag in the sense the binding needs.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [update-rows-live](update-rows-live.md): Update rows from code: a live feed, a refresh button, undo
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
