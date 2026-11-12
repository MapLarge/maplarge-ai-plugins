# Data Table recipe - Act on a row from its cell: a button, clickable stars, a checkbox

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## add-action-buttons

**Act on a row from its cell: a button, clickable stars, a checkbox.** Put a button in every row, such as Retire, Open or Delete, that runs a ViewModel method for that row; the variants set a value with one click on stars or a row of choices, or toggle a yes/no field with a checkbox in its cell.

Imports `[imports]`:

```ts
import type { CellContext, ViewDefinitionBinding } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
type RowActionContext = { readonly row: Asset; readonly globalRowIndex: number };
```

ViewModel members `[members]`:

```ts
public readonly retire = (ctx: RowActionContext): void => {
    void this.store?.mutations.update({
        rowIndex: ctx.globalRowIndex,
        row: { ...ctx.row, status: "retired" },
        fields: ["status"],
    }).run();
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    virtualColumn({
        key: "actions",
        header: "",
        width: toPixels(100),
        transformValue: ({ row }) => ({ canRetire: row.status !== undefined && row.status !== "retired" }),
        scope: { retire: (ctx: unknown) => this.retire(ctx as RowActionContext) },
        contentTemplates: ({ s, bindingPaths }: CellContext<Asset, undefined, unknown, { retire: ViewDefinitionBinding }>) => {
            s.button({ kind: "secondary", size: "small", bindings: { visible: bindingPaths.displayValue + ".canRetire" }, events: [{ event: "click", handler: bindingPaths.scope.retire }] })
                .contentTemplates((button) => { button.span({ text: "Retire" }); });
        },
    }),
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code; ViewModel members; columns[0] (its transformValue and scope.retire and contentTemplates are code).

- scope gives the cell template functions it can call by path; each receives the row, rowIndex and globalRowIndex.
- contentTemplates builds one template that every row shares, so it gets no row and cannot branch on one. A per-row choice, such as no Retire button on retired rows, is a true/false flag from transformValue bound with visible (or css.classes for a style). visible takes the flag's path only; a leading ! or a display binding does nothing.
- Every variant is the same shape: transformValue decides what the cell shows for this row, scope names the function a click calls, and that function changes the row with store.mutations.update, which saves through the data engine and repaints the row so the change survives sorting.

Reference: `cell-templates`

Variants, each in its own file with this recipe: `add-action-buttons#click-to-set` (Set a value by clicking in the cell), `add-action-buttons#checkbox` (Toggle a checkbox in a cell).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [cell-templates](../cell-templates.md): Cell Templates
- [add-action-buttons#click-to-set](add-action-buttons--click-to-set.md): Set a value by clicking in the cell
- [add-action-buttons#checkbox](add-action-buttons--checkbox.md): Toggle a checkbox in a cell
