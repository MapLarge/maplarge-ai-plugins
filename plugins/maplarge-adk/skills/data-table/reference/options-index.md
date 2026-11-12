# Data Table options index

<!-- Automatically generated, do not edit -->

Every option is one row: search this file for the option name rather than reading it whole.

Arms: V = a literal value (or `{ strategy, args }` for engines in the View), B = `{ binding: "name" }` naming a ViewModel member. Never invent an option name; if it is not here, it does not exist. Features the table lacks, with what to do instead, are under Not supported in `SKILL.md`.

## Table options

| Option | Arms | Description | Example | Reference doc |
| --- | --- | --- | --- | --- |
| `arrangeCellContextMenuItems` | B in a View, V in createDataTable | Reorder or filter cell context menu items before display. | `{ binding: "arrangeCellItems" }` | `context-menus-context-menu-engines` |
| `arrangeHeaderContextMenuItems` | B in a View, V in createDataTable | Reorder or filter header context menu items before display. | `{ binding: "arrangeHeaderItems" }` | `context-menus-context-menu-engines` |
| `bindingEvalBudgetMs` | V B | Per-frame time budget for binding evaluation. | `8` | `performance` |
| `blockArrowKeydownPropagation` | V B | Stop arrow-key events from bubbling out of the table. | `true` | `scrolling-row-scroll-engines` |
| `cellContextMenu` | V B | Cell context menu engine. | `dataTable.view.contextMenu.cellContextMenuEngine()` | `context-menus-context-menu-engines` |
| `cellContextMenuItems` | V B | Contributors that add items to the cell context menu. In a View each is { binding } naming a ViewModel method; in createDataTable each is the function itself. | `[{ binding: "extraCellItems" }]` | `context-menus-context-menu-engines` |
| `cellEditors` | V (ViewModel only) | Custom cell editor registry. | `{ myEditor: myEditorRegistration }` | `cell-editing-global-editable-config` |
| `checkboxRows` | V B | Checkbox column for row selection. | `{ showSelectAll: true }` | `cell-selection-selection-engines` |
| `columnMountBudgetMs` | V B | Per-frame time budget for mounting column cells. | `8` | `performance` |
| `columnOrder` | V | Column keys to show first, in this order; other columns follow in their existing order and unknown keys are ignored. | `["region", "revenue"]` | `columns-column-types` |
| `columnPlacement` | V | Where discovered columns go: "authoredFirst" (default) puts defined columns first; "source" follows the data source's order and customizes defined columns in place. | `"source"` | `columns-column-types` |
| `columnRules` | V | Declarative rules applied to explicitly defined columns. | `[{ match: { type: "regex", pattern: "^metric" }, sideEffects: { width: toPixels(120), sort: true, filtering: true } }]` | `columns-column-types` |
| `columns` | V | Column definitions (data, virtual, and display options). | `[column({ field: "name", header: "Name" })]` | `columns-column-types` |
| `columnSlots` | V B | How column DOM slots are allocated and recycled. | `dataTable.view.columnSlots.virtualizedColumns({ maxColumnCount: 50 })` | `column-slots-column-slot-engines` |
| `columnTypeDefinitions` | V (ViewModel only) | Map custom schema column types to descriptor factories. | `{ money: () => ({ type: "Number" }) }` | `descriptors` |
| `compareOptionsFunc` | B in a View, V in createDataTable | Custom comparator for successive config snapshots during reconciliation. It decides whether a newly assigned options object counts as different from the one the table is bound to: return true when they are the same (no rebuild). Default: the same only when it is the same object; null opts out. | `{ binding: "compareOptions" }` | `options-options` |
| `configurator` | V | Column configurator panel. | `{ enabled: true, engine: dataTable.view.configurator.contextMenuConfigurator() }` | `configurator-built-in-menu-items` |
| `configurator.enabled` | V B | Whether the column configurator is shown. | `true` | `configurator-built-in-menu-items` |
| `configurator.engine` | V B | Configurator panel engine implementation. | `dataTable.view.configurator.contextMenuConfigurator()` | `configurator-built-in-menu-items` |
| `contextMenuScrollDismissX` | V B | Horizontal scroll distance that dismisses an open context menu. | `50` | `context-menus-context-menu-engines` |
| `contextMenuScrollDismissY` | V B | Vertical scroll distance that dismisses an open context menu. | `50` | `context-menus-context-menu-engines` |
| `data` | V B | Data engine; where data comes from. | `dataTable.view.data.dataStoreData({ dataStore: { binding: "dataStore" }, dataSourceName: "busstops" })` | `data-data-engines` |
| `debugHud` | V B | On-screen debug HUD for table internals. | `{ enabled: true }` | `debug-hud` |
| `debugHudCounterMax` | V B | Maximum value shown on debug HUD counters. | `5000` | `debug-hud` |
| `defaultSort` | V B | Initial sort column and direction. | `{ key: "name", direction: "asc" }` | `data-data-engines` |
| `descriptorAdapter` | V (ViewModel only) | Override how descriptors are converted to schema and columns. | `({ descriptors }) => dataTable.viewModel.columns.schemaAndColumnsFromDescriptors({ descriptors })` | `descriptors` |
| `descriptors` | V (ViewModel only) | Per-field descriptor map; derives schema and base columns at construction. | `dataTable.viewModel.columns.defineColumnDescriptors<Row>()({ name: { type: "Text", label: "Name" } })` | `descriptors` |
| `discoveredColumnRules` | V | Declarative rules applied to columns discovered at runtime. | `[{ match: { type: "regex", pattern: "^metric" }, sideEffects: { width: toPixels(100), filtering: true } }]` | `columns-column-types` |
| `editable` | V B | Whether the table allows cell editing. It takes true, an EditableConfig, or in a View { binding } naming a ViewModel member that holds one. A method named by the binding is not called. Only editable.optimisticUpdate takes a rule. | `true` | `cell-editing-global-editable-config` |
| `emptyColumns` | V | How hideEmptyColumns / showEmptyColumns decide which columns are empty. | `{ watch: true, engine: dataTable.view.emptyColumns.dataEngineEmptyColumns() }` | `columns-column-types` |
| `engines` | V (ViewModel only) | Register custom engine factories the View can select by name. | `{ storage: { sessionStorage: (args: { key: string }) => new SessionStorageEngine(args.key) } }` | `persistence` |
| `extraColumnBuffer` | V B | Extra columns mounted beyond the visible viewport. | `2` | `performance` |
| `filterControls` | V | Additional filter control widgets. | `[{ columnType: "number", operators: ["Equal"], control: "MultiValue" }]` | `filtering-column-filter-configuration` |
| `filterIndicators` | V | Active-filter indicators in the header and below the table. | `{ headerCell: dataTable.view.filterIndicators.filterFunnelIndicator(), belowGrid: dataTable.view.filterIndicators.filterChipsIndicator() }` | `filtering-column-filter-configuration` |
| `filterIndicators.belowGrid` | V B | Below-table active filter chips. | `dataTable.view.filterIndicators.filterChipsIndicator()` | `filtering-column-filter-configuration` |
| `filterIndicators.headerCell` | V B | Per-column header filter indicator. | `dataTable.view.filterIndicators.filterFunnelIndicator()` | `filtering-column-filter-configuration` |
| `filtering` | V B | Filtering UI engine. | `dataTable.view.filtering.dialogFiltering()` | `filtering-column-filter-configuration` |
| `footer` | V B | Footer content beside the status bar: your own markup, or the built-in toolbar. | `dataTable.view.footer.footerToolbar({ showSyncWithViewport: true, showExport: true })` | `status-bar-status-bar` |
| `formatters` | V (ViewModel only) | Custom formatter registry. | `{ bps: bpsFormatter }` | `cells-and-content` |
| `getGlobalUserContext` | B in a View, V in createDataTable | ViewModel hook that supplies user context to the built-in date formatters and cell editors. It returns { getTimezone, getUserPreference }, which the filter dialog and the column picker also use; it is not passed to cell templates. | `{ binding: "userContext" }` | `cells-and-content` |
| `headerContextMenu` | V B | Header context menu engine. | `dataTable.view.contextMenu.headerContextMenuEngine()` | `context-menus-context-menu-engines` |
| `headerContextMenuItems` | V B | Contributors that add items to the header context menu. In a View each is { binding } naming a ViewModel method; in createDataTable each is the function itself. | `[{ binding: "extraHeaderItems" }]` | `context-menus-context-menu-engines` |
| `integrations` | V | Wire the table to things outside it, such as a map, and let each one narrow or react to its rows. | `[{ engine: dataTable.view.integrations.mapViewportSync({ mapId: "abc123" }) }]` | `integrations` |
| `integrations[].enabled` | V B | Whether this integration is running (true by default). It takes true, false, or { binding } naming a ViewModel boolean. A rule here is not evaluated, so the integration stays on. | `false` | `integrations` |
| `integrations[].engine` | V B | What the table is wired to, and what it does with it. | `dataTable.view.integrations.mapViewportSync({ mapId: "abc123" })` | `integrations` |
| `integrations[].key` | V B | Toggle identity, defaulting to the integration's own key. That is mapViewportSync for the built-in. An integration without its own key gets integration-\<position in the list>; set it on every custom entry you toggle. | `"followMainMap"` | `integrations` |
| `maxCachedSegments` | V B | Maximum row segments kept in the client cache. | `50` | `performance` |
| `maxNeedsLoadingSegments` | V B | Most row segments kept waiting to be loaded at once (default 2). While scrolling fast, older waiting segments are dropped and requested again if the user scrolls back to them. | `10` | `performance` |
| `onExport` | B in a View, V in createDataTable | What exporting does, for every trigger - the toolbar button, your own button, or a dispatched exportData. Defaults to opening the standard export dialog on the table's current view. The default works on dataSourceData and dataStoreData only; on other engines it does nothing but warn. | `{ binding: "exportGrid" }` | `status-bar-status-bar` |
| `onRowCreate` | B in a View, V in createDataTable | Accepted but not called at present. Inserts save through the data engine's createRow. | `{ binding: "handleRowCreate" }` | `crud-overview` |
| `onRowDelete` | B in a View, V in createDataTable | Accepted but not called at present. Deletes save through the data engine's removeRow and removeRows. | `{ binding: "handleRowDelete" }` | `crud-overview` |
| `onRowUpdate` | B in a View, V in createDataTable | Called when an edited row is committed. It runs after the data engine saves the row. | `{ binding: "handleRowUpdate" }` | `crud-overview` |
| `overlays` | V B | Table overlay engine. | `{ loading: dataTable.view.overlays.floatingBoxOverlayEngine({ text: "Loading...", spinner: true }) }` | `overlays-overlay-engines` |
| `overlaySlots` | V | Named overlay slot definitions. | `[{ type: "maintenance", cssClass: "ml-dt-maintenance-overlay" }]` | `overlays-overlay-engines` |
| `rowHeightHeuristic` | V B | Heuristic used to estimate row height before measurement. | `dataTable.view.rowHeightHeuristic.linearScan()` | `scrolling-row-scroll-engines` |
| `rowRecycleBuffer` | V B | Extra rows kept mounted above and below the viewport. | `10` | `performance` |
| `rowScrolling` | V B | Row scrolling strategy: virtualScroll or infiniteScroll, or a registered custom engine. | `dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 32 })` | `scrolling-row-scroll-engines` |
| `rowSlots` | V B | How row DOM slots are allocated and recycled. | `dataTable.view.rowSlots.virtualizedRows({ slots: 200 })` | `row-slots-virtualized-rows` |
| `rowStriping` | V B | Alternating row background striping. | `true` | `options-options` |
| `ruleReevaluationScope` | V | When declarative rules are re-checked as table state changes (`patchOnly` vs `all`). | `"patchOnly"` | `options-options` |
| `schema` | V B | Field types and schema-level behaviors. In a View it may also be { binding } naming a ViewModel member that holds the schema. | `dataTable.view.schema.createSchema({ entries: { id: schema.number(), name: schema.string() } })` | `schema-schema-types` |
| `scrollSettleDebounceMs` | V B | Debounce before treating scroll as settled. | `150` | `scrolling-row-scroll-engines` |
| `statusBar` | V B | Status bar text, formatting, and data freshness. | `dataTable.view.statusBar.viewportCountStatusBar({ showDataFreshness: true })` | `status-bar-status-bar` |
| `statusBar.contentTemplates` | B in a View, V in createDataTable | Custom status bar content template. | `{ binding: "renderStatus" }` | `status-bar-status-bar` |
| `statusBar.formatStatusText` | B in a View, V in createDataTable | Format the status bar row-count text. | `{ binding: "formatStatusText" }` | `status-bar-status-bar` |
| `storage` | V B | User preference persistence engine. | `dataTable.view.storage.localStore({ prefix: "myTable" })` | `persistence` |
| `suppressSortLoadingOverlay` | V B | Hide the loading overlay while a sort is in flight. | `true` | `overlays-overlay-engines` |
| `tableSelection` | V B | Cell and row selection engine. | `dataTable.view.tableSelection.row()` | `cell-selection-selection-engines` |
| `testIds` | V B | Emit `data-test-id` attributes for automated tests. | `true` | `options-options` |
| `theme` | V | Visual theme tokens for the table chrome. | `{ rowThemes: [{ rule: { where: { field: "severity", test: "Equal", value: "critical" }, applyValue: { customCssClasses: "bg-danger" } } }] }` | `theme-theme-options` |
| `viewportOnlyEvaluation` | V B | Evaluate bindings only for rows and columns in the viewport. | `true` | `performance` |
| `wheelGlideWindowMs` | V B | Wheel-scroll glide window duration. | `150` | `scrolling-row-scroll-engines` |

