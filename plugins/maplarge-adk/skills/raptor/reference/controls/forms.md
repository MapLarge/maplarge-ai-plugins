# Raptor Forms

Data-entry controls: text/number/date/file inputs, checkboxes, switches, radio buttons (and groups), textareas, labels, and the wrapping form/input-group containers, with two-way value/checked binding and validation. Use this to build object editors that read and write a ViewModel's properties.

## When to use

- Any data-entry UI: settings panels, parameter editors, login/search boxes, per-field "object editor" forms.
- A single value: pick `s.input` (text/number/date/file/color/...), `s.checkbox`/`s.switch` (boolean), `s.textArea` (multiline), `s.radioButtonGroup` (one-of from a list).
- A whole object's fields: drive a `foreach` over a list of field descriptors, emitting one input per descriptor (see Patterns).
- For richer single-select dropdowns prefer `s.quickSelect` (select.md) over the deprecated `s.select`. Sliders are slider.md.

## Builders, node types, key options

All live on the RSScriptor root scriptor (`s`). Each sets a `type` string and merges your options.

| Builder | node `type` | View-def interface | Key fields |
| --- | --- | --- | --- |
| `s.form(o)` | `"form"` | `ViewDefinitions.IForm` | `inline?`, `browserValidation?` (HTML5), `events`, `bindings` |
| `s.input(o)` | `"input"` | `ViewDefinitions.IInput` | `inputType?` (`InputType`), `value?`/`property?`, `label?`, `placeholder?`, `disabled?`/`readonly?`, `min?`/`max?`/`step?` (number), `inputMask?`, `validate?`, `size?` (`InputSize`) |
| `s.checkbox(o)` | `"checkbox"` | `ViewDefinitions.ICheckBox` | `label?`, `switch?`, `value?:boolean`, `inline?`, `id?` |
| `s.switch(o)` | `"switch"` | `ViewDefinitions.ISwitch` (extends ICheckBox) | same as checkbox; rendered as a toggle |
| `s.radio(o)` | `"radio"` | `ViewDefinitions.IRadioButton` | `name?` (group), `value?`, `label?`, `checked?`, `inline?` — child of a radio group scriptor |
| `s.radioButtonGroup(o)` | `"radioButtonGroup"` | `ViewDefinitions.IRadioButtonGroup` | `groupName?`, `labelProperty?`, `valueProperty?`; supply options via `bindings.options` or `.radio(...)` children in `contentTemplates` |
| `s.textArea(o)` | `"textArea"` | `ViewDefinitions.ITextArea` | `label?`, `placeholder?`, `rows?`, `inputMask?` |
| `s.label(o)` | `"label"` | `ViewDefinitions.ILabel` | `text?`, `for?`, `formLabel?`, `isFloating?`, `visible?` |
| `s.inputGroup(o)` | `"inputGroup"` | `ViewDefinitions.IInputGroup` | `hasValidation?`; wrap inputs + `s.inputGroupText({text})` addons in `contentTemplates` |

`IInputType` (base for input/checkbox/switch/radio/textArea/select) adds: `value?`, `property?`, `validate?`, `multiple?`, `accept?` (file), `size?`, `srOnly?`, `noAutoEvent?`.

```ts
// View — a small object editor over MyVm
const s = RSScriptor.create<MyVm>();
s.view("editor", s => s.form({ browserValidation: true }).contentTemplates(s => {
    s.label({ text: "Name", formLabel: true });
    s.input({
        inputType: "text", placeholder: "Enter a name",
        bindings: { value: s.getTypedProp(x => x.name) }
    });
    s.input({
        inputType: "number", min: 0, max: 100,
        bindings: { value: s.getTypedProp(x => x.count), enable: s.getTypedProp(x => x.isEditable) }
    });
    s.checkbox({ label: { text: "Active" }, bindings: { checked: s.getTypedProp(x => x.active) } });
    s.switch({ label: { text: "Notify" }, bindings: { checked: s.getTypedProp(x => x.notify) } });
    s.textArea({ rows: 4, placeholder: "Notes", bindings: { textInput: s.getTypedProp(x => x.notes) } });
}));
```

