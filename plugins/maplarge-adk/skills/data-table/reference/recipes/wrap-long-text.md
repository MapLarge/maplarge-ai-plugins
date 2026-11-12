# Data Table recipe - Wrap long text

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## wrap-long-text

**Wrap long text.** Wrap long text onto several lines, with rows growing to fit.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "notes", header: "Notes", width: toPixels(320), textWrap: true }),
],
rowHeightHeuristic: dataTable.viewModel.rowHeightHeuristic.linearScan({
    offscreenColumnHeightHeuristic: dataTable.viewModel.rowHeightHeuristic.offscreen.estimateFromText(),
}),
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [{ "field": "notes", "header": "Notes", "width": 320, "textWrap": true, "key": "notes" }],
  "rowHeightHeuristic": {
    "strategy": "linearScan",
    "args": { "offscreenColumnHeightHeuristic": { "strategy": "estimateFromText" } }
  }
}
```

- linearScan measures the columns in view; estimateFromText estimates the height of the ones scrolled out of view sideways from their text and width. Without it a wrapped column off to the right counts as the average height of the first three measured columns (about one line), so the rows stay too short for its text.
- textWrap is ignored when the row scroll engine uses a fixedRowHeight; leave fixedRowHeight out so rows can grow.
- Give the wrapped column a fixed width, as here, even when it is the last column: with flex: 1, rows came out too short and cut the text off in a test.

Reference: `columns-column-types`, `scrolling-row-scroll-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [columns-column-types](../columns-column-types.md): Columns - Column Types and more
- [scrolling-row-scroll-engines](../scrolling-row-scroll-engines.md): Scrolling - Row Scroll Engines and more
