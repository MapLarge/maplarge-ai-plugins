# Data Table recipe - Show only some columns of a discovered source

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## show-only-some-columns

**Show only some columns of a discovered source.** Show only the columns you list when the table discovers its columns from the source, as every dashboard-editor table does.

Merge into createDataTable({ ... }) `[options]`:

```ts
discoveredColumnRules: [
    { match: { type: "regex", pattern: "." }, sideEffects: { hide: true } },
],
columns: [
    column({ field: "name", header: "Name", hide: false }),
    column({ field: "category", header: "Category", hide: false }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "discoveredColumnRules": [{ "match": { "type": "regex", "pattern": "." }, "sideEffects": { "hide": true } }],
  "columns": [
    { "field": "name", "header": "Name", "hide": false, "key": "name" },
    { "field": "category", "header": "Category", "hide": false, "key": "category" }
  ]
}
```

- The rule hides every discovered column, listed ones included; a listed column's own hide: false wins over the rule, so only the listed columns show.
- Hidden columns are hidden, not removed: users can still show them from the header menu or the column configurator.

Reference: `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