## Bindings & events

Two-way binding keys (from `IRaptorInputBinding` and friends):

- `value` (`IRaptorValueBinding`) — input/textarea/radio value as string.
- `textInput` (`IRaptorTextInputBinding`) — like value but fires on each keystroke (string | number).
- `checked` (`IRaptorCheckedBinding`) — checkbox/switch boolean; on a radio it sets a string value (`IRaptorRadioBinding`).
- `options` (`IRaptorOptionsBinding`) — radio group / select option list; use `optionsText`/`optionsValue`/`emptyOption`.
- `enable` / `disable` (`IRaptorEnableDisableBinding`) — interactivity; `disabled` attribute is set when `enable` is false.
- `validation` (`IRaptorValidationBinding` → `IValidBinding`) — `{ validFunc, invalidMessage, validMessage?, validationGroup? }`; requires `validate: true` on the control.

Events (`events: [{ event, handler }]`, handler bound via `s.getTypedProp`). Per-control event types:

- Input: `change` | `input` | pointer/keyboard/context (`IEvent_Input`).
- CheckBox / RadioButton / RadioButtonGroup: `change` + pointer/keyboard (`IEvent_CheckBox` / `IEvent_RadioButton` / `IEvent_RadioButtonGroup`).
- Switch: `change` only (`IEvent_Switch`). TextArea/Label/Form: pointer/keyboard/context.

```ts
s.input({ inputType: "text",
    bindings: { textInput: s.getTypedProp(x => x.query) },
    events: [{ event: "change", handler: s.getTypedProp(x => x.onCommit) }] });
```

## ViewModel / instance API

Inputs are intrinsic nodes — there is rarely a control instance to reach for. Backing classes: `Form` and `RadioButtonGroup`, both thin `RaptorNode` subclasses holding `nodeModel` (`RadioButtonGroup` is `@LateBoundNode`). If you must, `raptorDom.nodeT<RadioButtonGroup>("viewName")`. State lives on your ViewModel: bind `value`/`checked`/`textInput` to its properties and read them back directly. Auto-wired change/input events call `raptorDom.update()` unless suppressed.

## Patterns

- Descriptor-driven object editor: hold `fields: IFieldDescriptor[]` on the VM (each with `key`, `label`, `inputType`, `value`), `foreach` over it inside `s.form`, and emit one `s.input`/`s.checkbox` per row binding `value`/`checked` to `field.value` via `pushDataContext`/foreach scoping. Adding a field = pushing a descriptor, no view change.
- Validated field: `s.input({ validate: true, bindings: { value: ..., validation: { validFunc: s.getTypedProp(x => x.isNameValid), invalidMessage: "Required", validationGroup: "main" } } })`. Use `validationGroup` so editing one field re-validates siblings in the same group.
- One-of selection: `s.radioButtonGroup({ groupName: "mode", labelProperty: "label", valueProperty: "id", bindings: { options: { options: s.getTypedProp(x => x.modes) }, value: s.getTypedProp(x => x.selectedMode) } })`.
- Prefixed input addon: `s.inputGroup().contentTemplates(s => { s.inputGroupText({ text: "$" }); s.input({ inputType: "number", bindings: { value: ... } }); })`.

## Gotchas

- `value` updates on commit/blur (`change`); use `textInput` for live keystroke updates.
- A bare `checked` boolean binding = checkbox semantics; for a radio that writes a string, use the radio's `checked`/`value` (`IRaptorRadioBinding`).
- `validate: true` is required for `validation` bindings to render feedback; `browserValidation` on the form enables native HTML5 messages.
- `enable: false` disables; there is no separate `disabled` binding (use the `disabled` option for a static state).
- `inputMask` accepts a template (`#0:00`, `#`=optional/`0`=required digit) or a `RegExp` / `"/pattern/flags"` string.
- `inputType: "number"` is required for `min`/`max`/`step` to apply.
- `s.select` is deprecated — use `s.quickSelect` (select.md).

