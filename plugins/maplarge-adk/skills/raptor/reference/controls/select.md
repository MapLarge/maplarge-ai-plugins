## Select & Choices

Two option-picker controls: the legacy native dropdown `s.select` (one or many values) and `s.choices` (a small list of checkboxes, radios, or toggle buttons). Both bind a ViewModel array of options to a selected-value property.

> `s.select` is **`@deprecated`** in the framework in favor of `s.quickSelect` (see `quick-select.md`). Prefer QuickSelect for new searchable/data-source-backed dropdowns. Document/maintain `select` here; reach for `choices` when the option set is small (a handful) and you want inline checkboxes/radios/toggle buttons.

## When to use
- **`s.choices`** — a *few* options shown inline as checkboxes (multi), radios (single), or Bootstrap toggle buttons. Not recommended for more than a handful of items (UX). Supports paged data sources.
- **`s.select`** — a compact native-style dropdown with built-in search-filter (filter input auto-hidden when fewer than 8 options) for single or multi value. Legacy; use QuickSelect instead for new code.
- For a searchable, templated, data-source-driven dropdown, use `quick-select.md` instead.

## Builder — `s.choices`
Builder `choices(options: IRaptorChoicesOptions)` → node `type: "choices"`, node class `Choices` (extends `RaptorNodeBase`). Registered via `RSScriptor.register` with a `BindUniqueValuesDataSetContract` (so it can bind directly to a data source column's unique values).

Key `IRaptorChoicesOptions` fields:
- `enableMultiSelect?: boolean` — checkboxes (true) vs radios (false, default).
- `layout?: 'horizontal' | 'vertical'` (default `'vertical'`).
- `label?: ILabel`, `labelProperty?: string` (default `"label"`), `valueProperty?: string` (default `"value"`), `noValueText?: string` (default `"(No Value)"`).
- `toggleButton?: boolean | ToggleButtonOptions` — `true` or an object renders as a Bootstrap btn-group. `ToggleButtonOptions = { kind?: ColorDefinitions.ButtonKind; outline?: boolean; size?: DisplayUtilities.ButtonSize }` (defaults kind `"secondary"`, outline `true`, size `"medium"`).
- `bindings`: `IRaptorUniversalBindings & { items?, value?, disable? }`.
- `events`: `IEvent_Input[]`.

```ts
// View
s.choices({
    enableMultiSelect: true,
    layout: "horizontal",
    label: { text: "Categories" },
    labelProperty: "name",
    valueProperty: "id",
    bindings: { items: "categoryOptions", value: "selectedCategoryIds" }
});

// ViewModel
private _categoryOptions = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }];
public get categoryOptions() { return this._categoryOptions; }
private _selectedCategoryIds: string[] = [];
public get selectedCategoryIds() { return this._selectedCategoryIds; }
public set selectedCategoryIds(v: string[]) { this._selectedCategoryIds = v; }
```

## Builder — `s.select` (deprecated)
Builder `select(options: ViewDefinitions.ISelect)` → node `type: "select"`, node class `Select2` (extends `RaptorNode`). Renders a `.ml-dd-select` dropdown button + popup `ul` managed by a `PopupManager`.

Key `ISelect` fields (extends `IInputType`, so also `size?: InputSize`):
- `options?: any[]` — static inline options (alternative to a bound array).
- `multiSelect?: boolean` — selected value becomes `string[]` instead of `string`.
- `placeholder?: string | boolean` — text, or `false` to suppress; defaults to `"Select"` / `"[Select]"` (when `minimalDisplay`) unless `requireSelection`.
- `requireSelection?: boolean` — auto-selects first option, removes the clear (×) button.
- `minimalDisplay?: boolean` — compact inline style.
- `label?: ILabel`, `labelSeparate?: boolean`, `ariaLabel?: string`, `srOnly?: boolean`.
- `bindings`: universal + enable/disable + `IRaptorOptionsBinding` + value + validation.
- `events`: `IEvent_Select[]`.

```ts
s.select({
    placeholder: "Pick one",
    bindings: {
        options: { options: "myOptions", optionsText: "label", optionsValue: "id", value: "selectedId" }
    },
    events: [{ event: "change", handler: "onSelectionChange" }]
});
```

## Bindings & events
**Choices** binding keys (each has a `@BindingHandler`):
- `items` — array of options (objects, strings, or numbers; also accepts `IPagedData` — it calls `retrieveData({start:0,take:-1})`).
- `value` — two-way selected value; `valueProperty` projects objects to scalars (array when `enableMultiSelect`, else single).
- `disable` — boolean; adds the `disabled` class.
- Events: `IEvent_Input` — fires a **change** event (via `fireChangeEvent`) with the new value when selection changes.

**Select** uses `IRaptorOptionsBinding.options` (an `IOptionsBinding`), the most important sub-keys:
- `options: BindingProp` — VM property holding the option array.
- `optionsText: string` — object property for display text.
- `optionsValue: string` — object property for the stored value.
- `value: BindingProp` — two-way selected value (string, or `string[]` when `multiSelect`).
- `data?`, `selectedIndex?`, `emptyOption?` (replaces deprecated `optionsCaption`).
- Plain `bindings.value` is also written when set. Events: `IEvent_Select` — the node fires handlers registered for `"change"` **or** `"selectionchange"`, passing `selectedValues`.

## ViewModel / instance API
**Choices** is backed by `ChoicesViewModel` (extends `RaptorViewModel`):
- `items: ChoicesItemViewModel[]`, `selectedItems: ChoicesItemViewModel[]`, `disabled: boolean`, and `notifySelectionChanged?: () => void` (the node wires this to push selection back to the binding).
- Each `ChoicesItemViewModel` exposes computed getters `__is_selected` (settable — toggles selection), `__disabled`, `__label`, `__empty_label`. Source object keys `_text`/`_value` are normalized to `text`/`value`.
- Reach the node: `raptorDom.nodeT<Choices>("viewName")`; reach the VM via `node.vm` or `raptorDom.renderer.vmInstances[key]`.

**Select** (`Select2`) public surface: `selectedValues: string[] | string`, `placeholder`, `allOptions`, `show()`, `hide()`, `ddButtonAction(e)`, plus `nodeModel: ISelect`. Reach it with `raptorDom.nodeT<Select2>("viewName")`. It re-pulls options on every `show()`.

## Patterns
- **Single-select radio group**: `s.choices({ bindings: { items: "opts", value: "selected" } })` (default `enableMultiSelect: false`, layout vertical).
- **Toggle-button filter bar**: `s.choices({ enableMultiSelect: true, toggleButton: { kind: "primary", size: "small" }, layout: "horizontal", bindings: { items, value } })`.
- **Data-source-driven choices**: bind `items` to a data source / unique-values source (the `BindUniqueValuesDataSetContract` lets it consume a column's distinct values); the node makes itself "require a data source" until one is bound.
- **Object options with id/label split** (either control): set `valueProperty`/`labelProperty` (Choices) or `optionsValue`/`optionsText` (Select) so the bound value stores the id, not the display string.

## Gotchas
- Prefer `s.quickSelect` over `s.select` for new code — `select` is deprecated.
- `s.choices` is only for a small number of items; large lists belong in QuickSelect/DataGrid.
- Choices `value` binding before `items` arrive is buffered as a pending value and applied once `items` load (especially with paged data).
- Choices `valueProperty`/`labelProperty` default to `"value"`/`"label"`; string/number arrays are auto-wrapped to `{ label, value }`, so omit the property options for primitive lists.
- Select stores the *display string* in `selectedValues` for primitive options; for object options always set both `optionsText` and `optionsValue` or the value display/round-trip breaks.
- Select hides its search filter automatically when there are fewer than 8 options.
- Select with `requireSelection: true` removes the clear button and force-selects the first option on init.

## Related skills
- Parent: `raptor` (View/VM split, RSScriptor, bindings, `update()`, `nodeT`).
- Siblings: `quick-select.md` (the recommended searchable dropdown replacement for `select`), `dropdown.md` (menu/action dropdown), `forms.md` (inputs, radio/checkbox, validation), `button.md` (`ButtonKind`/`ButtonSize` used by toggle buttons), `list-group.md` (selectable item lists), `data-store.md` (binding options to a data source).
