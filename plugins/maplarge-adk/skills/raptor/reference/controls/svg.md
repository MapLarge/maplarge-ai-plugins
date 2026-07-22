# Raptor SVG

Inline vector icons and raw SVG markup, declared with `s.svg(...)` and keyed off the platform icon registry (`svgMap`).

## When to use
- Show a registry icon (`mlsvg-*`) anywhere — standalone, or inside a button/anchor/dialog header (those scriptors expose a nested `.svg(...)`).
- Inject raw, non-registered SVG markup (e.g. dynamically generated) via `svgString` / `svgData`.
- Recolor or resize an icon reactively (theme swaps, state-driven color) via bindings or the node's setter methods.
- Render the MapLarge product logo via `s.mapLargeSvgLogo(...)`.
- Persist/render freehand drawing shapes (line, arrow, curve) via the `svgDrawing` node.

## Builder
`s.svg(options?: ViewDefinitions.ISvg)` → node `type: "svg"`. `ViewDefinitions.ISvg` extends `ISvgOptions`. Key fields:

| field | type | notes |
|---|---|---|
| `key` / `svgKey` | `keyof typeof svgMap \| string` | registry key, e.g. `"mlsvg-calendar"`. `svgKey` is the fallback some pipelines read. |
| `svgString` | `string` | raw `<svg …>…</svg>` markup (or a `data:image/svg+xml` URI) for non-registered icons. |
| `svgData` | `string` | raw inline SVG used when no `key`/`svgString` resolves (e.g. PDF-import pipelines). |
| `width` / `height` | `number` | px size. |
| `fill` / `stroke` | `Colors \| string` | applied to all fillable/strokeable child shapes. |
| `strokeWidth` | `number` | |
| `cssClass` | `string` | space-separated classes (use theme classes like `ml-dash-svg-*` for theming). |
| `textColor` | `ColorDefinitions.TextKind` | adds a Bootstrap `text-*` class. |
| `position` | `ISvgPosition` | absolute positioning. |
| `margin` / `padding` | `DisplayUtilities.ISpacing` | |

```ts
// MyView.ts
const s = RSScriptor.create<MyVm>();
s.view("main", s =>
  s.div({})
    .contentTemplates(s => {
      s.svg({ key: s.getSvgKey("mlsvg-calendar"), width: 16, height: 16, fill: "#676971" });
      // raw markup, reactive recolor:
      s.svg({ svgKey: "mlsvg-alert", width: 14, height: 14 })
        .bindings({ fill: s.getTypedProp(vm => vm.alertColor) });
    })
);
```

`s.getSvgKey("mlsvg-…")` is an identity helper that returns the key but gives you autocomplete over the registry — prefer it over a bare string.

## Bindings & events
Bindings (`Bindings.IRaptorSvgBinding`) — swap the icon at runtime without re-rendering the view:
- `svgOptions` → whole `ISvgOptions` object.
- `svgKey` → just the registry key.
- `svgString` → raw markup string.

Plus universal bindings (`fill`, `stroke`, `cssClass`, visibility, etc.). Events: `Events.IEvent_Svg` — pointer / contextmenu / keyboard. Note SVGs default to `pointerEvents: none`; set `pointerEvents` truthy in options to receive clicks.

## Node / instance API
Backing node class `Svg extends RaptorNodeBase<ViewDefinitions.ISvg>`. Reach an instance from the VM via `this.raptorDom.nodeT<Svg>("viewName")`. Useful methods (also update the DOM in place):
- `setFillColor(color)` / `setStrokeColor(color)` — `""`/`"none"` clears stroke.
- `setStrokeWidth(n)`
- `setStrokeDashArray(dashArray)` — `"none"`/empty clears it.
- getters `fillColor`, `strokeColor`.

The `svgOptions`/`svgKey`/`svgString` binding handlers rebuild the icon in place (`Svg.updateSvg`), preserving the element reference.

