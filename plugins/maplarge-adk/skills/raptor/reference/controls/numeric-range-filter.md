# NumericRangeFilter

A unit-aware min/max numeric range filter: two numeric inputs (Min / Max), an optional unit-selection dropdown, and an optional embedded range slider. It displays values in the user's preferred unit while filtering in the column's native unit, converting between them automatically.

## When to use
- A "between two numbers" filter for a numeric column (counts, distances, durations, angles, areas, etc.).
- The column carries unit metadata (`IUnitInfo`) and you want users to view/enter values in their preferred unit (e.g. miles vs km) while the underlying filter stays in native units.
- You need a compact min/max control, optionally with a draggable two-handle slider, that writes the chosen native range back to a ViewModel for use in a data query/filter.

For a bare two-handle slider with no unit logic, use the plain slider (see `slider.md`). For a categorical/list filter use `quick-select.md` / `select.md`.

## Builder
Builder method: `s.numericRangeFilter({...})`; node `type: "numericRangeFilter"`. Option interface: `INumericRangeFilter` (extends `ViewDefinitions.IViewDefinition`).

Key option fields:
- `dataSourceName?: string`, `columnName?: string` — used to auto-resolve `IUnitInfo` from the data store's column metadata when `unitInfo` is not passed explicitly.
- `unitInfo?: ml.data.table.IUnitInfo` — explicit unit metadata (overrides data-source resolution).
- `dataMin?` / `dataMax?: number` — data-range bounds in native units (drive the slider's min/max).
- `filterMin?` / `filterMax?: number` — initial filter values in native units.
- `step?: number` — step for the numeric inputs.
- `label?: ViewDefinitions.ILabel<"true">` — optional label rendered above the control.
- `showSlider?: boolean` — when true, renders an additional two-handle range `slider` below the inputs.
- `events?: Events.IEvent_Input[]`, `bindings?: Bindings.IRaptorUniversalBindings & INumericRangeFilterBindings`.

```ts
// In a View
s.numericRangeFilter({
    viewName: "rangeFilter",
    label: { text: "Distance" },
    step: 1,
    showSlider: true,
    bindings: {
        dataRange: "myThingRange",   // { min, max } in native units
        minValue:  "myThingMin",     // native units, two-way
        maxValue:  "myThingMax",
        unitInfo:  "myThingUnitInfo" // ml.data.table.IUnitInfo
    }
});
```

## Bindings & events
Binding interface `INumericRangeFilterBindings` (each is a `@BindingHandler` on the node, so each supports writeback):
- `minValue: number` — current filter min, in **native** units. Two-way: user edits push native min back via `updateBoundValue("minValue", ...)`.
- `maxValue: number` — current filter max, in **native** units. Two-way.
- `dataRange: { min: number; max: number }` — the data-source's native min/max; sets the slider bounds (`vm.setDataRange`). Initializes filter values on first set.
- `unitInfo: ml.data.table.IUnitInfo` — supplies/updates unit metadata (`vm.setUnitInfo`).
Plus all `IRaptorUniversalBindings` (visibility/class/etc.).

Events: `Events.IEvent_Input` (change / input / pointer / keyboard). Internally the inputs wire `change → onMinChange/onMaxChange` and the slider `change → onSliderChange`; all funnel into `applyFilter`, which converts display→native and calls the node's `applyFilter(nativeMin, nativeMax)`. That fires the declarative `change` event (`fireChangeEvent({ min, max })`) and writes back `minValue`/`maxValue`. Subscribe to the node's `change` event to react to the chosen native range.

## ViewModel / node API
- Node class: `NumericRangeFilter extends RaptorNodeBase<INumericRangeFilter>`. Reach it with `this.raptorDom.nodeT<NumericRangeFilter>("rangeFilter")`. Useful members: `get unitInfo` (resolved `IUnitInfo | null`), `get dataSourceName`, `get columnName`, and `applyFilter(nativeMin, nativeMax)` (fires change + writes back the bound min/max).
- Backing VM: `NumericRangeFilterViewModel extends RaptorViewModel` (auto-instantiated by the node). Display-unit state lives here:
  - getters `displayUnit`, `unitList: { unit }[]`, `displayMin`/`displayMax`, `dataMin`/`dataMax`, `sliderValue: [number, number]`, `userPreference`.
  - `setDataRange(min, max)`, `setUnitInfo(info)`, `setFilterMin(native)`, `setFilterMax(native)`, `unitSelected({ unit })`.
  - Conversion uses `ml.util.Conversions.convertUnits(value, type, fromUnit, toUnit)`; the unit list comes from `ml.util.unitOf(type).units`. Display unit priority: explicit `IUnitInfo.displayUnit` → user `units` preference for the type → native `unit`.

`IUnitInfo` shape: `{ type: string; unit: string; displayUnit?: string; precision?: number; nearestDecimal?: number }`.

## Patterns
1. **Data-source-driven, unit-aware.** Pass `dataSourceName`/`columnName`; the node reads `dataSource.columnMetaData[col].unitInfo`. Bind `dataRange` to the column's native min/max (from your data query) so the slider auto-scales, and bind `minValue`/`maxValue` to VM fields you fold into your filter query.
2. **Drive a data-store filter.** Wire a `change` event handler (or watch `minValue`/`maxValue`) and translate the native `{ min, max }` into a numeric `between` predicate / stored filter on your `IDataStore` (see `data-store.md`).
3. **Inputs only, fixed unit.** Pass an explicit `unitInfo` with `displayUnit === unit` (no conversion) and omit `showSlider` for a minimal two-box numeric range with a `step`.

## Gotchas
- `minValue`/`maxValue` bindings are in **native** units; the displayed values are converted. Don't read the input text expecting native units — read the bound native values or the node's `change` payload.
- The unit dropdown only renders when the resolved `unitInfo.type` is set; with no unit metadata you get just the two inputs (and slider if enabled).
- Writeback requires the `@BindingHandler` contract: only `minValue`/`maxValue` write back. `dataRange`/`unitInfo` are inbound-only in practice.
- First `setDataRange` initializes filter values only when both display min and max are still 0 — pass `filterMin`/`filterMax` or pre-set the bound values if you need a different initial selection.
- The slider sub-node reuses the standard range slider; its `min`/`max`/`value` are bound to the VM's display-unit `dataMin`/`dataMax`/`sliderValue`, so its handles move when the user changes units.

## Related skills
- `raptor` — parent: View/VM split, RSScriptor DSL, bindings/events, `@BindingHandler`, `update()`.
- `slider.md` — the underlying two-handle range slider used when `showSlider` is true.
- `data-store.md` — turning the chosen native range into a data-source filter.
- `quick-select.md`, `select.md`, `date-time.md` — sibling filter controls for categorical/date filtering.
