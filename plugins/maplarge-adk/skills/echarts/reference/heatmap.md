# Heatmap

A grid of colored cells (or a smoothed density field over a map) where each cell's color encodes a numeric value. `type: "heatmap"`, typed `ml.echarts.HeatmapSeriesOption`. **Always pair with a `visualMap`** — without one, cells render flat gray.

## When to use

- A value over **two categorical/discrete dimensions**: hour-of-day x day-of-week activity, confusion matrix, correlation grid, status-by-asset matrix, coverage/availability over time slots. → `coordinateSystem: "cartesian2d"`.
- **Geographic density** (point intensity smoothed into a blob over a map). → `coordinateSystem: "geo"` with `blurSize`/`pointSize`.
- A **calendar** value-per-day grid (GitHub contributions style). → `coordinateSystem: "calendar"` (add a top-level `calendar` component).

Use a different skill when:
- Both axes are continuous and points are sparse → **scatter.md** (or `effectScatter` for emphasis).
- Only one axis is categorical and you want magnitude bars → **bar.md**.
- The data is relational or hierarchical → **graph.md** / **treemap.md** / **sunburst.md**.
- You need the color legend/range control itself → **visualmap.md** (mandatory companion here).

## Minimal config (cartesian matrix)

```ts
const hours = ["00", "06", "12", "18"];
const days  = ["Mon", "Tue", "Wed", "Thu", "Fri"];
// [xIndex, yIndex, value]
const cells: [number, number, number][] = [];
days.forEach((_, y) => hours.forEach((_, x) => cells.push([x, y, Math.round(Math.random() * 100)])));

const option: ml.echarts.EChartsOption = {
    grid: { top: 30, left: 60, right: 20, bottom: 30, containLabel: true },
    xAxis: { type: "category", data: hours, splitArea: { show: true } },
    yAxis: { type: "category", data: days,  splitArea: { show: true } },
    visualMap: {
        min: 0, max: 100, calculable: true,
        orient: "horizontal", left: "center", bottom: 0,
        inRange: { color: ["#e0f3f8", "#fee090", "#d73027"] } // cool → warm
    },
    tooltip: { position: "top" },
    series: [{
        type: "heatmap",
        name: "Activity",
        data: cells,
        label: { show: true },
        itemStyle: { borderWidth: 1, borderColor: "#fff" },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.4)" } }
    }]
};
```

## Data shape

`series.data` is an array of `[xIndex, yIndex, value]` tuples (`HeatmapDataValue = OptionDataValue[]`), **or** objects `{ value: [x, y, v], itemStyle?, label?, emphasis? }` (`HeatmapDataItemOption`).

- **cartesian2d**: `x`/`y` are the category indices (positions in `xAxis.data` / `yAxis.data`) — not the label strings. `value` (the 3rd element) is what `visualMap` colors.
- **geo**: tuples are `[lng, lat, value]` (real coordinates, not indices).
- **calendar**: tuples are `["yyyy-MM-dd", value]` (a date string + value).
- Missing cells simply aren't drawn — supply only the cells you have; no need to fill a full grid with zeros.
- Use `encode` / a `dataset` instead of tuples when columns are named (`encode: { x: 0, y: 1, value: 2 }`); the value dimension drives the color.

## Key options

From `ml.echarts.HeatmapSeriesOption`:

- `type: "heatmap"` — required.
- `coordinateSystem: "cartesian2d" | "geo" | "calendar"` — default `cartesian2d`. Picks which top-level component the cells render against.
- `data: (HeatmapDataItemOption | HeatmapDataValue)[]` — the cells (see above).
- `itemStyle: ItemStyleOption & { borderRadius?: number | number[] }` — `borderWidth`, `borderColor` (cell gridlines), `borderRadius` (rounded cells), `opacity`, `color` (override; normally left to visualMap).
- `label: SeriesLabelOption` — `show`, `formatter`, `color`, `fontSize` to print the value in each cell.
- `emphasis` / `blur` / `select` — hover/selection state item styles.
- `xAxisIndex` / `yAxisIndex` / `xAxisId` / `yAxisId` — which cartesian axes to bind (multi-grid charts).
- `geoIndex` / `geoId` — which `geo` component (geo mode).
- `calendarIndex` / `calendarId` — which `calendar` component (calendar mode).

