# Data Table recipe - Handle large data

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## handle-large-data

**Handle large data.** Keep scrolling smooth with very many rows.

Merge into createDataTable({ ... }) `[options]`:

```ts
rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(28) }),
rowSlots: dataTable.viewModel.rowSlots.virtualizedRows({ slots: 120 }),
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "rowScrolling": { "strategy": "virtualScroll", "args": { "fixedRowHeight": 28 } },
  "rowSlots": { "strategy": "virtualizedRows", "args": { "slots": 120 } }
}
```

- virtualScroll sizes the scrollbar to the whole dataset so users can jump anywhere; it needs a known total row count. A fixed row height is the fastest.
- slots is how many row elements the table keeps and reuses while scrolling; 120 covers any screen of 28 pixel rows, so leave it.
- The table's container needs a pixel height. Without one the table grows as tall as all its rows while only its row slots render, so the page scrolls into blank space.
- Server-backed engines such as dataStoreData only fetch the rows near the viewport.

Reference: `scrolling-row-scroll-engines`, `row-slots-virtualized-rows`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [scrolling-row-scroll-engines](../scrolling-row-scroll-engines.md): Scrolling - Row Scroll Engines and more
- [row-slots-virtualized-rows](../row-slots-virtualized-rows.md): Row Slots - Engine: virtualizedRows and more
