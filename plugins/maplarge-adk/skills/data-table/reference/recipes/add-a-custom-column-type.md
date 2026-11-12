# Data Table recipe - Add a custom column type

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## add-a-custom-column-type

**Add a custom column type.** Give a kind of value its own column type, with its own default alignment, formatter and filter input.

Imports `[imports]`:

```ts
import { defaultRenderInput } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
const moneyColumnType = dataTable.viewModel.columnTypes.defineColumnType({
    name: "money",
    renderInput: defaultRenderInput("number"),
    defaultFilterOperators: ["Equal", "Greater", "GreaterOR", "Less", "LessOR", "Between", "IsNull", "IsNotNull"],
    descriptor: () => ({ type: "Number" }),
    defaultAlign: "right",
    defaultFormatter: "currency",
});
```

Merge into createDataTable({ ... }) `[options]`:

```ts
schema: dataTable.viewModel.schema.createSchema({
    entries: { ...assetSchemaEntries, cost: moneyColumnType() },
}),
columns: [
    column({ field: "cost", header: "Cost" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "columns": [{ "field": "cost", "header": "Cost", "key": "cost" }] }
```

Code only, not in the JSON form: module code. In view definition JSON the table transform's schema has no entries, so whatever this recipe sets on schema entries (an editor, limits, units) is not in the JSON form; give the node its own schema with those entries (a schema on the node replaces the transform's, so keep it discoverable), put units on the column as formatterArgs.unitInfo, or build the table in code.

Reference: `schema-schema-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [schema-schema-types](../schema-schema-types.md): Schema - Schema Types and more
