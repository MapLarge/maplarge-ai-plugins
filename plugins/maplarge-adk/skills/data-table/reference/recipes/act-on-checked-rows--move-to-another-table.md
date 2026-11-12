# Data Table recipe - Move checked rows between two tables

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## act-on-checked-rows

**Act on checked rows: delete, change or move them.** Run one action on every checked row, such as bulk delete or a bulk change, from a button that is disabled while nothing is checked; the variant moves the checked rows into a second table.

ViewModel members `[members]`:

```ts
public nothingChecked = true;
private readonly unsubscribeCheckedRows: (() => void)[] = [];

private updateNothingChecked(): void {
    this.nothingChecked = (this.store?.getCheckboxRowsSelectedIndices().length ?? 0) === 0;
    this.update();
}

public readonly deleteChecked = async (): Promise<void> => {
    const store = this.store;
    if (!store) return;
    const indices = [...store.getCheckboxRowsSelectedIndices()];
    await store.mutations.removeBulk(indices.map((rowIndex) => ({ rowIndex }))).run();
    store.checkboxRowsUnselectAll();
};

public readonly retireChecked = async (): Promise<void> => {
    const store = this.store;
    if (!store) return;
    const indices = [...store.getCheckboxRowsSelectedIndices()];
    const rows = await store.getRowsFromDataEngine({ rowIndices: indices, checkCache: true });
    const updates = indices.flatMap((rowIndex, position) => {
        const row = rows[position];
        return row === undefined ? [] : [store.mutations.update({ rowIndex, row: { ...row, status: "retired" }, fields: ["status"] })];
    });
    await store.mutations.compose(updates).run();
    store.checkboxRowsUnselectAll();
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
checkboxRows: { showSelectAll: true },
```

After createDataTable `[afterCreate]`:

```ts
this.unsubscribeCheckedRows.push(
    store.subscribe(actions.checkboxToggleRow, () => this.updateNothingChecked()),
    store.subscribe(actions.checkboxSelectAll, () => this.updateNothingChecked()),
    store.subscribe(actions.checkboxUnselectAll, () => this.updateNothingChecked()),
    store.subscribe(actions.sortDone, () => store.checkboxRowsUnselectAll()),
    store.subscribe(actions.setFilterDone, () => store.checkboxRowsUnselectAll()),
    store.subscribe(actions.clearFiltersDone, () => store.checkboxRowsUnselectAll()),
    store.subscribe(actions.setConstraintDone, () => store.checkboxRowsUnselectAll()),
);
```

In destroy() `[destroy]`:

```ts
for (const unsubscribe of this.unsubscribeCheckedRows) unsubscribe();
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "danger", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "deleteChecked" }], bindings: { disable: "nothingChecked" } })
    .contentTemplates((button) => { button.span({ text: "Delete checked" }); });
s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "retireChecked" }], bindings: { disable: "nothingChecked" } })
    .contentTemplates((button) => { button.span({ text: "Retire checked" }); });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "checkboxRows": { "showSelectAll": true } }
```

Code only, not in the JSON form: ViewModel members; setup code; cleanup code; view nodes.

- bindings: { disable: "nothingChecked" } greys the button out while nothing is checked; the three checkbox actions keep the flag current, and checkboxRowsUnselectAll after the action sets it back. The binding is disable (or enable, its opposite); disabled is not a binding and does nothing.
- A check is kept as a row position in the table's current order, not as the row: after a sort, a header filter or a constraint the same positions stay checked on different rows, and an action would hit the wrong rows. The four Done subscriptions clear the checks whenever that happens (they also fire the checkbox action, so the flag follows). A refresh that brings back rows in a different order moves them too; clear the checks before it.
- retireChecked changes the checked rows instead of deleting them: one store.mutations.update(...) per checked row, run together by store.mutations.compose(updates).run(). compose takes what store.mutations.update returns; plain { rowIndex, row, fields } objects make it throw "m.apply is not a function" and nothing changes.
- removeBulk deletes through the data engine's removeRows. arrayData and dataStoreData or dataSourceData on a table with a primary key have it; a MapLarge table without a primary key does not, and removeBulk throws. There, remove the checked rows one at a time with store.mutations.remove({ rowIndex }).run(), highest index first so the earlier removals do not shift the rest.
- The shape is the same for any bulk action: read the checked rows' positions with store.getCheckboxRowsSelectedIndices(), read the rows with await store.getRowsFromDataEngine({ rowIndices: indices, checkCache: true }) before changing anything (a removal renumbers the rows after it), skip any that come back undefined, run the mutations, then checkboxRowsUnselectAll. store.getRow returns only rows loaded near the screen, so after Select All on a table longer than one page (50 rows) it misses the rest.

