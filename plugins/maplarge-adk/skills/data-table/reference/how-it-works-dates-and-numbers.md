# Data Table - How It Works - Dates and Numbers

<!-- Automatically generated, do not edit -->

## Dates and Numbers

**Numbers and dates.** `formatter: "number", formatterArgs: { format: "0" }` on ids, codes and years; `currency` takes dollars; `percent` takes a fraction and shows one decimal unless `decimalPlaces` says otherwise (0.82 shows 82.0%, or 82% with `decimalPlaces: 0`; 98 shows 9800.0%; build "98%" in transformValue for values already in percent). ISO text ending in `Z` is an instant in UTC, and the `datetime` and `time` formatters show it in the user's preferred time zone (the browser's own unless the user chose another). A date-only value (`"2026-10-10"`) has no time zone: show it with `formatter: "date"`, and compare it with today as text, against the local date written the same way. Rows whose dates count from today (ages, overdue, the last 90 days) work them out from one `new Date()` taken once, never from a hardcoded day or from `Date.now()` inside a fetch, where the same page would come back different; rows that do not depend on today may keep literal dates.

Dates are stored as you give them, usually as ISO text, and new Date("2026-10-10") is midnight UTC, which is the evening before anywhere west of Greenwich. A date-only value compared with today, as text:

```ts
function localDateText(daysAgo: number): string {
    const day = new Date();
    day.setDate(day.getDate() - daysAgo);
    return [day.getFullYear(), String(day.getMonth() + 1).padStart(2, "0"), String(day.getDate()).padStart(2, "0")].join("-");
}

const isPastDue = row.dueDate < localDateText(0);   // "2026-10-10" < "2026-10-11"
```

The number formatters:

```ts
column({ field: "id", header: "Order #", formatter: "number", formatterArgs: { format: "0" } }),         // 10234, not 10,234
column({ field: "total", header: "Total", formatter: "currency", formatterArgs: { currency: "USD" } }),   // dollars: 2450.75 shows $2,450.75
column({ field: "utilization", header: "Used", formatter: "percent", formatterArgs: { decimalPlaces: 0 } }),   // a fraction: 0.82 shows 82%
```

- A format pattern keeps the text before its first 0 or # and after its last one ($#,##0.00, #,##0 items, 0.0%). With a single 0 or # ("0 kg", "0%", "$0") the text beside it is lost: the number is padded with zeros to the pattern's length and the % or $ dropped. Build any other text around a number in transformValue.

Before you finish, search view-model.ts:

- Number columns holding an id, a code or a year for `format: "0"`, `formatter: "percent"` fields for fractions, and `formatter: "currency"` fields for dollars.
- `new Date("` for a hardcoded day, and `Date.now()` inside a fetch.

## Related

- [how-it-works-the-pieces](how-it-works-the-pieces.md): How It Works - The Pieces and more
