---
name: raptor
description: "Builds UI in MapLarge ADK extensions with the Raptor MVVM framework — the router for all Raptor view/control work AND for v5 feasibility questions. Core: the View/ViewModel split, the RSScriptor fluent DSL (element builders, .bindings/.events, getTypedProp/prefix scoping), reusable RaptorNodes (@RegisterNode/@BindingHandler), reactive update() re-rendering, the VM base classes, IDataStore, dialogs, child views, and state persistence. Use when writing or editing any Raptor view, view-model, RaptorNode, filter, or page-registration code — anything importing from raptor/..., \"index\", or ext/<Ext>/... — and when answering what v5 can do, editor-vs-custom-extension, or which pattern to reach for. Per-control reference docs cover the full catalog (data grid, map, foreach, dialog, select, forms, layout, theming, and more); charts belong to the sibling echarts skill. Triggers on \"RSScriptor\", \"RaptorNode\", \"view model\", \"*View.ts\", \"update()\", \"renderDialog\", \"data grid\", \"raptor map\", \"foreach\", \"v5 feasibility\"."
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "MapLarge ADK Raptor typings @ 2026-08 import baseline; RegisterNode/commitPage/DynamicViewModel declarations spot-verified against framework typings, trunk 119ba585c6e, 2026-09-09 (ARC-50)"
---

# Raptor MVVM (MapLarge ADK)

How MapLarge ADK extension UI is built: a strict View/ViewModel split, the `RSScriptor` fluent DSL, reusable RaptorNodes, and reactive `update()` re-rendering. This applies to any ADK extension whose client code lives under `extensions/<Ext>/client/`.

## When to use

Any time you write or edit client UI in a MapLarge ADK extension: a page View + ViewModel, a reusable control (RaptorNode), a map control, a sidebar filter, a data grid, a dialog, or page registration. Triggers: imports from `raptor/...`, `"index"`, or `ext/<Ext>/...`; files named `*View.ts` / `*ViewModel.ts`; calls to `RSScriptor.create`, `update(...)`, `@RegisterNode`, `@BindingHandler`, `renderDialog`, `renderChildView`.

## Controls & patterns — on-demand reference docs

This skill body is the framework layer (MVVM, DSL, RaptorNode pattern, bindings, gotchas). For a
specific control, read its doc under `reference/controls/` (relative to this skill folder)
before wiring it. For "what can v5 do", editor-vs-custom-extension, or which pattern to reach for,
read `reference/patterns.md`.

| Task / keywords | Reference doc |
| --- | --- |
| "can this be done in v5", feasibility, editor-vs-custom-extension, which pattern | `patterns.md` |
| accordion, collapsible panels | `controls/accordion.md` |
| breadcrumb trail | `controls/breadcrumb.md` |
| button | `controls/button.md` |
| card | `controls/card.md` |
| carousel, slideshow | `controls/carousel.md` |
| chart node / s.chart wrapper (option model → `echarts`) | `controls/chart.md` |
| code editor, Monaco | `controls/code-editor.md` |
| color swatch / picker | `controls/color-swatch.md` |
| custom RaptorNodes, @RegisterNode, @BindingHandler | `controls/custom-nodes.md` |
| data grid, DataGrid, sortable/paged/filterable grid | `controls/data-grid.md` |
| data store, IDataStore, filters | `controls/data-store.md` |
| date / time picker | `controls/date-time.md` |
| dialog, modal | `controls/dialog.md` |
| drawing toolbar (map draw tools) | `controls/drawing-toolbar.md` |
| dropdown menu | `controls/dropdown.md` |
| foreach, iteration, repeat | `controls/foreach.md` |
| forms, input, checkbox, radio, switch | `controls/forms.md` |
| image | `controls/image.md` |
| layout, flex, cssGrid, sizing, minHeight | `controls/layout.md` |
| legend | `controls/legend.md` |
| list group | `controls/list-group.md` |
| map, RaptorMap, layers, geometry | `controls/map.md` |
| markdown | `controls/markdown.md` |
| nav tabs, tabbed panes | `controls/nav-tabs.md` |
| navbar | `controls/navbar.md` |
| numeric range filter | `controls/numeric-range-filter.md` |
| object editor, descriptor-driven form | `controls/object-editor.md` |
| pagination | `controls/pagination.md` |
| progress bar | `controls/progress-bar.md` |
| quick select | `controls/quick-select.md` |
| select, dropdown select, multiselect | `controls/select.md` |
| sidebar | `controls/sidebar.md` |
| slider | `controls/slider.md` |
| svg | `controls/svg.md` |
| table | `controls/table.md` |
| text, labels, headings | `controls/text.md` |
| theming, colors, dark mode, CSS variables | `controls/theming.md` |
| time slider, playback | `controls/time-slider.md` |
| timeline | `controls/timeline.md` |
| tree | `controls/tree.md` |