## Related skills

- Parent: `raptor` (View/VM split, RSScriptor.create, getTypedProp, update()).
- Siblings: `select.md` (quickSelect/dropdown for richer selection), `slider.md` (numeric slider), `date-time.md` (date/time pickers), `button.md` (submit/actions), `dialog.md` (forms in modals), `foreach.md` (descriptor-driven field lists), `code-editor.md` (Monaco text), `layout.md` (arranging form fields).
- Full option/binding/event tables: see the Reference section below.

---

## Raptor Forms — Reference

Exact identifiers from `framework/raptor/renderer/{ViewDefinitions,RSScriptor,Bindings,Events,DisplayUtilities}.ts` and `raptorDom/controls/Forms/`.

## Builder methods (RSScriptor)

| Method | Returns scriptor | node `type` |
| --- | --- | --- |
| `form(o)` | root + templates | `"form"` |
| `input(o)` | root + templates | `"input"` |
| `inputGroup(o)` | root + templates | `"inputGroup"` |
| `inputGroupText(o)` | — | (addon text) |
| `checkbox(o)` | root + templates | `"checkbox"` |
| `switch(o)` | root | `"switch"` |
| `radioButtonGroup(o)` | radio-group scriptor | `"radioButtonGroup"` |
| `radio(o)` | radio-group scriptor | `"radio"` |
| `textArea(o)` | root | `"textArea"` |
| `label(o)` | root + templates | `"label"` |

`radio(...)` is only valid inside a `radioButtonGroup(...).contentTemplates(...)` (returns `IRadioButtonGroupScriptor`).

## ViewDefinitions.IInputType (shared base)

`noAutoEvent?: boolean` · `validate?: boolean` · `size?: DisplayUtilities.InputSize` · `srOnly?: boolean` · `value?: any` · `property?: string` · `multiple?: boolean` · `accept?: string`

## ViewDefinitions.IInput (extends IInputType)

`inputType?: DisplayUtilities.InputType` · `label?: ILabel` · `ariaLabel?` · `ariaLabeledBy?` · `ariaDescribedBy?` · `placeholder?: string|boolean` · `size?` · `srOnly?` · `labelSeparate?: boolean` · `disabled?: boolean` · `readonly?: boolean` · `id?: string` · `min?`/`max?`/`step?: number` (number type only) · `name?: string` · `inputMask?: string|RegExp`

- `bindings`: `IRaptorInputBinding & IRaptorAttrBindings_ForInput`
- `events`: `IEvent_Input[]`

## ViewDefinitions.ICheckBox / ISwitch (extends IInputType)

`label?: ILabel` · `switch?: boolean` · `value?: boolean` · `inline?: boolean` · `id?: string`

- CheckBox `bindings`: `IRaptorUniversalBindings & IRaptorInputBinding & IRaptorTooltipBinding`; `events`: `IEvent_CheckBox[]`
- Switch extends CheckBox; `events`: `IEvent_Switch[]` (`change` only)

## ViewDefinitions.IRadioButton (extends IInputType)

`label?: ILabel` · `name?: string` · `value?: string` · `inline?: boolean` · `id?: string` · `checked?: boolean`

- `bindings`: `IRaptorUniversalBindings & IRaptorRadioBinding` — bind `checked` to read the selected value; bind `value` to set each option's value string in a foreach.
- `events`: `IEvent_RadioButton[]`

## ViewDefinitions.IRadioButtonGroup

`groupName?: string` · `labelProperty?: string` · `valueProperty?: string`

- `bindings`: `IRaptorUniversalBindings & IRaptorOptionsBinding & IRaptorCheckedBinding & IRaptorTextBinding & IRaptorValueBinding`
- `events`: `IEvent_RadioButtonGroup[]`

## ViewDefinitions.ITextArea (extends IInputType)

`label?: ILabel` · `placeholder?: string` · `rows?: number` · `id?: string` · `srOnly?` · `inputMask?: string|RegExp`

