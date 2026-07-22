action elements: a single clickable `s.button(...)`, an inline cluster `s.buttonGroup(...)`, and the modal/alert X via `s.closeButton(...)`.

## When to use
- Any clickable action — submit, toggle, open a dialog, trigger a handler.
- An icon button (button with an SVG and optional text).
- The toggle/split-toggle that opens a dropdown menu (`dropdownToggle` / `dropdownToggleSplit`) — see `dropdown.md` for the menu itself.
- The header button inside an accordion (`accordionHeaderButton`) or a button styled as a list-group row (`listGroupButton`) — see `accordion.md` / `list-group.md`.
- A horizontal or `vertical` row of related buttons (`s.buttonGroup`).
- A dismiss "X" in a dialog header / alert (`s.closeButton`).

For non-button hyperlinks use `s.anchor`; for radio-as-button toggles see `forms.md` (`radioButtonGroup`).

## Builder
| builder | node `type` | option interface | node class |
|---|---|---|---|
| `s.button(opts)` | `"button"` | `ViewDefinitions.IButton` | `Button` (extends `RaptorNodeBase<IButton>`) |
| `s.buttonGroup(opts)` | `"buttonGroup"` | `ViewDefinitions.IButtonGroup` | `ButtonGroup` |
| `s.closeButton(opts)` | `"closeButton"` | `ViewDefinitions.ICloseButton` | (rendered inline) |

`IButton` extends `ITextControl` so it inherits `text`, `textColor`, `textAlignment`, etc. Key own fields:

- `kind?: ColorDefinitions.ButtonKind` — `'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link' | 'link-underline' | 'calendar' | 'nav-link'`. Omit only inside a list-group/accordion that styles the button itself.
- `size?: DisplayUtilities.ButtonSize` — `'large' | 'medium' | 'small'`.
- `outline?: boolean` — outline style instead of filled.
- `svgOptions?: ISvgOptions` / `svgBeforeText?: boolean` — icon with the text; icon defaults to *after* text unless `svgBeforeText`. (See `svg.md`.)
- `disabled?: boolean` + `disabledTooltip?: string` — when `disabledTooltip` is set the button is *soft*-disabled (no `disabled` attribute) so hover still shows the tooltip; otherwise the real `disabled` attribute is applied.
- `title?: string` — native hover tooltip. `noHover?: boolean` removes hover effect.
- `dropdownToggle?` / `dropdownToggleSplit?` / `hideDropDownArrow?` — dropdown trigger variants.
- `accordionHeaderButton?`, `listGroupButton?`, `calendarButton?` — context-specific styling.

`IButtonGroup`: `vertical?: boolean` (renders `btn-group-vertical` vs `btn-group`); its `contentTemplates` hold the child buttons.

```ts
const s = RSScriptor.create<MyVm>();
s.view("main", s =>
  s.buttonGroup({}).contentTemplates(s => {
    s.button({ kind: "primary", text: "Save", events: [{ event: "click", handler: "onSave" }] });
    s.button({ kind: "secondary", outline: true, text: "Cancel",
      svgOptions: { key: "x" }, svgBeforeText: true,
      disabled: true, disabledTooltip: "Nothing to cancel",
      bindings: { enable: "canCancel", text: "cancelLabel" },
      events: [{ event: "click", handler: "onCancel" }] });
  })
);
```

## Bindings & events
Button `bindings` (`IRaptorUniversalBindings & IRaptorInputBinding & IRaptorTooltipBinding & IRaptorTextBinding & IRaptorSvgBinding`):
- `enable` / `disable` (boolean — toggles the `disabled` attribute), `text`, `textColor`, `tooltip`, `disabledTooltip`, `svgKey`, `svgOptions`, `svgString`, plus universal `visible` / `css` / `style` / `attr`.
- Two declared `@BindingHandler`s on the `Button` node react to live changes: `svgKey` and `svgOptions` (swap the icon in place without a full re-render).

Events — `Events.IEvent_Button<T>[]`, where `event` is a `PointerEventTypes | ContextMenuEventType | KeyboardEventTypes` (`'click'`, `'dblclick'`, `'mousedown'`, `'pointerup'`, `'contextmenu'`, `'keydown'`, `'keyup'`, …). Each event has `handler` (VM method key) and optional `param` / `paramKey`. `closeButton` uses the same shape (`IEvent_CloseButton`); `buttonGroup` events (`IEvent_ButtonGroup`) attach to the wrapping group `div`.

ButtonGroup `bindings`: `IRaptorUniversalBindings & IRaptorTextBinding` only — no per-group enable/disable (set `enable`/`disabled` on the child buttons).

## ViewModel / instance API
The handler runs on the owning ViewModel; reach the node when you must mutate it directly:
```ts
const btn = this.raptorDom.nodeT<Button>("myButtonKey"); // if keyed
```
Most state is driven through bindings (flip `enable` / `text` / `svgKey` on the VM and call `update()` / `update("viewName")`), not by calling node methods. The `Button` node has no public API beyond the two icon-update binding handlers.

## Patterns
- **Icon-only button**: `s.button({ kind: "light", svgOptions: { key: "gear" }, title: "Settings", events: [{ event: "click", handler: "openSettings" }] })`.
- **Reactive label + disabled state**: bind `text` and `enable` to VM getters; the button re-renders on `update()` — no manual DOM edits.
- **Split dropdown**: a main `s.button({ dropdownToggle: true })` next to a second `s.button({ dropdownToggle: true, dropdownToggleSplit: true })` whose `contentTemplates` host the menu (`dropdown.md`).
- **Right-click menu**: add an event with `event: "contextmenu"` alongside the `click` handler.

## Gotchas
- `size` is `'large' | 'medium' | 'small'` (the `DisplayUtilities.ButtonSize` type), **not** `'sm' | 'md' | 'lg'` — the JSDoc on `IButton.size` says sm/md/lg but that abbreviation applies to a different (Choices toggle) validation path; trust the TS type.
- A button without `kind` renders unstyled unless it sits in a list-group/accordion that supplies styling. Set `kind` for standalone buttons.
- Use `disabledTooltip` (not `disabled` + `title`) when you need a tooltip on a disabled button — a truly `disabled` element swallows hover. With `disabledTooltip`, the button is soft-disabled (no native `disabled` attr).
- The rendered element is a real `<button type="button">` — it never submits a form on its own; wire `events` for behavior.
- ButtonGroup children must be declared inside `.contentTemplates(...)`; the builder hard-resets `contentTemplates: []`, so children passed any other way are dropped.
- `closeButton` defaults to `size: "small"` and `title: "Close"` when omitted.

## Related skills
- `raptor` — parent: View/VM split, RSScriptor.create, bindings/events mechanics, `update()`.
- `svg.md` — `ISvgOptions` / `svgKey` for button icons.
- `dropdown.md` — dropdown menus opened by `dropdownToggle` / `dropdownToggleSplit` buttons.
- `dialog.md` — `closeButton` in dialog headers (`renderDialog`/`renderDialogVM`).
- `forms.md` — `radioButtonGroup` (radio-as-button toggles) and form submit buttons.
- `accordion.md`, `list-group.md` — `accordionHeaderButton` / `listGroupButton` contexts.
