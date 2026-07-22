# Raptor Image

Static `<img>` rendering (`s.image`) plus a canvas-based bottom-up image reveal animation (`AnimatedImageMask`).

## When to use
- Place a logo, thumbnail, card image, or any static/data-bound image URL into a view → `s.image(...)`.
- Animate one image being "revealed" over a base image from the bottom up (e.g. a fill/progress flourish) → `AnimatedImageMask`.
- For SVG icons use `svg.md`; for `<video>` use `s.video(...)`; for arbitrary embedded content use an iframe.

## Builder — `s.image`
Builder method `s.image(options: ViewDefinitions.IImage)` emits a node with `type: "image"`, backed by the `Image` node class. Key option fields (`ViewDefinitions.IImage`):

| Field | Type | Effect |
|---|---|---|
| `src` | `string` | image URL (sets `src`) |
| `alt` | `string` | alt text |
| `srcSet` / `sizes` | `string` | responsive `srcset` / `sizes` attrs |
| `isReponsive` | `boolean` | adds `img-fluid` (note the spelling) |
| `isThumbnail` | `boolean` | adds `img-thumbnail` |
| `isCardImageTop` | `boolean` | adds `card-image-top` |
| `height` / `width` | `number` | inline px size |
| `loading` | `ImageLoadingTypes` = `'auto' \| 'lazy' \| 'eager'` | native lazy-loading |
| `allowPointerEvents` | `boolean` | default **false** → `pointer-events:none`; set true to make the image clickable/hoverable |
| `objectFitUtility` | (common) | CSS `object-fit` class |
| `borderColor` / `borderWidth` / `borderStrokeDashArray` | | artboard-style frame border |

```ts
const s = RSScriptor.create<MyVm>();
s.image({
    src: "/assets/logo.png",
    alt: "Logo",
    width: 120,
    isReponsive: true,
    loading: "lazy",
});
```

`s.image(...)` is also available inside card scriptors (`ICardScriptor`) and dialog-header scriptors (`IDialogHeaderScriptor`); cards additionally expose `cardHeaderImageCap` / `cardFooterImageCap` of type `IImage`.

## Bindings & events
- Bindings: `IRaptorUniversalBindings` plus `IRaptorAttrBindings_ForImage` — the image-specific addition is `attr.src` (`IRaptorAttrBinding_Src`), so the URL can come from a VM getter rather than a literal.
- Events: `events?: Events.IEvent_Image[]` — `event` is a `PointerEventTypes | ContextMenuEventType | KeyboardEventTypes`; each entry is `{ event, handler, param?/paramKey? }`. **Pointer/click handlers fire only if `allowPointerEvents: true`** (otherwise `pointer-events:none` swallows them).

```ts
s.image({
    bindings: { attr: { src: "thumbUrl" } }, // VM getter `get thumbUrl()`
    allowPointerEvents: true,
    events: [{ event: "click", handler: "onThumbClick" }],
});
```

## AnimatedImageMask
Not a `RSScriptor` builder — it is a render-func node registered as `'animatedImageMask'` and backed by the `AnimatedImageMask` node class (extends `RaptorNode`). Author a node with `type: "animatedImageMask"` typed as `IAnimatedImageMask`:

| `IAnimatedImageMask` field | Type | Meaning |
|---|---|---|
| `baseImageUrl` | `string` | always-visible underlay (resolved against `location.origin`) |
| `overImageUrl` | `string` | image revealed by the growing mask |
| `duration` | `number` (ms, default 1000) | animation length |
| `easing` | `EasingType` | one of `linear`, `easeInQuad`, `easeOutCubic`, `easeInOutSine`, `easeOutBounce`, `easeInOutElastic`, … (full set in reference) |

The mask grows bottom-up; the over-image is clipped to a rect whose height is a function of time × `fillPercentage`.

### Instance API
Reach the node via `raptorDom.nodeT<AnimatedImageMask>("viewName")`, then drive it:

| Method | Purpose |
|---|---|
| `start(duration: number, fillPercentage: number, easing?: EasingType)` | run a reveal; `fillPercentage` 0–1 caps how far the over-image fills |
| `stop()` | cancel the current animation frame |
| `registerOnAnimationComplete(cb: () => void)` | one callback fired when a `start` run finishes |
| `destroy()` | clears the completion callback (framework lifecycle) |

It also auto-runs one pass on `initialize()` using the node-model `duration`/`easing` (fillPercentage 1).

## Patterns
- **Data-bound thumbnail in a list/grid cell:** `s.image({ bindings: { attr: { src: "rowImageUrl" } }, isThumbnail: true, width: 64 })` and expose `get rowImageUrl()` on the row VM.
- **Clickable hero image:** set `allowPointerEvents: true` and add a `click` event handler; without it the image is inert by design.
- **Replaceable image without rebuild:** bind `attr.src` to a VM getter and call `update("viewName")` after the URL changes, instead of recreating the view.
- **Trigger a mask reveal on demand:** render the `animatedImageMask` node, grab it with `nodeT<AnimatedImageMask>(...)`, and call `start(1200, 1, "easeOutCubic")` from an event handler; use `registerOnAnimationComplete` to chain follow-up UI.

