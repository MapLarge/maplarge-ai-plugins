# Raptor Dialog

A draggable, resizable, maximizable/minimizable modal window. Declared in a view with `s.dialog(...)`, opened/closed imperatively from a ViewModel.

## When to use

- A popup/modal: confirmation, form, settings, a detail view, a fullscreen chart.
- You want a window the user can drag, resize, maximize (double-click header) or minimize to a bottom dock — all are on by default.
- For non-modal docked panels prefer `dockablePanel` (`s.dockablePanel`); for a slide-in side region use `sidebar.md`.

## Builder

`s.dialog(options)` emits a node of `type: "dialog"` (`ViewDefinitions.IDialog`). It takes `.contentTemplates(...)` holding the child trio. Key option fields:

| field | type | notes |
| --- | --- | --- |
| `width` / `height` | number (px) | initial pixel size of the window shell |
| `size` | `DisplayUtilities.DialogSize` | `'default' \| 'small' \| 'large' \| 'extra large'` preset |
| `allowClose` | boolean | default **true** — renders the × button |
| `allowMaximize` | boolean | default **true** — maximize button + header dblclick |
| `allowMinimize` | boolean | default **true** — minimize-to-dock button |
| `animateMaximize` | boolean | default **true** — animate maximize/restore |
| `scrollable` | boolean | scroll the body (`.modal-dialog-scrollable`) |
| `verticallyCentered` | boolean | center vertically on open |
| `renderAtPoint` | boolean | open at the click point that triggered it |
| `dialogRenderingDefinitionModelKey` | string | model key linking the IDialog to its IRenderingDefinition; lets a per-dialog VM bind from the first render. Set it to the same key you register/open by. |
| `ariaLabelledBy` | string | id of the title element for `aria-labelledby` |
| `viewName` | string | name to reach the `Dialog` node via `raptorDom.nodeT` |
| `title` | string | **@deprecated, no effect** — put the title in a `s.heading` in the header |

The children are `s.dialogHeader` (`IDialogHeader`, `.modal-header`), `s.dialogBody` (`IDialogBody`, `.modal-body`), `s.dialogFooter` (`IDialogFooter`, `.modal-footer`), and `s.closeButton` (`ICloseButton`, the `.btn-close`). The framework re-parents `.btn-close` into the header's button toolbar next to the auto-generated min/max/close icons. Header/body/footer are plain containers — fill them with normal element builders.

```ts
// View: register a dialog as its own page-style rendering definition
export function MyDialog(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<MyDialogVm>();
    s.page("MyDialog", "My Dialog", "", "", false).view("main", s => s
        .dialog({
            viewName: "myDialog",
            width: 480, height: 260,
            allowMinimize: false,
            dialogRenderingDefinitionModelKey: "MyDialog",
        })
        .contentTemplates(s => s
            .dialogHeader({ padding: { around: 2 } }).contentTemplates(s => s
                .heading({ text: "My Dialog", size: 6, margin: { bottom: 0 } })
                .closeButton({ title: "Close" }))
            .dialogBody({}).contentTemplates(s => s
                .span({ bindings: { text: s.getTypedProp("message") } }))
            .dialogFooter({}).contentTemplates(s => s
                .button({ kind: "secondary", outline: true, text: "Cancel",
                    events: [{ event: "pointerdown", handler: s.getTypedProp("onCancel") }] })
                .button({ kind: "primary", text: "OK",
                    events: [{ event: "pointerdown", handler: s.getTypedProp("onOk") }] }))));
    return s.commitPage();
}
```

## Bindings & events

- `IDialog` supports `Bindings.IRaptorUniversalBindings` (`visible`, `customCssClasses`, etc.) and `events: IEvent_Dialog[]` (pointer / contextmenu / keyboard event types, `handler` is a VM method). Header/body/footer carry `IEvent_DialogHeader/Body/Footer` (same event-type union).
- `ICloseButton` adds `IRaptorInputBinding`, `events: IEvent_CloseButton[]` (extends button events), plus `suppressCloseX`, `white`, `ariaLabel`, `disabled`, `kind`, `size`, `title`.
- The auto-generated × button already calls `closeDialog()`; only wire a close event if you need extra side effects.

