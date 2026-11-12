# Data Table recipe - Keyboard navigation and copy

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## keyboard-and-copy

**Keyboard navigation and copy.** Let users move between cells with the arrow keys and copy a cell's text.

Merge into createDataTable({ ... }) `[options]`:

```ts
tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "cell" }),
cellContextMenu: dataTable.viewModel.contextMenu.cellContextMenuEngine(),
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "tableSelection": { "strategy": "cell" },
  "cellContextMenu": { "strategy": "cellContextMenuEngine" }
}
```

- With cell selection the arrow keys move the selected cell. Right-clicking a cell offers Copy, which copies its displayed text.

Reference: `cell-selection-selection-engines`, `context-menus-context-menu-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-selection-selection-engines](../cell-selection-selection-engines.md): Selection - Selection Engines and more
- [context-menus-context-menu-engines](../context-menus-context-menu-engines.md): Context Menus - Context Menu Engines and more
