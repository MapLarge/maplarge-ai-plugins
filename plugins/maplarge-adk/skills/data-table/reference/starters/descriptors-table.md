# Data Table starter - Descriptors table

<!-- Automatically generated, do not edit -->

A dashboard data source whose columns, schema and filters come from descriptors written out in code; each descriptor also names its editor, but the table is read-only until editable: true is added. When the fields arrive as a list (from a server or a constant), use define-columns-with-descriptors#from-a-field-list to build the descriptors from it instead.

Built from the base table and these recipes, in order: `load-from-dashboard-data-source`, `define-columns-with-descriptors`.

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Asset = {
    readonly name: string;
    readonly category: string;
    readonly cost: number;
    readonly lastInspected: string;
    readonly inService: boolean;
};
const assetDescriptors = dataTable.viewModel.columns.defineColumnDescriptors<Asset>()({
    name: { type: "Text", label: "Name", sortOrder: 1, required: true, column: { width: toPixels(220) } },
    category: { type: "Text", label: "Category", sortOrder: 2 },
    cost: { type: "Number", label: "Cost", sortOrder: 3, min: 0, column: { align: "right", formatter: "currency" } },
    lastInspected: { type: "Text", label: "Last Inspected", sortOrder: 4, column: { formatter: "datetime" } },
    inService: { type: "Checkbox", label: "In Service", sortOrder: 5 },
});

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "assets", dataSource: "my_account/assets" });
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.dataStoreData<Asset>({ dataStore: this.dataStore, dataSourceName: "assets" }),
            descriptors: assetDescriptors,
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
- [define-columns-with-descriptors](../recipes/define-columns-with-descriptors.md): Define columns with descriptors
