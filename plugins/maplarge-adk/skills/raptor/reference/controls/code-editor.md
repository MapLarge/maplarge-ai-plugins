# Raptor Code Editor

Embed an editable code surface (Monaco or legacy CodeMirror) or a read-only code block in a Raptor view.

## When to use

- `s.codeEditorMonaco(...)` — the modern, full-featured editor (JS/TS/JSON/maplargeSQL, IntelliSense, themes, diagnostics). Prefer this for any new editor.
- `s.codeMirror(...)` — legacy CodeMirror editor, JavaScript-only with `ml.query`-style hinting. Use only to match existing code.
- `s.codeBlock({ code, language })` — static, read-only `<pre><code>` with a language class for highlighting.
- `s.code({ text })` — an inline `<code>` element for a short snippet in running text.

## Builder

### Monaco editor — `s.codeEditorMonaco(options)`

Node `type: "codeEditorMonaco"`, node class `CodeEditorMonaco` (extends `RaptorNodeBase<ICodeEditorMonaco>`). The renderer creates a `<div>` host; Monaco mounts into it asynchronously after `ensureMonacoEditorFramework()`.

Option fields (`ViewDefinitions.ICodeEditorMonaco`):

- `editorOptions?: monaco.editor.IStandaloneEditorConstructionOptions` — initial value/language/theme/minimap/fontSize/lineNumbers/etc. If omitted, defaults to `{ value: "", language: "javascript", theme: <dark-or-vs from current Raptor theme> }`.
- `loadIntellisense?: boolean` — when true, fetches the server `.d.ts` and registers it as a TS extra-lib so the editor offers platform autocomplete.
- `editorModel?: monaco.editor.ITextModel` — supply a pre-built text model.
- `viewName?` — set this so you can fetch the node later (see ViewModel API).

```ts
// View
s.codeEditorMonaco({
  viewName: "myEditor",
  loadIntellisense: true,
  editorOptions: { language: "javascript", minimap: { enabled: false }, automaticLayout: true },
  bindings: { data: getTypedProp<MyVm>("editorData") },
  events: [{ event: "onDidChangeModelContent", handler: "onCodeChanged" }],
});

// ViewModel
private _editorData: ICodeEditorMonacoOptions = { code: "return ml.query();", language: "javascript" };
public get editorData() { return this._editorData; }
public set editorData(v) { this._editorData = v; }
```

### Read-only block — `s.codeBlock(options)`

Node `type: "codeBlock"`, no backing node class. Renders `<pre><code class="<language>">{code}</code></pre>`.

```ts
s.codeBlock({ code: myJsonString, language: "json" });
```

### Inline — `s.code(options)`

Node `type: "code"` (class `Code`, a passive `RaptorNodeBase<ICode>`). `ICode` extends `ITextControl`, so use `text` (or a `text` binding).

```ts
s.code({ text: "myFunction()" });
```

### Legacy — `s.codeMirror(options)`

Node `type: "codeEditor"`, class `CodeEditor`. `ICodeEditor` binds a plain `string` via `data`. Fixed JS mode, `paraiso-dark` theme, F10 fullscreen, Ctrl-Q toggle-comment, Ctrl-Space / `.` autocomplete.

## Bindings & events

- **Monaco** (`bindings: IRaptorUniversalBindings & IRaptorCodeEditorMonacoBindings`): the only control-specific key is **`data`**, of type `ICodeEditorMonacoOptions` (`code`, `language`, `readOnly`, `syntaxHighlightingModelUri`, `modelUri`, `lint`). Two-way: `applyBindingData` pushes the bound object into the editor; an edit writes `{ code, language }` back out via the change handler. Setting `data.readOnly` toggles edit-lock live; setting `data.language` swaps the language and rebuilds the model.
- **Monaco events** (`IEvent_CodeEditorMonaco`): `event` is a `MonacoEvent` — one of `onDidChangeModelContent`, `onDidChangeModelLanguage`, `onDidChangeCursorPosition`, `onDidChangeCursorSelection`, `onDidFocusEditorText`, `onDidBlurEditorText`, `onDidPaste`, `onMouseDown`/`Up`/`Move`/`Leave`, `onContextMenu`, `onKeyDown`/`onKeyUp`, `onDidLayoutChange`, `onDidScrollChange`, and more (28 total). Handler is invoked as `fn(node, monacoEditor, evtArg)`.
- **CodeMirror** (`ICodeEditor`): `data` binds a `string`; events are DOM `IEvent_CodeEditor` (pointer/context-menu/keyboard).
- **codeBlock / code**: universal + text bindings only; no editing events.

