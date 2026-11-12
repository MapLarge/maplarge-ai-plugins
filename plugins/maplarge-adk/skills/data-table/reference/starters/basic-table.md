# Data Table starter - Basic table

<!-- Automatically generated, do not edit -->

The common table: a dashboard data source with listed, sortable columns.

Built from the base table and these recipes, in order: `load-from-dashboard-data-source`, `sort-columns`.

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Asset = {
    readonly name: string;
    readonly category: string;
    readonly lastInspected: string;
    readonly notes: string;
};

export const assetSchemaEntries = {
    name: schema.string(),
    category: schema.string(),
    lastInspected: schema.datetime(),
    notes: schema.string(),
};

export const assetSchema = dataTable.viewModel.schema.createSchema({ entries: assetSchemaEntries });

const { column } = dataTable.viewModel.defineColumns<Asset>();

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "assets", dataSource: "my_account/assets" });
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.dataStoreData<Asset>({ dataStore: this.dataStore, dataSourceName: "assets" }),
            schema: assetSchema,
            columns: [
                column({ field: "name", header: "Name", width: toPixels(220) }),
                column({ field: "category", header: "Category", width: toPixels(120) }),
                column({ field: "lastInspected", header: "Last Inspected" }),
                column({ field: "notes", header: "Notes", sort: false }),
            ],
            defaultSort: { key: "lastInspected", direction: "desc" },
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
- [sort-columns](../recipes/sort-columns.md): Sort columns
