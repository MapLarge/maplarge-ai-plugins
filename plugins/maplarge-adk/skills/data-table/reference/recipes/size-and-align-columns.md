# Data Table recipe - Size and align columns

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## size-and-align-columns

**Size and align columns.** Set fixed, flexible or bounded column widths, and align cell content.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "cost", header: "Cost", width: toPixels(140), align: "right" }),
    column({ field: "notes", header: "Notes", flex: 1, minWidth: toPixels(200), maxWidth: toPixels(600) }),
    column({ field: "id", header: "ID", width: toPixels(70), resize: false, align: "center" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "cost", "header": "Cost", "width": 140, "align": "right", "key": "cost" },
    {
      "field": "notes",
      "header": "Notes",
      "flex": 1,
      "minWidth": 200,
      "maxWidth": 600,
      "key": "notes"
    },
    { "field": "id", "header": "ID", "width": 70, "resize": false, "align": "center", "key": "id" }
  ]
}
```

- width wins over flex; flex columns share the space left after fixed widths, clamped by minWidth and maxWidth.

Reference: `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
