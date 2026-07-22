# Raptor Date & Time

Two controls: `s.dateTime` (a single date/time picker) and `s.dateFilter` (a from–to range filter, usually attached to a data source). Both speak **luxon** (`ml.luxon.DateTime`), not native `Date`.

## When to use
- **`dateTime`** — pick one moment (a "Select date" field, an "as-of" timestamp). Single value in/out.
- **`dateFilter`** — pick a start/end range. It is a `@LateBoundNode` filter: when bound to a data source it emits a filter string and also writes back a `{ start, end }` range. Has built-in quick filters (Last Hour/Week/etc.) and an All-Day toggle.

For a draggable time-scrubber over a time series, use `time-slider.md` instead.

## Builder

### `s.dateTime(options: IRaptorDateTime)` → node `type: "dateTime"`
Key fields on `IRaptorDateTime` (extends `IViewDefinition`):
`minDate` / `maxDate` (`DateLikeObject`), `showTime` (default true), `military` (24h ZULU, overrides user TZ), `timeZone` (static override), `clearable` (allow empty + X button), `buttonOnly` (icon only, no text field), `borderless`, `small`, `placeholder`, `label` (`ILabel`), `dateFormat` (luxon format string), `showCloseButton`, `allowDisableDates`, `autoOpen`.

```ts
s.dateTime({
    viewName: "asOf",
    showTime: true,
    clearable: true,
    placeholder: "Select date",
    bindings: { value: s.getTypedProp(vm => vm.asOf) },
    events: [{ event: "change", handler: vm => vm.onAsOfChanged }],
});
```

