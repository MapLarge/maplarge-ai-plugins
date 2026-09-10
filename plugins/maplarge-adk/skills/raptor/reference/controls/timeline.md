# Raptor Timeline

Two data-driven time-series controls: **TimelineViewer** (binned event-density viewer with brush-to-filter) and **ChangeDetectionTimeline** (line/area chart with auto-detected change markers). Both bind a data source and emit a `Between` filter on the time column. A third node, `Timeline` (type — bare placeholder), has no rendering and is not covered here.

## When to use

- **TimelineViewer** — show how many rows fall in each time bin across a zoomable axis, optionally as drill-down tree rows; let the user drag a range to filter. Use for "activity over time" / "when did things happen" panels.
- **ChangeDetectionTimeline** — surface the *significant shifts* (level shifts, slope reversals, outlier windows) in a metric over time, with annotated markers and a detail panel. Use for "what changed and when" analysis.
- For a single thumb/range picker driven by a VM value (not a data source), use `time-slider.md` instead.

## Builder

### TimelineViewer — `s.timelineViewer(options)`, node `type: "timelineViewer"`

Option interface `IRaptorTimelineViewerOptions<T>` (the full view-def alias is `IRaptorTimelineViewer<T>`). Key fields: `binRenderer`, `showTooltips`, `tooltipDelay`, `animateZoom`, `zoom`, `minZoom`/`maxZoom` (`ml.util.timeRes.ResolutionTypeBounded`), `focalDate`, `rowHeight`, `labelSectionSize`, `showHeaderDates`, `drillDownLevel`, `defaultExpanded`, `usePerRowDimensions`, `labelGeneration` (name of a VM method typed `IRaptorTimelineViewerTimeLabelGenerator`), `minDate`/`maxDate`. Requires a data source (renders a "requires data source" placeholder otherwise).

```ts
s.timelineViewer({
    binRenderer: "Column Sparkline",
    showTooltips: true,
    drillDownLevel: 1,                 // tree-table rows; omit for a flat single row
    bindings: { data: "myTimeSeries", selection: "mySelection" },
})
.dataSource("myDataSource").column("myTimeCol")   // wires the data-set contract
```

The `timelineViewer` data-set contract auto-builds a `TimeSeriesTransform`/`TimeSeriesTreeTransform` from `dataSource` + `column` and attaches a `dataSourceFilterAction` (`test: "Between"`) on that column — so a brushed selection filters the source automatically. You can instead bind `data` directly to a VM-built `ITimeSeriesData`.

### ChangeDetectionTimeline — `s.changeDetectionTimeline(options)`, node `type: "changeDetectionTimeline"`

Option interface `IRaptorChangeDetectionTimelineOptions<T>`. Key fields: `autoConfig` (auto-pick time/measure/bucket), `timeField`, `timeBucket` (`"day" | "month" | "year"`), `measureField`, `aggregation` (`ChangeDetectionAggregation`), `sensitivity` (`ChangeDetectionSensitivity`), `minSignificance`, `maxMarkers` (default 8), `showRegimes`, `showDeltaOverlay`, `showAnnotations`, `compactMode`, `clickBehavior` (`"filterBetween" | "selectOnly"`).

```ts
s.changeDetectionTimeline({
    autoConfig: true,
    sensitivity: "medium",
    maxMarkers: 8,
    clickBehavior: "filterBetween",
    bindings: { data: "myChangeResult", value: "mySelectedMarker" },
})
.dataSource("myDataSource")
```

Its contract registers a `CalcChangeDetectionTimeline` transform producing an `IChangeDetectionTimelineResult` and (when `timeField` resolves) a `Between` filter action on `timeField`.

## Bindings & events

**TimelineViewer** bindings (`IRaptorUniversalBindings` plus): `data` (`ITimeSeriesData`), `minDate`/`maxDate` (`ml.luxon.DateTime`), `selection` (`{ min, max }`, two-way — set it to set the brush, read it on change), `viewportExtents` (`{ min, max }`, two-way — fires on scroll/zoom; set it to fit the viewport). It also fires a `change` event carrying an ISO `min/max-1ms` range string that drives the `Between` filter; brushing to empty clears the filter.

**ChangeDetectionTimeline** bindings: `data` (`IChangeDetectionTimelineResult`), `value` (selected `IChangeDetectionTimelineMarker | null`, two-way). Clicking a marker fires `change` with `filterRangeStartUtc/filterRangeEndUtc` (unless `clickBehavior: "selectOnly"`) and updates `value`; clicking the selected marker again deselects.

## ViewModel / instance API

