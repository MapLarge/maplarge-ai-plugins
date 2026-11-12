# Data Table - Options - Options and more

<!-- Automatically generated, do not edit -->

Configure a Data Table by passing options to either:

- `s.dataTable(dataTableOptions<TRow>({... }))` on the View
- `createDataTable({... })` on the ViewModel - returns `{ options, store }`

View and ViewModel options merge; the View wins per key, except that lists join and columns merge by key.

Lists join with the ViewModel entries first, and object options merge key by key with the View winning on a collision. The lists that join are integrations, columnRules, discoveredColumnRules, filterControls, cellContextMenuItems, headerContextMenuItems and overlaySlots; the objects and keyed maps that merge key by key are theme, configurator, formatters and cellEditors.

## Options

Each box lists everything that surface accepts. Each key links to its detail page, and the badges show which authoring arms it takes there; see Authoring Arms below.

### View

**s.dataTable({ ... }) options (View)**:

| Property | Arms | Description | Example |
| --- | --- | --- | --- |
| `data` | V B | Data engine; where data comes from. | `dataTable.view.data.dataStoreData({ dataStore: { binding: "dataStore" }, dataSourceName: "busstops" })` |
| `schema` | V B | Field types and schema-level behaviors. In a View it may also be { binding } naming a ViewModel member that holds the schema. | `dataTable.view.schema.createSchema({ entries: { id: schema.number(), name: schema.string() } })` |
| `defaultSort` | V B | Initial sort column and direction. | `{ key: "name", direction: "asc" }` |
| `maxCachedSegments` | V B | Maximum row segments kept in the client cache. | `50` |
| `maxNeedsLoadingSegments` | V B | Most row segments kept waiting to be loaded at once (default 2). While scrolling fast, older waiting segments are dropped and requested again if the user scrolls back to them. | `10` |
| `columns` | V | Column definitions (data, virtual, and display options). | `[column({ field: "name", header: "Name" })]` |
| `columnRules` | V | Declarative rules applied to explicitly defined columns. | `[{ match: { type: "regex", pattern: "^metric" }, sideEffects: { width: toPixels(120), sort: true, filtering: true } }]` |
| `discoveredColumnRules` | V | Declarative rules applied to columns discovered at runtime. | `[{ match: { type: "regex", pattern: "^metric" }, sideEffects: { width: toPixels(100), filtering: true } }]` |
| `columnOrder` | V | Column keys to show first, in this order; other columns follow in their existing order and unknown keys are ignored. | `["region", "revenue"]` |
| `columnPlacement` | V | Where discovered columns go: "authoredFirst" (default) puts defined columns first; "source" follows the data source's order and customizes defined columns in place. | `"source"` |
| `rowScrolling` | V B | Row scrolling strategy: virtualScroll or infiniteScroll, or a registered custom engine. | `dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 })` |
| `rowSlots` | V B | How row DOM slots are allocated and recycled. | `dataTable.view.rowSlots.virtualizedRows({ slots: 200 })` |
| `columnSlots` | V B | How column DOM slots are allocated and recycled. | `dataTable.view.columnSlots.virtualizedColumns({ maxColumnCount: 50 })` |
| `rowHeightHeuristic` | V B | Heuristic used to estimate row height before measurement. | `dataTable.view.rowHeightHeuristic.linearScan()` |
| `filtering` | V B | Filtering UI engine. | `dataTable.view.filtering.dialogFiltering()` |
| `filterControls` | V | Additional filter control widgets. | `[{ columnType: "number", operators: ["Equal"], control: "MultiValue" }]` |
| `filterIndicators` | V | Active-filter indicators in the header and below the table. | `{ headerCell: dataTable.view.filterIndicators.filterFunnelIndicator(), belowGrid: dataTable.view.filterIndicators.filterChipsIndicator() }` |
| `filterIndicators.headerCell` | V B | Per-column header filter indicator. | `dataTable.view.filterIndicators.filterFunnelIndicator()` |
| `filterIndicators.belowGrid` | V B | Below-table active filter chips. | `dataTable.view.filterIndicators.filterChipsIndicator()` |
| `getGlobalUserContext` | B | ViewModel hook that supplies user context to the built-in date formatters and cell editors. It returns { getTimezone, getUserPreference }, which the filter dialog and the column picker also use; it is not passed to cell templates. | `{ binding: "userContext" }` |
| `editable` | V B | Whether the table allows cell editing. It takes true, an EditableConfig, or in a View { binding } naming a ViewModel member that holds one. A method named by the binding is not called. Only editable.optimisticUpdate takes a rule. | `true` |
| `onRowUpdate` | B | Called when an edited row is committed. It runs after the data engine saves the row. | `{ binding: "handleRowUpdate" }` |
| `onRowDelete` | B | Accepted but not called at present. Deletes save through the data engine's removeRow and removeRows. | `{ binding: "handleRowDelete" }` |
| `onRowCreate` | B | Accepted but not called at present. Inserts save through the data engine's createRow. | `{ binding: "handleRowCreate" }` |
| `cellContextMenu` | V B | Cell context menu engine. | `dataTable.view.contextMenu.cellContextMenuEngine()` |
| `headerContextMenu` | V B | Header context menu engine. | `dataTable.view.contextMenu.headerContextMenuEngine()` |
| `cellContextMenuItems` | V B | Contributors that add items to the cell context menu. In a View each is { binding } naming a ViewModel method; in createDataTable each is the function itself. | `[{ binding: "extraCellItems" }]` |
| `headerContextMenuItems` | V B | Contributors that add items to the header context menu. In a View each is { binding } naming a ViewModel method; in createDataTable each is the function itself. | `[{ binding: "extraHeaderItems" }]` |
| `arrangeCellContextMenuItems` | B | Reorder or filter cell context menu items before display. | `{ binding: "arrangeCellItems" }` |
| `arrangeHeaderContextMenuItems` | B | Reorder or filter header context menu items before display. | `{ binding: "arrangeHeaderItems" }` |
| `contextMenuScrollDismissX` | V B | Horizontal scroll distance that dismisses an open context menu. | `50` |
| `contextMenuScrollDismissY` | V B | Vertical scroll distance that dismisses an open context menu. | `50` |
| `tableSelection` | V B | Cell and row selection engine. | `dataTable.view.tableSelection.row()` |
| `checkboxRows` | V B | Checkbox column for row selection. | `{ showSelectAll: true }` |
| `rowStriping` | V B | Alternating row background striping. | `true` |
| `blockArrowKeydownPropagation` | V B | Stop arrow-key events from bubbling out of the table. | `true` |
| `suppressSortLoadingOverlay` | V B | Hide the loading overlay while a sort is in flight. | `true` |
| `theme` | V | Visual theme tokens for the table chrome. | `{ rowThemes: [{ rule: { where: { field: "severity", test: "Equal", value: "critical" }, applyValue: { customCssClasses: "bg-danger" } } }] }` |
| `configurator` | V | Column configurator panel. | `{ enabled: true, engine: dataTable.view.configurator.contextMenuConfigurator() }` |
| `configurator.enabled` | V B | Whether the column configurator is shown. | `true` |
| `configurator.engine` | V B | Configurator panel engine implementation. | `dataTable.view.configurator.contextMenuConfigurator()` |
| `integrations` | V | Wire the table to things outside it, such as a map, and let each one narrow or react to its rows. | `[{ engine: dataTable.view.integrations.mapViewportSync({ mapId: "abc123" }) }]` |
| `emptyColumns` | V | How hideEmptyColumns / showEmptyColumns decide which columns are empty. | `{ watch: true, engine: dataTable.view.emptyColumns.dataEngineEmptyColumns() }` |
| `statusBar` | V B | Status bar text, formatting, and data freshness. | `dataTable.view.statusBar.viewportCountStatusBar({ showDataFreshness: true })` |
| `statusBar.formatStatusText` | B | Format the status bar row-count text. | `{ binding: "formatStatusText" }` |
| `statusBar.contentTemplates` | B | Custom status bar content template. | `{ binding: "renderStatus" }` |
| `footer` | V B | Footer content beside the status bar: your own markup, or the built-in toolbar. | `dataTable.view.footer.footerToolbar({ showSyncWithViewport: true, showExport: true })` |
| `onExport` | B | What exporting does, for every trigger - the toolbar button, your own button, or a dispatched exportData. Defaults to opening the standard export dialog on the table's current view. The default works on dataSourceData and dataStoreData only; on other engines it does nothing but warn. | `{ binding: "exportGrid" }` |
| `overlays` | V B | Table overlay engine. | `{ loading: dataTable.view.overlays.floatingBoxOverlayEngine({ text: "Loading...", spinner: true }) }` |
| `overlaySlots` | V | Named overlay slot definitions. | `[{ type: "maintenance", cssClass: "ml-dt-maintenance-overlay" }]` |
| `debugHud` | V B | On-screen debug HUD for table internals. | `{ enabled: true }` |
| `storage` | V B | User preference persistence engine. | `dataTable.view.storage.localStore({ prefix: "myTable" })` |
| `compareOptionsFunc` | B | Custom comparator for successive config snapshots during reconciliation. It decides whether a newly assigned options object counts as different from the one the table is bound to: return true when they are the same (no rebuild). Default: the same only when it is the same object; null opts out. | `{ binding: "compareOptions" }` |
| `ruleReevaluationScope` | V | When declarative rules are re-checked as table state changes (`patchOnly` vs `all`). | `"patchOnly"` |
| `testIds` | V B | Emit `data-test-id` attributes for automated tests. | `true` |
| `viewportOnlyEvaluation` | V B | Evaluate bindings only for rows and columns in the viewport. | `true` |
| `columnMountBudgetMs` | V B | Per-frame time budget for mounting column cells. | `8` |
| `bindingEvalBudgetMs` | V B | Per-frame time budget for binding evaluation. | `8` |
| `wheelGlideWindowMs` | V B | Wheel-scroll glide window duration. | `150` |
| `rowRecycleBuffer` | V B | Extra rows kept mounted above and below the viewport. | `10` |
| `extraColumnBuffer` | V B | Extra columns mounted beyond the visible viewport. | `2` |
| `debugHudCounterMax` | V B | Maximum value shown on debug HUD counters. | `5000` |
| `scrollSettleDebounceMs` | V B | Debounce before treating scroll as settled. | `150` |

