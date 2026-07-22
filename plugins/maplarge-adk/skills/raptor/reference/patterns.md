# Raptor/v5 Dashboard Development — Patterns & Feasibility

The patterns/overview layer for Raptor UI: which pattern to reach for, what v5 can do, and
editor-vs-custom-extension calls. The comprehensive design-patterns guide is included in full below;
use the "When to Read What" index to jump to the relevant sections before writing UI code. For
per-control *implementation* detail (exact options, bindings, methods, gotchas), use the control
docs under `${CLAUDE_PLUGIN_ROOT}/skills/raptor/reference/controls/` and the framework conventions
in the `raptor` skill body; charts are in the `echarts` skill.

## When to Read What

| Task | Sections to Read |
|------|-----------------|
| Answering "can this be done in v5?" | Available Raptor Controls, Dynamic Style Binding, Chart Interactions, DataGrid Advanced Patterns, Overview (v4 vs v5 table) |
| Determining v5 editor vs custom extension | Overview, Extension Development Patterns, Available Raptor Controls |
| Color coding / conditional formatting | Dynamic Style Binding, Chart Interactions (ECharts Gradient Colors), DataGrid Advanced Patterns (Custom Row ViewModel) |
| Creating a new extension from scratch | Extension Development Patterns (all subsections), Extension Structure |
| Setting up dashboard registration | Dashboard Registration Patterns, IRaptorModule Interface |
| Creating a new page/view | RSScriptor Fluent API, Views and Pages, ViewModels |
| Building a layout with sidebar/header | Navigation System, Layout Elements, Sidebar Pattern |
| Adding data binding | Data Binding, Events, Foreach and Iteration |
| Building a table/grid | DataGrid Advanced Patterns, DataGrid Architecture, Nested Control Behavior |
| Adding charts | Async Chart Data → Preferred: Framework binding via chartDataSet.source; Display Controls (chart), Charts in Flex Layouts, Chart Interactions |
| Adding a dropdown selector | Advanced Control Patterns → QuickSelect Advanced Usage |
| Adding a menu dropdown | Advanced Control Patterns → Dropdown Control |
| Building tab navigation | Advanced Control Patterns → NavTabs with Content Panes |
| Adding a tree view | Advanced Control Patterns → Tree Control |
| Creating dialogs/modals | Dialog Lifecycle (open, close, shared VM, parameter passing) |
| Layout work | Layout Elements, Layout Utilities, The minHeight: 0 Rule |
| Adding controls (buttons, inputs, etc.) | Input Controls |
| Working with data sources | DynamicViewModel and Data Sources, ml Global API Reference |
| Querying data from server | ml Global API Reference (ml.query, ml.servercache) |
| Navigating between pages | Navigation System |
| Debugging layout/sizing issues | Height Handling in Flex Contexts, Common Issues and Solutions |
| Side-by-side equal-width charts | Charts in Flex Layouts → Equal-Width Chart Cards |
| Dynamic per-row colors | Dynamic Style Binding |
| Iterating arrays with drag-and-drop | Foreach and Iteration (advanced foreach, rendering modes) |
| Embedding a V4 control in Raptor | Advanced Control Patterns → DashboardWrapper |
| Using a custom/unregistered control | Advanced Control Patterns → Custom Control Types via element() |
| Saving/restoring dashboard state | Advanced Control Patterns → ViewModel Serialization |
| Toggling between list/editor views | Advanced Control Patterns → Two-View Toggle Pattern |
| Per-row actions with dropdown menus | Advanced Control Patterns → Per-Row ViewModel Pattern |
| Filtering multiple data sources at once | Advanced Control Patterns → Multi-DataSource Filter Cascading |
| Performance: only updating part of the UI | Advanced Control Patterns → Selective View Updates |
| Programmatically collapsing accordion | Advanced Control Patterns → Accordion Collapse State Binding |
| Rendering NATO military symbols | Map Layer Styles & Geometry UDFs → NATO Military Symbol Rendering |
| Building polylines from time-ordered points | Map Layer Styles & Geometry UDFs → Per-Track Polylines from Time-Ordered Points |
| Time slider, playback controls, time animation | Advanced Control Patterns → DashboardWrapper → v4 Controls With No v5 Native Equivalent |
| Flex row heights in v5 pages (collapsing rows) | Flex Row Heights in Raptor v5 — Use heightUtility, NOT flexGrow > 1 |

## Critical Patterns to Know

### Chart Update Timing

The `traverseRaptorChart: true` binding resolves ViewModel getter references at initial render time only. If chart data arrives asynchronously (e.g., from `onDataSourceChanged`), you must manually update the ECharts instance:

```typescript
const chartNode = this.raptorDom?.node("MyChart") as any;
if (chartNode?._chartInstance) {
    chartNode._chartInstance.setOption({
        xAxis: { data: this._xAxisData },
        series: this._series
    }, false);
    chartNode._chartInstance.resize();
}
```

Use `setTimeout` with retries if the chart container isn't visible yet (e.g., behind a visibility binding).

### DataGrid with Custom Row ViewModel

Use `DataGridViewModel.fromDataSource()` with `viewModelFactory`:

```typescript
this._dataGridData = DataGridViewModel.fromDataSource(this, "my_data_source", {
    viewModelFactory: (context, data) => new MyCustomRowVM(context, data)
});
```

The custom row VM extends `BasicDataGridRowViewModel`. Access row data via `gridvm.fields.ColumnName.value`.

### DynamicViewModel Data Sources

```typescript
// Register data sources
this.initializeDataSources([{
    name: "my_data",
    dataSource: { table: "account/table", sqlselect: ["col1", "col2"], take: 500 }
}]);

// Listen for data (use cast — onDataSourceChanged is inherited but not in .d.ts)
(this as any).onDataSourceChanged("my_data", (ds: any) => {
    // ds is a metadata descriptor — query it for actual data:
    const query = ml.query();
    query.from(ds);
    query.select("col1");
    query.take(500);
    query.runAsync().then(resp => {
        const data = resp?.data?.data; // columnar: data["col1"] = [val1, val2, ...]
    });
});
```

### Style Binding for Dynamic Colors

The Raptor `style` binding is boolean-based (`trueStyles`/`falseStyles`). For dynamic per-row colors (e.g., color-coded cells), use `attr.style` with an inline CSS string:

```typescript
// ViewModel: expose inline style string
cellStyle = `background-color:${color};color:${textColor};font-weight:600;`;

// View: bind via attr.style
.td({
    bindings: {
        text: 'displayValue',
        attr: { style: 'cellStyle' }
    }
})
```

### Column Type Names from Server

MapLarge returns .NET type names (PascalCase): `Int32`, `Int64`, `Double`, `String`, `DateTime`, `Guid`, `XY`. When filtering columns by type, compare lowercase:

```typescript
const t = colTypes[i]?.toLowerCase();
const isNumeric = ["int", "int32", "int64", "long", "float", "double", "decimal"].includes(t);
```

### Table/Column Listing APIs

```typescript
// Get all tables (returns Promise via jQuery)
const tables = await new Promise(resolve => {
    ml.servercache.FetchStoredTablesPromise(true).done(resolve);
});

// Get single table metadata
const storedTable = await ml.servercache.fetchStoredTableAsync("account/table", true);
const colNames = storedTable.columns.names.split(",");
const colTypes = storedTable.columns.types.split(",");
```

### Dashboard Registration (New Extension)

Always use `registerPublicDashboard()` + `initModule()` for new standalone extensions:

```typescript
registerPublicDashboard({
    id: "ext/MyExtension/dashboard",
    name: "My Dashboard",
    description: "Description",
    hideSidebar: true,
    hideHeader: true,
});

export async function initModule(container: HTMLElement, route: ILocatedRoute): Promise<RaptorEngine> {
    const engine = new RaptorEngine(container);
    engine.setPageRenderingTarget(container);
    await engine.initialize();
    engine
        .addLayout(LayoutView())
        .addPage(HomeView())
        .addViewModels({ modelKey: "Layout", viewModels: [LayoutViewModel] })
        .addViewModels({ modelKey: HomeModelKey, viewModels: [HomeViewModel] })
        .addModuleNavigationModel({
            type: "listNavigation",
            navigationItems: [{ gotoModelKey: HomeModelKey, isActivePage: true }]
        });
    await engine.loadModule("MyExtension", route?.values["page"], true);
    return engine;
}
```

### Dialog Lifecycle

```typescript
// Open dialog with its own ViewModel
this.raptorEngine.renderDialog(getDialogView(), null, DialogViewModel);

// Open dialog sharing parent ViewModel
this.raptorEngine.renderDialogVM(getDialogView(), null, this);

// Close dialog (handler receives key when passDialogModelKey: true)
public closeDialog(dialogModelKey: string): void {
    this.raptorDom.destroyDialog(dialogModelKey);
    this.raptorEngine.destroyViewModelInstanceByModelKey(dialogModelKey);
}
```

### Page Registration in a Host Extension

```typescript
// In home.ts:
import { MyViewModel } from "./viewModels/pages/MyViewModel";
import { MyModelKey, MyView } from "./views/pages/MyView";

engine.addPage(MyView());
engine.addViewModels({ modelKey: MyModelKey, viewModels: [MyViewModel] });

// Add to sidebar:
layoutViewModel.addSidebarItem(
    new SidebarItem(layoutViewModel, MyModelKey,
        { key: "mlsvg-icon-name", width: 16, height: 16, cssClass: "ml-dash-svg-onSurface" },
        "Display Name", [{ id: MyModelKey, linkText: "Page Title", modelKey: MyModelKey, active: false }],
        "Tooltip text", "Bottom"
    )
);
```

## Common Gotchas

| Gotcha | Problem | Solution |
|--------|---------|----------|
| `traverseRaptorChart` is one-shot | Chart data set at render time, async data arrives later → empty chart | Manually call `chartInstance.setOption()` after data loads |
| `onDataSourceChanged` not in .d.ts | TypeScript error on DynamicViewModel method | Cast: `(this as any).onDataSourceChanged(...)` |
| `flexFill: true` for equal widths | Sets `flex-basis: auto` → unequal widths | Use `flexGrow: 1, flexShrink: 1` + `customCssClasses: "flex-basis-0"` |
| Missing `minHeight: 0` | Flex children can't shrink below content → overflow, no scroll | Add `minHeight: 0` on EVERY flex ancestor |
| DataGrid height 0 | Parent flex has no height constraint | Use explicit `height: Npx` or ensure constrained ancestor chain |
| QuickSelect `_ignoreNextUpdate` | Programmatic `selectedItems` change ignored after user interaction | Reset flag: `(qs as any)._ignoreNextUpdate = false` before setting |
| NavTabs pane mismatch | Tab items and panes don't match | Panes match by ORDER, not by ID. 1st tab → 1st pane |
| `heightUtility: 100` without parent height | `h-100` only works when parent has explicit height | Prefer explicit `height: Npx` or `heightVH: N` |
| Column types are PascalCase | `"Int32"` not `"int32"` from server | Always compare `.toLowerCase()` |
| `table/list` ProcessDirect action | Doesn't exist despite permission quad | Use `table/getactivetables` instead |

## Additional Documentation

These are tracked in the server repo under `docs/extensions/ml-docs-dev/client/`:

| File | Content |
|------|---------|
| `raptor-bindings.ts` | Binding examples |
| `raptor-charts.ts` | Chart usage patterns |
| `raptor-data-sources.ts` | Data source integration |
| `raptor-dialogs.ts` | Dialog patterns |
| `raptor-events.ts` | Event handling |
| `raptor-nodes.ts` | Node type reference |
| `raptor-styling-theming.ts` | Theming guide |
| `code-examples/raptor-nodes/` | Individual control examples (accordion, chart, dataGrid, quickSelect, sidebar, table, tree, navTabs, dropdown, form) |

Also see the `ml-docs-raptor` docs extension (`client/_static/markdown/`):
- `intro-to-dashboard-development.md` — framework overview
- `bindings.md` — binding mechanics
- `events.md` — event handling

## Key Framework Source Files

| File | Purpose |
|------|---------|
| `MapLarge.Server/src/framework/raptor/RaptorEngine.ts` | Main engine, module loading, navigation |
| `MapLarge.Server/src/framework/raptor/RaptorNavigator.ts` | IRaptorModule interface, navigation |
| `MapLarge.Server/src/framework/raptor/renderer/RSScriptor.ts` | Fluent builder API |
| `MapLarge.Server/src/framework/raptor/renderer/ViewDefinitions.ts` | All control type interfaces |
| `MapLarge.Server/src/framework/raptor/renderer/Bindings.ts` | All binding interfaces |
| `MapLarge.Server/src/framework/raptor/renderer/Events.ts` | Event types |
| `MapLarge.Server/src/framework/raptor/renderer/FlexUtilities.ts` | Flex behavior interface |
| `MapLarge.Server/src/framework/raptor/renderer/Renderer.ts` | DOM rendering engine |
| `MapLarge.Server/src/framework/raptor/raptorDom/RaptorDom.ts` | DOM abstraction |
| `MapLarge.Server/src/framework/raptor/raptorDom/RaptorNode.ts` | Base control class |
| `MapLarge.Server/src/framework/raptor/raptorDom/viewModels/RaptorViewModel.ts` | Base ViewModel |
| `MapLarge.Server/src/framework/raptor/raptorDom/viewModels/DynamicViewModel.ts` | Data source ViewModel |
| `MapLarge.Server/src/framework/raptor/raptorDom/controls/DataGrid/DataGridViewModel.ts` | DataGrid data model |
| `MapLarge.Server/src/framework/raptor/raptorDom/controls/DataGrid/BasicDataGridRowViewModel.ts` | Row ViewModel |
| `MapLarge.Server/src/framework/raptor/raptorDom/controls/Chart/RaptorChart.ts` | Chart control |
| `MapLarge.Server/src/framework/raptor/stores/ScopeDataStore.ts` | Full data store |
| `MapLarge.Server/src/framework/raptor/stores/PagedData.ts` | Paging support |
| `MapLarge.Server/src/framework/raptor/decorators/RegisterNode.decorator.ts` | Control registration |
| `MapLarge.Server/src/framework/Registry.ts` | registerPublicDashboard() |

---

# MapLarge UI Design Patterns

> **Comprehensive guide to MapLarge UI development patterns for Claude Code assistance.**

This document covers the MapLarge UI component systems, patterns, and best practices. The focus is primarily on the modern **v5/Raptor** system, with coverage of the legacy **v4** system for maintenance purposes.

---

## Table of Contents

