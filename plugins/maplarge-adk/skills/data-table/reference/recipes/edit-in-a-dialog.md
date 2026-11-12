# Data Table recipe - Edit in a dialog

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## edit-in-a-dialog

**Edit in a dialog.** Edit a long value in a dialog instead of inside the cell.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({
        field: "notes",
        header: "Notes",
        width: toPixels(300),
        editing: { triggers: { dblclick: { editor: dataTable.viewModel.editing.dialogCellEditor() } } },
    }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    {
      "field": "notes",
      "header": "Notes",
      "width": 300,
      "editing": { "triggers": { "dblclick": { "editor": { "kind": "dialog" } } } },
      "key": "notes"
    }
  ]
}
```

- The dialog shows the control of the column's descriptor: a one-line text box for a plain string. For a long text give the schema entry a multi-line box, notes: schema.string({ editing: { descriptor: { type: "TextArea" } } }), and size the dialog with dialogCellEditor({ dialogOptions: { width: 520, height: 340 } }).
- To show only a long note's first line in the cell, add transformValue: ({ value }) => String(value ?? "").split(/\r?\n/)\[0] ?? ""; sorting and the dialog keep the whole note.
- Known product issue: the dialog's box opens empty instead of on the cell's current value; OK saves what is typed. Say so in the analysis rather than working around it.

Reference: `cell-editing-global-editable-config`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
