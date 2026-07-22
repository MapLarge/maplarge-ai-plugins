# Navbar

A Bootstrap-style `<nav>` header/menu bar. The builder is a structural container only — brand, links, toggler and collapsible content are nested through `contentTemplates` using ordinary element builders.

## When to use
- A page/app **header bar** or top menu strip with a brand, links, and an optional responsive hamburger toggle.
- Anything that should render as a single `<nav>` with Bootstrap `.navbar*` classes.

Not for: in-page tab switching (use `nav-tabs.md`), an off-canvas/left rail menu (`sidebar.md`), or breadcrumbs (`breadcrumb.md`).

## Builder
- Method: `s.navbar(options?: ViewDefinitions.INavbar)`
- Node `type`: `"navbar"`
- Renders: `dom.createElement('nav')`; registers the `Navbar` node class.
- Children: `s.navbar(...)` returns a templated scriptor, so chain `.contentTemplates(s => ...)` to add the brand/links/toggler.

Key `INavbar` option fields:
| Field | Type | Effect |
|---|---|---|
| `expand` | `DisplayUtilities.NavbarExpandSize` | Adds `navbar-expand-{sm,md,lg,xl,xxl}` — breakpoint above which it lays out horizontally. **Values are `"small"|"medium"|"large"|"x large"|"xx large"`**, NOT `xs/sm/md`. |
| `navbarKind` | `ColorDefinitions.NavbarKind` (`"light"|"dark"|"primary"`) | Adds the matching `navbar-*` + `bg-*` pair. |
| `navbarType` | `'light' \| 'dark'` | Adds `navbar-dark` (else `navbar-light`) for text contrast. |
| `toggler` | `boolean` | Intent flag for showing a hamburger on small screens (you still render the toggle button + collapse target yourself). |
| `collapseId` | `string` | ID of the collapsible content region the toggler targets. |
| `fluid` | `boolean` | Full-width container. |
| `minHeight` | `number` | Min height in px. |
| `removeDefaultBehavior` | `boolean` | Omits the default `navbar navbar-expand-lg` classes. |
| `static` | `boolean` | Adds `fixed-top` (see Gotchas — use `static`, not `isStatic`). |

```ts
// View
s.navbar({ navbarKind: "dark", expand: "large", fluid: true, minHeight: 56 })
 .contentTemplates(s => s
    .link({ class: "navbar-brand", href: "#" }).contentTemplates(s => s.text("MyApp"))
    .button({ class: "navbar-toggler", attr: { "data-bs-toggle": "collapse", "data-bs-target": "#mainNav" } })
        .contentTemplates(s => s.span({ class: "navbar-toggler-icon" }))
    .div({ class: "collapse navbar-collapse", attr: { id: "mainNav" } })
        .contentTemplates(s => s
            .div({ class: "navbar-nav" }).contentTemplates(s => s
                .link({ class: "nav-link", href: "#a" }).contentTemplates(s => s.text("Home"))
                .link({ class: "nav-link", href: "#b" }).contentTemplates(s => s.text("Reports")))));
```

## Bindings & events
- `bindings`: `Bindings.IRaptorUniversalBindings` — `visible`, `css`, `style`, `attr`, `prefixes` (no text/value binding on the `<nav>` itself; put those on child nodes).
- `events`: `Events.IEvent_Navbar[]` — `event` is one of `PointerEventTypes` (`click`, `dblclick`, `mousedown/up`, `mouseover/out`, `mouseenter/leave`, `pointer*`), `'contextmenu'`, or `KeyboardEventTypes` (`keydown`, `keyup`).

## ViewModel / instance API
The node class is `Navbar extends RaptorNode` — a thin wrapper exposing only `nodeModel: INavbar`; there is no behavioral API to drive at runtime. Reach it (rarely needed) via `raptorDom.nodeT<Navbar>("viewName")` after tagging the navbar with a view name. State (which links are active, collapsed/expanded) lives in your own ViewModel and on the child nodes, re-rendered via `update()`/`update("viewName")`.

## Patterns
- **Brand + responsive collapse:** set `expand` to your breakpoint, render a `.navbar-toggler` button whose `data-bs-target` matches a `.collapse.navbar-collapse` div carrying `collapseId`. Below the breakpoint the toggler shows; above it the links lay out inline.
- **Active link via binding:** drive each `nav-link`'s active state from a VM getter using a `css` binding (`property` + `trueClasses: ["active"]`), then call `update("navView")` on selection.
- **Theme-reactive colors:** prefer `navbarKind`/`navbarType` for contrast; for custom backgrounds set a `style`/`css` binding tied to a theme CSS variable rather than hardcoding hex.

## Gotchas
- **`expand` enum is verbose**, not Bootstrap shorthand: use `"x large"`/`"xx large"`, not `"xl"`/`"xxl"`. The JSDoc on the field saying `'xs','sm','md'…` is misleading — `addNavbarExpandUtility` only accepts the long form.
- **`isStatic` is a dead field.** The interface declares `isStatic?: boolean`, but the renderer checks `def.static` (the base `IViewDefinition.static`) to add `fixed-top`. Set **`static: true`** to pin the navbar; `isStatic` does nothing.
- **No child builders exist** for `navbar-brand` / `navbar-nav` / `nav-item` / `nav-link` — they're plain elements. Apply the Bootstrap classes yourself via `class:` / `.attr`.
- `navbarType` and `navbarKind` both emit `navbar-dark`/`navbar-light`; if both are set the kind's classes are appended after, so the kind's contrast wins. Pick one source of truth.
- The toggler/collapse behavior relies on Bootstrap's `data-bs-toggle="collapse"` + matching target id — `toggler: true` and `collapseId` are hints; the working markup is the button's `data-bs-target` matching the collapse div's `id`.

## Related skills
- Parent: `raptor` (View/VM split, RSScriptor.create, contentTemplates, bindings/events, update()).
- Siblings: `nav-tabs.md` (in-page tab switching), `sidebar.md` (off-canvas/side menu), `breadcrumb.md`, `dropdown.md` (menus inside a navbar), `button.md`, `raptor-link`/`text.md` for nav contents.