## Mental model

- **View = pure function** returning `ViewDefinitions.IRenderingDefinition`, built only with the `RSScriptor` DSL. Never imperative DOM — Raptor's renderer owns the DOM under a view, so elements created behind its back are invisible to bindings and get wiped on the next `update()`. A view imports its VM type purely for `RSScriptor.create<MyVM>()` typing.
- **ViewModel = state + behavior.** Private `_backingFields` with public get/set. The renderer reads getters; a setter (or method) mutates state then calls `this.update()` to re-render. Handlers referenced in the view by name resolve to VM methods/getters.
- **Bindings are by string property name** on the VM (or a getter that returns the value). `s.getTypedProp("foo")` is just a typed string `"foo"`.
- **Re-render is explicit.** Mutating a field does nothing until `this.update()` (whole VM) or `this.update("viewName")` (one named section) runs.

Framework types (`raptor/...`, `"index"`) resolve at build via the root `tsconfig.json`'s `typeRoots: [".adk/types.d/**/*"]`. Their full declarations **are shipped on disk** in `.adk/types.d/MapLarge.Server.d.ts` — so any signature can be read directly (see "Finding a definition" below); never guess or grep the whole system for it.

## The three import sources

```ts
import { RSScriptor, ViewDefinitions, RaptorDom, RaptorEngine, dom, DataStore, transforms,
         setGlobalTheme, registerPublicDashboard, ILocatedRoute } from "index"; // platform exports
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel"; // framework internals
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { RaptorNodeBase } from "raptor/raptorDom/controls/RaptorNodeBase";
import { RegisterNode } from "raptor/decorators/RegisterNode.decorator";
import { BindingHandler } from "raptor/decorators/BindingHandler.decorators";
import { RaptorMap } from "raptor/raptorDom/controls/Map/RaptorMap";
import { DataGridViewModel } from "raptor/raptorDom/controls/DataGrid/DataGridViewModel";
import { IDataStore, DataSourceFilter } from "raptor/stores/Interfaces";
import { MyControl } from "ext/<Ext>/RaptorNodes/MyControl"; // cross-extension import pattern
```

The third form, `ext/<Ext>/...`, imports something another extension exports (a shared RaptorNode, helper, or VM). Replace `<Ext>` with the providing extension's name.

## Finding a definition (no repo-wide grep)

