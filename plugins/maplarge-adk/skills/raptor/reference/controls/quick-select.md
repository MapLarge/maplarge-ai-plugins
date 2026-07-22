# Raptor QuickSelect

Single- and multi-select dropdown picker over an array or paged data source, with optional in-popup search/sort, chip display, and a clear button. Prefer this over the deprecated `s.select(...)`.

## When to use
- A view needs a compact dropdown to pick one (or many) values from a list.
- The list is a `string[]`/`number[]`, an object array, or a server-backed `IPagedData<any>` you want to filter/sort inside the popup.
- You want chip-style display of multiple selections, a typeahead filter, A-Z/Z-A sort, or a custom row/selected-item renderer.

## Builder
Method `s.quickSelect(...)`, node `type: "quickSelect"`. Option interface `IRaptorQuickSelectOptions` (alias `IRaptorQuickSelect`), imported from `raptor/raptorDom/controls/index`. Two call forms:

```ts
// Options object form
s.quickSelect({
    bindings: { items: "myThing.options", value: "myThing.selected" },
    labelProperty: "label",     // property shown in list/chips (default 'label')
    valueProperty: "value",     // property written back in selection; omit to return whole row
    placeholder: "Select",      // shown when empty (default 'Select')
    enableMultiSelect: true,    // multi-select chips vs single value
    enableFiltering: true,      // typeahead search box in popup header
    enableSorting: true,        // A-Z / Z-A / None buttons in popup header
    clearable: true,            // render an "x" clear button
    sortColumn: "label",        // column to sort on (defaults to labelProperty)
    minPopupWidth: 180,         // popup min width px (default 180)
    size: "sm",                 // DisplayUtilities.InputSize
});

// Shorthand: first string arg becomes the `items` binding
s.quickSelect("myThing.options", { valueProperty: "id", enableMultiSelect: true });
```

Key option fields (from `IRaptorQuickSelectOptions`): `labelProperty`, `valueProperty`, `placeholder`, `enableFiltering`, `enableMultiSelect`, `enableSorting`, `sortColumn`, `clearable`, `minPopupWidth`, `size`, `noValueText`, `label` (`ViewDefinitions.ILabel`), plus `border`/`borderSubtle` from the base view definition.

## Bindings & events
Binding keys (`bindings?`):
- `items` — `Item[] | IPagedData<any>`. Strings/numbers are auto-wrapped to `{label,value}`; objects are kept and read via `labelProperty`/`valueProperty`.
- `value` — `SelectedType[]`. Two-way: the array of selected values (mapped through `valueProperty`, or whole rows if unset). In single-select only the first entry is used.
- `disable` — `boolean`; toggles the `disabled` class.
- `data` — **deprecated** `QuickSelectDataBinding` (`{ items, selectedItems }`); use `items` + `value` instead.

Events: `events?: Events.IEvent_Input<T>[]`. The control fires the `'change'` (`ChangeEventType`) event with the current selected values whenever selection changes (and when an attached editor data-source filter is applied).

## ViewModel / instance API
Backing node class `QuickSelect extends RaptorNode`; per-instance VM `QuickSelectViewModel`; each list row is wrapped in `QuickSelectItemViewModel` (exposes computed `__label`, `__is_selected`, `__empty_label`). Reach the live node to drive it imperatively:

```ts
const qs = this.raptorDom.nodeT<QuickSelect>("myQuickSelectView");
qs.selectedItems = [row];   // setter writes back bindings, fires change, refreshes
qs.applyFilter("abc");      // programmatic typeahead filter
qs.applySort(true);         // true = asc, false = desc
qs.clearSort();
qs.closePopup();            // also openPopup() / togglePopup()
const cur = qs.selectedItems;  // getter -> current selection (item VMs)
```

Useful members: getters `open`, `multiselectEnabled`, `filteringEnabled`, `sortingEnabled`, `items`, `selectedItems`; setter `selectedItems`; methods `applyFilter(value)`, `applySort(ascending)`, `clearSort()`, `refreshList(preserveScroll?)`, `openPopup()/closePopup()/togglePopup()`, `fireChangeEvent(value)`. `QuickSelectViewModel` also exposes `onSelectionChanged: (items) => void` for parent controls that mount a QuickSelect directly.

## Patterns
**Simple single-select from strings**
```ts
s.quickSelect("myVm.choices", { clearable: true });
// myVm.choices: string[]; selection round-trips through `value` binding when set
```

**Multi-select objects with chips**
```ts
s.quickSelect({
    bindings: { items: "myVm.rows", value: "myVm.selectedIds" },
    labelProperty: "name", valueProperty: "id",
    enableMultiSelect: true, enableFiltering: true, enableSorting: true,
});
```

**Custom row + selected templates** (via `IQuickSelectScriptor`)
```ts
s.quickSelect({ bindings: { items: "myVm.rows" }, labelProperty: "name" })
 .quickSelectItemTemplate()
   .contentTemplates(s => s.div({ classes: ["row"] }).bindings({ text: "name" }))
 .quickSelectSelectedItemTemplate()
   .contentTemplates(s => s.span().bindings({ text: "name" }));
```

## Gotchas
- With `valueProperty` set, the `value` binding holds/returns *scalar* values (the picked column), not whole rows; omit `valueProperty` to round-trip full objects.
- Setting `value` before `items` resolve is buffered (`_pendingValue`) and applied once items load — fine for async/paged sources; don't assume `selectedItems` is populated synchronously.
- Single-select normalizes any multi-value `value` to its first element; switch `enableMultiSelect` to keep more than one.
- The popup renders into `document.body` and is rebuilt on each open (`closePopup` destroys its DOM); cache nothing inside the popup across opens.
- `applyFilter`/`applySort`/`clearSort` are no-ops until `vm.filteredItems` exists (i.e. after the `items` binding fires).
- Inside list templates, bind to `__label` for the safe label (honors `noValueText`) and `__is_selected` for selected styling rather than recomputing in the view.

## Related skills
- Parent: `raptor` (View/VM split, RSScriptor.create, update(), bindings/events, RaptorNodeBase).
- Siblings: `select.md` (the deprecated select this replaces), `dropdown.md`, `forms.md`, `data-store.md` (for `IPagedData`/data-source-backed items), `foreach.md` (the popup list renders via a foreach).
