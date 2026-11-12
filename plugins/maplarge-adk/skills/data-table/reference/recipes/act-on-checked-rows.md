# Data Table recipe - Act on checked rows: delete, change or move them

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

Variants, each in its own file with this recipe: `act-on-checked-rows#move-to-another-table` (Move checked rows between two tables).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-selection-selection-engines](../cell-selection-selection-engines.md): Selection - Selection Engines and more
- [crud-overview](../crud-overview.md): CRUD - Overview and more
- [act-on-checked-rows#move-to-another-table](act-on-checked-rows--move-to-another-table.md): Move checked rows between two tables
