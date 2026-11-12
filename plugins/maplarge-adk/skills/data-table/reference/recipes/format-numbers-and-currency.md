# Data Table recipe - Format numbers and currency

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## format-numbers-and-currency

**Format numbers and currency.** Show numbers with decimals, thousands separators, currency or percent signs.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "id", header: "ID", align: "right", formatter: "number", formatterArgs: { format: "0" } }),
    column({ field: "cost", header: "Cost", align: "right", formatter: "currency", formatterArgs: { currency: "USD" } }),
    column({ field: "utilization", header: "Utilization", align: "right", formatter: "percent", formatterArgs: { decimalPlaces: 0 } }),
    column({ field: "lengthMeters", header: "Length (m)", align: "right", formatter: "number", formatterArgs: { format: "#,##0.0" } }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    {
      "field": "id",
      "header": "ID",
      "align": "right",
      "formatter": "number",
      "formatterArgs": { "format": "0" },
      "key": "id"
    },
    {
      "field": "cost",
      "header": "Cost",
      "align": "right",
      "formatter": "currency",
      "formatterArgs": { "currency": "USD" },
      "key": "cost"
    },
    {
      "field": "utilization",
      "header": "Utilization",
      "align": "right",
      "formatter": "percent",
      "formatterArgs": { "decimalPlaces": 0 },
      "key": "utilization"
    },
    {
      "field": "lengthMeters",
      "header": "Length (m)",
      "align": "right",
      "formatter": "number",
      "formatterArgs": { "format": "#,##0.0" },
      "key": "lengthMeters"
    }
  ]
}
```

- Number columns show thousands separators by default (1,234.5). For ids and codes use formatter: "number" with format: "0", which shows a whole number without them.
- format is a C#-style pattern: 0 is a required digit, # an optional one, "#," adds thousands separators, and the digits after the point set the decimals ("#,##0.00"). Text before the first 0 or # and after the last one is kept ("$#,##0" shows $1,235, "#,##0 kg" shows 1,235 kg); with a single 0 or # the text beside it is lost and the number is padded with zeros to the pattern's length ("0 kg" shows 12 as 0012), and % multiplies by 100 but shows only with decimals ("0.0%" shows 82.0%, "0%" shows 82). Build any other text around a number in transformValue.
- Built-in number formatters: number (a pattern in format), integer, decimal (decimalPlaces), currency (currency, locale, rounded), percent (decimalPlaces, default 1; 0.82 shows as 82.0%, or 82% with decimalPlaces: 0), shortNumber (places), scientific (significantDigits), bytes.
- percent expects a fraction. A value already in percent (98 for 98%) shows as 9800% there; show it with transformValue: ({ value }) => (value === undefined ? "" : String(value) + "%") instead, and the column still sorts and filters by the number.
- currency takes a value in dollars (2450.75) and shows it with two decimals ($2,450.75); add rounded: true to show whole dollars only. The value is never in cents, so code that reads the field, such as an export, uses it as it is.
- A fixed number of decimals for any number, such as hours to one decimal: format: "#0.0" shows 8 as 8.0 and 0.5 as 0.5.

Reference: `cells-and-content`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cells-and-content](../cells-and-content.md): Cell Values
