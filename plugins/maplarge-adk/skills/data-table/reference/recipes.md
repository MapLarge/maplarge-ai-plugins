# Data Table recipes

<!-- Automatically generated, do not edit -->

Recipes are small changes to one base table (`recipe-base`), grouped by task below, one file each: open only the recipes you apply. Starters are complete tables built from several recipes; start from the closest starter, or from the base, and apply recipes for anything else. A task with no recipe may be under Not supported in `SKILL.md`.

## Starters

| Starter | What it is |
| --- | --- |
| `starter-basic-table` | The common table: a dashboard data source with listed, sortable columns. |
| `starter-map-table` | A dashboard data source shown in a table next to a map, with the table following the map view. |
| `starter-descriptors-table` | A dashboard data source whose columns, schema and filters come from descriptors written out in code; each descriptor also names its editor, but the table is read-only until editable: true is added. When the fields arrive as a list (from a server or a constant), use define-columns-with-descriptors#from-a-field-list to build the descriptors from it instead. |
| `starter-explorer-table` | Every column of a dashboard data source, discovered without listing them, sortable and filterable from the headers, with each user's layout saved and smooth scrolling over all rows. The column picker is on by default. For a table only this table uses, swap the first recipe for load-from-a-data-source-directly. |
| `starter-report-table` | A read-only MapLarge table sorted by a column, with the clicked row's details in a panel beside it and the row count along the bottom. |
| `starter-editable-table` | Rows held in code that users edit in place, with a dropdown column, an Add button, checkboxes to delete or retire several rows, and a Save button that sends the rows edited in cells. Rows retired, added or deleted with the buttons do not reach Save (store.mutations does not call onRowUpdate); start from save-added-changed-and-deleted-rows when they must. |
| `starter-live-table` | Rows held in code that change every few seconds, such as readings from a feed, with status badges, rows colored by condition and a bar for a percentage. |

## Getting data in

| Recipe | Use it to |
| --- | --- |
| `load-from-dashboard-data-source` | Show a MapLarge table through the dashboard's data store. Rows page in from the server as the user scrolls, and filters other widgets set on the same source narrow the table. |
| `bind-to-the-dashboard-table-transform` | Add a table to a dashboard built in the dashboard editor. A DataTableTransform builds the table options from a dashboard data source, and the dataTable node binds to the transform by name. This is the starting point for every dashboard-editor table; merge recipes' view definition JSON into this node. |
| `load-from-a-data-source-directly` | Show a MapLarge table without registering it on the dashboard data store, so dashboard filters do not apply to it. |
| `load-static-rows` | Show rows the ViewModel already holds, such as a fixed list or rows computed in code. Sorting and filtering run in the browser. |
| `load-from-an-api` | Show rows from a REST endpoint or any async source, fetched a page at a time as the user scrolls. |
| `load-from-an-api#stand-in-in-code` | Serve pages of rows from code the way a paged API would, applying the table's sort and filter, for a demo or a test before the real service exists. |
| `switch-data-source` | Let the user pick which data source the table shows. Picking a source rebuilds the table for it. |
| `update-rows-live` | Change rows held in code while the table is open, keeping the user's sort and filters: readings from a live feed on a timer, a Refresh button, a repaint of a change made elsewhere, or an Undo button that reverts the last edit. |
| `update-rows-live#refresh-button` | Re-query the rows when the user asks, with a line under the table saying when, instead of on a timer. |
| `update-rows-live#repaint-only` | Show a change made somewhere else, such as a save through another API, in the rows already on screen without re-querying or saving again. |
| `update-rows-live#undo-last-edit` | An Undo button above an editable table that reverts the most recent edit, then the one before, and is disabled when there is nothing to undo. |
| `update-rows-live-in-place` | Change rows held in code while the table is open, in a table long enough to scroll, without moving the user's scroll position: each update patches the loaded rows where they are. |
| `connect-a-custom-data-engine` | Back the table with any source the built-in engines do not cover, owning paging, sorting and filtering yourself. |

## Columns

