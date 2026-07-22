# Raptor Card

A bordered container surface with optional header / body / footer sections, built from the `s.card()` RSScriptor builder and its nested section builders. Use it for grouped content panels, summary boxes, and clickable picker tiles.

## When to use
- Grouping related content into a visually bounded panel (renders the Bootstrap-style `.card` box).
- Building a clickable tile/selector surface — set `linkCard: true` for the shared hover treatment.
- Header/body/footer structure where each region needs its own padding, background, or events.

For a row of equal-height cards use the sibling `cardGroup` (`ICardGroup`); for a masonry/column flow use `cardColumns` (`ICardColumns`). For free-form boxes without card chrome, just use `s.div`.

## Builder
`s.card(options?: ViewDefinitions.ICard)` — node `type: "card"`. It returns a templated scriptor (`ICardScriptor`), so chain `.contentTemplates(...)` (or `.cardHeader/.cardBody/.cardFooter/.div/.image` directly) to fill it. Nested builders:

| Builder | Node `type` | Interface | Renders class |
|---|---|---|---|
| `s.card(o?)` | `card` | `ICard` | `.card` (`data-rn="card"`) |
| `s.cardHeader(o?)` | `cardHeader` | `ICardHeader` | `.card-header` |
| `s.cardBody(o?)` | `cardBody` | `ICardBody` | `.card-body` |
| `s.cardFooter(o?)` | `cardFooter` | `ICardFooter` | `.card-footer` |

Key `ICard` option fields:
- `linkCard?: boolean` — marks a clickable surface; picks up the standard primary-tint hover (background + border + soft shadow). Prefer this over one-off `customCssClasses` for picker tiles.
- `noHover?: boolean` — removes the hover visual effect (adds `ml-card-noHover`).
- `textBgColor?: ColorDefinitions.TextBgKind` — combined text+background color variant (from `IViewDefinition`).

`ICardHeader`/`ICardBody`/`ICardFooter` add only `bindings` + `events` on top of the common view-definition props; `cardBody` and `cardFooter` also honor `flex` for flexbox layout. All four sections accept the shared `IViewDefinition` props: `customCssClasses`, `margin`/`padding` (`ISpacing`), `width`/`height`, `flex`.

> Avoid the deprecated `ICard` shortcut props (`title`, `bodyText`, `footerText`, `cardHeader`, `cardHeaderImageCap`, `cardFooterImageCap`, `headerBackground`, `headerTextKind`, `headerPadding`…). Put content in `cardHeader`/`cardBody`/`cardFooter` via `contentTemplates` instead.

```ts
// View
const s = RSScriptor.create<MyVm>();
s.view('myCard', s => s
    .card({ linkCard: true, customCssClasses: 'myTile' })
    .contentTemplates(s => {
        s.cardHeader().contentTemplates(s => s.text({ text: "My Thing" }));
        s.cardBody({ flex: { direction: 'column' } }).contentTemplates(s =>
            s.bind(v => v.getTypedProp('summary')).text({}));
        s.cardFooter().contentTemplates(s =>
            s.button({ text: "Open" }).events(e => e.pointerdown('onOpen')));
    }));
```

## Bindings & events
All four nodes carry `bindings?: Bindings.IRaptorUniversalBindings` — so `visible` (show/hide), `style`, `attr`, and `css` (conditional classes), with `prefixes` for scoping. Use `visible` to toggle a whole section.

Events:
- `ICard` / `ICardHeader` / `ICardFooter` (`IEvent_Card` etc.): `PointerEventTypes | ContextMenuEventType | KeyboardEventTypes` — e.g. `pointerdown`, `contextmenu`, `keydown`. Wire `pointerdown`/`keydown` on a `linkCard` to make the tile actuate.
- `ICardBody` (`IEvent_CardBody`): the above **plus** `DragEventTypes` — the body is the only section that supports drag events (drop targets, draggable content).

## ViewModel / instance API
There is no dedicated card ViewModel. The runtime class is `Card extends RaptorNode` (a passive container that just holds its `nodeModel: ICard`); it exposes no card-specific methods. Drive cards entirely through their `bindings`/`events` and the content nodes inside them. If you need the element imperatively, reach it like any node via `raptorDom.nodeT<...>("viewName")` or `root.closest('[data-rn="card"]')`, but you almost never need to.

## Patterns
- **Clickable picker tile.** `s.card({ linkCard: true }).events(e => e.pointerdown('onPick').keydown('onPickKey'))`, set `attr: { tabindex: '0', role: 'button' }` via a binding so it is keyboard-focusable.
- **Collapsible section.** Bind `visible` on a `cardBody` to a VM boolean, and toggle it from a `cardHeader` click handler that calls `this.update("myCard")`.
- **Row of equal cards.** Wrap several `s.card(...)` in `s.cardGroup(...)` so they share height; or place cards in a `row`/`column` layout (see `layout.md`).

## Gotchas
- `s.card()` is a *templated* builder: content must go through `.contentTemplates(...)` (or the section builders); options alone render an empty box.
- Don't reach for the deprecated `title`/`bodyText`/`footerText` props — they are slated for removal; compose sections instead.
- `flex` only affects `cardBody`/`cardFooter`; setting it on the outer `card` or on `cardHeader` is ignored by the Renderer.
- `linkCard` only supplies the *look*; you must still attach `pointerdown`/`keydown` events (or wrap in an anchor) to make it act.
- `noHover` and `linkCard` are opposites — `linkCard` adds hover affordance, `noHover` strips it; don't set both.

## Related skills
- Parent: `raptor` (View/VM split, `RSScriptor.create`, `contentTemplates`, bindings/events, `update()`).
- `layout.md` — `row`/`column`/`cardGroup`/`cardColumns` arrangement around cards.
- `image.md`, `text.md`, `button.md` — common content nodes placed inside card sections.
- `accordion.md` — when you need built-in collapse rather than a hand-rolled `visible`-bound card.
- `list-group.md` — list-style grouped content as an alternative to stacked cards.
