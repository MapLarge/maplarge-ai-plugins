---
name: data-table
description: "Builds and changes data tables (the dataTable Raptor node from data-ui/data-table) in MapLarge dashboards: columns, sorting, filtering, editing, selection, and export. Use for any scrolling table or grid shown in a Raptor view or view definition. Not for building database tables or plain HTML tables."
metadata:
  owner: "Mike Deroche <mike.deroche@maplarge.com>"
  provenance: "DE-762"
  verified-against: "MapLarge 4.141.0 data table docs and recipe book, generated 2026-10-15"
---
# Data Table

<!-- Automatically generated, do not edit -->

This skill covers MapLarge Data Tables: the `dataTable` node from `data-ui/data-table` in ADK extensions, written as ViewModel code with `createDataTable`, as View options or as view definition JSON, with the rules every table follows, recipes and starters for common tasks, and reference docs for every option, engine and type. It does not cover Raptor views, controls and bindings in general, which the raptor skill covers, or charts, which the echarts skill covers.

## When to use

Use this skill for any work on a data table in a MapLarge ADK extension:

- code that imports from `data-ui/data-table`, or calls `createDataTable`, `dataTableOptions` or `.dataTable(...)` on a scriptor;
- code that uses `dataTable.viewModel.*` or `dataTable.view.*` helpers, or the store `createDataTable` returns (`store.mutations`, `store.getRow`, `actions.setConstraint`);
- a view definition with a node whose `"type"` is `"dataTable"`;
- a request for a table or grid of rows: its columns and formats, sorting, filtering, editing, selection, row actions, totals, export or live updates.

## Reference docs by task

This file holds the mental model, the rules and the workflow. Everything else is a reference doc under `reference/`, listed below with when to read it; a code is the code of an answer under Start by asking.

### How It Works

Before writing code, read the sections for your codes and those marked every table, in this order. A section opens with its rule when it has one, and some end with checks to run before you finish.

| Read when | Reference doc |
| --- | --- |
| every table | `reference/how-it-works-the-pieces.md`: also Where Rows Live |
| E6 F1-F4 S1-S10 | `reference/how-it-works-from-field-to-cell.md` |
| E8 E9 A2 S1-S8 | `reference/how-it-works-cell-templates.md` |
| R8 E3 E4 E8-E10 A1-A3 U1-U12 S6 I3-I5 M1 | `reference/how-it-works-bindings-and-events.md` |
| E6 E9 A3 U1-U7 U10-U12 I1 I2 | `reference/how-it-works-sorting-filtering-and-constraints.md` |
| R6-R8 E1-E10 A1-A3 U12 S6 | `reference/how-it-works-changing-rows.md` |
| R3 R4 R6 R7 F1 F2 S9 | `reference/how-it-works-dates-and-numbers.md` |
| a requirement no answer or recipe covers | `reference/how-it-works-when-no-recipe-fits.md` |

### Docs topics

Read a topic doc only for a detail your recipes leave out; the first column gives the codes it concerns or what it is for.

