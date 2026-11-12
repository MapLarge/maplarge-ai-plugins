# Data Table recipe - Reject invalid edits

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

### edit-cells#validation

**Reject invalid edits.** Keep edited values within limits, such as hours between 0 and 24 or a required name, rejecting anything else without custom editor code.

Apply the recipe above, then:

Merge into createDataTable({ ... }) `[options]`:

```ts
schema: dataTable.viewModel.schema.createSchema({
    entries: {
        ...assetSchemaEntries,
        lengthMeters: schema.number({ editing: { descriptor: { type: "Number", min: 0, max: 10000 } } }),
        name: schema.string({ editing: { descriptor: { type: "Text", required: true } } }),
    },
}),
columns: [
    column({ field: "lengthMeters", header: "Length (m)", editing: true }),
    column({ field: "name", header: "Name", width: toPixels(220), editing: true }),
],
```

View definition JSON for this variant's options, merged over the recipe's:

```json
{
  "columns": [
    { "field": "lengthMeters", "header": "Length (m)", "editing": true, "key": "lengthMeters" },
    { "field": "name", "header": "Name", "width": 220, "editing": true, "key": "name" }
  ]
}
```

- min and max on a Number descriptor, and required on any descriptor, are checked as the user types. While the value is invalid the input is marked red and Enter does nothing; Escape, or clicking away, cancels the edit and the old value stays. The Number descriptor checks only the range: 2.5 passes a 1 to 99 range, and there is no whole-number option.
- A value the descriptor rejects never reaches the data engine or onRowUpdate. min and max accept a blank cell, though (only required: true rejects it), and a cleared Number cell is committed as an empty string, so a total that sums the field (update-derived-values-after-edits) needs required: true on the descriptor or treats "" as 0.
- schema replaces the base's schema, so spread assetSchemaEntries and override only the entries that change. In a descriptors table put min, max and required on the field's descriptor.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [edit-cells](edit-cells.md): Edit cells, with limits on what can be entered
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
