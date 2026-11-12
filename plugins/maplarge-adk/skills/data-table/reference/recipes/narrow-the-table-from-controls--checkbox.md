# Data Table recipe - A checkbox toggle

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

### narrow-the-table-from-controls#checkbox

**A checkbox toggle.** A checkbox above the table, such as In service only or Low stock only, that narrows the table while checked and shows every row again when unchecked.

Apply the recipe above, then:

ViewModel members `[members]`, in place of the recipe's block:

```ts
public inServiceOnly = false;

public readonly applyInServiceOnly = (): void => {
    this.store?.dispatch(actions.setConstraint({
        key: "inService",
        filter: this.inServiceOnly ? { field: "inService", operator: "Equal", values: { value: true } } : null,
        scrollBehavior: "top",
    }));
};
```

Above the table (view) `[viewBefore]`, in place of the recipe's block:

```ts
s.checkbox({ label: { text: "In service only" }, margin: { bottom: 2 }, bindings: { checked: "inServiceOnly" }, events: [{ event: "change", handler: "applyInServiceOnly" }] });
```

- The checked binding has already written inServiceOnly when the change handler runs, so the handler reads it; a handler that flips the member itself (this.inServiceOnly = !this.inServiceOnly) runs the filter backwards. Bind a checkbox with checked, not value: with value the box does not show ticked when the member starts true.
- The label is the checkbox's label option, label: { text }; a span inside the checkbox's contentTemplates does not show.
- A condition between two fields (On Hand at or below Reorder Level) is not a filter the engine evaluates: compute it into a field of each row (isLowStock) when you build the rows and filter on that.
- A number threshold uses a comparison operator with the number, such as at least one shelter: { field: "Shelters", operator: "GreaterOR", values: { value: 1 } } (GreaterOR is at least, LessOR at most, Greater and Less are strict). The operator names are those of `filtering-column-filter-configuration`; arrayData and the MapLarge engines apply them in a constraint (asyncData never receives constraints).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [narrow-the-table-from-controls](narrow-the-table-from-controls.md): Narrow the table from controls above it: a search box, preset buttons, a dropdown, a checkbox
- [filtering-column-filter-configuration](../filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [store-store-api](../store-store-api.md): Store - Store API and more