Every symbol resolves to a `declare module "<import path>"` block in one of the toolchain `.d.ts` files under `.adk/types.d/` (relative to the repo root — the dir on `tsconfig.json`'s `typeRoots`). To read a real, current signature: run the **Grep tool** with `path` set to the **single** file below and `pattern` set to the **exact** import path, then Read that file from the reported line (~60 lines) for the block.

| Import form | Grep tool `path` | Grep tool `pattern` |
| --- | --- | --- |
| `"index"` (platform exports) | `.adk/types.d/MapLarge.Server.d.ts` | `declare module "index"` |
| `raptor/...` (framework internals) | `.adk/types.d/MapLarge.Server.d.ts` | `declare module "raptor/<the/exact/path>"` |
| `ext/<Ext>/...` (other extension) | `.adk/types.d/_<Ext>.d.ts` | `declare module "ext/<Ext>/<path>"` |

Examples — the `pattern` is just the string you'd `import` from:

- `DynamicViewModel` → path `.adk/types.d/MapLarge.Server.d.ts`, pattern `declare module "raptor/raptorDom/viewModels/DynamicViewModel"`
- a shared control → path `.adk/types.d/_<Ext>.d.ts`, pattern `declare module "ext/<Ext>/RaptorNodes/MyControl"`

`MapLarge.Server.d.ts` is ~510k lines (512 `raptor/...` modules + `"index"`), so always pin `path` to that one file and match the exact `declare module` string, then Read only the matched block. Never read the whole file, and never grep a bare identifier across the workspace — the module path is the query.

**Need the implementation, not just the signature?** The `.d.ts` above has declarations only. The framework's TypeScript *source* lives in a separate MapLarge core repo under `MapLarge.Server/src/framework/` — a `raptor/<x>` import is `.../framework/raptor/<x>.ts` and `"index"` is `.../framework/index.ts` (this subpath is stable across checkouts; only the repo root varies per machine). The checkout root is machine-specific and not derivable from this repo — it may already be in your session context (a "MapLarge core repo" path in the global `CLAUDE.md` or a memory pointer); if not, ask the user. Stay in the `.d.ts` for signatures; go to source only for actual behavior.

## VM base classes (pick one)

All take `(raptorDom: RaptorDom, raptorEngine: RaptorEngine)` and expose `this.raptorDom`, `this.raptorEngine`, `update()`, `serialize()`, `deserialize()`.

- **`RaptorViewModel`** — page/control VMs that aren't high-churn data. Typical uses: a page VM, a control's VM, the `AppStateViewModel` singleton, a filter VM.
- **`DynamicViewModel`** — data-bound, high-churn pages: data sources, grids, persistence. Adds `initializeDataSources(...)`, `registerLayers(...)`, `getDataSource(name)`, `onDataSourceChanged(...)`, `dataStore`, `layerStore`. Use for a page VM that drives a map + grid off live data sources (e.g. `MyPageViewModel`).
- **`RaptorNodeBase<TInterface>`** — the *node class* of a reusable control (see RaptorNode pattern). Not the control's VM — its VM is a separate `RaptorViewModel` subclass.

## Core DSL — RSScriptor

```ts
const s = RSScriptor.create<MyViewModel>();
s.page("MODELKEY", "Display Title");        // page-level views only
s.view("main", s => s./* element tree */);  // a named render region
return s.commitPage();                       // page view → IRenderingDefinition
// (control/sub views return s.commit() and use RSScriptor.create<VM>() without .page)
```

Element builders chain; nesting is via `.contentTemplates(s => s....)`:

```ts
.div({ flex:{dFlex:true,flexColumn:true}, padding:{around:2}, customCssClasses:["x"],
       viewName:"section", controlTargetKey:"slot",
       bindings:{ visible:s.getTypedProp("showIt") },
       events:[{ event:"click", handler:s.getTypedProp("onClick") }] })
.contentTemplates(s => s.span({ bindings:{ text:s.getTypedProp("label") } }))
```

Common builders (real usage): `div`, `span`, `label`, `h3/h4/h6`, `anchor`, `button`, `image`, `svg`, `list/listItem`, `card/cardBody`, `container/layoutContainer`, `navbar`, `dropdown`, `sidebar`, `accordion/accordionItem/accordionItemHeader/accordionItemBody`, `cssGrid/cssGridItem`, `dialog/dialogHeader/dialogBody`, `dataGrid` + `tableHead/tableBody/tr/th/td`, `foreach`, `raptorMap`, `mapLargeSvgLogo`, `element` (generic typed node), `chart`, and any registered custom nodes (your own RaptorNodes get a builder named by their `type`). `quickSelect`, `radio/radioButtonGroup` also exist.

### Bindings (`.bindings:{ ... }`)

Values are **property-name strings** (use `s.getTypedProp("x")` for typed strings):

- `text`, `visible`, `enable`, `checked`, `tooltip`, `svgKey`/`svgOptions`, `data` (controls like map/grid).
- `attr:{ href:"formatted", src:"imageUrl" }` — DOM attributes.
- `css:{ property:"isActive", trueClasses:["on"], falseClasses:["off"] }` — conditional classes.
- `style:{ property:"hasColor", trueStyles:{color:"red"}, falseStyles:{} }` — conditional inline style.
- `foreach:{ property:"rows" }` — repeat element per item (also the standalone `.foreach(prop, s=>...)`).

### Events

```ts
events:[{ event:"click"|"pointerup"|"pointerdown"|"change", handler:s.getTypedProp("methodName") }]
```

A bare string handler (`handler:"onSomething"`) also works; it resolves to a VM method.

### Scoping with `prefix` and `foreach`

`getTypedProp` resolves against the **current scope**. Inside `.foreach(prop, ...)` the scope is the iterated item, so `s.getTypedProp("title")` reads the item's `title`. To reach back to a nested VM, chain `prefix`:

```ts
.foreach(s.prefix("myVm").getTypedProp("headerStatTiles"))   // VM exposes get myVm(){return this}
.div({ bindings:{ text:s.prefix("myVm").getTypedProp("currentDateTime") } })
```

The `get xVm(){ return this; }` self-getter pattern is how VMs expose a stable scope root for `prefix`. For deeper grid scoping you can cast the row scriptor: `(rawRowS as unknown as ITableRowScriptor<IRowScope>)`.

`s.getSvgKey("mlsvg-extents-filled")` returns a registered SVG key string for `svg({ key })`.

## RaptorNode pattern (reusable control = trio)

A control is **three files**: `MyControl.ts` (node class), `MyControlView.ts`, `MyControlViewModel.ts`. A shared control imported across extensions usually lives in a providing extension's `client/RaptorNodes/` and is reached via `ext/<Ext>/RaptorNodes/MyControl`.

```ts
@RegisterNode({
  rootElement: () => dom.createElement("div", { class: "ml-my-control" }),
  viewModel: MyControlViewModel,            // the control's RaptorViewModel subclass
  svgKey: "mlsvg-star"                       // optional palette icon
})
export class MyControl extends RaptorNodeBase<IMyControl> {
  public get vm(): MyControlViewModel {
    return this.raptorDom?.renderer?.vmInstances?.[this.key] as MyControlViewModel;
  }
  private _viewContext?: PartialViewContext;
  public create(): void {                     // lifecycle: build the partial view onto this.root
    this.viewContext?.destroy();
    this._viewContext = this.renderPartialViewDef(
      MyControlView() as ViewDefinitions.IViewDefinition<"false">, this.root);
    this._viewContext.update();
  }
  public clean(): void { /* dispose listeners */ super.clean(); }

  @BindingHandler("listItems")                // fires when the bound prop changes
  public handleItems(value: MyItem[] | null, _) {
    this.vm.listItems = value ?? [];
    this._viewContext?.update();               // re-render the control's partial view
  }
}

// Register so the DSL gets a builder named by `type`:
RSScriptor.register(MyControl, function (viewDef) {
  const node: IMyControl = { type: "myControl", ...viewDef };
  this.applyScriptorBindings(node); this.handleStack(node); return this;
});
```

Place it in a view with `.element({ type:"myControl", viewName:"...", bindings:{ listItems: s.getTypedProp("listItems") } } as IMyControl<ForScriptorTrue>)`. The node's bindings interface extends `ViewDefinitions.IViewDefinitionWithEvents<T>` with `bindings?: Bindings.IRaptorUniversalBindings<T> & IMyControlBindings<T>`; each prop is `Bindings.BindingProp<T, ValueType>`.

Note: function values currently can't be passed via a binding — set them imperatively instead (e.g. a `setCallback(fn)` method on the control's VM, called after the node initializes).