| Recipe | Use it to |
| --- | --- |
| `choose-columns` | Pick which fields a table with a static schema shows, and in what order. |
| `show-only-some-columns` | Show only the columns you list when the table discovers its columns from the source, as every dashboard-editor table does. |
| `rename-headers` | Give columns readable header text, derive header text from column keys in code, or align headers. |
| `size-and-align-columns` | Set fixed, flexible or bounded column widths, and align cell content. |
| `show-all-columns-automatically` | Show whatever columns the source has without listing them, hide system columns by name, and apply settings to every discovered column. |
| `hide-columns` | Start a column hidden, or hide every column whose name matches a pattern. |
| `hide-empty-columns` | Hide columns that hold no data, and show them again. |
| `add-computed-column` | Show a value calculated from other fields, such as a ratio or a combined label. |
| `add-action-buttons` | Put a button in every row, such as Retire, Open or Delete, that runs a ViewModel method for that row; the variants set a value with one click on stars or a row of choices, or toggle a yes/no field with a checkbox in its cell. |
| `add-action-buttons#click-to-set` | Change a value with one click on something drawn in the cell, such as rating stars or a row of choices, without opening an editor. |
| `add-action-buttons#checkbox` | Show a true/false field as a checkbox that changes with one click in its cell, such as Done or Paid, with a count of checked rows under the table and the unchecked rows greyed and struck through. |
| `define-columns-with-descriptors` | Describe each field once (type, label, limits, editor) and get the schema, columns, editors and filters from it. |
| `define-columns-with-descriptors#from-a-field-list` | Turn a list of fields sent by a server (name, label, type and, for a pick-list, its options) into descriptors at runtime, so the columns, schema and editors follow the list instead of being written by hand. |
| `add-a-custom-column-type` | Give a kind of value its own column type, with its own default alignment, formatter and filter input. |

## Formatting values

| Recipe | Use it to |
| --- | --- |
| `format-numbers-and-currency` | Show numbers with decimals, thousands separators, currency or percent signs. |
| `format-dates-and-times` | Show a date without its time, a time alone, or one timestamp as separate date and time columns, in the user's time zone and date preferences. |
| `change-text-case` | Show text in upper, lower, title or camel case without changing the data. |
| `format-coordinates` | Show a point location as degrees-minutes-seconds or another coordinate format. |
| `show-units` | Show a measurement with its unit, converted to the unit people expect (meters as feet, for example). |
| `map-values-to-labels` | Show readable names for codes or ids, such as "In Maintenance" for maintenance. |
| `map-values-to-labels#booleans` | Show true and false as Yes and No, or any two labels, with the built-in boolean formatter. |
| `write-a-custom-formatter` | Format values in a way no built-in formatter covers, and reuse it by name on any column. |

## Rich cells

| Recipe | Use it to |
| --- | --- |
| `show-badges-and-icons` | Show a value as a colored badge, an icon, a dot, initials in a circle, one badge per list item or text built from several fields: transformValue decides what each row shows, and the cell template binds it. |
| `show-badges-and-icons#per-list-item` | Show one colored badge for each item of a list field, such as an issue's labels or an asset's tags, and none for an empty list. |
| `show-badges-and-icons#initials` | Show a small round avatar with each row's initials, each row given one of a few colors, with no images. |
| `show-badges-and-icons#dot-and-value` | Show a small colored indicator next to a value, such as a red, green or grey dot for a level. |
| `show-badges-and-icons#combined-text` | Show several fields together in one cell, such as a name with its category underneath. |
| `add-links` | Make a cell a clickable link to a URL or another page, or show a thumbnail from an image URL field: the href or src is bound to a path, never built inside the binding. |
| `add-links#image` | Show a thumbnail from an image URL field. |
| `show-charts-in-cells` | Show a small trend chart in every row, or a value as a horizontal bar next to its number: transformValue builds the chart options per row and the template binds chartOptions to them. |
| `show-charts-in-cells#bar` | Show a value as a small horizontal bar next to its number, such as utilization as a percent bar. |
| `wrap-long-text` | Wrap long text onto several lines, with rows growing to fit. |

