# Data Table recipe - Edit with a dropdown

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## edit-with-a-dropdown

**Edit with a dropdown.** Let users pick a cell's value from a list, in an ordinary table of columns.

Merge into createDataTable({ ... }) `[options]`:

```ts
schema: dataTable.viewModel.schema.createSchema({
    entries: {
        ...assetSchemaEntries,
        status: schema.string({
            editing: {
                descriptor: {
                    type: "Select",
                    options: [
                        { value: "active", label: "Active" },
                        { value: "maintenance", label: "In Maintenance" },
                        { value: "retired", label: "Retired" },
                    ],
                    clearable: false,
                },
            },
        }),
    },
}),
columns: [
    column({ field: "status", header: "Status", editing: true }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "columns": [{ "field": "status", "header": "Status", "editing": true, "key": "status" }] }
```

In view definition JSON the table transform's schema has no entries, so whatever this recipe sets on schema entries (an editor, limits, units) is not in the JSON form; give the node its own schema with those entries (a schema on the node replaces the transform's, so keep it discoverable), put units on the column as formatterArgs.unitInfo, or build the table in code.

- schema replaces the base's schema, so spread assetSchemaEntries and override only the entry that changes. The entry's editing.descriptor sets the editor for that field; editing: true on the column turns editing on for that column only.
- MultiSelect works the same way for fields that hold several values. In a descriptors table (define-columns-with-descriptors), put type: "Select" and the options on the field's descriptor instead.

Reference: `schema-schema-types`, `cell-editing-global-editable-config`, `descriptors`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [schema-schema-types](../schema-schema-types.md): Schema - Schema Types and more
- [cell-editing-global-editable-config](../cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [descriptors](../descriptors.md): Descriptors
