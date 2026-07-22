# Raptor Object Editor

A single control that renders a **whole object as an editable form**. You give it the object (`value`) and a `Descriptors<Entity>` map — one descriptor per property describing how to edit that field — and it emits the labeled, typed inputs, two-way binding the object back to your ViewModel. An optional `Layout` controls how the fields are arranged.

Everything lives in the `data-ui` module. Import the types from there:

```ts
import type { Descriptors, Descriptor, Layout, DynamicLayoutProvider } from "data-ui";
```

## When to use
- A form that edits many properties of one object: settings panels, parameter editors, entity/record editors, "add / edit" forms.
- You want field definitions to live as **data** (a descriptor map on the VM) rather than hand-written `s.input`/`s.checkbox` trees — add/remove a field by editing the map, not the view.
- You need reactive fields: a label/options/visibility that depends on the current values (dynamic attributes), or a layout that changes as the user edits (dynamic layout).
- **Not** this: a single standalone input or checkbox → `forms.md`. A single dropdown → `select.md`. A tabular grid of records → `data-grid.md`.

## Placing the editor
There is no typed `s.objectEditor` scriptor method — pass an `IObjectEditor` to `s.element()`. Give it `value` + `descriptors` (and optionally `layout`) via `bindings`:

```ts
// View — s is RSScriptor.create<MyVm>()
const editor: IObjectEditor<ForScriptorTrue> = {
    type: "objectEditor",
    testId: "employee-editor",
    inline: false,              // false = stacked label above input (default); true = inline label
    bindings: {
        value:       s.getTypedProp("currentEmployee"),   // the object being edited (two-way)
        descriptors: s.getTypedProp("formDescriptors"),   // Descriptors<Employee>
        layout:      s.getTypedProp("formLayout"),         // optional Layout | DynamicLayoutProvider
    },
};
s.element(editor);
```

`descriptors`, `layout`, `layoutPresets`, `inline`, and `requiredIndicator` may each be set **statically** on the object or **reactively** via `bindings` — bindings win. If you omit `descriptors` entirely, the editor auto-generates basic descriptors from the runtime type of each property on `value`.

You'll see two other spellings in the codebase: `s.element({ ... } as any)` (when reaching across a `prefix()`), and `// @ts-ignore` + `s.objectEditor({ ... })` (a runtime method that isn't in the type defs). Prefer the typed `IObjectEditor<ForScriptorTrue>` + `s.element(...)` form.

## Descriptors
A `Descriptors<Entity>` is `{ [K in keyof Entity]: Descriptor }`. Each descriptor's `type` selects the control; the rest configure it. Built-in types:

| `type` | Renders | Value type | Notable fields |
|---|---|---|---|
| `"Text"` | text input | `string` | `placeholder` |
| `"TextArea"` | multi-line | `string` | `placeholder`, `rows` |
| `"Number"` | number input | `number` | `min`, `max`, `step`, `unitInfo`, `placeholder` |
| `"Checkbox"` | checkbox | `boolean` | — |
| `"Switch"` | toggle | `boolean` | — |
| `"Select"` | single dropdown | `T` | `options`, `clearable`, `enableFiltering`, `enableSorting`, `placeholder` |
| `"MultiSelect"` | multi dropdown | `T[]` | `options`, `clearable`, `enableFiltering`, `enableSorting`, `placeholder` |
| `"DateTime"` | date/time picker | `luxon.DateTime \| null` | `min`, `max`, `showTime`, `timeZone`, `placeholder` |

Every descriptor also accepts the base fields: `label`, `description`, `hidden`, `disabled`, `required`, `defaultValue`, `sortOrder`.

```ts
public get formDescriptors(): Descriptors<Employee> {
    return {
        id:        { type: "Text",     label: "ID", hidden: true },
        firstName: { type: "Text",     label: "First Name", required: true, sortOrder: 0 },
        age:       { type: "Number",   label: "Age", min: 0, max: 120, units: "years", sortOrder: 1 },
        favColor:  { type: "Select",   label: "Favorite Color",
                     options: [{ label: "Red", value: "red" }, { label: "Blue", value: "blue" }],
                     clearable: true },
        active:    { type: "Checkbox", label: "Active" },
        notes:     { type: "TextArea", label: "Notes", rows: 4 },
    };
}
```

