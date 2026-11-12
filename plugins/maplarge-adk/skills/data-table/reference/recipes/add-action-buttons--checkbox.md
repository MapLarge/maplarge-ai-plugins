# Data Table recipe - Toggle a checkbox in a cell

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

### add-action-buttons#checkbox

**Toggle a checkbox in a cell.** Show a true/false field as a checkbox that changes with one click in its cell, such as Done or Paid, with a count of checked rows under the table and the unchecked rows greyed and struck through.

Apply the recipe above, then:

ViewModel members `[members]`:

```ts
public inServiceCount = "";
private readonly toggledAssets = new Map(assets.map((asset) => [asset.id, asset]));

private updateInServiceCount(): void {
    const rows = [...this.toggledAssets.values()];
    this.inServiceCount = String(rows.filter((asset) => asset.inService).length) + " of " + String(rows.length) + " in service";
}

public readonly toggleInService = (ctx: RowActionContext): void => {
    const row = { ...ctx.row, inService: !ctx.row.inService };
    this.toggledAssets.set(row.id, row);
    this.updateInServiceCount();
    this.update();
    void this.store?.mutations.update({ rowIndex: ctx.globalRowIndex, row, fields: ["inService"] }).run();
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({
        field: "inService",
        header: "In service",
        width: toPixels(100),
        transformValue: ({ value }) => ({ checked: value === true }),
        scope: { toggle: (ctx: unknown) => this.toggleInService(ctx as RowActionContext) },
        contentTemplates: ({ s, bindingPaths }: CellContext<Asset, "inService", unknown, { toggle: ViewDefinitionBinding }>) => {
            s.checkbox({ bindings: { checked: bindingPaths.displayValue + ".checked" }, events: [{ event: "click", handler: bindingPaths.scope.toggle }] });
        },
    }),
],
theme: {
    cellThemes: [
        { callback: ({ row }) => (row.inService === false ? { customTextColor: "#6c757d", customCssClasses: "text-decoration-line-through" } : undefined) },
    ],
},
```

After createDataTable `[afterCreate]`:

```ts
this.updateInServiceCount();
```

Below the table (view) `[viewAfter]`:

```ts
s.div({ margin: { top: 2 }, fontWeight: "semibold", bindings: { text: "inServiceCount" } });
```

- One click on the box calls the scope function with the clicked row (ctx.row) and its position (ctx.globalRowIndex); the mutation saves the flipped value, so the box, the grey and the line follow, and the change survives sorting. edit-cells on a boolean column instead shows true or false and needs a double-click editor.
- store.mutations.update does not call onRowUpdate, so toggleInService keeps its own copy of the rows (toggledAssets), works the count out again and calls this.update(). A count kept in onRowUpdate, or set without this.update(), never changes on a click.
- The cellThemes entry has no matchColumns, so it styles every cell of an out-of-service row: grey text and a line through it. A row theme cannot draw the line (see color-rows-and-cells).
- A Reset button that unchecks everything runs one store.mutations.update per checked row, with rowIndex from the table (store.getRow(rowIndex) for rowIndex 0 up to the row count you keep), never the index in your own array, which differs once the table is sorted.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [add-action-buttons](add-action-buttons.md): Act on a row from its cell: a button, clickable stars, a checkbox
- [cell-templates](../cell-templates.md): Cell Templates
