# Data Table recipe - Let users configure columns

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## let-users-configure-columns

**Let users configure columns.** Let users rename, show, hide, reorder and reformat columns themselves, with columns grouped in the picker.

Merge into createDataTable({ ... }) `[options]`:

```ts
configurator: { enabled: true, engine: dataTable.viewModel.configurator.contextMenuConfigurator() },
columns: [
    column({ field: "cost", header: "Cost", group: "Finance" }),
    column({ field: "utilization", header: "Utilization", group: "Operations" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "configurator": { "enabled": true, "engine": { "strategy": "contextMenuConfigurator" } },
  "columns": [
    { "field": "cost", "header": "Cost", "group": "Finance", "key": "cost" },
    { "field": "utilization", "header": "Utilization", "group": "Operations", "key": "utilization" }
  ]
}
```

- The configurator is on by default with this engine (Configure Columns in the status bar menu); configurator is written out here to show where to change it, and group is what this recipe adds.
- The header menu also has Hide Column and Show All Columns, and users can drag column edges to resize.

Reference: `configurator-built-in-menu-items`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [configurator-built-in-menu-items](../configurator-built-in-menu-items.md): Configurator - Built-in Menu Items and more