### ViewModel

Everything the View accepts, plus some ViewModel-only features.

**createDataTable({ ... }) options (ViewModel)**:

| Property | Arms | Description | Example |
| --- | --- | --- | --- |
| `data` | V | Data engine; where data comes from. | `dataTable.viewModel.data.dataStoreData({ dataStore: this.dataStore, dataSourceName: "busstops" })` |
| `schema` | V | Field types and schema-level behaviors. In a View it may also be { binding } naming a ViewModel member that holds the schema. | `dataTable.viewModel.schema.createSchema({ entries: { id: schema.number(), name: schema.string() } })` |
| `defaultSort` | V | Initial sort column and direction. | `{ key: "name", direction: "asc" }` |
| `maxCachedSegments` | V | Maximum row segments kept in the client cache. | `50` |
| `maxNeedsLoadingSegments` | V | Most row segments kept waiting to be loaded at once (default 2). While scrolling fast, older waiting segments are dropped and requested again if the user scrolls back to them. | `10` |
| `columns` | V | Column definitions (data, virtual, and display options). | `[column({ field: "name", header: "Name" })]` |
| `columnRules` | V | Declarative rules applied to explicitly defined columns. | `[{ match: { type: "regex", pattern: "^metric" }, sideEffects: { width: toPixels(120), sort: true, filtering: true } }]` |
| `discoveredColumnRules` | V | Declarative rules applied to columns discovered at runtime. | `[{ match: { type: "regex", pattern: "^metric" }, sideEffects: { width: toPixels(100), filtering: true } }]` |
| `columnOrder` | V | Column keys to show first, in this order; other columns follow in their existing order and unknown keys are ignored. | `["region", "revenue"]` |
| `columnPlacement` | V | Where discovered columns go: "authoredFirst" (default) puts defined columns first; "source" follows the data source's order and customizes defined columns in place. | `"source"` |
| `columnTypeDefinitions` | V | Map custom schema column types to descriptor factories. | `{ money: () => ({ type: "Number" }) }` |
| `descriptors` | V | Per-field descriptor map; derives schema and base columns at construction. | `dataTable.viewModel.columns.defineColumnDescriptors<Row>()({ name: { type: "Text", label: "Name" } })` |
| `descriptorAdapter` | V | Override how descriptors are converted to schema and columns. | `({ descriptors }) => dataTable.viewModel.columns.schemaAndColumnsFromDescriptors({ descriptors })` |
| `rowScrolling` | V | Row scrolling strategy: virtualScroll or infiniteScroll, or a registered custom engine. | `dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(32) })` |
| `rowSlots` | V | How row DOM slots are allocated and recycled. | `dataTable.viewModel.rowSlots.virtualizedRows({ slots: 200 })` |
| `columnSlots` | V | How column DOM slots are allocated and recycled. | `dataTable.viewModel.columnSlots.virtualizedColumns({ maxColumnCount: 50 })` |
| `rowHeightHeuristic` | V | Heuristic used to estimate row height before measurement. | `dataTable.viewModel.rowHeightHeuristic.linearScan()` |
| `filtering` | V | Filtering UI engine. | `dataTable.viewModel.filtering.dialogFiltering()` |
| `filterControls` | V | Additional filter control widgets. | `[{ columnType: "number", operators: ["Equal"], control: "MultiValue" }]` |
| `filterIndicators` | V | Active-filter indicators in the header and below the table. | `{ headerCell: dataTable.viewModel.filterIndicators.filterFunnelIndicator(), belowGrid: dataTable.viewModel.filterIndicators.filterChipsIndicator() }` |
| `filterIndicators.headerCell` | V | Per-column header filter indicator. | `dataTable.viewModel.filterIndicators.filterFunnelIndicator()` |
| `filterIndicators.belowGrid` | V | Below-table active filter chips. | `dataTable.viewModel.filterIndicators.filterChipsIndicator()` |
| `formatters` | V | Custom formatter registry. | `{ bps: bpsFormatter }` |
| `cellEditors` | V | Custom cell editor registry. | `{ myEditor: myEditorRegistration }` |
| `getGlobalUserContext` | V | ViewModel hook that supplies user context to the built-in date formatters and cell editors. It returns { getTimezone, getUserPreference }, which the filter dialog and the column picker also use; it is not passed to cell templates. | `() => ({ getTimezone: () => "America/New_York", getUserPreference: (_key: string) => undefined })` |
| `editable` | V | Whether the table allows cell editing. It takes true, an EditableConfig, or in a View { binding } naming a ViewModel member that holds one. A method named by the binding is not called. Only editable.optimisticUpdate takes a rule. | `true` |
| `onRowUpdate` | V | Called when an edited row is committed. It runs after the data engine saves the row. | `async ({ row, changedFields }) => { await saveRow(row, changedFields); }` |
| `onRowDelete` | V | Accepted but not called at present. Deletes save through the data engine's removeRow and removeRows. | `async ({ row }) => { await deleteRow(row); }` |
| `onRowCreate` | V | Accepted but not called at present. Inserts save through the data engine's createRow. | `async ({ row }) => { await createRow(row); }` |
| `cellContextMenu` | V | Cell context menu engine. | `dataTable.viewModel.contextMenu.cellContextMenuEngine()` |
| `headerContextMenu` | V | Header context menu engine. | `dataTable.viewModel.contextMenu.headerContextMenuEngine()` |
| `cellContextMenuItems` | V | Contributors that add items to the cell context menu. In a View each is { binding } naming a ViewModel method; in createDataTable each is the function itself. | `[({ displayText }) => [{ type: "action", label: "Search: " + displayText, onClick: () => this.search(displayText) }]]` |
| `headerContextMenuItems` | V | Contributors that add items to the header context menu. In a View each is { binding } naming a ViewModel method; in createDataTable each is the function itself. | `[({ column }) => [{ type: "action", label: "Export " + column.key, onClick: () => this.exportColumn(column.key) }]]` |
| `arrangeCellContextMenuItems` | V | Reorder or filter cell context menu items before display. | `(items) => [...items].reverse()` |
| `arrangeHeaderContextMenuItems` | V | Reorder or filter header context menu items before display. | `(items) => [...items].sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""))` |
| `contextMenuScrollDismissX` | V | Horizontal scroll distance that dismisses an open context menu. | `50` |
| `contextMenuScrollDismissY` | V | Vertical scroll distance that dismisses an open context menu. | `50` |
| `tableSelection` | V | Cell and row selection engine. | `dataTable.viewModel.tableSelection.overlaySelection({ type: "row" })` |
| `checkboxRows` | V | Checkbox column for row selection. | `{ showSelectAll: true }` |
| `rowStriping` | V | Alternating row background striping. | `true` |
| `blockArrowKeydownPropagation` | V | Stop arrow-key events from bubbling out of the table. | `true` |
| `suppressSortLoadingOverlay` | V | Hide the loading overlay while a sort is in flight. | `true` |
| `theme` | V | Visual theme tokens for the table chrome. | `{ rowThemes: [{ callback: ({ row }) => (row.severity === "critical" ? { customCssClasses: "bg-danger" } : undefined) }] }` |
| `configurator` | V | Column configurator panel. | `{ enabled: true, engine: dataTable.viewModel.configurator.contextMenuConfigurator() }` |
| `configurator.enabled` | V | Whether the column configurator is shown. | `true` |
| `configurator.engine` | V | Configurator panel engine implementation. | `dataTable.viewModel.configurator.contextMenuConfigurator()` |
| `integrations` | V | Wire the table to things outside it, such as a map, and let each one narrow or react to its rows. | `[{ engine: dataTable.viewModel.integrations.mapViewportSync({ mapId: "abc123" }) }]` |
| `emptyColumns` | V | How hideEmptyColumns / showEmptyColumns decide which columns are empty. | `{ watch: true, engine: dataTable.viewModel.emptyColumns.dataEngineEmptyColumns() }` |
| `statusBar` | V | Status bar text, formatting, and data freshness. | `dataTable.viewModel.statusBar.viewportCountStatusBar({ showDataFreshness: true })` |
| `statusBar.formatStatusText` | V | Format the status bar row-count text. | `({ firstVisible, lastVisible, totalRows }) => "Rows " + (firstVisible + 1) + "-" + (lastVisible + 1) + " of " + (totalRows ?? "?")` |
| `statusBar.contentTemplates` | V | Custom status bar content template. | `(context) => { context.scriptor.span({ text: "Custom status" }); }` |
| `footer` | V | Footer content beside the status bar: your own markup, or the built-in toolbar. | `dataTable.viewModel.footer.footerToolbar({ showSyncWithViewport: true, showExport: true })` |
| `onExport` | V | What exporting does, for every trigger - the toolbar button, your own button, or a dispatched exportData. Defaults to opening the standard export dialog on the table's current view. The default works on dataSourceData and dataStoreData only; on other engines it does nothing but warn. | `() => this.exportGrid()` |
| `overlays` | V | Table overlay engine. | `{ loading: dataTable.viewModel.overlays.floatingBoxOverlayEngine({ text: "Loading...", spinner: true }) }` |
| `overlaySlots` | V | Named overlay slot definitions. | `[{ type: "maintenance", cssClass: "ml-dt-maintenance-overlay" }]` |
| `debugHud` | V | On-screen debug HUD for table internals. | `{ enabled: true }` |
| `storage` | V | User preference persistence engine. | `dataTable.viewModel.storage.localStore({ prefix: "myTable" })` |
| `compareOptionsFunc` | V | Custom comparator for successive config snapshots during reconciliation. It decides whether a newly assigned options object counts as different from the one the table is bound to: return true when they are the same (no rebuild). Default: the same only when it is the same object; null opts out. | `(a, b) => a.dataState.dataEngine === (b as typeof a).dataState.dataEngine` |
| `ruleReevaluationScope` | V | When declarative rules are re-checked as table state changes (`patchOnly` vs `all`). | `"patchOnly"` |
| `testIds` | V | Emit `data-test-id` attributes for automated tests. | `true` |
| `viewportOnlyEvaluation` | V | Evaluate bindings only for rows and columns in the viewport. | `true` |
| `columnMountBudgetMs` | V | Per-frame time budget for mounting column cells. | `8` |
| `bindingEvalBudgetMs` | V | Per-frame time budget for binding evaluation. | `8` |
| `wheelGlideWindowMs` | V | Wheel-scroll glide window duration. | `150` |
| `rowRecycleBuffer` | V | Extra rows kept mounted above and below the viewport. | `10` |
| `extraColumnBuffer` | V | Extra columns mounted beyond the visible viewport. | `2` |
| `debugHudCounterMax` | V | Maximum value shown on debug HUD counters. | `5000` |
| `scrollSettleDebounceMs` | V | Debounce before treating scroll as settled. | `150` |
| `engines` | V | Register custom engine factories the View can select by name. | `{ storage: { sessionStorage: (args: { key: string }) => new SessionStorageEngine(args.key) } }` |

