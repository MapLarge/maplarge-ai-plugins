# Data Table recipe - Set a value by clicking in the cell

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

### add-action-buttons#click-to-set

**Set a value by clicking in the cell.** Change a value with one click on something drawn in the cell, such as rating stars or a row of choices, without opening an editor.

Apply the recipe above, then:

Module scope `[module]`:

```ts
const ratingStars = [1, 2, 3, 4, 5];
```

ViewModel members `[members]`:

```ts
public averageRating = "";
private readonly ratedAssets = new Map(assets.map((asset) => [asset.id, asset]));

private updateAverageRating(): void {
    const ratings = [...this.ratedAssets.values()].map((asset) => asset.rating);
    this.averageRating = "Average rating: " + (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
}

public readonly setRating = (ctx: RowActionContext, rating: number): void => {
    const row = { ...ctx.row, rating };
    this.ratedAssets.set(row.id, row);
    this.updateAverageRating();
    this.update();
    void this.store?.mutations.update({ rowIndex: ctx.globalRowIndex, row, fields: ["rating"] }).run();
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({
        field: "rating",
        header: "Rating",
        width: toPixels(150),
        transformValue: ({ value }) => Object.fromEntries(ratingStars.flatMap((star) => [["on" + String(star), Number(value) >= star], ["off" + String(star), !(Number(value) >= star)]])),
        scope: Object.fromEntries(ratingStars.map((star) => ["rate" + String(star), (ctx: unknown) => this.setRating(ctx as RowActionContext, star)])),
        contentTemplates: ({ s, bindingPaths }: CellContext<Asset, "rating", unknown, Record<string, ViewDefinitionBinding>>) => {
            s.div({ flex: { dFlex: true } }).contentTemplates((stars) => {
                for (const star of ratingStars) {
                    stars.button({
                        kind: "link",
                        size: "small",
                        padding: { around: 0 },
                        margin: { right: 1 },
                        textDecoration: "none",
                        events: [{ event: "click", handler: bindingPaths.scope["rate" + String(star)] }],
                        bindings: {
                            css: {
                                classes: {
                                    "text-warning": bindingPaths.displayValue + ".on" + String(star),
                                    "text-black-50": bindingPaths.displayValue + ".off" + String(star),
                                },
                            },
                        },
                    }).contentTemplates((button) => { button.span({ text: "\u{2605}", fontSize: 5 }); });
                }
            });
        },
    }),
],
```

After createDataTable `[afterCreate]`:

```ts
this.updateAverageRating();
```

Below the table (view) `[viewAfter]`:

```ts
s.div({ margin: { top: 2 }, fontWeight: "semibold", bindings: { text: "averageRating" } });
```

- Each star calls its own scope function, which receives the clicked row (ctx.row) and its position (ctx.globalRowIndex). Sorting still uses the stored number.
- transformValue hands the template a true/false flag per star and state (on3, off3), because a binding path cannot compare the rating with a number. One flag per star also works with css: { property: path, trueClasses: ["text-warning"], falseClasses: ["text-black-50"] }.
- "\u{2605}" is a JavaScript escape: the file holds plain ASCII characters and the browser shows a star. Keep the braces: a file tool can turn the four-digit form "\u2605" into the star itself. A row of choices (Low, Medium, High) works the same way with buttons.
- For stars that only show the rating, keep the template and use spans instead of buttons, with no events and no scope.
- store.mutations.update does not call onRowUpdate, so setRating keeps its own copy of the rows (ratedAssets) and recomputes the average there. An average kept in onRowUpdate never changes on a click.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [add-action-buttons](add-action-buttons.md): Act on a row from its cell: a button, clickable stars, a checkbox
- [cell-templates](../cell-templates.md): Cell Templates
