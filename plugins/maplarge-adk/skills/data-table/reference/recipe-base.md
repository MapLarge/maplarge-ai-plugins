# Data Table recipe base

<!-- Automatically generated, do not edit -->

Every recipe file in reference/recipes/ is a set of code blocks, each named for a slot below. Apply a recipe by putting each block at the matching `// [slot]` comment in these two files. Several recipes can be applied to the same table; columns with the same key merge (a column's key is its field unless it sets key), object options such as `theme` merge, and list options such as `integrations` join.

For your own table, rename `Asset`, `assets` and the schema entries to your fields, and replace `data` with your source (the Data recipes in `recipes`).

## Slots

| Slot | File | What goes there |
| --- | --- | --- |
| `[imports]` | view-model.ts | Extra imports. Names from a module the base already imports join that import. |
| `[module]` | view-model.ts | Module-level constants, functions and types. |
| `[members]` | view-model.ts | Members of the ViewModel class: properties the view binds to and methods it calls. |
| `[beforeCreate]` | view-model.ts | Statements in initialize() before createDataTable, such as registering a data source. |
| `[options]` | view-model.ts | Options merged into createDataTable({ ... }). Columns with the same key merge (a column's key is its field unless it sets key, so two columns on one field with different keys stay separate), object options merge, list options join, and anything else replaces the base value. |
| `[afterCreate]` | view-model.ts | Statements after the table is created; `store` and `this.store` are set. |
| `[destroy]` | view-model.ts | Cleanup in destroy(), such as unsubscribing or clearing timers. |
| `[viewImports]` | view.ts | Extra imports for the view. |
| `[viewBefore]` | view.ts | Nodes above the table. `s` is the scriptor of the view's one root div; a view takes a single root node, so everything goes inside it. |
| `[table]` | view.ts | Replaces the whole table section of the view (its container and the dataTable node), for a different size or a layout such as a map or a details panel beside the table. |
| `[viewAfter]` | view.ts | Nodes below the table, inside the same root div. |

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { actions, createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";
// [imports]

export type Asset = {
    readonly id: number;
    readonly name: string;
    readonly category: string;
    readonly status: string;
    readonly cost: number;
    readonly utilization: number;
    readonly rating: number;
    readonly lastInspected: string;
    readonly inService: boolean;
    readonly location: string;
    readonly lengthMeters: number;
    readonly notes: string;
    readonly docsUrl: string;
    readonly photoUrl: string;
    readonly trend: readonly number[];
    readonly tags: readonly string[];
};

export const assets: Asset[] = [
    { id: 1, name: "North Pump Station", category: "Pump", status: "active", cost: 182500, utilization: 0.82, rating: 4, lastInspected: "2026-08-14T09:30:00Z", inService: true, location: "POINT(-80.1918 25.7617)", lengthMeters: 1250, notes: "Primary intake for the north district. Bearings were replaced in the spring and vibration readings are back within tolerance.", docsUrl: "https://example.com/assets/1", photoUrl: "https://example.com/assets/1.jpg", trend: [62, 70, 75, 81, 82], tags: ["critical", "inspect"] },
    { id: 2, name: "Bayfront Valve 12", category: "Valve", status: "maintenance", cost: 14200, utilization: 0.35, rating: 2, lastInspected: "2026-07-02T14:00:00Z", inService: false, location: "POINT(-80.1867 25.7743)", lengthMeters: 40, notes: "Actuator sticks under load. A replacement part is on order.", docsUrl: "https://example.com/assets/2", photoUrl: "https://example.com/assets/2.jpg", trend: [55, 48, 40, 37, 35], tags: ["repair"] },
    { id: 3, name: "Hydrant 4471", category: "Hydrant", status: "active", cost: 3800, utilization: 0.12, rating: 5, lastInspected: "2026-09-21T08:15:00Z", inService: true, location: "POINT(-80.2101 25.7489)", lengthMeters: 15, notes: "Flow test passed.", docsUrl: "https://example.com/assets/3", photoUrl: "https://example.com/assets/3.jpg", trend: [10, 11, 12, 12, 12], tags: [] },
    { id: 4, name: "Coral Way Main", category: "Pipe", status: "active", cost: 920000, utilization: 0.67, rating: 3, lastInspected: "2026-05-30T10:45:00Z", inService: true, location: "POINT(-80.2297 25.7502)", lengthMeters: 4800, notes: "Cast iron segment scheduled for lining next fiscal year.", docsUrl: "https://example.com/assets/4", photoUrl: "https://example.com/assets/4.jpg", trend: [71, 69, 68, 66, 67], tags: ["critical", "repair", "inspect"] },
    { id: 5, name: "South Reservoir Pump", category: "Pump", status: "retired", cost: 0, utilization: 0, rating: 1, lastInspected: "2025-11-11T16:20:00Z", inService: false, location: "POINT(-80.3201 25.6802)", lengthMeters: 900, notes: "Decommissioned after the reservoir upgrade.", docsUrl: "https://example.com/assets/5", photoUrl: "https://example.com/assets/5.jpg", trend: [20, 12, 5, 0, 0], tags: [] },
    { id: 6, name: "Harbor Valve 3", category: "Valve", status: "active", cost: 21750, utilization: 0.91, rating: 4, lastInspected: "2026-09-02T11:05:00Z", inService: true, location: "POINT(-80.1702 25.7781)", lengthMeters: 60, notes: "Runs near capacity during peak hours.", docsUrl: "https://example.com/assets/6", photoUrl: "https://example.com/assets/6.jpg", trend: [80, 84, 88, 90, 91], tags: ["new"] },
];

export const assetSchemaEntries = {
    id: schema.number(),
    name: schema.string(),
    category: schema.string(),
    status: schema.string(),
    cost: schema.number(),
    utilization: schema.number(),
    rating: schema.number(),
    lastInspected: schema.datetime(),
    inService: schema.boolean(),
    location: schema.string(),
    lengthMeters: schema.number(),
    notes: schema.string(),
    docsUrl: schema.string(),
    photoUrl: schema.string(),
};

export const assetSchema = dataTable.viewModel.schema.createSchema({ entries: assetSchemaEntries });

const { column, virtualColumn } = dataTable.viewModel.defineColumns<Asset>();
// [module]

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;
    // [members]

    public async initialize(): Promise<void> {
        // [beforeCreate]
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id }),
            schema: assetSchema,
            columns: [
                column({ field: "name", header: "Name", width: toPixels(220) }),
                column({ field: "category", header: "Category", width: toPixels(120) }),
            ],
            // [options]
        });
        this.dataTableOptions = options;
        this.store = store;
        // [afterCreate]
        this.update();
    }

    public destroy(): void {
        // [destroy]
        super.destroy();
    }
}
```

## view.ts

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTableOptions } from "data-ui/data-table";
import type { Asset, ViewModel } from "./view-model";
// [viewImports]

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("AssetTable", "Assets");
    s.view("main", (s) => {
        s.div({ heightPercentage: 100 }).contentTemplates((s) => {
            // [viewBefore]
            // [table]
            s.div({ height: 400 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Asset>({
                    bindings: { data: "dataTableOptions" },
                }));
            });
            // [/table]
            // [viewAfter]
        });
    });
    return s.commitPage();
}
```

## Related

- [recipes](recipes.md): Data Table recipes
- [view-and-view-model](view-and-view-model.md): View and ViewModel
