# Data Table recipe - Color one column's cells by value

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## color-rows-and-cells

**Color rows and cells by value.** Highlight whole rows that meet a condition, such as assets in maintenance, or color one column's cells by their value, such as red above a threshold, through the theme's row and cell rules.

Merge into createDataTable({ ... }) `[options]`:

```ts
theme: {
    rowThemes: [
        { rule: { where: { field: "status", test: "Equal", value: "maintenance" }, applyValue: { background: "warning" } } },
        { callback: ({ row }) => (row.utilization > 0.9 ? { fontWeight: "bold" } : undefined) },
    ],
},
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "theme": {
    "rowThemes": [
      {
        "rule": {
          "where": { "field": "status", "test": "Equal", "value": "maintenance" },
          "applyValue": { "background": "warning" }
        }
      }
    ]
  }
}
```

Code only, not in the JSON form: theme.rowThemes[1] (its callback is code).

- A rule is plain data; a callback can compute any styling. Matching entries stack: inline colors (customTextColor, customBackgroundColor) from a later entry win over earlier ones, but class-based styling such as background or fontWeight from several entries all lands on the row as classes and the stylesheet decides, so do not count on entry order to override a background.
- customTextColor colors the whole row's text, such as { customTextColor: "#6c757d" } to grey out closed rows; background takes danger, warning, success, info, primary, secondary, light or dark.
- Struck-through text cannot come from a row theme: the class lands on the row and the line never reaches the cells' text. Put customCssClasses: "text-decoration-line-through" in a cellThemes entry with no matchColumns, which styles every cell of the row (add-action-buttons#checkbox does).

Reference: `theme-theme-options`

### color-rows-and-cells#cells

**Color one column's cells by value.** Color one column's cells by their value, such as red above a threshold and green below.

Apply the recipe above, then:

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "utilization", header: "Utilization", formatter: "percent" }),
    column({ field: "cost", header: "Cost", formatter: "currency", formatterArgs: { currency: "USD" } }),
],
theme: {
    cellThemes: [
        {
            matchColumns: { type: "exact", value: "utilization" },
            callback: ({ row }) => (row.utilization > 0.9 ? { background: "danger", customTextColor: "#fff" } : row.utilization > 0.6 ? { background: "warning" } : undefined),
        },
        {
            matchColumns: { type: "exact", value: "cost" },
            callback: ({ row }) => (row.cost > 100000 ? { customTextColor: "#dc3545" } : { customTextColor: "#198754" }),
        },
    ],
},
```

View definition JSON for this variant's options, merged over the recipe's:

```json
{
  "columns": [
    {
      "field": "utilization",
      "header": "Utilization",
      "formatter": "percent",
      "key": "utilization"
    },
    {
      "field": "cost",
      "header": "Cost",
      "formatter": "currency",
      "formatterArgs": { "currency": "USD" },
      "key": "cost"
    }
  ]
}
```

- The callback is plain code, so if and else are a ternary: Cost is red above 100,000 and green otherwise. customTextColor alone colors only the text; background takes danger, warning, success, info, primary, secondary, light or dark.
- For a color Bootstrap has no name for, such as orange, or a true blue (info is cyan), use customBackgroundColor with a hex value, { customBackgroundColor: "#fd7e14", customTextColor: "#fff" }, and type the callback's result as DataTableThemeStyling (imported as a type from data-ui/data-table) rather than { background: string }, which is a type error.
- A cell theme styles the cell. A cell drawn with contentTemplates keeps the classes its own markup sets, so color that markup in the template instead: bind each class to its own true/false flag from transformValue (isOver for red, isUnder for green), as show-charts-in-cells#bar does, or switch two class sets on one flag with css: { property: path, trueClasses: ["text-danger"], falseClasses: ["text-success"] }. A path cannot compare values, so work the comparison out in transformValue.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [color-rows-and-cells](color-rows-and-cells.md): Color rows and cells by value
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [theme-theme-options](../theme-theme-options.md): Theme - Theme Options and more
