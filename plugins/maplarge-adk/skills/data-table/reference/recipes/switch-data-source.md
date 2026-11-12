# Data Table recipe - Switch the data source

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## switch-data-source

**Switch the data source.** Let the user pick which data source the table shows. Picking a source rebuilds the table for it.

ViewModel members `[members]`:

```ts
public selectedSource: readonly string[] = ["assets"];
public sourceOptions = [
    { label: "North district", value: "assets" },
    { label: "South district", value: "southAssets" },
];

public readonly switchSource = (): void => {
    const { options, store } = createDataTable<Asset>({
        data: dataTable.viewModel.data.dataStoreData<Asset>({ dataStore: this.dataStore, dataSourceName: this.selectedSource[0] }),
        schema: assetSchema,
        columns: [
            column({ field: "name", header: "Name", width: toPixels(220) }),
            column({ field: "category", header: "Category", width: toPixels(120) }),
        ],
    });
    this.dataTableOptions = options;
    this.store = store;
    this.update();
};
```

Before createDataTable `[beforeCreate]`:

```ts
this.dataStore.register({ name: "assets", dataSource: "my_account/assets" });
this.dataStore.register({ name: "southAssets", dataSource: "my_account/south_assets" });
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.dataStoreData<Asset>({ dataStore: this.dataStore, dataSourceName: "assets" }),
```

Above the table (view) `[viewBefore]`:

```ts
s.quickSelect({
    labelProperty: "label",
    valueProperty: "value",
    clearable: false,
    enableFiltering: false,
    bindings: { items: "sourceOptions", value: "selectedSource" },
    events: [{ event: "change", handler: "switchSource" }],
});
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; setup code; view nodes.

Reference: `data-data-engines`, `descriptors`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
- [descriptors](../descriptors.md): Descriptors
