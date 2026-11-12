# Data Table recipe - The row count in the status bar

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## show-a-line-under-the-table

**Show a count, a total or any text under the table.** A line under the table: a sentence the ViewModel works out from the rows, such as a total or how many are overdue, or (the variants) the table's own row count in the status bar, with or without when the data was last refreshed.

ViewModel members `[members]`:

```ts
public summaryText = "";

private updateSummaryText(): void {
    const outOfService = assets.filter((asset) => asset.inService === false).length;
    this.summaryText = outOfService === 1 ? "1 asset out of service" : String(outOfService) + " assets out of service";
}
```

After createDataTable `[afterCreate]`:

```ts
this.updateSummaryText();
```

Below the table (view) `[viewAfter]`:

```ts
s.div({ margin: { top: 2 }, bindings: { text: "summaryText" } });
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; setup code; view nodes.

- The text is a string member of the ViewModel, worked out in code and bound by its name. A binding takes a member name or a path only: an arrow function, a { transform } object or an expression in its place shows nothing.
- afterCreate runs before the base's this.update(). When the rows change later (an edit, a live update), work the text out again from your own copy of the rows and call this.update(), as update-derived-values-after-edits does.
- The page only reads the member on this.update(): setting summaryText in onRowUpdate without it leaves the old line on screen. store.mutations.update does not call onRowUpdate, so a click or button that changes rows works the line out again in its own handler (add-action-buttons#checkbox).
- For a count of the rows the table shows, the status-bar-count variant is enough and follows every filter and constraint by itself; this line is for anything the table cannot count, such as a sum. A sum over only the rows a filter or control leaves comes from your own copy of the rows, filtered the same way in the control's handler.
- Format numbers in the text in code: total.toLocaleString("en-US", { style: "currency", currency: "USD" }) gives $12,062.88 (add maximumFractionDigits: 0 for whole dollars) and count.toLocaleString() gives 1,250. toFixed(2) drops the thousands separators.

Reference: `status-bar-status-bar`

### show-a-line-under-the-table#status-bar-count

**The row count in the status bar.** Show how many rows the table has, in your own words, along the bottom of the table, following every sort, filter and constraint by itself.

Apply the recipe above, then:

Merge into createDataTable({ ... }) `[options]`:

```ts
statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
    formatStatusText: ({ totalRows }) =>
        totalRows === undefined ? "" : totalRows.toLocaleString() + (totalRows === 1 ? " asset" : " assets"),
}),
```

Leave out the recipe's `[members]`, `[afterCreate]`, `[viewAfter]` blocks.

- totalRows is the data engine's row count: rows held in code know it at once, asyncData and dataStoreData report 0 until their first rows arrive, and dataSourceData is undefined until its first count. After that it follows the filters, and the constraints on arrayData and the MapLarge engines (asyncData is not given constraints). On asyncData and dataStoreData, which report 0 before their first rows arrive, show a blank until the first rows load rather than relying on undefined; rows held in code report a real 0 (a search that matches nothing), so show it.
- formatStatusText receives counts only ({ firstVisible, lastVisible, totalRows, loadedRows }), never the rows. For a sum such as a total value, add up your own copy of the rows in the ViewModel (the recipe above, update-derived-values-after-edits). The store has no method that returns every row.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [show-a-line-under-the-table](show-a-line-under-the-table.md): Show a count, a total or any text under the table
- [status-bar-status-bar](../status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
