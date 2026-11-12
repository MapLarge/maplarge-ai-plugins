# Data Table recipe - Save each user's layout

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## save-user-layouts

**Save each user's layout.** Keep each user's sort, filters, column widths, order, visibility, headers, formats and units across visits, with a way to reset.

ViewModel members `[members]`:

```ts
public readonly resetLayout = (): void => {
    this.store?.dispatch(actions.clearStorage());
    this.store?.dispatch(actions.resetGrid());
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
storage: dataTable.viewModel.storage.userPrefs({ preferenceKey: "assets-table" }),
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "resetLayout" }] })
    .contentTemplates((button) => { button.span({ text: "Reset layout" }); });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "storage": { "strategy": "userPrefs", "args": { "preferenceKey": "assets-table" } } }
```

Code only, not in the JSON form: ViewModel members; view nodes.

- userPrefs saves to the user's MapLarge preferences; localStore({ prefix }) saves in the browser instead.
- On a dashboard, preferenceKey can be left out: it defaults to the dashboard id plus the table's viewName.

Reference: `persistence`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [persistence](../persistence.md): Persistence