## Column options

Properties of each entry in `columns`, from `columns-column-types`.

| Property | Type | Default | Applies to | Description |
| --- | --- | --- | --- | --- |
| `key` | `string` | - | all columns | Stable column id. For data columns, the key is defaulted to the field. |
| `header` | `string` | - | all columns | Header label; defaults to key. |
| `group` | `string` | - | all columns | Heading this column sits under in the column picker. |
| `formatter` | `string` | - | all columns | Name of the formatter that turns the value into cell text: a built-in or one registered with the formatters option. Defaults to the column type's formatter. See Cells and Content. Built-ins: number, integer, decimal, currency, percent, shortNumber, scientific, bytes, datetime, date, time, isoDate, boolean, uppercase, lowercase, titleCase, camelCase, location. The type's formatter (number columns show thousands separators) applies when the column has a schema type and sets neither transformValue nor contentTemplates; a column that sets either gets a formatter only when it names one. |
| `formatterArgs` | `FormatterArgs` | - | all columns | Arguments for the formatter: format for number and dates, decimalPlaces for decimal and percent, currency for currency. A number format is a MapLarge pattern; "0" shows a whole number without thousands separators, as for ids. |
| `columnType` | `string` | - | all columns | Column type to use instead of the schema entry's type, such as one added with columnTypeDefinitions. |
| `headerTransform` | `(key: string) => string` | - | all columns | Returns the header text from the column's key. It receives the key, not the column's current header. |
| `width` | `Pixels` | - | all columns | Fixed column width in pixels. Takes precedence over flex. |
| `flex` | `number` | - | all columns | Proportional share of the leftover viewport space after fixed-width columns take theirs. Ignored when width is set or the user has resized the column; resetting the layout restores flex. |
| `minWidth` | `Pixels` | - | all columns | Minimum width in pixels. Clamps user resizing and flex sizing (flex default: 40). It clamps the authored width too. |
| `maxWidth` | `Pixels` | - | all columns | Maximum width in pixels. Clamps user resizing and flex sizing. It clamps the authored width too. |
| `sort` | `boolean` | - | all columns | Enable sorting for the column. Defaults to true: every column with a field sorts, and a virtual column sorts only when it has a sortField. Set false to turn sorting off. |
| `filtering` | `boolean \| ColumnFilterConfig` | - | all columns | Enable or configure filtering for this column. |
| `resize` | `boolean` | `true` | all columns | Enable user resizing for the column. |
| `hide` | `boolean` | - | all columns | Initial hidden state of the column. |
| `contentHeight` | `Pixels` | - | all columns | Fixed cell content height hint for row height heuristics in variable-height row engines. |
| `textWrap` | `boolean` | - | all columns | When true, body cells wrap text onto multiple lines instead of truncating with an ellipsis. Ignored when the row scroll engine uses fixedRowHeight. |
| `align` | `"left" \| "right" \| "center"` | - | all columns | Horizontal alignment for body cells in this column. Sets justify-content on .ml-dt-column-slot and text-align on .ml-dt-cell. |
| `headerAlign` | `"left" \| "right" \| "center"` | - | all columns | Horizontal alignment for the column's header cell. Sets justify-content and text-align on .ml-dt-header-content (the inner wrapper, so sort and filter icons remain anchored). |
| `verticalAlign` | `"top" \| "bottom" \| "middle"` | - | all columns | Vertical alignment for body cells in this column. Sets align-items on .ml-dt-column-slot. |
| `verticalHeaderAlign` | `"top" \| "bottom" \| "middle"` | - | all columns | Vertical alignment for the column's header cell. Sets align-items on .ml-dt-header-cell. |
| `transformValue` | `ColumnTransformValueFn \| DeclarativeRule<unknown> \| ViewDefinitionBinding` | - | all columns | Inline callback (ViewModel), `{ where, applyValue }` rule, or `{ binding }` on the View. See Cells and Content for examples of each arm. |
| `contentTemplates` | `InlineContentTemplates \| (cell) => void` | - | all columns | Inline cell markup in the View, or a ViewModel method for custom cell rendering. |
| `scope` | `Record<string, ViewDefinitionBinding>` | - | all columns | Bindings exposed to contentTemplates scope. |
| `editing` | `ColumnEditConfig \| boolean` | - | all columns | Per-column editing configuration. true uses dataTable.viewModel.editing.descriptorCellEditor() on the default triggers; false disables editing on the column. |
| `field` | `keyof TRow` | - | data columns | Row property to read. |
| `customCssClasses` | `string \| string[]` | - | data columns | Extra classes on the body cell span (.ml-dt-cell). Not applied to the header. |
| `customSlotCssClasses` | `string \| string[]` | - | data columns | Extra classes on the body column slot (.ml-dt-column-slot). Not applied to the header. |
| `sortField` | `string` | - | virtual columns | Row field to sort by when this virtual column is sortable. Required for sort on a virtual column. |
| `customCssClasses` | `string \| string[]` | - | virtual columns | Extra classes on the body cell span (.ml-dt-cell). Not applied to the header. |
| `customSlotCssClasses` | `string \| string[]` | - | virtual columns | Extra classes on the body column slot (.ml-dt-column-slot). Not applied to the header. |

