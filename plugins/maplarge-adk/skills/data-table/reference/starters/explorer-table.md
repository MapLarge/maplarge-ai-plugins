# Data Table starter - Explorer table

<!-- Automatically generated, do not edit -->

Every column of a dashboard data source, discovered without listing them, sortable and filterable from the headers, with each user's layout saved and smooth scrolling over all rows. The column picker is on by default. For a table only this table uses, swap the first recipe for load-from-a-data-source-directly.

Built from the base table and these recipes, in order: `load-from-dashboard-data-source`, `show-all-columns-automatically`, `save-user-layouts`, `handle-large-data`.

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { actions, applyRule, createDataTable, dataTable, excludeRule, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Asset = {
    readonly id: number;
    readonly name: string;
    readonly cost: number;
    readonly photoUrl: string;
    readonly trend: readonly number[];
};
const discoveredAssetSchema = dataTable.viewModel.schema.createDiscoverableSchema({
    entries: {},
    discoveryRules: [
        excludeRule({ type: "regex", pattern: "^(id|photoUrl|trend)$" }),
        applyRule({ type: "exact", value: "cost" }, { columnType: "number" }),
    ],
});

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;
    public readonly resetLayout = (): void => {
        this.store?.dispatch(actions.clearStorage());
        this.store?.dispatch(actions.resetGrid());
    };

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "assets", dataSource: "my_account/assets" });
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.dataStoreData<Asset>({ dataStore: this.dataStore, dataSourceName: "assets" }),
            schema: discoveredAssetSchema,
            discoveredColumnRules: [
                { match: { type: "regex", pattern: "." }, sideEffects: { width: toPixels(140) } },
            ],
            storage: dataTable.viewModel.storage.userPrefs({ preferenceKey: "assets-table" }),
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(28) }),
            rowSlots: dataTable.viewModel.rowSlots.virtualizedRows({ slots: 120 }),
        });
        this.dataTableOptions = options;
        this.store = store;
        this.update();
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
            s.button({ kind: "secondary", size: "small", margin: { right: 2, bottom: 2 }, events: [{ event: "click", handler: "resetLayout" }] })
                .contentTemplates((button) => { button.span({ text: "Reset layout" }); });
            s.div({ height: 400 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Asset>({
                    bindings: { data: "dataTableOptions" },
                }));
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [load-from-dashboard-data-source](../recipes/load-from-dashboard-data-source.md): Load from a dashboard data source
- [show-all-columns-automatically](../recipes/show-all-columns-automatically.md): Show every column automatically
- [save-user-layouts](../recipes/save-user-layouts.md): Save each user's layout
- [handle-large-data](../recipes/handle-large-data.md): Handle large data
