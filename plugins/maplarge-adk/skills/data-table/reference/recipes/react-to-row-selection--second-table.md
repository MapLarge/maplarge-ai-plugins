# Data Table recipe - Related rows in a second table

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## react-to-row-selection

**React to row selection: details beside the table, related rows in a second table.** Do something when a row is clicked: subscribe to the selection, read the row with store.getRow, set ViewModel members and update. The variants show the row's fields in a panel beside the table, or its related rows in a second table (master-detail).

ViewModel members `[members]`:

```ts
public selectedName = "Select a row";
private unsubscribeSelection: (() => void) | null = null;
```

Merge into createDataTable({ ... }) `[options]`:

```ts
tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "row" }),
```

After createDataTable `[afterCreate]`:

```ts
this.unsubscribeSelection = store.subscribe(actions.selectCell, ({ selection }) => {
    this.selectedName = store.getRow(selection.coordinates.row)?.name ?? "";
    this.update();
});
```

In destroy() `[destroy]`:

```ts
this.unsubscribeSelection?.();
```

Below the table (view) `[viewAfter]`:

```ts
s.div({ margin: { top: 2 }, bindings: { text: "selectedName" } });
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "tableSelection": { "strategy": "row" } }
```

Code only, not in the JSON form: ViewModel members; setup code; cleanup code; view nodes.

- selection.coordinates.row is the row's index in the table's current order; read the row with store.getRow before the rows change again.
- These skills document no map or layer methods. To highlight or zoom to the selected row on a map, the developer supplies that code; never guess map calls such as allMaps lookups or style overrides.
- Both variants keep this shape and change what the subscription sets and what the view shows: members for the panel's fields, or the selected id a second table's fetchRows reads.

Reference: `cell-selection-selection-engines`, `store-store-api`

### react-to-row-selection#second-table

**Related rows in a second table.** Master-detail: clicking a row in the main table fills a second table with that row's related rows (an order's lines, an asset's inspections), with a message in its place until a row is clicked.

Apply the recipe above, then:

Module scope `[module]`:

```ts
export type Inspection = {
    readonly id: number;
    readonly assetId: number;
    readonly inspectedOn: string;
    readonly inspector: string;
    readonly result: string;
};

const inspections: Inspection[] = assets.flatMap((asset) =>
    ["Ana", "Ben", "Chen"].map((inspector, index) => ({
        id: asset.id * 10 + index,
        assetId: asset.id,
        inspectedOn: "2026-0" + String(index + 6) + "-1" + String(asset.id) + "T10:00:00Z",
        inspector,
        result: index === 2 && asset.status !== "active" ? "Failed" : "Passed",
    })),
);

const inspectionSchema = dataTable.viewModel.schema.createSchema({
    entries: { id: schema.number(), assetId: schema.number(), inspectedOn: schema.datetime(), inspector: schema.string(), result: schema.string() },
});

const inspectionColumns = dataTable.viewModel.defineColumns<Inspection>();
```

ViewModel members `[members]`, in place of the recipe's block:

```ts
public inspectionTableOptions: DataTableOptions<Inspection> | null = null;
public hasSelection = false;
public noSelection = true;
private selectedAssetId: number | null = null;
private inspectionStore: DataTableStore<Inspection> | null = null;
private unsubscribeSelection: (() => void) | null = null;
```

After createDataTable `[afterCreate]`, in place of the recipe's block:

```ts
const inspectionTable = createDataTable<Inspection>({
    data: dataTable.viewModel.data.asyncData<Inspection>({
        fetchRows: async ({ start, count }) => {
            const rows = inspections.filter((inspection) => inspection.assetId === this.selectedAssetId);
            return { rows: rows.slice(start, start + count), totalSize: rows.length };
        },
    }),
    schema: inspectionSchema,
    columns: [
        inspectionColumns.column({ field: "inspectedOn", header: "Inspected", formatter: "date", width: toPixels(140), sort: false, filtering: false }),
        inspectionColumns.column({ field: "inspector", header: "Inspector", width: toPixels(140), sort: false, filtering: false }),
        inspectionColumns.column({ field: "result", header: "Result", width: toPixels(120), sort: false, filtering: false }),
    ],
});
this.inspectionTableOptions = inspectionTable.options;
this.inspectionStore = inspectionTable.store;
this.unsubscribeSelection = store.subscribe(actions.selectCell, ({ selection }) => {
    const asset = store.getRow(selection.coordinates.row);
    if (asset === undefined) return;
    this.selectedAssetId = asset.id;
    this.hasSelection = true;
    this.noSelection = false;
    this.inspectionStore?.dispatch(actions.refresh());
    this.update();
});
```

View imports `[viewImports]`:

```ts
import type { Inspection } from "./view-model";
```

Below the table (view) `[viewAfter]`, in place of the recipe's block:

```ts
s.div({ margin: { top: 3 }, fontWeight: "semibold", text: "Inspections" });
s.div({ margin: { top: 1 }, text: "Select an asset to see its inspections", bindings: { visible: "noSelection" } });
s.div({ height: 200, margin: { top: 1 }, bindings: { visible: "hasSelection" } }).contentTemplates((s) => {
    s.dataTable(dataTableOptions<Inspection>({
        bindings: { data: "inspectionTableOptions" },
    }));
});
```

- The second table is a table of its own: its own row type, schema, columns, createDataTable call, options member and dataTable node. Its fetchRows reads the selected id from the ViewModel, and actions.refresh() on its store re-reads it after each click.
- bindings: { visible: "member" } shows a node while that member is true. There is no hide binding and a binding cannot negate a member, so keep one member per state (hasSelection and noSelection) and set both together.
- This fetchRows ignores sort and filter, so the columns turn sorting and filtering off (an asyncData column left filterable opens an empty filter dialog without filterCapabilities); filter and sort the related rows there as load-from-an-api#stand-in-in-code does if users need to.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [react-to-row-selection](react-to-row-selection.md): React to row selection: details beside the table, related rows in a second table
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cell-selection-selection-engines](../cell-selection-selection-engines.md): Selection - Selection Engines and more
- [store-store-api](../store-store-api.md): Store - Store API and more
