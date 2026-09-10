# Time Slider

A zoomable, pannable time-density chart (histogram / sparkline of a datetime column) with a draggable brush selection used for time animation and date-range filtering of a data source.

## When to use

- Scrub or animate a time window over map layers, a grid, or a chart and filter records to the brushed range.
- Show temporal density (counts per time bin) for a datetime column with zoom across resolutions (years to seconds).
- For a single chronological list of discrete events rather than a binned density+brush, prefer `timelineViewer` (the sibling control sharing `ITimelineBasedControl`).

## Builder

RSScriptor method `s.timeSlider(options)` → node `type: "timeSlider"`, root custom element `<ml-time-slider>`, backed by the `TimeSlider` RaptorNode (`viewModel: TimeSliderViewModel`). Options type `IRaptorTimeSliderOptions` (the full node model `IRaptorTimeSlider` also carries `viewName`, `height`, etc. from `IViewDefinition`).

Key option fields (full table in the Reference section below):

- `binRenderer` (required): `'Histogram' | 'Column Sparkline' | 'Area Sparkline' | 'Line Sparkline' | 'Binary Line' | 'Binary Dot'`.
- `zoomResolution?: DefaultResolutionTypes`, `zoom?: number` — initial zoom; `minZoom?`/`maxZoom?` are `DefaultResolutionTypes` string values bounding allowed zoom.
- `focalDate?: string` (ISO) — center on load (restore saved state); `minDate?`/`maxDate?: ml.luxon.DateTime` — clamp rendered range.
- `showTooltips?`, `allowCollapse?`, `animateZoom?` (booleans), `defaultColor?: string`, `timeResolutionKey?: string` (key registered via `raptorEngine.addTimeResolutions(key, ITimeResolution[])`).

```ts
// View
s.timeSlider({
    viewName: "myTimeSlider",
    height: 120,
    binRenderer: "Column Sparkline",
    showTooltips: true,
    zoomResolution: DefaultResolutionTypes.Days,
    bindings: {
        data: s.getTypedProp("myTimeSeries"),       // TimeSeriesDataSource | null
        selection: s.getTypedProp("mySelection"),    // { min, max } two-way
    },
    events: [
        { event: "change", handler: "onMyTimeChanged" },
        { event: "initialized", handler: "onMyTimeInit" },
    ],
});
```

## Bindings & events

Binding keys (`IRaptorTimeSliderOptions.bindings`, plus the universal set):

- `data`: `TimeSeriesDataSource | null` — the binned datetime data driving the chart (see Patterns for how to build one).
- `minDate` / `maxDate`: `ml.luxon.DateTime` — clamp the visible axis.
- `selection`: two-way `{ min: DateTime, max: DateTime }` — the brushed window; writing it calls `setDateRange`, writing `null`/null-members clears it.
- `viewportExtents`: two-way `{ min, max }` — fires when scroll/zoom changes the viewport; writing fits the viewport to the given extents.

Events (`IEvent_TimeSlider.event`): `'initialized'`, `'change'`, plus pointer/change event types. The `change` handler receives an ISO interval string `"<minISO>/<maxISO>"` (the max is rounded down by 1ms so the end instant is excluded), or `null` when the brush is cleared — ideal to feed a `Between` data-source filter.

## ViewModel / instance API

Backing node class `TimeSlider` (implements `ITimelineBasedControl`); the bound VM base is `TimeSliderViewModel` (holds `timeSeriesData`, `userTimezone`). Reach the live node for imperative control:

```ts
const ts = this.raptorDom.nodeT<TimeSlider>("myTimeSlider");
ts?.fitToView();
ts?.panToDateTime(someDateTime, "center");
ts?.clearSelection();
const range = ts?.getDateRange();   // { min, max } | undefined
```

Useful methods: `getDateRange()`, `getZoom()`/`setZoom(n)`/`setZoomResolution(DefaultResolutionTypes)`, `fitToView()`, `fitToSelection(center?)`, `fitToExtents(min,max,center?)`, `panLeft(steps?)`/`panRight(steps?)`, `scrollToBeginning()`/`scrollToEnd()`, `panToDateTime(dt, 'start'|'end'|'center')`, `repaint(resize?)`, `clearSelection()`. (Full list in the Reference section below.)

## Patterns

**1. Config-driven (auto-wired filter).** The node ships a `TimeSeriesDataSetContract('_tvsm')` requiring `dataSource` + a DATETIME `column`. When set via the config editor it auto-creates a `TimeSeriesTransform`, binds `data`, and registers a `dataSourceFilterAction` with `test: "Between"` — brushing filters the source with no extra code. Just place `s.timeSlider({ binRenderer, viewName })` and configure its data set.

**2. Manual data source in code.** Build the `TimeSeriesDataSource` yourself and bind it:

