# Data Table recipe - Show every column automatically

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## show-all-columns-automatically

**Show every column automatically.** Show whatever columns the source has without listing them, hide system columns by name, and apply settings to every discovered column.

Imports `[imports]`:

```ts
import { applyRule, excludeRule } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
const discoveredAssetSchema = dataTable.viewModel.schema.createDiscoverableSchema({
    entries: {},
    discoveryRules: [
        excludeRule({ type: "regex", pattern: "^(id|photoUrl|trend)$" }),
        applyRule({ type: "exact", value: "cost" }, { columnType: "number" }),
    ],
});
```

Merge into createDataTable({ ... }) `[options]`:

```ts
schema: discoveredAssetSchema,
columns: undefined,
discoveredColumnRules: [
    { match: { type: "regex", pattern: "." }, sideEffects: { width: toPixels(140) } },
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "discoveredColumnRules": [{ "match": { "type": "regex", "pattern": "." }, "sideEffects": { "width": 140 } }]
}
```

Code only, not in the JSON form: module code. In view definition JSON the table transform's schema has no entries, so whatever this recipe sets on schema entries (an editor, limits, units) is not in the JSON form; give the node its own schema with those entries (a schema on the node replaces the transform's, so keep it discoverable), put units on the column as formatterArgs.unitInfo, or build the table in code.

- columns: undefined removes the base table's listed columns, so only discovered columns show. List a column only to override its header, width or format; it merges with the discovered one.
- A field named in entries is not discovered: it gets a column only if you also list it in columns. Keep entries empty, as here, to show every column, and pin the type of a column discovery would guess wrong with a discovery rule, applyRule({ type: "exact", value: "cost" }, { columnType: "number" }). The row type can stay a named type, or be Readonly\<Record\<string, unknown>> when the fields are not known.
- Discovered data columns sort and filter by default, like listed ones; the rule here only sets a width.
- A MapLarge source's geometry columns are left out: a query returns no geometry unless it asks for it (withgeo).

Reference: `schema-schema-types`, `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [schema-schema-types](../schema-schema-types.md): Schema - Schema Types and more
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