## Reactive updates

```ts
private _isLoading = false;
public get isLoading() { return this._isLoading; }
private setLoadingState(v: boolean) { if (this._isLoading === v) return; this._isLoading = v; this.update(); }
// targeted: re-render only one named region (the `viewName:` on an element)
this.update("statusDisplay");
// node partial view: this.viewContext?.update();
```

Guard setters against no-op changes to avoid render loops. Reassign arrays to a new reference (`this.items = [...this.items]`) to force re-evaluation.

## Patterns

**Page registration**: export `defineModule()` returning `{ name, pages:{[key]:View()}, pageViewModels:{[key]:[{classModule, className}]}, layouts, dialogs }`; the shell prefixes keys as `"<Ext>-<key>"`. `registerPublicDashboard({ id:"ext/<Ext>/main", hideSidebar, hideHeader })` makes it routable. `initModule(container, route)` news a `RaptorEngine`, `await engine.initialize()`, then `engine.loadModule(def, route?.values["page"])`.

**App-state singleton**: one `AppStateViewModel` per page; read from any VM via

```ts
this.raptorEngine.renderer.getDataContextByCtor<AppStateViewModel>(AppStateViewModel)
```

Added with `engine.addDataContext(appState)`. Commonly holds `config`, `deepLinkParams`, `appIdToPageModelKey`.

**Data sources & filters** (DynamicViewModel): `this.initializeDataSources(cfg.dataSources)`, `this.getDataSource(name)`, `this.onDataSourceChanged(name, ds => {...}, { filtersToIgnore:"All" })`. Stored filters go through `IDataStore`:

```ts
await this._dataStore.setFilter(dsName, { name:"DynamicFilter_<ds>__<col>", filter });
await this._dataStore.removeFilter(dsName, filterName);
this._dataStore.getFilter(dsName, name);
```

