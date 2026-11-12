# Data Table recipe - A dropdown of values

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## narrow-the-table-from-controls

**Narrow the table from controls above it: a search box, preset buttons, a dropdown, a checkbox.** A control above the table that narrows the rows: a search box that matches as the user types, preset buttons with the active one highlighted, a dropdown of values, a checkbox toggle, or a pinned scope set from code. Every one is a ViewModel member, a handler and actions.setConstraint.

ViewModel members `[members]`:

```ts
public searchText = "";

public readonly search = (): void => {
    const text = this.searchText.trim();
    this.store?.dispatch(actions.setConstraint({
        key: "search",
        filter: text === ""
            ? null
            : {
                logic: "or",
                filters: ["name", "category", "notes"].map((field) => ({ field, operator: "Contains", values: { value: text } })),
            },
        scrollBehavior: "top",
    }));
};
```

Above the table (view) `[viewBefore]`:

```ts
s.input({
    placeholder: "Search name, category or notes",
    margin: { bottom: 2 },
    bindings: { value: "searchText" },
    events: [{ event: "input", handler: "search" }],
});
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; view nodes.

- actions.setConstraint narrows the rows the data engine returns, so sorting, the status bar's counts and scrolling all follow the search. A null filter removes it.
- A constraint is added to the user's column filters (both apply), never shows as a filter indicator, is not cleared by Clear All Filters and is not saved with a layout.
- Contains ignores case on rows held in code. arrayData and the MapLarge engines apply constraints; asyncData does not pass them to fetchRows, so for an API keep the search text in the ViewModel, filter on it inside fetchRows and dispatch actions.refresh() from search.
- On rows held in code, Contains compares each value as lowercase text: a number matches by its digits and a list of text matches its items joined with commas (tags ["critical", "inspect"] matches crit). An object, such as an assignee stored as { name, color }, compares as the text [object object], so it never matches a name and wrongly matches searches such as obj; keep the text people search for in a text field of its own.
- The search box, the dropdown and the checkbox are the same shape: the control's value binding writes a ViewModel member, its event handler reads that member and dispatches actions.setConstraint (null to clear), and a status bar count (show-a-line-under-the-table#status-bar-count) follows with no extra code. preset-buttons passes the preset through the event's param, pinned-scope sets the constraint from an integration, and over-an-api dispatches actions.refresh() instead.

Reference: `filtering-column-filter-configuration`, `store-store-api`

### narrow-the-table-from-controls#dropdown

**A dropdown of values.** A dropdown above the table listing All and each value of a field, such as a region or a category; picking one narrows the table to it.

Apply the recipe above, then:

ViewModel members `[members]`, in place of the recipe's block:

```ts
public selectedCategory: readonly string[] = ["all"];
public categoryOptions = [
    { label: "All categories", value: "all" },
    { label: "Pumps", value: "Pump" },
    { label: "Valves", value: "Valve" },
    { label: "Hydrants", value: "Hydrant" },
    { label: "Pipes", value: "Pipe" },
];

public readonly pickCategory = (): void => {
    const category = this.selectedCategory[0];
    this.store?.dispatch(actions.setConstraint({
        key: "category",
        filter: category === undefined || category === "all" ? null : { field: "category", operator: "Equal", values: { value: category } },
        scrollBehavior: "top",
    }));
};
```

Above the table (view) `[viewBefore]`, in place of the recipe's block:

```ts
s.quickSelect({
    labelProperty: "label",
    valueProperty: "value",
    clearable: false,
    enableFiltering: false,
    margin: { bottom: 2 },
    bindings: { items: "categoryOptions", value: "selectedCategory" },
    events: [{ event: "change", handler: "pickCategory" }],
});
```

- quickSelect's value binding holds a list with the picked value, written before the change handler runs, so pickCategory reads this.selectedCategory[0]; the options come from a bound list of { label, value }.
- A total under the table for the rows shown (a sum, not a count) comes from your own copy of the rows filtered the same way, worked out in pickCategory and bound as a member; the table has no list of its rows.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [narrow-the-table-from-controls](narrow-the-table-from-controls.md): Narrow the table from controls above it: a search box, preset buttons, a dropdown, a checkbox
- [filtering-column-filter-configuration](../filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [store-store-api](../store-store-api.md): Store - Store API and more