### `s.dateFilter(options: IRaptorDateFilter)` → node `type: "dateFilter"`
`IRaptorDateFilter` = `IRaptorDateFilterOptions`. Key fields:
`minDate` / `maxDate` / `startDate` / `endDate` (`DateLikeObject`), `showQuickFilters` (default shows Last Hour/Week…), `showTime`, `military`, `clearable`, `placeholder`, `small`, `buttonOnly`, `borderless`, `dateFormat`, `showCloseButton`, `dualNavigationButtons`, `timeZone`, `label`, and `constrainMinAndMaxToData` (when bound to a data source, clamp min/max to the data's time span).

```ts
s.dateFilter({
    viewName: "rangeFilter",
    showQuickFilters: true,
    bindings: {
        dataSource: s.getTypedProp(vm => vm.myDataSource),   // makes it filter that source
        value: s.getTypedProp(vm => vm.range),               // {start,end} writeback
    },
});
```

## Bindings & events
**`dateTime`** (`IRaptorDateTimeBinding` + universal): `value` (`ml.luxon.DateTime | ToObjectOutput`), `disable` (boolean), `timeZone` (string), and deprecated `data` (`IRaptorDateTimeOptions`, i.e. `{ selectedDate }`). Prefer `value`.

**`dateFilter`** (`IRaptorDateFilterBinding` + universal): `value` (`DateFilterRange` = `{ start, end }`), `allowedDates` (`DateFilterRange` — the selectable min/max window), plus `dataSource` from universal bindings to act as a filter; deprecated `data` (`IRaptorDateFilterBindingData` `{ startDate, endDate, minDate, maxDate, timeZone }` or `ITimeSeriesData`).

**Events:** both accept `Events.IEvent_Input[]` — `event: "change"` (fires after a value/range is committed) and `"input"`. Handlers get the new value (a `DateTime`, or `{start,end}` for the filter).

`DateLikeObject = ml.luxon.ToObjectOutput | Partial<ToObjectOutput> | ml.luxon.DateTime` — you may pass a `DateTime` or a plain `{ year, month, day, … }` object anywhere a date option/binding is expected.

## ViewModel / instance API
Reach the live node: `this.raptorDom.nodeT<DateFilter>("rangeFilter")` (or `<DateTime>`).

`DateFilter` public surface: `startDate` / `endDate` / `originalStartDate` / `originalEndDate` getters+setters (`DateTime | undefined`), `allDayChecked`, `timeZone`, `military`, `showTime`, `buttonOnly`, `borderless`, `timeSeriesData`, and methods `updateSelectedRange(start, end)` (accepts luxon **or** moment), `updateFilter()`, `applyFilter(filterValue)`. The emitted filter string is `"<startISO>/<endISO-1ms>"`.

`DateTime` public surface: `selectedDate` (`DateTime | undefined`), `minDate` / `maxDate`, `timeZone`, `open`, `togglePopup()`, `removePopup()`. The popup is the `ml-date-time` web component, which fires a `valueChange` CustomEvent internally.

`DateTimeViewModel` (the registered VM for the standalone node) holds `dateTimeState` (`{ selectedDate, minDate?, maxDate? }`) and `userContext`.

## Patterns
**Two-way bind a picker.** Type the VM property as `ml.luxon.DateTime | undefined`; bind `value`. The control writes back via `updateBoundValue("value", …)` on selection, then fires `change`.

```ts
// VM
private _asOf: ml.luxon.DateTime | undefined = ml.luxon.DateTime.now();
get asOf() { return this._asOf; }
set asOf(v) { this._asOf = v; }
```

**Range filter on a data source.** Bind `dataSource` so the control auto-applies a date filter; optionally also bind `value` to mirror the chosen range in the VM for serialization. Set `constrainMinAndMaxToData: true` to clamp the calendar to the data's span.

**Constrain selectable dates.** Pass `minDate` / `maxDate` as luxon objects: `minDate: ml.luxon.DateTime.now().minus({ day: 7 }).toObject()`. For `dateFilter` the same window can come from the `allowedDates` binding.

**Programmatic set.** `raptorDom.nodeT<DateFilter>("rangeFilter").updateSelectedRange(start, end)` then it fires the filter; for the picker, set `value` on the VM and `update("asOf")`.

## Gotchas
- **Luxon, not Date/moment.** Values are `ml.luxon.DateTime` (or `ToObjectOutput`). `updateSelectedRange` tolerates moment but the bindings do not — normalize with `ml.luxon.DateTime.fromISO(...)`.
- **Timezone precedence:** binding `timeZone` > nodeModel `timeZone` > user context timezone. `military: true` forces 24h ZULU regardless. Selecting a value re-zones it, so a `change` can fire on timezone change alone.
- **`clearable: false` on the picker** auto-fills `now()` when empty — you can never have a null value unless `clearable` is true.
- **`dateFilter` is late-bound** and registers a `TimeSeriesDataSetContract`; without a `dataSource` (or `value`/`allowedDates`) binding it renders a "requires data source" message in the editor.
- The deprecated `data` binding (object shapes) still works but prefer `value` / `allowedDates`.
- `dateFormat` is a **luxon** format string (e.g. `"yyyy-LL-dd"`), not a moment one.

## Related skills
- **`raptor`** — parent: View/VM split, RSScriptor, bindings, `update()`, `nodeT`, data sources.
- **`time-slider.md`** — scrub a continuous time range over a time series (`ITimeSeriesData`).
- **`timeline.md`** — event timelines.
- **`forms.md`**, **`numeric-range-filter.md`** — sibling input/filter controls.
- **`echarts`** — when a date control drives a chart's axis/dataZoom.

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## IRaptorDateTime — full option table (extends ViewDefinitions.IViewDefinition)

| Field | Type | Notes |
|---|---|---|
| `minDate` | `DateLikeObject` | earliest selectable |
| `maxDate` | `DateLikeObject` | latest selectable |
| `clearable` | `boolean` | allow empty + render clear (X) button; if false, empty falls back to `now()` |
| `showTime` | `boolean` | default true; false = date only |
| `military` | `boolean` | 24h ZULU, overrides user timezone display |
| `timeZone` | `string` | static timezone override |
| `small` | `boolean` | compact button/field |
| `placeholder` | `string` | text when no value (default "Select date") |
| `label` | `ViewDefinitions.ILabel` | rendered like a form input label |
| `buttonOnly` | `boolean` | icon-only, no text value shown |
| `borderless` | `boolean` | remove input-group border |
| `dateFormat` | `string` | luxon `DateTime.toFormat` string |
| `showCloseButton` | `boolean` | X in popup top-right (default false) |
| `allowDisableDates` | `boolean` | strike-through disabled dates |
| `autoOpen` | `boolean` | open popup on first mount |

`IRaptorDateTimeBinding`: `value?` (`DateTime | ToObjectOutput | Partial<ToObjectOutput>`), `data?` (deprecated, `IRaptorDateTimeOptions`), `disable?` (boolean), `timeZone?` (string).
`IRaptorDateTimeOptions`: `{ selectedDate: ToObjectOutput | Partial<ToObjectOutput> | DateTime }`.

## IRaptorDateFilter — full option table (= IRaptorDateFilterOptions, extends IViewDefinition)

| Field | Type | Notes |
|---|---|---|
| `startDate` / `endDate` | `DateLikeObject` | initial selected range |
| `minDate` / `maxDate` | `DateLikeObject` | allowable bounds |
| `constrainMinAndMaxToData` | `boolean` | clamp bounds to bound data source's min/max (editor default true) |
| `showQuickFilters` | `boolean` | show Last Hour/Week/etc. presets |
| `showTime` | `boolean` | default true; allow time editing |
| `military` | `boolean` | 24h selection |
| `clearable` | `boolean` | reset to no start/end |
| `placeholder` | `string` | text when empty (default "Select range") |
| `small` | `boolean` | compact |
| `buttonOnly` | `boolean` | hide value output |
| `borderless` | `boolean` | remove border |
| `dateFormat` | `string` | luxon format string |
| `showCloseButton` | `boolean` | X in popup |
| `dualNavigationButtons` | `boolean` | prev/next per calendar |
| `timeZone` | `string` | timezone override |
| `label` | `ViewDefinitions.ILabel` | field label |

`IRaptorDateFilterBinding`: `value?` (`DateFilterRange`), `allowedDates?` (`DateFilterRange`), `data?` (deprecated: `IRaptorDateFilterBindingData` or `ITimeSeriesData`).

## Shared types
```ts
type DateLikeObject = ml.luxon.ToObjectOutput | Partial<ml.luxon.ToObjectOutput> | ml.luxon.DateTime;
interface DateFilterRange { start: DateLikeObject | null; end: DateLikeObject | null; }
interface IRaptorDateFilterBindingData {  // @deprecated
    startDate?: DateLikeObject; endDate?: DateLikeObject;
    minDate?: DateLikeObject;   maxDate?: DateLikeObject;  timeZone?: string;
}
interface QuickRange {            // a preset row in the dateFilter popup
    label: string; cssClass?: string;
    getStartDate: () => ml.luxon.DateTime;
    getEndDate:   () => ml.luxon.DateTime;
}
```

## DateFilter node — useful members
- Getters/setters: `startDate`, `endDate`, `originalStartDate`, `originalEndDate` (`DateTime | undefined`); `allDayChecked` (setting true snaps to start-of-day / end-of-day and rebuilds quick filters); read-only `timeZone`, `military`, `showTime`, `buttonOnly`, `borderless`; `timeSeriesData` (`ITimeSeriesData`).
- Methods: `updateSelectedRange(start, end)` (luxon or moment) → sets range, calls `updateFilter()` + redraws; `updateFilter()` → applies filter string + writes back `value` `{start,end}`; `applyFilter(filterValue: string | null)` → fires the `change` event with the value.
- Emitted filter string format: `` `${startDate.toISO()}/${endDate.minus({millisecond:1}).toISO()}` ``.

## DateTime node — useful members
- `selectedDate` (`DateTime | undefined`), `minDate`/`maxDate` (`DateTime`), `timeZone`, `open` (bool), `togglePopup()`, `removePopup()`, `showCloseButton`.
- Popup is the `ml-date-time` custom element (`dom.defineCustomElement('ml-date-time', DateTimeWebComponent)`); it dispatches a `valueChange` `CustomEvent` whose `detail` is the selected `DateTime`. Web-component attributes set by the node: `value`, `min-date`, `max-date`, `show-time`, `military`, `time-zone`, `data-date-disable`.

## Reaching instances
```ts
const filter = this.raptorDom.nodeT<DateFilter>("rangeFilter");
const picker = this.raptorDom.nodeT<DateTime>("asOf");
```
