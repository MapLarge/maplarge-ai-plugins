# Data Table recipe - Narrow the table from controls above it: a search box, preset buttons, a dropdown, a checkbox

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

Variants, each in its own file with this recipe: `narrow-the-table-from-controls#preset-buttons` (Preset buttons with the active one highlighted), `narrow-the-table-from-controls#dropdown` (A dropdown of values), `narrow-the-table-from-controls#checkbox` (A checkbox toggle), `narrow-the-table-from-controls#pinned-scope` (A scope set from code), `narrow-the-table-from-controls#over-an-api` (A search box over rows from an API).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [filtering-column-filter-configuration](../filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [store-store-api](../store-store-api.md): Store - Store API and more
- [narrow-the-table-from-controls#preset-buttons](narrow-the-table-from-controls--preset-buttons.md): Preset buttons with the active one highlighted
- [narrow-the-table-from-controls#dropdown](narrow-the-table-from-controls--dropdown.md): A dropdown of values
- [narrow-the-table-from-controls#checkbox](narrow-the-table-from-controls--checkbox.md): A checkbox toggle
- [narrow-the-table-from-controls#pinned-scope](narrow-the-table-from-controls--pinned-scope.md): A scope set from code
- [narrow-the-table-from-controls#over-an-api](narrow-the-table-from-controls--over-an-api.md): A search box over rows from an API
