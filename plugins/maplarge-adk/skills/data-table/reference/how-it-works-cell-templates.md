# Data Table - How It Works - Cell Templates

<!-- Automatically generated, do not edit -->

## Cell Templates

**A cell template sees no row.** `contentTemplates: ({ s, bindingPaths }) => ...` builds one template every row shares and binds to `bindingPaths.displayValue`, `.rawValue`, `.row + ".field"` and `.scope.<fn>`. Decide per row in transformValue (text and flags) and bind in the template; a cell that looks different per value is one wrapper div with a node per look, each with its own `visible` flag. Only a template's first root node is kept, silently, so wrap several nodes in one div. A button in a cell calls a function from the column's `scope`, which receives `{ row, rowIndex, globalRowIndex }` (`rowIndex` is the row slot); `globalRowIndex` is what `store.getRow` and `store.mutations` take.

The table mounts a cell template into its row slots, and as you scroll a slot shows one row after another, so everything that differs between rows must arrive through bindings:

```ts
contentTemplates: ({ s, bindingPaths }) => {
    // bindingPaths.displayValue   what transformValue returned for this cell
    // bindingPaths.rawValue       the stored field value
    // bindingPaths.row            the whole row: bindingPaths.row + ".name"
    // bindingPaths.scope.<name>   a function from the column's scope (an entry that is not a function is dropped)
    s.span({ bindings: { text: bindingPaths.displayValue + ".label" } });
},
```

One node per look, each shown by its own flag:

```ts
column({
    field: "status",
    header: "Status",
    transformValue: ({ value }) => ({
        label: value,
        isDone: value === "Done",
        isFailed: value === "Failed",
        isOther: value !== "Done" && value !== "Failed",
    }),
    contentTemplates: ({ s, bindingPaths }) => {
        s.div({ flex: { dFlex: true, gap: 1 } }).contentTemplates((cell) => {
            cell.span({ text: "\u{2713}", textColor: "success", fontWeight: "bold", bindings: { visible: bindingPaths.displayValue + ".isDone" } });
            cell.span({ badge: true, background: "danger", bindings: { text: bindingPaths.displayValue + ".label", visible: bindingPaths.displayValue + ".isFailed" } });
            cell.span({ bindings: { text: bindingPaths.displayValue + ".label", visible: bindingPaths.displayValue + ".isOther" } });
        });
    },
}),
```

A button in a cell:

```ts
type RowActionContext = { readonly row: Upload; readonly globalRowIndex: number };

virtualColumn({
    key: "actions",
    header: "",
    transformValue: ({ row }) => ({ canRetry: row.status === "Failed" }),
    scope: { retry: (ctx: unknown) => this.retry(ctx as RowActionContext) },
    contentTemplates: ({ s, bindingPaths }: CellContext<Upload, undefined, unknown, { retry: ViewDefinitionBinding }>) => {
        s.button({ kind: "secondary", size: "small", bindings: { visible: bindingPaths.displayValue + ".canRetry" }, events: [{ event: "click", handler: bindingPaths.scope.retry }] })
            .contentTemplates((button) => { button.span({ text: "Retry" }); });
    },
}),
```

## Related

- [how-it-works-the-pieces](how-it-works-the-pieces.md): How It Works - The Pieces and more
