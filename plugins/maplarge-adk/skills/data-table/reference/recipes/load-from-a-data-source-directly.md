# Data Table recipe - Load from a data source directly

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## load-from-a-data-source-directly

**Load from a data source directly.** Show a MapLarge table without registering it on the dashboard data store, so dashboard filters do not apply to it.

Before createDataTable `[beforeCreate]`:

```ts
const dataSource = await ml.data.dataSource.fromTableAsync("my_account/assets");
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.dataSourceData<Asset>({ dataSource }),
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: setup code.

- ml is a global in dashboard and sandbox code, typed by the platform; do not import or declare it.
- Replace my_account/assets with the table to show. The row type's fields and the schema entries must match its column names exactly, including case.
- A map layer or filter widget cannot share this source; use load-from-dashboard-data-source when one should.

Reference: `data-data-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
