# Data Table starter - Map table

<!-- Automatically generated, do not edit -->

A dashboard data source shown in a table next to a map, with the table following the map view.

Built from the base table and these recipes, in order: `load-from-dashboard-data-source`, `filter-to-map-view`.

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Asset = {
    readonly id: number;
    readonly name: string;
    readonly category: string;
};

export const assetSchemaEntries = {
    id: schema.number(),
    name: schema.string(),
    category: schema.string(),
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
            ],
            integrations: [
                { engine: dataTable.viewModel.integrations.mapViewportSync({ mapId: "assetsMap", debounceMs: 250 }) },
            ],
            footer: dataTable.viewModel.footer.footerToolbar({ showSyncWithViewport: true }),
        });
        this.dataTableOptions = options;
        this.store = store;
        this.registerLayers([{ id: "assetsLayer", dataSourceName: "assets", baseLayerOpts: { name: "Assets", visible: true } }]);
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
            s.div({ height: 500, flex: { dFlex: true, gap: 3 } }).contentTemplates((row) => {
                row.div({ flex: { flex: 1 } }).contentTemplates((mapPane) => {
                    mapPane.raptorMap({
                        viewName: "assetsMap",
                        mapOptions: { mapId: "assetsMap", api: "LEAFLET", lat: 25.76, lng: -80.19, z: 11 },
                        bindings: { data: "defaultMapOptions" },
                    });
                });
                row.div({ flex: { flex: 1 }, overflow: "hidden" }).contentTemplates((s) => {
                    s.dataTable(dataTableOptions<Asset>({
                        bindings: { data: "dataTableOptions" },
                    }));
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
- [load-from-dashboard-data-source](../recipes/load-from-dashboard-data-source.md): Load from a dashboard data source
- [filter-to-map-view](../recipes/filter-to-map-view.md): Show only rows in the map view