| Read when | Reference doc |
| --- | --- |
| a quick start and usage synopsis | `reference/overview.md` |
| how options are written: arms, helpers, the full option list | `reference/options-options.md`: also Helper API, Configuration Concepts, Authoring arms |
| options written in the View, or a View example turned into ViewModel code | `reference/view-and-view-model.md` |
| R1; comparing the built-in engines | `reference/data-data-engines.md`: also DataStoreDataEngine |
| R2 | `reference/data-data-source-data-engine.md` |
| R5-R8; a MapLarge PagedApiCall | `reference/data-paged-api-call-data-engine.md`: also ArrayDataEngine |
| R3 R4 L2 | `reference/data-async-offset-data-engine.md` |
| a source no built-in engine covers | `reference/data-build-a-custom-data-engine.md` |
| R1-R8 | `reference/data-more-reference-tables.md` |
| C1-C5 | `reference/schema-schema-types.md`: also Creating Schema Entries, Creating a Static Schema, Creating a Discoverable Schema, Schema Rules, Rule Helpers |
| a column type of your own | `reference/schema-custom-column-types.md` |
| C1-C5 | `reference/columns-column-types.md`: also Creating Data Columns, Creating Virtual Columns, Column Properties, Data Column-Only Options, Virtual Column-Only Options, Column Widths, Per-Column CSS Classes, Column Rules, Discovered Column Rules |
| hiding empty columns | `reference/columns-empty-column-detection.md`: also Actions for Toggling Empty Columns, Empty Column Engines, dataEngineEmptyColumns, loadedRowsEmptyColumns |
| C3 C4 | `reference/descriptors.md` |
| store methods and actions called from code | `reference/store-store-api.md`: also Subscribe to Actions, Dispatch Actions, Interactive Example |
| R8 U1-U6 | `reference/store-dispatcher-actions.md` |
| R6-R8 E1-E4 E8-E10 A1-A3 U12 S6 | `reference/crud-overview.md`: also Getting started, Mutations |
| R6 R7 | `reference/crud-manual-reconciliation.md` |
| E1-E4 E6 | `reference/crud-row-lifecycle-callbacks.md` |
| filters from the column headers: which columns, operators, indicators | `reference/filtering-column-filter-configuration.md`: also Filtering Engines, DialogFilteringEngine |
| the filter dialog's inputs | `reference/filtering-filter-controls.md` |
| U1-U6; a filter engine of your own | `reference/filtering-build-a-custom-filter-engine.md`: also Filtering with Actions |
| filters from the column headers: which columns, operators, indicators | `reference/filtering-filter-indicators.md`: also Filter Adapters |
| L1 | `reference/scrolling-row-scroll-engines.md`: also virtualScroll |
| L2 L3 | `reference/scrolling-infinite-scroll.md`: also Scrolling behavior options, Row Height Estimates |
| L3 | `reference/scrolling-row-height-heuristics.md` |
| a scroll engine of your own | `reference/scrolling-build-a-custom-row-scroll-engine.md` |
| L1; how many row elements the table keeps | `reference/row-slots-virtualized-rows.md`: also staticRows |
| a row slot engine of your own | `reference/row-slots-build-a-custom-row-slot-engine.md` |
| W1 | `reference/column-slots-column-slot-engines.md`: also staticColumns, virtualizedColumns |
| a column slot engine of your own | `reference/column-slots-build-a-custom-column-slot-engine.md` |
| F1-F4 S1-S10 | `reference/cells-and-content.md`: Cell Values |
| E8 E9 A2 S1-S8 | `reference/cell-templates.md` |
| U9 I3-I5 | `reference/cell-selection-selection-engines.md`: also tableSelection |
| A3 U7 U12; a selection engine of your own | `reference/cell-selection-checkbox-rows.md`: also Custom Selection Engine |
| A3 I3-I5 | `reference/cell-selection-dispatching-and-observing-selection.md` |
| E1-E10 | `reference/cell-editing-global-editable-config.md`: also Cell Editing Engines, Column edit config, descriptorCellEditor |
| E1-E4 E6; editing in a dialog; an editor built from a template | `reference/cell-editing-dialog-cell-editor.md`: also templatedCellEditor, onRowUpdate |
| E1-E10 | `reference/cell-editing-cell-editing-example.md` |
| an editor of your own | `reference/cell-editing-build-a-custom-cell-editor.md` |
| U8 | `reference/context-menus-context-menu-engines.md`: also headerContextMenuEngine, cellContextMenuEngine |
| U8; a context menu engine of your own | `reference/context-menus-contributor-example.md`: also Register a Named Context Menu Engine |
| P1 | `reference/configurator-built-in-menu-items.md`: also configurator.enabled, Configurator Engines, contextMenuConfigurator |
| a configurator of your own | `reference/configurator-build-a-custom-configurator-engine.md` |
| I1 I2; connecting the table to something outside it | `reference/integrations.md` |
| U10 U11 | `reference/status-bar-status-bar.md`: also Status Bar Engines, viewportCountStatusBar |
| a status bar of your own; a toolbar under the table (export, hide empty columns) | `reference/status-bar-build-a-custom-status-bar-engine.md`: also Footer, Footer Engines, footerToolbar |
| a footer of your own | `reference/status-bar-footer-template.md`: also Build a Custom Footer Engine |
| messages over the table: loading, no rows, errors | `reference/overlays-overlay-engines.md`: also floatingBoxOverlayEngine, templateOverlayEngine, Overlays configuration, Custom Overlay Slot |
| an overlay engine of your own | `reference/overlays-register-a-named-overlay-engine.md` |
| the table's look: stripes, borders, header and cell styles | `reference/theme-theme-options.md`: also Static Keys |
| S10 | `reference/theme-dynamic-keys.md`: also Triggering reapply from outside |
| M1 | `reference/persistence.md` |
| a complete example to compare against | `reference/examples-log-viewer.md`: also Massive Discoverable Data Table, Descriptors, Editable with Descriptors, Dates |
| L1 W1; slow scrolling | `reference/performance.md` |
| a table that is slow, empty or not updating | `reference/debug-hud.md` |
| B1 | `reference/view-definition-json.md` |
| a last look at mistakes seen in practice | `reference/pitfalls.md` |

### Recipes

Your answers under Start by asking name the recipes to apply; a `recipe#variant` is its own file, `<recipe>--<variant>.md`, holding the recipe and the variant's changes. Read the base table's doc before applying any recipe. The recipes and variants no answer names are below: read one when the request asks for what it does.

