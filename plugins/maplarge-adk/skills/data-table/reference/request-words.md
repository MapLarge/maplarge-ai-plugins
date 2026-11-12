# Data Table - words in a request

<!-- Automatically generated, do not edit -->

One row per phrase requests use: search this file for the request's own words rather than reading it whole. Each row gives what the words mean here, and the codes and recipes they lead to.

| The request says | Codes | Here that is | Recipes |
| --- | --- | --- | --- |
| selected rows, the selected items, act on the selection, bulk delete | A3 | The rows the user checked in a checkbox column; one button acts on all of them. | `act-on-checked-rows` |
| the selected row, the clicked row, when a row is clicked, row details | I3 I5 | The one row the user clicked, read in a selectCell subscription with store.getRow. | `react-to-row-selection`, `react-to-row-selection#details-panel` |
| related rows, master-detail, order lines, a second table | I4 | A second table whose fetchRows reads the clicked row's id. | `react-to-row-selection#second-table` |
| total, sum, grand total, totals row, summary row, average | U11 | A line under the table worked out from your own copy of the rows; never a row of data. | `show-a-line-under-the-table` |
| row count, number of rows, showing N of M | U10 | The status bar's totalRows, which follows filters and constraints. | `show-a-line-under-the-table#status-bar-count` |
| last updated, last refreshed, updated N minutes ago | - | The status bar's freshness. | `show-a-line-under-the-table#freshness` |
| highlight rows, color rows, red when overdue, shade a cell by its value | S10 | rowThemes or cellThemes, from a flag worked out per row. | `color-rows-and-cells`, `color-rows-and-cells#cells` |
| badge, pill, tag, chip, label, status icon, check mark, colored dot | S1-S3 | A cell template with one node per look, each with its own visible flag from transformValue. | `show-badges-and-icons`, `show-badges-and-icons#per-list-item`, `show-badges-and-icons#dot-and-value` |
| a badge next to the title, Stale or New beside a name, a flag beside a text | S1 | A cell template on that text's column; its transformValue reads any other field of the row for the flag. | `show-badges-and-icons` |
| initials, avatar; two fields in one cell, a subtitle under the name | S4 S5 | A cell template over text and flags built in transformValue. | `show-badges-and-icons#initials`, `show-badges-and-icons#combined-text` |
| link, email link, open in a new tab, clickable name; thumbnail, image, photo | S6 S7 | An anchor or image node in a cell template, bound to a value built in transformValue. | `add-links`, `add-links#image` |
| progress bar, bar sized by a value, percent bar; sparkline, trend, mini chart | S8 | A cell template sized from the value, or a chart node. | `show-charts-in-cells#bar`, `show-charts-in-cells` |
| a button in each row, an action per row, Approve or Retire or Delete in the row | A2 S6 | A button in a cell template calling a scope function that receives { row, rowIndex, globalRowIndex }. | `add-action-buttons`, `delete-rows` |
| stars, rating, click to set, a row of choices in the cell | E8 | Clickable nodes in a cell template that write the value through store.mutations.update. | `add-action-buttons#click-to-set` |
| a checkbox in the cell, mark as done, a Paid toggle, with a count of checked rows | E9 | A checkbox in a cell template writing the field through store.mutations.update, the count recomputed in the same handler. | `add-action-buttons#checkbox` |
| editable, edit in place, inline edit, double-click to change | E1 E2 | editing: true on the column; the editor opens on the stored value (on a unit column, on the number the cell shows). | `edit-cells` |
| must be between, cannot be negative, required, reject invalid values | E7 | min, max and required on the schema entry's descriptor. | `edit-cells#validation` |
| pick from a list when editing, dropdown editor, status options | E5 | A dropdown editor on the column. | `edit-with-a-dropdown` |
| Save button, unsaved changes, save everything at once, Add and Delete buttons with Save | E3 E4 | Edits recorded in onRowUpdate and sent by a button. | `save-edits-with-a-button`, `save-added-changed-and-deleted-rows` |
| undo, revert the last change | E10 | A history of previous values written back through store.mutations.update. | `update-rows-live#undo-last-edit` |
| add a row, a New button; delete a row, remove | A1 A2 | store.mutations.insert and store.mutations.remove. | `add-rows`, `delete-rows` |
| move to another table, transfer between lists, two tables side by side | U12 | Two tables with their own stores; checked rows removed from one and inserted into the other. | `act-on-checked-rows#move-to-another-table` |
| search box, search as you type, filter by name | U1 | An input whose handler dispatches actions.setConstraint. | `narrow-the-table-from-controls` |
| search over an API, server-side search, a search box with paged or fetched rows | U2 | The search text kept in the ViewModel and applied inside fetchRows, and actions.refresh() on each change; a constraint never reaches fetchRows. | `narrow-the-table-from-controls#over-an-api` |
| a dropdown above the table, pick a region or category, show only one value | U4 | A quickSelect whose change handler sets a constraint. | `narrow-the-table-from-controls#dropdown` |
| Today, This week, All buttons; presets, quick filters, the active one highlighted | U3 | Buttons sharing one handler with a param, and a Record of flags for the active class. | `narrow-the-table-from-controls#preset-buttons` |
| an Only show X checkbox, hide completed, an active-only toggle | U5 | A checkbox bound with checked whose change handler reads the member and sets a constraint. | `narrow-the-table-from-controls#checkbox` |
| only rows where, scoped to the user's region, pinned to a subset | U6 | A constraint set once after the table is created. | `narrow-the-table-from-controls#pinned-scope` |
| filterable columns, filter from the header; sorted by default, newest first, sortable | - | Header filters are on by default; defaultSort takes one column and a direction. | `filter-columns`, `sort-columns` |
| refresh, reload, a Refresh button, re-fetch | R8 | actions.refresh() re-reads the rows from the data engine; your own array is not the data. | `update-rows-live#refresh-button` |
| live, real time, updates every N seconds, a feed, simulated updates | R6 R7 | engine.updateRow per row then actions.refresh() (re-sorts, scrolls to the top), or, for a table that must not jump back to the top, engine.updateRow per row plus applyUpdate on the shown rows and no refresh (keeps the scroll, does not re-sort). | `update-rows-live`, `update-rows-live-in-place` |
| API, endpoint, REST, fetched a page at a time, server-side paging | R3 | asyncData with fetchRows returning rows and totalSize, plus filterCapabilities. | `load-from-an-api` |
| fake API, mock, simulate a server, a stand-in for the endpoint | R4 | asyncData over a whole array built once, filtered and sorted before the page is cut. | `load-from-an-api#stand-in-in-code` |
| load more, infinite scroll, the total is unknown; thousands of rows, jump anywhere | L1 L2 | asyncData with totalSize one more than loaded while pages are full, or the large-data scroll engine. | `load-more-at-the-bottom`, `handle-large-data` |
| export, download, CSV, Excel | U7 | The footer's Export, or a button that builds a file from your own copy of the rows. | `export-rows`, `export-rows#checked-with-a-button` |
| right-click, context menu; arrow keys, copy a cell | U8 U9 | Context menu items with a handler per row; keyboard navigation and copy. | `right-click-menus`, `keyboard-and-copy` |
| ids, codes, years, order numbers (no thousands separators); money, cents, percent, decimals | F1 | The number formatter with format 0, the currency formatter in dollars, the percent formatter on fractions. | `format-numbers-and-currency` |
| due date, date only, time only, days until, age in days, overdue | F2 S9 | The date formatters, and a field computed per row for days and overdue flags, compared as text. | `format-dates-and-times`, `add-computed-column` |
| units, meters, feet, kg, mph, Celsius | F3 | Units on the schema entry, converted and labelled by the table (distance, area, mass, temperature, speed, altitude, altimeter, visibility and time only). | `show-units` |
| psi, bar, volts, or any unit with no platform type | - | Not a unit the table converts: show the number as stored and put the unit in the header text, such as Pressure (psi). | Not supported |
| labels for codes, status text, Yes or No, Active or Inactive | F4 | transformValue mapping stored values to labels; sorting stays on the stored value. | `map-values-to-labels`, `map-values-to-labels#booleans` |
| computed, derived, ratio, difference, margin, days between | S9 | A field computed into each row when the rows are built, so it sorts and filters. | `add-computed-column` |
| wrap, long text, a notes column, multi-line | L3 | Wrapped cells and rows of different heights. | `wrap-long-text` |
| a long note edited in a popup or dialog; the cell shows only the first line | - | dialogCellEditor on the column, a TextArea descriptor on the schema entry for a multi-line box, and a transformValue that returns the first line (sorting and the dialog keep the whole note). | `edit-in-a-dialog` |
| a done or finished row greyed out, dimmed or struck through | E9 S10 | A cellThemes entry matching the done rows with customTextColor: "#6c757d" and customCssClasses: "text-decoration-line-through" (a row theme cannot strike through the cells' text). | `color-rows-and-cells`, `add-action-buttons#checkbox` |
| hide columns, column picker, choose columns; remember the layout, per user | P1 M1 | The column configurator, hidden columns, and persistence. | `let-users-configure-columns`, `hide-columns`, `save-user-layouts` |
| on the map, map view, the rows drawn on a map | I2 | The map-table starter and the map-view filter. | `filter-to-map-view` |
| descriptors, a field list from the server, dynamic columns, columns by configuration | C3 C4 | Columns, schema and editors built from descriptors. | `define-columns-with-descriptors`, `define-columns-with-descriptors#from-a-field-list` |
| loading spinner, empty state, a no-rows message | - | Overlays. | `show-overlays` |
| compact, striped, borders, dark, font size | - | Theme options. | `style-the-table` |
| row height, taller rows | L1 L3 | rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(40) }); rows are 25 px by default, and a fixed height ignores wrapped text (rows that wrap use wrap-long-text). | `handle-large-data`, `wrap-long-text` |
| a button disabled or greyed out until something is checked | - | A boolean member kept current in the handlers and bound with disable. | The rules, 4 |
| tooltip, hover text; group by, expand, tree; pinned or frozen column; sort by two columns; page numbers; pretty JSON | - | Not supported: leave it out, say so, and offer what the Not supported table says instead. | Not supported |
