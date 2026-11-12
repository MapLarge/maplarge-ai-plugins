# Data Table - How It Works - Sorting, Filtering and Constraints

<!-- Automatically generated, do not edit -->

## Sorting, Filtering and Constraints

**Narrowing.** Users sort (one column) and filter from the headers. Code narrows with `actions.setConstraint({ key, filter })`, which Clear All Filters leaves alone, and `actions.refresh()` re-reads the rows and scrolls to the top. `arrayData` and the MapLarge engines apply constraints; `asyncData` does not pass them to `fetchRows`, so keep the search text in the ViewModel, filter inside `fetchRows` and refresh (`narrow-the-table-from-controls#over-an-api`). On rows held in code `Contains` compares each value as lowercase text: numbers match by their digits and a list of text by its items joined with commas, while an object never matches what users type, so keep searchable text in a text field of its own. Checked rows are kept as positions, so a sort, filter or constraint leaves the same positions checked on other rows: clear the checks when the order changes (`act-on-checked-rows`).

**Counts and totals under the table.** A count of the rows shown comes from the status bar's `totalRows`, never from counting again with your own filter (the two drift apart at the edges); it follows the filters and the constraints on arrayData and the MapLarge engines, and on asyncData it is the `totalSize` your fetchRows returned, so show `loadedRows` when that is a made-up one-more count. A sum comes from your own copy of the rows, formatted with `toLocaleString`, recomputed wherever rows change, in a bound member. A sum over only the rows the user's filters leave needs the rows in order: read positions 0 to totalRows - 1 with `store.getRowsFromDataEngine` after each filter change (cheap for arrayData, a full read for a server).

Three things narrow and order the rows, and the data engine applies all three: the sort, the filters users set from the column headers, and constraints your code sets.

```ts
sort          one column at a time; defaultSort sets the first one
filters       set by users from the header menus; Clear All Filters removes them
constraints   set from code with actions.setConstraint({ key, filter }); Clear All Filters leaves them
```

Each engine applies them in its own place: arrayData in the browser, the MapLarge engines on the server, and asyncData in your fetchRows, which receives the sort and the users' filters but not constraints.

```ts
// arrayData or a MapLarge table: a constraint narrows the rows
this.store?.dispatch(actions.setConstraint({
    key: "openOnly",
    filter: { field: "openNow", operator: "Equal", values: { value: true } },
    scrollBehavior: "top",
}));

// asyncData: constraints never reach fetchRows, so keep the text yourself, filter in fetchRows, and refresh
public searchText = "";
public readonly search = (): void => { this.store?.dispatch(actions.refresh()); };
fetchRows: async ({ start, count }) => {
    const rows = await fetchProductPage(start, count, this.searchText);
    return { rows, totalSize: rows.length === count ? start + rows.length + 1 : start + rows.length };
},
```

Comparisons use the stored values: numbers as numbers, text as text, Date objects by time. Dates stored as ISO text (2026-10-04, or 2026-10-04T13:00:00Z) therefore sort and compare correctly, as long as every row uses the same form.

- Every sort, filter or constraint change makes the table fetch its rows again and redraw them; actions.refresh() does the same without changing anything.

## Related

- [how-it-works-the-pieces](how-it-works-the-pieces.md): How It Works - The Pieces and more
- [narrow-the-table-from-controls#over-an-api](recipes/narrow-the-table-from-controls--over-an-api.md): A search box over rows from an API
- [act-on-checked-rows](recipes/act-on-checked-rows.md): Act on checked rows: delete, change or move them