```ts
this._tsTransform = new TimeSeriesTransform(this, "myTimeSeries", {
    dataSource: "myDs", column: "event_time",
});
// getter `get myTimeSeries() { return this._tsTransform.timeSeries; }` → bind to `data`
```

In the `change` handler, parse the `"<min>/<max>"` ISO string and call `dataStore.setFilter(...)` (or your own `Between` query) on the target source.

**3. Bottom-docked dialog.** For a transient slider, use `TimeSliderDialogViewModel.open(opts)` (static) with `ITimeSliderDialogOpenOptions` (`{ raptorEngine, raptorDom, hostVM, dataSourceName, dateColumn, onFilterChanged, singleton?, position? }`). It builds its own `TimeSeriesTransform` on `hostVM`, renders via `renderDialogVM`, docks at the viewport bottom, and de-dupes when `singleton` (default).

## Gotchas

- `minZoom`/`maxZoom` are deliberately swapped internally (the user-facing min/max map to inverted indices into `DefaultTimeResolutions`); set them by `DefaultResolutionTypes` value, not by index.
- The `change` payload is an ISO **interval string**, not a `{min,max}` object — use the `selection` binding if you want the object form.
- `'weeks'` is excluded from the editor's selectable zoom levels.
- The control requires a data source; without one it renders a "requires data source" placeholder (`RaptorNodeUtils.makeNodeRequireDataSource`). The loading overlay mounts inside `.ml-tl-view`, not on the host element.
- `viewportExtents` writeback is suppressed briefly (~50ms) after you write extents in, to avoid feedback loops from the async `fitToExtents`.

## Related skills

- `raptor` — parent skill (View/VM split, RSScriptor, bindings/events, `nodeT`, dialogs).
- `timeline.md` — sibling timeline viewer sharing `ITimelineBasedControl`.
- `date-time.md` — date pickers / `dateFilter` used alongside the slider (e.g. in the dialog header).
- `map.md` / `data-grid.md` — the typical filter targets a time selection drives.
- `echarts` — for general (non-time-brush) charting.

---

## time-slider.md — reference

## `IRaptorTimeSliderOptions` — full option fields

| Field | Type | Notes |
| --- | --- | --- |
| `binRenderer` | `'Histogram' \| 'Column Sparkline' \| 'Area Sparkline' \| 'Line Sparkline' \| 'Binary Line' \| 'Binary Dot'` | Required. Editor default `'Column Sparkline'`. |
| `minDate` | `ml.luxon.DateTime` | Lower clamp; dates below are not rendered. |
| `maxDate` | `ml.luxon.DateTime` | Upper clamp. |
| `showTooltips` | `boolean` | Hover tooltips. |
| `allowCollapse` | `boolean` | Allow collapsing the control. |
| `animateZoom` | `boolean` | Smooth vs instant zoom. |
| `focalDate` | `string` (ISO) | Center on initial load — use for saved state. |
| `zoom` | `number` | Initial zoom resolution index. |
| `zoomResolution` | `DefaultResolutionTypes` | Initial zoom resolution. |
| `minZoom` | `string` (`DefaultResolutionTypes` value) | Minimum resolution allowed. |
| `maxZoom` | `string` (`DefaultResolutionTypes` value) | Maximum resolution allowed. |
| `timeResolutionKey` | `string` | Key of resolutions registered via `RaptorEngine.addTimeResolutions`. |
| `defaultColor` | `string` | Default bar/line color (hex/rgb/rgba). |

`viewDefinitionDefaults` baked into the node: `binRenderer: 'Column Sparkline'`, `minZoom: Seconds`, `maxZoom: Years`.

## `DefaultResolutionTypes` (enum `ml.util.timeRes.DefaultResolutionTypes`)

```ts
Years = "years"
Quarters = "quarters"
Months = "months"
HalfMonths = "halfMonth"
Weeks = "weeks"            // excluded from editor zoom levels
Days = "days"
QuarterDays = "quarterDays"
Hours = "hours"
QuarterHours = "quarterHours"
FiveMinutes = "fiveMinutes"
Minutes = "minutes"
QuarterMinutes = "quarterMinutes"
FiveSeconds = "fiveSeconds"
Seconds = "seconds"
```

The ordered set lives in `DefaultTimeResolutions: ITimeResolution[]` (years → seconds). `minZoom`/`maxZoom` resolve to indices into this array and are intentionally inverted when applied to the web component's `min-zoom`/`max-zoom` attributes.

## Bindings (`IRaptorTimeSliderOptions.bindings`)

| Key | Value type | Direction | Effect |
| --- | --- | --- | --- |
| `data` | `TimeSeriesDataSource \| null` | in | Binned datetime data; sets `timeSeriesData` on the node. |
| `minDate` | `ml.luxon.DateTime` | in | `@BindingHandler('minDate')` → clamp axis. |
| `maxDate` | `ml.luxon.DateTime` | in | `@BindingHandler('maxDate')`. |
| `selection` | `{ min: DateTime, max: DateTime }` | two-way | In: `setDateRange`/`clearSelection`. Out: written on `rangeChange`. |
| `viewportExtents` | `{ min: DateTime, max: DateTime }` | two-way | In: `fitToExtents`. Out: written on `stateChange` (scroll/zoom). |