| Read when | Reference doc |
| --- | --- |
| The base table every recipe changes, and the slots where recipe code goes | `reference/recipe-base.md` |
| Switch the data source: Let the user pick which data source the table shows. Picking a source rebuilds the table for it. | `reference/recipes/switch-data-source.md` |
| Show a change made elsewhere: Show a change made somewhere else, such as a save through another API, in the rows already on screen without re-querying or saving again. | `reference/recipes/update-rows-live--repaint-only.md` |
| Connect a custom data engine: Back the table with any source the built-in engines do not cover, owning paging, sorting and filtering yourself. | `reference/recipes/connect-a-custom-data-engine.md` |
| Rename and align headers: Give columns readable header text, derive header text from column keys in code, or align headers. | `reference/recipes/rename-headers.md` |
| Size and align columns: Set fixed, flexible or bounded column widths, and align cell content. | `reference/recipes/size-and-align-columns.md` |
| Hide columns: Start a column hidden, or hide every column whose name matches a pattern. | `reference/recipes/hide-columns.md` |
| Hide empty columns: Hide columns that hold no data, and show them again. | `reference/recipes/hide-empty-columns.md` |
| Add a custom column type: Give a kind of value its own column type, with its own default alignment, formatter and filter input. | `reference/recipes/add-a-custom-column-type.md` |
| Change text case: Show text in upper, lower, title or camel case without changing the data. | `reference/recipes/change-text-case.md` |
| Format coordinates: Show a point location as degrees-minutes-seconds or another coordinate format. | `reference/recipes/format-coordinates.md` |
| Show booleans as labels: Show true and false as Yes and No, or any two labels, with the built-in boolean formatter. | `reference/recipes/map-values-to-labels--booleans.md` |
| Write a custom formatter: Format values in a way no built-in formatter covers, and reuse it by name on any column. | `reference/recipes/write-a-custom-formatter.md` |
| Style the table: Change the overall look: striping, header and cell styling, and CSS classes on a column. | `reference/recipes/style-the-table.md` |
| Sort columns: Start the table sorted, such as newest first, and turn sorting off for columns where it makes no sense. | `reference/recipes/sort-columns.md` |
| Filter columns: Let users filter by column values, see which filters are active, and clear them. | `reference/recipes/filter-columns.md` |
| Build a custom filter control: Replace the filter input for a column type with your own control. | `reference/recipes/build-a-custom-filter-control.md` |
| Select rows: Highlight the clicked row, or let users check several rows with checkboxes. | `reference/recipes/select-rows.md` |
| Edit in a dialog: Edit a long value in a dialog instead of inside the cell. | `reference/recipes/edit-in-a-dialog.md` |
| Choose which columns are editable: Make the whole table editable except some columns, or only columns matching a name pattern, without setting editing on each column. | `reference/recipes/choose-editable-columns.md` |
| Build a custom cell editor: Edit a value with your own editor UI, such as a row of buttons. | `reference/recipes/build-a-custom-editor.md` |
| Build a custom integration: Connect the table to something outside it, such as keeping the sort in the page URL. | `reference/recipes/build-a-custom-integration.md` |
| The row count and when the data was refreshed: Show which rows are visible out of the total, in your own words, and when the data was last refreshed. | `reference/recipes/show-a-line-under-the-table--freshness.md` |
| Add a footer toolbar: Put table controls under the table: hide empty columns, sync with the map, export. | `reference/recipes/add-a-footer-toolbar.md` |
| Show overlay messages: Show a message over the table, such as when no rows match the filters, and control the loading overlay. | `reference/recipes/show-overlays.md` |
| Export rows, all or checked: Let users download the table's data from the footer's Export, or (the variant) from an Export button above the table that exports the checked rows with a label counting them. | `reference/recipes/export-rows.md` |
| Save layouts to your own backend: Store saved table layouts somewhere other than browser storage or user preferences. | `reference/recipes/save-layouts-to-your-own-backend.md` |
| Size the table: Give the table the height it needs: a fixed height, or the full height of a panel or dialog. | `reference/recipes/size-the-table.md` |
| Tune performance: Trade rendering work for smoothness on slow devices or heavy cell templates. | `reference/recipes/tune-performance.md` |
| Control the table from code: Sort, filter, refresh, select rows, or show and hide columns from ViewModel code. | `reference/recipes/control-the-table-from-code.md` |
| React to table events: Run code when the user sorts, filters or edits, or when another action completes. | `reference/recipes/react-to-events.md` |
| Build a custom engine: Replace a built-in engine (status bar, footer, overlay, scrolling, slots) with your own; the status bar shown here follows the same pattern as the others. | `reference/recipes/build-a-custom-engine.md` |
| Debug the table: Find out why the table is slow, empty or not updating. | `reference/recipes/debug-the-table.md` |

### Starters

Read the starter closest to the request and change it, rather than building that table from the base.

| Read when | Reference doc |
| --- | --- |
| Basic table: The common table: a dashboard data source with listed, sortable columns. | `reference/starters/basic-table.md` |
| Map table: A dashboard data source shown in a table next to a map, with the table following the map view. | `reference/starters/map-table.md` |
| Descriptors table: A dashboard data source whose columns, schema and filters come from descriptors written out in code; each descriptor also names its editor, but the table is read-only until editable: true is added. When the fields arrive as a list (from a server or a constant), use define-columns-with-descriptors#from-a-field-list to build the descriptors from it instead. | `reference/starters/descriptors-table.md` |
| Explorer table: Every column of a dashboard data source, discovered without listing them, sortable and filterable from the headers, with each user's layout saved and smooth scrolling over all rows. The column picker is on by default. For a table only this table uses, swap the first recipe for load-from-a-data-source-directly. | `reference/starters/explorer-table.md` |
| Report table: A read-only MapLarge table sorted by a column, with the clicked row's details in a panel beside it and the row count along the bottom. | `reference/starters/report-table.md` |
| Editable table: Rows held in code that users edit in place, with a dropdown column, an Add button, checkboxes to delete or retire several rows, and a Save button that sends the rows edited in cells. Rows retired, added or deleted with the buttons do not reach Save (store.mutations does not call onRowUpdate); start from save-added-changed-and-deleted-rows when they must. | `reference/starters/editable-table.md` |
| Live table: Rows held in code that change every few seconds, such as readings from a feed, with status badges, rows colored by condition and a bar for a percentage. | `reference/starters/live-table.md` |

### Lookups

Read each when its row says, searching it for a name rather than reading it whole.