## Color and style

| Recipe | Use it to |
| --- | --- |
| `color-rows-and-cells` | Highlight whole rows that meet a condition, such as assets in maintenance, or color one column's cells by their value, such as red above a threshold, through the theme's row and cell rules. |
| `color-rows-and-cells#cells` | Color one column's cells by their value, such as red above a threshold and green below. |
| `style-the-table` | Change the overall look: striping, header and cell styling, and CSS classes on a column. |

## Sort and filter

| Recipe | Use it to |
| --- | --- |
| `sort-columns` | Start the table sorted, such as newest first, and turn sorting off for columns where it makes no sense. |
| `filter-columns` | Let users filter by column values, see which filters are active, and clear them. |
| `narrow-the-table-from-controls` | A control above the table that narrows the rows: a search box that matches as the user types, preset buttons with the active one highlighted, a dropdown of values, a checkbox toggle, or a pinned scope set from code. Every one is a ViewModel member, a handler and actions.setConstraint. |
| `narrow-the-table-from-controls#preset-buttons` | Buttons above the table that each narrow it to a preset, such as Today, Last 7 days and All, with the active button highlighted. |
| `narrow-the-table-from-controls#dropdown` | A dropdown above the table listing All and each value of a field, such as a region or a category; picking one narrows the table to it. |
| `narrow-the-table-from-controls#checkbox` | A checkbox above the table, such as In service only or Low stock only, that narrows the table while checked and shows every row again when unchecked. |
| `narrow-the-table-from-controls#pinned-scope` | Pin the table to part of the data from code, such as active assets only, with no control, in a way Clear All Filters does not remove and code can switch on and off. |
| `narrow-the-table-from-controls#over-an-api` | The same search box when the rows come from asyncData (an API or a stand-in for one): fetchRows never sees a constraint, so the search text stays in the ViewModel, fetchRows filters on it, and the handler re-reads the rows. |
| `build-a-custom-filter-control` | Replace the filter input for a column type with your own control. |

## Rows and menus

| Recipe | Use it to |
| --- | --- |
| `select-rows` | Highlight the clicked row, or let users check several rows with checkboxes. |
| `react-to-row-selection` | Do something when a row is clicked: subscribe to the selection, read the row with store.getRow, set ViewModel members and update. The variants show the row's fields in a panel beside the table, or its related rows in a second table (master-detail). |
| `react-to-row-selection#details-panel` | Show the clicked row's fields in a panel next to the table. |
| `react-to-row-selection#second-table` | Master-detail: clicking a row in the main table fills a second table with that row's related rows (an order's lines, an asset's inspections), with a message in its place until a row is clicked. |
| `act-on-checked-rows` | Run one action on every checked row, such as bulk delete or a bulk change, from a button that is disabled while nothing is checked; the variant moves the checked rows into a second table. |
| `act-on-checked-rows#move-to-another-table` | Two tables side by side, such as two warehouses or available and chosen items, with buttons that move the checked rows from one to the other and a count under each. |
| `right-click-menus` | Add your own items to the right-click menu of a row's cells, after the built-in Copy and before Edit (which appears only on columns users can edit), such as actions that change the clicked row. |
| `keyboard-and-copy` | Let users move between cells with the arrow keys and copy a cell's text. |

## Editing