## Helper API

dataTable.view.\*

| - | - |
| --- | --- |
| data.\* | // Data engines. |
| schema.\* | // Schema builders; static entries or discovered from data. |
| defineColumns.\* | // Typed { column, virtualColumn } helpers for a row type. |
| rowScrolling.\* | // Row scrolling engines. |
| rowHeightEstimate.\* | // Row height estimate engines. |
| zoneSize.\* | // Scroll zone sizing engines. |
| columnSlots.\* | // Column slot engines. |
| rowSlots.\* | // Row slot engines. |
| rowHeightHeuristic.\* | // Row height heuristics. |
| tableSelection.\* | // Selection engines. |
| filtering.\* | // Filtering engines. |
| filterIndicators.\* | // Filter indicators. |
| configurator.\* | // Configurator engines. |
| emptyColumns.\* | // Empty-column engines. |
| statusBar.\* | // Status bar engines. |
| overlays.\* | // Overlay engines. |
| storage.\* | // Persistence engines. |
| contextMenu.\* | // Context menu engines. |
| columns.\* | // Column definition helpers. |
| operators.\* | // Filter operator sets. |
| editing.\* | // Cell editor helpers. |

dataTable.viewModel.\*

| - | - |
| --- | --- |
| data.\* | // Data engine factories. |
| schema.\* | // Schema builders. |
| defineColumns.\* | // Typed { column, virtualColumn } helpers for a row type. |
| rowScrolling.\* | // Row scrolling engines. |
| rowHeightEstimate.\* | // Row height estimate engines. |
| zoneSize.\* | // Scroll zone sizing engines. |
| columnSlots.\* | // Column slot engines. |
| rowSlots.\* | // Row slot engines. |
| rowHeightHeuristic.\* | // Row height heuristics. |
| filtering.\* | // Filtering engines. |
| filterIndicators.\* | // Filter indicators. |
| tableSelection.\* | // Selection engines. |
| configurator.\* | // Configurator engines. |
| emptyColumns.\* | // Empty-column engines. |
| statusBar.\* | // Status bar engines. |
| overlays.\* | // Overlay engines. |
| storage.\* | // Persistence engines. |
| columns.\* | // Column definition helpers. |
| descriptors.\* | // Descriptor utilities. |
| columnTypes.\* | // Custom column type definitions. |
| operators.\* | // Filter operator sets. |
| editing.\* | // Cell editor helpers. |
| contextMenu.\* | // Context menu engines. |
| actions.\* | // Store action creators (sort, setFilter, refresh, ...). |

