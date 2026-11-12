# Data Table recipe - Send edits to your own service

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## save-edits

**Send edits to your own service.** Send each edited row to your own service as the user commits the edit.

Module scope `[module]`:

```ts
async function saveAsset(row: Asset, changedFields: readonly (keyof Asset)[]): Promise<void> {
    await fetch("/api/assets/" + String(row.id), { method: "PATCH", body: JSON.stringify({ row, changedFields }) });
}
```

Merge into createDataTable({ ... }) `[options]`:

```ts
onRowUpdate: async ({ row, changedFields }) => {
    await saveAsset(row, changedFields);
},
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code; onRowUpdate.

- onRowUpdate runs after the data engine has saved the edit. If it throws, the engine's change is undone and the edit fails.
- To replace the MapLarge save itself, give dataStoreData or dataSourceData your own updateRow, createRow and removeRow, and removeRows if rows are deleted with store.mutations.removeBulk (without it a keyed MapLarge table still deletes through MapLarge). editable: false on the engine writes nothing to the MapLarge table, but then removeBulk throws because the engine has no removeRows.
- onRowCreate and onRowDelete are accepted but never called. Inserts and deletes save through the engine's createRow and removeRow, or a mutation's .run({ persist: async () => { ... } }).
- An editor built with descriptorCellEditor({ optimisticUpdate: true }) shows an edit before the save finishes; without it the cell waits for the save.

Reference: `cell-editing-global-editable-config`, `crud-overview`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [crud-overview](../crud-overview.md): CRUD - Overview and more
