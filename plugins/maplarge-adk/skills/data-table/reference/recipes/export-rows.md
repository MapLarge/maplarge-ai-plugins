# Data Table recipe - Export rows, all or checked

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## export-rows

**Export rows, all or checked.** Let users download the table's data from the footer's Export, or (the variant) from an Export button above the table that exports the checked rows with a label counting them.

Merge into createDataTable({ ... }) `[options]`:

```ts
footer: dataTable.viewModel.footer.footerToolbar({ showExport: true }),
onExport: () => {
    const header = "id,name,category,status";
    const lines = assets.map((asset) => [asset.id, asset.name, asset.category, asset.status].join(","));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }));
    link.download = "assets.csv";
    link.click();
},
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "footer": { "strategy": "footerToolbar", "args": { "showExport": true } } }
```

Code only, not in the JSON form: onExport.

- Tables on a MapLarge source open the standard MapLarge export dialog without onExport; onExport replaces it, for example for rows held in code.
- For an Export button above the table, or one that exports only the checked rows, see the checked-with-a-button variant below.

Reference: `status-bar-status-bar`

Variants, each in its own file with this recipe: `export-rows#checked-with-a-button` (Export checked rows with a button).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [status-bar-status-bar](../status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
- [export-rows#checked-with-a-button](export-rows--checked-with-a-button.md): Export checked rows with a button