## Related

- [context-menus-context-menu-engines](context-menus-context-menu-engines.md): Context Menus - Context Menu Engines and more
- [performance](performance.md): Performance
- [scrolling-row-scroll-engines](scrolling-row-scroll-engines.md): Scrolling - Row Scroll Engines and more
- [cell-editing-global-editable-config](cell-editing-global-editable-config.md): Cell Editing - Global editable config and more
- [cell-selection-selection-engines](cell-selection-selection-engines.md): Selection - Selection Engines and more
- [columns-column-types](columns-column-types.md): Columns - Column Types and more
- [column-slots-column-slot-engines](column-slots-column-slot-engines.md): Column Slots - Column Slot Engines and more
- [descriptors](descriptors.md): Descriptors
- [options-options](options-options.md): Options - Options and more
- [configurator-built-in-menu-items](configurator-built-in-menu-items.md): Configurator - Built-in Menu Items and more
- [data-data-engines](data-data-engines.md): Data - Data Engines and more
- [debug-hud](debug-hud.md): Debug HUD
- [persistence](persistence.md): Persistence
- [filtering-column-filter-configuration](filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [status-bar-status-bar](status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
- [cells-and-content](cells-and-content.md): Cell Values
- [integrations](integrations.md): Integrations
- [crud-overview](crud-overview.md): CRUD - Overview and more
- [overlays-overlay-engines](overlays-overlay-engines.md): Overlays - Overlay Engines and more
- [row-slots-virtualized-rows](row-slots-virtualized-rows.md): Row Slots - Engine: virtualizedRows and more
- [schema-schema-types](schema-schema-types.md): Schema - Schema Types and more
- [theme-theme-options](theme-theme-options.md): Theme - Theme Options and more
