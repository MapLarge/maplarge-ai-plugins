# Data Table recipe - A bar beside the number

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

### show-charts-in-cells#bar

**A bar beside the number.** Show a value as a small horizontal bar next to its number, such as utilization as a percent bar.

Apply the recipe above, then:

Module scope `[module]`:

```ts
function percentBar(percent: number) {
    return {
        animation: false,
        backgroundColor: "transparent",
        grid: { top: 7, bottom: 7, left: 0, right: 0, containLabel: false },
        xAxis: { type: "value", show: false, min: 0, max: 100 },
        yAxis: { type: "category", show: false, data: ["value"] },
        series: [{
            type: "bar",
            data: [percent],
            barWidth: 12,
            showBackground: true,
            backgroundStyle: { color: "rgba(128, 128, 128, 0.25)" },
            itemStyle: { color: percent > 90 ? "#dc3545" : "#0d6efd" },
        }],
    };
}
```

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({
        field: "utilization",
        header: "Utilization",
        width: toPixels(180),
        transformValue: ({ value }) => ({
            label: String(Math.round(value * 100)) + "%",
            isHigh: value > 0.9,
            bar: percentBar(value * 100),
        }),
        contentTemplates: ({ s, bindingPaths }) => {
            s.div({ flex: { dFlex: true, alignItemsCenter: true, gap: 2 } }).contentTemplates((cell) => {
                cell.span({
                    width: 44,
                    textAlignment: { textEnd: true },
                    bindings: {
                        text: bindingPaths.displayValue + ".label",
                        css: { classes: { "text-danger": bindingPaths.displayValue + ".isHigh" } },
                    },
                });
                cell.div({ width: 100 }).contentTemplates((track) => {
                    track.chart({ height: 26, disableMenu: true, options: {}, bindings: { chartOptions: bindingPaths.displayValue + ".bar" } });
                });
            });
        },
    }),
],
```

- transformValue hands the template one object: the label, a flag for the red text, and the chart options for the bar. chartOptions can bind to any path inside it.
- The bar is an ECharts horizontal bar on a 0 to 100 axis; the div's width sets the bar's length.
- Keep the flex: { dFlex: true } row and the fixed widths of the label and the chart's div. Without them the chart takes the whole cell and the label drops underneath it, out of sight.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [show-charts-in-cells](show-charts-in-cells.md): Show charts and bars in cells
- [cell-templates](../cell-templates.md): Cell Templates