## ViewModel / instance API

- Backing node class: **`Dialog`** (extends `RaptorNode`). Reach the live instance with `raptorDom.nodeT<Dialog>("myDialog")` (the `viewName`) or `raptorDom.getDialogByVmKey(vmCtorKey)`.
- Useful `Dialog` methods/getters: `closeDialog()`, `maximizeDialog()` / `restoreDialog()` / `toggleMaximize()`, `minimizeDialog()` / `toggleMinimize()`, getters `maximized`, `minimized`, `dialogHeader` / `dialogBody` / `dialogFooter` / `closeButton` (HTMLElements), `nodeModel` (the `IDialog`).
- **Open/close from a ViewModel** (`RaptorViewModel` provides these):
  - `this.createDialog(modelKey, viewModelCtor?)` → returns the new dialog's model key string. Pass a VM ctor `(raptorDom, raptorEngine) => RaptorViewModel` to attach a per-dialog VM.
  - `this.createDialogVM(modelKey, vmInstance)` → use an already-constructed VM instance (e.g. to pass extra ctor args); returns `IDialogInfo` (`{ dialog, newDialogModelKey, ... }`).
  - `this.destroyDialog(modelKey)` — tears down the node and its VM. `this.destroyDialogByVmKey(key)` is the by-VM-key variant.
- Lower level on the engine: `raptorEngine.renderDialog(modelKeyOrDef, target?, vmCtor?)` and `raptorEngine.renderDialogVM(modelKeyOrDef, target?, vmInstance)`; `modelKeyOrDef` may be a registered key string **or** an inline `IViewDefinition`/`IRenderingDefinition`. Register a reusable definition first with `raptorEngine.addDialog(def)`.
- A dialog closing publishes `DialogClosingEvent` (`DialogClosingEventArgs.keys: string[]`) on `raptorDom.eventAggregator` — subscribe to react to close (e.g. resolve a promise).

## Patterns

**Open by registered key.** In a host VM, register once then open on demand:

```ts
this.raptorEngine.addDialog(MyDialog());          // once
this.createDialog("MyDialog", MyDialogVm);        // per open
```

**Open an inline definition with a prebuilt VM** (no global registration):

```ts
const vm = new MyDialogVm(this.raptorDom, this.raptorEngine, extraArg);
this.raptorEngine.renderDialogVM(MyDialog(), null, vm);
```

**Self-close.** Keep the key the open call returned and call `destroyDialog` from a footer-button handler:

```ts
this._key = this.createDialog("MyDialog", MyDialogVm);
// onOk / onCancel:  this.destroyDialog(this._key);
```

## Gotchas

- `title` on `IDialog` is **deprecated and does nothing** — render the title as a `heading`/text inside `dialogHeader`.
- The header is only auto-created when at least one of `allowClose/allowMaximize/allowMinimize` is true (or you author a `.modal-header`). With all three false and no header content there is no chrome to drag — provide a `dialogHeader`.
- Maximize/minimize/close icons are injected into a `.ml-dialog-header-buttons` toolbar; a view-supplied `.btn-close` is re-parented there. Don't hand-position it.
- `verticallyCentered`, `scrollable`, `size` mirror Bootstrap modal options; sizes set via `width`/`height` are inline pixels on the DRE shell and override `size`.
- Set `dialogRenderingDefinitionModelKey` to the same string you open with so per-dialog VM bindings resolve on the first render (otherwise early bindings may miss the VM).
- Don't construct `Dialog` directly — always go through `createDialog*` / `renderDialog*`.

## Related skills

- `raptor` — parent: View/VM split, RSScriptor.create, `update()`, bindings/events, `nodeT`, base VM classes.
- `forms.md`, `button.md` — typical dialog body/footer contents.
- `sidebar.md` — slide-in panel alternative to a floating modal.
- `echarts` — for charts placed inside a dialog body.
