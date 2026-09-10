# Raptor reference cheatsheet

Fast index of the signatures used in MapLarge ADK extension client code (`extensions/<Ext>/client/`). **The authoritative source is the shipped framework `.d.ts`:** `.adk/types.d/MapLarge.Server.d.ts` declares every `raptor/...` and `"index"` symbol, and `.adk/types.d/_<Ext>.d.ts` declares each extension's `ext/<Ext>/...` exports. When you need the exact/current signature of anything below, grep that file for `declare module "<import path>"` and read the block — see "Finding a definition" in `SKILL.md`. This sheet is the quick lookup; the `.d.ts` is truth.

## RSScriptor entry / commit

| Call | Use |
| --- | --- |
| `RSScriptor.create<VM>()` | start a scriptor typed to a VM |
| `s.page(modelKey, label)` | declare a page (page views only) |
| `s.view(name, s => ...)` | a named render region within a page |
| `s.commitPage()` | finish a **page** view → `ViewDefinitions.IRenderingDefinition` |
| `s.commit()` | finish a **control/dialog/self** view → `IViewDefinition` |
| `s.build()` | alternative finalizer seen in older views |
| `RSScriptor.register(NodeClass, fn)` | register a custom node's DSL builder |

Page-view def fields set after commit: `renDef.modulePageTarget = "modulePageContent"` (the layout view's page slot), `pageDef.modelKey = name` (set by shell).

## Element builders (all accept an options object, chain `.contentTemplates(s => ...)`)

Layout/containers: `div`, `span`, `container({fluid})`, `layoutContainer`, `card`, `cardBody`, `navbar`, `sidebar({viewName,sidebarWidth,collapsable,heading,collapsed,chevronDirection})`, `cssGrid({rows,columns,rowGapPx,dragToResize,setFullHeight,minResizeRowPx})`, `cssGridItem({rowStart,rowEnd,columnStart,columnEnd,resizeFromEdges:["south"]})`.

Text/media: `h3`,`h4`,`h6`,`label`,`anchor({navLink,href,target})`,`image({src,minHeight})`,`svg({key,width,height,cssClass})`,`mapLargeSvgLogo({height})`.

Interactive: `button({kind:"link",dropdownToggle,dropdownItem,accordionHeaderButton,tooltip,svgOptions,hideDropDownArrow,testId})`, `dropdown`, `list({dropdownMenu,listStyleType,minWidth})`, `listItem`, `radio`, `radioButtonGroup`, `quickSelect`.

Accordion: `accordion`, `accordionItem({headerText, bindings:{collapsed}})`, `accordionItemHeader`, `accordionItemBody`.

Data: `dataGrid({bindings:{data}})`, `tableHead`, `tableBody`, `tr`, `th`, `td`, `foreach(prop, s=>...)`.

Dialog: `dialog({viewName,title,width,allowClose})`, `dialogHeader({visible})`, `dialogBody`.

Map/custom: `raptorMap({viewName,showEditor,mapOptions,bindings:{data}})`, `element(cfg)` (generic typed node), `chart({options})` (ECharts — see the echarts skill), and any registered custom nodes (your own RaptorNodes get a builder named by their `type`).

Common option keys across builders: `viewName`, `controlTargetKey`, `id`, `customCssClasses`, `padding/{around,x,y,top,left,right,bottom}`, `margin`, `gap`, `flex/{dFlex,flexColumn,flexRow,flexGrow,flexShrink,alignItemsCenter,justifyContentCenter,justifyContentBetween,flexWrap,flexFill,alignSelfStretch}`, `position/{relative,absolute,top,left,right,bottom}`, `zIndex`, `overflow`, `minHeight/minWidth`, `width/height`, `widthUtility/heightUtility` (0–100), `background`, `border/borderColor`, `display/{dBlock,dInlineBlock}`, `textAlignment`, `fontSize`, `fontWeight`, `textTransform`, `customFontSize`, `cursor`, `pointerEvents`, `badge`, `opacity`, `testId`, `svgOptions`, `bindings`, `events`.

## Scoping / value helpers

| Helper | Returns | Note |
| --- | --- | --- |
| `s.getTypedProp("name")` | typed `"name"` string | resolved against current scope at render |
| `s.prefix("vmGetter")` | scriptor scoped onto a nested VM | chain `.getTypedProp(...)` or `.prefix(...)` |
| `s.getSvgKey("mlsvg-x")` | registered svg key string | for `svg({key})` |
| self-getter `get xVm(){return this;}` | stable scope root | target of `prefix("xVm")` |
| `ITableRowScriptor<IScope>` | cast for grid row scope | `(rawRowS as unknown as ITableRowScriptor<T>)` |

`ForScriptor` generics: `ViewDefinitions.ForScriptorTrue` / `ForScriptorFalse` parameterize node interfaces; use `<ForScriptorTrue>` when casting a node config placed in a view.

## bindings keys

`text`, `visible`, `enable`, `checked`, `tooltip`, `data`, `svgKey`, `svgOptions`, `attr:{<htmlAttr>:prop}`, `css:{property, trueClasses[], falseClasses[]}`, `style:{property, trueStyles{}, falseStyles{}}`, `foreach:{property}`, `collapsed` (accordion/sidebar). Node-specific bindings are declared in `IFooBindings<T>` where each is `Bindings.BindingProp<T, ValueType>`; the node interface merges `Bindings.IRaptorUniversalBindings<T> & IFooBindings<T>`.

## events

`events:[{ event, handler }]` where `event ∈ {click, pointerup, pointerdown, change, ...}` and `handler = s.getTypedProp("vmMethod")` or a bare `"vmMethod"` string. Handler receives the bound scope item (and optionally the DOM `Event`) — e.g. `clearFilter(_ctx, e?: Event)`.

## Decorators

`@RegisterNode({ rootElement: () => dom.createElement("div",{class}), viewModel: VMClass, svgKey?: string })` on the node class.

`@BindingHandler("propName")` on a method `(value, _) => void` — fires when the bound prop changes; mutate `this.vm` then call `this.viewContext?.update()`.

## VM base classes

All ctors: `(raptorDom: RaptorDom, raptorEngine: RaptorEngine)` → `super(...)`.

`RaptorViewModel` (`raptor/raptorDom/viewModels/RaptorViewModel`): `this.raptorDom`, `this.raptorEngine`, `update(viewName?, index?)`, `serialize()`, `deserialize(data)`.

`DynamicViewModel` (`raptor/raptorDom/viewModels/DynamicViewModel`): adds data-source/persistence surface: `this.dataStore` (`IDataStore`), `this.layerStore`, `initializeDataSources(srcs)`, `registerLayers(layers)`, `getDataSource(name): ml.data.IDataSource`, `onDataSourceChanged(name, cb, opts?)`, `defaultMapOptions`. `serialize()`/`deserialize()` are commonly overridden (call `super`).

`RaptorNodeBase<TInterface>` (`raptor/raptorDom/controls/RaptorNodeBase`): node class base; ctor `(nodeModel, raptorDom, key, root)`. Members: `this.root`, `this.key`, `this.nodeModel`, `this.raptorDom`, `this.isDestroyed`; lifecycle `create()`, `clean()` (call `super.clean()`); `renderPartialViewDef(viewDef, root): PartialViewContext`; `vm` getter via `raptorDom.renderer.vmInstances[this.key]`.

## update()

| Call | Effect |
| --- | --- |
| `this.update()` | re-render whole VM |
| `this.update("viewName")` | re-render one named region (the `viewName:` on an element) |
| `this.update("viewName", index)` | targeted indexed update |
| `this.viewContext?.update()` | re-render a node's partial view |
| `PartialViewContext.destroy()` | tear down a partial view before re-creating |

## RaptorEngine / renderer

- `new RaptorEngine(container)`, `await engine.initialize()`, `engine.loadModule(def, page)` / `loadModule(name, page, addDefault)`.
- `engine.addPage(view)`, `engine.addLayout(view)`, `engine.addDialog(def)`, `engine.addViewModels({modelKey, viewModels:[Ctor]})`, `engine.addDataContext(vm)`.
- `engine.navigate({ gotoModelKey, isActivePage })`, `engine.log({control,location,action,name})`, `engine.registerLogCallback(cb)`.
- `engine.serializeViewModelsForSavingAsync()`, `engine.applySavedState(entityId)`.
- `engine.renderer.getDataContextByCtor<T>(Ctor)` — fetch a singleton VM (e.g. AppStateViewModel).
- `engine.renderer.controlTargets.controlTargets["key"]` — DOM element for a `controlTargetKey`.
- `engine.renderer.render(fragmentOrEl, viewDef)` — imperatively render a view def.
- `engine.renderer.renderChildView(targetKey, viewDef, selectedTab?)` — mount a child view in a region.
- `engine.renderer.getRaptorNodesFromElement(el)` / `engine.keyedViewModelInstances[key] = {viewModel, ctorName}` — associate a standalone VM with rendered DOM.
- `engine.renderer.raptorDom.destroyDialog(dialogKey)`.

## RaptorDom

`raptorDom.node(viewName): RaptorNode`, `raptorDom.nodeT<T>(viewName): T`, `raptorDom.renderer`, `raptorDom.getNextZIndex()`, `dom.createElement/addClass/empty/appendChild/getBody`.

## Dialogs

| Call | Returns |
| --- | --- |
| `raptorEngine.renderDialog(viewDef)` | plain dialog |
| `raptorEngine.renderDialogVM(View(), null, vm)` | `{ newDialogModelKey }` (assign to `vm.dialogKey`) |
| `raptorEngine.renderer.raptorDom.destroyDialog(key)` | close |

Dialog view: `.dialog({viewName,title,width,allowClose,customCssClasses}).contentTemplates(s=>s.dialogHeader({visible}).dialogBody({...}))`.

## Data store / filters (`IDataStore`, from `raptor/stores/Interfaces`)

`setFilter(dsName, {name, filter: DataSourceFilter})`, `removeFilter(dsName, name)`, `getFilter(dsName, name)`, `onDataSourceChanged(name, cb, {filtersToIgnore:"All"})`. A common stored-filter naming convention is `DynamicFilter_<dataSourceName>__<column>` (single col) or `..__<col1>__<col2>` (multi). Filter values use `ml.data.query.IQueryWhere` ({col, test, value}); build OR groups by combining clauses.

## Data grid

`DataGridViewModel.fromDataSource(contextVM, dsName, { displayFields:[{name,label,...}], defaultSort:{field,direction:"asc"|"desc"}, viewModelFactory:(ctx,row)=>RowVM })`. Instance: `.behaviors.enableSelection`, `.pinnedFields`, `.unpinnedFields`, `.downloadData()`. Bind with `.dataGrid({ bindings:{ data:s.getTypedProp("grid") } })`.

## RaptorMap

Place: `.raptorMap({ viewName, showEditor, mapOptions:{searchBox,disableDriveTimes,apiOptions:{zoomControl}}, bindings:{ data:getTypedProp("defaultMapOptions") } })`. Imperative: `raptorDom.nodeT<RaptorMap>("mainMap")` → `.onMapCreated(cb)`, `.map.addClickListener(ll=>...)`, `.map.zoomToWKT(wkt,z)`, `.map.zoom.get()/set(z)`, `.map.getInternalMap()`. Layer highlight via `layerStore` (ScopeLayerStore).

## State persistence

Override `serialize(): ISerializedViewModel` (call `super.serialize()`, set `json.classModule="ext/<Ext>/view-models/pages/<Name>"`, `json.className`, populate `json.data.*`) and `deserialize(data)` (stash into `_pendingSavedState` until `initialize()`d, then `super.deserialize(data)` + restore). Shell saves all VMs to `ml.widget` type `moduleState` periodically, keyed by `tags.dashboardId`.

## Module registration shape (`defineModule()`)

```ts
{ name, pages:{[key]:View()}, pageViewModels:{[key]:[{classModule, className}]}, layouts:{Layout:LayoutView()}, dialogs:{[key]:DialogView()} }
```

`registerPublicDashboard({ id:"ext/<Ext>/main", name, description, hideSidebar, hideHeader })`. `registerCustomRoute({route, path, params})`. Shell prefixes page/vm keys as `<name>-<key>`.

## Build / toolchain

- Build one extension: `mlcomp "<Ext>"` (use the `Name` from the extension's `manifest.json`); multiple: `mlcomp "<Ext1>,<Ext2>"`.
- Keep the CLI/ADK current before building (about weekly): `dotnet tool install -g MapLargeInc.CLI` then `maplarge adk update-version`.
- Never edit anything under `.adk/` — it is managed by the ADK toolchain.