1. [Overview](#overview)
2. [Key File Locations](#key-file-locations)
3. [v5/Raptor System (Primary)](#v5raptor-system-primary)
   - [RSScriptor Fluent API](#rsscriptor-fluent-api)
   - [Views and Pages](#views-and-pages)
   - [ViewModels](#viewmodels)
   - [Layout Elements](#layout-elements)
   - [Input Controls](#input-controls)
   - [Display Controls](#display-controls)
   - [Raptor DOM Controls (Web Components)](#raptor-dom-controls-web-components)
   - [Data Binding](#data-binding)
   - [Events](#events)
   - [Foreach and Iteration](#foreach-and-iteration)
4. [Nested Control Behavior](#nested-control-behavior)
   - [DataGrid Architecture](#datagrid-architecture)
   - [Height Handling in Flex Contexts](#height-handling-in-flex-contexts)
   - [The minHeight: 0 Rule](#the-minheight-0-rule)
   - [Column Width Calculation](#column-width-calculation)
   - [Working Patterns for Nested DataGrids](#working-patterns-for-nested-datagrids)
   - [Common Issues and Solutions](#common-issues-and-solutions)
5. [Charts in Flex Layouts](#charts-in-flex-layouts)
   - [RaptorChart Resize Behavior](#raptorchart-resize-behavior)
   - [Equal-Width Chart Cards (The flex-basis Problem)](#equal-width-chart-cards-the-flex-basis-problem)
   - [Why flexFill Doesn't Work for Equal Widths](#why-flexfill-doesnt-work-for-equal-widths)
   - [Working Pattern for Side-by-Side Charts](#working-pattern-for-side-by-side-charts)
   - [Chart Interactions](#chart-interactions)
6. [Layout Utilities](#layout-utilities)
7. [Available Raptor Controls](#available-raptor-controls)
   - [Map Chrome: prefer framework options over custom overlays](#map-chrome-prefer-framework-options-over-custom-overlays)
   - [Map Runtime API: Layer visibility and base layers](#map-runtime-api-layer-visibility-and-base-layers)
8. [v4 System (Legacy)](#v4-system-legacy)
9. [Extension Development Patterns](#extension-development-patterns)
   - [Dashboard Registration Patterns](#dashboard-registration-patterns)
   - [IRaptorModule Interface](#iraptormodule-interface)
   - [Navigation System](#navigation-system)
10. [Dialog Lifecycle](#dialog-lifecycle)
11. [Advanced Control Patterns](#advanced-control-patterns)
    - [QuickSelect Advanced Usage](#quickselect-advanced-usage)
    - [DataGrid Advanced Patterns](#datagrid-advanced-patterns)
    - [Tree Control](#tree-control)
    - [NavTabs with Content Panes](#navtabs-with-content-panes)
    - [Dropdown Control](#dropdown-control)
12. [DynamicViewModel and Data Sources](#dynamicviewmodel-and-data-sources)
13. [ml Global API Reference](#ml-global-api-reference)
14. [Best Practice Examples](#best-practice-examples)
15. [Quick Reference](#quick-reference)

---

## Overview

MapLarge has two UI systems:

| Aspect | V4 (Legacy) | V5/Raptor (Modern) |
|--------|-------------|-------------------|
| **Status** | Maintenance | Primary/Active |
| **Base Class** | `BaseControl<T>`, `BaseInputControl<T>` | `RaptorNode`, `RaptorNodeBase<T>` |
| **DOM Manipulation** | jQuery-based | Pure DOM APIs / Web Components |
| **Configuration** | `configSchema` static property | `@RegisterNode` decorator |
| **Reactivity** | `watchDefinitionOptions()` | `@BindingHandler` decorators |
| **View Definition** | Builder pattern | RSScriptor type-safe builder |

### When to Use Which

- **New Development**: Always use v5/Raptor
- **Maintenance**: Match existing code style (v4 or v5)
- **Extensions**: Use v5/Raptor with `RSScriptor` API

---

## Key File Locations

```
MapLarge.Server/src/
├── framework/
│   ├── raptor/                    # v5/Raptor system
│   │   ├── renderer/
│   │   │   ├── RSScriptor.ts      # Fluent API for building views
│   │   │   ├── ViewDefinitions.ts # Type definitions for view elements
│   │   │   ├── Bindings.ts        # Data binding definitions
│   │   │   └── Renderer.ts        # DOM rendering engine
│   │   └── raptorDom/
│   │       ├── controls/          # Web component controls
│   │       │   └── DataGrid/      # DataGrid implementation
│   │       └── viewModels/        # ViewModel base classes
│   ├── controls/                  # v4 controls
│   │   ├── input/                 # Input controls (Button, Textbox, etc.)
│   │   ├── layout/                # Layout controls (Tabs, Accordion, etc.)
│   │   └── display/               # Display controls (Label, Alert, etc.)
│   ├── BaseControl.ts            # v4 base class
│   └── BaseInputControl.ts       # v4 input base class
└── ui/
    └── core-ui/
        ├── Views/                 # Page views
        ├── Dialogs/               # Dialog views
        └── Layouts/               # Layout definitions
```

---

## v5/Raptor System (Primary)

### RSScriptor Fluent API

The `RSScriptor` is the primary way to build UI views in MapLarge. It provides a fluent, chainable API for constructing view definitions.

#### Basic Structure

```typescript
import { RSScriptor, ViewDefinitions } from "index";
import { MyViewModel } from "./viewModels/MyViewModel";

export function MyView(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<MyViewModel>();

    s.page("MyPage", "My Page Title", "LayoutName", "", false)
     .view("main", s =>
        s.container({ fluid: true })
         .contentTemplates(s =>
            s.row({})
             .contentTemplates(s =>
                s.column({ columnLg: 6 })
                 .contentTemplates(s =>
                    s.h1({ text: "Hello World" })
                 )
             )
         )
    );

    return s.commitPage();
}
```

#### Key Methods

| Method | Purpose |
|--------|---------|
| `RSScriptor.create<TViewModel>()` | Create new scriptor with typed ViewModel |
| `.page(modelKey, friendlyName, layoutModelKey?, headerModelKey?, fullScreen?)` | Define the page |
| `.view(name, buildFunc)` | Define a view within the page |
| `.commit()` | Return the view definition |
| `.commitPage()` | Return the full rendering definition |
| `.contentTemplates(buildFunc)` | Add child elements |
| `.put()` | Enter the last element to add children |
| `.up()` | Exit current element (pop the stack) |
| `.getTypedProp(propName)` | Get typed property reference for bindings |
| `.prefix(vmProperty)` | Access nested ViewModel properties |

### Views and Pages

#### Simple Page View

```typescript
export function AlertsView(): ViewDefinitions.IRenderingDefinition {
    const scriptor = RSScriptor.create();

    scriptor.page("Alerts", "Alerts", "HeaderWithMainContent", "", true)
        .view("main", s =>
            s.cssGrid({
                rows: ["1fr"],
                columns: ["1fr"],
                background: "light",
                padding: { left: 4, right: 4, top: 2, bottom: 2 },
            })
            .contentTemplates(s =>
                s.cssGridItem({ rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 2 })
                 .contentTemplates(s =>
                    s.element({
                        type: "WorkflowAlertList",
                        heightUtility: 100,
                        overflow: "hidden",
                        controlOptions: { showAddNew: true },
                    })
                 )
            )
        );

    return scriptor.commitPage();
}
```

#### Layout with Module Page Target

```typescript
export function LayoutView(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<LayoutViewModel>().page("Layout", "Layout");

    s.view("main", s => s
        .div({
            flex: { dFlex: true, flexColumn: true },
            minViewportHeight100: true,
        })
        .contentTemplates(s => s
            // Header
            .navbar({ customCssClasses: 'dashboard-header' })
            // ... header content

            // Main content area (where pages will be rendered)
            .div({
                flex: { dFlex: true, flexGrow: 1 },
                controlTargetKey: "modulePageContent"  // Target for page content
            })
        )
    );

    const renDef = s.commitPage();
    renDef.modulePageTarget = "modulePageContent";  // Specify the target
    return renDef;
}
```

### ViewModels

ViewModels extend `RaptorViewModel` and provide data and behavior for views.

#### Base ViewModel Class

```typescript
import { RaptorDom } from "raptor/raptorDom/RaptorDom";
import { RaptorEngine } from "raptor/RaptorEngine";
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export class MyViewModel extends RaptorViewModel {
    // Typed properties
    public title: string = "Default Title";
    public items: IMyItem[] = [];
    public isLoading: boolean = false;

    constructor(
        public raptorDom: RaptorDom,
        public raptorEngine: RaptorEngine
    ) {
        super(raptorDom, raptorEngine);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        this.isLoading = true;
        try {
            this.items = await this.fetchItems();
        } finally {
            this.isLoading = false;
        }
    }

    // Event handlers (referenced in view events)
    public onItemClick(item: IMyItem): void {
        console.log("Item clicked:", item);
    }

    // Navigation
    public navigateToDetails(item: IMyItem): void {
        this.raptorEngine.navigate({
            gotoModelKey: "ItemDetails",
            isActivePage: true,
            params: { itemId: item.id }
        });
    }
}
```

#### ViewModel Lifecycle

```typescript
export class MyViewModel extends RaptorViewModel {
    private abortController = new AbortController();

    constructor(raptorDom: RaptorDom, raptorEngine: RaptorEngine) {
        super(raptorDom, raptorEngine);
    }

    // Called when view is activated
    public override onActivate(): void {
        this.loadData();
    }

    // Called when view is deactivated
    public override onDeactivate(): void {
        this.abortController.abort();
    }

    // Called when view is destroyed
    public override onDestroy(): void {
        this.cleanup();
    }
}
```

#### ViewModel with Self-Reference

```typescript
// Common pattern for accessing ViewModel in foreach bindings
export class HomeViewModel extends RaptorViewModel {
    // Self-reference getter for RSScriptor prefix pattern
    public get ngaCodeVm(): HomeViewModel {
        return this;
    }

    public topHomeCards: IHomeCard[] = [];
    public bottomHomeCards: IHomeCard[] = [];
}
```

### Layout Elements

#### Container Elements

```typescript
// Bootstrap container
s.container({ fluid: true, padding: { around: 4 } })

// Bootstrap row
s.row({ margin: { bottom: 2 } })

// Bootstrap column (responsive)
s.column({
    columnXxl: 4, columnXl: 4, columnLg: 6,
    columnMd: 12, columnSm: 12, columnXs: 12
})

// CSS Grid
s.cssGrid({
    rows: ["auto", "1fr", "auto"],
    columns: ["200px", "1fr"],
    gap: 2
})

s.cssGridItem({
    rowStart: 1, rowEnd: 2,
    columnStart: 1, columnEnd: 3
})

// Flexbox div
s.div({
    flex: {
        dFlex: true,
        flexColumn: true,
        alignItemsCenter: true,
        justifyContentBetween: true,
        flexGrow: 1,
        flexWrap: true
    },
    gap: 3,
    minHeight: 0
})
```

#### Cards

```typescript
s.card({ customCssClasses: ['my-card'] })
 .contentTemplates(s => s
    .cardHeader({})
    .contentTemplates(s => s.h5({ text: "Card Title" }))

    .cardBody({ padding: { around: 3 } })
    .contentTemplates(s => s
        .p({ text: "Card content goes here" })
    )

    .cardFooter({})
    .contentTemplates(s => s
        .button({ text: "Action", kind: "primary" })
    )
 )
```

#### Navbars and Navigation

```typescript
s.navbar({ customCssClasses: 'dashboard-header navbar-dark' })
 .contentTemplates(s => s
    .anchor({
        navLink: true,
        href: 'javascript:void(0)',
        events: [{ event: 'pointerup', handler: 'navigateToHome' }]
    })
    .contentTemplates(s => s
        .svg({ key: 'mlsvg-home', width: 24, height: 24 })
    )
 )

// Nav tabs
s.navTabs({})
 .contentTemplates(s => s
    .navTabItem({ active: true })
    .contentTemplates(s => s
        .anchor({ navLink: true, text: "Tab 1" })
    )
    .navTabItem({})
    .contentTemplates(s => s
        .anchor({ navLink: true, text: "Tab 2" })
    )
 )
```

#### Sidebar Pattern

```typescript
s.sidebar({
    bindings: {
        css: {
            property: s.getTypedProp("sidebarCollapsed"),
            trueClasses: ['sidebar-collapsed'],
            falseClasses: ['sidebar-expanded'],
        },
    },
})
.contentTemplates(s => s
    // Collapse button
    .button({
        kind: "link",
        events: [{ event: "pointerdown", handler: s.getTypedProp("collapseSidebar") }]
    })
    .contentTemplates(s => s
        .svg({ key: "mlsvg-linemenu-filled", width: 16, height: 16 })
    )

    // Sidebar items
    .foreach(s.getTypedProp("sidebarItems"), s => s
        .button({
            kind: "link",
            bindings: {
                tooltip: s.getTypedProp("tooltip"),
                visible: s.getTypedProp("isVisible"),
            },
            events: [{ event: "pointerup", handler: "navigateFromSidebar" }]
        })
        .contentTemplates(s => s
            .svg({ bindings: { svgOptions: s.getTypedProp("svgOptions") } })
            .label({ bindings: { text: s.getTypedProp("text") } })
        )
    )
)
```

### Input Controls

#### Buttons

```typescript
// Simple button
s.button({
    text: "Click Me",
    kind: "primary",  // primary, secondary, success, danger, warning, info, light, dark, link
    size: "medium",   // small, medium, large
    events: [{ event: "click", handler: s.getTypedProp("onButtonClick") }]
})

// Button with icon
s.button({
    kind: "link",
    svgOptions: { key: "mlsvg-refresh", width: 16, height: 16 },
    tooltip: "Refresh",
    events: [{ event: "pointerdown", handler: s.getTypedProp("refreshData") }]
})

// Button group
s.buttonGroup({})
 .contentTemplates(s => s
    .button({ text: "Option 1" })
    .button({ text: "Option 2" })
    .button({ text: "Option 3" })
 )
```

#### Text Inputs

```typescript
// Basic input
s.input({
    inputType: "text",
    placeholder: "Enter value",
    bindings: { value: s.getTypedProp("inputValue") },
    events: [{ event: "change", handler: s.getTypedProp("onInputChange") }]
})

// Number input
s.input({
    inputType: "number",
    placeholder: "0",
    bindings: { value: s.getTypedProp("numericValue").toString() }
})

// Text area
s.textArea({
    rows: 5,
    placeholder: "Enter description...",
    bindings: { value: s.getTypedProp("description") }
})
```

#### Selection Controls

```typescript
// Checkbox
s.checkbox({
    value: true,
    inline: false,
    id: "myCheckbox",
    bindings: { checked: s.getTypedProp("isEnabled") }
})

// With label
s.div({ flex: { dFlex: true, alignItemsCenter: true } })
 .contentTemplates(s => s
    .label({ for: "myCheckbox", text: "Enable feature?" })
    .checkbox({
        id: "myCheckbox",
        bindings: { checked: s.getTypedProp("isEnabled") }
    })
 )

// Switch
s.switch({
    bindings: { checked: s.getTypedProp("toggleValue") }
})

// Select dropdown (Raptor)
s.quickSelect({
    label: { text: "Select option:" },
    labelProperty: "label",
    valueProperty: "value",
    bindings: {
        items: s.getTypedProp("selectOptions"),
        value: s.getTypedProp("selectedValue")
    }
})
```

#### Date/Time Controls

```typescript
// DateTime picker (Raptor control)
s.dateTime({
    bindings: {
        value: s.getTypedProp("selectedDate"),
        timeZone: s.getTypedProp("userTimeZone")
    }
})

// Date filter
s.dateFilter({
    bindings: {
        startDate: s.getTypedProp("startDate"),
        endDate: s.getTypedProp("endDate")
    }
})
```

#### Slider

```typescript
s.slider({
    min: 0,
    max: 100,
    step: 1,
    showTextInputs: true,
    showFill: true,
    showTooltips: true,
    bindings: {
        value: s.getTypedProp("sliderValue")
    }
})

// Range slider
s.slider({
    min: 0,
    max: 100,
    rangeMode: true,
    bindings: {
        value: s.getTypedProp("rangeValue")  // { min: number, max: number }
    }
})
```

### Display Controls

#### Text Elements

```typescript
// Headings
s.h1({ text: "Main Title" })
s.h2({ text: "Section Title" })
s.h3({ text: "Subsection Title" })
s.heading({ size: 4, text: "Custom Heading" })

// Paragraph
s.p({ text: "Paragraph content here." })

// Spans and inline
s.span({ text: "Inline text" })
s.strong({ text: "Bold text" })
s.mark({ text: "Highlighted text" })

// Labels
s.label({ text: "Field label:", for: "inputId" })

// With bindings
s.span({
    bindings: { text: s.getTypedProp("dynamicText") }
})
```

#### Images and SVGs

```typescript
// Image
s.image({
    src: "/path/to/image.png",
    height: 200
})

// Image with binding
s.image({
    bindings: {
        attr: { src: 'imageUrl' }
    },
    height: 150
})

// SVG icon
s.svg({
    key: "mlsvg-check",
    width: 24,
    height: 24,
    cssClass: "ml-icon-success"
})

// SVG with binding
s.svg({
    bindings: {
        svgOptions: s.getTypedProp("iconOptions")  // { key, width, height }
    }
})
```

#### Dialogs/Modals

```typescript
s.dialog({
    viewName: "myDialog",
    staticBackdrop: true,
    centered: true,
    size: "lg",  // sm, md, lg, xl
})
.contentTemplates(s => s
    .dialogHeader({ showCloseButton: true })
    .contentTemplates(s => s
        .h5({ text: "Dialog Title" })
    )

    .dialogBody({ padding: { around: 3 } })
    .contentTemplates(s => s
        .p({ text: "Dialog content..." })
    )

    .dialogFooter({})
    .contentTemplates(s => s
        .button({
            text: "Cancel",
            kind: "secondary",
            events: [{ event: "click", handler: s.getTypedProp("closeDialog") }]
        })
        .button({
            text: "Confirm",
            kind: "primary",
            events: [{ event: "click", handler: s.getTypedProp("confirmAction") }]
        })
    )
)
```

#### Charts (Raptor Charts / ECharts)

```typescript
s.chart({
    viewName: "myChart",
    height: 300,
    disableMenu: true,
    options: {
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0 },
        grid: {
            left: '3%', right: '4%',
            bottom: '15%', top: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: s.getTypedProp("xAxisData") as any
        },
        yAxis: { type: 'value' },
        series: s.getTypedProp("chartSeries") as any
    },
    bindings: { traverseRaptorChart: true }
})
```

### Raptor DOM Controls (Web Components)

These are v5-specific controls implemented as web components.

| Control | Element | Purpose |
|---------|---------|---------|
| `DateTime` | `<ml-datetime>` | Date/time picker |
| `Slider` | `<ml-slider>` | Slider/range input |
| `QuickSelect` | `<ml-quick-select>` | Dropdown selection |
| `ColumnPicker` | `<ml-column-picker>` | Table column selection |
| `TablePicker` | `<ml-table-picker>` | Table selection |
| `TopValues` | `<ml-top-values>` | Top N value display |
| `TimeSlider` | `<ml-time-slider>` | Time range slider |
| `DateFilter` | `<ml-date-filter>` | Date range filter |
| `Chart` | `<ml-chart>` | ECharts wrapper |
| `DataGrid` | `<ml-data-grid>` | Data grid display |

Location: `MapLarge.Server/src/framework/raptor/raptorDom/controls/`

### Data Binding

#### Bindings Interface

```typescript
interface IRaptorAllBindings {
    // Text content
    text?: string;                    // Bind to text content
    html?: string;                    // Bind to innerHTML (use carefully)

    // Visibility & Display
    visible?: string | boolean;       // Show/hide element
    hidden?: string | boolean;        // Inverse of visible
    enable?: string | boolean;        // Enable/disable control
    disable?: string | boolean;       // Inverse of enable

    // Attributes
    attr?: {
        [key: string]: string;        // Bind to any HTML attribute
        src?: string;                 // Image source
        href?: string;                // Link href
        title?: string;               // Title attribute
    };

    // CSS Classes
    css?: {
        property: string;             // Property to watch
        trueClasses: string[];        // Classes when true
        falseClasses: string[];       // Classes when false
    };

    // Style
    style?: {
        [property: string]: string;   // Inline style bindings
    };

    // Value (for input controls)
    value?: string;                   // Two-way value binding
    checked?: string;                 // Checkbox/radio checked state
    selectedValue?: string;           // Select value
}
```

#### Common Binding Examples

```typescript
// Text binding
bindings: { text: s.getTypedProp("displayText") }
bindings: { text: "propertyName" }  // String form

// Visibility
bindings: { visible: s.getTypedProp("isVisible") }

// CSS classes
bindings: {
    css: {
        property: s.getTypedProp("isActive"),
        trueClasses: ['active-class'],
        falseClasses: ['inactive-class']
    }
}

// Attributes
bindings: {
    attr: {
        src: 'imageUrl',
        title: 'tooltipText',
        disabled: 'isDisabled'
    }
}

// Value (for inputs)
bindings: { value: s.getTypedProp("inputValue") }

// Checked (for checkboxes)
bindings: { checked: s.getTypedProp("isChecked") }

// Enable/Disable
bindings: { enable: s.getTypedProp("isEnabled") }
```

#### Prefix for Nested ViewModels

```typescript
// Access properties on a nested view model
bindings: {
    text: s.prefix("childViewModel").getTypedProp("propertyName")
}

// Multiple levels
bindings: {
    items: s.prefix("parentVm").prefix("childVm").getTypedProp("items")
}
```

### Events

#### Event Definition

```typescript
interface IEvent {
    event: string;                    // DOM event name
    handler: string | Function;       // Handler name or function
    debounce?: number;                // Debounce delay in ms
    throttle?: number;                // Throttle delay in ms
}
```

#### Common Events

```typescript
// Click event
.button({
    text: "Submit",
    events: [{
        event: "click",
        handler: "onSubmitClick"
    }]
})

// Pointer events (preferred over click for touch support)
.card({
    events: [{
        event: "pointerup",
        handler: "onCardSelect"
    }]
})

// Input events
.textInput({
    events: [
        { event: "input", handler: "onTextChange" },
        { event: "blur", handler: "onTextBlur" },
        { event: "focus", handler: "onTextFocus" }
    ]
})

// Keyboard events
.textInput({
    events: [{
        event: "keydown",
        handler: "onKeyDown"
    }]
})

// With debounce (for search inputs)
.textInput({
    events: [{
        event: "input",
        handler: "onSearchInput",
        debounce: 300
    }]
})
```

#### Handler Implementation

```typescript
export class MyViewModel extends RaptorViewModel {
    // Simple handler
    public onSubmitClick(): void {
        this.submitForm();
    }

    // Handler with event data
    public onCardSelect(card: ICard): void {
        this.selectedCard = card;
    }

    // Handler with DOM event
    public onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.search();
        }
    }
}
```

### Foreach and Iteration

```typescript
// Basic foreach
s.foreach(s.getTypedProp("items"), s => s
    .div({})
    .contentTemplates(s => s
        .span({ bindings: { text: "name" } })
    )
)

// Foreach with complex item template
s.foreach(s.getTypedProp("cardItems"), s => s
    .card({ cursor: 'pointer' })
    .contentTemplates(s => s
        .cardBody({})
        .contentTemplates(s => s
            .image({ bindings: { attr: { src: 'imageUrl' } } })
            .h5({ bindings: { text: 'title' } })
            .p({ bindings: { text: 'description' } })
        )
    )
)

// With event handler (handler receives item context)
s.foreach(s.getTypedProp("menuItems"), s => s
    .button({
        bindings: { text: s.getTypedProp("label") },
        events: [{ event: "click", handler: "onItemClick" }]
    })
)

// Using prefix for nested ViewModel properties
s.foreach(s.prefix('ngaCodeVm').getTypedProp('topHomeCards'), s => s
    .card({
        bindings: {
            text: 'name',
            attr: { src: 'imageUrl' }
        }
    })
)

// Advanced foreach with binding options
s.div({
    bindings: {
        foreach: {
            property: s.getTypedProp("largeList"),
            mode: "VirtualItems",        // Rendering strategy (see below)
            pageSize: 50,                // Items per page for infinite scroll
            dragAndDrop: true,           // Enable drag-and-drop reordering
            dragHandleCssClass: "drag-handle",
            dragItemCssClass: "drag-item",
            dragAndDropHandler: "onReorder"  // ViewModel method
        }
    }
}).contentTemplates(s => s
    .div({ flex: { dFlex: true } }).contentTemplates(s => s
        .span({ customCssClasses: ['drag-handle'], text: "☰" })
        .span({ bindings: { text: "name" } })
    )
)

// ViewModel
public onReorder(event: { fromIndex: number, toIndex: number }): void {
    const item = this._largeList.splice(event.fromIndex, 1)[0];
    this._largeList.splice(event.toIndex, 0, item);
    this.update();
}
```

#### Foreach Rendering Modes

| Mode | Behavior | Use When |
|------|----------|----------|
| `Auto` | Framework chooses best strategy | Default — works for most cases |
| `RenderAll` | Renders all items immediately | Small lists (<100 items) |
| `InfiniteScroll` | Loads items as user scrolls down | Large lists, vertical scroll |
| `InfiniteHorizontalScroll` | Loads items as user scrolls right | Horizontal carousels |
| `VirtualItems` | Only renders visible items | Very large lists (1000+) |

#### pushDataContext for Nested Objects

```typescript
// Access nested properties without repeated prefixing
s.foreach(s.getTypedProp('items'), s => s
    .tr().contentTemplates(s => s
        .td({ bindings: { text: s.getTypedProp('name') } })
        // Push into nested 'location' object for remaining cells
        .pushDataContext(s.getTypedProp('location'), s => s
            .td({ bindings: { text: 'city' } })     // location.city
            .td({ bindings: { text: 'state' } })    // location.state
            .td({ bindings: { text: 'zip' } })      // location.zip
        )
    )
)
```

---

## Nested Control Behavior

This section covers how controls behave when nested inside flex containers, cards, accordions, tabs, and other layout elements. Understanding these patterns is critical for avoiding layout and resizing issues.

### DataGrid Architecture

**Location:** `MapLarge.Server/src/framework/raptor/raptorDom/controls/DataGrid/DataGrid.ts`

DataGrid uses a **flex column + CSS grid hybrid layout**:

```
.ml-raptor-datagrid (display:flex; flex-direction:column)
├── .ml-datagrid-container (grid layout, flex-grow:1, flex-shrink:1)
│   ├── .ml-datagrid-content (overflow:auto, height:100%)  ← scrollable data
│   ├── .ml-datagrid-top (header table)
│   ├── .ml-datagrid-left (pinned columns)
│   └── .ml-datagrid-topleft (pinned headers)
└── .ml-datagrid-footer
```

**Key Components:**
- `mainTable` - Primary data area (scrollable)
- `headerTable` - Column headers (separate, synchronized)
- `leftTable` - Pinned columns (optional)
- `topleftTable` - Pinned column headers (optional)

**CSS Structure (from Renderer.ts):**
```css
.ml-raptor-datagrid {
    position: relative;
    display: flex;
    flex-direction: column;
}

.ml-datagrid-container {
    overflow: hidden;
    flex-grow: 1;
    flex-shrink: 1;
}

.ml-datagrid-content {
    overflow: auto;
    height: 100%;  /* CRITICAL: Only works when parent has defined height */
}
```

### Height Handling in Flex Contexts

#### Why Nested DataGrids Fail

The inner `.ml-datagrid-content` uses `height: 100%`, which **only works when the parent has a defined height**.

| Symptom | Root Cause |
|---------|------------|
| DataGrid collapses to 0 height | Parent flex container has no height constraint |
| Content overflows instead of scrolling | `height: 100%` has no reference point |
| Column widths calculated wrong | Height not applied → viewport width unknown |
| Scrollbars misaligned with headers | ResizeObserver can't calculate without dimensions |

#### ResizeObserver Pattern

DataGrid uses **two ResizeObserver instances**:

1. **Row Height Sync** - Observes rows for pinned column height synchronization
2. **Viewport Resize** - Observes `.ml-datagrid-content` for column recalculation

```typescript
// Viewport resize triggers column recalc if ANY column lacks explicit px width
if (dataModel.fields.some(p => !p.width?.includes("px") &&
                                 !columnSizes[p.name]?.setByUser)) {
    this.resetColumnWidthsOnResize();  // Debounced 500ms
}
```

#### Height Properties Available

```typescript
interface IViewDefinition {
    heightUtility?: number;      // Bootstrap class: h-25, h-50, h-75, h-100
    heightVH?: number;           // Viewport height: 25vh, 50vh, etc.
    height?: number;             // Pixels (with !important)
    heightPercentage?: number;   // Percent of parent
    maxHeight?: number;          // Max height in pixels
    minHeight?: number;          // Min height in pixels
}
```

### The minHeight: 0 Rule

**Why it matters:**
- Default `min-height` in flex is `auto` (content size)
- Flex children can't shrink below content size with `auto`
- Setting `minHeight: 0` allows shrinking → enables scrolling

**Where to apply:**
```typescript
// Every flex container in the ancestor chain needs this
s.div({
    flex: { dFlex: true, flexColumn: true, flexFill: true },
    minHeight: 0  // ← Required on each flex level
})
```

**Accordion items get this automatically** (from Renderer.ts line 7721):
```typescript
style: { minHeight: "0" }
```

### Column Width Calculation

**Supported Width Formats (processed in order):**

1. **Fixed Pixels:** `"100px"` - Applied directly
2. **Percentage:** `"25%"` - Calculated from viewport width
3. **Fractional Units:** `"1fr"`, `"2fr"` - Divides remaining space

**Calculation Flow:**

```typescript
// Step 1: Set fixed widths from definition
// - px widths applied directly
// - % widths calculated from viewport width

// Step 2: Calculate unpinned field widths from header cells
// Clamp to 250px max unless fullWidth behavior enabled
width = clamp(thWidth, minWidth, 250)  // 250px DEFAULT CAP

// Step 3: Distribute fractional (fr) units
// Remaining space / total fr count
const remainingWidth = viewportWidth - usedWidth
const frCount = sum(frFields.map(f => parseFloat(f.width)))
```

**Column Width Persistence:**
- `columnSizes[fieldName].setByUser: boolean` tracks manual resizes
- User-resized columns NOT recalculated on viewport resize

### Working Patterns for Nested DataGrids

#### Pattern 1: Fixed Height (Most Reliable)

```typescript
s.card({})
.contentTemplates(s => s
    .cardBody({})
    .contentTemplates(s => s
        .dataGrid({
            height: 600,           // Explicit pixel height
            widthPercentage: 100,
            bindings: { data: s.getTypedProp("gridData") }
        })
    )
)
```

#### Pattern 2: Fill Flex Container

```typescript
s.div({
    flex: { dFlex: true, flexColumn: true, flexFill: true },
    minHeight: 0,        // Critical for shrinking below content
    overflow: 'hidden'   // Prevents bleed-through
})
.contentTemplates(s => s
    // Header (auto height)
    .div({ padding: { y: 2 } })
    .contentTemplates(s => s.h3({ text: "Data Grid" }))

    // DataGrid fills remaining space
    .div({
        flex: { flexGrow: 1, flexShrink: 1 },
        minHeight: 0,    // Required for flex child scrolling
        overflow: 'hidden'
    })
    .contentTemplates(s => s
        .dataGrid({
            heightUtility: 100,  // h-100 class
            widthPercentage: 100,
            bindings: { data: s.getTypedProp("gridData") }
        })
    )
)
```

#### Pattern 3: In Accordion

```typescript
// Accordion items get minHeight: 0 automatically
s.accordionItemBody({})
.contentTemplates(s => s
    .dataGrid({
        height: 400,     // Still need explicit height inside accordion
        widthPercentage: 100,
        bindings: { data: s.getTypedProp("gridData") }
    })
)
```

#### Pattern 4: In Tab Pane (Real Example)

```typescript
// From QueryManagementDashboard.ts
s.navTabPane({ widthPercentage: 100 })
.contentTemplates(s => s
    s.row({})
    .contentTemplates(s => s
        s.column({ widthPercentage: 100 })
        .contentTemplates(s => s
            s.dataGrid({
                viewName: "runningGridView",
                widthPercentage: 100,
                height: 800,         // Fixed height
                striped: true,
                bordered: true,
                bindings: { data: "runningDG" }
            })
        )
    )
)
```

#### Pattern 5: DataGrid in Dialog

```typescript
s.dialogBody({ padding: { around: 3 } })
.contentTemplates(s => s
    .dataGrid({
        widthPercentage: 100,
        height: 300,      // Fixed height for dialogs
        striped: true,
        bordered: true,
        bindings: { data: s.getTypedProp("dialogData") }
    })
)
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| DataGrid height 0 in flex | Parent has no height | Add `height: Xpx` to DataGrid OR ensure parent has `flex: { flexGrow: 1 }` with constrained ancestor |
| Content overflows | Missing `minHeight: 0` on flex parent | Add `minHeight: 0` to all flex ancestors |
| Columns calculate wrong | Grid renders before height applied | Use explicit `height` instead of `heightUtility` |
| Horizontal scroll cuts pinned | Known browser behavior | DataGrid auto-adds `marginLeft/Right: 1px` |
| Scrollbars misaligned | Pinned area not compensating | Ensure ResizeObserver can observe (has dimensions) |
| Width % fails in nested flex | Parent has no explicit width | Use `widthPercentage: 100` with row/column structure |

### Checklist for Nested DataGrids

1. **Explicit height** on DataGrid (`height: 600` or `heightVH: 50`)
2. **`minHeight: 0`** on all flex ancestors
3. **`overflow: 'hidden'`** on immediate parent (prevents bleed)
4. **`widthPercentage: 100`** for full-width (not just `widthUtility`)
5. **Avoid `heightUtility: 100`** unless parent has explicit height
6. **Column widths in px** for predictable sizing, or let auto-calc work

---

## Charts in Flex Layouts

This section covers RaptorChart (ECharts wrapper) behavior in flex containers. Key insight: **RaptorChart handles its own resizing** - no custom JavaScript is needed, but correct flex CSS is critical.

### RaptorChart Resize Behavior

**Location:** `MapLarge.Server/src/framework/raptor/raptorDom/controls/Chart/RaptorChart.ts`

RaptorChart uses a built-in resize mechanism:
- Uses `dom.onResize` callback to detect container size changes
- Calls `chart.resize()` on the ECharts instance when container resizes
- **No custom ResizeObserver or setTimeout hacks are needed**

```typescript
// RaptorChart.ts - Built-in resize handling (simplified)
this.dom.onResize = () => {
    if (this.chart) {
        this.chart.resize();
    }
};
```

**Known behavior:**
- Charts respond quickly when container **grows**
- Slight lag when container **shrinks** (inherent ECharts canvas resize timing)
- This is acceptable and not a bug to fix

### Equal-Width Chart Cards (The flex-basis Problem)

**Problem:** Two cards with charts side by side have unequal widths.

**Root Cause:** The `flex-basis` property determines the starting size before flex-grow/shrink.

| flex-basis value | Behavior |
|------------------|----------|
| `auto` (default) | Each item starts from its **content size** (unequal) |
| `0` | Each item starts from **zero** (equal widths with flex-grow) |

**The Framework Gap:**

The `IFlexBehavior` interface (`FlexUtilities.ts`) provides:
- ✅ `flexGrow: 0 | 1`
- ✅ `flexShrink: 0 | 1`
- ❌ `flexBasis` - **NOT available**

This means you cannot set `flex-basis: 0` through the standard flex options.

### Why flexFill Doesn't Work for Equal Widths

You might think `flexFill: true` would solve this, but it doesn't:

```typescript
// From FlexUtilities.ts line 314
// flexFill adds the Bootstrap .flex-fill class, which sets:
// flex: 1 1 auto !important
//           ^^^^
// This "auto" is the problem - it uses content size as basis
```

**Result:** Cards with different content sizes get different widths, even with `flexFill`.

### Working Pattern for Side-by-Side Charts

**Solution:** Use a custom CSS class to set `flex-basis: 0`.

**Step 1: Add CSS utility class** (e.g., in `style.less`):

```less
// Utility class for equal-width flex items (framework lacks flexBasis option)
.flex-basis-0 {
    flex-basis: 0 !important;
}
```

**Step 2: Apply to chart cards:**

```typescript
// In your View file
s.div({
    flex: { dFlex: true },
    gap: 3,
    padding: { around: 3 }
})
.contentTemplates(s => s
    // Bar chart card
    .card({
        flex: { flexGrow: 1, flexShrink: 1 },  // NOT flexFill
        shadow: 'small',
        minWidth: 0,
        overflow: "hidden",
        customCssClasses: "flex-basis-0"       // The critical fix
    })
    .contentTemplates(s => s
        .cardBody({ padding: { around: 3 } })
        .contentTemplates(s => s
            .h6({ text: "Bar Chart Title" })
            .chart({
                viewName: "barChart",
                height: 300,
                bindings: { traverseRaptorChart: true },
                options: { /* ECharts options */ }
            })
        )
    )

    // Pie chart card
    .card({
        flex: { flexGrow: 1, flexShrink: 1 },  // NOT flexFill
        shadow: 'small',
        minWidth: 0,
        overflow: "hidden",
        customCssClasses: "flex-basis-0"       // Same class
    })
    .contentTemplates(s => s
        .cardBody({ padding: { around: 3 } })
        .contentTemplates(s => s
            .h6({ text: "Pie Chart Title" })
            .chart({
                viewName: "pieChart",
                height: 300,
                bindings: { traverseRaptorChart: true },
                options: { /* ECharts options */ }
            })
        )
    )
)
```

**Key points:**
- Use `flex: { flexGrow: 1, flexShrink: 1 }` - NOT `flexFill: true`
- Add `customCssClasses: "flex-basis-0"` to each card
- Add `minWidth: 0` to allow shrinking below content size
- Add `overflow: "hidden"` to prevent chart bleed
- **No JavaScript resize code needed** - RaptorChart handles it

### What NOT to Do

| Anti-pattern | Why it fails |
|--------------|--------------|
| `setTimeout(() => chart.resize(), 1500)` | Unnecessary hack - charts resize automatically |
| `ResizeObserver` in ViewModel | Duplicates built-in functionality |
| `requestAnimationFrame` for resize | Not needed - `dom.onResize` handles timing |
| `flexFill: true` for equal widths | Sets `flex-basis: auto`, causing unequal widths |
| CSS Grid with `1fr 1fr` columns | Works but more complex; flex + flex-basis-0 is simpler |

### Checklist for Charts in Flex Layouts

1. **Use `flex: { flexGrow: 1, flexShrink: 1 }`** on chart containers
2. **Add `customCssClasses: "flex-basis-0"`** for equal-width items
3. **Add `minWidth: 0`** to allow shrinking
4. **Add `overflow: "hidden"`** to contain chart canvas
5. **Set explicit `height`** on the chart control (e.g., `height: 300`)
6. **Do NOT add custom resize JavaScript** - RaptorChart handles it
7. **Do NOT use `flexFill: true`** for equal widths (uses `auto` basis)

### Chart Interactions

Programmatic chart access for click handlers, zoom control, and dynamic data updates. Separate from the resize behavior above — this is about interacting with chart *content*, not chart *sizing*.

#### Getting the ECharts Instance

Access the underlying ECharts instance via `raptorDom.node()`:

```typescript
// In ViewModel - get chart instance by viewName
private get myChart(): any {
    return this.raptorDom?.node("myChartViewName") as any;
}

private get chartInstance(): any {
    return this.myChart?._chartInstance;
}
```

#### Click Handlers on Chart Elements

```typescript
// In ViewModel initialize()
public async initialize(): Promise<void> {
    // Wait for chart to render, then attach click handler
    setTimeout(() => {
        const inst = this.chartInstance;
        if (inst) {
            inst.on("click", (e: any) => {
                console.log("Clicked:", e.name, e.value, e.dataIndex);
                // e.name = category label, e.value = data value, e.dataIndex = index
                this.onChartItemClicked(e);
            });
        }
    }, 300);
}
```

#### Data Zoom Interaction

```typescript
// In View - enable data zoom
s.chart({
    viewName: "zoomChart",
    height: 400,
    options: {
        xAxis: { type: "category", data: s.getTypedProp("xLabels") as any },
        yAxis: { type: "value" },
        dataZoom: [{ type: "inside" }],  // Enable scroll-to-zoom
        series: [{ data: s.getTypedProp("chartData") as any, type: "bar" }]
    },
    bindings: { traverseRaptorChart: true }
})

// In ViewModel - programmatic zoom on click
public onChartItemClicked(e: any): void {
    const zoomSize = 4;
    this.chartInstance.dispatchAction({
        type: "dataZoom",
        startValue: this._xLabels[Math.max(e.dataIndex - zoomSize / 2, 0)],
        endValue: this._xLabels[Math.min(e.dataIndex + zoomSize / 2, this._xLabels.length - 1)]
    });
}
```

#### ECharts Gradient Colors

```typescript
// Use ml.echarts.graphic.LinearGradient for gradient fills
series: [{
    data: s.getTypedProp("data") as any,
    type: "bar",
    itemStyle: {
        color: new ml.echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#83bff6" },
            { offset: 0.5, color: "#188df0" },
            { offset: 1, color: "#188df0" }
        ])
    }
}]
```

#### Chart Data Source Binding Types

The `chartDataSet.source` property determines how data is interpreted:

| Source Type | Description | Data Shape |
|-------------|-------------|------------|
| `ColumnBasedDictionary` | Dict of column arrays | `{ "col1": [v1, v2], "col2": [v1, v2] }` |
| `2DArray` | 2D array with header row | `[["x","y"], [1,2], [3,4]]` |
| `RowBasedKeyValueObjectArray` | Array of objects | `[{ x: 1, y: 2 }, { x: 3, y: 4 }]` |
| `DataSource` | MapLarge data source | Use `dataSource: "DATASOURCE"` for first available |
| `SingleValue` | Single numeric value | For gauges |
| `ValueArray` | Simple array | `[10, 20, 30]` |

```typescript
// Bind chart to a data source
s.chart({
    height: 400,
    options: { xAxis: { type: "category" }, yAxis: { type: "value" }, series: [{ type: "bar" }] },
    bindings: {
        chartDataSet: { source: "ColumnBasedDictionary" },
        data: s.getTypedProp("chartData")
    }
})
```

### Async Chart Data

Two patterns work, in order of preference:

#### Preferred: Framework binding via `chartDataSet.source`

Bind the chart to a transform output. The framework handles async data updates automatically — no manual `setOption()` needed.

```typescript
// In ViewModel
import { CalcGroupMetric } from "transforms/query/CalcGroupMetric";

this.registerTransforms([
    new CalcGroupMetric(this, "myChartData", {
        dataSource: "my_data_source",
        groupColumn: "category",
        aggregateColumn: "id",
        aggregate: "Count",       // CAPITALIZED — "count" fails strict schema
    }),
]);
```

```typescript
// In View
s.chart({
    options: {
        xAxis: { type: "category" },
        yAxis: { type: "value" },
        series: [{ type: "bar" }],
    },
    bindings: <any>{
        chartDataSet: { source: "ColumnBasedDictionary" },
        data: s.getTypedProp("myChartData"),
    },
});
```

Working production example: `MapLarge.Server/docs/extensions/ml-docs-dev/client/code-examples/charts/basicLine/example1/`.

> **GOTCHAS (verified 2026-04-17):**
> - `CalcGroupMetric` constructor is `(vm, name, options, startDisabled?)` — vm comes FIRST, not an id. Confused with `BaseTransform` which is `(id, definition, sourceScope, destScope)`.
> - `aggregate` must be `"Count" | "CountDistinct" | "Avg" | "Sum" | "Min" | "Max"` — lowercase is rejected by the Zod strict schema.
> - Missing a `groupby` column on the data source is fine if you use a computed bucket via `sqlselect`, e.g., `sqlselect: ["*", "FLOOR(x/10)*10 AS bucket"]`, then group by `bucket`. But `FLOOR(confidence*10)/10` is integer division in MapLarge's SQL dialect — use `FLOOR(confidence*10)/10.0` to force float division.

#### Fallback: Manual setOption when data can't be a transform

If the chart needs data shapes the standard transforms can't produce (e.g., custom JS aggregation, multiple series from heterogeneous sources), fall back to manually calling `setOption` after `onDataSourceChanged`:

> **⚠️ COMMON MISTAKE**: `traverseRaptorChart: true` resolves ViewModel getter references **once at initial render**. If chart data arrives asynchronously (e.g., from `onDataSourceChanged`), the chart will render empty and never update. You MUST manually call `setOption()` — see below.

**Solution:** Manually call `setOption` on the ECharts instance after data arrives:

```typescript
private updateChart() {
    const applyOptions = () => {
        const chartNode = this.raptorDom?.node("MyChartViewName") as any;
        const inst = chartNode?._chartInstance;
        if (inst) {
            inst.setOption({
                xAxis: { data: this._xAxisData },
                series: this._series
            }, false);
            inst.resize();
            return true;
        }
        return false;
    };

    // Retry — chart container may not be visible yet (e.g., behind a visibility binding)
    setTimeout(() => {
        if (!applyOptions()) {
            setTimeout(() => applyOptions(), 500);
        }
    }, 300);
}
```

**Note:** This is separate from the resize behavior. The built-in `dom.onResize` handles container size changes — this pattern handles the case where chart *data* arrives after the chart is created.

---

## DynamicViewModel and Data Sources

`DynamicViewModel` extends `RaptorViewModel` with data source management for dashboards that load data from MapLarge tables.

### Registering Data Sources

```typescript
export class MyViewModel extends DynamicViewModel {
    public async initialize() {
        this.initializeDataSources([{
            name: "my_data",
            dataSource: {
                table: "account/tableName",
                sqlselect: ["col1", "col2", "col3"],
                withgeo: false,
                take: 500
            }
        }]);

        // ⚠️ onDataSourceChanged is inherited at runtime but NOT in the .d.ts — cast required
        (this as any).onDataSourceChanged("my_data", (ds: any) => {
            this.onDataLoaded(ds);
        });
    }
}
```

### Querying Data from a Data Source

The `ds` parameter in the callback is a **metadata descriptor** (`ml.data.IDataSource`), not a data container. Query it for actual row data:

```typescript
private onDataLoaded(ds: any) {
    const query = ml.query();
    query.from(ds);
    query.select("col1");
    query.select("col2");
    query.take(500);

    query.runAsync().then((resp: any) => {
        // Data is columnar: resp.data.data["col1"] = [val1, val2, ...]
        const data = resp?.data?.data;
        const col1Values = data["col1"] || [];
        const col2Values = data["col2"] || [];
        const rowCount = col1Values.length;

        // Process data...
        this.update();
    });
}
```

### DataGridViewModel.fromDataSource

Bind a DataGrid to a registered data source with optional custom row ViewModel:

```typescript
this._dataGridData = DataGridViewModel.fromDataSource(this, "my_data", {
    viewModelFactory: (context: DataGridViewModel, data: any) => {
        return new MyCustomRowViewModel(context, data);
    }
});
```

The custom row VM extends `BasicDataGridRowViewModel`.

### Table and Column Discovery APIs

```typescript
// List all tables (returns jQuery Promise)
const tables: ml.servercache.StoredTable[] = await new Promise(resolve => {
    (ml.servercache as any).FetchStoredTablesPromise(true, false, false, false).done(resolve);
});

// Get single table metadata
const storedTable = await ml.servercache.fetchStoredTableAsync("account/tableName", true);
const colNames = storedTable.columns.names.split(",");  // "col1,col2,col3"
const colTypes = storedTable.columns.types.split(",");  // "String,Double,Int32"
```

**Column type names** are .NET PascalCase: `String`, `Int32`, `Int64`, `Double`, `Float`, `DateTime`, `Guid`, `XY`. Always compare lowercase:

```typescript
const isNumeric = ["int", "int32", "int64", "long", "float", "double", "decimal"]
    .includes(colTypes[i]?.toLowerCase());
```

### Data Transforms

Use `registerTransforms()` to compute derived data from data sources:

```typescript
import { CalcGroupMetric } from "index";

public async initialize(): Promise<void> {
    this.initializeDataSources([{
        name: "Busstops",
        dataSource: { table: "ml_samples/Miami_Busstops" }
    }]);

    this.registerTransforms([
        new CalcGroupMetric(this, "chartData", {
            dataSource: "Busstops",
            groupColumn: "MUNIC_NAME",       // Group by this column
            aggregateColumn: "MUNIC_NAME",   // Aggregate this column
            aggregate: "count"               // count, sum, avg, min, max
        })
    ]);
}
```

### Filter Management

```typescript
// Set a filter on a data source
await this.setFilter("my_data", {
    name: "statusFilter",
    filter: [[ { col: "status", test: "Equal", value: "Active" } ]]
});

// Remove a filter
await this.removeFilter("my_data", "statusFilter");

// Get filter count
const count = this.getFilterCount("my_data");

// Access the data source directly
const ds = this.getDataSource("my_data");
const dsAsync = await this.getDataSourceAsync("my_data");
```

### Dynamic Properties

Register ViewModel properties at runtime (useful for editor-generated dashboards):

```typescript
this.registerProperties([
    // Value property — creates get/set with backing field
    { type: "value", name: "filterText", defaultValue: "" },
    { type: "value", name: "isExpanded", defaultValue: true },

    // Derived property — computed from data source
    {
        type: "derived",
        name: "hasData",
        sourceProperty: "items",
        operation: "isNotEmpty"
        // Operations: "identity", "negate", "isEmpty", "isNotEmpty", "isMatch", "isNotMatch", "split"
    }
]);
```

### Map Operations (DynamicViewModel)

```typescript
// Get all map controls in the view
const maps = this.getMaps();          // RaptorMap[]

// Get the primary (first) map
const primaryMap = this.getPrimaryMap();   // RaptorMap

// Get map layer configurations
const layers = this.getMapLayers();  // IMlUiLayerOptionsInterface[]
```

---

## ml Global API Reference

The `ml` global namespace provides core APIs used throughout Raptor ViewModels.

### ml.query() — Query Builder

```typescript
const query = ml.query();
query.from(dataSource);              // ml.data.IDataSource or table string
query.select("col1");               // Add column
query.select("col2");
query.where("status", "Equal", "Active");
query.orderby("col1", "asc");
query.take(500);                     // Limit results
query.start(0);                      // Offset

const resp = await query.runAsync();
// Data is columnar: resp.data.data["col1"] = [val1, val2, ...]
const col1Values = resp?.data?.data?.["col1"] || [];
const rowCount = col1Values.length;
```

### ml.servercache — Table/Column Discovery

```typescript
// List all tables (returns jQuery Promise)
const tables = await new Promise(resolve => {
    ml.servercache.FetchStoredTablesPromise(true).done(resolve);
});

// Get single table metadata
const storedTable = await ml.servercache.fetchStoredTableAsync("account/tableName", true);
const colNames = storedTable.columns.names.split(",");   // "col1,col2,col3"
const colTypes = storedTable.columns.types.split(",");   // "String,Double,Int32"
```

### ml.echarts — ECharts Namespace

```typescript
// Access ECharts constructors
ml.echarts.graphic.LinearGradient(x0, y0, x1, y1, colorStops)

// ECharts option types
type IRaptorChartOption = ml.echarts.EChartsOption
```

### ml.util — Common Utilities

```typescript
ml.util.isNullOrUndefined(value)
ml.util.isNullUndefinedOrEmpty(value)
ml.util.isObject(value)
ml.util.isFunction(value)
ml.util.isNotEmptyArray(arr)
ml.util.addCommas(num)           // Format number with commas
ml.util.uuid()                   // Generate UUID
ml.util.clone(obj)               // Deep clone
ml.util.orderedStringify(obj)    // Deterministic JSON (for caching)
ml.util.array.flat(arrays)       // Flatten nested arrays
ml.util.object.values(obj)       // Object.values equivalent
```

### ml.router — Dashboard Navigation

```typescript
ml.router.loadDashboard(dashboardPath, null, params)
// e.g., ml.router.loadDashboard("ext/MyExt/dashboard", null, { page: "Detail", id: "123" })
```

### ml.token — Authentication

```typescript
const token = ml.token;  // Current user's auth token
```

---

## Dynamic Style Binding

The Raptor `style` binding is boolean-based (`property` + `trueStyles`/`falseStyles`). It cannot bind a dynamic color value directly.

### For Dynamic Per-Row Colors (e.g., color-coded cells)

Use `attr.style` with an inline CSS string from the ViewModel:

```typescript
// ViewModel: compute inline style string
const bg = computeColor(value);
const fg = luminance(bg) > 0.5 ? "#000" : "#fff";
row.cellStyle = `background-color:${bg};color:${fg};font-weight:600;text-align:right;padding:4px 8px;`;
```

```typescript
// View: bind via attr.style
.td({
    bindings: {
        text: 'displayValue',
        attr: { style: 'cellStyle' }
    }
})
```

This is a common pattern for status color indicators.

### For Boolean Style Toggling

Use the standard `style` binding when the styles are known at build time:

```typescript
.div({
    bindings: {
        style: {
            property: s.getTypedProp("isActive"),
            trueStyles: { backgroundColor: "var(--bs-success)", color: "white" },
            falseStyles: { backgroundColor: "transparent" }
        }
    }
})
```

---

## Layout Utilities

### Flex Utilities

```typescript
interface IFlexBehavior {
    dFlex?: boolean;              // display: flex
    dInlineFlex?: boolean;        // display: inline-flex
    flexRow?: boolean;            // flex-direction: row
    flexColumn?: boolean;         // flex-direction: column
    flexRowReverse?: boolean;     // flex-direction: row-reverse
    flexColumnReverse?: boolean;  // flex-direction: column-reverse
    flexWrap?: boolean;           // flex-wrap: wrap
    flexNowrap?: boolean;         // flex-wrap: nowrap
    flexFill?: boolean;           // flex: 1 1 auto
    flexGrow?: 0 | 1;             // flex-grow
    flexShrink?: 0 | 1;           // flex-shrink
    justifyContentStart?: boolean;
    justifyContentEnd?: boolean;
    justifyContentCenter?: boolean;
    justifyContentBetween?: boolean;
    justifyContentAround?: boolean;
    justifyContentEvenly?: boolean;
    alignItemsStart?: boolean;
    alignItemsEnd?: boolean;
    alignItemsCenter?: boolean;
    alignItemsBaseline?: boolean;
    alignItemsStretch?: boolean;
    alignContentStart?: boolean;
    alignContentEnd?: boolean;
    alignContentCenter?: boolean;
    alignContentBetween?: boolean;
    alignContentAround?: boolean;
    alignContentStretch?: boolean;
    alignSelfAuto?: boolean;
    alignSelfStart?: boolean;
    alignSelfEnd?: boolean;
    alignSelfCenter?: boolean;
    alignSelfBaseline?: boolean;
    alignSelfStretch?: boolean;
}
```

### Spacing Utilities

```typescript
interface ISpacing {
    around?: 0 | 1 | 2 | 3 | 4 | 5 | 'auto';  // All sides
    x?: 0 | 1 | 2 | 3 | 4 | 5 | 'auto';        // Left and right
    y?: 0 | 1 | 2 | 3 | 4 | 5 | 'auto';        // Top and bottom
    top?: 0 | 1 | 2 | 3 | 4 | 5 | 'auto';
    bottom?: 0 | 1 | 2 | 3 | 4 | 5 | 'auto';
    left?: 0 | 1 | 2 | 3 | 4 | 5 | 'auto';
    right?: 0 | 1 | 2 | 3 | 4 | 5 | 'auto';
    // Responsive variants
    xMd?: 0 | 1 | 2 | 3 | 4 | 5;              // x spacing on md+ screens
    yLg?: 0 | 1 | 2 | 3 | 4 | 5;              // y spacing on lg+ screens
}
```

### Common Layout Patterns

```typescript
// Full-height flex container
.div({
    flex: {
        dFlex: true,
        flexColumn: true,
        flexFill: true
    },
    minHeight: 0,
    minWidth: 0
})

// Centered content
.div({
    flex: {
        dFlex: true,
        justifyContentCenter: true,
        alignItemsCenter: true
    }
})

// Space-between header
.div({
    flex: {
        dFlex: true,
        justifyContentBetween: true,
        alignItemsCenter: true
    },
    padding: { x: 3, y: 2 }
})

// Responsive grid-like layout
.div({
    flex: {
        dFlex: true,
        flexWrap: true
    },
    gap: 3
})
.contentTemplates(s => s
    .foreach(s.getTypedProp('items'), s => s
        .card({
            flex: { flexFill: true },
            minWidth: 0
        })
    )
)
```

### Display Utilities

```typescript
interface IDisplayBehavior {
    dNone?: boolean;           // display: none
    dBlock?: boolean;          // display: block
    dInline?: boolean;         // display: inline
    dInlineBlock?: boolean;    // display: inline-block
    // Responsive variants
    dMdNone?: boolean;         // display: none on md+
    dLgBlock?: boolean;        // display: block on lg+
}
```

### Position Utilities

```typescript
interface IPositionBehavior {
    relative?: boolean;        // position: relative
    absolute?: boolean;        // position: absolute
    fixed?: boolean;           // position: fixed
    sticky?: boolean;          // position: sticky
}
```

### Flex Row Heights in Raptor v5 — Use `heightUtility`, NOT `flexGrow > 1`

`flex: { flexGrow: 2 }` or `flexGrow: 1.5` in RSScriptor emits a non-existent Bootstrap class (`flex-grow-2`, `flex-grow-1.5`) that no CSS rule matches. Bootstrap only ships `flex-grow-0` and `flex-grow-1`. The element silently falls back to `flex: 0 1 auto` and collapses to content height.

For non-1 flex ratios, DO NOT use `flexGrow: 2`. Instead set explicit percentages via `heightUtility`:

```typescript
// Three rows with 50/25/25 split
s.div({ heightUtility: 50, flex: { flexShrink: 0 }, minHeight: 0 }).contentTemplates(...)   // map
s.div({ heightUtility: 25, flex: { flexShrink: 0 }, minHeight: 0 }).contentTemplates(...)   // charts
s.div({ heightUtility: 25, flex: { flexShrink: 0 }, minHeight: 0 }).contentTemplates(...)   // grid
```

`heightUtility` maps to Bootstrap's `h-25`, `h-50`, `h-75`, `h-100` classes — only those four values are valid.

Related: the equal-width-column CSS class is **`ml-flex-basis-0`**, not `flex-basis-0`. Applying `customCssClasses: "flex-basis-0"` does nothing because no such rule exists in the stylesheet.

---

## Available Raptor Controls

### Layout Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `div` | Generic container | flex, padding, margin, position |
| `container` | Bootstrap container | fluid, maxWidth |
| `row` | Bootstrap row | gutters |
| `col` / `column` | Bootstrap column | xs, sm, md, lg, xl, xxl (or columnXs, columnSm, etc.) |
| `card` | Card container | header, footer |
| `cardHeader` | Card header section | padding |
| `cardBody` | Card body section | padding |
| `cardFooter` | Card footer section | padding |
| `accordion` | Collapsible sections | items, defaultOpen |
| `accordionItem` | Single accordion item | header, expanded |
| `navbar` | Navigation bar | brand, expand |
| `sidebar` | Side navigation | collapsed, position |
| `contentDrawer` | Slide-out drawer | position, width |
| `cssGrid` | CSS Grid container | rows, columns, gap |
| `cssGridItem` | CSS Grid item | rowStart, rowEnd, columnStart, columnEnd |

### Input Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `button` | Clickable button | kind, size, disabled, svgOptions |
| `buttonGroup` | Grouped buttons | vertical, size |
| `input` | Text input | inputType, placeholder, maxLength |
| `textArea` | Multi-line text | rows, maxLength |
| `select` | Dropdown select | options, placeholder, multiple |
| `quickSelect` | Raptor dropdown | items, value, labelProperty, valueProperty |
| `checkbox` | Checkbox input | checked, indeterminate |
| `radio` | Radio button | name, value |
| `switch` | Toggle switch | checked, label |
| `slider` | Range slider | min, max, step, value, rangeMode |
| `dateTime` | Date/time picker | showTime, military, timeZone |
| `dateFilter` | Date range filter | presets, customRange |
| `columnPicker` | Column selector | columns, selected |
| `columnValuePicker` | Value filter | column, operator, value |
| `tablePicker` | Table selector | tables, selected |

### Display Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `h1`-`h6` | Headings | text, textColor |
| `heading` | Dynamic heading | size, text |
| `p` / `paragraph` | Paragraph text | text |
| `span` | Inline text | text, textColor |
| `strong` | Bold text | text |
| `mark` | Highlighted text | text |
| `label` | Form label | text, for |
| `image` | Image | src, alt, width, height |
| `svg` | SVG icon | key, width, height |
| `badge` | Badge/pill | text, color |
| `alert` | Alert message | type, dismissible |
| `tooltip` | Tooltip | content, placement |
| `html` | Raw HTML | content |

### Data Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `dataGrid` | Data grid/table | columns, data, pagination, height |
| `table` | HTML table | headers, rows, striped, bordered |
| `tableHead` | Table header section | - |
| `tableBody` | Table body section | - |
| `tr` | Table row | - |
| `th` | Table header cell | text |
| `td` | Table data cell | text |
| `tree` | Tree view | nodes, expandable |
| `listGroup` | List group | items, flush |
| `pagination` | Page navigation | total, current, pageSize |
| `topValues` | Top N value display | count, data |

### Navigation Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `anchor` | Link | href, target, navLink |
| `navTabs` | Tab navigation | tabs, activeTab |
| `navTabItem` | Tab item | text, active |
| `navTabPane` | Tab content pane | active |
| `breadcrumb` | Breadcrumb nav | items |
| `dropdown` | Dropdown menu | items, trigger |

### Chart Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `chart` | Generic chart (ECharts) | options, height |
| `lineChart` | Line chart | series, xAxis, yAxis |
| `barChart` | Bar chart | series, orientation |
| `areaChart` | Area chart | series, stacked |
| `pieChart` | Pie chart | data, donut |
| `scatterChart` | Scatter plot | series, xAxis, yAxis |
| `gaugeChart` | Gauge/meter | value, min, max |
| `heatmapChart` | Heatmap | data, colorScale |

### Map Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `raptorMap` | MapLarge map | layers, center, zoom |
| `legend` | Map legend | items, position |
| `timeline` | Time animation | range, current |
| `timeSlider` | Time range selector | min, max, value |

### Map Chrome: prefer framework options over custom overlays

**Before building any custom right-side button overlay or coordinate-search widget, check whether the raptorMap node already exposes what you need.** Two flags together render the standard v5 map chrome on both Stable_Trunk and older cores like `release/core/4.127`:

```typescript
s.raptorMap({
    viewName: "MyMap",
    heightUtility: 100,
    widthUtility: 100,
    mapOptions: {},
    showEditor: true,          // layer list + base map + map options
    noLegacyButtons: true,     // engages RaptorMapChrome on Stable_Trunk
    bindings: { data: s.getTypedProp("defaultMapOptions") },
} as any);
```

Pair with `mapOptions.searchBox: "AlwaysShow"` in the VM for a pinned geocoder search box:

```typescript
this.defaultMapOptions = {
    mapOptions: <ml.ui.map.iMapOptions>{
        api: "LEAFLET",
        lat: 9.79, lng: 116.49, z: 5,
        searchBox: "AlwaysShow",  // pinned open; default is hover-to-show
    } as any,
};
```

**Cross-version behavior:**

| Flag | 4.127 (pre-chrome refactor) | Stable_Trunk |
|---|---|---|
| `showEditor: true` | Inline `LayerListButton` via `RaptorMap.ts:443-476` | Routed through `RaptorMapChrome.mapChromeConfig` at `RaptorMapChrome.ts:194-218` |
| `noLegacyButtons: true` | Ignored (option doesn't exist on 4.127) | Required to engage `RaptorMapChrome` at all (see `:193`) |
| `mapChrome.rightButtonGroup` | Ignored — helper doesn't exist | Works; overrides the default config |
| `mapOptions.searchBox: "AlwaysShow"` | Works (`Map.ts:1316-1334`) | Works (same API) |

Setting both flags is safe on both cores. Default chrome render includes: `zoomin`, `zoomout`, `drawToZoom`, `home` (zoom-to-extents), `earth` (base map picker), `layers`, `grid` (widgets), `hideMapDialogs`.

**What showEditor does NOT include:** a legend button. If the ticket requires a legend, either ship without one and argue the framework default is sufficient, or add a single standalone dropdown panel for legend content.

**Framing rule when you see a "put buttons on the map" ask:** Before building, grep `.adk/types.d/MapLarge.Server.d.ts` for `showEditor`, `searchBox`, `mapChrome`, `noLegacyButtons`, `LayerList` — the framework option is likely already there. This lesson was learned the hard way on CORD-45061 after building a 300-LOC custom overlay that got replaced with two config lines.

### Map Runtime API: Layer visibility and base layers

Public API on `ml.ui.map.Map` (accessed via `raptorDom.node("TrackMap")._map`):

| Operation | API | Source |
|---|---|---|
| Enumerate registered layers | `mlMap.layers` (array), `mlMap.getLayers()` (method) | `Map.ts:220`, `Map.ts:1872` |
| Toggle a single layer | `layer.show()` / `layer.hide()` on `APILayer` | `APILayer.ts:113,131` |
| Switch base layer | `await mlMap.updateBaseLayer(name)` | `Map.ts:1739-1789` |

**Critical: `layer.visible` is a `Value<boolean>` observable, NOT a raw boolean.**

```typescript
// WRONG — always evaluates to true (an object is truthy)
if (layer.visible) layer.hide(); else layer.show();

// RIGHT — read via .get() on the observable
if (layer.visible.get()) layer.hide(); else layer.show();

// SAFEST — guard against shape changes across cores
function readLayerVisible(layer: any): boolean {
    const v = layer?.visible;
    if (v == null) return false;
    return typeof v?.get === "function" ? !!v.get() : !!v;
}
```

Known built-in base-layer preset names for `updateBaseLayer`: `"color"` (streets), `"osmblack"` (dark), `"osmgrey"` (gray), `"MLMapquest"`, `"MLOSMBright"`, `"MLOSMCarto"`. The `baseLayerColor` map option is a tint, NOT a layer name — do not pass it to `updateBaseLayer`.

### Advanced Controls

| Control | Description | Key Properties |
|---------|-------------|----------------|
| `codeEditorMonaco` | Monaco code editor | language, value, theme |
| `dialog` | Modal dialog | title, size, footer, staticBackdrop |
| `dialogHeader` | Dialog header | showCloseButton |
| `dialogBody` | Dialog body | padding |
| `dialogFooter` | Dialog footer | - |
| `forms` | Form container | validation, submit |
| `graphViewer` | Graph visualization | nodes, edges |
| `webGL` | WebGL canvas | render function |
| `video` | Video player | src, controls |
| `carousel` | Image carousel | items, autoPlay |

---

## Map Layer Styles & Geometry UDFs

### NATO Military Symbol Rendering (`militarySymbol` style block)

MapLarge has built-in NATO milsymbol rendering. **Do not** use the npm `milsymbol` package — the engine generates SVG server-side from MIL-STD-2525C SIDC strings.

Add `militarySymbol` to a layer style rule. Use `${columnName}` for per-row interpolation.

```typescript
style: {
    layerType: "geo.icon",
    method: "dynamic",
    rules: [
        {
            style: {
                size: 28,
                militarySymbol: {
                    sidc: "${milsymbol}",        // SIDC column on the data source
                    standard: "MIL-STD-2525C",
                },
            },
            where: { col: "milsymbol", test: "EqualNot", value: "" },
        },
        {
            style: { fillColor: "${colorhash(category, 220)}", size: 14, shape: "round" },
            where: { col: "*", test: "CatchAll", value: 0 },
        },
    ],
}
```

Server source: `MapLarge.Engine/Icons/MilitarySymbols/MilitarySymbol.cs`. Style schema: `MapLarge.Engine/Unified/QueryParts/Style.cs` (search `militarySymbol`).

Always include a fallback `where: CatchAll` rule for rows with empty SIDC.

> **GOTCHA — test symbol names.** Use MapLarge's `TestSymbol` constants (`MapLarge.Engine/ValueTest/TestSymbol.cs`), NOT generic SQL-style names. The test is `"EqualNot"`, NOT `"NotEqual"`. Using `"NotEqual"` fails with a server-side tile exception: `Test 'NotEqual' is invalid for column type String`. Full valid list: `Equal`, `EqualNot`, `EqualAny`, `EqualNone`, `EqualAnyList`, `EqualAllList`, `IEqual`, `IEqualNot`, `CatchAll`, `Greater`, `GreaterOR`, `Less`, `LessOR`, `StartsWith`, `EndsWith`, `Like`, `Fuzzy` (and several more — check `TestSymbol.ts`).

### Per-Track Polylines from Time-Ordered Points (`CreateLine` UDF)

`CreateLine(geoColumn, sortColumn)` is a built-in MapLarge UDF that builds a `LINESTRING` from points sorted by the second column. Use it in a `sqlselect` aggregated by track ID.

```typescript
{
    name: "tracks_lines",
    dataSource: {
        table: "myaccount/tracks",
        sqlselect: [
            "trkItmId",
            "First(category) as category",
            "Count(trkItmId) as point_count",
            "CreateLine(XY, ts) as track_line",
        ],
        groupby: ["trkItmId"],
        withgeo: true,
    },
}
```

Render with `selectedGeometry: "line"`, `selectedGeoCol: "track_line"`, `layerType: "geo.line"`.

---

## v4 System (Legacy)

### Base Classes

- `BaseControl<T>` - Base class for all v4 controls
- `BaseInputControl<T>` - Base class for input controls
- `BaseDashboardItem` - Base dashboard component

### Required Static Properties

```typescript
export class Button extends BaseInputControl<Button.IOptionsDefinition> {
    // Unique control type identifier
    public static type: string = "Button";

    // Control metadata
    public static meta: IControlMeta = {
        status: ControlReleaseStatus.PRODUCTION,
        description: "A clickable button control",
        category: "Input",
        friendlyName: 'Button',
        categories: ['Inputs'],
        childSupport: ChildSupport.MULTIPLE
    };

    // Configuration schema for the control editor
    public static configSchema: IComponentConfigSchema = {
        settings: [
            { name: "text", type: "string", default: "Click Me" },
            { name: "intent", type: "enum", values: ["primary", "secondary", "danger"] }
        ]
    };

    // Initial default options
    public static initialOptions: Partial<Button.IOptionsDefinition> = {
        text: "Button",
        intent: "primary"
    };

    public static builder() {
        return new TypedControlDefinitionBuilder<Button.ITypedOptionsDefinition>('Button');
    }
}
```

### Key Methods

```typescript
export class MyControl extends BaseControl<IOptions> {
    // Called when control is first created
    public build(): void {
        this.$element = $('<div class="my-control"></div>');
    }

    // Called after build, for initialization logic
    public init(): void {
        this.watchDefinitionOptions('text', (newValue) => {
            this.$element.text(newValue);
        });
    }

    // Called to create child controls
    public createChildren(): void {
        // Add child controls here
    }

    // Cleanup when control is destroyed
    public onDestroy(): void {
        // Remove event listeners, cleanup resources
    }
}
```

### Builder Pattern (V4)

```typescript
// Creating a v4 control definition
Button
    .builder()
    .layoutOptions({
        rowStart: 2, rowEnd: 3,
        columnStart: 2, columnEnd: 3,
    })
    .options({
        label: 'Reset',
        title: 'Reset the count',
        onClick: (scope) => {
            scope.count(0);
        }
    })
    .toJSON();
```

### V4 Control Locations

```
MapLarge.Server/src/framework/controls/
├── input/           # Input controls
│   ├── Button.ts
│   ├── Textbox.ts
│   ├── DropdownSelect.ts
│   ├── DatePicker.ts
│   ├── Slider.ts
│   └── ...
├── layout/          # Layout controls
│   ├── Tabs.ts
│   ├── Accordion.ts
│   ├── DataTable.ts
│   └── ...
└── display/         # Display controls
    ├── Label.ts
    ├── Alert.ts
    ├── Markdown.ts
    └── ...
```

---

## Extension Development Patterns

How to set up a new ADK extension from scratch: file structure, dashboard registration, module definition, navigation wiring, and layout configuration.

### Extension Structure

```
extensions/MyExtension/
├── manifest.json
├── client/
│   ├── home.ts              # Entry point
│   ├── appState.ts          # Application state
│   ├── views/
│   │   ├── layouts/
│   │   │   └── LayoutView.ts
│   │   ├── pages/
│   │   │   └── HomeView.ts
│   │   └── dialogs/
│   │       └── MyDialog.ts
│   └── viewModels/
│       ├── layout/
│       │   └── LayoutViewModel.ts
│       └── pages/
│           └── HomeViewModel.ts
└── server/                   # Backend code (C#)
```

### Dashboard Registration Patterns

There are four patterns for registering extension dashboards. The choice depends on complexity and reusability.

#### Pattern A: `registerPublicDashboard()` + `initModule()` — Standard Extension

**Most common pattern.** Registers the dashboard for URL routing and provides an entry point for RaptorEngine setup.

```typescript
// File: client/home.ts or client/dashboard.ts
import { RaptorEngine, registerPublicDashboard, ILocatedRoute } from "index";
import { HomeView, HomeModelKey } from "./views/pages/HomeView";
import { LayoutView } from "./views/layouts/LayoutView";
import { HomeViewModel } from "./viewModels/pages/HomeViewModel";
import { LayoutViewModel } from "./viewModels/layout/LayoutViewModel";

// Register dashboard metadata (called at module load time)
registerPublicDashboard({
    id: "ext/MyExtension/dashboard",      // URL path: /dashboard/ext/MyExtension/dashboard
    name: "My Extension Dashboard",        // Display name in dashboard directory
    description: "Dashboard description",
    hideSidebar: true,                     // Hide the platform sidebar
    hideHeader: true,                      // Hide the platform header
    // skipAuthCheck: false,               // Optional: skip auth for public dashboards
    // showInDirectory: true,              // Optional: show in dashboard listing
    // alternateIds: ["ext/old-id/dash"],  // Optional: alternate URL paths
});

// Entry point called by the framework when dashboard loads
export async function initModule(container: HTMLElement, route: ILocatedRoute): Promise<RaptorEngine> {
    const engine = new RaptorEngine(container);
    engine.setPageRenderingTarget(container);
    await engine.initialize();

    engine
        .addLayout(LayoutView())
        .addPage(HomeView())
        .addViewModels({ modelKey: "Layout", viewModels: [LayoutViewModel] })
        .addViewModels({ modelKey: HomeModelKey, viewModels: [HomeViewModel] })
        .addModuleNavigationModel({
            type: "listNavigation",
            navigationItems: [
                { gotoModelKey: HomeModelKey, isActivePage: true }
            ]
        });

    await engine.loadModule("MyExtension", route?.values["page"], true);
    return engine;
}
```

**Dashboard URL format:** `/dashboard/ext/{ExtensionName}/{id-last-segment}`

#### Pattern B: `defineModule()` — Reusable Module

Used when a module is loaded dynamically by a host extension (e.g., a shell extension loads a feature module).

```typescript
// File: client/main.ts
export async function defineModule(): Promise<IRaptorModule> {
    return {
        name: "MyExtension",
        pages: {
            [PageModelKey]: PageView(),
            [DetailModelKey]: DetailView(),
        },
        pageViewModels: {
            [PageModelKey]: [{
                classModule: "ext/MyExtension/view-models/pages/PageViewModel",
                className: PageViewModel.name
            }],
        },
        layouts: {
            "Layout": LayoutView()
        },
        dialogs: {
            [MyDialogKey]: MyDialogView()
        }
    };
}
```

#### Pattern C: Direct Engine API — Full Control

For standalone extensions needing complete control over initialization order.

```typescript
export async function initModule(container: HTMLElement, route: ILocatedRoute): Promise<RaptorEngine> {
    const engine = new RaptorEngine(container);
    await engine.initialize();

    // Chainable API
    engine
        .addLayout(LayoutView())
        .addPage(HomeView())
        .addPage(DetailView())
        .addDialog(ConfirmDialogView())
        .addViewModels({ modelKey: HomeModelKey, viewModels: [HomeViewModel] })
        .addViewModels({ modelKey: DetailModelKey, viewModels: [DetailViewModel] })
        .addDataContext(appState)           // Shared state object
        .addDataContext(layoutViewModel)    // Layout VM accessible to all pages
        .addModuleNavigationModel({
            type: "listNavigation",
            navigationItems: [
                { gotoModelKey: HomeModelKey, text: "Home", isActivePage: true },
                { gotoModelKey: DetailModelKey, text: "Details", isActivePage: false }
            ]
        });

    await engine.loadModule("MyModule", HomeModelKey, true);
    return engine;
}
```

#### Pattern Comparison

| Pattern | Use Case | Reusability |
|---------|----------|-------------|
| `registerPublicDashboard()` + `initModule()` | Standard standalone extension | Medium |
| `defineModule()` returning `IRaptorModule` | Dynamically loaded by host extension | High |
| Direct engine API (`addPage`/`addDialog`) | Full initialization control | Medium |
| `defineModule()` + `loadModule()` hybrid | Clean separation of concerns | High |

### IRaptorModule Interface

```typescript
interface IRaptorModule {
    name: string;                                                    // Module name
    layouts: { [modelKey: string]: IRenderingDefinition };           // Layout definitions
    pages: { [modelKey: string]: IRenderingDefinition };             // Page definitions
    dialogs: { [modelKey: string]: IRenderingDefinition };           // Dialog definitions
    snippets?: { [modelKey: string]: SnippetDef };                   // Reusable view fragments
    listNavigation?: IListNavigation;                                // Tab/button navigation
    treeNavigation?: ITreeNavigation;                                // Hierarchical tree navigation
    viewModels?: ISerializedViewModel[];                             // Serialized VM definitions
    pageViewModels?: { [modelKey: string]: IViewModelReference[] };  // VMs per page
    tableEditingDefinitions?: { [tablename: string]: ITableEditingDefinition };
    isStandAloneRaptorModule?: boolean;                              // Standalone flag
    dynamics?: IDynamics;                                            // Editor-written code
}

interface IViewModelReference {
    classModule: string;   // AMD module path, e.g., "ext/MyExt/viewModels/pages/MyVM"
    className: string;     // Class name, e.g., MyViewModel.name
}

interface IListNavigation {
    type: "listNavigation";
    navigationItems: IListNavigationItem[];
}

interface IListNavigationItem {
    gotoModelKey: string;       // Page modelKey to navigate to
    text?: string;              // Display text
    isActivePage?: boolean;     // Currently active
    svgOptions?: ISvgOptions;   // Icon
}
```

### Navigation System

#### Layout → Page Content Slot

Layouts define where pages render using `controlTargetKey` + `modulePageTarget`:

```typescript
export function LayoutView(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<LayoutViewModel>().page("Layout", "Layout");

    s.view("main", s => s
        .div({ flex: { dFlex: true, flexColumn: true }, minViewportHeight100: true })
        .contentTemplates(s => s
            // Header (stays constant)
            .navbar({})
            .contentTemplates(s => s /* header content */)

            // Sidebar + content area
            .div({ flex: { dFlex: true, flexGrow: 1 }, minHeight: 0 })
            .contentTemplates(s => s
                .sidebar({})
                .contentTemplates(s => s /* sidebar items */)

                // Page content slot — pages render HERE
                .div({
                    flex: { dFlex: true, flexColumn: true, flexGrow: 1 },
                    overflow: 'auto',
                    minHeight: 0,
                    controlTargetKey: "modulePageContent"  // ← Named anchor
                })
            )
        )
    );

    const renDef = s.commitPage();
    renDef.modulePageTarget = "modulePageContent";  // ← Tell engine where pages go
    return renDef;
}
```

#### Programmatic Navigation

```typescript
// Navigate to a page by modelKey
this.raptorEngine.navigate({
    gotoModelKey: "DetailPage",
    isActivePage: true
});

// Navigate with parameters (accessible in target ViewModel)
this.raptorEngine.navigate({
    gotoModelKey: "DetailPage",
    isActivePage: true
}, { itemId: "123", mode: "edit" });

// Navigate via router (for cross-extension navigation)
ml.router.loadDashboard("ext/OtherExtension/dashboard", null, {
    page: "SomePage",
    id: "123"
});
```

#### Sidebar Navigation Pattern

```typescript
// In home.ts — register sidebar items
import { SidebarItem } from "./viewModels/layout/LayoutViewModel";

layoutViewModel.addSidebarItem(
    new SidebarItem(layoutViewModel, HomeModelKey,
        { key: "mlsvg-home-outline", width: 16, height: 16, cssClass: "ml-dash-svg-onSurface" },
        "Home",
        [{ id: HomeModelKey, linkText: "Home", modelKey: HomeModelKey, active: false }],
        "Home Page", "Top"
    )
);

layoutViewModel.addSidebarItem(
    new SidebarItem(layoutViewModel, SettingsModelKey,
        { key: "mlsvg-cog", width: 16, height: 16, cssClass: "ml-dash-svg-onSurface" },
        "Settings",
        [{ id: SettingsModelKey, linkText: "Settings", modelKey: SettingsModelKey, active: false }],
        "Settings", "Bottom"
    )
);
```

---

## Dialog Lifecycle

Covers opening, closing, and communicating between dialogs and their parent pages. Three methods for opening dialogs: own ViewModel, shared ViewModel, or by registered modelKey.

### Opening Dialogs

```typescript
// Method 1: Render dialog with its OWN ViewModel instance
public openDialog(): void {
    this.dialogInfo = this.raptorEngine.renderDialog(
        getMyDialogView(),   // ViewDefinition
        null,                // Parent element (null = body)
        MyDialogViewModel    // ViewModel class (new instance created)
    );
}

// Method 2: Render dialog with SHARED ViewModel (dialog accesses parent VM properties)
public openDialogShared(): void {
    this.dialogInfo = this.raptorEngine.renderDialogVM(
        getMyDialogView(),   // ViewDefinition
        null,                // Parent element
        this                 // Pass THIS ViewModel — dialog shares it
    );
}

// Method 3: Render dialog by modelKey (if registered in module.dialogs)
public openRegisteredDialog(): void {
    this.raptorEngine.renderDialog("MyDialogKey");
}
```

### Dialog View Definition

```typescript
export function getMyDialogView(): ViewDefinitions.IViewDefinition {
    const s = RSScriptor.create<MyDialogViewModel>();
    return s
        .dialog({
            viewName: "myDialog",
            staticBackdrop: true,    // Click outside doesn't close
            centered: true,
            size: "lg",              // sm, md, lg, xl
            height: 400,             // Optional: explicit height
            width: 600,              // Optional: explicit width
            scrollable: true,        // Enable body scrolling (default: true)
        })
        .contentTemplates(s => s
            .dialogHeader({ padding: { around: 2 } })
            .contentTemplates(s => s
                .heading({ text: "Dialog Title", size: 5, margin: { bottom: 0 } })
                .closeButton({ size: "small", kind: "link" })
            )

            .dialogBody({ padding: { around: 3 } })
            .contentTemplates(s => s
                .p({ text: "Dialog content here." })
                .input({
                    inputType: "text",
                    placeholder: "Enter value...",
                    bindings: { value: s.getTypedProp("inputValue") }
                })
            )

            .dialogFooter({ padding: { around: 2 } })
            .contentTemplates(s => s
                .button({
                    text: "Cancel", kind: "secondary",
                    events: [{
                        event: "pointerdown",
                        handler: "closeDialog",
                        passDialogModelKey: true   // ← Passes dialog key as first arg
                    }]
                })
                .button({
                    text: "Save", kind: "primary",
                    events: [{
                        event: "pointerdown",
                        handler: "onSave",
                        passDialogModelKey: true
                    }]
                })
            )
        )
        .commit();
}
```

### Closing Dialogs

```typescript
// The handler receives the dialog modelKey when passDialogModelKey: true
public closeDialog(dialogModelKey: string): void {
    if (dialogModelKey) {
        this.raptorDom.destroyDialog(dialogModelKey);
        this.raptorEngine.destroyViewModelInstanceByModelKey(dialogModelKey);
    }
}

// Save, then close
public onSave(dialogModelKey: string): void {
    // Do save logic...
    this.closeDialog(dialogModelKey);
}
```

### Dialog Communication (Shared ViewModel)

When using `renderDialogVM()` with `this`, the dialog shares the parent's ViewModel. The dialog can read/write parent properties directly:

```typescript
// Parent ViewModel
public selectedItem: IItem = null;
public dialogResult: string = "";

public openEditDialog(): void {
    this.raptorEngine.renderDialogVM(getEditDialogView(), null, this);
    // Dialog can access this.selectedItem and write to this.dialogResult
}
```

---

## Advanced Control Patterns

Patterns for controls that go beyond basic usage: custom templates, factory methods, embedded dashboards, state persistence, and control types not covered in the basic sections above.

### QuickSelect Advanced Usage

#### Custom Item Templates

```typescript
s.quickSelect(s.getTypedProp('items'), {
    labelProperty: 'label',
    valueProperty: 'value',
    placeholder: 'Select with icon...',
    clearable: true,
    bindings: { value: s.getTypedProp('selection') }
})
.contentTemplates(s => {
    // Template for items in the dropdown list
    s.quickSelectItemTemplate().contentTemplates(s => {
        s.div({ flex: { dFlex: true, alignItemsCenter: true }, padding: { around: 2 } })
        .contentTemplates(s => {
            s.svg({
                width: 12, height: 12, margin: { right: 2 },
                customCssClasses: ['ml-currentColor-icon'],
                bindings: { svgKey: 'icon' }
            })
            s.span({ bindings: { text: s.getTypedProp('label') } })
        })
    })

    // Template for the selected item display
    s.quickSelectSelectedItemTemplate().contentTemplates(s => {
        s.div({ flex: { dFlex: true, alignItemsCenter: true } })
        .contentTemplates(s => {
            s.svg({
                width: 12, height: 12, margin: { right: 2 },
                customCssClasses: ['ml-currentColor-icon'],
                bindings: { svgKey: 'icon' }
            })
            s.span({ bindings: { text: 'label' } })
        })
    })
})

// ViewModel
public items = [
    { label: "USA", value: "us", icon: "mlsvg-flag-us" },
    { label: "Canada", value: "ca", icon: "mlsvg-flag-ca" },
];
```

#### Multi-Select with Filtering

```typescript
s.quickSelect(s.getTypedProp('options'), {
    labelProperty: 'label',
    valueProperty: 'value',
    enableMultiSelect: true,      // Allow multiple selections
    enableFiltering: true,        // Search/filter items
    enableSorting: true,          // Sort items
    placeholder: 'Select multiple...',
    clearable: true,
    bindings: { value: s.getTypedProp('selectedValues') }
})

// ViewModel
public options = [
    { label: "Option A", value: "a" },
    { label: "Option B", value: "b" },
    { label: "Option C", value: "c" },
];
public selectedValues: string[] = ["a", "c"];  // Array for multi-select
```

#### QuickSelect Bound to Data Source

```typescript
s.quickSelect({
    labelProperty: 'CityName',
    valueProperty: 'CityID',
    placeholder: 'Pick a city...',
    clearable: true,
    enableFiltering: true,
    enableSorting: true,
    bindings: {
        data: s.getTypedProp('cityDataSource'),  // Bound to data source
        disable: s.getTypedProp('isDisabled')
    }
})
```

#### Programmatic `selectedItems` Updates After User Interaction

**Symptom:** You assign `this._myOptions = { ..., selectedItems: [value] }` from a ViewModel method and call `this.update()`, but the QuickSelect's display doesn't change. Happens only after the user has interacted with the control (e.g. manually cleared it).

**Root cause** (`QuickSelect.ts:291-317` / `:692-696`): the QuickSelect's `set selectedItems` sets `_ignoreNextUpdate = true` on every write so the binding-back doesn't loop. The next `applyBindingData` early-returns and resets the flag — meaning *one* VM-side update after any setter call is silently swallowed. User interactions go through that setter, so the next programmatic update is the one that gets eaten.

**Fix (common case, when a `this.update()` follows):**

```typescript
// After mutating the bound VM field, clear the flag so the pending
// applyBindingData actually runs. The binding flow then handles
// selectedItems, the clear-X visibility, and the display repaint.
const qs = (this as any).raptorDom?.node?.("MyFilter");
if (qs) (qs as any)._ignoreNextUpdate = false;
this.update();
```

That's it. Do **not** also write `qs.selectedItems` or patch `qs._inputEl.children[1].textContent` — those bypass the binding flow and break the clear-X click handler (which reads `this.vm.selectedItems` and re-fires the setter) and cause the placeholder DIV to overlap the label.

**When you DO need to write `qs.selectedItems` directly:** only if there's no subsequent `this.update()` to trigger `applyBindingData`. In that case write **item objects** (`[{label, value}]`), not value strings. Writing strings triggers `value.map(item => item[valueProperty])` at `QuickSelect.ts:296` which dereferences `"string"[valueProperty]` → `undefined`, producing a spurious change event with `[undefined]` that cascades into handlers seeing a falsy selection.

**Inspect state when debugging:**

```javascript
const vm = ml._re._dynamicViewModel;
const qs = vm.raptorDom?.node("MyFilter");
({
    selectedItems: qs?.selectedItems,
    ignoreFlag: qs?._ignoreNextUpdate,
    displayText: qs?._inputEl?.children?.[1]?.textContent?.trim(),
})
```

### DataGrid Advanced Patterns

#### DataGridViewModel Factory Methods

```typescript
// Method 1: From a DynamicViewModel data source (most common)
this._gridVM = DataGridViewModel.fromDataSource(this, "my_data_source", {
    displayFields: [
        { name: "name", label: "Name", width: "200px" },
        { name: "status", label: "Status", width: "100px" }
    ],
    viewModelFactory: (dgvm, data) => new CustomRowVM(dgvm, data),  // Optional
    defaultSort: { field: "name", direction: "asc" }                // Optional
});

// Method 2: From a paged API function
this._gridVM = DataGridViewModel.fromApi(this, async (opts) => {
    const resp = await fetch(`/api/items?start=${opts.start}&take=${opts.take}`);
    const json = await resp.json();
    return { data: json.items, totalSize: json.total };
}, { /* opts */ });

// Method 3: From an in-memory array
this._gridVM = DataGridViewModel.fromArray(this, myDataArray, { /* opts */ });

// Method 4: Manual construction with column metadata
const config: ml.data.table.IColumnMetaDataCollection = {
    Name: { label: "Name", columnType: ml.data.enums.ColumnTypes.STRING, sortOrder: 1 },
    Age: { label: "Age", columnType: ml.data.enums.ColumnTypes.INT32, sortOrder: 2 }
};
this._gridVM = new DataGridViewModel(config, myData);
this._gridVM.behaviors.enableSelection = false;
this._gridVM.behaviors.enableRowCount = false;
this._gridVM.behaviors.config.enableShowRowNumber = false;
```

#### Custom Row Templates with Event Handlers

```typescript
s.dataGrid({
    striped: true, height: 400,
    bindings: { data: s.getTypedProp("gridData") }
})
.contentTemplates(s => {
    // Custom header
    s.tableHead().contentTemplates(s => {
        s.tr({}).contentTemplates(s => {
            s.th({ verticalAlign: "middle" }).contentTemplates(s => s.span({ text: "" }))
            s.th({ verticalAlign: "middle" }).contentTemplates(s => s.span({ text: "Name" }))
            s.th({ verticalAlign: "middle" }).contentTemplates(s => s.span({ text: "Actions" }))
        })
    })

    // Custom body with row iteration
    s.tableBody().contentTemplates(table => {
        table.foreach(s.getTypedProp("gridData"), _s => {
            // Cast to ITableContentScriptor for typed field access
            const s = _s as unknown as ITableContentScriptor<BasicDataGridRowViewModel>;
            s.tr({
                events: [{ event: "click", handler: table.getTypedProp("onRowClick") }],
                bindings: {
                    style: {
                        property: s.prefix("fields").prefix("Selected").getTypedProp("value"),
                        trueStyles: { border: "solid 1.5px blue" },
                        falseStyles: {},
                        useStyleDeclarationBinding: true
                    }
                }
            }).contentTemplates(s => {
                // Checkbox cell
                s.td({ verticalAlign: "middle" }).contentTemplates(s => {
                    s.checkbox({
                        value: false,
                        events: [{ event: "pointerup", handler: table.getTypedProp("toggleSelect") }]
                    })
                })
                // Data cell — access row fields via prefix("fields").prefix("ColumnName").getTypedProp("value")
                s.td({ verticalAlign: "middle" }).contentTemplates(s => {
                    s.span({
                        bindings: { text: s.prefix("fields").prefix("Name").getTypedProp("value") }
                    })
                })
                // Action button cell
                s.td({ verticalAlign: "middle" }).contentTemplates(s => {
                    s.button({
                        kind: "link", size: "small",
                        svgOptions: { key: 'mlsvg-info', width: 10, height: 10 },
                        tooltip: "Details",
                        events: [{ event: "pointerup", handler: table.getTypedProp("getRowInfo") }]
                    })
                })
            })
        })
    })
})

// ViewModel handlers receive BasicDataGridRowViewModel
public getRowInfo(gridvm: BasicDataGridRowViewModel): void {
    const name = gridvm.fields.Name.value;
    const id = gridvm.fields.Id.value;
    console.log(`Row: ${name} (${id})`);
}

public toggleSelect(gridvm: BasicDataGridRowViewModel): void {
    // Toggle selection in source data, recreate DataGridViewModel, call this.update()
}
```

#### Custom Row ViewModel

```typescript
class MyRowVM extends BasicDataGridRowViewModel {
    constructor(context: DataGridViewModel, data: any) {
        super(context, data);
    }

    // Add computed properties for the view
    public get statusColor(): string {
        const status = this.fields.Status?.value;
        return status === "Active" ? "green" : "red";
    }

    public get cellStyle(): string {
        return `background-color:${this.statusColor};color:white;font-weight:600;padding:4px 8px;`;
    }
}

// Register in DataGridViewModel factory
DataGridViewModel.fromDataSource(this, "my_data", {
    viewModelFactory: (dgvm, data) => new MyRowVM(dgvm, data)
});
```

### Tree Control

```typescript
// View
s.tree(s.getTypedProp("treeData"), {
    padding: { x: 2 },
    liTopPadding: 4, liRightPadding: 4, liBottomPadding: 4, liLeftPadding: 4,
    ignoreFirstElement: false,
    hideLineElement: true,
    events: [{ event: "pointerup", handler: "onNodeClick" }],
    bindings: {
        treeStructure: {
            treeModelKey: "treeData",         // ViewModel property with tree array
            recursionKey: "children",          // Property name for child nodes
            nodeTextKey: "title",              // Property for display text
            nodeModelKey: "id",                // Unique node identifier
            selectedNodeKey: "isSelected",     // Boolean indicating selection
            expandKey: "expanded",             // Boolean indicating expand state
        }
    }
}, () => {})

// ViewModel
interface ITreeNode {
    id: string;
    title: string;
    icon: string;
    expanded: boolean;
    isSelected: boolean;
    children: ITreeNode[];
    parent: ITreeNode | null;
}

public treeData: ITreeNode[] = [{
    id: "root", title: "Root", icon: "mlsvg-folder",
    expanded: true, isSelected: false, parent: null,
    children: [
        {
            id: "child1", title: "Child 1", icon: "mlsvg-file",
            expanded: false, isSelected: false, parent: null, children: []
        }
    ]
}];

public onNodeClick(node: any): void {
    console.log("Clicked:", node);
}
```

### NavTabs with Content Panes

> **⚠️ IMPORTANT**: Panes are matched to tabs by **order**, not by ID or name. The 1st `navTabItem` maps to the 1st `navTabPane`, the 2nd to the 2nd, etc. Mismatched counts will silently show wrong content.

The `navTabsContentId` links tab headers to their content panes.

```typescript
// Static tabs
s.navTabs({
    navKind: "tabs",                      // "tabs" | "pills"
    navTabsContentId: "myTabContent"       // Links to navTabsContent below
}).contentTemplates(s => {
    s.navTabItem({ text: "Tab 1", active: true })
    s.navTabItem({ text: "Tab 2" })
    s.navTabItem({ text: "Tab 3" })

    s.navTabsContent({
        navTabsContentId: "myTabContent"   // Must match navTabs ID
    }).contentTemplates(s => {
        // Pane 1 (matches "Tab 1")
        s.navTabPane({}).contentTemplates(s => {
            s.div({ padding: { around: 2 } }).contentTemplates(s => {
                s.p({ text: "Content for Tab 1" })
            })
        })
        // Pane 2 (matches "Tab 2")
        s.navTabPane({}).contentTemplates(s => {
            s.div({ padding: { around: 2 } }).contentTemplates(s => {
                s.p({ text: "Content for Tab 2" })
            })
        })
        // Pane 3 (matches "Tab 3")
        s.navTabPane({}).contentTemplates(s => {
            s.div({ padding: { around: 2 } }).contentTemplates(s => {
                s.dataGrid({
                    height: 400, widthPercentage: 100,
                    bindings: { data: s.getTypedProp("gridData") }
                })
            })
        })
    })
})
```

#### Dynamic Tabs with Foreach

```typescript
s.navTabs({
    navKind: "tabs",
    navTabsContentId: "dynamicTabs"
}).contentTemplates(s => {
    // Static tab items (one per dynamic pane)
    s.navTabItem({ text: "First" })
    s.navTabItem({ text: "Second" })
    s.navTabItem({ text: "Third" })

    s.navTabsContent({ navTabsContentId: "dynamicTabs" })
    .contentTemplates(s => {
        s.navTabPane({
            bindings: {
                foreach: { property: s.getTypedProp("tabContents") }
            }
        }).contentTemplates(s => {
            s.div({ padding: { around: 2 } }).contentTemplates(s => {
                s.p({ bindings: { text: "content" } })
            })
        })
    })
})

// ViewModel
public tabContents = [
    { content: "First tab content" },
    { content: "Second tab content" },
    { content: "Third tab content" }
];
```

### DashboardWrapper (Embedding External Dashboards)

The `dashboardWrapper` control embeds a V4 dashboard control within a Raptor page. Useful for reusing complex existing controls (ETL visualizers, editors, etc.):

```typescript
.dashboardWrapper({
    viewName: "etlVisualizer",
    type: "ETLVisualizer",                // V4 control type name
    heightUtility: 100,
    controlOptions: { embedMode: "Control" },
    bindings: {
        controlScope: s.prefix("myVm").getTypedProp("dashboardScope")
    }
})

// ViewModel — access embedded control's scope after render
public get dashboardScope(): any {
    return this.raptorEngine?.scope;
}

// Wait for embedded control to initialize before accessing
public loadWorkflow(item: any): void {
    requestAnimationFrame(() => {
        const output = this.dashboardScope["etlVisualizer"];
        if (!output?.flow) {
            requestAnimationFrame(() => this.loadWorkflow(item));  // Retry
            return;
        }
        // Now safe to interact with the embedded control
    });
}
```

#### v4 Controls With No v5 Native Equivalent

Some production v4 controls have no Raptor v5 native counterpart. In principle you can wrap them with `DashboardWrapper`:

| v4 Control | What it does | Glue transforms |
|---|---|---|
| `TimeSlider2` | Range/mark selection over a time domain | `TimeSlider2ToFilter` (slider → data source filter) |
| `PlaybackControls` | Play / pause / step / speed buttons | `PlaybackControlsToTimeSlider2` (buttons ↔ slider state) |

Wrapping pattern in a v5 view:

```typescript
s.dashboardWrapper({
    viewName: "TimeSlider",
    controlType: "TimeSlider2",
    controlOptions: {
        dataSource: { $scopePath: "my_data_source:asDataSource" },
        timeColumn: "ts",
    },
} as any);
```

Then register the glue transforms in the ViewModel's `initialize()`:

```typescript
new TimeSlider2ToFilter("TimeSliderFilter", {
    options: {
        source: "TimeSlider",                   // viewName on the wrapper
        dest: "udl_tracks:asDataSource",
        column: "ts",
    },
} as any, this as any, this as any)
```

> **WARNING — this does not fully work in v5 pages today.** Verified 2026-04-17 in `udl-track-explorer`:
> - The `DashboardWrapper` div mounts, but the inner v4 control does not render (strip stays at `height: 0`).
> - `TimeSlider2ToFilter`/`PlaybackControlsToTimeSlider2` constructors call `this.scopeData.timeColumnOut.subscribe(...)` on a `scopeData` that is undefined because the wrapped control hasn't published its scope. This throws a null-ref synchronously, aborting the entire `initialize()` method and breaking unrelated code (e.g., DataGrid setup) further down.
> - **Mitigation:** Isolate these v4 transforms in their own `try { registerTransforms([...]) } catch {}` block so unrelated setup still succeeds.
> - **Ultimate fix:** either port the control to Raptor v5 natively, or page-bridge the user to a v4 dashboard URL for time-scrubbed views. Do not assume this pattern works end-to-end until verified in the target MapLarge version.

`DashboardWrapper.ts` enumerates supported wrapped control types in its `addDefaultsForControls` switch, including `TimeSlider2`, `MLDataGrid`, `Gauge`, `LayerControl`, `ColumnValuePicker`, and others — but being enumerated does not guarantee functional integration in a v5 Raptor page.

### Custom Control Types via element()

For controls not in the RSScriptor registry (custom extension controls), use `element()`:

```typescript
.element({
    type: "codeMapControls",           // Custom control type name
    controlTargetKey: "MapRibbonBar",
    mainMapViewName: "mainMap",
    showDrawToSelect: false,
    bindings: {
        layerListDropdownItems: s.prefix('vm').getTypedProp("layerListItems"),
        searchServices: s.getTypedProp("searchServices")
    }
})
```

### Accordion Collapse State Binding

Bind accordion collapse state to a ViewModel property for programmatic control:

```typescript
s.accordionItem({
    bindings: { collapsed: s.prefix("vm").getTypedProp("filterPanelCollapsed") }
})
```

### Selective View Updates

When a page has multiple named views, update only the one that changed for performance:

```typescript
// View definition with named views
s.view("filters", s => s.div({ ... }))
s.view("charts", s => s.div({ ... }))
s.view("grid", s => s.div({ ... }))

// ViewModel — update only the charts view
this._chartData = newData;
this.update("charts");  // Only re-renders the "charts" view, not filters or grid
```

### Two-View Toggle Pattern

Use visibility bindings to swap between views without remounting (preserves state):

```typescript
// List view
.div({
    bindings: { visible: s.prefix("vm").getTypedProp("isListView") },
    heightUtility: 100,
    flex: { dFlex: true, flexColumn: true }
}).contentTemplates(s => s /* list content */)

// Editor view (hidden until toggled)
.div({
    bindings: { visible: s.prefix("vm").getTypedProp("isEditorView") },
    heightUtility: 100,
    flex: { dFlex: true, flexColumn: true }
}).contentTemplates(s => s /* editor content */)

// ViewModel
public get isListView(): boolean { return this._mode === "list"; }
public get isEditorView(): boolean { return this._mode === "editor"; }

public switchToEditor(): void {
    this._mode = "editor";
    this.update();
}
```

### Per-Row ViewModel Pattern (Non-DataGrid)

For custom HTML tables where each row needs its own ViewModel with methods:

```typescript
// Model class — each row is a ViewModel instance
export class WorkflowItem extends RaptorViewModel {
    public name: string;
    public category: string;
    public actions: WorkflowAction[] = [];

    // Self-reference for prefix binding in foreach
    public get workflowVm(): WorkflowItem { return this; }

    public onWorkflowClicked(): void {
        this.parentVm.openWorkflow(this);
    }
}

// Action class — encapsulates row-level action handlers
export class WorkflowAction {
    constructor(
        public display: string,
        public visible: boolean,
        private handler: () => void
    ) {}
    public onActionClick(): void { this.handler(); }
}

// View — nested prefix for row-level binding
s.foreach(s.prefix("pageVm").getTypedProp("workflows"), s => s
    .tr().contentTemplates(s => {
        s.td().contentTemplates(s => {
            s.anchor({
                bindings: { text: "name" },
                events: [{
                    event: "pointerdown",
                    handler: s.prefix("workflowVm").getTypedProp("onWorkflowClicked")
                }]
            })
        })
        s.td().contentTemplates(s => {
            s.dropdown({}).contentTemplates(s => {
                s.anchor({ dropdownToggle: true, hideDropDownArrow: true,
                    svgOptions: { key: "mlsvg-dot-menu-outline", width: 18, height: 16 } })
                s.list({ dropdownMenu: true }).contentTemplates(s => {
                    s.foreach(s.getTypedProp("actions"), s => s
                        .listItem({ bindings: { visible: "visible" } }).contentTemplates(s => {
                            s.anchor({
                                dropdownItem: true,
                                bindings: { text: "display" },
                                events: [{ event: "pointerdown", handler: "onActionClick" }]
                            })
                        })
                    )
                })
            })
        })
    })
)
```

### ViewModel Serialization (State Persistence)

Raptor supports serializing/deserializing ViewModel state for dashboard save/restore:

```typescript
export class MyViewModel extends DynamicViewModel {
    public serialize(): ISerializedViewModel {
        const json = super.serialize();
        json.data.myCustomState = {
            sortField: this._sortField,
            sortDirection: this._sortDirection,
            selectedFilters: this._selectedFilters
        };
        return json;
    }

    override deserialize(data: any): void {
        if (!this._initialized) {
            this._pendingSavedState = data;  // Defer until init completes
            return;
        }
        const state = data?.myCustomState;
        if (state) {
            this._sortField = state.sortField;
            this._sortDirection = state.sortDirection;
            this._selectedFilters = state.selectedFilters;
            this.update();
        }
    }
}
```

### Multi-DataSource Filter Cascading

Apply the same filter across multiple data sources simultaneously:

```typescript
public applyTimePeriodFilter(startDate: string, endDate: string): void {
    const filter = {
        name: "time-period-filter",
        filter: [[ { col: "date", test: "Between", value: startDate, high: endDate } ]]
    };

    // Same filter applied to all related data sources
    this.dataStore.setFilter("raw_data", filter);
    this.dataStore.setFilter("allocation_data", filter);
    this.dataStore.setFilter("summary_stats", filter);
}
```

### Dropdown Control

Different from QuickSelect — this is a button that opens a menu list.

```typescript
s.dropdown({
    padding: { right: 2 },
    viewName: "statusDropdown",
    split: false                    // true = split button (action + dropdown)
}).contentTemplates(s => s
    .button({
        kind: "link",
        dropdownToggle: true,       // Required — marks this as the toggle
        maxWidth: 150,
        textTruncate: true,
        bindings: { text: s.getTypedProp("selectedLabel") }
    })
    .list({
        dropdownMenu: true,         // Required — marks this as the menu
        listStyleType: "none"
    }).contentTemplates(s => s
        .listItem({
            bindings: {
                foreach: { property: s.getTypedProp("menuItems") }
            }
        }).contentTemplates(s => s
            .anchor({
                dropdownItem: true,  // Required — marks this as a menu item
                bindings: { text: "label" },
                events: [{ event: "pointerdown", handler: "onMenuItemClick" }]
            })
        )
    )
)

// ViewModel
public menuItems = [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" }
];
public selectedLabel = "Medium";

public onMenuItemClick(item: any): void {
    this.selectedLabel = item.label;
    this.update();
}
```

**Silent-failure mode: trigger button without `dropdownToggle: true`.**

`Dropdown.initialize()` locates the trigger via CSS class — it looks for `.dropdown-toggle` first, then `.dropdown-toggle-no-arrow` (`Dropdown.ts:135-136`). Only `dropdownToggle: true` on the button puts one of those classes on the rendered `<button>`. Without it:

- `initialize()` sets `dropdownButton = null`.
- `addEventListeners()` silently skips wiring `pointerdown` because the guard at `Dropdown.ts:349` is `if (this.dropdownButton)`.
- Clicking the button does nothing. No error is thrown.
- A fallback in `render()` at `:455` does `qsElement(root, 'button')`, but `render()` is only called from `show()`, which is called from the pointerdown handler that never fires. Chicken-and-egg.

If the trigger is an icon-only button and the bootstrap ▾ caret looks wrong, add `hideDropDownArrow: true` alongside `dropdownToggle: true`. That switches the class from `dropdown-toggle` to `dropdown-toggle-no-arrow`; the dropdown's trigger-lookup handles both.

```typescript
s.dropdown({ onlyCloseWhenClickOutside: true } as any).contentTemplates(s => {
    s.button({
        kind: "link",
        outline: true,
        dropdownToggle: true,      // Required — otherwise clicks are dead
        hideDropDownArrow: true,   // Icon-only triggers: suppress the ▾ caret
        tooltip: "Layers",
        svgOptions: { key: s.getSvgKey("mlsvg-layer-outline"), height: 18, width: 18 },
    } as any);
    s.div({ customCssClasses: ["panel"] }).contentTemplates(s => {
        // panel content — last child of contentTemplates is treated as the menu
        // (see Dropdown.ts:434-435). `.list()` is idiomatic but `.div()` works too.
    });
});
```

**Content templates order:** `Dropdown.render()` at `:434-435` reads `contentTemplates[ct.length - 1]` as the menu body. Earlier children are rendered inline as trigger content. So the pattern is: trigger first, menu last.

---

## Best Practice Examples

### Complete Page View

```typescript
// File: views/pages/MyPageView.ts
import { RSScriptor, ViewDefinitions } from "index";
import { MyPageViewModel } from "../../viewModels/pages/MyPageViewModel";

export const MyPageModelKey = "MyPage";

export function MyPageView(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<MyPageViewModel>();
    s.page(MyPageModelKey, "My Page");

    s.view('main', s => s
        // Root container - always use flex column with fill
        .div({
            position: { relative: true },
            flex: {
                dFlex: true,
                flexColumn: true,
                flexFill: true
            },
            minHeight: 0,
            minWidth: 0
        })
        .contentTemplates(s => s
            // Header section
            .div({
                flex: {
                    dFlex: true,
                    justifyContentBetween: true,
                    alignItemsCenter: true
                },
                padding: { x: 3, y: 2 },
                customCssClasses: ['page-header']
            })
            .contentTemplates(s => s
                .h2({
                    bindings: { text: s.getTypedProp('pageTitle') },
                    margin: { bottom: 0 }
                })
                .button({
                    kind: "primary",
                    text: "Add New",
                    svgOptions: { key: "mlsvg-plus", width: 16, height: 16 },
                    events: [{ event: "click", handler: s.getTypedProp('onAddClick') }]
                })
            )

            // Content area with scrolling
            .div({
                flex: {
                    dFlex: true,
                    flexColumn: true,
                    flexFill: true
                },
                overflow: 'auto',
                minHeight: 0,
                padding: { x: 3 }
            })
            .contentTemplates(s => s
                // Loading state
                .div({
                    bindings: { visible: s.getTypedProp('isLoading') },
                    flex: {
                        dFlex: true,
                        justifyContentCenter: true,
                        alignItemsCenter: true
                    },
                    padding: { y: 5 }
                })
                .contentTemplates(s => s
                    .span({ text: "Loading..." })
                )

                // Content grid
                .div({
                    bindings: { visible: s.getTypedProp('hasData') },
                    customCssClasses: ['content-grid'],
                    flex: {
                        dFlex: true,
                        flexWrap: true
                    },
                    gap: 3
                })
                .contentTemplates(s => s
                    .foreach(s.getTypedProp('items'), s => s
                        .card({
                            flex: { flexFill: true },
                            minWidth: 0,
                            cursor: 'pointer',
                            events: [{ event: "pointerup", handler: "onItemClick" }]
                        })
                        .contentTemplates(s => s
                            .cardBody({
                                padding: { around: 3 }
                            })
                            .contentTemplates(s => s
                                .image({
                                    height: 200,
                                    bindings: {
                                        attr: { src: 'imageUrl' }
                                    }
                                })
                                .h5({
                                    textColor: 'primary',
                                    padding: { top: 2 },
                                    bindings: { text: 'title' }
                                })
                                .span({
                                    display: { dBlock: true },
                                    bindings: { text: 'description' }
                                })
                            )
                        )
                    )
                )

                // Empty state
                .div({
                    bindings: { visible: s.getTypedProp('isEmpty') },
                    flex: {
                        dFlex: true,
                        flexColumn: true,
                        justifyContentCenter: true,
                        alignItemsCenter: true
                    },
                    padding: { y: 5 }
                })
                .contentTemplates(s => s
                    .svg({
                        key: "mlsvg-empty-box",
                        width: 64,
                        height: 64,
                        opacity: 50
                    })
                    .paragraph({
                        text: "No items found",
                        textColor: 'muted',
                        padding: { top: 2 }
                    })
                )
            )
        )
    );

    return s.commitPage();
}
```

### Complete ViewModel

```typescript
// File: viewModels/pages/MyPageViewModel.ts
import { RaptorViewModel, RaptorDom, RaptorEngine } from "index";

export interface IMyItem {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
}

export class MyPageViewModel extends RaptorViewModel {
    // Page title
    public pageTitle: string = "My Items";

    // Data state
    private _items: IMyItem[] = [];
    public get items(): IMyItem[] { return this._items; }

    // Loading state
    private _isLoading: boolean = false;
    public get isLoading(): boolean { return this._isLoading; }

    // Computed properties for UI states
    public get hasData(): boolean {
        return !this._isLoading && this._items.length > 0;
    }

    public get isEmpty(): boolean {
        return !this._isLoading && this._items.length === 0;
    }

    constructor(
        public raptorDom: RaptorDom,
        public raptorEngine: RaptorEngine
    ) {
        super(raptorDom, raptorEngine);
        this.loadItems();
    }

    private async loadItems(): Promise<void> {
        this._isLoading = true;

        try {
            // Fetch data from API
            const response = await fetch('/api/items');
            this._items = await response.json();
        } catch (error) {
            console.error('Failed to load items:', error);
            this._items = [];
        } finally {
            this._isLoading = false;
        }
    }

    // Event handlers
    public onAddClick(): void {
        this.raptorEngine.navigate({
            gotoModelKey: "AddItem",
            isActivePage: true
        });
    }

    public onItemClick(item: IMyItem): void {
        this.raptorEngine.navigate({
            gotoModelKey: "ItemDetails",
            isActivePage: true,
            params: { itemId: item.id }
        });
    }
}
```

### Common Patterns Summary

#### Always Include

1. **Root container flex setup**:
   ```typescript
   flex: { dFlex: true, flexColumn: true, flexFill: true },
   minHeight: 0,
   minWidth: 0
   ```

2. **Scrollable content areas**:
   ```typescript
   overflow: 'auto',
   minHeight: 0  // Critical for scrolling to work
   ```

3. **Event handlers as ViewModel methods**, not inline functions

4. **Use `pointerup` instead of `click`** for better touch support

5. **Typed bindings with `s.getTypedProp()`** for type safety

#### Avoid

1. Inline styles - use layout utilities instead
2. Direct DOM manipulation in ViewModels
3. jQuery in v5/Raptor code
4. Hardcoded strings in bindings - use typed properties
5. Missing `minHeight: 0` on flex containers (breaks scrolling)
6. Using `heightUtility: 100` without parent height constraints

---

## Quick Reference

### RSScriptor Methods - Layout

| Method | Purpose |
|--------|---------|
| `.container(opts)` | Bootstrap container |
| `.row(opts)` | Bootstrap row |
| `.column(opts)` | Bootstrap column |
| `.div(opts)` | Generic div |
| `.section(opts)` | Section element |
| `.cssGrid(opts)` | CSS Grid container |
| `.cssGridItem(opts)` | CSS Grid item |
| `.sidebar(opts)` | Sidebar container |
| `.navbar(opts)` | Navigation bar |
| `.card(opts)` | Card container |
| `.cardHeader(opts)` | Card header |
| `.cardBody(opts)` | Card body |
| `.cardFooter(opts)` | Card footer |

### RSScriptor Methods - Input

| Method | Purpose |
|--------|---------|
| `.button(opts)` | Button |
| `.input(opts)` | Text input |
| `.textArea(opts)` | Multiline text |
| `.checkbox(opts)` | Checkbox |
| `.switch(opts)` | Toggle switch |
| `.radio(opts)` | Radio button |
| `.select(opts)` | Select dropdown |
| `.slider(opts)` | Slider control |
| `.dateTime(opts)` | Date/time picker |
| `.quickSelect(opts)` | Quick select dropdown |

### RSScriptor Methods - Display

| Method | Purpose |
|--------|---------|
| `.h1(opts)` ... `.h6(opts)` | Headings |
| `.p(opts)` / `.paragraph(opts)` | Paragraph |
| `.span(opts)` | Inline span |
| `.label(opts)` | Label |
| `.image(opts)` | Image |
| `.svg(opts)` | SVG icon |
| `.anchor(opts)` | Link |
| `.table(opts)` | HTML table |
| `.dataGrid(opts)` | Data grid |
| `.chart(opts)` | Chart (ECharts) |

### Common Binding Properties

| Binding | Type | Purpose |
|---------|------|---------|
| `text` | string | Text content |
| `visible` | boolean | Visibility |
| `enable` | boolean | Enable/disable |
| `checked` | boolean | Checkbox state |
| `value` | any | Input value |
| `css` | object | Dynamic CSS classes |
| `attr` | object | HTML attributes |
| `svgOptions` | object | SVG configuration |

### Flex Utility Properties

| Property | Values |
|----------|--------|
| `dFlex` | boolean |
| `flexColumn` / `flexRow` | boolean |
| `flexGrow` | 0, 1, true |
| `flexShrink` | 0, 1 |
| `flexWrap` / `flexNowrap` | boolean |
| `flexFill` | boolean |
| `alignItemsCenter` | boolean |
| `justifyContentCenter` | boolean |
| `justifyContentBetween` | boolean |

### Bootstrap Column Sizes

| Property | Screen Size |
|----------|-------------|
| `columnXxl` | >= 1400px |
| `columnXl` | >= 1200px |
| `columnLg` | >= 992px |
| `columnMd` | >= 768px |
| `columnSm` | >= 576px |
| `columnXs` | < 576px |

Values: 1-12 (12 = full width)

### Height Properties Priority

| Property | Unit | Notes |
|----------|------|-------|
| `height` | px | Applied with `!important` |
| `heightVH` | vh | Viewport height |
| `heightPercentage` | % | Requires parent height |
| `heightUtility` | class | Bootstrap h-25, h-50, h-75, h-100 |
| `maxHeight` | px | Maximum height |
| `minHeight` | px | Minimum height (use 0 for flex shrinking) |

---

## Additional Resources

- **Framework Source**: `MapLarge.Server/src/framework/`
- **Core UI Views**: `MapLarge.Server/src/ui/core-ui/`
- **Raptor Controls**: `MapLarge.Server/src/framework/raptor/raptorDom/controls/`
- **v4 Controls**: `MapLarge.Server/src/framework/controls/`
- **Good Extension Examples**: the extensions in your ADK workspace (`extensions/`)
- **Official Control Examples**: `docs/extensions/ml-docs-dev/client/code-examples/raptor-nodes/` (accordion, chart, dataGrid, quickSelect, sidebar, table, tree, navTabs, dropdown, form)
- **Chart Examples**: `docs/extensions/ml-docs-dev/client/code-examples/charts/` (bar, line, pie, area, scatter)
- **Binding Docs**: `docs/extensions/ml-docs-dev/client/raptor-bindings.ts`
- **Event Docs**: `docs/extensions/ml-docs-dev/client/raptor-events.ts`
- **Dialog Docs**: `docs/extensions/ml-docs-dev/client/raptor-dialogs.ts`
- **Data Source Docs**: `docs/extensions/ml-docs-dev/client/raptor-data-sources.ts`
- **Styling/Theming**: `docs/extensions/ml-docs-dev/client/raptor-styling-theming.ts`
- **Raptor Markdown Docs**: the `ml-docs-raptor` docs extension (`client/_static/markdown/`)
