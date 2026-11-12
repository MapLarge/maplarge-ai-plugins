# Data Table recipe - Load more rows at the bottom

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## load-more-at-the-bottom

**Load more rows at the bottom.** Grow the table as the user scrolls down, fetching more rows at the bottom, for feeds or sources whose total row count is unknown.

Module scope `[module]`:

```ts
const feedAssets: Asset[] = Array.from({ length: 290 }, (_unused, index) => {
    const template = assets[index % assets.length];
    return { ...template, id: index + 1, name: template.name + " " + String(index + 1) };
});

async function fetchFeedPage(start: number, count: number): Promise<Asset[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return feedAssets.slice(start, start + count);
}
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.asyncData<Asset>({
    fetchRows: async ({ start, count }) => {
        const rows = await fetchFeedPage(start, count);
        return { rows, totalSize: rows.length === count ? start + rows.length + 1 : start + rows.length };
    },
    defaultPageSize: 25,
}),
columns: [
    column({ field: "name", sort: false, filtering: false }),
    column({ field: "category", sort: false, filtering: false }),
],
rowScrolling: dataTable.viewModel.rowScrolling.infiniteScroll({ fixedRowHeight: toPixels(32) }),
statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
    formatStatusText: ({ loadedRows }) => (loadedRows === undefined ? "" : String(loadedRows) + " assets loaded"),
}),
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    { "field": "name", "sort": false, "filtering": false, "key": "name" },
    { "field": "category", "sort": false, "filtering": false, "key": "category" }
  ],
  "rowScrolling": { "strategy": "infiniteScroll", "args": { "fixedRowHeight": 32 } }
}
```

Code only, not in the JSON form: module code; statusBar.formatStatusText. In view definition JSON the table transform supplies the rows, always publishing the table's filters and following other widgets' filters, so the data options above have no JSON form there; to set them, give the node its own data, { "strategy": "dataStoreData", "args": { "dataStore": { "binding": "dataStore" }, "dataSourceName": "\<source>" } } with the options in args.

- asyncData asks for another page only while start + rows.length < totalSize, so fetchRows must return totalSize even when the source never says how many rows there are. Answer one more than the rows so far while pages come back full, and the exact count once a page comes back short, as here; leave totalSize out and the table stops after its first pages. When the rows end exactly on a full page, the extra fetch returns none and one blank row stays at the bottom; that is the table's doing, not this code's.
- fetchFeedPage stands in for the API; swap in your fetch and keep the totalSize line. A search box over it keeps the search text in the ViewModel, filters inside fetchRows and dispatches actions.refresh(), which starts again from the top (narrow-the-table-from-controls).
- The scrollbar covers only the rows loaded so far, so users cannot jump to the end; use handle-large-data for that.
- This fetchRows applies no sort and no filter, so the columns turn both off (an asyncData column left filterable opens an empty filter dialog). To offer them, apply sort and filter inside fetchRows and list filterCapabilities, as load-from-an-api#stand-in-in-code does.
- In a status bar's formatStatusText, loadedRows counts the rows fetched so far and totalRows is the source's total. When the total is unknown to users, show loadedRows alone ("150 articles loaded"); here totalRows would be the made-up one-more count.

Reference: `scrolling-row-scroll-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [scrolling-row-scroll-engines](../scrolling-row-scroll-engines.md): Scrolling - Row Scroll Engines and more