- `bindings`: `IRaptorUniversalBindings & IRaptorEnableDisableBinding & IRaptorValueBinding & IRaptorTextInputBinding & IRaptorAttrBindings_ForTextArea & IRaptorValidationBinding`
- `events`: `IEvent_TextArea[]`

## ViewDefinitions.ILabel (extends ITextControl)

`for?: string` · `text?: string` · `visible?: boolean` · `formLabel?: boolean` · `isFloating?: boolean`

- `bindings`: `IRaptorUniversalBindings & IRaptorTextBinding`; `events`: `IEvent_Label[]`

## ViewDefinitions.IForm

`inline?: boolean` · `browserValidation?: boolean` (HTML5 native validation)

- `bindings`: `IRaptorUniversalBindings`; `events`: `IEvent_Form[]`

## ViewDefinitions.IInputGroup / IInputGroupText

- IInputGroup: `hasValidation?: boolean`; `bindings`: `IRaptorUniversalBindings & IRaptorValidationBinding`; `events`: `IEvent_InputGroup[]`
- IInputGroupText: `text: string` (required); `bindings`: `… & IRaptorTextBinding`

## Binding interfaces (Bindings.ts)

| Interface | Key(s) | Notes |
| --- | --- | --- |
| `IRaptorValueBinding` | `value: string` | two-way, commits on change/blur |
| `IRaptorTextInputBinding` | `textInput: string\|number` | live on keystroke |
| `IRaptorCheckedBinding` | `checked: boolean` | checkbox/switch |
| `IRaptorRadioBinding` | `checked: string\|boolean`, + `value`, `enable`/`disable`, `text` | radio: checked sets the value string |
| `IRaptorEnableDisableBinding` | `enable: boolean`, `disable: boolean` | use one; `disabled` attr set when `enable` false |
| `IRaptorOptionsBinding` | `options: IOptionsBinding` | options list for group/select |
| `IRaptorValidationBinding` | `validation: IValidBinding` | needs `validate: true` |

### IOptionsBinding fields

`data?: any[]` · `selectedIndex?: number` · `options?: BindingProp<any[]>` · `optionsText?: string` (display prop) · `optionsValue?: string` (value prop) · `value?: BindingProp<any>` (selected) · `emptyOption?: string`

### IValidBinding fields

`validFunc: () => boolean` (required) · `invalidMessage: string` (required) · `validMessage?: string` · `validationGroup?: string` (changing this field re-validates same-group fields in node/foreach-row scope)

## Enums (DisplayUtilities.ts)

- `InputType` = `'text' | 'password' | 'number' | 'file' | 'color' | 'search' | 'tel' | 'email' | 'url' | 'time' | 'range' | 'month' | 'date' | 'datetime-local' | 'week' | 'image' | 'hidden'`
- `InputSize` = `'large' | 'medium' | 'small'`

## Event types (Events.ts)

- `ChangeEventType = 'change'`, `InputEventType = 'input'`.
- `IEvent_Input`: `change | input | pointer | keyboard | context`
- `IEvent_CheckBox` / `IEvent_RadioButton` / `IEvent_RadioButtonGroup`: `change | pointer | keyboard | context`
- `IEvent_Switch`: `change` only
- `IEvent_TextArea` / `IEvent_Label` / `IEvent_Form`: `pointer | keyboard | context`
- Each event: `{ event, handler: BindingProp<(...args)=>void>, param?, paramKey? }`.

## Backing node classes (raptorDom/controls/Forms/)

- `class Form extends RaptorNode` — holds `nodeModel: IForm`.
- `class RadioButtonGroup extends RaptorNode` — `@LateBoundNode`, holds `nodeModel: IRadioButtonGroup`.
- Other inputs render as intrinsic DOM nodes (no dedicated control class). Reach a group via `raptorDom.nodeT<RadioButtonGroup>("viewName")` only when necessary; normally read/write state through the bound ViewModel properties.