Both nodes are reached from the VM via the parent skill's `this.raptorDom.nodeT<TimelineViewer>("viewName")` (give the node a `viewName`). `TimelineViewer` implements **`ITimelineBasedControl`** — useful imperative methods: `repaint(resize?)`, `clearSelection()`, `fitToView()`, `fitToSelection(center?)`, `fitToExtents(min, max, center?)`, `panLeft(steps?)`, `panRight(steps?)`, `panToDateTime(dateTime, position?)` (`'start'|'end'|'center'`), `scrollToBeginning()`, `scrollToEnd()`. `ChangeDetectionTimeline` exposes `clearSelection()`.

## Patterns

- **Brush filters a grid/map**: declare `s.timelineViewer(...).dataSource("ds").column("ts")` over the same data source the grid/map reads — the contract's `Between` filter action propagates the brushed range with no extra wiring.
- **Persist + restore viewport**: bind `viewportExtents` (and/or save `zoom`+`focalDate`) to VM fields in `serialize`, and on load set the bound `viewportExtents`; the node calls `fitToExtents` internally to restore.
- **Custom axis labels**: set `labelGeneration: "myLabelFn"` and add `myLabelFn(dateTime, resolution, majorTick) => { text, emphasize? }` to the VM.
- **React to a detected change**: bind ChangeDetection `value` to a VM field, read it in the setter to drive a detail card; leave `clickBehavior: "filterBetween"` to also filter the source.

## Gotchas

- `minZoom`/`maxZoom` take resolution *names* but map to **inverted** internal zoom indices (the node deliberately swaps `min`↔`max` when setting `min-zoom`/`max-zoom` attributes). Set them by intent (smallest/largest visible resolution), not by raw number.
- `drillDownLevel` is what turns flat into tree-table rows; `defaultExpanded` only matters when `drillDownLevel` is set.
- The contract needs the data source to expose at least one string and one numeric column for the tree transform; with fewer it silently skips binding.
- Setting the `selection` binding to anything with a null `min` or `max` clears the brush rather than setting it.
- `ChangeDetectionTimeline` renders raw SVG and uses `--bs-*` CSS variables — it is theme-reactive by default; don't hardcode colors around it.
- `usePerRowDimensions` scales each drill-down row to its own min/max — use it when rows have wildly different magnitudes, otherwise rows share one scale.

## Related skills

- `raptor` — parent: View/VM split, RSScriptor.create, `update()`, `nodeT`, bindings/events mechanics, data sources & `setFilter`.
- `time-slider.md` — sibling single value/range time picker (the other `ITimelineBasedControl`).
- `data-grid.md`, `map.md` — common filter targets for a timeline brush.
- `echarts` — for arbitrary custom time/Gantt charts beyond these two purpose-built nodes.

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## TimelineViewer — full option reference (`IRaptorTimelineViewerOptions<T>`)

| Field | Type | Notes |
| --- | --- | --- |
| `binRenderer` | `'Histogram' \| 'Column Sparkline' \| 'Area Sparkline' \| 'Line Sparkline' \| 'Binary Line' \| 'Binary Dot'` | Bin visualization style. Default `'Column Sparkline'`. |
| `showTooltips` | `boolean` | Show per-bin time tooltip. Default attr `true`. |
| `tooltipDelay` | `number` | ms before tooltip. Default 200. |
| `animateZoom` | `boolean` | Animate zoom transitions. Default attr `true`. |
| `zoom` | `number` | Initial zoom = index into `ml.util.timeRes.ResolutionTypeBounded`. |
| `minZoom` | `ml.util.timeRes.ResolutionTypeBounded` | Min zoom resolution (mapped to inverted internal index). |
| `maxZoom` | `ml.util.timeRes.ResolutionTypeBounded` | Max zoom resolution (mapped to inverted internal index). |
| `focalDate` | `string` (ISO) | Date to center on; pair with `zoom` to restore position. |
| `minDate` / `maxDate` | `ml.luxon.DateTime` | Hard axis bounds (also bindable). |
| `rowHeight` | `number` | px per row. |
| `labelSectionSize` | `number` | px width of the left label column. Default 250. |
| `showHeaderDates` | `boolean` | Show dates in header. |
| `drillDownLevel` | `number` | Levels of tree-table rows; omit for flat. |
| `defaultExpanded` | `boolean` | Start drill-down groups expanded (needs `drillDownLevel`). |
| `usePerRowDimensions` | `boolean` | Scale each row independently. Default false. |
| `labelGeneration` | `string` | VM method name; type `IRaptorTimelineViewerTimeLabelGenerator`. |

`IRaptorTimelineViewerTimeLabelGenerator = (dateTime: ml.luxon.DateTime, resolution: ml.util.timeRes.ResolutionTypeBounded, majorTick: boolean) => { text: string; emphasize?: boolean }`

`ResolutionTypeBounded` values: `'years' | 'quarters' | 'months' | 'halfMonth' | 'weeks' | 'days' | 'quarterDays' | 'hours' | 'quarterHours' | 'fiveMinutes' | 'minutes' | 'quarterMinutes' | 'fiveSeconds' | 'seconds'`. (Editor zoom list excludes `'weeks'`.)

