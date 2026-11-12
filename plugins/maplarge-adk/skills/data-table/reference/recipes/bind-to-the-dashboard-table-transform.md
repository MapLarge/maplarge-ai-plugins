# Data Table recipe - Bind to the dashboard editor's table transform

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## bind-to-the-dashboard-table-transform

**Bind to the dashboard editor's table transform.** Add a table to a dashboard built in the dashboard editor. A DataTableTransform builds the table options from a dashboard data source, and the dataTable node binds to the transform by name. This is the starting point for every dashboard-editor table; merge recipes' view definition JSON into this node.

View definition JSON:

```jsonc
// the dataTable node
{
    "type": "dataTable",
    "viewName": "assetsTable",
    "height": 400,
    "bindings": { "data": "assets_assetsTable_dtvm" },
    "transformNames": ["assets_assetsTable_dtvm"]
}

// the transform it binds to, registered with the dashboard's view model
{
    "name": "assets_assetsTable_dtvm",
    "className": "DataTableTransform",
    "classModule": "data-ui/data-table/DataTableTransform",
    "options": { "dataSource": "assets", "filterIsolationKey": "assetsTable" }
}
```

- When a data source is assigned to a Data Table widget, the editor creates this transform itself, names it \<dataSource>_\<placement>_dtvm and binds the node to it. Write the transform only when building the dashboard definition directly.
- dataSource is the key of a data source on the dashboard. The transform discovers every column of that source except geometry columns (point, line and polygon), so the table shows all the others unless show-only-some-columns hides more.
- filterIsolationKey is the node's viewName, and the editor sets it for you; the transform uses it when it looks up the dashboard source. The table's own filters do not narrow its rows a second time because the table publishes them under its own provider id and ignores that id when it reads the source, while they still reach other widgets.
- The table fills its container and has no height of its own: give the node a pixel height, or in a slide's floating panel a width, height and placement rect like the other panels.

Reference: `view-definition-json`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [view-definition-json](../view-definition-json.md): View Definition JSON
