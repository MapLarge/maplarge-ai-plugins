# Data Table recipe - A Refresh button

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

### update-rows-live#refresh-button

**A Refresh button.** Re-query the rows when the user asks, with a line under the table saying when, instead of on a timer.

Apply the recipe above, then:

ViewModel members `[members]`:

```ts
public lastRefreshed = "";

public readonly refresh = (): void => {
    this.store?.dispatch(actions.refresh());
    this.lastRefreshed = "Last refreshed " + new Date().toLocaleTimeString();
    this.update();
};
```

After createDataTable `[afterCreate]`, in place of the recipe's block:

```ts
this.lastRefreshed = "Last refreshed " + new Date().toLocaleTimeString();
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "refresh" }] })
    .contentTemplates((button) => { button.span({ text: "Refresh" }); });
```

Below the table (view) `[viewAfter]`:

```ts
s.div({ margin: { top: 2 }, bindings: { text: "lastRefreshed" } });
```

Leave out the recipe's `[destroy]` block.

- A data store table also re-queries by itself whenever a filter on its source changes. To refresh on a timer as well, keep the recipe's setInterval and call this.refresh from it.
- refresh sets lastRefreshed and calls this.update(), so the line under the table follows the button; without this.update() it keeps its first value.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [update-rows-live](update-rows-live.md): Update rows from code: a live feed, a refresh button, undo
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
