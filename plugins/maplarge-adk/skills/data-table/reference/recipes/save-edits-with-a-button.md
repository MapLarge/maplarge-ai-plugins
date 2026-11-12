# Data Table recipe - Save changes with a button

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## save-edits-with-a-button

**Save changes with a button.** Let users edit rows freely, then save every change at once with a Save button.

ViewModel members `[members]`:

```ts
private readonly changedAssets = new Map<number, Asset>();

public readonly saveChanges = async (): Promise<void> => {
    this.store?.commitCurrentEdit();
    const changed = [...this.changedAssets.values()];
    this.changedAssets.clear();
    await fetch("/api/assets", { method: "PATCH", body: JSON.stringify(changed) });
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
editable: true,
onRowUpdate: async ({ row }) => {
    this.changedAssets.set(row.id, row);
},
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "primary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "saveChanges" }] })
    .contentTemplates((button) => { button.span({ text: "Save" }); });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "editable": true }
```

Code only, not in the JSON form: ViewModel members; view nodes; onRowUpdate.

- Each committed edit is written into the row objects passed to arrayData (found by the base's getRowId), and onRowUpdate records the row; Save sends the recorded rows and clears them. A click on Save already commits an edit still open in a cell (the click takes focus from the editor); commitCurrentEdit() is only a backstop, since it starts the commit and onRowUpdate runs after it returns.
- Record changes as they happen, as onRowUpdate does here. Never find them by comparing with the rows passed to arrayData: the edit is written into those same objects, so a "before" copy that holds them changes too and no edit is ever seen.
- editable: true makes every column editable; give a column editing: false to keep it read-only, such as an id.
- On a MapLarge source the data engine writes each edit as it is committed; pass editable: false to dataStoreData or dataSourceData to keep it from writing, and save the recorded rows yourself.
- Added and deleted rows are saved through the data engine at once. When Save must send them too, use save-added-changed-and-deleted-rows instead; onRowCreate and onRowDelete are never called.

Reference: `cell-editing-global-editable-config`, `crud-overview`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [crud-overview](../crud-overview.md): CRUD - Overview and more
