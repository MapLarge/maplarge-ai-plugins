# Raptor Breadcrumb

A Bootstrap-style breadcrumb trail: a `<nav><ol class="breadcrumb">` of `<li>` items, the last typically being the non-clickable current page.

## When to use
- Show where the user is in a page/route/model hierarchy and let them jump back up the path.
- A horizontal sequence of links separated by a divider, ending in a plain "current" segment.
- For tab-like top navigation use `nav-tabs.md`; for a list of links use `list-group.md`.

## Builder
`s.breadcrumb(options?: ViewDefinitions.IBreadcrumb)` emits node `type: "breadcrumb"` and exposes `.contentTemplates(...)`. Each crumb is `s.breadcrumbItem(options: ViewDefinitions.IBreadcrumbItem)`, node `type: "breadcrumbItem"`, whose own `.contentTemplates(...)` holds the visible content — usually `s.anchor(...)` for navigable crumbs and `s.span(...)` for the current one.

`IBreadcrumb` fields:
- `divider?: BreadcrumbDivider` — `'forwardSlash'` (default `/`) or `'greaterThan'` (renders `>`).
- `bindings?`, `events?` (see below). Plus the common view-definition props (`key`, `cssClass`, `styles`, spacing/sizing).

`IBreadcrumbItem` carries only `bindings?` / `events?` + common props; it renders the `<li class="breadcrumb-item">`. Mark the active/current crumb on its inner anchor with `active: true` (from `IAnchor`).

```ts
// in a View
s.breadcrumb({ divider: "greaterThan" })
 .contentTemplates(s => {
     s.breadcrumbItem({}).contentTemplates(s =>
         s.anchor({ href: "#", text: "Home", events: [{ event: "click", handler: "goHome" }] }));
     s.breadcrumbItem({}).contentTemplates(s =>
         s.anchor({ href: "#", text: "Reports", events: [{ event: "click", handler: "goReports" }] }));
     s.breadcrumbItem({}).contentTemplates(s =>
         s.span({ text: "Current" }));  // last crumb: plain text, no link
 });
```

## Bindings & events
Both nodes accept `bindings?: Bindings.IRaptorUniversalBindings` — the standard universal keys: `visible`, `style`, `attr`, `css` (`{ property, trueClasses, falseClasses }`), and `prefixes` for path scoping. Use `visible` to hide a crumb conditionally, or `attr.href` to bind a route.

Events are `Events.IEvent_Breadcrumb[]` / `Events.IEvent_BreadcrumbItem[]`, each `{ event, handler, paramKey?, param? }` where `event` is a `PointerEventTypes` (`'click'`, `'dblclick'`, `'mouseenter'`, …), `ContextMenuEventType`, or `KeyboardEventTypes`, and `handler` names a VM method. Click handlers usually live on the inner `s.anchor` (an `IAnchor` with its own `events`) rather than the `<li>`.

## ViewModel / instance API
The backing node class is `Breadcrumb` (extends `RaptorNode`); it is a thin wrapper exposing `nodeModel: ViewDefinitions.IBreadcrumb` and adds no extra public methods. There is no dedicated breadcrumb ViewModel — drive crumb text/visibility from your own VM getters and re-render with `update("viewName")`. If you need the instance, fetch it by the breadcrumb's `key`/view name: `this.raptorDom.nodeT<Breadcrumb>("myCrumbs")`.

## Patterns
- Dynamic trail: keep an array of `{ text, gotoModelKey }` on the VM and build crumbs with `s.foreach(...).contentTemplates(...)` inside `s.breadcrumb`, rendering an `s.anchor` for every non-last item and `s.span` for the last; navigate in the click handler.
- Static shell trail: hardcode 2-3 `breadcrumbItem`s, binding only the final `span`'s `text` to the current page name and toggling intermediate crumbs with `bindings.visible`.
- Route links: set `anchor.href` (or bind `attr.href`) so middle: crumbs are real links, leaving the last as a plain `span`.

## Gotchas
- The "current/last" crumb is a convention, not enforced — render it as `s.span` (no link) and/or set `active: true` on its anchor; the control will not auto-disable the last item.
- `divider` only supports `'forwardSlash'` and `'greaterThan'`; `'greaterThan'` is applied via inline CSS vars (`--bs-breadcrumb-divider`) on the `<nav>`, so a global breadcrumb-divider override can be overridden by it.
- Put visible content inside an item's `.contentTemplates` (anchor/span); a `breadcrumbItem` with no children renders an empty `<li>`.
- Don't confuse the builder `ViewDefinitions.IBreadcrumb` (full view-definition with `divider`/`bindings`/`events`) with the small runtime `IBreadcrumb { text; gotoModelKey; isLast }` data shape used by some host shells — the latter is a plain model, not what `s.breadcrumb` consumes.

## Related skills
- Parent: `raptor` (View/VM split, RSScriptor, bindings/events, `update()`).
- Siblings: `nav-tabs.md`, `navbar.md`, `list-group.md`, `button.md`, `text.md` (for anchor/span text content), `foreach.md` (data-driven crumb lists).
