# Data Table recipe - Change text case

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## change-text-case

**Change text case.** Show text in upper, lower, title or camel case without changing the data.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "status", header: "Status", formatter: "titleCase" }),
    column({ field: "category", formatter: "uppercase" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "status", "header": "Status", "formatter": "titleCase", "key": "status" },
    { "field": "category", "formatter": "uppercase", "key": "category" }
  ]
}
```

- Built-in text formatters: uppercase, lowercase, titleCase, camelCase.

Reference: `cells-and-content`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cells-and-content](../cells-and-content.md): Cell Values
