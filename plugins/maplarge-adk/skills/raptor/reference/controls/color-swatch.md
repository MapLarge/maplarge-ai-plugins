# Color Swatch

A read-only color "chip" — a fixed-size box whose background, border, and corner radius render a single color, optionally bound reactively.

## When to use

- A legend row, list item, or table cell that needs a small colored square next to a label.
- A status/category indicator whose fill should update when a ViewModel property changes (bind `color`).
- Anywhere you'd otherwise hand-style a `div` to show one color — `colorSwatch` does the styling and supports a dedicated color binding.

Despite the "color picker" wording in the builder JSDoc, this control is **read-only**: it displays a color but emits no value and has no input UI. For an editable color, use a real input/dropdown control; to make the swatch act as a button, attach a `click` event.

## Builder

`s.colorSwatch(options: IColorSwatch)` → returns the root scriptor (chainable). Node `type` is `"colorSwatch"`. Options come from `IColorSwatch` (extends `ViewDefinitions.IViewDefinitionWithEvents`):

| field | type | default | notes |
| ------- | ------ | --------- | ------- |
| `width` | number | `16` | px |
| `height` | number | `16` | px |
| `color` | string | `'#000000'` | background fill (any CSS color) |
| `borderColor` | string | falls back to `color` | |
| `borderWidth` | number | `1` | px; border style is always `solid` |
| `borderRadius` | number | `0` | px; set ≥ width/2 for a dot |
| `viewName` / `id` | string | — | from the base view definition; needed to reach the instance |

```ts
// minimal static swatch
s.colorSwatch({ color: "#2e86de", width: 12, height: 12, borderRadius: 6 });

// bound swatch in a legend row VM (MyVm has a `statusColor` getter)
s.div({ class: "legend-row" }).contentTemplates(s => s
    .colorSwatch({
        viewName: "statusSwatch",
        width: 14, height: 14,
        bindings: { color: "statusColor" }
    })
    .span({ text: "Status" })
);
```

## Bindings & events

Bindings (`options.bindings`) = `Bindings.IRaptorUniversalBindings` plus two swatch-specific keys:

- `color?: BindingProp<T, string>` — sets the fill; a non-null binding value **takes precedence** over the static `color` option.
- `borderColor?: BindingProp<T, string>` — sets the stroke; takes precedence over the static `borderColor` option.
- Universal keys also apply: `visible`, `style`, `css`, `attr`, `viewDefinition`, `prefixes`, etc.

Events (`options.events: IEvent_ColorSwatch[]`) accept `event` values from `PointerEventTypes` (`click`, `dblclick`, `pointerdown/up/over/out/enter/leave`, `mousedown/up/over/out/enter/leave`), `ContextMenuEventType` (`'contextmenu'`), or `KeyboardEventTypes` (`'keydown' | 'keyup'`). There is **no** `change`/`input` event — it is not an input.

```ts
s.colorSwatch({
    color: "#888",
    events: [{ event: "click", handler: "onSwatchClick", param: rowId }]
});
```

## Instance API

Backing class `ColorSwatch extends RaptorNodeBase<IColorSwatch>`. Reach it from a ViewModel by view name:

```ts
const swatch = this.raptorDom.nodeT<ColorSwatch>("statusSwatch");
```

Useful getters (all derived, no setters): `width`, `height`, `color`, `borderColor`. Each applies the binding-over-nodeModel precedence described above. Lifecycle: `render()` (re-applies styles), `onViewDefinitionChanged()` (re-renders after editor edits). In normal use you drive it through bindings + `update(viewName)` rather than calling node methods directly.

## Patterns

- **Reactive indicator**: expose a `get statusColor(): string` on the VM that maps state → CSS color, bind `color` to it, and call `this.update("statusSwatch")` when state changes.
- **Legend entry**: pair a `colorSwatch` with a `span` label inside a flex `div`; map each series/category color to its own swatch.
- **Clickable chip**: add a `click` event with a `param` carrying the row/category id; the handler does the work (selection, toggle). Keep the swatch itself read-only.

## Gotchas

- Not interactive — no value, no two-way color editing. Don't reach for it as a color picker.
- Binding value precedence: if a `color` binding ever resolves to a non-null value, the static `color` option is ignored thereafter; clear by binding to `null`/`undefined` to fall back.
- `borderColor` defaults to the fill `color`, so a same-color border is invisible — set `borderColor` explicitly for a contrasting outline.
- Border is always `solid`; there's no dashed/dotted option.
- Sizing is in raw px via `width`/`height`; the control does not stretch to its container.

## Related skills

- Parent: `raptor` — View/VM split, RSScriptor.create, bindings/events mechanics, `update()`, `nodeT`.
- `legend.md` — swatches are the natural building block for legend rows.
- `svg.md`, `image.md` — other small read-only visual nodes.
- `echarts` — for color scales/visualMap inside charts rather than standalone chips.
- `theming.md` — drive swatch colors from theme CSS variables for light/dark consistency.
