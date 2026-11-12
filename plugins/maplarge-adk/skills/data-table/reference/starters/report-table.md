# Data Table starter - Report table

<!-- Automatically generated, do not edit -->

A read-only MapLarge table sorted by a column, with the clicked row's details in a panel beside it and the row count along the bottom.

Built from the base table and these recipes, in order: `load-from-a-data-source-directly`, `sort-columns`, `react-to-row-selection#details-panel`, `show-a-line-under-the-table#status-bar-count`.

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { actions, createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Asset = {
    readonly name: string;
    readonly category: string;
    readonly lastInspected: string;
    readonly lengthMeters: number;
    readonly notes: string;
};

export const assetSchemaEntries = {
    name: schema.string(),
    category: schema.string(),
    lastInspected: schema.datetime(),
    lengthMeters: schema.number(),
    notes: schema.string(),
};

export const assetSchema = dataTable.viewModel.schema.createSchema({ entries: assetSchemaEntries });

const { column } = dataTable.viewModel.defineColumns<Asset>();

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;
    public selectedName = "Select an asset";
    public selectedCategory = "";
    public selectedLength = "";
    public selectedNotes = "";
    private unsubscribeSelection: (() => void) | null = null;

    public async initialize(): Promise<void> {
        const dataSource = await ml.data.dataSource.fromTableAsync("my_account/assets");
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.dataSourceData<Asset>({ dataSource }),
            schema: assetSchema,
            columns: [
                column({ field: "name", header: "Name", width: toPixels(220) }),
                column({ field: "category", header: "Category", width: toPixels(120) }),
                column({ field: "lastInspected", header: "Last Inspected" }),
                column({ field: "notes", header: "Notes", sort: false }),
            ],
            defaultSort: { key: "lastInspected", direction: "desc" },
            tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "row" }),
            statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
                formatStatusText: ({ totalRows }) =>
                    totalRows === undefined ? "" : totalRows.toLocaleString() + (totalRows === 1 ? " asset" : " assets"),
            }),
        });
        this.dataTableOptions = options;
        this.store = store;
        this.unsubscribeSelection = store.subscribe(actions.selectCell, ({ selection }) => {
            const asset = store.getRow(selection.coordinates.row);
            if (asset === undefined) return;
            this.selectedName = asset.name;
            this.selectedCategory = asset.category;
            this.selectedLength = asset.lengthMeters.toLocaleString() + " m";
            this.selectedNotes = asset.notes;
            this.update();
        });
        this.update();
    }

    public destroy(): void {
        this.unsubscribeSelection?.();
        super.destroy();
    }
}
```

## view.ts

```ts
import { RSScriptor } from "index";
import type { ViewDefinitions } from "index";
import { dataTableOptions } from "data-ui/data-table";
import type { Asset, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("AssetTable", "Assets");
    s.view("main", (s) => {
        s.div({ heightPercentage: 100 }).contentTemplates((s) => {
            s.div({ height: 400, flex: { dFlex: true, gap: 3 } }).contentTemplates((row) => {
                row.div({ flex: { flex: 1 }, overflow: "hidden" }).contentTemplates((s) => {
                    s.dataTable(dataTableOptions<Asset>({
                        bindings: { data: "dataTableOptions" },
                    }));
                });
                row.div({ width: 300, padding: { x: 3, y: 2 }, flex: { flexShrink: 0 }, overflow: "auto" }).contentTemplates((panel) => {
                    panel.div({ fontSize: 5, fontWeight: "bold", bindings: { text: "selectedName" } });
                    panel.div({ margin: { top: 2 }, fontWeight: "semibold", text: "Category" });
                    panel.div({ bindings: { text: "selectedCategory" } });
                    panel.div({ margin: { top: 2 }, fontWeight: "semibold", text: "Length" });
                    panel.div({ bindings: { text: "selectedLength" } });
                    panel.div({ margin: { top: 2 }, fontWeight: "semibold", text: "Notes" });
                    panel.div({ wordBreak: true, bindings: { text: "selectedNotes" } });
                });
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [load-from-a-data-source-directly](../recipes/load-from-a-data-source-directly.md): Load from a data source directly
- [sort-columns](../recipes/sort-columns.md): Sort columns
- [react-to-row-selection#details-panel](../recipes/react-to-row-selection--details-panel.md): Details beside the table
- [show-a-line-under-the-table#status-bar-count](../recipes/show-a-line-under-the-table--status-bar-count.md): The row count in the status bar
