# Data Table recipe - Export checked rows with a button

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## export-rows

**Export rows, all or checked.** Let users download the table's data from the footer's Export, or (the variant) from an Export button above the table that exports the checked rows with a label counting them.

Merge into createDataTable({ ... }) `[options]`:

```ts
footer: dataTable.viewModel.footer.footerToolbar({ showExport: true }),
onExport: () => {
    const header = "id,name,category,status";
    const lines = assets.map((asset) => [asset.id, asset.name, asset.category, asset.status].join(","));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }));
    link.download = "assets.csv";
    link.click();
},
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "footer": { "strategy": "footerToolbar", "args": { "showExport": true } } }
```

Code only, not in the JSON form: onExport.

- Tables on a MapLarge source open the standard MapLarge export dialog without onExport; onExport replaces it, for example for rows held in code.
- For an Export button above the table, or one that exports only the checked rows, see the checked-with-a-button variant below.

Reference: `status-bar-status-bar`

### export-rows#checked-with-a-button

**Export checked rows with a button.** An Export button above the table that downloads the checked rows as a CSV file (every row when none are checked), with a label next to it counting the checked rows.

Apply the recipe above, then:

Module scope `[module]`:

```ts
function csvCell(value: unknown): string {
    return "\"" + String(value ?? "").replace(/"/g, "\"\"") + "\"";
}
```

ViewModel members `[members]`:

```ts
public checkedLabel = "0 checked";
private readonly unsubscribeChecks: (() => void)[] = [];

private updateCheckedLabel(): void {
    this.checkedLabel = String(this.store?.getCheckboxRowsSelectedIndices().length ?? 0) + " checked";
    this.update();
}

public readonly exportCsv = async (): Promise<void> => {
    const store = this.store;
    if (!store) return;
    const fetched = await store.getRowsFromDataEngine({ rowIndices: [...store.getCheckboxRowsSelectedIndices()], checkCache: true });
    const checked = fetched.filter((asset): asset is Asset => asset !== undefined);
    const rows = checked.length > 0 ? checked : assets;
    const lines = rows.map((asset) => [asset.id, asset.name, asset.category, asset.cost, asset.lastInspected].map(csvCell).join(","));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([["Id,Name,Category,Cost,Last Inspected", ...lines].join("\n")], { type: "text/csv" }));
    link.download = "assets.csv";
    link.click();
};
```

Merge into createDataTable({ ... }) `[options]`, in place of the recipe's block:

```ts
checkboxRows: { showSelectAll: true },
```

After createDataTable `[afterCreate]`:

```ts
this.unsubscribeChecks.push(
    store.subscribe(actions.checkboxToggleRow, () => this.updateCheckedLabel()),
    store.subscribe(actions.checkboxSelectAll, () => this.updateCheckedLabel()),
    store.subscribe(actions.checkboxUnselectAll, () => this.updateCheckedLabel()),
);
```

In destroy() `[destroy]`:

```ts
for (const unsubscribe of this.unsubscribeChecks) unsubscribe();
```

Above the table (view) `[viewBefore]`:

```ts
s.div({ flex: { dFlex: true, alignItemsCenter: true, gap: 2 }, margin: { bottom: 2 } }).contentTemplates((bar) => {
    bar.button({ kind: "primary", size: "small", events: [{ event: "click", handler: "exportCsv" }] })
        .contentTemplates((button) => { button.span({ text: "Export" }); });
    bar.span({ bindings: { text: "checkedLabel" } });
});
```

View definition JSON for this variant's options, merged over the recipe's:

```json
{ "checkboxRows": { "showSelectAll": true } }
```

- The three checkbox actions fire when a box is checked or unchecked, when Select All is clicked and when everything is unchecked; store.getCheckboxRowsSelectedIndices() then returns the checked rows' positions, read with store.getRow.
- "Every row" here is the array the table was given. Edits are written into those same row objects, so they are in it; rows users add or delete change only the engine's copy and are not. If users can add or delete rows, keep your own list of the current rows and change it in the add and delete handlers too.
- csvCell quotes every value and doubles any quote inside it, so commas and quotes in names survive. List the columns to export in the header line and in the same order in each line.
- Export values as the rows store them: money in dollars, dates as their ISO text. new Date("2026-10-09") is midnight UTC, so toLocaleDateString() prints the day before anywhere west of Greenwich; leave a date-only string as it is, or cut it apart, rather than passing it through Date.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [export-rows](export-rows.md): Export rows, all or checked
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [status-bar-status-bar](../status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
