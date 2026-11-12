# Data Table recipe - Filter columns

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## filter-columns

**Filter columns.** Let users filter by column values, see which filters are active, and clear them.

ViewModel members `[members]`:

```ts
public readonly clearFilters = (): void => {
    this.store?.dispatch(actions.clearFilters());
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
filtering: dataTable.viewModel.filtering.dialogFiltering(),
filterIndicators: {
    headerCell: dataTable.viewModel.filterIndicators.filterFunnelIndicator(),
    belowGrid: dataTable.viewModel.filterIndicators.filterChipsIndicator(),
},
columns: [
    column({ field: "inService", header: "In Service", filtering: true }),
],
```

Above the table (view) `[viewBefore]`:

```ts
s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "clearFilters" }] })
    .contentTemplates((button) => { button.span({ text: "Clear filters" }); });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "filtering": { "strategy": "dialogFiltering" },
  "filterIndicators": {
    "headerCell": { "strategy": "filterFunnelIndicator" },
    "belowGrid": { "strategy": "filterChipsIndicator" }
  },
  "columns": [{ "field": "inService", "header": "In Service", "filtering": true, "key": "inService" }]
}
```

Code only, not in the JSON form: ViewModel members; view nodes.

- Every data column can already be filtered from its header menu (Filter); filtering: false turns one off, and filtering: true on a data column changes nothing. A virtual column can be filtered only when the schema has an entry under the virtual column's key, which then names the field filtered. dialogFiltering and both indicators are the defaults, written out here to show where to change them.
- Operators follow each column's schema type. A text column offers Contains, Starts With, Equals, Not Equal, Contains Any, Equal Any (several typed values), Is Null and Is Not Null; a number or date column offers Equals, Not Equal, the comparisons, Between, Not Between, Is Null and Is Not Null, with date pickers for a date. There is no pick-list of the column's values.
- filterControls changes the control used for a type, such as a date range.
- For one box that searches several columns at once, or buttons, a dropdown or a checkbox that narrow the table, see narrow-the-table-from-controls.

Reference: `filtering-column-filter-configuration`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [filtering-column-filter-configuration](../filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