`sortOrder` sets the default field order (used when there's no layout, or for fields a `layoutOnly` layout doesn't place). `TypeScript` picks the descriptor union from the property's value type, so `Descriptors<Employee>` rejects a `"Number"` descriptor on a `string` field — a strong safety net. When the field type can't map cleanly (dynamically-built descriptors), type as `Descriptors<Record<string, ...>>` or cast the individual descriptor to `Descriptor<any, any>`.

### Dynamic attributes (reactive fields)
`label`, `description`, `hidden`, `disabled`, `required`, `defaultValue`, `placeholder`, and `options` accept either a literal value **or** a `{ function, dependsOn }` object that recomputes from the current entity:

```ts
kindOfColor: {
    type: "Select",
    // hide until a color is chosen
    hidden: { function: d => ml.util.isNullUndefinedOrEmpty(d.favColor) },
    // relabel based on the chosen color
    label:  { function: d => d.favColor ? `Kind of ${d.favColor}` : "Kind of Color", dependsOn: ["favColor"] },
    // options that depend on another field
    options:{ function: d => d.favColor
        ? [{ label: `Dark ${d.favColor}`, value: "dark" }, { label: `Light ${d.favColor}`, value: "light" }]
        : [{ label: "Dark", value: "dark" }, { label: "Light", value: "light" }] },
}
```

`dependsOn` controls re-evaluation: **omit** → recompute on any field change; **`[]`** → compute once (good for a fixed async fetch); **`["fieldA"]`** → recompute only when those fields change.

### Transforms (stored type ≠ edited type)
When the object stores a value in a different type than the control edits, add `toDescriptor` / `fromDescriptor`. Classic case: the object holds an ISO **string** but you want a `DateTime` picker:

```ts
strDateTime: {
    type: "DateTime",
    label: "Start Date",
    toDescriptor:  v => v ? ml.luxon.DateTime.fromISO(v) : ml.luxon.DateTime.now(),   // string → DateTime
    fromDescriptor: v => v?.set({ hour: 0, minute: 0, second: 0 }).toISO() ?? null,   // DateTime → string
}
```

## Layout
Without a `layout`, fields render top-to-bottom by `sortOrder`. A `Layout` (or `DynamicLayoutProvider`) gives you rows, columns, and custom markup. Two shapes:

- **`RowsLayout`**: `{ rows: LayoutRow[], layoutOnly?: boolean }` — the common one.
- **`TemplateLayout`**: `{ template: (s, renderField) => void }` — full control; call `renderField("key")` wherever a field goes.

`layoutOnly: true` renders **only** the fields you place; unplaced descriptors are dropped. Omit it (or `false`) to append the rest by `sortOrder`.

### Row types
Each row is `{ type, fields, ...rowProps }`. `fields` entries are a bare `"key"` string, a `{ key, ... }` object, or a `{ template }` object (custom markup, no descriptor).

- **`flex`** — flexbox row; row props are `IDiv`; each field object takes `divProps` (an `IDiv`) + `fieldTemplate`.
- **`columns`** — Raptor row/column grid; row props are `IRow`; each field object takes `columnProps` (an `IColumn`, e.g. `{ columnMd: 3 }`) + `fieldTemplate`.
- **`templatedRows`** — you own the row markup via `rowTemplate: (s, renderField) => void`; `wrap?: false` to skip the wrapping `div`.

