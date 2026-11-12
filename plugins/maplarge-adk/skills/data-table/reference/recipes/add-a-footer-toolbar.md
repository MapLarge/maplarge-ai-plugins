# Data Table recipe - Add a footer toolbar

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## add-a-footer-toolbar

**Add a footer toolbar.** Put table controls under the table: hide empty columns, sync with the map, export.

Merge into createDataTable({ ... }) `[options]`:

```ts
footer: dataTable.viewModel.footer.footerToolbar({ showHideEmptyColumns: true, showExport: true }),
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "footer": { "strategy": "footerToolbar", "args": { "showHideEmptyColumns": true, "showExport": true } }
}
```

- footerTemplate replaces the toolbar with your own footer content.

Reference: `status-bar-status-bar`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [status-bar-status-bar](../status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
