# dataZoom

A zoom/pan window over an axis. `dataZoom` is a top-level option component (`dataZoom: [...]`), not a series — it restricts the visible range of one or more axes so a dense chart stays readable.

## When to use

- A line/scatter/candlestick/heatmap with more points than pixels: let the user scrub a window instead of cramming everything in.
- Time-series exploration: drag to pan, wheel to zoom, scrollbar to jump.
- Pair `type: "slider"` (visible scrollbar with handles + a data-shadow preview) with `type: "inside"` (wheel/drag inside the plot) so users get both affordances on the same axis.
- Not for color-encoding a value dimension — that is `visualMap` (see **visualmap.md**). Not for a standalone time control outside a chart — that is the Raptor time slider, not this component.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
  grid: { left: 48, right: 16, top: 16, bottom: 64, containLabel: true },
  xAxis: { type: "category", data: Array.from({ length: 200 }, (_, i) => `t${i}`) },
  yAxis: { type: "value" },
  dataZoom: [
    { type: "inside", xAxisIndex: 0, filterMode: "filter", start: 60, end: 100 },
    { type: "slider", xAxisIndex: 0, filterMode: "filter", start: 60, end: 100,
      height: 24, bottom: 16, realtime: true, brushSelect: false }
  ],
  series: [{
    type: "line", showSymbol: false,
    data: Array.from({ length: 200 }, () => Math.round(Math.random() * 100))
  }]
};
```

This zooms the X axis. The `inside` and `slider` entries share `xAxisIndex: 0` and the same `start`/`end`, so dragging either keeps both in sync.

## Data shape

`dataZoom` has **no `data` of its own** — it operates on the series bound to the axis it targets. It only needs to know *which* axis to act on (`xAxisIndex` / `yAxisIndex`, or the `Id` variants) and the window (`start`/`end` percent, or `startValue`/`endValue` in axis units). Leave axis indices off and it defaults to the first horizontal axis.

## Key options (from `ml.echarts.DataZoomComponentOption`)

Shared base (`DataZoomOption`):

- `type` : `"slider" | "inside"` — slider draws a scrollbar component; inside captures wheel/drag on the plot. Use both together.
- `xAxisIndex` / `yAxisIndex` : `number | number[]` — which axis(es) this zoom controls. `xAxisId` / `yAxisId` select by id instead. Also `radiusAxisIndex`/`angleAxisIndex`/`singleAxisIndex` for polar/single.
- `start` / `end` : `number` — window edges as **percent 0–100**.
- `startValue` / `endValue` : `number | string | Date` — window edges in **axis units**; when set, `start`/`end` are ignored.
- `filterMode` : `'filter' | 'weakFilter' | 'empty' | 'none'` — see Gotchas. Default `'filter'`.
- `orient` : `'horizontal' | 'vertical'` — auto-inferred from the targeted axis; set it to override.
- `realtime` : `boolean` — update the chart continuously while dragging (`true`) vs only on release.
- `throttle` : `number` — debounce (ms) for the `dataZoom` event/redraw; default 100.
- `minSpan`/`maxSpan` (percent) and `minValueSpan`/`maxValueSpan` (axis units) — clamp how small/large the window can get.
- `rangeMode` : `['value'|'percent', 'value'|'percent']` — how each edge is interpreted.

Slider-only (`SliderDataZoomOption`, also takes box layout `left/right/top/bottom/width/height`):

- `show` : `boolean` — toggle the slider chrome.
- `height` / `bottom` : size and position the scrollbar (horizontal slider). Reserve room in `grid.bottom`.
- `fillerColor`, `backgroundColor`, `borderColor`, `borderRadius` : the bar colors.
- `dataBackground` / `selectedDataBackground` : `{ lineStyle, areaStyle }` — the mini data-shadow preview.
- `handleStyle`, `handleSize`, `handleIcon`, `moveHandleStyle`, `moveHandleIcon` : drag-handle look.
- `showDetail` : `boolean` — show the value tooltip while dragging. `labelFormatter` : format that label. `showDataShadow` : `'auto' | boolean`.
- `brushSelect` : `boolean` — drag a new range directly on the shadow. `zoomLock` : lock span, pan only.

Inside-only (`InsideDataZoomOption`):

- `disabled` : `boolean` — turn off inside interaction without removing the entry.
- `zoomOnMouseWheel` : `boolean | 'shift' | 'ctrl' | 'alt'` — wheel-to-zoom, optionally requiring a modifier key.
- `moveOnMouseMove` / `moveOnMouseWheel` : `boolean | 'shift' | 'ctrl' | 'alt'` — drag-to-pan / wheel-to-pan.
- `zoomLock` : `boolean` — pan only, fixed span. `preventDefaultMouseMove` : `boolean`.
- Note `textStyle` is typed `never` for inside (no visible label).

## Patterns

**Zoom the Y axis (or both).** Target `yAxisIndex` for a vertical scrollbar; supply two entries (one per axis) for box-zoom feel:

```ts
dataZoom: [
  { type: "inside", xAxisIndex: 0 }, { type: "inside", yAxisIndex: 0 },
  { type: "slider", xAxisIndex: 0, bottom: 8 },
  { type: "slider", yAxisIndex: 0, orient: "vertical", right: 8 }
]
```

**Window by value instead of percent.** For a date axis, set `startValue`/`endValue` so the default view is a fixed range regardless of data length:

```ts
{ type: "slider", xAxisIndex: 0, startValue: "2026-01-01", endValue: "2026-03-31" }
```

**Wheel-zoom only with a modifier** so plain scrolling still scrolls the page:

```ts
{ type: "inside", xAxisIndex: 0, zoomOnMouseWheel: "ctrl", moveOnMouseMove: true }
```

**Persist the window across re-renders.** Reading the option object is the source of truth. Capture from the `dataZoom` event and feed it back into your option fragment on next build:

```ts
chart.on("dataZoom", () => {
  const dz = chart.getOption().dataZoom as ml.echarts.DataZoomComponentOption[];
  this._savedZoom = { start: dz[0].start, end: dz[0].end };
});
```

The event fires for both batched (`p.batch`) and single zooms; debounce with `throttle`. Restore by setting `start`/`end` from `this._savedZoom` in the dataZoom entries you return.

## Gotchas

- **`filterMode` changes what zooming does to the *other* axis.** `'filter'` (default) removes out-of-window points entirely, so a zoomed line's Y axis rescales to the visible subset — usually what you want. `'empty'` keeps the layout but blanks filtered points (breaks the line). `'weakFilter'` only drops a point if *all* its dims are off the same side (good for interval/candlestick). `'none'` clips visually but keeps every point in axis-range calculations. If your Y axis "won't rescale on zoom," you have `'none'`/`'empty'`.
- **`startValue`/`endValue` win over `start`/`end`.** Setting both does not combine — the value pair silently overrides the percent pair.
- **Slider needs grid room.** A horizontal slider sits *below* the plot; if `grid.bottom` is too small the scrollbar overlaps axis labels. Reserve space (e.g. `grid.bottom: 64`, slider `bottom: 16`).
- **Multiple dataZoom entries on one axis must agree.** A common bug is a `slider` and `inside` on the same `xAxisIndex` with different `start`/`end` — they fight. Give both the same window.
- **It is a merge.** Re-emitting an option without the `dataZoom` key leaves the old window in place; return the full `dataZoom` array each build (see parent skill's notMerge note).
- **`textStyle` is unsupported on `inside`** (typed `never`); put labels on the `slider` entry.

## Related skills

- `echarts` — parent: the option model, `s.chart` wiring, `onChartCreated`, and setOption merge behavior.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart node mounts in a Raptor view and where the `dataZoom` event is wired.
- `visualmap.md` — sibling component; map a value dimension to color rather than restrict an axis range.
- `line.md`, `scatter.md`, `candlestick.md` — the dense series types most often paired with a dataZoom.
