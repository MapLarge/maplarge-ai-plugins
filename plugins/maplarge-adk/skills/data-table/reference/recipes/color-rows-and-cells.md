# Data Table recipe - Color rows and cells by value

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

Variants, each in its own file with this recipe: `color-rows-and-cells#cells` (Color one column's cells by value).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [theme-theme-options](../theme-theme-options.md): Theme - Theme Options and more
- [color-rows-and-cells#cells](color-rows-and-cells--cells.md): Color one column's cells by value