## Patterns
- **Theme-reactive icon color**: drive `fill` (or a `cssClass` of `ml-dash-svg-*` theme classes) from a VM getter and `update("iconView")` on theme change, or `nodeT<Svg>(...).setFillColor(...)` for a direct DOM tweak with no re-render.
- **Dynamic / external markup**: when the icon isn't in the registry, pass `svgString`. To make it reusable across views, register it once at startup: `svgs.add({ key: "mlsvg-myThing", svg: "<svg …></svg>" })`, then reference by `key`.
- **Icon-before-text in compound controls**: button/anchor/dialog-header scriptors expose a nested `.svg(...)`; combined with the host's `svgBeforeText` it places the icon ahead of the label.

## Gotchas
- Pointer events are off by default — clicks/hover won't fire unless you set `pointerEvents`. The binding handler also forces `pointer-events:none` on the freshly rendered icon.
- Provide `width`/`height`; if omitted, the renderer falls back to the element's px style if present, otherwise the icon may render at intrinsic/zero size.
- `fill`/`stroke` are applied to every `path, polygon, polyline, circle, ellipse, rect` child — icons that hard-code per-shape colors (e.g. multi-color registry icons) may not recolor cleanly. Prefer theme `cssClass` for those.
- Setting `stroke` to `""`/`"none"` is treated as "no stroke", not the literal value.
- `svgDrawing` (node type `"svgDrawing"`, `ViewDefinitions.ISvgDrawing`) is for persisted drawing shapes, not general icons — see the drawing-toolbar skill.

## Related skills
- `raptor` — parent: View/VM split, RSScriptor basics, bindings/events, `update()`, `nodeT`.
- `button.md`, `drawing-toolbar.md` — hosts of nested `.svg(...)` and the `svgDrawing` node respectively.
- `image.md` — for raster/`<img>` assets (sibling to vector SVG).
- `theming.md` — `ml-dash-svg-*` theme classes for reactive icon coloring.

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## ISvg / ISvgOptions full field reference

`ViewDefinitions.ISvg<T>` extends `ISvgOptions` + universal bindings/events (position omitted from those mixins, re-added below). All fields optional unless noted.

| field | type | source |
|---|---|---|
| `type` | `"svg"` | set by builder |
| `key` | `keyof typeof svgMap \| string` | ISvgOptions |
| `svgKey` | `keyof typeof svgMap \| string` | ISvgOptions (fallback for `key`) |
| `svgString` | `string` | ISvgOptions — raw `<svg>` or `data:image/svg+xml[;base64],…` |
| `svgData` | `string` | ISvg — raw inline svg, last-resort source |
| `width` | `number` | ISvgOptions |
| `height` | `number` | ISvgOptions |
| `fill` | `Colors \| string` | ISvgOptions / ISvg |
| `stroke` | `Colors \| string` | ISvgOptions / ISvg |
| `strokeWidth` | `number` | ISvg |
| `cssClass` | `string` | ISvgOptions — space-separated |
| `textColor` | `ColorDefinitions.TextKind` | ISvgOptions — adds `text-*` class |
| `position` | `ISvgPosition` | ISvgOptions |
| `margin` | `DisplayUtilities.ISpacing` | ISvgOptions |
| `padding` | `DisplayUtilities.ISpacing` | ISvgOptions |
| `bindings` | `IRaptorUniversalBindings<T> & IRaptorSvgBinding<T>` | ISvg |
| `events` | `IEvent_Svg<T>[]` | ISvg |

`ISvgPosition`: `{ position: CssPosition; top?: number; right?: number; bottom?: number; left?: number }`.

## Source resolution order (Renderer.svg)
1. `svgs.getSvgWithSvgOptionsEl(def)` — resolves `key`/`svgKey` against `svgMap` (with `legacySvgKeyMap` fallback for renamed keys).
2. else if `svgData` set → parse that markup.
3. else if `svgString` set → strip to `<svg …>`, drop deprecated `xlink`, ensure `xmlns`, parse.
4. else → empty placeholder SVG sized by `width`/`height`.

