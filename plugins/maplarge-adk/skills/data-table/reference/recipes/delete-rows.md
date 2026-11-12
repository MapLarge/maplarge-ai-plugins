# Data Table recipe - Delete rows with a button in each row

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## delete-rows

**Delete rows with a button in each row.** Put a Delete button in every row that removes that row, saving through the data engine.

Imports `[imports]`:

```ts
import type { CellContext, ViewDefinitionBinding } from "data-ui/data-table";
```

ViewModel members `[members]`:

```ts
public readonly deleteRow = async (ctx: { readonly globalRowIndex: number }): Promise<void> => {
    await this.store?.mutations.remove({ rowIndex: ctx.globalRowIndex }).run();
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
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
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; columns[0] (its scope.deleteRow and contentTemplates are code).

- Mutations save through the data engine and revert the row if the save fails. A data store table saves to its MapLarge table.
- No primary key is needed: rows are matched by the table's primary key when there is one and by the MapLarge row id otherwise (rowIdentity on dataStoreData overrides this).
- To delete several rows at once, use act-on-checked-rows instead. When a Save button must also send the deleted rows, use save-added-changed-and-deleted-rows instead of this recipe.

Reference: `crud-overview`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [crud-overview](../crud-overview.md): CRUD - Overview and more