Reference: `cell-selection-selection-engines`, `crud-overview`

### act-on-checked-rows#move-to-another-table

**Move checked rows between two tables.** Two tables side by side, such as two warehouses or available and chosen items, with buttons that move the checked rows from one to the other and a count under each.

Apply the recipe above, then:

Module scope `[module]`:

```ts
async function moveCheckedRows(from: DataTableStore<Asset>, to: DataTableStore<Asset>): Promise<void> {
    const indices = [...from.getCheckboxRowsSelectedIndices()];
    const rows = await from.getRowsFromDataEngine({ rowIndices: indices, checkCache: true });
    const found = indices.flatMap((rowIndex, position) => {
        const row = rows[position];
        return row === undefined ? [] : [{ rowIndex, row }];
    });
    await from.mutations.removeBulk(found.map(({ rowIndex }) => ({ rowIndex }))).run();
    from.checkboxRowsUnselectAll();
    for (const { row } of found) await to.mutations.insert({ row }).run();
}
```

ViewModel members `[members]`, in place of the recipe's block:

```ts
public spareTableOptions: DataTableOptions<Asset> | null = null;
private spareStore: DataTableStore<Asset> | null = null;

public readonly moveToSpares = async (): Promise<void> => {
    if (this.store !== null && this.spareStore !== null) await moveCheckedRows(this.store, this.spareStore);
};

public readonly moveToAssets = async (): Promise<void> => {
    if (this.store !== null && this.spareStore !== null) await moveCheckedRows(this.spareStore, this.store);
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.arrayData({ data: assets.slice(0, 3), getRowId: (asset) => asset.id }),
statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
    formatStatusText: ({ totalRows }) => (totalRows === undefined ? "" : String(totalRows) + (totalRows === 1 ? " asset" : " assets")),
}),
```

After createDataTable `[afterCreate]`, in place of the recipe's block:

```ts
const spareTable = createDataTable<Asset>({
    data: dataTable.viewModel.data.arrayData({ data: assets.slice(3), getRowId: (asset) => asset.id }),
    schema: assetSchema,
    columns: [
        column({ field: "name", header: "Name", width: toPixels(220) }),
        column({ field: "category", header: "Category", width: toPixels(120) }),
    ],
    checkboxRows: { showSelectAll: true },
    statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
        formatStatusText: ({ totalRows }) => (totalRows === undefined ? "" : String(totalRows) + (totalRows === 1 ? " asset" : " assets")),
    }),
});
this.spareTableOptions = spareTable.options;
this.spareStore = spareTable.store;
```

table `[table]`:

```ts
s.div({ flex: { dFlex: true, gap: 3, alignItemsCenter: true } }).contentTemplates((s) => {
    s.div({ width: 380, height: 300 }).contentTemplates((s) => {
        s.dataTable(dataTableOptions<Asset>({
            bindings: { data: "dataTableOptions" },
        }));
    });
    s.div({ flex: { dFlex: true, flexColumn: true, gap: 2 } }).contentTemplates((buttons) => {
        buttons.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "moveToSpares" }] })
            .contentTemplates((button) => { button.span({ text: "Move right" }); });
        buttons.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "moveToAssets" }] })
            .contentTemplates((button) => { button.span({ text: "Move left" }); });
    });
    s.div({ width: 380, height: 300 }).contentTemplates((s) => {
        s.dataTable(dataTableOptions<Asset>({
            bindings: { data: "spareTableOptions" },
        }));
    });
});
```

Leave out the recipe's `[destroy]`, `[viewBefore]` blocks.

- Each table has its own createDataTable, options member and store; the second is created after the first, in afterCreate. moveCheckedRows reads the checked rows with getRowsFromDataEngine before removing them (so rows off screen are moved too), removes only the rows it read with removeBulk, and inserts each into the other table with mutations.insert, so a moved row keeps every field.
- Each table's status bar counts its own rows and follows every move with no extra code.
- Both tables need getRowId, and a row's id must stay unique across both, since rows move back and forth.
- To grey a Move button out while its table has nothing checked, bind disable to a flag per table kept current by the three checkbox actions, as the recipe's nothingChecked is.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [act-on-checked-rows](act-on-checked-rows.md): Act on checked rows: delete, change or move them
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-selection-selection-engines](../cell-selection-selection-engines.md): Selection - Selection Engines and more
- [crud-overview](../crud-overview.md): CRUD - Overview and more