### TimelineViewer bindings

`data: ITimeSeriesData` · `minDate?` · `maxDate?` · `selection?: { min: DateTime; max: DateTime }` (two-way) · `viewportExtents?: { min: DateTime; max: DateTime }` (two-way).

### `ITimeSeriesData` (bound `data` shape)

```ts
readonly fields: ITimeSeriesDataFieldInfo[];
readonly min: ml.luxon.DateTime;
readonly max: ml.luxon.DateTime;
readonly dataHash: string;
retrieveData(opts): Promise<any>;
getDimensions(opts, perRow?): { length; min?; max?; rows?: Map<...> };
```

### TimelineViewer (`ITimelineBasedControl`) instance methods

`repaint(resize?: boolean)` · `clearSelection()` · `fitToView()` · `fitToSelection(center?: boolean)` · `fitToExtents(min, max, center?: boolean)` · `panLeft(steps = 1)` · `panRight(steps = 1)` · `panToDateTime(dateTime, position?: 'start'|'end'|'center')` · `scrollToBeginning()` · `scrollToEnd()`. Plus `applyFilter(value: string | null)`, `set timeSeriesData(value)`.

---

## ChangeDetectionTimeline — full option reference (`IRaptorChangeDetectionTimelineOptions<T>`)

| Field | Type | Default |
| --- | --- | --- |
| `autoConfig` | `boolean` | `true` |
| `timeField` | `string` | auto |
| `timeBucket` | `"day" \| "month" \| "year"` | `"month"` |
| `measureField` | `string` | auto |
| `aggregation` | `ChangeDetectionAggregation` (`"count" \| "sum" \| "avg"`) | `"count"` |
| `sensitivity` | `ChangeDetectionSensitivity` (`"low" \| "medium" \| "high"`) | `"medium"` |
| `minSignificance` | `number` | — |
| `maxMarkers` | `number` | 8 |
| `showRegimes` | `boolean` | true |
| `showDeltaOverlay` | `boolean` | true |
| `showAnnotations` | `boolean` | true |
| `compactMode` | `boolean` | false |
| `clickBehavior` | `"filterBetween" \| "selectOnly"` | `"filterBetween"` |

Bindings: `data?: IChangeDetectionTimelineResult` · `value?: IChangeDetectionTimelineMarker | null` (two-way). View-def defaults include `width: 540, height: 360`.

### Result shape (`IChangeDetectionTimelineResult`)

```ts
dataSourceName: string;
timeField?: string;
timeBucket: "day" | "month" | "year";
measureField?: string;
aggregation: ChangeDetectionAggregation;
metricLabel: string;
buckets: IChangeDetectionTimelineBucket[];
markers: IChangeDetectionTimelineMarker[];
regimes: IChangeDetectionTimelineRegime[];
summaries: IChangeDetectionTimelineSummary[];
emptyMessage?: string;
lastUpdatedUtc?: string;
```

`IChangeDetectionTimelineBucket`: `id, bucketStartUtc, bucketEndUtc, label, value, baselineValue?, delta?, pctChange?, significance?, isChangePoint?`.

`IChangeDetectionTimelineMarker`: `id, type, extraTypes?, title, summary, accent, bucketStartUtc, bucketEndUtc, filterRangeStartUtc, filterRangeEndUtc, significance, value, previousValue?, delta?, pctChange?, stats: IChangeDetectionTimelineStat[], filter?`.

`ChangeDetectionMarkerType = "levelShift" | "slopeReversal" | "outlierWindow" | "largestIncreaseWindow" | "largestDropWindow"`.
`ChangeDetectionAccent = "primary" | "success" | "warning" | "danger" | "info"`.

`IChangeDetectionTimelineRegime`: `id, startUtc, endUtc, label, summary, stabilityScore`.
`IChangeDetectionTimelineSummary`: `id, title, value, summary?`.
`IChangeDetectionTimelineStat`: `label, value`.

Backing transform `CalcChangeDetectionTimeline extends BaseQueryTransform` (options `ICalcChangeDetectionTimelineOptions extends IQueryTransformOptions`, adds `changeTypes?: ChangeDetectionMarkerType[]`). Node instance method: `clearSelection()`.

### Registration facts

- `s.changeDetectionTimeline` is added dynamically via `RSScriptor.register(ChangeDetectionTimeline, ...)` (method name = first-char-lower of the class name), so it is a normal scriptor method like `s.timelineViewer`.
- `s.timelineViewer` is a declared method on the scriptor; node renders the `ml-timeline-viewer` web component.
- Both attach a `dataSourceFilterAction` with `test: "Between"` on their time column; both ignore their own `viewName` filter to avoid self-filtering.
