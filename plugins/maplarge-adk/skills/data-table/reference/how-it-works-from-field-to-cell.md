# Data Table - How It Works - From Field to Cell

<!-- Automatically generated, do not edit -->

## From Field to Cell

**transformValue runs on empty row slots** with `{}` as the row and `value` undefined, and again whenever a row is repainted. Guard list and object fields (`if (row.tags === undefined) return "";`) and test for undefined, never truthiness (`!row.hours` is true for 0). A data column's throw falls back to the stored value; a virtual column's throw blanks the table. A `virtualColumn` has no field, so read `row.x` there, or use `column({ field })` with a transformValue, which stays sortable and filterable.

The value path, step by step:

```ts
row[field]                          the stored value (rawValue)
  -> converted to the display unit  only when the column has unitInfo (its schema entry, or a MapLarge source's metadata)
  -> transformValue({ value, row })  your function, when the column has one
  -> formatter (formatterArgs)       formats what transformValue returned
  -> unit label added               "12.4 ft"
  = displayValue                    the cell's text, or what a cell template binds to
```

The formatter formats what transformValue returned, so a column with both must have transformValue return a number or a date, not an object. A cell template binds to whatever displayValue ends up being.

A column that shows 98% and still sorts and filters as the number 98:

```ts
column({
    field: "spo2",
    header: "SpO2",
    align: "right",
    transformValue: ({ value }) => (value === undefined ? "" : String(value) + "%"),
}),
```

- A value worked out from other fields follows them with no extra code, because transformValue runs again when the row is repainted after an edit, a mutation or a live update.

Before you finish, search view-model.ts and view.ts:

- Every `transformValue` for a field read with no undefined guard (`row.x.`, `row.x[`, `.map(`, `.split(`, `Math.min(...`).
- Every `virtualColumn` for a `value` read (it is undefined there) and for a `sortField` naming a field the rows have.

## Related

- [how-it-works-the-pieces](how-it-works-the-pieces.md): How It Works - The Pieces and more