## IRaptorSvgBinding
```ts
interface IRaptorSvgBinding<T> {
  svgOptions?: BindingProp<T, ISvgOptions>;
  svgKey?:     BindingProp<T, keyof typeof svgMap | string>;
  svgString?:  BindingProp<T, string>;
}
```
Handlers (`@BindingHandler` on `Svg`): `updateSvgOptions`, `updateSvgKey`, `updateSvgString` → all funnel through static `Svg.updateSvg` / `Svg.updateSvgWithProperty`, rebuilding the icon in place and syncing `class style viewBox width height fill xmlns mlsvg-key`.

## Svg node public API
- `setFillColor(color: string): void`
- `setStrokeColor(color: string): void` — `""`/`"none"`/blank ⇒ `"none"`
- `setStrokeWidth(strokeWidth: number): void`
- `setStrokeDashArray(dashArray: string): void` — `"none"`/falsy clears
- `get fillColor(): string`, `get strokeColor(): string`
- `initialize()` — applies `fill`/`stroke`/`strokeWidth` from the node model on mount

## Icon registry (svgMap)
`svgMap` (in framework `Svgs.ts`) is a `Record<string,string>` of `mlsvg-*` keys → SVG markup. `allSvgMap = typeof svgMap | typeof legacySvgKeyMap`. Sample keys: `mlsvg-ai`, `mlsvg-alert`, `mlsvg-alert-filled`, `mlsvg-calendar`, `mlsvg-clock`, `mlsvg-chart`, `mlsvg-checkmark`, `mlsvg-closex`, `mlsvg-caret-down`, `mlsvg-chevron-right-filled`, `mlsvg-copy`, `mlsvg-compass`, `mlsvg-crosshair`, `mlsvg-share-outline`, `mlsvg-statistic-outline`. Many `mlsvg-editor-*` keys exist for control thumbnails. Use `s.getSvgKey("…")` for autocomplete.

Runtime registration (via the `svgs` singleton — `ISvgs`):
```ts
svgs.add({ key: "mlsvg-myThing", svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'>…</svg>" });
svgs.addMany([ { key, svg }, … ]);
svgs.contains("mlsvg-myThing");
svgs.getSvgString("mlsvg-myThing");
```
Then reference with `s.svg({ key: "mlsvg-myThing" })`. Do this once at module init so the key resolves everywhere.

## mapLargeSvgLogo
`s.mapLargeSvgLogo(options: IMapLargeSvgLogo)` → node `type: "mapLargeSvgLogo"`, node class `MapLargeSvgLogo extends RaptorNode`. `IMapLargeSvgLogoOptions extends IViewDefinition` adds:
- `href?: string` — link target; default `"javascript:void(0)"` (non-navigating). Wraps the logo in an anchor; cursor defaults to `pointer` when `href` set, else `default`.

Internally renders an anchor + `div.ml-svg-logo` and uses the fixed `svgKey: "mlsvg-mllogo"`.

## svgDrawing (drawing shapes)
`ViewDefinitions.ISvgDrawing extends IViewDefinition`:
- `type: "svgDrawing"`
- `drawingType: string` — `line`, `arrow`, `elbow-connector`, `curved-connector`, `curve`, `polyline`, `scribble`
- `drawingElement: ISvgDrawingElementData`

`ISvgDrawingElementData`:
```ts
{
  id: string;
  type: string;                       // tool type
  points: DomAdapter.IPoint[];        // {x,y}[]
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity?: number;
    startCap?: { type: string; filled: boolean };  // none|arrow|circle|square|diamond|triangle
    endCap?:   { type: string; filled: boolean };
  };
}
```
Node class `SvgDrawing extends RaptorNodeBase<ISvgDrawing>` adds (over the `Svg` setters): `setStartCap(type, filled)`, `setEndCap(type, filled)`, settable `fillColor`/`strokeColor`. Caps are rendered as appended SVG shapes (`data-cap="start|end"`), auto-recolored/removed when stroke changes. Events: `Events.IEvent_SvgDrawing`. This node is produced/managed by the drawing toolbar — see `drawing-toolbar.md`.
