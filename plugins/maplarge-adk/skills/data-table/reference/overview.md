# Data Table - Overview

<!-- Automatically generated, do not edit -->

The Data Table component is an extensible Raptor Node for displaying tabular data.

## Minimal Setup

**Example: Overview Minimal Setup**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

export type BusStopRow = {
    readonly StopName: string;
    readonly MUNIC_NAME: string;
    readonly Direction: string;
    readonly Benches: number;
};

export class ViewModel extends DynamicViewModel {
    public initialize(): void {
        this.dataStore.register({
            name: "busstops",
            dataSource: "ml_samples/Miami_Busstops",
        });
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";
import type { ViewModel, BusStopRow } from "./view-model";

const busStopSchema = dataTable.view.schema.createSchema({
    entries: {
        StopName: schema.string(),
        MUNIC_NAME: schema.string(),
        Direction: schema.string(),
        Benches: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<BusStopRow, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();

    s.page("DataTableOverviewMinimalSetup", "Minimal setup");

    s.view("main", (s) => {
        s.div({ height: 360 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<BusStopRow>({
                data: dataTable.view.data.dataStoreData({
                    dataStore: { binding: "dataStore" },
                    dataSourceName: "busstops",
                }),
                schema: busStopSchema,
                columns: [
                    column({ field: "StopName", header: "Stop Name" }),
                    column({ field: "MUNIC_NAME", header: "Municipality" }),
                    column({ field: "Direction", header: "Direction" }),
                    column({ field: "Benches", header: "Benches" }),
                ],
            }));
        });
    });

    return s.commitPage();
}
```

## Quick Start

A more complex example with option customization and cell templates.

**Example: Overview Quick Start**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import type { CellContext } from "data-ui/data-table";

export type EnterpriseGridRow = {
    readonly StopName: string;
    readonly Direction: string;
    readonly MUNIC_NAME: string;
    readonly ZIPCODE: string;
    readonly MainSt: string;
    readonly StopCorner: string;
    readonly PROVIDER: string;
    readonly CD_ID: number;
    readonly Benches: number;
    readonly StopID: number;
    readonly Shelters: number;
    readonly TrashCans: number;
    readonly LAT: number;
    readonly LON: number;
    readonly MUNICID: number;
};

type StatusBadgeView = {
    readonly label: string;
    readonly isSuccess: boolean;
    readonly isWarning: boolean;
    readonly isDanger: boolean;
};

export class ViewModel extends DynamicViewModel {
    public async initialize(): Promise<void> {
        this.dataStore.register({
            name: "miami_busstops",
            dataSource: "ml_samples/Miami_Busstops",
        });
        this.update();
    }

    readonly toStatusBadgeView = ({ value }: { value: number }): StatusBadgeView => {
        if (value >= 2) return { label: "Equipped", isSuccess: true, isWarning: false, isDanger: false };
        if (value >= 1) return { label: "Partial", isSuccess: false, isWarning: true, isDanger: false };
        return { label: "None", isSuccess: false, isWarning: false, isDanger: true };
    };

    readonly renderStatusBadgeCell = ({ s, bindingPaths }: CellContext<EnterpriseGridRow, "Benches">): void => {
        s.div().contentTemplates((s) => {
            s.span({
                customCssClasses: "badge",
                bindings: {
                    text: `${bindingPaths.displayValue}.label`,
                    css: {
                        classes: {
                            "bg-success": `${bindingPaths.displayValue}.isSuccess`,
                            "bg-warning": `${bindingPaths.displayValue}.isWarning`,
                            "text-dark": `${bindingPaths.displayValue}.isWarning`,
                            "bg-danger": `${bindingPaths.displayValue}.isDanger`,
                        },
                    },
                },
            });
        });
    };

    readonly toStopIdTrendChartOptions = ({ value }: { value: number }): ml.echarts.EChartsOption => {
        const seed = Math.abs(Math.trunc(value ?? 1)) || 1;
        const phase = (seed * 0.173) % (Math.PI * 2);
        const direction = seed % 2 === 0 ? 1 : -1;
        const trendData = Array.from({ length: 9 }, (_unusedValue, trendIndex) => {
            const wave = Math.sin(phase + trendIndex * 0.85) * 18;
            const drift = direction * trendIndex * 2.5;
            const ripple = ((seed * (trendIndex + 3) * 37) % 13) - 6;
            return Math.round(42 + wave + drift + ripple);
        });
        const dataMin = Math.min(...trendData);
        const dataMax = Math.max(...trendData);
        const padding = Math.max(2, Math.round((dataMax - dataMin) * 0.15));
        return {
            animation: false,
            backgroundColor: "transparent",
            grid: { top: 2, bottom: 2, left: 2, right: 2, containLabel: false },
            xAxis: { type: "category", show: false, boundaryGap: false },
            yAxis: { type: "value", show: false, min: dataMin - padding, max: dataMax + padding },
            series: [{
                type: "line",
                data: trendData,
                smooth: true,
                symbol: "none",
                lineStyle: { width: 2, color: "#0d6efd" },
                areaStyle: { color: "rgba(13, 110, 253, 0.16)" },
            }],
        };
    };

    readonly renderReviewTrendCell = ({ s, bindingPaths }: CellContext<EnterpriseGridRow, "StopID">): void => {
        s.chart({
            height: 26,
            disableMenu: true,
            options: {},
            bindings: { chartOptions: bindingPaths.displayValue },
        });
    };
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    applyRule,
    dataTable,
    dataTableOptions,
    excludeRule,
    schema,
    toPixels,
} from "data-ui/data-table";

import type { EnterpriseGridRow, ViewModel } from "./view-model";

const enterpriseSchemaEntries = {
    StopName: schema.string(),
    Direction: schema.string(),
    MUNIC_NAME: schema.string(),
    ZIPCODE: schema.string(),
    MainSt: schema.string(),
    StopCorner: schema.string(),
    PROVIDER: schema.string(),
    CD_ID: schema.number(),
    Benches: schema.number(),
    StopID: schema.number(),
    Shelters: schema.number(),
    TrashCans: schema.number(),
    LAT: schema.number(),
    LON: schema.number(),
    MUNICID: schema.number(),
};

const enterpriseSchema = dataTable.view.schema.createDiscoverableSchema({
    entries: enterpriseSchemaEntries,
    rules: [
        applyRule({ type: "regex", pattern: "." }, { sort: true, filtering: true }),
    ],
    discoveryRules: [
        excludeRule({ type: "regex", pattern: "^POINT_|XY|^FSS" }),
        excludeRule({ type: "exact", value: "RowId" }),
    ],
});


const { column } = dataTable.view.defineColumns<EnterpriseGridRow, ViewModel>();

const enterpriseColumns = [
    column({ field: "StopName", header: "Stop Name", width: toPixels(260) }),
    column({
        field: "StopID",
        header: "Trend",
        width: toPixels(130),
        transformValue: { binding: "toStopIdTrendChartOptions" },
        contentTemplates: { binding: "renderReviewTrendCell" },
    }),
    column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(140) }),
    column({
        field: "Benches",
        header: "Benches",
        width: toPixels(110),
        transformValue: { binding: "toStatusBadgeView" },
        contentTemplates: { binding: "renderStatusBadgeCell" },
    }),
    column({ field: "Direction", header: "Direction", width: toPixels(120) }),
    column({ field: "ZIPCODE", header: "Zip Code", width: toPixels(160) }),
    column({ field: "MainSt", header: "Main Street", width: toPixels(280) }),
    column({ field: "StopCorner", header: "Corner", width: toPixels(130) }),
    column({ field: "PROVIDER", header: "Provider", width: toPixels(110) }),
    column({ field: "CD_ID", header: "District", width: toPixels(110) }),
    column({ field: "Shelters", header: "Shelters", width: toPixels(120) }),
    column({ field: "TrashCans", header: "Trash Cans", width: toPixels(100) }),
    column({ field: "LAT", header: "Latitude", width: toPixels(100) }),
    column({ field: "LON", header: "Longitude", width: toPixels(100) }),
    column({ field: "MUNICID", header: "Munic ID", width: toPixels(100) }),
];


const enterpriseGridOptions = dataTableOptions<EnterpriseGridRow>({
    data: dataTable.view.data.dataStoreData({
        dataStore: { binding: "dataStore" },
        dataSourceName: "miami_busstops",
    }),
    schema: enterpriseSchema,
    columns: enterpriseColumns,
    rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 25 }),
    rowSlots: dataTable.view.rowSlots.virtualizedRows({ slots: 120 }),
    columnSlots: dataTable.view.columnSlots.staticColumns(),
    storage: dataTable.view.storage.userPrefs({ preferenceKey: "enterprise-grid-v1" }),
    filtering: dataTable.view.filtering.dialogFiltering(),
    filterIndicators: {
        headerCell: dataTable.view.filterIndicators.filterFunnelIndicator(),
        belowGrid: dataTable.view.filterIndicators.filterChipsIndicator(),
    },
    tableSelection: dataTable.view.tableSelection.row(),
    configurator: {
        enabled: true,
        engine: dataTable.view.configurator.contextMenuConfigurator(),
    },
});


export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("EnterpriseGridExample", "Enterprise Grid");

    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ height: 560 }).contentTemplates((s) => {
                s.dataTable(enterpriseGridOptions);
            });
        });
    });

    return s.commitPage();
}
```
