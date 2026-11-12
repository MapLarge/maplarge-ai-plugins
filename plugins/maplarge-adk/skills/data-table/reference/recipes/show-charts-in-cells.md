# Data Table recipe - Show charts and bars in cells

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## show-charts-in-cells

**Show charts and bars in cells.** Show a small trend chart in every row, or a value as a horizontal bar next to its number: transformValue builds the chart options per row and the template binds chartOptions to them.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    virtualColumn({
        key: "trendChart",
        header: "Trend",
        width: toPixels(140),
        transformValue: ({ row }) => (row.trend === undefined ? undefined : {
            animation: false,
            backgroundColor: "transparent",
            xAxis: { type: "category", show: false, data: row.trend.map((_value, index) => String(index)) },
            yAxis: { type: "value", show: false },
            grid: { top: 2, bottom: 2, left: 2, right: 2, containLabel: false },
            series: [{ type: "line", data: [...row.trend], showSymbol: false }],
        }),
        contentTemplates: ({ s, bindingPaths }) => {
            s.chart({ height: 26, disableMenu: true, options: {}, bindings: { chartOptions: bindingPaths.displayValue } });
        },
    }),
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: columns[0] (its transformValue and contentTemplates are code).

- Give the chart a height that fits the row: 26 here because rows are 25 px by default; a taller chart needs a taller fixedRowHeight. A chart this small is drawn in compact mode (axes, legend and title hidden) unless it sets disableCompactMode: true. transformValue builds the chart options per row and chartOptions binds to them.
- transformValue also runs for empty row slots with an empty row, which is why it returns undefined when row.trend is missing.

Reference: `cell-templates`

Variants, each in its own file with this recipe: `show-charts-in-cells#bar` (A bar beside the number).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [cell-templates](../cell-templates.md): Cell Templates
- [show-charts-in-cells#bar](show-charts-in-cells--bar.md): A bar beside the number
