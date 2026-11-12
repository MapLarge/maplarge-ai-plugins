# Data Table recipe - Rename and align headers

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## rename-headers

**Rename and align headers.** Give columns readable header text, derive header text from column keys in code, or align headers.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "lastInspected", header: "Last Inspected", headerAlign: "center", verticalHeaderAlign: "bottom" }),
    column({ field: "docsUrl", headerTransform: (key: string) => key.replace(/Url$/, " Link") }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    {
      "field": "lastInspected",
      "header": "Last Inspected",
      "headerAlign": "center",
      "verticalHeaderAlign": "bottom",
      "key": "lastInspected"
    }
  ]
}
```

Code only, not in the JSON form: columns[1] (its headerTransform is code).

- headerTransform receives the column key (docsUrl), not the header text, and what it returns replaces the header, so a column that sets both header and headerTransform shows the transformed key. Use it to build readable text from keys; to change a header you wrote, change header.

Reference: `columns-column-types`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
