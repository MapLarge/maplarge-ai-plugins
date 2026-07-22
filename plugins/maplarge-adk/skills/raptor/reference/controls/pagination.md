jsx
# Pagination

A presentational page-navigation strip (Bootstrap `pagination` markup). Use it to render Prev/Next or numbered page links; the active page and click-to-change logic live entirely in your ViewModel.

## When to use
- You want a classic pager (`« 1 2 3 … »`) to drive a page index your VM already tracks.
- You need clickable page links with `active`/`disabled` states you control.
- Not for paging a data set automatically — the data-grid control owns its own paging UI (see `data-grid.md`). Pagination here is pure UI you bind to your own `currentPage`/`pageCount` state.

## Builder
- `s.pagination(options?)` → node `type: "pagination"`, interface `ViewDefinitions.IPagination`. Renders `<nav><ul class="pagination">…</ul></nav>`. It opens a templates scope (`IPaginationScriptor`), so chain `.contentTemplates(s => …)` and emit `s.paginationLink(...)` items.
- `s.paginationLink(options?)` → node `type: "paginationLink"`, interface `ViewDefinitions.IPaginationLink`. Renders `<li class="page-item">`. Its scope (`IPaginationLinkScriptor`) exposes `.anchor(...)` — put the clickable `s.anchor({ pagerLink: true })` (interface `ViewDefinitions.IAnchor`, renders `<a class="page-link">`) inside its `.contentTemplates`.

Key `IPagination` fields: `ariaLabel?: string`, `size?: DisplayUtilities.PageNavigationSize` (`'default' | 'small' | 'large'` → adds `pagination-sm` / `pagination-lg`).
Key `IPaginationLink` fields: `label?`, `link?`, `state?: 'disabled' | 'active'`.
Key `IAnchor` fields: `pagerLink?: boolean` (adds `page-link`), `active?: boolean` (adds `active` + `aria-current="page"`), `href?` (defaults to `javascript:void(0)`), `target?`, plus text via `.text(...)`.

```ts
const s = RSScriptor.create<MyVm>();
s.view("pager", s => s
  .pagination({ ariaLabel: "Pages", size: "small" })
  .contentTemplates(s => {
    s.paginationLink().contentTemplates(s => s
      .anchor({ pagerLink: true, text: "Prev" })
      .events([{ event: "click", handler: "goPrev" }]));
    s.paginationLink().contentTemplates(s => s
      .anchor({ pagerLink: true, active: true, text: "1" })
      .events([{ event: "click", handler: "goToPage", param: 1 }]));
    s.paginationLink().contentTemplates(s => s
      .anchor({ pagerLink: true, text: "Next" })
      .events([{ event: "click", handler: "goNext" }]));
  }));
return s.build();
```

## Bindings & events
- All three nodes carry `bindings?: Bindings.IRaptorUniversalBindings` — i.e. `visible`, `css` (conditional `classes`/`trueClasses`/`falseClasses`), `attr`, `style`. There is no dedicated "current page" binding; drive `active`/`disabled` yourself via `css` on the anchor/link or by re-emitting the templates on `update()`.
- Events: `IPagination.events: Events.IEvent_Pagination[]`, `IPaginationLink.events: Events.IEvent_PaginationLink[]`, `IAnchor.events: Events.IEvent_Anchor[]`. All accept `event` ∈ `PointerEventTypes` (`'click'`, `'dblclick'`, `'mouseenter'`…), `ContextMenuEventType` (`'contextmenu'`), or `KeyboardEventTypes` (`'keydown'`/`'keyup'`). Wire clicks on the **anchor**, not the `<li>`. Pass the target page via `param` (static) or `paramKey` (looked up on the data context).

## ViewModel / instance API
The backing node class is `Pagination extends RaptorNode` (`nodeModel: ViewDefinitions.IPagination`). It is a thin DOM wrapper with **no behavioral public methods** — nothing to reach for at runtime. State (`currentPage`, `pageCount`) belongs in your own ViewModel; after changing it call `this.update("pager")` to re-render the strip. There is rarely any reason to grab the node instance; if you must, `raptorDom.nodeT<Pagination>("pager")`.

## Patterns
- **Numbered pager from a count.** Keep `private _pageCount` / `_currentPage` on the VM. In the view, loop `for (let i = 1; i <= vm.pageCount; i++)` emitting a `paginationLink` whose anchor has `active: i === vm.currentPage` and `events: [{ event:"click", handler:"goToPage", param: i }]`. In `goToPage(p)` set `_currentPage`, reload data, `update("pager")`.
- **Prev/Next with disabled ends.** Use `css` on the disabled-end anchors: `css: { property: "atFirstPage", trueClasses: ["disabled"] }` so the link greys out without re-emitting templates.
- **Foreach-driven links.** Instead of an imperative loop, bind a `pages` array with `s.paginationLink()` under a `foreach` content-templates scope and use `paramKey` to read each item's page number on click.

## Gotchas
- The `IPaginationLink.label` / `link` / `state` fields exist on the interface but the `paginationLink` renderer **ignores them** — it only renders `contentTemplates`. Put the visible text/href/active state on a nested `s.anchor(...)` (`text`, `href`, `active`, `pagerLink: true`), not on the link node.
- `size` values are `'default' | 'small' | 'large'`, NOT Bootstrap's `sm`/`lg` (a stale doc-comment says `'sm','md','lg'` — ignore it). Only `small`/`large` change anything.
- Without `pagerLink: true` the anchor renders as a bare `<a>` and loses the `page-link` Bootstrap styling that makes the pill look right inside `page-item`.
- Anchors default `href` to `javascript:void(0)`, so a `click` handler won't navigate; if you set a real `href`, the browser will navigate unless your handler prevents it.
- This control does not track or emit the selected page — there's no two-way "page" binding. Re-render on `update(viewName)` after you mutate your own page state.

## Related skills
- `raptor` (parent) — View/VM split, `RSScriptor.create`, `.contentTemplates`, events, `update(viewName)`.
- `data-grid.md` — when you actually want paged data; it has built-in paging.
- `button.md`, `nav-tabs.md`, `breadcrumb.md` — sibling navigation/action controls that share the same anchor/`IEvent` patterns.
