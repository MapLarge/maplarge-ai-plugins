# Data Table recipe - Save added, changed and deleted rows with one button

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## save-added-changed-and-deleted-rows

**Save added, changed and deleted rows with one button.** Let users add, edit and delete rows, then send everything added, changed and deleted since the last save with a Save button.

Imports `[imports]`:

```ts
import type { CellContext, ViewDefinitionBinding } from "data-ui/data-table";
```

ViewModel members `[members]`:

```ts
private readonly addedAssets = new Map<number, Asset>();
private readonly changedAssets = new Map<number, Asset>();
private readonly deletedAssets = new Map<number, Asset>();

public readonly addAsset = async (): Promise<void> => {
    const row: Asset = { id: Date.now(), name: "New asset", category: "Pump", status: "active", cost: 0, utilization: 0, rating: 0, lastInspected: new Date().toISOString(), inService: true, location: "", lengthMeters: 0, notes: "", docsUrl: "", photoUrl: "", trend: [], tags: [] };
    this.addedAssets.set(row.id, row);
    await this.store?.mutations.insert({ row }).run();
};

public readonly deleteRow = async (ctx: { readonly globalRowIndex: number }): Promise<void> => {
    const row = this.store?.getRow(ctx.globalRowIndex);
    if (row !== undefined) {
        this.changedAssets.delete(row.id);
        if (!this.addedAssets.delete(row.id)) this.deletedAssets.set(row.id, row);
    }
    await this.store?.mutations.remove({ rowIndex: ctx.globalRowIndex }).run();
};

public readonly deleteChecked = async (): Promise<void> => {
    const store = this.store;
    if (!store) return;
    const indices = [...store.getCheckboxRowsSelectedIndices()];
    for (const rowIndex of indices) {
        const row = store.getRow(rowIndex);
        if (row === undefined) continue;
        this.changedAssets.delete(row.id);
        if (!this.addedAssets.delete(row.id)) this.deletedAssets.set(row.id, row);
    }
    await store.mutations.removeBulk(indices.map((rowIndex) => ({ rowIndex }))).run();
    store.checkboxRowsUnselectAll();
};

public readonly saveChanges = async (): Promise<void> => {
    this.store?.commitCurrentEdit();
    const changes = {
        added: [...this.addedAssets.values()],
        changed: [...this.changedAssets.values()],
        deleted: [...this.deletedAssets.values()],
    };
    this.addedAssets.clear();
    this.changedAssets.clear();
    this.deletedAssets.clear();
    await fetch("/api/assets/changes", { method: "POST", body: JSON.stringify(changes) });
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
editable: true,
checkboxRows: { showSelectAll: true },
columns: [
    virtualColumn({
        key: "delete",
        header: "",
        width: toPixels(90),
        scope: { deleteRow: (ctx: unknown) => this.deleteRow(ctx as { readonly globalRowIndex: number }) },
        contentTemplates: ({ s, bindingPaths }: CellContext<Asset, undefined, unknown, { deleteRow: ViewDefinitionBinding }>) => {
            s.button({ kind: "danger", size: "small", events: [{ event: "click", handler: bindingPaths.scope.deleteRow }] })
                .contentTemplates((button) => { button.span({ text: "Delete" }); });
        },
    }),
],
onRowUpdate: async ({ row }) => {
    if (this.addedAssets.has(row.id)) this.addedAssets.set(row.id, row);
    else this.changedAssets.set(row.id, row);
},
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "primary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "addAsset" }] })
    .contentTemplates((button) => { button.span({ text: "Add asset" }); });
s.button({ kind: "danger", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "deleteChecked" }] })
    .contentTemplates((button) => { button.span({ text: "Delete checked" }); });
s.button({ kind: "primary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "saveChanges" }] })
    .contentTemplates((button) => { button.span({ text: "Save" }); });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "editable": true, "checkboxRows": { "showSelectAll": true } }
```

Code only, not in the JSON form: ViewModel members; view nodes; columns[0] (its scope.deleteRow and contentTemplates are code); onRowUpdate.

- Two ways to delete: the Delete button in a row removes that row, and Delete checked removes the rows users checked. Keep the one the request describes ("delete the ones they select" is Delete checked) and drop the other.
- Each list is kept as things happen: addAsset records the new row, onRowUpdate records each committed edit (an edit to a row added since the last save stays in added), and deleteRow and deleteChecked record the removed rows (a row added since the last save just drops out). Save sends the three lists and clears them, so the next Save sends only what happened after it. A click on Save already commits an edit still open in a cell; commitCurrentEdit() is only a backstop, since it starts the commit and onRowUpdate runs after it returns.
- Never find the changes by comparing with the rows passed to arrayData: each committed edit is written into those same row objects, so a "before" copy that holds them changes too and no edit is ever seen.
- This recipe combines add-rows, delete-rows, act-on-checked-rows' delete and save-edits-with-a-button; use it instead of them. onRowCreate and onRowDelete are never called.

Reference: `cell-editing-global-editable-config`, `crud-overview`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [crud-overview](../crud-overview.md): CRUD - Overview and more
