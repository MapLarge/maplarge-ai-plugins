# Carousel

A Bootstrap-backed slideshow: a sliding/fading rotator of `carouselItems` slides with optional prev/next controls and indicator dots. Built from raw `ViewDefinitions.ICarousel` view-definitions (there is no dedicated scriptor method).

## When to use

- A rotating panel of slides (images, cards, stepped content) the user pages through.
- A media rail / image gallery with prev/next arrows and position dots.
- Prefer `s.navTabs` (see `nav-tabs.md`) for tabbed sections that don't auto-advance, and a plain `s.foreach` list for static stacks.

## Builder

There is **no `s.carousel()` builder method** on RSScriptor. Author a raw `ViewDefinitions.ICarousel` (node `type: "carousel"`) and inject it with the generic escape hatch `s.element(config)`. Slides are `type: "carouselItem"`, dots are `type: "carouselIndicator"`. `id` is **required** — the renderer logs `"Carousel id is required"` and renders an empty shell without it.

```ts
const s = RSScriptor.create<MyVm>();
s.element({
  type: "carousel",
  id: "myCarousel",
  viewName: "MyCarousel",        // needed to reach the node via nodeT
  autoPlay: true,                // data-bs-ride="carousel"
  carouselIndicators: [
    { type: "carouselIndicator", carouselId: "myCarousel", slideTo: 0, active: true, ariaLabel: "Slide 1" },
    { type: "carouselIndicator", carouselId: "myCarousel", slideTo: 1, ariaLabel: "Slide 2" },
  ],
  carouselItems: [
    { type: "carouselItem", active: true, contentTemplates: [ /* slide 0 nodes */ ] },
    { type: "carouselItem", contentTemplates: [ /* slide 1 nodes */ ] },
  ],
  prevButton: { type: "button", text: "Previous" },   // IPrevButton extends IButton
  nextButton: { type: "button", text: "Next" },       // INextButton extends IButton
} as ViewDefinitions.ICarousel);
```

Key `ICarousel` fields: `id` (required), `carouselItems: ICarouselItem[]` (required), `autoPlay?`, `ride?` (both set `data-bs-ride`), `touch?` (false → `data-bs-touch="false"`), `crossFade?` (adds `carousel-fade`), `prevButton?`, `nextButton?`, `carouselIndicators?`. `ICarouselItem`: `active?` (one slide should be active), `interval?` (ms per slide when autoplaying), plus `contentTemplates`. `ICarouselIndicator`: `carouselId` (must equal the carousel `id`), `slideTo` (slide index), `active?`, `ariaLabel?`.

## Bindings & events

Bindings on the carousel and its parts are `Bindings.IRaptorUniversalBindings` only — `visible`, `style`, `attr`, `css`, `prefixes`. There are no carousel-specific binding keys (e.g. no two-way "active slide" binding). Drive content reactively via the slides' inner nodes or rebuild the carousel and `update(viewName)`.

Events: `Events.IEvent_Carousel[]`, plus `IEvent_CarouselItem[]` on slides and `IEvent_CarouselIndicator[]` on dots. All accept `PointerEventTypes | ContextMenuEventType | KeyboardEventTypes` (no native "slide changed" event — see Gotchas).

## ViewModel / instance API

Backing class `Carousel extends RaptorNode` (module `raptor/raptorDom/controls/Carousel/Carousel`). Reach the live node via `this.raptorDom.nodeT<Carousel>("MyCarousel")` (using the `viewName` you set). Useful members: getter `activeSlideNumber`, getters `carouselItems` / `indicatorItems` (HTMLElement[]), `activeSlide` / `activeIndicator` (HTMLElement). The node attaches `pointerdown` handlers to the prev/next buttons in `initialize()` and swaps the `.active` class on slide change; there are no public `next()`/`goTo()` methods, so programmatic slide control means clicking the controls or rebuilding the definition.

## Patterns

- **Image gallery**: each `carouselItem.contentTemplates` is a single `s.image(...)`; add `carouselIndicators` for dots and `prevButton`/`nextButton` with `svgOptions` arrows (the renderer applies `svgOptions` on the buttons).
- **Card rotator**: each slide's `contentTemplates` holds an `s.card(...)` subtree (see `card.md`); set `crossFade: true` for a fade-between-cards effect.
- **Timed auto-advance**: `autoPlay: true` plus per-slide `interval` values for variable dwell times.

## Gotchas

- **`id` is mandatory** and `carouselIndicator.carouselId` plus the buttons' internal `data-bs-target` all reference `#${id}`; a wrong/missing id silently breaks navigation.
- **No scriptor sugar** — you must use `s.element(...)` with a fully-typed `ICarousel`; cast with `as ViewDefinitions.ICarousel` for the literal.
- **Exactly one slide should have `active: true`** (and the matching indicator); otherwise the node finds no active slide (`getActiveSlideNumber` returns null) and prev/next math misbehaves.
- **Indicators are `<button>` elements** built into a `.carousel-indicators` wrapper; the node wires next/prev via custom `pointerdown` listeners rather than relying solely on Bootstrap's JS.
- Bootstrap data attributes (`data-bs-ride`, `data-bs-touch`) are emitted, so behavior also depends on Bootstrap's carousel JS being present in the host.

## Related skills

- Parent: `raptor` (View/VM split, RSScriptor.create, `s.element`, `update()`, nodeT, bindings/events).
- Siblings: `card.md` and `image.md` (common slide contents), `button.md` (prev/next button options, `svgOptions`), `svg.md` (arrow icons), `nav-tabs.md` (non-rotating tabbed alternative), `foreach.md` (generating slides from a list), `custom-nodes.md` (the RaptorNode/`s.element` raw-definition pattern).