## Gotchas
- `allowPointerEvents` defaults to **false** → images do not receive clicks/hover unless you opt in. This is the most common "my image click does nothing" cause.
- `isReponsive` is the actual (misspelled) field name — `isResponsive` is ignored.
- `IImage.adjustWidthAndHeightOnResize` exists on the interface but the image renderer does not wire up any resize behavior for it; do not rely on it. Use `objectFitUtility` / CSS for fit.
- `height`/`width` here are inline pixel styles, not responsive; combine with `isReponsive` (which adds `img-fluid`) only if you want fluid scaling, and note `img-fluid` can override an explicit width.
- `AnimatedImageMask` measures the **base image's natural dimensions** to size its canvas, so both images should share dimensions/aspect ratio or the overlay will misalign. URLs are prefixed with `location.origin`, so pass site-relative paths (leading `/`).
- `registerOnAnimationComplete` holds a single callback; re-registering replaces it.

## Related skills
- Parent: `raptor` (View/VM split, `RSScriptor.create`, `update()`, `nodeT`, RaptorNode lifecycle).
- Siblings: `svg.md` (icon graphics), `card.md` (`cardHeaderImageCap`/`image` inside cards), `carousel.md` (image slideshows), `custom-nodes.md` (authoring/registering render-func nodes like `animatedImageMask`), `theming.md` (border/color theming).
- `echarts` for any chart/graphic rendering (not images).

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## ViewDefinitions.IImage — full field list
```ts
interface IImage<T> extends IViewDefinitionWithBindings<T>, IViewDefinitionWithEvents<T> {
    src?: string;
    alt?: string;
    srcSet?: string;
    sizes?: string;
    isReponsive?: boolean;        // adds 'img-fluid' (note spelling)
    isThumbnail?: boolean;        // adds 'img-thumbnail'
    isCardImageTop?: boolean;     // adds 'card-image-top'
    height?: number;              // inline px
    width?: number;               // inline px
    loading?: ImageLoadingTypes;  // 'auto' | 'lazy' | 'eager'
    allowPointerEvents?: boolean; // default false -> pointer-events:none
    adjustWidthAndHeightOnResize?: boolean; // present but NOT wired in image renderer
    borderColor?: string;
    borderWidth?: number;         // default 1 when borderColor set
    borderStrokeDashArray?: string;
    bindings?: IRaptorUniversalBindings<T> & IRaptorAttrBindings_ForImage<T>;
    events?: Events.IEvent_Image<T>[];
}
type ImageLoadingTypes = 'auto' | 'lazy' | 'eager';
```
Plus inherited common props applied by the renderer: `objectFitUtility` (object-fit), spacing/sizing utilities, visibility utilities.

### Binding surface
`IRaptorAttrBindings_ForImage.attr` = `IRaptorAttrBindings_Global` & `IRaptorAttrBinding_Src` → notable image-specific key: `attr.src` (binds the `src` attribute to a VM prop).

### Event surface
`IEvent_Image.event ∈ PointerEventTypes | ContextMenuEventType | KeyboardEventTypes`. Each event: `{ event, handler, param?, paramKey? }`. Requires `allowPointerEvents: true` for pointer/click to land.

## IAnimatedImageMask — full
```ts
interface IAnimatedImageMask extends ViewDefinitions.IViewDefinition {
    baseImageUrl: string;   // underlay, prefixed with location.origin
    overImageUrl: string;   // revealed image, prefixed with location.origin
    easing?: EasingType;
    duration?: number;      // ms, default 1000
}
```
Node `type` string: `"animatedImageMask"` (registered via `renderFuncProvider.addRenderFunc('animatedImageMask', ...)`). Renders a `<div>` containing a `<canvas>`.

### AnimatedImageMask class — public members
- `start(duration: number, fillPercentage: number, easing?: EasingType): void`
- `stop(): void`
- `registerOnAnimationComplete(cb: () => void): void`
- `destroy(): void`
- `initialize(): Promise<void>` (framework-called; loads images, sizes canvas, runs one pass)
- getters/setters: `nodeModel`, `canvas`, `context2D`, `baseImage`, `overImageElement`, `width`, `height`, `frameId`, `duration`, `fillPercentage`, `startTime`, `rect`, `easing`, `origin`

### EasingType — full enum (Easings)
```
linear
easeInQuad easeOutQuad easeInOutQuad
easeInCubic easeOutCubic easeInOutCubic
easeInQuart easeOutQuart easeInOutQuart
easeInQuint easeOutQuint easeInOutQuint
easeInSine easeOutSine easeInOutSine
easeInExpo easeOutExpo easeInOutExpo
easeInCirc easeOutCirc easeInOutCirc
easeInBack easeOutBack easeInOutBack
easeInElastic easeOutElastic easeInOutElastic
easeInBounce easeOutBounce easeInOutBounce
```

### Animation mechanics (from source)
- progress = runtime / duration, optionally remapped by `easings[easing](progress)`.
- revealed height = `(height * fillPercentage) * min(progress, 1)`.
- canvas y-axis is flipped (`setTransform(1,0,0,-1,0,height)`) so the clip rect grows from the bottom up; the over-image is drawn inside the clip each frame.
- on completion: cancels the frame, resets `startTime`/`frameId`, then invokes the registered completion callback if present.
