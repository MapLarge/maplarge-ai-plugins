# Tooltip & AxisPointer

The hover popup (`tooltip`) and the axis crosshair/shadow indicator (`axisPointer`) that sit on top of any coordinate-system chart. Both are top-level option keys; `tooltip` also embeds its own `axisPointer` sub-object.

## When to use

- Tuning the hover popup on any cartesian chart (line/bar/scatter/candlestick/boxplot/heatmap): what it shows, where it sits, how it is styled.
- Switching between per-point (`trigger: "item"`) and per-category (`trigger: "axis"`) hover behavior.
- Adding/styling the axis indicator — a vertical `line`, a category `shadow` band, or a full `cross`.
- Building rich HTML or richText popups via a `formatter` callback, or just reformatting numbers via `valueFormatter`.
- For the data/encode of the series being hovered, use that series' skill (`bar.md`, `line.md`, etc.). For the whole option object and mounting, use the parent `echarts`.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
  xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  yAxis: { type: "value" },
  tooltip: {
    trigger: "axis",                       // one popup for all series at the hovered x
    axisPointer: { type: "shadow" },       // category shadow band behind the column
    valueFormatter: (v) => `${v} units`,   // applied to every value row
    confine: true,                         // keep popup inside the chart box
  },
  series: [
    { name: "Plan",   type: "bar", data: [120, 132, 101, 134, 90] },
    { name: "Actual", type: "bar", data: [110, 130, 110, 120, 95] },
  ],
};
```

## Data shape

`tooltip` has no `data` of its own — it reads from the hovered series. The shape it surfaces in a `formatter` callback is `ml.echarts.DefaultLabelFormatterCallbackParams` (a single object on `trigger: "item"`, an **array** of them on `trigger: "axis"`). Key fields: `seriesName`, `name`, `value` (the raw datum), `dataIndex`, `color` (the series color), `marker` (a ready-made colored-dot HTML/richText string), `percent` (pie/funnel), `encode`/`dimensionNames` (dataset series). Always handle both the object and array forms when `trigger` may be `"axis"`.

## Key options

Tooltip (`ml.echarts.TooltipComponentOption`, most fields via `CommonTooltipOption`):

- `show?: boolean` — master toggle.
- `trigger?: "item" | "axis" | "none"` — per-data-point, per-axis (all series at that category), or off.
- `axisPointer?` — embedded indicator: `type?: "line" | "shadow" | "cross" | "none"`, plus `axis?`, `crossStyle`, `lineStyle`, `shadowStyle`, `label`. Only meaningful with `trigger: "axis"`.
- `formatter?: string | (params, ticket, cb) => string | HTMLElement` — string template (`{a}` series, `{b}` name, `{c}` value, `{d}` percent) or callback (`params` is `DefaultLabelFormatterCallbackParams`). Async: return a placeholder, call `cb(ticket, html)` later.
- `valueFormatter?: (value, dataIndex) => string` — formats each value cell; ignored if `formatter` is set.
- `renderMode?: "html" | "richText" | "auto"` — DOM popup (default, supports HTML/`extraCssText`) vs canvas/SVG text (for non-DOM targets).
- `confine?: boolean` — clamp popup inside the chart container (stops clipping at edges).
- `appendTo?: string | HTMLElement | (container) => HTMLElement` — render the popup elsewhere (e.g. `"body"`) to escape `overflow:hidden`/stacking contexts. HTML mode only.
- `enterable?: boolean` — let the mouse enter the popup (needed for links/buttons inside it).
- `position?: [x,y] | "inside"|"top"|"left"|"right"|"bottom" | callback | { top,left,right,bottom }` — pin or compute placement.
- `triggerOn?: "mousemove" | "click" | "mousemove|click" | "none"`, `alwaysShowContent?`, `showDelay?`, `hideDelay?`, `transitionDuration?`, `order?` (`"seriesAsc"`…).
- Styling: `backgroundColor`, `borderColor`, `borderWidth`, `borderRadius`, `padding`, `textStyle`, `extraCssText`, shadow* fields.
- `className?: string`, `appendToBody?` (deprecated — use `appendTo: "body"`).

Top-level `axisPointer` component (`ml.echarts.AxisPointerComponentOption`, extends `CommonAxisPointerOption`): same `type`/`label`/`lineStyle`/`shadowStyle`/`snap`/`triggerOn` as the embedded one, plus `link?: AxisPointerLink[]` to **sync pointers across multiple charts/axes** (`{ xAxisIndex: "all" }`), and `handle` for a draggable touch handle. Declare it at the top level (not inside `tooltip`) when you need linked pointers or a pointer without a popup.

## Patterns

### Rich HTML formatter with the prebuilt marker

```ts
tooltip: {
  trigger: "axis",
  formatter: (params: ml.echarts.DefaultLabelFormatterCallbackParams[]) => {
    const rows = params.map(p => `${p.marker}${p.seriesName}: <b>${p.value}</b>`).join("<br/>");
    return `<div style="font-weight:600">${params[0].name}</div>${rows}`;
  },
}
```

`p.marker` already emits the correct colored dot for the active `renderMode`; prefer it over hand-rolled swatches.

### Cross indicator on a line chart

```ts
tooltip: { trigger: "axis", axisPointer: { type: "cross", label: { backgroundColor: "#6a7985" } } }
```

### Theme-reactive popup (read CSS vars at access time)

```ts
tooltip: {
  backgroundColor: chartTheme.surface,
  borderColor: chartTheme.border,
  textStyle: { color: chartTheme.text },
}
```

See the parent `echarts` skill for the `chartTheme` CSS-variable resolver pattern; never hardcode popup colors.

### Escape a clipping container

```ts
tooltip: { appendTo: "body", confine: true }   // popup overflows a scrolled/overflow:hidden panel
```

### Link axis pointers across charts

```ts
// top-level, not inside tooltip
axisPointer: { link: [{ xAxisIndex: "all" }], snap: true }
```

## Gotchas

- `axisPointer.type` only renders the band/crosshair when `trigger: "axis"`; with `trigger: "item"` the embedded axisPointer is ignored.
- `valueFormatter` is **silently overridden** by `formatter` — pick one.
- On `trigger: "axis"` the formatter `params` is an **array**; indexing `params.name` directly (object form) breaks. Branch on `Array.isArray`.
- HTML popups inherit page CSS — a framework rule like `.ml-raptor-root span { opacity: .6 }` compounds inside the popup; add `opacity:1 !important` on your swatch markup, or use `renderMode: "richText"`.
- `enterable: true` is required if the popup contains links/buttons; without it the popup vanishes on mouse-enter.
- `confine` and `appendTo: "body"` solve different problems: `confine` clamps to the chart box, `appendTo` reparents to escape overflow/stacking. They are often used together.
- A per-series or per-mark `tooltip.formatter` overrides the global one for that series only — useful for `markLine`/`markArea` whose default label is the series name.
- `position` as a function lets you pin the popup, but you must return pixel coords or a builtin keyword; returning nothing reverts to default placement.

## Related skills

- `echarts` — parent: the overall option object, `setOption` merge behavior, the `chartTheme` CSS-var pattern, and event wiring.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart (and its tooltip) mounts in a Raptor view via `s.chart({ options })` with `traverseRaptorChart` bindings.
- `echarts-axis`-bearing series whose hover this configures: `line.md`, `bar.md`, `scatter.md`, `candlestick.md`, `boxplot.md`, `heatmap.md`.
- `datazoom.md` — pairs with `axisPointer` on the same axis for pan/zoom + crosshair.