**Geo-density-only** fields (ignored on cartesian/calendar):
- `pointSize: number` — radius of each data point's influence (px). Default 20.
- `blurSize: number` — Gaussian blur radius; larger = smoother blob. Default 20.
- `minOpacity` / `maxOpacity` — clamp the alpha range of the blurred field.

## Patterns

### visualMap is the color engine
The heatmap itself carries no palette — `visualMap.inRange.color` (a low→high ramp) plus `min`/`max` define the mapping. `calculable: true` adds a draggable handle that filters cells live and emits `datarangeselected`. Pull the ramp from theme CSS vars (e.g. `--chart-heatmap-N`) rather than hardcoding, and set `min`/`max` from the data extent so the full range is used. See **visualmap.md**.

### Per-cell tooltip
Tooltips read the raw tuple, so map indices back to labels in the formatter:
```ts
tooltip: {
    position: "top",
    formatter: (p: ml.echarts.DefaultLabelFormatterCallbackParams) => {
        const [x, y, v] = p.value as number[];
        return `${days[y]} @ ${hours[x]}: <b>${v}</b>`;
    }
}
```

### Geo density blob
```ts
const option: ml.echarts.EChartsOption = {
    geo: { map: "myRegion", roam: true },
    visualMap: { min: 0, max: 50, calculable: true, inRange: { color: ["blue", "cyan", "yellow", "red"] } },
    series: [{
        type: "heatmap", coordinateSystem: "geo",
        pointSize: 12, blurSize: 18,
        data: [/* [lng, lat, value], ... */]
    }]
};
```
The named map (`geo.map`) must be registered with `echarts.registerMap(...)` before the chart builds.

### Calendar grid
```ts
calendar: { range: "2024", cellSize: ["auto", 16] },
series: [{ type: "heatmap", coordinateSystem: "calendar",
           data: [["2024-01-01", 5], ["2024-01-02", 12] /* ... */] }]
```

### Click a cell
Wire via `onChartCreated` (see parent skill): `chart.on("click", e => { const [x, y, v] = e.value as number[]; ... })`. `e.data` is the original tuple/object.

## Gotchas

- **No `visualMap` → all cells the same gray.** This is the #1 confusion; a heatmap is only as useful as its color mapping.
- **`x`/`y` are indices, not labels** on cartesian2d. `[0, 2, 42]` means column 0, row 2 — `["Mon", "00", 42]` will not render.
- **visualMap `min`/`max` clip.** Values outside the range collapse to the end colors (or vanish if you set `inRange` to exclude them). Set them to the actual data extent.
- **`pointSize`/`blurSize` do nothing on cartesian2d/calendar** — they only affect the geo blur kernel. Cell gaps on cartesian come from `itemStyle.borderWidth`/`borderColor`, not blur.
- **Large grids are slow with labels on.** `label.show: true` across thousands of cells hurts; turn it off or render values only on hover/emphasis.
- **`splitArea`/`splitLine` live on the axes**, not the series — set `xAxis.splitArea.show` / `yAxis.splitArea.show` for the cell backing grid.
- **Single-cell `markArea`/`markLine` collapse on category axes** when start === end; use a `custom` series for single-cell overlays (see parent skill's renderItem pattern).
- **Re-emitting series merges.** Returning a fresh array from the bound getter replaces cleanly; a smaller option won't clear stale cells via shallow merge.

## Related skills

- `echarts` — parent: option object model, `s.chart` mounting, theming via CSS vars, `onChartCreated` events.
- the `raptor` skill's chart control (`${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/chart.md`) — how the chart node mounts in a Raptor view (`s.chart`, `traverseRaptorChart`, `getTypedProp` bindings).
- `visualmap.md` — **required** companion that supplies the color ramp and range control.
- `scatter.md` — sparse continuous-axis points instead of a dense grid.
- `bar.md` — magnitude over a single categorical axis.
- Official option reference: https://echarts.apache.org/en/option.html#series-heatmap
