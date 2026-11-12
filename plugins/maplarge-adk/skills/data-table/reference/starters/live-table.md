# Data Table starter - Live table

<!-- Automatically generated, do not edit -->

Rows held in code that change every few seconds, such as readings from a feed, with status badges, rows colored by condition and a bar for a percentage.

Built from the base table and these recipes, in order: `update-rows-live`, `show-badges-and-icons`, `color-rows-and-cells`, `show-charts-in-cells#bar`.

## view-model.ts

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { actions, createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

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
function percentBar(percent: number) {
    return {
        animation: false,
        backgroundColor: "transparent",
        grid: { top: 7, bottom: 7, left: 0, right: 0, containLabel: false },
        xAxis: { type: "value", show: false, min: 0, max: 100 },
        yAxis: { type: "category", show: false, data: ["value"] },
        series: [{
            type: "bar",
            data: [percent],
            barWidth: 12,
            showBackground: true,
            backgroundStyle: { color: "rgba(128, 128, 128, 0.25)" },
            itemStyle: { color: percent > 90 ? "#dc3545" : "#0d6efd" },
        }],
    };
}

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;
    private liveTimer: number | undefined;
    private liveAssets: Asset[] = [...assets];

    public async initialize(): Promise<void> {
        const assetEngine = dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id });
        const { options, store } = createDataTable<Asset>({
            data: assetEngine,
            schema: assetSchema,
            columns: [
                column({ field: "name", header: "Name", width: toPixels(220) }),
                column({ field: "category", header: "Category", width: toPixels(120) }),
                column({
                    field: "status",
                    header: "Status",
                    transformValue: ({ value }) => ({
                        label: value,
                        isActive: value === "active",
                        isMaintenance: value === "maintenance",
                        isRetired: value === "retired",
                    }),
                    contentTemplates: ({ s, bindingPaths }) => {
                        s.span({
                            badge: true,
                            bindings: {
                                text: bindingPaths.displayValue + ".label",
                                css: {
                                    classes: {
                                        "bg-success": bindingPaths.displayValue + ".isActive",
                                        "bg-warning": bindingPaths.displayValue + ".isMaintenance",
                                        "text-dark": bindingPaths.displayValue + ".isMaintenance",
                                        "bg-secondary": bindingPaths.displayValue + ".isRetired",
                                    },
                                },
                            },
                        });
                    },
                }),
                column({
                    field: "inService",
                    header: "In service",
                    transformValue: ({ value }) => ({ isIn: value === true, isOut: value === false }),
                    contentTemplates: ({ s, bindingPaths }) => {
                        s.div({ flex: { dFlex: true, gap: 1 } }).contentTemplates((cell) => {
                            cell.span({ text: "\u{2713}", textColor: "success", fontWeight: "bold", bindings: { visible: bindingPaths.displayValue + ".isIn" } });
                            cell.span({ text: "Out", badge: true, background: "secondary", bindings: { visible: bindingPaths.displayValue + ".isOut" } });
                        });
                    },
                }),
                virtualColumn({
                    key: "trendChart",
                    header: "Trend",
                    width: toPixels(140),
                    transformValue: ({ row }) => (row.trend === undefined ? undefined : {
                        animation: false,
                        backgroundColor: "transparent",
                        xAxis: { type: "category", show: false, data: row.trend.map((_value, index) => String(index)) },
                        yAxis: { type: "value", show: false },
                        grid: { top: 2, bottom: 2, left: 2, right: 2, containLabel: false },
                        series: [{ type: "line", data: [...row.trend], showSymbol: false }],
                    }),
                    contentTemplates: ({ s, bindingPaths }) => {
                        s.chart({ height: 26, disableMenu: true, options: {}, bindings: { chartOptions: bindingPaths.displayValue } });
                    },
                }),
                column({
                    field: "utilization",
                    header: "Utilization",
                    width: toPixels(180),
                    transformValue: ({ value }) => ({
                        label: String(Math.round(value * 100)) + "%",
                        isHigh: value > 0.9,
                        bar: percentBar(value * 100),
                    }),
                    contentTemplates: ({ s, bindingPaths }) => {
                        s.div({ flex: { dFlex: true, alignItemsCenter: true, gap: 2 } }).contentTemplates((cell) => {
                            cell.span({
                                width: 44,
                                textAlignment: { textEnd: true },
                                bindings: {
                                    text: bindingPaths.displayValue + ".label",
                                    css: { classes: { "text-danger": bindingPaths.displayValue + ".isHigh" } },
                                },
                            });
                            cell.div({ width: 100 }).contentTemplates((track) => {
                                track.chart({ height: 26, disableMenu: true, options: {}, bindings: { chartOptions: bindingPaths.displayValue + ".bar" } });
                            });
                        });
                    },
                }),
            ],
            theme: {
                rowThemes: [
                    { rule: { where: { field: "status", test: "Equal", value: "maintenance" }, applyValue: { background: "warning" } } },
                    { callback: ({ row }) => (row.utilization > 0.9 ? { fontWeight: "bold" } : undefined) },
                ],
            },
        });
        this.dataTableOptions = options;
        this.store = store;
        this.liveTimer = window.setInterval(() => {
            this.liveAssets = this.liveAssets.map((asset) => ({
                ...asset,
                utilization: Math.min(1, Math.max(0, asset.utilization + (Math.random() - 0.5) / 5)),
            }));
            for (const asset of this.liveAssets) {
                void assetEngine.updateRow({ row: asset, changedFields: ["utilization"] });
            }
            store.dispatch(actions.refresh());
        }, 5000);
        this.update();
    }

    public destroy(): void {
        window.clearInterval(this.liveTimer);
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
- [update-rows-live](../recipes/update-rows-live.md): Update rows from code: a live feed, a refresh button, undo
- [show-badges-and-icons](../recipes/show-badges-and-icons.md): Show badges, icons and other cell content
- [color-rows-and-cells](../recipes/color-rows-and-cells.md): Color rows and cells by value
- [show-charts-in-cells#bar](../recipes/show-charts-in-cells--bar.md): A bar beside the number
