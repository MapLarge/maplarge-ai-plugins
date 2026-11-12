# Data Table recipe - Load from a dashboard data source

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## load-from-dashboard-data-source

**Load from a dashboard data source.** Show a MapLarge table through the dashboard's data store. Rows page in from the server as the user scrolls, and filters other widgets set on the same source narrow the table.

Before createDataTable `[beforeCreate]`:

```ts
this.dataStore.register({ name: "assets", dataSource: "my_account/assets" });
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.dataStoreData<Asset>({ dataStore: this.dataStore, dataSourceName: "assets" }),
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: setup code.

- Replace my_account/assets with the table to show. The Asset type and the schema entries must match its columns.

Reference: `data-data-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
