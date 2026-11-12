# Data Table recipe - Format dates and times

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## format-dates-and-times

**Format dates and times.** Show a date without its time, a time alone, or one timestamp as separate date and time columns, in the user's time zone and date preferences.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "lastInspected", header: "Inspected On", formatter: "date" }),
    column({ field: "lastInspected", key: "inspectedAt", header: "Inspected At", formatter: "time" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    {
      "field": "lastInspected",
      "header": "Inspected On",
      "formatter": "date",
      "key": "lastInspected"
    },
    {
      "field": "lastInspected",
      "key": "inspectedAt",
      "header": "Inspected At",
      "formatter": "time"
    }
  ]
}
```

- Pick the formatter by what the value means: date for a day (a due date, a birthday), datetime for a date with its time (a reading, a created-at time), time for the time of day alone. datetime on a date-only value shows 12:00 AM on every row, and time alone on rows that span several days repeats each day, so hourly rows over days need datetime.
- One field can feed several columns: give each extra column its own key, as Inspected At does here. Each sorts and filters on the field like any data column.
- Built-in date formatters: datetime, date, time and isoDate. They take ISO strings, epoch milliseconds, JS Dates or luxon DateTimes. A time of day held as text, such as "14:30", is not one of those: give that column no formatter and it shows as stored (zero-padded text also sorts in time order); formatter: "time" on it shows Invalid date.
- formatterArgs.format is a moment.js pattern in which the words ShortDate, LongDate, ShortTime and LongTime stand for the user's preferred formats. The defaults are "ShortDate ShortTime" (datetime), "ShortDate" (date) and "ShortTime" (time); "ShortDate LongTime" or "YYYY-MM-DD HH:mm:ss" show seconds.
- A time stored with a Z shows in the user's preferred time zone, the browser's own unless the user chose another; the getGlobalUserContext option supplies a different source. A date-only value such as "2026-10-10" has no time zone and shows as the same day with formatter "date".
- To compare a date-only value such as "2026-10-10" with today (past due, due soon), compare it as text with today's local date as text: const now = new Date(); const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-"); then row.dueDate < today. Never new Date("2026-10-10"): that is midnight UTC, the evening before west of Greenwich, so a task due today counts as past due.

Reference: `cells-and-content`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cells-and-content](../cells-and-content.md): Cell Values