| Read when | Reference doc |
| --- | --- |
| no answer fits a requirement: every recipe and starter, grouped by task, with what each is for | `reference/recipes.md` |
| before writing any option name: search it for the name | `reference/options-index.md` |
| an exact type shape: search it for the type name | `reference/types.md` |
| answering the questions under Start by asking: search it for the request's own words | `reference/request-words.md` |
| a request asks for a feature under Not supported: what to offer instead | `reference/not-supported.md` |

## Mental model

The Data Table component is an extensible Raptor Node for displaying tabular data.

- Recipes are written in the ViewModel: `createDataTable({ ... })` with `dataTable.viewModel.*` helpers, and the view binds the result. This form reaches every option and the table's store.
- The same options can be written in the View with `dataTable.view.*` helpers; `reference/view-and-view-model.md` converts between the two. Never pass `dataTable.view.*` helpers to `createDataTable`; a view written in code may use `dataTable.viewModel.*` for things with no View form, such as a templated cell editor.
- `{ binding: "name" }` is how a View points at a ViewModel member, as in `cellContextMenuItems: [{ binding: "extraCellItems" }]` in a docs example written in the View. In the ViewModel pass the member itself (`cellContextMenuItems: [this.extraCellItems]`); a `{ binding }` inside `createDataTable` is a type error, and for some options it throws and the table never appears. The docs examples (reference/examples-*.md) define their columns in the View, so their `transformValue: { binding: "formatTime" }` becomes `transformValue: this.formatTime` or an inline function in `createDataTable`.
- In view definition JSON a table is `{ "type": "dataTable", ...options }` in the View's plain-data form; see `reference/view-definition-json.md`.

## Universal rules & gotchas

### The rules

Read these once before writing any table. Every recipe follows them, and when a request needs something no recipe shows, they decide what will work.

1. **Three parts.** The ViewModel builds the table with `createDataTable({ data, schema, columns, ... })` and keeps `{ options, store }` in members; the View places `s.dataTable(dataTableOptions({ bindings: { data: "dataTableOptions" } }))` inside a div with a pixel height (`s.div({ height: 400 })`), since the table fills its container and has no height of its own, and a view has one root node with the controls, the table's div and any text inside it (a second root is dropped without an error). ViewModel options are values and functions from `dataTable.viewModel.*`; `{ binding: "name" }` and `dataTable.view.*` belong to options written in the View.
2. **Everything shown is a ViewModel member read by name**, and the page reads members only when `this.update()` runs: a handler that changes a member (a count, a flag, a label) ends with `this.update()`.
3. **A binding is a path, never an expression.** `bindings: { text: "summaryText" }`, `visible: bindingPaths.displayValue + ".isOpen"`, `disable: "nothingChecked"`. A path is looked up part by part, never evaluated: a comparison, a leading `!`, text joined to a path, a literal such as `true`, an arrow function or `{ transform }` does nothing or throws (a ViewModel method found at the path is called with no arguments and its result used). Work the text or true/false flag out in code (transformValue for a cell, a member for the View) and bind its path. Each `css.classes` key is one class name whose value is the path to a flag (two classes on one flag are two keys); one flag can also switch two class sets, `css: { property: path, trueClasses: ["text-danger"], falseClasses: ["text-success"] }`; an always-on class goes in `customCssClasses`. A color held in the row binds with `style: { trueStyles: { backgroundColor: path } }` (camelCase CSS properties, each a path to a string).
4. **Buttons and inputs.** A button runs a method through `events: [{ event: "click", handler: "methodName", param }]`, and `param` arrives as the method's first argument; on a view node `onClick`, `handlerArgs` and a scriptor `text()` do not exist (onClick is real only inside right-click menu items, `{ type: "action", label, onClick }`; calling `text()` throws and blanks the page). The binding that greys a node out is `disable` (`disabled: true` is a fixed option, not a binding). An input bound with `bindings: { value: "member" }`, and a checkbox bound with `bindings: { checked: "member" }`, write the member before their `input` or `change` handler runs, so the handler reads the member and never flips it; bind a checkbox with `checked`, since `value` does not tick the box when the member starts true. A button's label can follow a member: `button.span({ bindings: { text: "pauseLabel" } })`. Raptor's node and event options are declared in the ADK workspace's `.adk/types.d/MapLarge.Server.d.ts` (`ViewDefinitions`, `DisplayUtilities`, `Bindings`, `Events`, and controls such as `QuickSelect`): search there for a name before writing it; a name found nowhere there does not exist.
5. **Rows live in the data engine, not in the table.** The store has no row list and no row count, so keep your own copy of the rows for counts, totals, loops and exports, and change it in the same handler that changes the table. `store.getRow(position)` returns only rows loaded near the screen; `await store.getRowsFromDataEngine({ rowIndices, checkCache: true })` reads any position. `arrayData` copies the list you give it (the row objects are shared) and needs `getRowId` as soon as rows are edited or changed (without it an edit shows, then reverts at the next sort); adding to or removing from your array afterwards changes nothing on screen. `asyncData` calls `fetchRows({ start, count, sort, filter })` and needs `totalSize` back (one more than the rows so far while pages come back full, when the source has no total) and `filterCapabilities` listing only the operators fetchRows applies (without it every filter dialog opens empty).
6. **Rows change through the store or the engine.** `store.mutations.update / insert / remove / removeBulk(...).run()` saves through the engine and repaints; several at once go through `store.mutations.compose(updates).run()` with what `mutations.update` returns. `store.rows.applyUpdate` only repaints, and the next sort reverts it. Mutations do not call `onRowUpdate`, so recompute whatever you keep in the same handler. Rows that change on a timer go through `engine.updateRow({ row, changedFields })` per row, then `actions.refresh()`.
7. **The value path**: the stored value, then unit conversion, then `transformValue({ value, row })`, then the formatter, then the unit label, and the result is `displayValue`. Sorting and filtering use the stored value, so a column that shows "98%" through transformValue still sorts as 98. To sort by a computed value, store it in each row as a field; a virtual column sorts only through a `sortField`, which must name a field every row has.
8. **Not supported** are the features under Not supported below: leave that part out, say so, and offer what `reference/not-supported.md` says to do instead; never put a total in as a data row.
9. **Never guess a name.** Table options are in `reference/options-index.md` and the recipes; field types come from the `schema` import (`schema.string()`, `schema.number()`, `schema.date()`); `ml` is a global, never imported; view-model.ts exports only types, data constants and the `ViewModel` class. A name you cannot find does not exist: leave that part out and say so.

