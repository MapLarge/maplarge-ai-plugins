# Data Table recipe - Build a custom cell editor

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## build-a-custom-editor

**Build a custom cell editor.** Edit a value with your own editor UI, such as a row of buttons.

Module scope `[module]`:

```ts
const categoryEditor = dataTable.viewModel.editing.templatedCellEditor({
    optimisticUpdate: true,
    onBlur: "cancel",
    contentTemplates: dataTable.viewModel.editing.cellEditorContent(({ s, bindingPaths }) => {
        s.div({ flex: { dFlex: true, gap: 1 } }).contentTemplates((choices) => {
            for (const category of ["Pump", "Valve", "Hydrant", "Pipe"]) {
                choices.button({
                    kind: "secondary",
                    size: "small",
                    events: [{ event: "click", handler: bindingPaths.handlers.commitEditWithValue, param: category }],
                }).contentTemplates((button) => { button.span({ text: category }); });
            }
        });
    }),
});
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "category", header: "Category", editing: { triggers: { dblclick: { editor: categoryEditor } } } }),
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code; columns[0] (its editing.triggers.dblclick.editor is code).

- templatedCellEditor draws the editor with view nodes and commits with bindingPaths.handlers.commitEditWithValue; it needs no class. Reach for it before writing a CellEditor class.
- To limit a number or require a value, use edit-cells#validation instead of a custom editor. To change a value with a single click and no editor, use add-action-buttons#click-to-set.
- A CellEditor class (cell-editing docs) must not delete the cell's content: move the cell's child nodes into a DocumentFragment in startEdit and put them back with cellElement.replaceChildren(fragment) in endEdit and cancelEdit. The table does not redraw a cell after a cancelled edit, so a cleared cell stays blank.
- Keep the editor and its helper functions unexported in view-model.ts.

Reference: `cell-editing-global-editable-config`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
