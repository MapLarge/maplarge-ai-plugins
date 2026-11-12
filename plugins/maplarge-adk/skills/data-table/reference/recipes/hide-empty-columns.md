# Data Table recipe - Hide empty columns

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## hide-empty-columns

**Hide empty columns.** Hide columns that hold no data, and show them again.

ViewModel members `[members]`:

```ts
public readonly hideEmptyColumns = (): void => {
    this.store?.dispatch(actions.hideEmptyColumns());
};

public readonly showEmptyColumns = (): void => {
    this.store?.dispatch(actions.showEmptyColumns());
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
emptyColumns: { engine: dataTable.viewModel.emptyColumns.dataEngineEmptyColumns(), watch: true },
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "hideEmptyColumns" }] })
    .contentTemplates((button) => { button.span({ text: "Hide empty columns" }); });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "emptyColumns": { "engine": { "strategy": "dataEngineEmptyColumns" }, "watch": true } }
```

Code only, not in the JSON form: ViewModel members; view nodes.

- The footer toolbar can show a Hide Empty Columns checkbox instead; see add-a-footer-toolbar.

Reference: `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
