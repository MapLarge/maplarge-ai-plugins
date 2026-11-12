# Data Table recipe - Choose which columns are editable

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## choose-editable-columns

**Choose which columns are editable.** Make the whole table editable except some columns, or only columns matching a name pattern, without setting editing on each column.

Merge into createDataTable({ ... }) `[options]`:

```ts
editable: {
    rules: [
        { match: { type: "regex", pattern: "^(name|category|notes)$" } },
        { match: { type: "regex", pattern: "." }, editor: false },
    ],
},
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "editable": {
    "rules": [
      { "match": { "type": "regex", "pattern": "^(name|category|notes)$" } },
      { "match": { "type": "regex", "pattern": "." }, "editor": false }
    ]
  }
}
```

- editable on the table makes every column editable unless the column sets its own editing. Rules refine that: the first rule whose match fits a column wins, and editor: false keeps it read-only.
- So list the editable columns first and end with a catch-all rule with editor: false; without it every other column stays editable.
- A column's own editing setting always wins over the table's; editing: false keeps one column read-only.

Reference: `cell-editing-global-editable-config`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
