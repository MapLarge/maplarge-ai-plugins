# Data Table recipe - Update live rows in place

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## update-rows-live-in-place

**Update live rows in place.** Change rows held in code while the table is open, in a table long enough to scroll, without moving the user's scroll position: each update patches the loaded rows where they are.

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
    const liveById = new Map(this.liveAssets.map((asset) => [asset.id, asset]));
    for (const asset of this.liveAssets) {
        void assetEngine.updateRow({ row: asset, changedFields: ["utilization"] });
    }
    for (let rowIndex = 0; rowIndex < this.liveAssets.length; rowIndex++) {
        const shown = store.getRow(rowIndex);
        const live = shown === undefined ? undefined : liveById.get(shown.id);
        if (live !== undefined) store.rows.applyUpdate({ rowIndex, row: live, fields: ["utilization"] });
    }
}, 5000);
```

In destroy() `[destroy]`:

```ts
window.clearInterval(this.liveTimer);
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; setup code; cleanup code.

- store.rows.applyUpdate takes the row's position in the table as sorted and filtered now, which is why the loop reads each position with store.getRow and matches it by id. Passing the row's index in your own array paints rows over the wrong ones as soon as the user sorts or filters.
- store.getRow returns undefined for rows not loaded yet; those load later from the engine, which updateRow has already changed.
- Patch every shown row each tick, as the loop does. Never skip a row whose shown value already equals the live one: updateRow writes the new values into the row objects the table holds, so store.getRow already returns them, the check is always equal, and nothing repaints.
- The loop runs over your own array's length (liveAssets.length); the store has no row count method.
- Rows keep their order between updates, so a sorted column can drift out of order until the user sorts again. When the order matters more than the scroll position, use update-rows-live.

Reference: `data-data-engines`, `store-store-api`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
