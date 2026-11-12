# Data Table recipe - Edit cells, with limits on what can be entered

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## edit-cells

**Edit cells, with limits on what can be entered.** Let users edit chosen columns in place, opening the editor by double-click or the right-click menu (and Enter on a selected cell when the table has a selection engine); the variant rejects values outside a range or a missing required value through the schema entry's descriptor.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "notes", header: "Notes", width: toPixels(300), editing: true }),
    column({ field: "cost", header: "Cost", editing: true }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "notes", "header": "Notes", "width": 300, "editing": true, "key": "notes" },
    { "field": "cost", "header": "Cost", "editing": true, "key": "cost" }
  ]
}
```

- editing: true on a column makes that column editable with the editor for its schema type: text, number, date or checkbox. Other columns stay read-only.
- To make every column editable instead, set editable: true on the table; any column without its own editing setting becomes editable. See choose-editable-columns to keep some read-only.
- Edits save through the data engine; a MapLarge table needs no primary key, since rows are matched by the primary key when there is one and by the MapLarge row id otherwise. See save-edits to save elsewhere.
- The editor opens on the stored value and commits what the user typed: a rate stored as 0.075 is edited as 0.075 even when a percent formatter shows 7.5%. The exception is a column with units (unitInfo): it opens on the number the cell shows, in the display unit, and converts the typed number back to the stored unit on commit, so its descriptor's min and max are in the display unit.
- Double-click and Edit in the right-click menu open the editor. Enter opens it only on a selected cell, so for Enter also add tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "cell" }) (keyboard-and-copy).

Reference: `cell-editing-global-editable-config`

Variants, each in its own file with this recipe: `edit-cells#validation` (Reject invalid edits).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [edit-cells#validation](edit-cells--validation.md): Reject invalid edits
