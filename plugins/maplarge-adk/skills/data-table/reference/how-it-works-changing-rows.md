# Data Table - How It Works - Changing Rows

<!-- Automatically generated, do not edit -->

## Changing Rows

**A user's edit** opens on the stored value and commits what was typed, with two exceptions: a column with units (`unitInfo`) opens on the number the cell shows, in the display unit, and converts the typed number back to the stored unit on commit (never convert it again in code), and a trigger's `transformEditValue` changes the typed value on commit only. A percent formatter changes only the display, so 0.075 is edited as 0.075. Double-click and the right-click Edit open the editor; Enter does only on a selected cell, which needs a `tableSelection` engine. `editing: true` on the column; limits on the schema entry's descriptor (`schema.number({ editing: { descriptor: { type: "Number", min, max } } })`, `required: true`); `onRowUpdate({ row, changedFields })` is where your copy and your totals catch up, followed by `this.update()`.

Rows change in three ways, and each takes its own path through the table.

```ts
a user edits a cell     editor -> validation -> commit -> engine.updateRow -> onRowUpdate({ row, changedFields })
your code changes rows  store.mutations.update / insert / remove / removeBulk (...).run() -> engine -> repaint
a live feed             engine.updateRow({ row, changedFields }) per changed row, then actions.refresh()
```

An edit with limits, and the callback where your copy catches up:

```ts
// schema: the descriptor rejects values outside 0 to 25 before anything is saved
commissionRate: schema.number({ editing: { descriptor: { type: "Number", min: 0, max: 25 } } }),

// column and callback
column({ field: "commissionRate", header: "Rate", editing: true }),
onRowUpdate: async ({ row }) => {
    this.currentReps.set(row.id, row);   // your copy
    this.updateTotalText();              // anything worked out from it
    this.update();
},
```

A change from code, with what you work out from the rows updated in the same handler:

```ts
public readonly retire = async (rowIndex: number): Promise<void> => {
    const store = this.store;
    const asset = store?.getRow(rowIndex);
    if (store === null || asset === undefined) return;
    await store.mutations.update({ rowIndex, row: { ...asset, status: "retired" }, fields: ["status"] }).run();
    this.updateSummaryText();   // mutations do not call onRowUpdate
    this.update();
};
```

- Checked rows go with store.mutations.removeBulk(indices.map((rowIndex) => ({ rowIndex }))).run().
- arrayData writes each committed edit into the row objects you passed in, so a copy taken before the edit changes too. Record changes as they happen instead of comparing afterwards.
- actions.refresh() scrolls back to the top. A live table long enough to scroll patches its loaded rows in place instead (update-rows-live-in-place).

## Related

- [how-it-works-the-pieces](how-it-works-the-pieces.md): How It Works - The Pieces and more