Also accepts the universal binding set (`visible`, etc. via `IRaptorUniversalBindings`).

## Events (`IEvent_TimeSlider.event`)

- `'initialized'` — fired once the web component is ready.
- `'change'` (`ChangeEventType`) — handler receives `"<minISO>/<maxISO>"` (end minus 1ms) or `null` on clear.
- `PointerEventTypes` — pointer interactions on the control.

## `TimeSlider` node — full public method list (`implements ITimelineBasedControl`)

| Method | Signature | Purpose |
| --- | --- | --- |
| `getDateRange()` | `() => { min, max } \| undefined` | Current brushed range. |
| `getZoom()` | `() => { zoom: number, resolution: DefaultResolutionTypes } \| undefined` | |
| `setZoom(zoom)` | `(number) => void` | Set zoom by index. |
| `setZoomResolution(zoom)` | `(DefaultResolutionTypes) => void` | Set zoom by resolution. |
| `fitToView()` | `() => void` | Zoom so all data fits width. |
| `fitToSelection(center?)` | `(boolean=false) => void` | Fit + pan to brush. |
| `fitToExtents(min,max,center?)` | `(DateTime,DateTime,boolean=false) => void` | Fit to arbitrary extents. |
| `panLeft(steps?)` / `panRight(steps?)` | `(number=1) => void` | Pan by minor ticks. |
| `scrollToBeginning()` / `scrollToEnd()` | `() => void` | Jump to data min/max. |
| `panToDateTime(dt,position?)` | `(DateTime, 'start'\|'end'\|'center'='start') => void` | |
| `repaint(resize?)` | `(boolean=false) => void` | Force redraw. |
| `clearSelection()` | `() => void` | Remove the brush. |

Editor context menu action `timeSlider:clearSelection` ("Clear selection") clears the brush + nulls the `selection` binding + fires `change(null)`.

Reach it: `this.raptorDom.nodeT<TimeSlider>("viewName")`.

## Data plumbing

- `TimeSeriesTransform(vm, name, { dataSource, column, dataSourceOptions?, defaultTimeExtentsOnMissing? })` — register on a `DynamicViewModel`; its `.timeSeries` getter is the `TimeSeriesDataSource` to bind to `data`.
- `TimeSeriesDataSource` (extends `BaseTimeSeriesData`, implements `ITimeSeriesData`): getters `min`/`max` (`DateTime`), `fields`, `dataHash`; `setDataSource(ds, dateTimeColumn)`, `updateDefaultExtentsOnMissing({min,max})`. Construct with `ITimeSeriesDataSourceOptions` (`drillDownColumns?`, `additionalAggregateExpressions?`, `viewModelFactory?`, `defaultTimeExtentsOnMissing?`).
- `MultiSourceTimeSeriesData` + `IMultiSourceTimeSeriesConfig` ({ sources: [{ dataSource, dateTimeColumn, valueColumn, label?, aggregateExpression? }], defaultTimeExtentsOnMissing? }) overlays multiple series.
- Config-editor auto-wire: `TimeSeriesDataSetContract('_tvsm')` requires `dataSource` + DATETIME `column`, registers a `TimeSeriesTransform`, binds `data`, wires `change` → a `dataSourceFilterAction` with `test: "Between"`.

## TimeSliderDialog

- `ITimeSliderDialogConfig`: `{ dataSourceName, dateColumn, title?, binRenderer?, width?=1050, height?=120, timeZone?='UTC', onFilterChanged?(range|null), onClose?() }`.
- `ITimeSliderDialogOpenOptions extends ITimeSliderDialogConfig`: adds `{ raptorEngine, raptorDom, hostVM, singleton?=true, position?='bottom'|'default' }`.
- `TimeSliderDialogViewModel.open(opts)` (static) → `{ vm, dialogInfo } | null`; builds a `TimeSeriesTransform` on `hostVM` (ignoring its own selection filter so the axis doesn't auto-zoom), renders via `raptorEngine.renderDialogVM`, docks at viewport bottom, de-dupes when singleton. Other members: `configure(hostVM, config)`, `closeDialog()`, `dispose()`, getters `timeSliderDataSource`, `timeSliderDateRange` (`IRaptorDateFilterBindingData`), `timeSliderZoomSelectionVisible`, `timeSliderClearButtonVisible`; handlers `onTimeSliderChanged`, `onTimeSliderInitialized`, `onZoomSelectionTimeSlider`, `onClearTimeSlider`. The dialog header pairs the slider with a `dateFilter` and Zoom-To-Selection / Clear buttons.
