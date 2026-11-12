# Data Table - Pitfalls

<!-- Automatically generated, do not edit -->

Mistakes that come up repeatedly when writing data table code.

## Authoring

- Passing { binding: "name" } to createDataTable(...), or dataTable.view.\* helpers that carry one. createDataTable resolves plain { strategy, args } references but throws on a binding ("unexpected { binding } while resolving ViewModel args"); in the ViewModel build options with dataTable.viewModel.\* and pass members themselves. A view written in code may still use dataTable.viewModel.\* for things with no View form, such as a templated cell editor, as the CRUD example does.
- Inventing option, action, or property names. Check the property tables for the exact name, type, and default before writing one.
- Copying patterns from other grids or from memory instead of from the recipes, starters and examples.
- Assuming a feature exists because nothing says it does not. Pinned columns, grouped headers, multi-column sort, totals rows, page numbers and grouped or tree rows are not supported; Not supported in `SKILL.md` lists what to do instead.

## Layout

- Placing the table in a container without a pixel height. The table fills its parent, so give the parent one, for example s.div({ height: 400 }). heightPercentage: 100 has nothing to measure in a page or sandbox: the table grows as tall as all its rows, only its row slots render, and the page scrolls into blank space.
- Giving a view more than one root node. s.view("main", (s) => { ... }) keeps only the first node it creates; a toolbar above the table and the table's container side by side means the table never appears. Wrap them in one s.div().
- Guessing layout props around a table. width and height on a div are pixels, heightPercentage is a percentage of the parent, flex: { dFlex: true, gap: 3 } makes a row and flex: { flex: 1 } a child that takes the rest. Spacing (padding, margin) takes top, bottom, left, right, x and y, not start or end.
- Putting the table beside a panel or a map in a flex row without overflow: "hidden" on the table's pane. A flex child cannot shrink below its content, so a table wider than its share pushes the panel out of view.
- Guessing text props. fontSize takes 1 to 6 (Bootstrap's fs-1 to fs-6, 1 largest) or "small", not pixels; fontWeight takes "bold", "semibold", "normal" and the like; wordBreak is true or false. Nodes have no prefix or suffix: build the text in the ViewModel and bind it.

## Data

- Editing rows held in code with arrayData and no getRowId. The engine finds an edited row by getRowId; without it the edit shows on screen but never reaches the engine's copy, and reverts at the next sort, filter or refresh.
- Patching live rows with store.rows.applyUpdate by their index in your own array. rowIndex is the row's position in the table as sorted and filtered now; read it with store.getRow and match by id.
- Changing a row from a menu item or a button with store.rows.applyUpdate. It only repaints, so the next sort brings the old value back; store.mutations.update({ rowIndex, row, fields }).run() saves the change through the data engine.
- Importing or declaring ml. It is a global in dashboard and sandbox code.
- Exporting helper functions from view-model.ts. A code sandbox loads the first exported function as the ViewModel, so an exported helper or editor factory above the class fails with "vmCtor is not a constructor". Export types, data and the ViewModel class only.
- Leaving filterCapabilities off asyncData. The filter dialog offers only the operators the data engine lists, so without it every filter dialog opens with no condition and Add condition does nothing. List the operators your fetchRows applies (see load-from-an-api).
- Skipping live rows whose shown value already equals the new one. arrayData's updateRow writes the new values into the row objects the table holds, so store.getRow already returns them and nothing repaints; patch every shown row (see update-rows-live-in-place).
- Comparing a date-only value with today through new Date("2026-10-10"). That is midnight UTC, the evening before west of Greenwich, so a task due today counts as past due; compare the text with today's local date as text (see format-dates-and-times).
- Finding edits by comparing with the rows passed to arrayData. arrayData writes each committed edit into those same row objects, so a "before" copy that holds them changes too. Record changes as they happen in onRowUpdate (see save-edits-with-a-button).

## Editing

- Writing a custom editor to check a range or a required value. min and max on a Number descriptor, and required on any descriptor, already reject invalid input (see edit-cells#validation).
- Clearing the cell in a CellEditor class (cellElement.innerHTML = ""). The table does not redraw a cell after a cancelled edit, so the cell stays blank. Move the cell's child nodes into a DocumentFragment in startEdit and put them back with replaceChildren in endEdit and cancelEdit.

## Bindings

- Wrapping a literal value in { binding: "..." }. A binding names a ViewModel member; when no ViewModel has that member the table reports: { binding: "name" } did not resolve on any live ViewModel context. A literal such as a preferenceKey string goes in as plain text.
- Copying a View example's { binding: "extraCellItems" } into createDataTable. In the ViewModel pass the member itself (cellContextMenuItems: [this.extraCellItems], transformValue: this.formatTime); a { binding } there is a type error, and for some options it throws and the table never appears.
- Binding an item of a list or comparing in a binding, such as displayValue + ".labels[0].name" or ".color == 'bg-danger'". A binding is a dot path with no [index] and no comparison, so no badge shows and no class applies. Turn the list into named slots and each value into flags in transformValue (see show-badges-and-icons#per-list-item).
- Searching a field that holds an object, such as an assignee stored as { name, color }. On rows held in code Contains compares the value as text, and an object becomes [object object], so it never matches the name (and wrongly matches searches such as obj); search a text field holding the name (see narrow-the-table-from-controls). A list of text does match, on its items joined with commas.
- Flipping a member in a checkbox's change handler (this.lowStockOnly = !this.lowStockOnly). The checked binding has already written the box's state before the handler runs, so the flip undoes it and the filter runs backwards; read the member instead (see narrow-the-table-from-controls#checkbox). Bind a checkbox with checked, not value: with value the box does not show ticked when the member starts true.
- Reverting or changing rows by rewriting the array passed to arrayData (products.length = 0; products.push(...)) and refreshing. The engine copied that array when the table was built, so nothing changes; go through store.mutations or engine.updateRow (see update-rows-live#undo-last-edit).
- Reading row inside contentTemplates. The template is built once and shared by every row, so it gets no row; reading row.stage there throws and stops the rows drawing. Return a flag from transformValue and bind it with visible or css.classes (see add-action-buttons).
- Pointing a computed column's sortField at another field, such as Agree % at the Agree count, or at a field the rows do not have. The column then sorts wrongly or not at all; store the computed value in each row and sort on that (see add-computed-column).
- Putting a plain option inside bindings. target: "_blank" on an anchor, for example, is an option of its own; inside bindings.attr "_blank" is read as a path and the link opens in the same tab.
- Writing an expression where a binding takes a path. bindingPaths.displayValue + ".label" is a path; "mailto:" + a path, === or == comparisons, a leading ! and { transform } objects are not evaluated. Compute the link, text or flag in transformValue and bind its path.
- Putting two class names in one css.classes key, such as "bg-warning text-dark". Each key is a single class; the space makes the browser throw and the cell template stops rendering. Give each class its own key bound to the same flag.
- Reading fields of the row in transformValue without a guard. transformValue also runs for empty row slots with an empty object as the row, so row.name.split(...) throws: in a data column the table logs a warning and shows the stored value, but in a virtual column there is no fallback and the table stays blank. Guard both against the empty row.
- Building a signed amount by hand with a + for increases only. Decreases then read $10.00 instead of -$10.00; give negatives their minus too.
- Rounding the seconds of a duration on their own, so 12.995 minutes shows as 12:60. Round the whole duration to seconds first, then split it: const s = Math.round(minutes * 60); Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0").
- Typing computed values (an average, a total) into the rows by hand. Work them out in code when you build the rows, or the column disagrees with the values beside it.
- Putting several nodes side by side at the top of a cell template. Only the first root node is kept, so +$2.50 (+5%) built from six spans shows only the +. Wrap them in one div, or build the text in transformValue and bind it once.
- Passing plain { rowIndex, row, fields } objects to store.mutations.compose. It takes what store.mutations.update returns; plain objects throw "m.apply is not a function" (see act-on-checked-rows).
- Writing css.styles, which does not exist, to color an element from a value. Bind Bootstrap classes to true/false flags with css.classes (or switch two class sets on one flag with css: { property, trueClasses, falseClasses }), bind a color held in the row with style: { trueStyles: { backgroundColor: path } }, or bind a Bootstrap color name with textColor or textBgColor; a theme's customTextColor and customBackgroundColor color whole cells or rows.
