# Data Table recipe - Hide columns

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## hide-columns

**Hide columns.** Start a column hidden, or hide every column whose name matches a pattern.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "id", header: "ID", hide: true }),
    column({ field: "docsUrl", header: "Docs" }),
    column({ field: "photoUrl", header: "Photo" }),
],
columnRules: [
    { match: { type: "regex", pattern: "Url$" }, sideEffects: { hide: true } },
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "id", "header": "ID", "hide": true, "key": "id" },
    { "field": "docsUrl", "header": "Docs", "key": "docsUrl" },
    { "field": "photoUrl", "header": "Photo", "key": "photoUrl" }
  ],
  "columnRules": [{ "match": { "type": "regex", "pattern": "Url$" }, "sideEffects": { "hide": true } }]
}
```

- Users can still show a hidden column from the header menu or the column configurator.

Reference: `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
