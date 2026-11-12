# Data Table recipe - Preset buttons with the active one highlighted

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

### narrow-the-table-from-controls#preset-buttons

**Preset buttons with the active one highlighted.** Buttons above the table that each narrow it to a preset, such as Today, Last 7 days and All, with the active button highlighted.

Apply the recipe above, then:

Module scope `[module]`:

```ts
export type InspectedRange = "last30" | "last90" | "all";

const rangeDays: Record<InspectedRange, number | null> = { last30: 30, last90: 90, all: null };

function startOfDayDaysAgo(days: number): string {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
}
```

ViewModel members `[members]`, in place of the recipe's block:

```ts
public activeRange: Record<InspectedRange, boolean> = { last30: false, last90: false, all: true };

public readonly showRange = (range: InspectedRange): void => {
    const days = rangeDays[range];
    this.store?.dispatch(actions.setConstraint({
        key: "inspectedRange",
        filter: days === null ? null : { field: "lastInspected", operator: "GreaterOR", values: { value: startOfDayDaysAgo(days - 1) } },
        scrollBehavior: "top",
    }));
    this.activeRange = { last30: range === "last30", last90: range === "last90", all: range === "all" };
    this.update();
};
```

Above the table (view) `[viewBefore]`, in place of the recipe's block:

```ts
s.div({ flex: { dFlex: true, gap: 2 }, margin: { bottom: 2 } }).contentTemplates((presets) => {
    presets.button({ kind: "primary", outline: true, size: "small", bindings: { css: { classes: { active: "activeRange.last30" } } }, events: [{ event: "click", handler: "showRange", param: "last30" }] })
        .contentTemplates((button) => { button.span({ text: "Last 30 days" }); });
    presets.button({ kind: "primary", outline: true, size: "small", bindings: { css: { classes: { active: "activeRange.last90" } } }, events: [{ event: "click", handler: "showRange", param: "last90" }] })
        .contentTemplates((button) => { button.span({ text: "Last 90 days" }); });
    presets.button({ kind: "primary", outline: true, size: "small", bindings: { css: { classes: { active: "activeRange.all" } } }, events: [{ event: "click", handler: "showRange", param: "all" }] })
        .contentTemplates((button) => { button.span({ text: "All" }); });
});
```

- Each button hands its preset to showRange through param, which arrives as the method's first argument. A click is wired only through events: [{ event: "click", handler, param }]; onClick and handlerArgs do not exist and leave the button doing nothing.
- activeRange holds one true/false flag per preset, all set together, and each button binds its own flag as the active class; Bootstrap fills an outline button that has it. The button's kind stays fixed; only the class follows the flag.
- Today counts as the first day: Last 30 days starts at midnight 29 days ago, and a Today button is days: 1. Count from new Date(), never from a date typed into the code.
- The constraint compares the stored text. lastInspected holds UTC timestamps ("2026-09-21T08:15:00Z"), so the start is local midnight written the same way, with toISOString. For a date-only field ("2026-09-21"), compare with the local date as text instead: [start.getFullYear(), String(start.getMonth() + 1).padStart(2, "0"), String(start.getDate()).padStart(2, "0")].join("-").
- For presets on a text field (Open, Closed), use operator Equal with the value instead of GreaterOR.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [narrow-the-table-from-controls](narrow-the-table-from-controls.md): Narrow the table from controls above it: a search box, preset buttons, a dropdown, a checkbox
- [filtering-column-filter-configuration](../filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [store-store-api](../store-store-api.md): Store - Store API and more
