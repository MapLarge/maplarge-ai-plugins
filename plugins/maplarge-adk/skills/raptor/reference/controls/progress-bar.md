## Progress Bar
A determinate horizontal completion bar (Bootstrap `.progress` / `.progress-bar`) whose fill width is driven by a normalized 0-1 value and updated reactively.

## When to use
- A single determinate metric: percent complete, load/quota usage, score, capacity utilization.
- You want stripes/animation, an inline label, and a semantic color (`success`/`info`/`warning`/`danger`) that you can flip as the value changes.
- NOT for user input (use `slider.md`), and NOT for radial gauges or multi-segment charts (use `echarts`).

## Builder
Method `s.progressBar(options?)` emits a node with `type: "progressBar"`. Options come from `ViewDefinitions.IProgressBar`:

| Field | Type | Notes |
|------|------|------|
| `value` | `number` | **0-1 normalized** — `0.42` renders width `42%`. The renderer/handler does `Math.round(value * 100)`. |
| `minValue` | `number` | ARIA `aria-valuemin` only (default 0). |
| `maxValue` | `number` | ARIA `aria-valuemax` only (default 100). |
| `label` | `string` | Text shown inside the bar; also sets `aria-label`. |
| `striped` | `boolean` | Adds `progress-bar-striped`. |
| `animated` | `boolean` | Adds `progress-bar-animated` (animates the stripes; pair with `striped`). |
| `colorType` | `ColorDefinitions.ProgressBarColorType` | `'success' \| 'info' \| 'warning' \| 'danger'` → applies `bg-<colorType>`. |
| `disableEasing` | `boolean` | Adds `ml-progress-bar-no-transition` so width jumps without the CSS transition. |
| `height` | `number` | Pixel height (sizing applied via the framework's spacing/sizing pass). |

Minimal generic example (static, value 0-1):
```ts
const s = RSScriptor.create<MyVm>();
s.progressBar({ value: 0.42, label: "42%", colorType: "info" });
```

Reactive example — bind the live value/color to the ViewModel so it re-renders on `update()`:
```ts
s.progressBar({ striped: true, animated: true })
 .bindings(b => b
     .add("value", vm => vm.progress)        // vm.progress is 0..1
     .add("label", vm => vm.progressLabel)
     .add("colorType", vm => vm.barColor));   // "success" | "warning" | "danger"
```

## Bindings & events
Binding keys (`Bindings.IProgressBarBinding`, each a `BindingProp`): `value` (0-1), `minValue`, `maxValue`, `label`, `striped`, `animated`, `colorType`, `height` — plus the universal bindings (`class`, `style`, `visible`, etc.). Each key has a matching `@BindingHandler` on the node, so partial updates touch only that attribute/class.

Events (`Events.IEvent_ProgressBar`): pointer, context-menu, and keyboard event types only (`PointerEventTypes | ContextMenuEventType | KeyboardEventTypes`). There is no native value-change event — the bar is output-only.

## ViewModel / instance API
Node class `ProgressBar extends RaptorNode`, `nodeModel: ViewDefinitions.IProgressBar`. Reach it from a ViewModel via `this.raptorDom.nodeT<ProgressBar>("myBarViewName")`. Public handler methods you can call directly to mutate one aspect without a full re-render:
- `handleValue(value: number)` — width + `aria-valuenow` (expects 0-1).
- `handleLabel(label: string)`, `handleMinValue`, `handleMaxValue`.
- `handleStriped(b)`, `handleAnimated(b)`, `handleDisableEasing(b)`.
- `handleColorType(colorType)` — swaps any existing `bg-*` class.
- `applyBindingData({ data })` — pass a `number` (sets value) or a `Partial<IProgressBar>` to update several fields at once.

## Patterns
**Threshold coloring** — keep `value` in 0-1 and derive `colorType` in a VM getter:
```ts
public get barColor(): ColorDefinitions.ProgressBarColorType {
    return this.progress < 0.5 ? "danger" : this.progress < 0.8 ? "warning" : "success";
}
```
**Indeterminate-style activity** — there is no built-in indeterminate mode; emulate with `striped: true, animated: true` and a fixed `value` (e.g. `1`).
**Snap without animation** — set `disableEasing: true` when the value jumps in big discrete steps and the easing looks laggy.

## Gotchas
- `value` is **normalized 0-1**, not a percentage. Passing `42` renders `4200%` (clamped to the bar but wrong). Divide by 100 first.
- `minValue`/`maxValue` are ARIA-only; they do **not** rescale `value`. The fill is always `value * 100`%.
- `animated` without `striped` shows no motion — the animation is on the stripe pattern.
- `colorType` is restricted to the four `ProgressBarColorType` values; other Bootstrap variants like `primary`/`secondary` are not in the type (a stale validation schema lists more, but the type and handler only support these four).
- Output-only: no change event and no draggable thumb — if you need user-set values use `slider.md`.

## Related skills
- `raptor` (parent) — View/VM split, `RSScriptor.create`, `.bindings`/`.events`, `update()`, reaching nodes.
- `slider.md` — interactive value input (the input counterpart of a progress bar).
- `theming.md` — `ColorDefinitions` color tokens and theme-reactive coloring.
- `echarts` — gauges, multi-segment, or stacked progress visualizations.
