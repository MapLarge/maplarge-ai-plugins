# Data Table recipe - Add right-click menu items

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## right-click-menus

**Add right-click menu items.** Add your own items to the right-click menu of a row's cells, after the built-in Copy and before Edit (which appears only on columns users can edit), such as actions that change the clicked row.

ViewModel members `[members]`:

```ts
private setStatus(rowIndex: number | undefined, status: string): void {
    const store = this.store;
    const asset = rowIndex === undefined ? undefined : store?.getRow(rowIndex);
    if (store === null || rowIndex === undefined || asset === undefined) return;
    void store.mutations.update({ rowIndex, row: { ...asset, status }, fields: ["status"] }).run();
}
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "status", header: "Status", width: toPixels(120) }),
],
cellContextMenu: dataTable.viewModel.contextMenu.cellContextMenuEngine(),
cellContextMenuItems: [
    (ctx) => [
        { type: "action", label: "Mark retired", onClick: () => this.setStatus(ctx.rowIndex, "retired") },
        { type: "action", label: "Mark active", onClick: () => this.setStatus(ctx.rowIndex, "active") },
    ],
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [{ "field": "status", "header": "Status", "width": 120, "key": "status" }],
  "cellContextMenu": { "strategy": "cellContextMenuEngine" }
}
```

Code only, not in the JSON form: ViewModel members; cellContextMenuItems[0].

- cellContextMenuItems adds items to the menu of every cell, so they serve as row actions: ctx.rowIndex is the clicked row's position in the table as sorted and filtered now (undefined off a row); read the row with store.getRow. ctx.column.key and ctx.displayText describe the clicked cell.
- store.mutations.update(...).run() repaints the row and saves it through the data engine (arrayData updates its copy, found by getRowId), so the change survives sorting and filtering. store.rows.applyUpdate would only repaint until the next sort.
- The header menu works the same way through headerContextMenu and headerContextMenuItems. arrangeCellContextMenuItems reorders or filters the final list.

Reference: `context-menus-context-menu-engines`, `crud-overview`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [context-menus-context-menu-engines](../context-menus-context-menu-engines.md): Context Menus - Context Menu Engines and more
- [crud-overview](../crud-overview.md): CRUD - Overview and more