## ViewModel / instance API

Reach the Monaco node from a ViewModel via `this.raptorDom.nodeT<CodeEditorMonaco>("myEditor")`. The Monaco DOM mounts asynchronously, so go through the async accessor:

- `getEditorAsync(): Promise<monaco.editor.IStandaloneCodeEditor>` — resolves once the editor is initialized; the safe way to touch the live editor.
- `setEditorValue(value: string)` — replace contents.
- `getTextModel(): monaco.editor.ITextModel` — the current model.
- `compileWithDiagnostics(uri): Promise<string>` — TS-compile the model, returning emitted JS (or `undefined` if there were errors/skips).
- `refresh()` — focus + run `editor.action.formatDocument`.

The CodeMirror `CodeEditor` exposes `editor` (the `CodeMirror.EditorFromTextArea`), `codeMirrorDoc`, `codeEditorValue`, `setEditorValue`, and `refresh`.

## Patterns

**Read-only viewer with a toggle.** Bind `data` to an `ICodeEditorMonacoOptions` and flip `readOnly` on the bound object, then `update(viewName)` — the editor re-locks without remounting.

**JSON with schema validation.** Set `data.language = "json"` and a `syntaxHighlightingModelUri` (or let the control auto-pick a query/table schema URI when the JSON shape is recognized) to get validation squiggles.

**Run the snippet.** Pair the editor with `CodeEditorMonacoExecutor.runSnippet(code, mode, language)` (in the same control folder) to execute the current contents.

## Gotchas

- The editor is **async**: never assume `getEditorAsync()` has resolved in the same tick as render. Calls before init are queued (`_delayedBindings`) — only the last queued binding runs once ready.
- `applyBindingData` sets an internal `_applyingData` guard, so programmatic value pushes do **not** re-fire your `onDidChangeModelContent` handler — only user edits round-trip out.
- Theme follows the Raptor theme automatically (subscribes to `RaptorThemeChangedEvent`, `vs-dark` vs `vs`); don't hard-code a theme expecting it to stick across theme switches.
- `editorOptions` is applied **only at create time**; to change options later use `editor.updateOptions(...)` via `getEditorAsync()`, not by mutating the view definition.
- `codeBlock` does no JS-side highlighting itself — it just adds the `language` as a CSS class for whatever highlighter the page loads.
- Set `automaticLayout: true` (or call `editor.layout()`) if the editor lives in a container that resizes (panels, dialogs), or it can render at the wrong size.

## Related skills

- `raptor` — parent skill: View/VM split, RSScriptor basics, bindings/events, `update()`, `raptorDom.nodeT`.
- `markdown.md` — for rendering Markdown (which itself emits code blocks).
- `forms.md`, `text.md` — sibling input/text controls.

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## Code editor controls — reference

## Builder → node type → class → options

| Builder | `type` | Node class | Options interface | Data binding payload |
| --- | --- | --- | --- | --- |
| `s.codeEditorMonaco(opts)` | `codeEditorMonaco` | `CodeEditorMonaco extends RaptorNodeBase<ICodeEditorMonaco>` | `ViewDefinitions.ICodeEditorMonaco` | `ICodeEditorMonacoOptions` (via `data`) |
| `s.codeMirror(opts)` | `codeEditor` | `CodeEditor extends RaptorNode` | `ViewDefinitions.ICodeEditor` | `string` (via `data`) |
| `s.codeBlock(opts)` | `codeBlock` | — (renderer only) | `ViewDefinitions.ICodeBlock` | — |
| `s.code(opts)` | `code` | `Code extends RaptorNodeBase<ICode>` | `ViewDefinitions.ICode` | — (text) |

Note: there is no `s.codeEditor(...)` builder on the scriptor instance even though the interface lists `codeEditor`/`codeEditorMonaco` as no-arg overloads; the concrete methods are `codeMirror` (CodeMirror) and `codeEditorMonaco` (Monaco).

## ViewDefinitions.ICodeEditorMonaco

