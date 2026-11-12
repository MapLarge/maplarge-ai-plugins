# Data Table recipe - Write a custom formatter

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## write-a-custom-formatter

**Write a custom formatter.** Format values in a way no built-in formatter covers, and reuse it by name on any column.

Imports `[imports]`:

```ts
import type { DataTableValueFormatter } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
const daysAgo: DataTableValueFormatter = ({ value }) => {
    if (typeof value !== "string" || value === "") return "";
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
    return days <= 0 ? "today" : days === 1 ? "1 day ago" : String(days) + " days ago";
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
formatters: { daysAgo },
columns: [
    column({ field: "lastInspected", header: "Inspected", formatter: "daysAgo" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    {
      "field": "lastInspected",
      "header": "Inspected",
      "formatter": "daysAgo",
      "key": "lastInspected"
    }
  ]
}
```

Code only, not in the JSON form: module code. Custom formatters exist only in the ViewModel.

Reference: `cells-and-content`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cells-and-content](../cells-and-content.md): Cell Values