```ts
public get formLayout(): DynamicLayoutProvider<Employee, MyVm> {
    return { function: e => this.buildLayout(e), dependsOn: ["hasAlias"] };
}
private buildLayout(e: Partial<Employee>): Layout<Employee, MyVm> {
    return {
        rows: [
            { type: "columns", fields: ["firstName", "lastName"] },                    // two equal columns
            { type: "columns", fields: [{ key: "age", columnProps: { columnMd: 3 } },
                                        { key: "occupation", columnProps: { columnMd: 9 } }] },
            { type: "flex",    fields: [{ key: "email", inline: true }] },
            // conditional row — only present when a checkbox is on
            ...(e.hasAlias ? [{ type: "columns" as const, fields: ["alias" as const] }] : []),
            // custom row markup around a field
            { type: "templatedRows", fields: ["notes"], rowTemplate: (s, renderField) => {
                s.row().contentTemplates(s => s.column({ column: 12 }).contentTemplates(s => {
                    renderField("notes");
                    s.small({ text: "Characters: " });
                    s.strong({ bindings: { text: s.getTypedProp("notesCharCount") } });
                })); } },
            // a template-only field: custom element, no descriptor
            { type: "flex", fields: [{ template: s => s.button({ text: "Clear",
                events: [{ event: "pointerup", handler: "clearNotes" }] }) }] },
        ],
        layoutOnly: true,
    };
}
```

- **`fieldTemplate(s, descriptorId, descriptor, renderField)`** wraps a single descriptor's standard rendering — build your chrome, then call `renderField()` where the input goes (used for per-field highlight boxes, badges).
- **`divProps` / `columnProps`** on a field are the escape hatch for per-field styling (e.g. `{ background: "warning" }` to flag a differing field, or `customCssClasses` for a stable hook).
- **`layoutPresets`** tune spacing/gutters globally; start from `layoutPresets.normalRowSpacing` / `condensedRowSpacing` and `mergeLayoutPresets(base, { containerDiv: { padding: 3 } })`.

## Reactivity — there is no change event
The ObjectEditor emits **no** `change`/`input` event. It writes edits back through the two-way `value` binding into your VM property (debounced). **Observe changes in the setter.** This is the single most important pattern:

```ts
private _data: Record<string, any> = {};
public get data() { return this._data; }
public set data(v: Record<string, any>) {
    this._data = v;
    this.recomputeLayout();   // react to the edit here — recompute layout, diff, dependent state
    this.update();
}
```

## Patterns
- **Descriptor + layout getters on the VM, bound in the view.** Keep `value`, `descriptors`, `layout` as VM getters; the view just wires the three bindings. Adding a field = editing the descriptor map.
- **Diff-highlight two editors** (e.g. a compare / what-if parameters panel): render two ObjectEditors over the same descriptors, and in each field's `divProps` set `background: "warning"` when `taskA[key] !== taskB[key]`. Recompute the layout in the value setters so highlights track edits.
- **Disable a whole editor or subset of fields**: map over the descriptors and set `disabled: true` on the ones to lock (e.g. a "by ID" mode disables every field; a gated card disables just its keys). Return a fresh descriptors object from the getter.
- **Expand a control into several descriptor keys**: a min/max range → `${name}Min` + `${name}Max` Number descriptors; a date range → `${name}StartDate` + `${name}EndDate` DateTime descriptors. Flatten to keys on the way in, reassemble in the value setter.
- **Conditional fields**: prefer a descriptor's `hidden` dynamic attribute for show/hide of a single field; use a `DynamicLayoutProvider` (with `dependsOn`) when the *arrangement* changes.

## Gotchas
- **No change event** — read edits via the `value` setter (see above). Don't look for `events: [{ event: "change" }]`.
- **Value write-back is debounced** — don't assume the VM property is updated synchronously inside the same tick the user typed.
- `descriptors` is typed optional but the editor is only useful with them; omitting descriptors falls back to type-inferred basic controls.
- Descriptor `type` strings are **capitalized** (`"Text"`, `"Number"`, `"DateTime"`, `"MultiSelect"`) — not the lowercase input-type strings used by `s.input`.
- `Descriptors<Entity>` is strict: a descriptor whose value type doesn't match the field won't compile. For dynamically-shaped data, type against a `Record` or cast the individual descriptor to `Descriptor<any, any>`.
- `layoutOnly: true` silently drops any field you didn't place — a common cause of "my field disappeared."
- `DateTime` descriptors work in luxon `DateTime`; if your object stores strings/ISO, you **must** supply `toDescriptor`/`fromDescriptor`.
- Dynamic-attribute / dynamic-layout functions receive a `Partial<Entity>` and may run before all fields are set — guard against `undefined`.

