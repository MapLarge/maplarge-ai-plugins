# Data Table recipe - Style the table

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## style-the-table

**Style the table.** Change the overall look: striping, header and cell styling, and CSS classes on a column.

Merge into createDataTable({ ... }) `[options]`:

```ts
rowStriping: true,
theme: {
    header: { background: "dark" },
    headerCell: { customTextColor: "#fff", fontWeight: "bold" },
    cell: { fontSize: "small" },
},
columns: [
    column({ field: "name", customCssClasses: "fw-semibold" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "rowStriping": true,
  "theme": {
    "header": { "background": "dark" },
    "headerCell": { "customTextColor": "#fff", "fontWeight": "bold" },
    "cell": { "fontSize": "small" }
  },
  "columns": [{ "field": "name", "customCssClasses": "fw-semibold", "key": "name" }]
}
```

Reference: `theme-theme-options`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [theme-theme-options](../theme-theme-options.md): Theme - Theme Options and more
