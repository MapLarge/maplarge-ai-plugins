# Data Table recipe - Choose and order columns

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## choose-columns

**Choose and order columns.** Pick which fields a table with a static schema shows, and in what order.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "status", header: "Status" }),
    column({ field: "cost", header: "Cost" }),
],
columnOrder: ["status", "name", "category", "cost"],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "status", "header": "Status", "key": "status" },
    { "field": "cost", "header": "Cost", "key": "cost" }
  ],
  "columnOrder": ["status", "name", "category", "cost"]
}
```

- With a static schema the table shows exactly the listed columns, in list order; columnOrder then moves the keys it names to the front and leaves the rest in place.
- The schema may hold fields that have no column; only listed columns show. A column's field must match the source's field name exactly, including case.
- A source whose columns are discovered (a discoverable schema, or any dashboard-editor table) also shows every column you did not list; use show-only-some-columns there.

Reference: `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
