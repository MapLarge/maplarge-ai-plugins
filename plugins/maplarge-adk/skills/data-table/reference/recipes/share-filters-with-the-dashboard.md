# Data Table recipe - Share filters with the dashboard

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## share-filters-with-the-dashboard

**Share filters with the dashboard.** Decide whether the table follows filters other widgets set, and whether its own filters reach them.

Before createDataTable `[beforeCreate]`:

```ts
this.dataStore.register({ name: "assets", dataSource: "my_account/assets" });
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.dataStoreData<Asset>({
    dataStore: this.dataStore,
    dataSourceName: "assets",
    publishFilters: true,
    respectExternalFilters: true,
}),
filtering: dataTable.viewModel.filtering.dialogFiltering(),
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "filtering": { "strategy": "dialogFiltering" } }
```

Code only, not in the JSON form: setup code. In view definition JSON the table transform supplies the rows, always publishing the table's filters and following other widgets' filters, so the data options above have no JSON form there; to set them, give the node its own data, { "strategy": "dataStoreData", "args": { "dataStore": { "binding": "dataStore" }, "dataSourceName": "\<source>" } } with the options in args.

- publishFilters: false keeps the table's filters to itself. respectExternalFilters: false makes it ignore other widgets' filters.
- Both default to true, so a data store table joins dashboard filtering without any options.

Reference: `data-data-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
