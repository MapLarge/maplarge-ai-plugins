# Data Table recipe - Sort columns

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## sort-columns

**Sort columns.** Start the table sorted, such as newest first, and turn sorting off for columns where it makes no sense.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "lastInspected", header: "Last Inspected" }),
    column({ field: "notes", header: "Notes", sort: false }),
],
defaultSort: { key: "lastInspected", direction: "desc" },
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "lastInspected", "header": "Last Inspected", "key": "lastInspected" },
    { "field": "notes", "header": "Notes", "sort": false, "key": "notes" }
  ],
  "defaultSort": { "key": "lastInspected", "direction": "desc" }
}
```

- Every column with a field sorts by default, by clicking its header or from the header menu; sort: false turns that off. A virtual column sorts only when it has a sortField.
- The table sorts by one column at a time.
- defaultSort's key names a column; the field it sorts is the key itself unless you add field. For a virtual column write defaultSort: { key: "\<column key>", field: "\<its sortField>", direction }; with key alone it sorts by a field named after the key and nothing changes.
- Values sort as stored: numbers numerically, and on rows held in code text by character code, so capital letters come before lowercase (Zebra before apple); keep a lowercase copy in each row and sort on it when a column mixes cases. For an order of your own, such as Received, Picked, Packed, Shipped, keep a number for that order in each row (stageRank: 1 to 4), show the label in a virtual column with sortField: "stageRank", and change both fields together.

Reference: `columns-column-types`, `data-data-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
