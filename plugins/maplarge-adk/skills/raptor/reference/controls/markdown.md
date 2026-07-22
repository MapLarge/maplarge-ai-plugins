# Raptor Markdown

Renders a Markdown string as sanitized HTML using `marked` + `DOMPurify`, with heading anchors, copyable code blocks, and safe links.

## When to use
- Displaying Markdown text: LLM/chat output, release notes, README-style help, descriptions, any formatted prose stored as Markdown.
- You want the rich client pipeline (GitHub-style tables, fenced code blocks with a Copy button, `#hr-...` heading ids, `target="_blank"` links) — use the `data` binding.
- For a single inline paragraph with no code/anchors, the `text` binding uses a lighter synchronous parser instead.
- Not for raw trusted HTML (use `s.html()`) or a non-rendered code snippet (use `s.code()`).

## Builder
Method `s.markdown(options?)`, node `type: "markdown"`, view-definition interface `ViewDefinitions.IMarkdown`. Key option fields:
- `separateCodeblocks?: boolean` — extract fenced code into a `<div class="ml-raptor-markdown-code-block">` wrapper with a `Copy` button (`.ml-raptor-markdown-code-copy-btn`) over a `<pre class="ml-raptor-markdown-code-pre"><code>`.
- `openLinksInNewTab?: boolean` — defaults to **true** (only `=== false` disables it); adds `target="_blank" rel="noopener noreferrer"` to links.
- `markdown?: string` — declared static content field on the interface (the control itself renders from the bound `data`/`text` value, so drive content through a binding).

```ts
// View
s.markdown({ separateCodeblocks: true })
  .bindings({ data: s.getTypedProp(vm => vm.markdownText) })
  .events([{ event: "markdownrendered", handler: s.getTypedProp(vm => vm.onRendered) }]);

// ViewModel
export class MyVm extends DynamicViewModel {
    private _markdownText = "# Hello\n\nSome **bold** text.";
    public get markdownText() { return this._markdownText; }
    public set markdownText(v: string) { this._markdownText = v; this.update("myView"); }
    public onRendered(node: Markdown, html: string) { /* post-process */ }
}
```

## Bindings & events
Bindings (`IMarkdown.bindings` = `IRaptorUniversalBindings & IRaptorTextBinding & IRaptorApplyBindingDataBinding<string>`):
- `data` — the primary content binding. Routed to the control's `applyBindingData({ data })`, which runs the full `marked` + `DOMPurify` pipeline (custom table/heading/link/code renderers). Throttled at 100ms; re-renders only when the string actually changes.
- `text` — alternative content binding. Handled by the Renderer's text path via `markdownParser.renderMarkdownTextToHtml(...)` (a lighter, synchronous block parser) — no code-copy buttons, heading ids, or link-target rewrite.
- `textColor`, `textBgColor`, `tooltip`, plus universal bindings (`visible`, `cssClass`, `style`, etc.).

Events (`Events.IEvent_Markdown[]`):
- `MARKDOWNRENDERED` (matched case-insensitively) — fires after each successful render. The handler is called as `handler(node, sanitizedHtml)`: the `Markdown` node instance and the final sanitized HTML string. Note the `IEvent_Markdown` TS type only declares pointer/contextmenu/keyboard event names, so cast/loosen the literal when wiring `markdownrendered`.

## ViewModel / instance API
Backing control class: `Markdown` (extends `RaptorNodeBase<ViewDefinitions.IMarkdown>`). Reach the instance with `raptorDom.nodeT<Markdown>("viewName")`. Most code never touches it — bind content and listen for `MARKDOWNRENDERED` instead. Useful members:
- `applyBindingData({ data }): void` — imperatively render a Markdown string (what the `data` binding calls).
- `previousMarkdownText: string` — last rendered source; guards no-op re-renders.
- static `Markdown.loadExternalScripts()` — lazy-loads `marked` and `DOMPurify` (called automatically on construct/render).
- static `Markdown.generateHeadingId(text, existingIds)` / `generateHeadingText(tokens)` — the `hr-<slug>` anchor-id scheme.

## Patterns
- LLM/chat stream: keep the source in a VM string getter, bind it via `data`, and call `update("chatView")` as tokens arrive — the throttle + change-check keeps re-render cheap.
- Code-heavy docs: set `separateCodeblocks: true` to get a working Copy button per fenced block automatically (no extra wiring).
- In-page anchors: rely on the auto `id="hr-<slug>"` on headings to build a table of contents that links to `#hr-...`.

## Gotchas
- The static `markdown` interface field is not what the control reads at render time — drive content through the `data` (or `text`) binding.
- Output is always DOMPurify-sanitized (with `ADD_ATTR: ['target']`); script/dangerous markup is stripped — do not rely on injecting executable HTML.
- `data` (rich) and `text` (light) take different render paths with different feature sets; pick the one whose features you need rather than mixing them.
- `openLinksInNewTab` is on unless explicitly `false`.
- Setting the same string again is a no-op (guarded by `previousMarkdownText`); empty/whitespace clears the element.
- First render may be async — `marked`/`DOMPurify` are lazy-loaded, so `MARKDOWNRENDERED` is your signal that HTML is in the DOM.

## Related skills
- `raptor` — parent skill: View/VM split, `RSScriptor.create`, `.bindings`/`.events`, `getTypedProp`, `update()`, `nodeT`.
- `text.md` — plain/inline text and the `IRaptorTextBinding` family.
- `code-editor.md` — editable/syntax-highlighted code (vs. read-only rendered code blocks here).
- `custom-nodes.md` — building your own `RaptorNodeBase` control like `Markdown`.