## Related skills
- Parent: `raptor` — View/VM split, `RSScriptor.create`, `getTypedProp`, `prefix`, `update()`, bindings/events.
- `forms.md` — hand-built single inputs (`s.input`, `s.checkbox`, `s.switch`, `s.textArea`) when you don't want a descriptor-driven form; the ObjectEditor renders these under the hood.
- `select.md` — standalone `quickSelect` dropdown (the ObjectEditor's `Select`/`MultiSelect` descriptors wrap the same picker).
- `date-time.md` — standalone date/time pickers (behind the `DateTime` descriptor).
- `layout.md` — row/column/flex primitives used by the `columns`/`flex` layout rows and `templatedRows`/`fieldTemplate` callbacks.
- `data-grid.md` — editing a table of records rather than one object.
- Exact type/field/binding tables: see the Reference section below in this doc.

---

# Raptor Object Editor — Reference

Exact identifiers from the `data-ui` module (`framework/src/.../data-ui/...`), surfaced in `.adk/types.d/MapLarge.Server.d.ts`. Everything is re-exported from `"data-ui"`.

```ts
import type {
    Descriptors, Descriptor, BaseDescriptor,
    Layout, LayoutInput, RowsLayout, TemplateLayout, LayoutRow,
    DynamicLayoutProvider, DynamicLayoutFunction,
    LayoutFieldObject, LayoutField, FieldTemplate, RenderThisField, RenderFieldCallback,
    LayoutFlexRow, LayoutColumnsRow, LayoutTemplatedRowsRow,
    LayoutPresets, layoutPresets, mergeLayoutPresets,
    isDynamicLayoutProvider, hasFieldTemplate, isTemplateField,
} from "data-ui";
```

## Placement — IObjectEditor (view definition)
Node `type`: `"objectEditor"`. Backing class: `ObjectEditor<Entity, CustomDescriptor> extends RaptorNodeBase<IObjectEditor>`. There is **no** typed `s.objectEditor` builder — use `s.element(cfg)` where `cfg: IObjectEditor<ForScriptorTrue>`.

`IObjectEditor<T, Entity, CustomDescriptor, TViewModel> extends ViewDefinitions.IViewDefinition<T>`:

| field | type | notes |
|---|---|---|
| `descriptors?` | `Descriptors<Entity, CustomDescriptor>` | static; or via binding |
| `inline?` | `boolean` | default `false`; `true` = inline label layout |
| `requiredIndicator?` | `RequiredIndicator` | `"required"` (default) \| `"optional"` \| `"none"` |
| `layout?` | `LayoutInput<Entity, TViewModel>` | static; or via binding |
| `layoutPresets?` | `Partial<LayoutPresets>` | static; or via binding |
| `bindings?` | `IRaptorUniversalBindings<T> & IObjectEditorBindings<...>` | |

### IObjectEditorBindings
| binding | type |
|---|---|
| `value?` | `BindingProp<Entity \| null \| undefined>` — **two-way**, writes edits back (debounced) |
| `descriptors?` | `BindingProp<Descriptors<Entity, CustomDescriptor> \| null \| undefined>` |
| `layout?` | `BindingProp<LayoutInput<Entity, TViewModel> \| null \| undefined>` |
| `layoutPresets?` | `BindingProp<Partial<LayoutPresets> \| null \| undefined>` |

Plus universal bindings (`visible`, `style`, `css`, `attr`, …). **No** `change`/`input` event exists — observe edits through the `value` setter on the VM.

## Descriptors
`Descriptors<Entity, TCustomDescriptor = never> = { [K in keyof Entity]: Descriptor<Entity, K, TCustomDescriptor> }`.
`Descriptor` = union of `TypeSafeDescriptor` | `TransformDescriptor` | `SelectDescriptors` | custom. The value type of the field picks the built-in descriptor.
`UnknownDescriptor = Descriptor<any, any>`, `UnknownDescriptors = Record<string, UnknownDescriptor>` for dynamic maps.

### BaseDescriptor (all descriptors)
| field | type | notes |
|---|---|---|
| `type` | `string` | discriminant (capitalized) |
| `label?` | `DynamicAttribute<…, string>` | |
| `description?` | `DynamicAttribute<…, string>` | |
| `hidden?` | `DynamicAttribute<…, boolean>` | |
| `disabled?` | `DynamicAttribute<…, boolean>` | |
| `required?` | `DynamicAttribute<…, boolean>` | |
| `defaultValue?` | `DynamicAttribute<…, Value>` | |
| `sortOrder?` | `number` | default ordering / fallback placement |

### Built-in descriptor types
| `type` const | interface | extra fields (beyond base) | value |
|---|---|---|---|
| `"Text"` | `TextDescriptor` | `placeholder?` (dynamic) | `string` |
| `"TextArea"` | `TextAreaDescriptor` | `placeholder?` (dynamic), `rows?: number` | `string` |
| `"Number"` | `NumberDescriptor` | `placeholder?` (dynamic), `min?`, `max?`, `step?: number`, `unitInfo?: ml.data.table.IUnitInfo`, `units?: string` *(deprecated → use unitInfo)* | `number \| null` |
| `"Checkbox"` | `CheckboxDescriptor` | — | `boolean` |
| `"Switch"` | `SwitchDescriptor` | — | `boolean` |
| `"Select"` | `SelectDescriptor` | `options: DynamicAttribute<SelectOption<Value>[]>`, `placeholder?`, `clearable?`, `enableFiltering?`, `enableSorting?` | `Value \| null` |
| `"MultiSelect"` | `MultiSelectDescriptor` | `options: DynamicAttribute<SelectOption<Item>[]>`, `placeholder?`, `clearable?`, `enableFiltering?`, `enableSorting?` | `Item[]` |
| `"DateTime"` | `DateTimeDescriptor` | `min?`/`max?: ml.luxon.ToObjectOutput`, `showTime?: boolean`, `timeZone?: string`, `placeholder?: string` | `ml.luxon.DateTime \| null` |

`SelectOption<T> = { value: T; label: string }`.
Type helpers: `BooleanDescriptors = Checkbox | Switch`; `StringDescriptors = Text | TextArea`; `NumericDescriptors = Number`; `DateTimeDescriptors = DateTime`; `SelectDescriptors = Select`.

### DynamicAttribute
`DynamicAttribute<Entity, Field, T> = T | DynamicAttributeDefinition<Entity, Field, T>`
`DynamicAttributeDefinition = { function: (entity: Partial<Entity>) => T | Promise<T>; dependsOn?: (keyof Entity)[] }`
`dependsOn`: **omitted** → re-eval on any field change · **`[]`** → eval once · **`[fields]`** → re-eval when those change.

### Transform (value-type mismatch)
Add to a descriptor when the stored `Entity[Field]` differs from the descriptor's edit type (`TransformDescriptor`):
```ts
toDescriptor:   (entityValue) => descriptorValue
fromDescriptor: (descriptorValue) => entityValue
```
Supported pairings: Text⇄string, Number⇄number, Checkbox/Switch⇄boolean, DateTime⇄(DateTime|null).

## Layout
`LayoutInput<Entity, TViewModel> = Layout | DynamicLayoutProvider`.
`Layout = RowsLayout | TemplateLayout`.

### RowsLayout
`{ rows: LayoutRow<Entity, TViewModel>[]; layoutOnly?: boolean; template?: never }`
- `layoutOnly: true` → render only placed fields (others dropped). Omitted/false → append remaining by `sortOrder`.

### TemplateLayout
`{ template: RenderByTemplate<Entity, TViewModel>; rows?: never }`
`RenderByTemplate = (s: IRootScriptor<TViewModel>, renderField: (field: LayoutField<Entity>) => void) => void`.

### LayoutRow (discriminated by `type`)
`DefineLayoutRow<Type, Entity, Field, RowProps> = { type: Type; fields: LayoutField<Entity, Field>[] } & RowProps`.

| `type` | RowProps | per-field extra | field props type |
|---|---|---|---|
| `"flex"` (`LayoutFlexRow`) | `Partial<ViewDefinitions.IDiv>` | `divProps?: Partial<IDiv>`, `fieldTemplate?` | `FlexLayoutRowField` |
| `"columns"` (`LayoutColumnsRow`) | `Partial<ViewDefinitions.IRow>` | `columnProps?: Partial<IColumn>`, `fieldTemplate?` | `ColumnsLayoutRowField` |
| `"templatedRows"` (`LayoutTemplatedRowsRow`) | `{ rowTemplate: TemplatedRowsTemplate; wrap?: boolean }` | (fields are `LayoutFieldObject`) | — |

`LayoutRowType = "flex" | "columns" | "templatedRows"`.

### Fields
`LayoutField<Entity> = keyof Entity | { key: keyof Entity } | LayoutFieldObject`.
`LayoutFieldObject` is a discriminated union:
- `{ key: keyof Entity; inline?: boolean; template?: never }` — a descriptor field (plus `divProps`/`columnProps`/`fieldTemplate` in flex/columns rows).
- `{ template: (s: IRootScriptor<TViewModel>) => void; key?: never }` — custom markup, **no descriptor**.

### Templates
- `FieldTemplate<Entity, TViewModel> = (s, descriptorId, descriptor, renderField: RenderThisField) => void` — wrap one field; `renderField()` (`RenderThisField = () => void`) inserts the standard label+input+description.
- `TemplatedRowsTemplate<Entity, TViewModel> = (s, renderField: (field: LayoutField<Entity>) => void) => void` — render a whole row; call `renderField("key")` where each field goes.

### DynamicLayoutProvider
`{ function: DynamicLayoutFunction<Entity, TViewModel>; dependsOn?: (keyof Entity)[] }`
`DynamicLayoutFunction = (entity: Partial<Entity>) => Layout | Promise<Layout>`.
`dependsOn` same semantics as dynamic attributes. Guard: `isDynamicLayoutProvider(layout)`.

### LayoutPresets
`{ containerDiv?: Partial<IDiv>; columns?: LayoutTypePreset<IRow, IColumn>; flex?: LayoutTypePreset<IDiv, IDiv>; templatedRows?: LayoutTypePreset<IDiv, never> }`
`LayoutTypePreset<RowProps, ColumnProps> = { row?: RowProps; column?: ColumnProps }`.
Registry: `layoutPresets.normalRowSpacing` (default), `layoutPresets.condensedRowSpacing`.
`mergeLayoutPresets(...presets: Partial<LayoutPresets>[]): LayoutPresets` — later overrides earlier per nested level.

## Descriptor registry (custom descriptor types — advanced)
`registerDescriptorType<TDescriptor, TInternal, AdditionalData>(def: DescriptorType<...>): void` and `getDescriptorType(type: string)`. A `DescriptorType` supplies `type`, `render(s, id, bindingKey, descriptor, options, testId)`, `defaultBoundValue`, optional `transformToBound` / `transformFromBound` / `setupAdditionalData` / `evaluateDescriptor`. `RequiredIndicator` enum: `Required = "required"`, `Optional = "optional"`, `None = "none"`. Binding-data plumbing lives in `data-ui/descriptor-registry/BindingData` (`IBindingData`, `BindingData`, `bindingKey`).

## Minimal example
```ts
// VM
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import type { Descriptors } from "data-ui";
interface Person { name: string; age: number; }
export class VM extends RaptorViewModel {
    private _v: Person | null = { name: "", age: 0 };
    public get value() { return this._v; }
    public set value(v: Person | null) { this._v = v; this.update(); }  // observe edits here
    public get descriptors(): Descriptors<Person> {
        return { name: { type: "Text", label: "Name", required: true },
                 age:  { type: "Number", label: "Age", min: 0, max: 120 } };
    }
}

// View
const oe: IObjectEditor<ForScriptorTrue> = {
    type: "objectEditor",
    bindings: { value: s.getTypedProp("value"), descriptors: s.getTypedProp("descriptors") },
};
s.element(oe);
```
