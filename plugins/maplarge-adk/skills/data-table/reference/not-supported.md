# Data Table - not supported

<!-- Automatically generated, do not edit -->

The table does not have these features. Tell the developer, and offer the nearest thing it does instead; never invent an option for them.

| Not supported | Do this instead |
| --- | --- |
| Pinned or frozen columns that stay in place while scrolling sideways | Put the key column first, and keep the table narrow enough not to scroll sideways. |
| Grouped header rows spanning several columns | Name the group in each header, such as "Pressure (psi)". A column's group only groups it in the column picker. |
| Sorting by more than one column at a time | One sort column at a time; defaultSort takes one. |
| Totals or summary rows | Add up your own copy of the rows in the ViewModel and show the total under the table or in the status bar text (update-derived-values-after-edits). The status bar is given counts, not rows; for a total over only the rows the user's filters leave, read positions 0 to totalRows - 1 with store.getRowsFromDataEngine after each filter change (cheap for rows held in code, a full read for a server). Never add the total as a row of data: it is counted, filtered and sorted with the others, and a descending sort moves it to the top. |
| Pages with page numbers | Scrolling: handle-large-data or load-more-at-the-bottom. |
| Grouped, expandable or tree rows | Show the clicked row's details beside the table (react-to-row-selection#details-panel), or its related rows in a second table (react-to-row-selection#second-table). |
| Highlighting or zooming to the clicked row on a map | react-to-row-selection hands the clicked row to your code, and its details-panel variant shows it. The built-in map link only narrows the table to the map view (filter-to-map-view). These skills document no map methods, so leave the highlight to the developer rather than guessing map calls. |
| Tooltips on headers or cells | Show the extra text in a details panel or in a cell template. |
| Formatters for JSON or lists | For JSON, show a short summary in the cell with transformValue, and the clicked row's JSON.stringify(value, null, 2) in a panel beside the table (react-to-row-selection#details-panel) on a div with textWrap2: "pre-wrap", a Raptor option that keeps the line breaks a cell drops. For lists, show-badges-and-icons#per-list-item. |
| Editing a percent as the percent shown, such as typing 7.5 to store 0.075 | Only a column with units converts both ways (it is edited in its display unit and saved in the stored unit); a percent formatter changes only the display, and a trigger's transformEditValue converts on commit but not when the editor opens. Store the value as users type it (a rate of 7.5 for 7.5%), check its range with edit-cells#validation, and divide by 100 in code where you compute with it; or keep the fraction and let users type the fraction. |
| A pick-list of a column's values in the filter dialog | The Equal Any operator takes several typed values (filter-columns). |
| Units the platform has no measurement type for, such as psi, bar or volts | The platform converts only distance, area, mass, temperature, speed, altitude, altimeter, visibility and time; any other type shows the value labelled UNK. Show the number as stored and put the unit in the header text, such as Pressure (psi). |