A common naming scheme for stored filters is `DynamicFilter_<dataSourceName>__<column>`; filter values are `ml.data.query.IQueryWhere` ({col, test, value}) and OR groups are built by combining clauses.

**Data grid**: `DataGridViewModel.fromDataSource(this, dsName, { displayFields, defaultSort:{field,direction}, viewModelFactory })`. Bind with `bindings:{ data:s.getTypedProp("grid") }` under `.dataGrid(...)`.

**A VM that is its own view**: a VM can build and return its own `IViewDefinition` with `const s = RSScriptor.create<any>(); ... return s.commit();`, then be rendered into a control target and wired up manually:

```ts
const targetDiv = engine.renderer.controlTargets.controlTargets["myPanelContent"];
engine.renderer.render(fragment, viewModelInstance.getView());
// associate the standalone VM with the rendered DOM so bindings/handlers resolve:
engine.keyedViewModelInstances[key] = { viewModel, ctorName }; // + getRaptorNodesFromElement
```

Control targets are declared in a view via `controlTargetKey:"myPanelContent"` on a `div`.

**Child views into a region** (tabbed panels): `this.raptorEngine.renderer.renderChildView("myPanel", MySidePanelView(), selectedTab)` from the orchestrating VM's tab-switch method.

**Dialogs**:

```ts
this.raptorEngine.renderDialog(viewDefinition);                       // plain dialog
const { newDialogModelKey } = this.raptorEngine.renderDialogVM(View(), null, dialogVm); // VM-backed
this.raptorEngine.renderer.raptorDom.destroyDialog(dialogKey);       // close
```

A dialog view uses `.dialog({ viewName, title, width, allowClose }).contentTemplates(s => s.dialogHeader({...}).dialogBody({...}))`. For VM-backed dialogs, assign `newDialogModelKey` onto the dialog VM so it can later destroy itself.

**State persistence**: VMs override `serialize(): ISerializedViewModel` / `deserialize(data)`; the shell snapshots all VMs to a `moduleState` widget (`ml.widget`) periodically. Set `json.classModule = "ext/<Ext>/view-models/pages/<Name>"` and `json.className` so the module can be reloaded. Guard `deserialize` until the VM has `initialize()`d (stash into `_pendingSavedState`).

**Map** (`RaptorMap`): place via `.raptorMap({ viewName:"mainMap", showEditor:true, bindings:{ data:s.getTypedProp("defaultMapOptions") }, mapOptions:{...} })`; reach it imperatively with `this.raptorDom.nodeT<RaptorMap>("mainMap")`; `map.onMapCreated(cb)`, `map.map.addClickListener(...)`, `map.map.zoomToWKT(wkt, z)`.

## Gotchas

- Mutating a field without `update()` shows nothing. Conversely, calling `update()` in a getter or unguarded setter causes render loops — guard with equality checks.
- `getTypedProp("x")` is a typed string, not a value read; the renderer resolves `"x"` against the bound scope at render time.
- Folder naming is inconsistent across extensions: some use `client/view-models/`, others `client/viewModels/`. Match the file you're editing.
- Functions can't be passed through bindings; wire callbacks imperatively after the node initializes.
- Inside `.foreach`, scope is the item — use `prefix("<selfGetterVm>")` to reach page-level props.
- Page views end with `s.commitPage()`; non-page (control/dialog/self) views use `s.commit()`. Mismatching breaks rendering.
- RaptorNodes need both `@RegisterNode` (instantiation) **and** `RSScriptor.register(...)` (DSL builder). Some nodes self-register at module load (the registration runs as a side effect of importing the file); others export a register function you must call explicitly — check the node before using it.
- Don't edit anything under `.adk/` — it's toolchain-managed.

## Related skills

- `echarts` — charts are rendered through the Raptor `s.chart({ options })` node; see that skill for option-model, series, and `renderItem` specifics.
- `reference/patterns.md` — the patterns/overview layer: cross-cutting design patterns and "what can v5 do" feasibility. Start there for the pattern, return to the control docs for per-control implementation.

Machine-readable ground truth for every symbol: `.adk/types.d/MapLarge.Server.d.ts` (framework) and `.adk/types.d/_<Ext>.d.ts` (per-extension) — see "Finding a definition" above.

Human reference (SPA, not machine-readable): <https://docs.maplarge.com/dashboard/ext/docportal/portal/documentation>

---
*Read `reference/raptor-reference.md` when a question needs the deeper DSL surface (full builder/binding/option listings) beyond the framework layer summarized above.*
