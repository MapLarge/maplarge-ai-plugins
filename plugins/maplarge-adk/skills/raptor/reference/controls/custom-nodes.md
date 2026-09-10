# Custom Raptor Nodes

How to author a brand-new reusable Raptor control: an options **interface**, a **RaptorNode class** (decorated with `@RegisterNode`), and an **`RSScriptor.register`** call that exposes it as a fluent `s.myNode(...)` builder. This is the same trio every built-in control (color swatch, date-time, dropdown, etc.) is built from.

## When to use

Use a custom node when no built-in element/control fits and you need a control that owns its own DOM, has a reusable lifecycle, supports `.bindings`/`.events`, and can be dropped into any view via the DSL. If you only need to compose existing elements + a ViewModel, a plain `RaptorNode` subclass (the parent `raptor` skill's RaptorNode pattern) is enough — `@RegisterNode` + `RSScriptor.register` is specifically for making it a first-class **DSL builder method** reusable across views and extensions.

## The trio

Three pieces, conventionally one or two files under a control folder:

**1. Options interface** — extend the right base so `type`, `viewName`, `customCssClasses`, `contentTemplates`, plus `bindings`/`events` are typed:

- `ViewDefinitions.IViewDefinition<T>` — base (no bindings/events)
- `ViewDefinitions.IViewDefinitionWithBindings<T>` — adds `bindings`
- `ViewDefinitions.IViewDefinitionWithEvents<T>` — adds `events`
- intersect both for a control that needs each (see `IRaptorMap` / `IDropdown` in `ViewDefinitions.ts`).

```ts
export interface IMyThing<T extends ForScriptor = ForScriptorFalse>
    extends ViewDefinitions.IViewDefinitionWithEvents<T> {
    label?: string;
    bindings?: Bindings.IRaptorUniversalBindings<T> & {
        value?: Bindings.BindingProp<T, string>;
    };
    events?: Events.IEvent<T>[];
}
```

**2. The node class** — extend `RaptorNodeBase<IMyThing>` (thin generic wrapper that types `this.nodeModel`) or raw `RaptorNode`. Decorate with `@RegisterNode`. Call `this.render()` from the constructor; read config off `this.nodeModel`.

```ts
@RegisterNode({ svgKey: "mlsvg-grayscale" })   // key defaults to "myThing" (class name, first char lowered)
export class MyThing extends RaptorNodeBase<IMyThing> {
    constructor(nodeModel: IMyThing, raptorDom: RaptorDom, key: string, root: HTMLElement) {
        super(nodeModel, raptorDom, key, root);
        this.render();
    }
    render(): void {
        dom.text(this.root, this.nodeModel.label ?? "");
    }
    public onViewDefinitionChanged(): void { this.render(); }  // re-render after editor edits

    @BindingHandler("value")
    valueChanged(newValue: string | null | undefined, element: HTMLElement): void {
        dom.text(this.root, newValue ?? "");
    }
}
```

**3. The scriptor builder** — register the DSL method (module side-effect; the file must be imported once so it runs). `type` MUST equal the registered `key`:

```ts
RSScriptor.register<MyThing, IMyThing>(MyThing, function (options: IMyThing) {
    const def: IMyThing = { type: "myThing", ...options, contentTemplates: [] };
    this.applyScriptorBindings(def);   // wires .bindings into the binding engine
    this.handleStack(def);             // pushes def onto the tracking stack
    return this;
});
```

Now any view can call `s.myThing({ label: "Hi", viewName: "thing1", bindings: { value: s.getTypedProp("myVal") } })`.

## Registration internals (how the wiring happens)

- `@RegisterNode(opts)` computes `key = opts.key ?? firstCharToLower(ClassName)`, registers the view definition (`renderFuncProvider.addViewDefinition({ type: key, svgKey })`) and a render func that creates the root element (default: `<div class="ml-<kebab-class-name>">`) and applies spacing/common-props/control-metadata/bindings. Registration is **idempotent per key** — a second `@RegisterNode` with the same key is ignored.
- `RSScriptor.register(NodeClass, fn)` stores `fn` under `firstCharToLower(NodeClass.name)`. `RSScriptor`'s constructor wraps the instance in a `Proxy`; when you call `s.myThing(...)`, the proxy looks the method up in the registry and binds it. So the builder name = the class name (first char lowered), independent of the `key` you pass — keep them aligned.
- If `@RegisterNode({ viewModel: MyThingViewModel })` is set, the VM **class name must be exactly `<NodeName>ViewModel`** or registration throws. The VM ctor is `(raptorDom, raptorEngine)` and extends `RaptorViewModel`.

## Bindings & events

- **Custom binding keys**: declare them in the interface's `bindings?: ...` block, then implement `@BindingHandler("keyName") method(newValue, element)` on the class. The engine calls the handler whenever the bound source changes. Universal binding keys (`visible`, `text`, `customCssClasses`, `foreach`, …) come free from `IRaptorUniversalBindings`.
- **Events**: type `events?: Events.IEvent<T>[]` (or a control-specific `Events.IEvent_Xxx<T>[]`). Standard DOM event names live in `Events.PointerEventTypes` / `ChangeEventType` / `KeyboardEventTypes` etc. The framework auto-wires `events` to the node's root via the auto-event sweep; for fully custom interactions, attach listeners in `create()`/`render()` and tear them down in `clean()`.

## Reaching a live instance

From a ViewModel/host, get the running node by its `viewName`:

```ts
const node = this.raptorDom.nodeT<MyThing>("thing1");
node?.someMethod();
```

`raptorDom.node(viewName, index?)` is the untyped form; `nodeFE<T>(viewName, ctor, boundItem)` reaches a per-row instance inside a foreach.

## Lifecycle hooks (override what you need)

- `constructor(nodeModel, raptorDom, key, root)` → call `super(...)`, then `this.render()`.
- `render()` — build/refresh DOM. The base `render()` (if you call it) cleans, renders `contentTemplates`, then wires bindings + auto-events; override entirely for hand-built DOM.
- `clean()` — base removes binding maps (except root), auto-events, and child nodes; extend it to drop your own listeners/timers.
- `initialize()` — re-runnable setup (e.g. re-grab child refs after a foreach length change).
- `onViewDefinitionChanged()` — re-render after the Raptor Editor mutates the view def.
- `applyBindingData(allData)` — inject foreach/index-bound data into a wrapper control (maps, charts).
- `resize(rect?)`, `onAfterFragmentFlush()`, `onAfterForeachBindingUpdate()` — post-layout / post-insert hooks.

## Patterns

- **Read-only display control**: skip `render()`'s template machinery; override `render()` to set styles/text from `this.nodeModel`, add `@BindingHandler` methods for each reactive field, and call `render()` from each handler (see `ColorSwatch`).
- **Stateful control with VM**: pass `viewModel: MyThingViewModel` to `@RegisterNode`, hold state on the VM, and have view-side bindings read VM props via `s.getTypedProp(...)`.
- **Late-bound node**: tag with `@LateBoundNode` when the node must defer binding resolution until data arrives (the engine checks the `LATE_BOUND_KEY` metadata).
- **Custom root element**: pass `rootElement: () => dom.createElement('div', { classes: ['ml-my-thing'] })` to control the wrapper instead of the auto `ml-<kebab>` div.

## Gotchas

- The builder method name is `firstCharToLower(ClassName)` — renaming the class silently renames `s.<name>`. The view-def `type` must match the `@RegisterNode` `key`; mismatches render nothing.
- `svgKey` is **required** in `@RegisterNode`; use an existing key (e.g. `"mlsvg-grayscale"`) if the control has no editor icon.
- `RSScriptor.register` runs as a module side-effect — if the control file is never imported, the builder won't exist and `s.myThing` is `undefined`. Ensure the control module is imported somewhere on the path.
- VM class name must be exactly `<NodeName>ViewModel` or `@RegisterNode` throws at render time.
- Don't clone `nodeModel` — it's the live link to the view definition; mutating it is how `onViewDefinitionChanged` round-trips with the editor.
- Decorators rely on TC39 `Symbol.metadata` (binding-handler map, `LATE_BOUND_KEY`, `SVG_KEY_SYMBOL`); they're read off `constructor[Symbol.metadata]`, so subclassing across module boundaries works but re-registering the same key does not.

## Related skills

- `raptor` — parent skill: View/VM split, RSScriptor basics, `update()`, RaptorNode vs ViewModel base classes. Read it first.
- `foreach.md` — `applyBindingData` / per-row node lookup (`nodeFE`) for nodes used inside `s.foreach`.
- `data-store.md` — wiring a custom node to `IDataStore`/data sources.
- `svg.md` — registering the `svgKey` icon a custom node references.
- `echarts` — if the custom node wraps a chart, build the chart per that skill and bridge it in `applyBindingData`.

---
*A deeper reference cheatsheet lives in the Reference section below.*

---

## @RegisterNode(opts: RendererOptions)

| Field | Required | Default | Purpose |
| ------- | ---------- | --------- | --------- |
| `svgKey` | yes | — | Editor/icon key stored in class metadata (`SVG_KEY_SYMBOL`). |
| `key` | no | `firstCharToLower(ClassName)` | The view-definition `type`. Must equal the `type` your scriptor builder emits. |
| `rootElement` | no | `<div class="ml-<kebabCase(ClassName)>">` | Factory for the wrapper element. |
| `viewModel` | no | — | `new (raptorDom, raptorEngine) => RaptorViewModel`. Name MUST be `<NodeName>ViewModel` (throws otherwise). |
| `applySpacingAndSizing` | no | `true` | Apply margin/padding/size utility classes from the view def. |
| `applyCommonProperties` | no | `true` | Apply id/css/visibility/common props. |
| `addControlMetaData` | no | `true` | Add `data-*` control metadata. |
| `dataSetContract` | no | — | `DataSetContract` for data-bound controls (transforms/data sources). |
| `editingModel` | no | — | Default config object shown when placed via the Raptor Editor. |
| `hasEditorSupport` | no | `false` | Makes the node selectable/clickable in the Raptor Editor (adds to `userControlTypes`). |
| `viewDefinitionDefaults` | no | `{}` | Extra default fields merged into the registered view definition. |

Registration is idempotent: a key already in the internal `registeredKeys` set is skipped.

## Decorators

| Decorator | Target | Effect |
| ----------- | -------- | -------- |
| `@RegisterNode(opts)` | class | Registers render func + view definition under `opts.key`; stores `svgKey` in `Symbol.metadata`. |
| `@BindingHandler("key")` | method | Registers the method as the handler for binding key `"key"`; signature `(newValue: T \| null \| undefined, element: HTMLElement) => void`. Stored in a `Map` on `Symbol.metadata`. |
| `@LateBoundNode` | class | Sets `LATE_BOUND_KEY` metadata so the engine treats the node as late-bound. |

Binding-handler helpers (from `BindingHandler.decorators.ts`): `getBindingHandlerKeys(instance)`, `hasBindingHandler(instance, key)`, `getBindingHandler(instance, key)`, `callBindingHandler(instance, key, ...args)`.

## RaptorNode lifecycle / overridable members

| Member | When called | Typical use |
| -------- | ------------- | ------------- |
| `constructor(nodeModel, raptorDom, key, root)` | on create | `super(...)`, then `this.render()`. |
| `create?()` | by derived nodes from `render`/init | first-time setup. |
| `initialize?()` | on binding updates (e.g. foreach length change) | re-grab child node refs. |
| `render()` | manual / on create | build or refresh DOM. Base impl: `clean()` → render `contentTemplates` → `createRaptorBindings()` → `createForeachBindings()` → `autoEventWireUp()` → init + vmCtorKey propagation. |
| `clean()` | from `render()` / teardown | base removes non-root binding maps, auto-events, child nodes, empties root. Extend to drop custom listeners. |
| `onViewDefinitionChanged?()` | editor mutates the view def | re-render from `this.nodeModel`. |
| `applyBindingData?(allData)` | foreach/index-bound data injection | feed bound data into wrapper controls (map/chart). |
| `onAfterFragmentFlush?()` | after fragment queue flushed to DOM | post-insert measurement. |
| `onAfterForeachBindingUpdate?()` | after a foreach index binding map updates | per-row reconcile. |
| `resize?(rect?)` / `handleResize(rect?)` | on resize | relayout. |
| `resetScroll()` | manual | scroll root to 0,0. |

## Useful RaptorNode instance API

- `this.nodeModel: T` — live view definition (do not clone).
- `this.root` / `this.e()` — root element; `this.width` / `this.height` — measured size.
- `this.raptorDom` — DOM/registry access; `this.raptorBindingMap` — this node's binding maps.
- `this.isInEditor`, `this.isInForeach`, `this.isDestroyed`, `this.meta` (scratch state object).
- `this.getRegisteredEventHandlerTypes()`, `hasEventTypeRegistered(type)`, `getHandlerForEventType(type)`.
- `this.draggableResizable(...)` — make any node draggable/resizable (dialogs use this).

## Looking up a live node (from RaptorDom)

- `raptorDom.node(viewName, index?: number)` → `RaptorNode`
- `raptorDom.nodeT<T extends RaptorNode>(viewName, index?: number)` → `T`
- `raptorDom.nodeFE<T>(viewName, nodeCtor, boundItem)` → `T` (inside a foreach)

## Scriptor builder boilerplate

```ts
RSScriptor.register<MyNode, IMyNode>(MyNode, function (options: IMyNode) {
    const def: IMyNode = { type: "myNode", ...options, contentTemplates: [] };
    this.applyScriptorBindings(def);  // bind .bindings; call only if the node supports bindings
    this.handleStack(def);            // always — pushes def onto the DSL tracking stack
    return this;                      // return this for chaining
});
```

- `this` inside the registered fn is the `RSScriptor` instance (bound by the proxy).
- Emit `type` equal to the `@RegisterNode` key.
- For container-style nodes that accept children, accept a child-builder arg and populate `contentTemplates` instead of forcing `[]`.
