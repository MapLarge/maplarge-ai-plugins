# Raptor Text, HTML & Rich Text

Static and bound text, raw sanitized HTML, and an @-mention rich text input.

## When to use

- Show a static or data-bound label, caption, heading, or value -> the **text family** (`heading`/`p`/`span`/`label`/`small`/`strong`/`code`).
- Inject a string of HTML you already have (server-rendered fragment, formatted snippet) -> **`html`** (sanitized by default).
- Let a user type free text with `@`-triggered link/mention tokens drawn from named link datasets -> **`richTextInput`**.
- For Markdown source use `s.markdown` (sibling `markdown.md`); for editable code use `code-editor.md`. For a styled `<table>` see `table.md`.

## Builder

All text-family builders take an options object extending `ViewDefinitions.ITextControl` and return the root scriptor (chainable). The `type` string equals the method name except `p`/`paragraph` -> `"paragraph"`.

| Method | node `type` | option interface |
| --- | --- | --- |
| `s.heading(opts)` | `"heading"` | `IHeading` |
| `s.p(opts)` / `s.paragraph(opts)` | `"paragraph"` | `IParagraph` |
| `s.span(opts)` | `"span"` | `ISpan` |
| `s.label(opts)` | `"label"` | `ILabel` |
| `s.small(opts)` / `s.strong(opts)` / `s.code(opts)` | `"small"`/`"strong"`/`"code"` | `ISmall`/`IStrong`/`ICode` |
| `s.html(opts?)` | `"html"` | `IHtml` |
| `s.richTextInput(opts)` | `"richTextInput"` | `IRichTextInput` |

`ITextControl` fields (shared by the whole text family): `text` (static content), `description` (tooltip/aria), `textColor` (`ColorDefinitions.TextKind`), `backgroundColor`, `textAlignment`, `italic`, `muted`, `highlight`, `textWrap`/`textWrap2` (`DisplayUtilities.TextWrap`), `wordBreak`, `lineHeight` (`1|'sm'|'base'|'lg'`), `textDecoration` (`'underline'|'line-through'|'none'`), `textTransform` (`'lowercase'|'uppercase'|'capitalize'`), `fontWeight` (`'bold'|'bolder'|'medium'|'normal'|'light'|'lighter'|'semibold'`), `borderColor`/`borderWidth`/`borderStrokeDashArray`.

Per-control extras: `IHeading` adds `size` (`HeadingSize = 1..6`), `displayHeading` (`DisplayHeading = 1..6`), `cardTitle`, `cardSubtitle`. `IParagraph` adds `lead`, `cardText`. `ISpan` adds `badge`, `roundedPill`, `srOnly`, `treeCaret`, `contentEditable`. `ILabel` adds `for`, `formLabel`, `visible`. `IHtml` adds `purify` (default `true`). `IRichTextInput` adds `linkDataSets: string[]`, `multiline`, `placeholder`.

```ts
// inside a view function: const s = RSScriptor.create<MyVm>();
s.heading({ size: 3, text: "Overview" });
s.span({ bindings: { text: s.getTypedProp("myThing") } });          // bound value
s.p({ muted: true, italic: true, text: "no items selected" });
s.html({ bindings: { text: s.getTypedProp("htmlSnippet") } });      // sanitized HTML
s.richTextInput({
    placeholder: "Type @ to mention…",
    linkDataSets: ["users"],
    bindings: { data: s.getTypedProp("noteData") },                 // IRichTextInputData
});
```

## Bindings & events

- **Text family** binds via `IRaptorTextBinding`: `text` (string|number), `textColor`, `textBgColor`, `tooltip` (string or `ITooltipConfig`) — plus `IRaptorUniversalBindings` (`visible`, `cssClass`, `style`, `attr`, …). Bound `text` overrides the static `text` option. Events: `IEvent_*` allowing `PointerEventTypes` (`click`, `dblclick`, `pointerover`, `mouseenter`, …), `'contextmenu'`, and `keydown`/`keyup`.
- **`html`** binds `text` (the HTML string) **and** `data` (`IRaptorApplyBindingDataBinding<string>` -> calls `applyBindingData`). Events allow pointer/contextmenu/keyboard; the node also fires a custom `"HTMLRENDERED"` handler (called as `fn(node, newHtml)` after each render) — wire it via an `events` entry with `event: "HTMLRENDERED"`.
- **`richTextInput`** binds `data` (`IRaptorDataBinding<IRichTextInputData>`: `{ text, linkDataSets, multiline }`) and `enable`/`disable`. It is two-way: on blur / Enter / token insert it writes the current value (with link codes) back through the `data` binding.

## ViewModel / instance API

Backing node classes: `Heading`, `Paragraph` (text family share `RaptorNode`), `Html`, `RichTextInput` (`@LateBoundNode`). Reach an instance with `this.raptorDom.nodeT<Html>("viewName")` (give the node a `viewName`/key). Useful members:

- `Html`: `usePurify` getter, `previousHtml`, static `Html.loadAndWaitForExternalScripts()` / `Html.HtmlIsReadyPromise` (DOMPurify load gate). Sanitizes only when `purify !== false`.
- `RichTextInput`: `isMultiline`, `linkDatasets` getters; `show()`/`hide()`/`ddButtonAction()` for the mention dropdown; text round-trips through link codes (token spans carry `data-code`).

## Patterns

- **Bound stat tile**: `s.heading({ size: 2, bindings: { text: s.getTypedProp("count") } })` then `s.small({ muted: true, text: "tasks" })`.
- **Conditional muted empty-state**: `s.p({ muted: true, bindings: { text: s.getTypedProp("statusMsg"), visible: s.getTypedProp("isEmpty") } })`.
- **Badge**: `s.span({ badge: true, roundedPill: true, textColor: "white", backgroundColor: "var(--bs-primary)", bindings: { text: s.getTypedProp("label") } })`.
- **Safe server HTML**: keep `purify` default-on; only set `purify: false` for fully trusted, already-sanitized markup.

## Gotchas

- `IHeading.size` is the **number** `1..6` (renders `<h1>`..`<h6>`), not `'h1'`; the JSDoc string examples are misleading.
- `html` sanitizes asynchronously and is throttled (~100ms) — DOMPurify is lazily loaded, so the first paint may lag; await `Html.HtmlIsReadyPromise` if you need it ready. Re-render is skipped when the new (trimmed) HTML equals the previous, so toggling whitespace-only changes is a no-op.
- For untrusted strings prefer `text` binding (text-escaped) over `html`; only use `html` when you intentionally want markup.
- `richTextInput` requires `linkDataSets` names that resolve through the link-dataset store; with no matching datasets the `@` dropdown is empty. It uses `contentEditable = "plaintext-only"` (falls back to `"true"` on Firefox).
- Prefer `s.span`/`s.p` over `s.html` for plain dynamic text — it's lighter and auto-escaped.

## Related skills

- Parent: `raptor` (View/VM split, `RSScriptor.create`, `getTypedProp`, bindings/events, `update()`).
- Siblings: `markdown.md` (Markdown source), `code-editor.md` (editable code / CodeMirror / Monaco), `table.md` and `list-group.md` (other content containers), `button.md`/`card.md` (often hold text), `svg.md`/`image.md` (non-text media).