## Configuration Concepts

Creating a data table involves three core concepts:

### Schema

Defines field types and data behaviors (filtering/edit metadata). You can build schema statically or discover it at runtime.

### Columns

Defines what users see in the UI: headers, widths, alignment, custom cell content, and interactions.

### Descriptors

Convenience layer that defines field metadata and generates schema and columns automatically from descriptor definitions.

## Authoring arms

Most options can be authored three ways:

A literal value.

**V**:

```ts
rowStriping: true,
```

The same ViewModel method, named from the View or passed directly.

**B**:

```ts
// View
column({
  field: "status",
  header: "Status",
  contentTemplates: { binding: "renderStatusBadge" },
}),

// ViewModel
renderStatusBadge({ s, bindingPaths }: CellContext<Row, "status">): void {
  s.span({
    badge: true,
    background: "info",
    bindings: { text: bindingPaths.displayValue },
  });
}
```

A declarative rule replaces a binding with a serializable `{ where, applyValue }` object. The framework evaluates where; when it matches, the option uses applyValue.

### DeclarativeRule shape

| Property | Type | Description |
| --- | --- | --- |
| where | WhereCondition | Condition evaluated against the rule subject. When true, applyValue is used. |
| applyValue | T | Option value applied when where matches. When where does not match, the option is unset and the framework default applies. |

