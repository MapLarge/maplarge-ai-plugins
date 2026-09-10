# Raptor Slider

Numeric range/value slider (`s.slider`, web component `<ml-slider>`) and a compact percentage popup slider (`s.percentSlider`). The range slider supports single-thumb or dual-thumb (`rangeMode`) selection, optional text inputs, ticks, tooltips, fill, gradient track, and automatic display/native unit conversion. Use it as a numeric filter on a data column or as a plain bound value picker.

## When to use

- A numeric min/max **range filter** over a data column (dual-thumb, `rangeMode: true`).
- A single value picker (one thumb) bound to a VM number.
- Unit-aware numeric selection (column has `unitInfo`; slider shows display units, filters in native units).
- A tiny **opacity/percentage** control that opens a vertical slider popup → use `s.percentSlider`.

For a circular dial use `svg.md`; for time scrubbing use `time-slider.md`; for a paired min/max number-input filter widget see `numeric-range-filter.md`.

## Builder

`s.slider(options: ViewDefinitions.ISlider)` produces node `type: "slider"`. Backing node class: `Slider extends RaptorNode`. Value type: `SliderValue = [number, number?]` (second element present only in `rangeMode`).

Key `ISlider` fields: `min` (required), `max` (required), `step?`, `rangeMode?: boolean`, `direction?: 'Horizontal' | 'Vertical'`, `invertFill?: boolean`, `showFill?: boolean`, `showTextInputs?: boolean`, `showTooltips?: boolean`, `showTicks?: boolean`, `tickMarkStep?: number`, `gradientBackground?: [string, string]`, `unitInfo?: ml.data.table.IUnitInfo`, `showUnitLabel?: boolean`, `label?: ILabel | string`, `srOnly?`, `id?`. Note: `showTextInputs`, `showFill`, `showTooltips` default **true**; `rangeMode`, `invertFill`, `showTicks` default **false**.

```ts
s.view('mySlider', s => s.slider({
    viewName: 'mySlider',
    min: 0, max: 100, step: 5,
    rangeMode: true,
    showTicks: true, tickMarkStep: 10,
    bindings: { value: s.getTypedProp(vm => vm.myRange) }, // SliderValue
    events: [{ event: 'change', handler: vm => vm.onRangeChange }],
}));
```

`s.percentSlider(options: ViewDefinitions.IPercentSlider)` → node `type: "percentSlider"`, class `PercentSlider`. Fields: `max` (required; the 100% value, usually `1`), `tooltipPrefix?: string`. Its bound `data` is a single **number** (e.g. `0.6` = 60%); it renders a small button that opens a vertical Bootstrap range popup.

```ts
s.percentSlider({ max: 1, tooltipPrefix: 'Opacity',
    bindings: { data: s.getTypedProp(vm => vm.opacity) } });
```

## Bindings & events

`ISlider.bindings` (all optional, all `BindingProp`):

- `value` — `SliderValue | number` (single number is auto-wrapped to `[n]`). Primary binding; written back on change.
- `min`, `max`, `step` — `number`; rebind range/granularity reactively.
- `disable` — `boolean`.
- `unitInfo` — `ml.data.table.IUnitInfo`; enables display↔native conversion.
- `data` — **deprecated**; `ISliderDataBinding = { value?, min?, max? }`. Use `value` instead.

`events?: Events.IEvent_Slider[]` — `event` may be `'change'` (fires with the current display value), or pointer/keyboard/contextmenu types. The change handler receives the current `SliderValue`.

Data-source filtering events `filterBetween` / `filterNotBetween` are **not hand-authored** — they are auto-wired by `SliderDataSetContract` when the slider is bound to a `{ dataSource, column }` dataset (see Patterns). When `invertFill: true`, the contract applies `filterNotBetween` instead of `filterBetween`.

`IPercentSlider.bindings`: universal bindings + `data` (a `number`).

## ViewModel / instance API

Reach the live node: `const sl = raptorDom.nodeT<Slider>("mySlider")`. Useful members:

- Reactive setters that re-sync the web component: `min`, `max`, `step`, `direction`, `rangeMode`, `invertFill`, `showFill`, `showTooltips`, `showTicks`, `tickMarkStep`, `showTextInputs`, `gradientBackground`.
- `getDisplayUnit(): string`, `getNativeUnit(): string` (unit-conversion mode).
- `isConnectedToDataSource: boolean` — set true automatically once a dataset supplies `values`.
- `nodeModel: ISlider`.

The web-component element (`Slider.root as SliderElement`) exposes `value: SliderValue` and `update()`; you rarely touch it directly — set `bindings.value` and call `update(viewName)` on the VM instead. The `@BindingHandler` methods (`value`, `min`, `max`, `step`, `unitInfo`) handle binding writes internally.

`PercentSlider` instance: `percentValue` (number), `tooltipPrefix`, `show()` / `hide()` for the popup.

## Patterns

**Single-value picker.** One-thumb slider bound to a VM number:

```ts
s.slider({ viewName: 'level', min: 1, max: 10, step: 1,
    bindings: { value: s.getTypedProp(vm => vm.level) },
    events: [{ event: 'change', handler: vm => vm.onLevel }] });
```

Handle: `public onLevel = (v: SliderValue) => { this.level = v[0]; };`

**Column range filter (config-driven).** Register the slider's dataset with `{ dataSource, column }` via your control's config schema. `SliderDataSetContract` then computes the column Min/Max (`CalcColumnStats`), seeds `rangeMode: true`, populates the slider extent, and wires `filterBetween`/`filterNotBetween` filter actions automatically. You do not write the filter handlers — just supply `dataSource` and `column`.

**Unit-aware slider.** Bind `unitInfo` (or let the column dataset supply it). Author `min`/`max`/`step` in **native** units; the slider displays converted values and emits native values to filters/`value` bindings. `showUnitLabel !== false` shows the unit abbreviation.

**Gradient / ticks.** `gradientBackground: ['#2b6', '#c33']` colors the track start→end; `showTicks: true` with `tickMarkStep` draws tick marks.

## Gotchas

- `min` and `max` are **required**. Omitting them leaves the web component on its defaults (0/100).
- `value` is a `SliderValue` (array) on the way out even for single-thumb — read `v[0]`. A bare number going *in* is accepted and auto-wrapped.
- In `rangeMode`, the binding must hold a two-element array; a single number only moves one thumb.
- `step` is interpreted in **display** units when unit conversion is active (the node converts it) — pass native step; do not pre-convert.
- `percentSlider` works in 0..`max` (use `max: 1` for 0–100%); its `data` is a fraction, not a 0–100 integer.
- The deprecated `data` binding (`{ value, min, max }`) coexists with `value`; prefer `value`. The contract path uses `data.values` internally — that is framework-internal, not something to author.

## Related skills

- `raptor` — parent skill: View/VM split, RSScriptor, `bindings`/`events`, `update()`, `getTypedProp`, `raptorDom.nodeT`.
- `numeric-range-filter.md` — paired min/max number-input filter widget (alternative range UI).
- `time-slider.md` — time-scrubbing slider.
- `svg.md` — for a custom radial/dial control.
- `forms.md` / `select.md` — other input controls and their binding/event conventions.
- `data-store.md` — `IDataStore`/`setFilter` plumbing behind column-range filtering.