```ts
interface ICodeEditorMonaco extends IViewDefinitionWithBindings {
  editorOptions?: monaco.editor.IStandaloneEditorConstructionOptions;
  editorModel?: monaco.editor.ITextModel;
  loadIntellisense?: boolean;
  bindings?: IRaptorUniversalBindings & IRaptorCodeEditorMonacoBindings;
  events?: Events.IEvent_CodeEditorMonaco[];
}
```

## ICodeEditorMonacoOptions (the `data` payload)

```ts
interface ICodeEditorMonacoOptions {
  code?: string;                     // source text
  language: string;                  // 'javascript' | 'typescript' | 'json' | maplargeSQL | ...
  readOnly?: boolean;                // live edit-lock toggle
  lint?: boolean;                    // enable syntax checking
  syntaxHighlightingModelUri?: string; // JSON schema model URI for validation
  modelUri?: string;                 // shared model URI for cross-model refs
}
```

For JSON when no `syntaxHighlightingModelUri` is set, the control auto-selects a built-in schema:
`CodeEditorMonaco.modelUris.json.query` (`http://maplarge/query.json`) if the JSON has `sqlselect`/`where`/`table`, else `...modelUris.json.table` (`http://maplarge/table.json`).

## ICodeEditor / ICodeBlock / ICode

```ts
interface ICodeEditor extends IViewDefinitionWithBindings, IViewDefinitionWithEvents {
  bindings?: IRaptorUniversalBindings & IRaptorDataBinding<string>;
  events?: Events.IEvent_CodeEditor[];               // pointer | context-menu | keyboard
}
interface ICodeBlock extends IViewDefinitionWithBindings {
  code: string;
  language?: string;                                 // becomes a CSS class on <code>
}
interface ICode extends ITextControl, IViewDefinitionWithBindings, IViewDefinitionWithEvents {
  // 'text' from ITextControl; renders inline <code>
  bindings?: IRaptorUniversalBindings & IRaptorTextBinding;
  events?: Events.IEvent_Code[];
}
```

## MonacoEvent union (IEvent_CodeEditorMonaco.event)

`onDidChangeModelContent`, `onDidChangeModelLanguage`, `onDidChangeModelLanguageConfiguration`, `onDidChangeModelOptions`, `onDidChangeConfiguration`, `onDidChangeCursorPosition`, `onDidChangeCursorSelection`, `onWillChangeModel`, `onDidChangeModel`, `onDidChangeModelDecorations`, `onDidFocusEditorText`, `onDidBlurEditorText`, `onDidFocusEditorWidget`, `onDidBlurEditorWidget`, `onDidCompositionEnd`, `onDidAttemptReadOnlyEdit`, `onDidPaste`, `onMouseUp`, `onMouseDown`, `onContextMenu`, `onMouseMove`, `onMouseLeave`, `onKeyUp`, `onKeyDown`, `onDidLayoutChange`, `onDidContentSizeChange`, `onDidScrollChange`, `onDidChangeHiddenAreas`.

Handler invocation: `fn(node: CodeEditorMonaco, editor: monaco.editor.IStandaloneCodeEditor, evtArg)`.

## CodeEditorMonaco public methods

| Method | Purpose |
| --- | --- |
| `getEditorAsync(): Promise<IStandaloneCodeEditor>` | awaits init, returns the editor (preferred entry point) |
| `setEditorValue(value: string)` | replace contents |
| `getTextModel(): ITextModel` | current model |
| `compileWithDiagnostics(uri: monaco.Uri): Promise<string>` | TS compile → emitted JS, or undefined on errors |
| `refresh()` | focus + `editor.action.formatDocument` |
| `applyBindingData({ data })` | (binding hook) push `ICodeEditorMonacoOptions` into the editor |
| `static modelUris` | built-in JSON schema model URIs |

## CodeEditor (CodeMirror) members

`editor: CodeMirror.EditorFromTextArea`, `codeMirrorDoc: CodeMirror.Doc`, `codeEditorValue: string`, `setEditorValue(v)`, `refresh()`, `applyBindingData({ data: string })`.
Fixed config: JS mode, theme `paraiso-dark`, `lineNumbers`, `matchBrackets`, `autoCloseBrackets`, `styleActiveLine`; extraKeys F10 fullscreen, Ctrl-Q toggleComment, Ctrl-Space autocomplete, `.` triggers autocomplete.

## Reaching a node

```ts
const node = this.raptorDom.nodeT<CodeEditorMonaco>("myEditor");
const editor = await node.getEditorAsync();
editor.updateOptions({ readOnly: true });
```
