# Data Table recipe - Add rows

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## add-rows

**Add rows.** Let users add a new row with a button, saving it through the data engine.

ViewModel members `[members]`:

```ts
public readonly addAsset = async (): Promise<void> => {
    await this.store?.mutations.insert({
        row: { id: Date.now(), name: "New asset", category: "Pump", status: "active", cost: 0, utilization: 0, rating: 0, lastInspected: new Date().toISOString(), inService: true, location: "", lengthMeters: 0, notes: "", docsUrl: "", photoUrl: "", trend: [], tags: [] },
    }).run();
};
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "primary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "addAsset" }] })
    .contentTemplates((button) => { button.span({ text: "Add asset" }); });
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; view nodes.

- With rows held in code and no sort, the new row shows at the top of the table; with a sort, or on a MapLarge source, it shows where the engine's order puts it. It is saved through the data engine's createRow (arrayData adds it to its copy; a MapLarge source writes it to the table), and the table refreshes to show it.
- To add it at the bottom instead, keep the arrayData engine in a member (private readonly assetEngine = dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id }), passed as data), then await this.assetEngine.createRow({ row }) and this.store?.dispatch(actions.refresh()): the engine appends the row, and the refresh shows it last unless a sort puts it elsewhere.
- The row needs every field the row type has. Give it the values new rows should start with.
- When a Save button must also send the added rows, use save-added-changed-and-deleted-rows instead of this recipe.

Reference: `crud-overview`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [crud-overview](../crud-overview.md): CRUD - Overview and more