#### Table Context Fields

| Field | Type | Description |
| --- | --- | --- |
| rowCount | number \| undefined | Total resolved row count, or undefined when the data engine has not reported one yet. |
| isFiltered | boolean | True when any column filter is active. |
| isSorted | boolean | True when any sort is active, including defaultSort. |
| visibleColumnCount | number | Number of columns in the table's column order; hidden columns (hide: true or hidden by the user) still count. |

#### WhereCondition Shapes

| Shape | Syntax | Description |
| --- | --- | --- |
| Leaf | { field: string, test: FilterTest, value?: unknown } | Compares subject[field] using test. Omit value for IsNull / IsNotNull. |
| Composite | { logic: "and" \| "or", filters: WhereCondition[] } | AND requires every child to match; OR requires at least one child to match. |

#### Filter tests

Leaf conditions use test to pick the comparison. value is required for most tests:

| test | value | Description |
| --- | --- | --- |
| Equal | comparable | Subject equals value. |
| EqualNot | comparable | Subject does not equal value. |
| Greater | comparable | Subject is greater than value. |
| GreaterOR | comparable | Subject is greater than or equal to value. |
| Less | comparable | Subject is less than value. |
| LessOR | comparable | Subject is less than or equal to value. |
| Contains | string | Subject string contains value (case-insensitive). |
| ContainsAny | array | Subject contains any value in the array (substring match for strings, includes for arrays). |
| StartsWith | string | Subject string starts with value. |
| StartsWithNot | string | Subject string does not start with value. |
| Between | range | Subject is within value. Use a two-element array or a "start/end" string. |
| NotBetween | range | Subject is outside value. Same range format as Between. |
| EqualAny | array | Subject equals any entry in the array. |
| DistinctValues | array | Same as EqualAny. |
| IsNull | - | Subject is null or undefined. |
| IsNotNull | - | Subject is not null or undefined. |
| Matches | regex string | Subject matches the case-insensitive regular expression in value. |

#### Composite example

**Composite Where Example Code**:

```ts
rowStriping: {
  where: {
    logic: "and",
    filters: [
      { field: "rowCount", test: "Greater", value: 0 },
      { field: "isFiltered", test: "Equal", value: false },
    ],
  },
  applyValue: true,
},
```

**R**:

```ts
rowStriping: {
  where: { field: "rowCount", test: "Greater", value: 10 },
  applyValue: true,
},

// when the rule does not match, rowStriping is left unset and its default (on) applies
```