| Recipe | Use it to |
| --- | --- |
| `edit-cells` | Let users edit chosen columns in place, opening the editor by double-click or the right-click menu (and Enter on a selected cell when the table has a selection engine); the variant rejects values outside a range or a missing required value through the schema entry's descriptor. |
| `edit-cells#validation` | Keep edited values within limits, such as hours between 0 and 24 or a required name, rejecting anything else without custom editor code. |
| `edit-with-a-dropdown` | Let users pick a cell's value from a list, in an ordinary table of columns. |
| `edit-in-a-dialog` | Edit a long value in a dialog instead of inside the cell. |
| `choose-editable-columns` | Make the whole table editable except some columns, or only columns matching a name pattern, without setting editing on each column. |
| `add-rows` | Let users add a new row with a button, saving it through the data engine. |
| `delete-rows` | Put a Delete button in every row that removes that row, saving through the data engine. |
| `save-edits` | Send each edited row to your own service as the user commits the edit. |
| `save-edits-with-a-button` | Let users edit rows freely, then save every change at once with a Save button. |
| `save-added-changed-and-deleted-rows` | Let users add, edit and delete rows, then send everything added, changed and deleted since the last save with a Save button. |
| `update-derived-values-after-edits` | Recompute values that depend on edited fields, such as a ratio in its own column and a total under the table, as soon as an edit is saved. |
| `build-a-custom-editor` | Edit a value with your own editor UI, such as a row of buttons. |

## Dashboard and map

| Recipe | Use it to |
| --- | --- |
| `share-filters-with-the-dashboard` | Decide whether the table follows filters other widgets set, and whether its own filters reach them. |
| `filter-to-map-view` | Put a map beside the table, draw the table's rows on it, and narrow the table to rows inside the visible map area as the user pans and zooms. |
| `build-a-custom-integration` | Connect the table to something outside it, such as keeping the sort in the page URL. |

## Status, footer and overlays

| Recipe | Use it to |
| --- | --- |
| `show-a-line-under-the-table` | A line under the table: a sentence the ViewModel works out from the rows, such as a total or how many are overdue, or (the variants) the table's own row count in the status bar, with or without when the data was last refreshed. |
| `show-a-line-under-the-table#status-bar-count` | Show how many rows the table has, in your own words, along the bottom of the table, following every sort, filter and constraint by itself. |
| `show-a-line-under-the-table#freshness` | Show which rows are visible out of the total, in your own words, and when the data was last refreshed. |
| `add-a-footer-toolbar` | Put table controls under the table: hide empty columns, sync with the map, export. |
| `show-overlays` | Show a message over the table, such as when no rows match the filters, and control the loading overlay. |

## Export and saved layouts

| Recipe | Use it to |
| --- | --- |
| `export-rows` | Let users download the table's data from the footer's Export, or (the variant) from an Export button above the table that exports the checked rows with a label counting them. |
| `export-rows#checked-with-a-button` | An Export button above the table that downloads the checked rows as a CSV file (every row when none are checked), with a label next to it counting the checked rows. |
| `let-users-configure-columns` | Let users rename, show, hide, reorder and reformat columns themselves, with columns grouped in the picker. |
| `save-user-layouts` | Keep each user's sort, filters, column widths, order, visibility, headers, formats and units across visits, with a way to reset. |
| `save-layouts-to-your-own-backend` | Store saved table layouts somewhere other than browser storage or user preferences. |

## Layout and scale

| Recipe | Use it to |
| --- | --- |
| `size-the-table` | Give the table the height it needs: a fixed height, or the full height of a panel or dialog. |
| `handle-large-data` | Keep scrolling smooth with very many rows. |
| `load-more-at-the-bottom` | Grow the table as the user scrolls down, fetching more rows at the bottom, for feeds or sources whose total row count is unknown. |
| `handle-wide-data` | Keep the table fast with hundreds or thousands of columns. |
| `tune-performance` | Trade rendering work for smoothness on slow devices or heavy cell templates. |

## From code

| Recipe | Use it to |
| --- | --- |
| `control-the-table-from-code` | Sort, filter, refresh, select rows, or show and hide columns from ViewModel code. |
| `react-to-events` | Run code when the user sorts, filters or edits, or when another action completes. |
| `build-a-custom-engine` | Replace a built-in engine (status bar, footer, overlay, scrolling, slots) with your own; the status bar shown here follows the same pattern as the others. |
| `debug-the-table` | Find out why the table is slow, empty or not updating. |

A `recipe#variant` row is a variant of that recipe, in a file of its own, `reference/recipes/<recipe>--<variant>.md`, holding the recipe and the variant's changes.