The rules for a user's edit, transformValue on empty rows, cell templates, narrowing, counts and totals, and numbers and dates open the How It Works section each belongs to: read the sections for your codes, listed in the How It Works table above, before writing code. The mistakes these rules prevent, as seen in practice: `reference/pitfalls.md`.

### Start by asking

Before writing a table, settle these with the developer. Ask only what the request does not already answer. Each answer has a code and names the recipes to apply to the base table (`reference/recipe-base.md`) or to the closest starter; `recipe#variant` names a variant of that recipe, and an answer ending in 0 adds nothing.

Requests rarely use these skills' words: search `reference/request-words.md` for the request's own words (each row starts with words requests use, then the codes and recipes they lead to) and read only the rows that match, never the whole file.

1. Is the table built in code or in the dashboard editor?
   - B0 In code: nothing to add
   - B1 In the dashboard editor: `reference/recipes/bind-to-the-dashboard-table-transform.md`
2. Where do the rows come from? (A page written in code with a DynamicViewModel has a data store too; register the table on it when a map layer or filter widget on the page uses the same table.)
   - R1 A MapLarge table that other widgets on the page also use (a map layer, shared filters), or the dashboard's data store: `reference/recipes/load-from-dashboard-data-source.md`
   - R2 A MapLarge table only this table uses (no map layer or filter widget on the page shows it): `reference/recipes/load-from-a-data-source-directly.md`
   - R3 An API: `reference/recipes/load-from-an-api.md`
   - R4 A stand-in for an API written in code, for a demo or a test: `reference/recipes/load-from-an-api--stand-in-in-code.md`
   - R5 Rows held in code: `reference/recipes/load-static-rows.md`
   - R6 Rows held in code that change while the table is open, such as a live feed: `reference/recipes/update-rows-live.md`
   - R7 The same, in a table long enough to scroll, where each update must not jump back to the top: `reference/recipes/update-rows-live-in-place.md`
   - R8 Rows re-read when the user presses a Refresh button: `reference/recipes/update-rows-live--refresh-button.md`
3. Are the columns known, defined by descriptors, or whatever the source has?
   - C1 Known, in code with a static schema: `reference/recipes/choose-columns.md`
   - C2 Known, but the table discovers the source's columns (every dashboard-editor table): `reference/recipes/show-only-some-columns.md`
   - C3 Defined by descriptors written out in code: `reference/recipes/define-columns-with-descriptors.md`
   - C4 Defined by a list of fields (name, label, type, options) that a server sends or the ViewModel holds: build the descriptors from the list: `reference/recipes/define-columns-with-descriptors--from-a-field-list.md`
   - C5 Whatever the source has: `reference/recipes/show-all-columns-automatically.md`
4. Is it read-only or editable, and if editable, where do edits save?
   - E0 Read-only (a table is read-only unless editable or a column's editing is set, whatever the data engine allows): nothing to add
   - E1 Editable, each edit saved through the data engine as it happens: `reference/recipes/edit-cells.md`
   - E2 Editable, each edit sent to your own service: `reference/recipes/edit-cells.md`, `reference/recipes/save-edits.md`
   - E3 Editable, changes collected and saved together with a Save button (the editable-table starter has this): `reference/recipes/save-edits-with-a-button.md`
   - E4 Editable, with Add and Delete buttons, and a Save button that sends what was added, changed and deleted since the last save (use it instead of add-rows, delete-rows and save-edits-with-a-button): `reference/recipes/save-added-changed-and-deleted-rows.md`
   - E5 Some columns pick from a list of values: `reference/recipes/edit-with-a-dropdown.md`
   - E6 Other columns or a total are calculated from the edited values and must follow each edit: `reference/recipes/update-derived-values-after-edits.md`
   - E7 Edited values must stay within limits (a range such as 0 to 24, or a required value): `reference/recipes/edit-cells--validation.md`
   - E8 A value is set with one click in the cell (rating stars, a row of choices): `reference/recipes/add-action-buttons--click-to-set.md`
   - E9 A yes/no field is a checkbox users click in its cell (Done, Paid), often with a count of checked rows: `reference/recipes/add-action-buttons--checkbox.md`
   - E10 An Undo button that reverts the most recent edits one at a time: `reference/recipes/update-rows-live--undo-last-edit.md`
5. Can users add or delete rows, and how do they pick the rows to delete?
   - A0 No: nothing to add
   - A1 Add rows with a button: `reference/recipes/add-rows.md`
   - A2 Delete one row with a button in that row: `reference/recipes/delete-rows.md`
   - A3 Check several rows, then delete them together: `reference/recipes/act-on-checked-rows.md`
6. Are there controls or text around or in the table: a search box, preset buttons, a dropdown or a checkbox that narrows it, an Export button or a count of checked rows, row actions in a right-click menu, arrow keys moving between cells, a line of text under the table, or a second table that rows move to?
   - U0 No: nothing to add
   - U1 A search box that narrows the rows as the user types: `reference/recipes/narrow-the-table-from-controls.md`
   - U2 The same search box over rows from an API or a stand-in for one (asyncData): `reference/recipes/narrow-the-table-from-controls--over-an-api.md`
   - U3 Buttons above the table that narrow it to a preset (Today, Last 7 days, All), with the active one highlighted: `reference/recipes/narrow-the-table-from-controls--preset-buttons.md`
   - U4 A dropdown of values (All, North, South) that narrows the table to the picked one: `reference/recipes/narrow-the-table-from-controls--dropdown.md`
   - U5 A checkbox that narrows the table while checked (Low stock only): `reference/recipes/narrow-the-table-from-controls--checkbox.md`
   - U6 The table pinned to a subset from code, with no control: `reference/recipes/narrow-the-table-from-controls--pinned-scope.md`
   - U7 An Export button above the table, a label counting checked rows, or both: `reference/recipes/export-rows--checked-with-a-button.md`
   - U8 Right-click menu items that act on the clicked row: `reference/recipes/right-click-menus.md`
   - U9 Users select a cell, move between cells with the arrow keys (Enter then edits the selected cell), or copy a cell's text from the right-click menu: `reference/recipes/keyboard-and-copy.md`
   - U10 A count of the rows the table shows, under the table: `reference/recipes/show-a-line-under-the-table--status-bar-count.md`
   - U11 A line of text under the table worked out from the rows, such as a total or how many are overdue: `reference/recipes/show-a-line-under-the-table.md`
   - U12 Two tables side by side with buttons that move the checked rows from one to the other: `reference/recipes/act-on-checked-rows--move-to-another-table.md`
7. Do any columns hold ids or codes, dates or times, money, percentages, numbers with a fixed number of decimals (hours to one decimal), or measurements with units?
   - F0 No: plain numbers and text only (the default gives numbers thousands separators, so an id 1001 shows as 1,001, and gives a datetime field its time, 12:00 AM for a date-only value): nothing to add
   - F1 Ids or codes (no thousands separators), money, percentages or fixed decimals: `reference/recipes/format-numbers-and-currency.md`
   - F2 A date without a time of day (a due date), a time alone, or date and time in separate columns: `reference/recipes/format-dates-and-times.md`
   - F3 Measurements with units: `reference/recipes/show-units.md`
   - F4 Codes that should show readable labels: `reference/recipes/map-values-to-labels.md`
8. Does any cell show more than plain text, or does color follow the values?
   - S0 No: nothing to add
   - S1 A colored badge, an icon or a check mark for a status, on every row or only some: `reference/recipes/show-badges-and-icons.md`
   - S2 One badge for each item of a list field, such as labels or tags: `reference/recipes/show-badges-and-icons--per-list-item.md`
   - S3 A colored dot beside a value: `reference/recipes/show-badges-and-icons--dot-and-value.md`
   - S4 Initials in a colored circle: `reference/recipes/show-badges-and-icons--initials.md`
   - S5 Several fields in one cell: `reference/recipes/show-badges-and-icons--combined-text.md`
   - S6 A link, or a button in each row: `reference/recipes/add-links.md`, `reference/recipes/add-action-buttons.md`
   - S7 An image or thumbnail: `reference/recipes/add-links--image.md`
   - S8 A small line chart of recent values, or a bar sized by a value: `reference/recipes/show-charts-in-cells.md`, `reference/recipes/show-charts-in-cells--bar.md`
   - S9 A value worked out from other fields (a total, a ratio, days between two dates): `reference/recipes/add-computed-column.md`
   - S10 Whole rows colored by a condition, or one column's cells colored by their value: `reference/recipes/color-rows-and-cells.md`, `reference/recipes/color-rows-and-cells--cells.md`
9. Should users choose which columns they see, and in what order?
   - P0 No, or the built-in header menu is enough (Hide Column, Show All Columns, and the column picker are on by default): nothing to add
   - P1 Yes, with columns grouped in the picker or a different configurator: `reference/recipes/let-users-configure-columns.md`
10. How should scrolling work: a scrollbar covering the whole dataset so users can jump anywhere, or more rows loading as users reach the bottom? Do all rows have the same height?
    - L0 A few hundred rows or fewer, one line each: nothing to add
    - L1 Jump anywhere, rows the same height: `reference/recipes/handle-large-data.md`
    - L2 Load more at the bottom, or the total row count is unknown: `reference/recipes/load-more-at-the-bottom.md`
    - L3 Rows of different heights, such as wrapped text: `reference/recipes/wrap-long-text.md`
11. Are there hundreds of columns?
    - W0 No: nothing to add
    - W1 Yes: `reference/recipes/handle-wide-data.md`
12. Does it interact with the rest of the page, through filters, a map, or a panel showing the selected row?
    - I0 No: nothing to add
    - I1 Filters shared with other widgets: `reference/recipes/share-filters-with-the-dashboard.md`
    - I2 Shows only rows in the map view, with the rows drawn on the map (the map-table starter has the map, its layer and the link): `reference/recipes/filter-to-map-view.md`
    - I3 Clicking a row shows its details beside the table: `reference/recipes/react-to-row-selection--details-panel.md`
    - I4 Clicking a row fills a second table with its related rows (master-detail): `reference/recipes/react-to-row-selection--second-table.md`
    - I5 Clicking a row should change something else, such as highlighting it on a map (not built in; see Not supported): `reference/recipes/react-to-row-selection.md`
13. Should each user's layout (widths, order, sort, filters) be remembered?
    - M0 No: nothing to add
    - M1 Yes: `reference/recipes/save-user-layouts.md`

Write down your codes, one for each answer that applies, leaving out the 0s, as the first line of your plan (`Codes: R5 C1 E1 E6 U11 F1 F2`). Each document says which codes need it, so read only those: the How It Works sections for your codes, listed in the How It Works table above, then the recipes your answers name. Open the recipe index or a topic doc only when a requirement or a detail is still missing.

When no answer fits a question, the need is the closest recipe's shape changed only where the request differs, under The rules; it is never a new option, event, store method or binding. A name no recipe or reference skill shows is a guess: leave that part out and say so.

### Before you write code

Write the plan first. Its first line is your codes (`Codes: R5 C1 E1 E6 U11 F1 F2`); then every requirement of the request on its own line (each column and its format, the default sort, every control, every line of text above or below the table, every behaviour), tagged with the `recipe#variant`, the rule (in The rules or a How It Works section) or the Not supported feature that covers it. A line with no tag gets no code until it has one: find it in the answers above, the recipe index (`reference/recipes.md`), The rules, How It Works or Not supported, never in memory of other grids. Keep the list: Before you finish checks each line against the code.

### Not supported

The table does not have these features. When a request asks for one, leave that part out, say so, and offer what `reference/not-supported.md` says to do instead; never invent an option for them.

- Pinned or frozen columns that stay in place while scrolling sideways
- Grouped header rows spanning several columns
- Sorting by more than one column at a time
- Totals or summary rows
- Pages with page numbers
- Grouped, expandable or tree rows
- Highlighting or zooming to the clicked row on a map
- Tooltips on headers or cells
- Formatters for JSON or lists
- Editing a percent as the percent shown, such as typing 7.5 to store 0.075
- A pick-list of a column's values in the filter dialog
- Units the platform has no measurement type for, such as psi, bar or volts

### How to use this skill

1. In code: start from the closest starter (one file each in reference/starters/), or from the base table in `reference/recipe-base.md`, and apply the recipes your answers name, one file each in reference/recipes/: open only the recipes you apply. A `recipe#variant` is its own file, `reference/recipes/<recipe>--<variant>.md`, holding the recipe and the variant's changes. When no answer fits a requirement, find it in the recipe index (`reference/recipes.md`); when no recipe matches it exactly, keep the closest recipe's shape and change only what the request changes.
2. In view definition JSON (the dashboard editor): start from the node and transform in the `reference/recipes/bind-to-the-dashboard-table-transform.md` recipe, then merge each recipe's "View definition JSON" block into the dataTable node. Objects merge, lists such as columns add their entries, and a recipe marked as having no view definition JSON form needs code.
3. Look up every option name in `reference/options-index.md` before writing it (search it for the name; it is a lookup table, not reading). Never invent option, action, store method, map call or type names: a name no skill shows does not exist. When a requirement needs one, leave that part out and say so.
4. For a detail a recipe leaves out, read the topic doc from Docs topics above.
5. Store members: the store from `createDataTable` has exactly `dispatch`, `subscribe`, `getRow`, `getRowsFromDataEngine`, `getCellByCoordinates`, `getCellByKey`, `getCheckboxRowsSelectedIndices`, `checkboxRowsSelectAll`, `checkboxRowsUnselectAll`, `commitCurrentEdit`, `hideEmptyColumns`, `showEmptyColumns`, `updateConfig`, `getState`, `getExportSource`, `isIntegrationEnabled`, `rowSlotIndexToGlobalRowIndex`, `rows.applyInsert` / `applyUpdate` / `applyRemove` / `applyRemoveBulk`, `cells.update`, and `mutations.insert` / `update` / `remove` / `removeBulk` / `compose` / `reconciler`.
6. Text on view nodes uses Bootstrap's scale: `fontSize` is 1 to 6 (1 largest) or `"small"`, `fontWeight` is `"bold"`, `"semibold"` or `"normal"`, `wordBreak` is `true`; sizes (`width`, `height`) are pixels, `heightPercentage` a percentage of a parent that has a height. There is no `prefix` or `suffix`: build the text in the ViewModel and bind it.

### Before you finish

Do each of these as a search over view-model.ts and view.ts, not from memory, and write what each search found next to the plan line it checks; a check with nothing written down was not done. Knowing a rule is not the check: the handler that quotes rule 2 and still lacks `this.update()` is the usual miss.

1. Re-read the request sentence by sentence and point each line of your plan (Before you write code) at the line of code that meets it: every column it names (ids included), each format, the default sort and its direction, every control, and every line of text above or below the table. Add what is missing; for anything under Not supported, leave it out and say so.
2. Search every `bindings:` value for `!`, `===`, `==`, `?`, `true`, `false`, `=>`, `{ transform` and text joined in front of a path (`"mailto:" +`, `"Total: " +`): each is an expression or a literal where a path goes. Compute it in transformValue or a member and bind the path. A dot path added to a binding path, `bindingPaths.displayValue + ".label"`, is a path and is fine. Search every `css: { classes` key for a space: each key is one class.
3. Search view nodes for `onClick`, `handlerArgs`, `.text(` and `bindings: { disabled`: none exists there (a node takes `events: [{ event: "click", handler }]`, text goes in `text` or a text binding, the binding is `disable`). Leave `onClick` inside right-click menu items alone, where it is the real name, and a fixed `disabled: true` option. Search every `handler: "..."` and `handler: bindingPaths.scope.`: the method or scope function must exist.
4. Search every handler that sets a member (a count, a flag, a label) for `this.update()` at its end, and every `store.mutations` and `engine.updateRow` call for the recomputation of your own copy of the rows and anything worked out from it, in the same handler.
5. Search `defaultSort` for a key that is a column key and a direction that gives the order the request asks for.
6. Search `createDataTable({` for `{ binding:` (it throws there) and `dataTable.view.` (View syntax; write `dataTable.viewModel.*`). Search every `column({` and `virtualColumn({` for `schema:` and `descriptor`: a column has neither; a descriptor lives on the schema entry inside `createSchema` (`edit-cells#validation`), or in the `descriptors` option of a descriptors table. Search `store.getRow(` used on checked rows or any row off screen: use `getRowsFromDataEngine`. Search `asyncData` for `totalSize` in what `fetchRows` returns, for `filterCapabilities`, and for `setConstraint` used with it (a constraint never reaches `fetchRows`). Search `arrayData` for `getRowId`.
7. Search `export` in view-model.ts: only types, data constants and the `ViewModel` class. Search view.ts for `from "./view-model"`: it may import only types (`import type`); a value import fails to load with "Module not found: ./view-model", so anything the View needs at run time is declared in view.ts itself. Search both files for any character outside plain ASCII: a file tool can turn an escape such as `"\u2713"` into the character itself. Write such characters with the braced escape, `"\u{2713}"`, which survives.
8. Search every name you wrote that no recipe uses, against `reference/options-index.md` or the Raptor declarations (rule 4); where it is not there, leave it out and say so.
9. Run the checks at the end of each How It Works section you read.

## Examples

### "Show the bus stops from the MapLarge table ml_samples/Miami_Busstops: Stop ID without a thousands separator, Stop Name, Municipality, Shelters and Benches, sorted by Stop Name."

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type BusStop = {
    readonly StopID: number;
    readonly StopName: string;
    readonly MUNIC_NAME: string;
    readonly Shelters: number;
    readonly Benches: number;
};

const { column } = dataTable.viewModel.defineColumns<BusStop>();

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<BusStop> | null = null;

    public async initialize(): Promise<void> {
        const dataSource = await ml.data.dataSource.fromTableAsync("ml_samples/Miami_Busstops");
        const { options } = createDataTable<BusStop>({
            data: dataTable.viewModel.data.dataSourceData<BusStop>({ dataSource }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: { StopID: schema.number(), StopName: schema.string(), MUNIC_NAME: schema.string(), Shelters: schema.number(), Benches: schema.number() },
            }),
            columns: [
                column({ field: "StopID", header: "Stop ID", width: toPixels(100), formatter: "number", formatterArgs: { format: "0" } }),
                column({ field: "StopName", header: "Stop Name", width: toPixels(240) }),
                column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(180) }),
                column({ field: "Shelters", header: "Shelters", width: toPixels(100) }),
                column({ field: "Benches", header: "Benches", width: toPixels(100) }),
            ],
            defaultSort: { key: "StopName", direction: "asc" },
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(28) }),
            rowSlots: dataTable.viewModel.rowSlots.virtualizedRows({ slots: 120 }),
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTableOptions } from "data-ui/data-table";
import type { BusStop, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("BusStops", "Bus Stops");
    s.view("main", (s) => {
        s.div({ height: 500 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<BusStop>({ bindings: { data: "dataTableOptions" } }));
        });
    });
    return s.commitPage();
}
```

### "A list of our products held in code, with name, SKU and stock, where users can edit the stock in the cell."

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Product = { readonly id: number; readonly name: string; readonly sku: string; readonly stock: number };

export const products: Product[] = [
    { id: 1, name: "Desk lamp", sku: "LMP-100", stock: 42 },
    { id: 2, name: "Office chair", sku: "CHR-210", stock: 7 },
    { id: 3, name: "Monitor arm", sku: "ARM-330", stock: 15 },
];

const { column } = dataTable.viewModel.defineColumns<Product>();

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Product> | null = null;

    public initialize(): void {
        const { options } = createDataTable<Product>({
            data: dataTable.viewModel.data.arrayData({ data: products, getRowId: (product) => product.id }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: { id: schema.number(), name: schema.string(), sku: schema.string(), stock: schema.number() },
            }),
            columns: [
                column({ field: "name", header: "Name", width: toPixels(200) }),
                column({ field: "sku", header: "SKU", width: toPixels(120) }),
                column({ field: "stock", header: "Stock", width: toPixels(100), editing: true }),
            ],
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTableOptions } from "data-ui/data-table";
import type { Product, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("Products", "Products");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Product>({ bindings: { data: "dataTableOptions" } }));
        });
    });
    return s.commitPage();
}
```
