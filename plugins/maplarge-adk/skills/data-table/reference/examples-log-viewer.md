# Data Table - Examples - Log Viewer and more

<!-- Automatically generated, do not edit -->

## Log Viewer

Infinite scroll, variable row heights, category badges, and formatted timestamp column.

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import type { CellContext } from "data-ui/data-table";

export type LogRow = {
    readonly id: string;
    readonly timestampMs: number;
    readonly category: "INFO" | "WARN" | "ERROR" | "DEBUG" | "TRACE";
    readonly logMessage: string;
};

type CategoryBadgeView = {
    readonly label: LogRow["category"];
    readonly isInfo: boolean;
    readonly isWarn: boolean;
    readonly isError: boolean;
    readonly isDebug: boolean;
    readonly isTrace: boolean;
};

export class ViewModel extends RaptorViewModel {
    readonly formatTimestamp = ({ value }: { readonly value: number }): string => {
        return new Date(value).toLocaleString();
    };

    readonly toCategoryBadgeView = ({ value }: { readonly value: LogRow["category"] }): CategoryBadgeView => ({
        label: value,
        isInfo: value === "INFO",
        isWarn: value === "WARN",
        isError: value === "ERROR",
        isDebug: value === "DEBUG",
        isTrace: value === "TRACE",
    });

    readonly renderCategoryBadgeCell = ({ s, bindingPaths }: CellContext<LogRow, "category">): void => {
        s.div().contentTemplates((s) => {
            s.span({
                customCssClasses: "badge",
                bindings: {
                    text: `${bindingPaths.displayValue}.label`,
                    css: {
                        classes: {
                            "bg-primary": `${bindingPaths.displayValue}.isInfo`,
                            "bg-warning": `${bindingPaths.displayValue}.isWarn`,
                            "text-dark": `${bindingPaths.displayValue}.isWarn`,
                            "bg-danger": `${bindingPaths.displayValue}.isError`,
                            "bg-secondary": `${bindingPaths.displayValue}.isDebug`,
                            "bg-dark": `${bindingPaths.displayValue}.isTrace`,
                        },
                    },
                },
            });
        });
    };
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    dataTable,
    dataTableOptions,
    schema,
    toPixels,
} from "data-ui/data-table";

import type { ViewModel } from "./view-model";

const logCategories = ["INFO", "WARN", "ERROR", "DEBUG", "TRACE"] as const;
type LogCategory = (typeof logCategories)[number];

const serviceFragments = ["auth-service", "gateway", "billing-worker", "notifications-worker", "query-engine", "etl-runner", "cache-layer"];
const actionFragments = ["processed request", "retried operation", "loaded config", "published update", "completed batch", "opened connection", "closed connection", "wrote checkpoint"];
const detailFragments = ["tenant=acme", "tenant=globex", "tenant=initech", "region=us-east-1", "region=us-west-2", "region=eu-west-1", "env=prod", "env=staging", "pod=api-03", "pod=worker-11", "durationMs=14", "durationMs=88", "durationMs=412", "httpStatus=200", "httpStatus=429", "httpStatus=503"];
const stackTraceLines = [
    "at handleRequest (services/request-handler.ts:211:17)",
    "at processBatch (workers/batch.ts:88:9)",
    "at dispatchEvent (events/dispatcher.ts:53:14)",
    "at runJob (jobs/scheduler.ts:131:21)",
];

const sampleCount = 500;
const nowMs = Date.now();

const pickFragment = <T>(values: readonly T[], seed: number): T => values[seed % values.length];

const buildMessage = (rowNumber: number): string => {
    const detailCount = (rowNumber % 5) + 2;
    const mainMessage = `${pickFragment(serviceFragments, rowNumber)} ${pickFragment(actionFragments, rowNumber + 2)}`;
    const detailParts = Array.from({ length: detailCount }, (_unusedValue, detailIndex) =>
        pickFragment(detailFragments, rowNumber + detailIndex * 3),
    );
    const baseMessage = `${mainMessage}; ${detailParts.join(" ")}`;
    if (rowNumber % 9 !== 0) return baseMessage;
    const stackTrace = stackTraceLines
        .slice(0, (rowNumber % stackTraceLines.length) + 1)
        .map((line) => `\n${line}`)
        .join("");
    return `${baseMessage}\nstack:${stackTrace}`;
};

export type LogRow = {
    readonly id: string;
    readonly timestampMs: number;
    readonly category: LogCategory;
    readonly logMessage: string;
};

const buildLogRows = (count: number): LogRow[] =>
    Array.from({ length: count }, (_unusedValue, rowIndex) => {
        const rowNumber = rowIndex + 1;
        return {
            id: `log-${String(rowNumber).padStart(4, "0")}`,
            timestampMs: nowMs - rowIndex * 37_000,
            category: pickFragment(logCategories, rowIndex * 7 + 3),
            logMessage: buildMessage(rowNumber),
        };
    });



const logSchema = dataTable.view.schema.createSchema({
    entries: {
        timestampMs: schema.number(),
        category: schema.string(),
        logMessage: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<LogRow, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataTableLogViewer", "Log Viewer");

    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ margin: { bottom: 2 }, textColor: "muted" }).contentTemplates((hint) => {
                hint.span({
                    text: "Infinite scrolling log stream with variable row heights and static columns.",
                });
            });

            s.div({ height: 620 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<LogRow>({
                    data: dataTable.view.data.arrayData({ data: buildLogRows(sampleCount) }),
                    schema: logSchema,
                    columns: [
                        column({
                            field: "timestampMs",
                            header: "Timestamp",
                            width: toPixels(220),
                            transformValue: { binding: "formatTimestamp" },
                        }),
                        column({
                            field: "category",
                            header: "Category",
                            width: toPixels(130),
                            transformValue: { binding: "toCategoryBadgeView" },
                            contentTemplates: { binding: "renderCategoryBadgeCell" },
                        }),
                        column({
                            field: "logMessage",
                            header: "Log Message",
                            width: toPixels(400),
                            textWrap: true,
                        }),
                    ],
                    rowScrolling: dataTable.view.rowScrolling.infiniteScroll({
                        minRowHeight: 32,
                        rowHeightEstimate: dataTable.view.rowHeightEstimate.percentile({
                            percentile: 0.75,
                            initialEstimate: 48,
                        }),
                    }),
                    rowSlots: dataTable.view.rowSlots.virtualizedRows({ slots: 120 }),
                    columnSlots: dataTable.view.columnSlots.staticColumns(),
                    storage: dataTable.view.storage.localStore({ prefix: "log-viewer-v1" }),
                }));
            });
        });
    });

    return s.commitPage();
}
```

## Massive Discoverable Data Table

Stress example with many columns and discoverable schema rules.

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export type MassiveDiscoverableRow = Readonly<Record<string, string | number>>;

export class ViewModel extends RaptorViewModel {}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    applyRule,
    dataTable,
    dataTableOptions,
    schema,
    toPixels,
} from "data-ui/data-table";

import type { ViewModel } from "./view-model";

const rowCount = 200;
const dimensionColumnCount = 1000;
const metricColumnCount = 3000;
const flagColumnCount = 1000;

const dimensionColumnKeys = Array.from({ length: dimensionColumnCount }, (_unusedValue, index) => `dim_${String(index).padStart(4, "0")}`);
const metricColumnKeys = Array.from({ length: metricColumnCount }, (_unusedValue, index) => `metric_${String(index + 1000).padStart(4, "0")}`);
const flagColumnKeys = Array.from({ length: flagColumnCount }, (_unusedValue, index) => `flag_${String(index + 4000).padStart(4, "0")}`);

const buildRow = (rowIndex: number): MassiveDiscoverableRow => {
    const dimensionEntries = dimensionColumnKeys.map((columnKey, columnIndex) =>
        [columnKey, `group-${String((rowIndex + columnIndex) % 24).padStart(2, "0")}`] as const,
    );
    const metricEntries = metricColumnKeys.map((columnKey, columnIndex) =>
        [columnKey, (rowIndex + 1) * ((columnIndex % 19) + 1)] as const,
    );
    const flagEntries = flagColumnKeys.map((columnKey, columnIndex) =>
        [columnKey, (rowIndex + columnIndex) % 2 === 0 ? "Y" : "N"] as const,
    );
    return {
        rowId: `row-${String(rowIndex + 1).padStart(3, "0")}`,
        ...Object.fromEntries([...dimensionEntries, ...metricEntries, ...flagEntries]),
    };
};

const massiveRows = Array.from({ length: rowCount }, (_unusedValue, rowIndex) => buildRow(rowIndex));

const discoverableSchema = dataTable.view.schema.createDiscoverableSchema({
    entries: { rowId: schema.string() },
    rules: [
        applyRule({ type: "exact", value: "rowId" }, { sort: true, filtering: true, width: toPixels(110) }),
    ],
    discoveryRules: [
        applyRule({ type: "regex", pattern: "^dim_" }, { columnType: "string", sort: true, filtering: true, width: toPixels(150) }),
        applyRule({ type: "regex", pattern: "^metric_" }, { columnType: "number", sort: true, filtering: true, width: toPixels(110) }),
        applyRule({ type: "regex", pattern: "^flag_" }, { columnType: "string", sort: true, filtering: true, width: toPixels(90) }),
    ],
});

export type MassiveDiscoverableRow = Readonly<Record<string, string | number>>;


const { column } = dataTable.view.defineColumns<MassiveDiscoverableRow, ViewModel>();

const buildColumns = (): ReturnType<typeof column>[] => [
    column({ field: "rowId", header: "Row", width: toPixels(110) }),
    ...Array.from({ length: 5000 }, (_unusedValue, index) => {
        const paddedNumber = String(index).padStart(4, "0");
        const fieldName = index < 1000
            ? `dim_${paddedNumber}`
            : index < 4000
                ? `metric_${paddedNumber}`
                : `flag_${paddedNumber}`;
        return column({ field: fieldName, header: fieldName });
    }),
];

const allColumns = buildColumns();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("MassiveDiscoverableGrid", "Massive Discoverable Grid");

    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ margin: { bottom: 2 }, textColor: "muted" }).contentTemplates((hint) => {
                hint.span({
                    text: "Array data engine with 5,000 columns and 200 rows. Uses discoverable schema rules over dim_*, metric_*, and flag_* groups plus virtualized columns.",
                });
            });

            s.div({ height: 560 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<MassiveDiscoverableRow>({
                    data: dataTable.view.data.arrayData({ data: massiveRows }),
                    schema: discoverableSchema,
                    columns: allColumns,
                    rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 34 }),
                    columnSlots: dataTable.view.columnSlots.virtualizedColumns({ maxColumnCount: 14 }),
                    storage: dataTable.view.storage.userPrefs({ preferenceKey: "massive-discoverable-grid-v1" }),
                }));
            });
        });
    });

    return s.commitPage();
}
```

## Descriptors

Descriptor-driven data table over a DataStore-backed source.

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

type BusStopRow = {
    readonly StopID: number;
    readonly StopName: string;
    readonly Direction: string;
    readonly BusBay: string;
    readonly Shelters: number;
};

const descriptors = dataTable.viewModel.columns.defineColumnDescriptors<BusStopRow>()({
    StopID: { type: "Number", label: "Stop ID", sortOrder: 1 },
    StopName: { type: "Text", label: "Stop Name", sortOrder: 2 },
    Direction: { type: "Text", label: "Direction", sortOrder: 3 },
    BusBay: { type: "Text", label: "Bus Bay", sortOrder: 4 },
    Shelters: { type: "Number", label: "Shelters", sortOrder: 5, min: 0, max: 20 },
});

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<BusStopRow> | null = null;

    public async initialize(): Promise<void> {
        this.dataStore.register({
            name: "busstops",
            dataSource: "ml_samples/Miami_Busstops",
        });
        const { options } = createDataTable<BusStopRow>({
            data: dataTable.viewModel.data.dataStoreData({
                dataStore: this.dataStore,
                dataSourceName: "busstops",
            }),
            descriptors,
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";

import type { ViewModel } from "./view-model";

// columns come from createDataTable via descriptors; no duplicate columns array here
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DescriptorsDataSourceSwitcherViewOnly", "Descriptors");
    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ height: 480 }).contentTemplates((s) => {
                s.dataTable({
                    bindings: { data: "dataTableOptions" },
                });
            });
        });
    });
    return s.commitPage();
}
```

## Editable with Descriptors

Exercises every built-in descriptor type for cell editing. Edit each cell to see the editing surface UI for each type.

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import {
    createDataTable,
    dataTable,
    separatedBy,
    toPixels,
} from "data-ui/data-table";
import type { CellEditorDef, DataTableOptions } from "data-ui/data-table";

export type BusStopRow = {
    readonly StopID:     number;
    readonly StopName:   string;
    readonly Direction:  string;
    readonly BusBay:     string;
    readonly Accessible: string;
    readonly Active:     string;
    readonly Shelters:   number;
    readonly Benches:    number;
    readonly MUNIC_NAME: string;
    readonly InacReason: string[];
    readonly ModifyDate: string;
    readonly CreateDate: string;
};

const editor = dataTable.viewModel.editing.descriptorCellEditor({ optimisticUpdate: true });
const inacReasonEditor = dataTable.viewModel.editing.descriptorCellEditor({
    optimisticUpdate: true,
    popoverMinWidth: 280,
    multiSelectStringBridge: separatedBy({ character: "," }),
});

const directionDialRows = [["NW","N","NE"], ["W",null,"E"], ["SW","S","SE"]];
const directionEditor = dataTable.viewModel.editing.templatedCellEditor({
    optimisticUpdate: true,
    onBlur: "cancel",
    popoverTheme: { customCssClasses: "p-1" },
    contentTemplates: dataTable.viewModel.editing.cellEditorContent(({ s, bindingPaths }) => {
        s.div({ flex: { dFlex: true, flexColumn: true, gap: 1 } }).contentTemplates(rowS => {
            for (const row of directionDialRows) {
                rowS.div({ flex: { dFlex: true, gap: 1, justifyContentCenter: true } }).contentTemplates(cellS => {
                    for (const val of row) {
                        if (val === null) { cellS.div({ width: 36, height: 28 }); continue; }
                        cellS.button({
                            kind: "secondary", size: "small", outline: true,
                            width: 36, height: 28, padding: { around: 0 }, title: val,
                            events: [{ event: "click", handler: bindingPaths.handlers.commitEditWithValue, param: val }],
                        }).contentTemplates(s => { s.span({ text: val }); });
                    }
                });
            }
        });
    }),
});

const editable = (ed: CellEditorDef) =>
    ({ triggers: { dblclick: { editor: ed }, enter: { editor: ed }, contextMenu: { editor: ed } } });

const busStopDescriptors = dataTable.viewModel.columns.defineColumnDescriptors<BusStopRow>()({
    StopID:    { type: "Number", label: "Stop ID",  sortOrder:  1, column: { width: toPixels(90),  align: "right", editing: false } },
    StopName:  { type: "Text",   label: "Stop Name", sortOrder:  2, required: true, column: { width: toPixels(200), editing: editable(editor) } },
    Shelters:  { type: "Number", label: "Shelters", sortOrder:  3, min: 0, max: 20, invalidMessage: "Please enter between 0 and 20 shelters.", column: { width: toPixels(90),  align: "right", editing: editable(editor) } },
    Benches:   { type: "Number", label: "Benches",  sortOrder:  4, min: 0,         column: { width: toPixels(90),  align: "right", editing: false } },
    Direction: { type: "Text",   label: "Direction", sortOrder:  5, column: { width: toPixels(100), editing: editable(directionEditor) } },
    BusBay: {
        type: "Select", label: "Bus Bay", sortOrder: 6,
        options: [{ value: "Y", label: "Yes" }, { value: "N", label: "No" }],
        clearable: false, enableFiltering: false,
        column: { width: toPixels(110), editing: editable(editor) },
    },
    Accessible: {
        type: "Switch", label: "Accessible", sortOrder: 7,
        toDescriptor:   (entityValue:     string)  => entityValue === "Y",
        fromDescriptor: (descriptorValue: boolean) => descriptorValue ? "Y" : "N",
        column: { width: toPixels(110), align: "left", editing: editable(editor) },
    },
    Active: {
        type: "Checkbox", label: "Active", sortOrder: 8,
        toDescriptor:   (entityValue:     string)  => entityValue === "Y",
        fromDescriptor: (descriptorValue: boolean) => descriptorValue ? "Y" : "N",
        column: { width: toPixels(90), align: "left", editing: editable(editor) },
    },
    MUNIC_NAME: { type: "TextArea", label: "Municipality", sortOrder: 9, column: { width: toPixels(160), editing: editable(editor) } },
    InacReason: {
        type: "MultiSelect", label: "Inac. Reason", sortOrder: 10,
        options: [
            { value: "Service Request",                label: "Service Request" },
            { value: "Other",                          label: "Other" },
            { value: "Bus Stop Consolidation",         label: "Bus Stop Consolidation" },
            { value: "Construction / Obstruction",     label: "Construction / Obstruction" },
            { value: "Does not meet ADA requirements", label: "Does not meet ADA requirements" },
        ],
        clearable: true, enableFiltering: true,
        column: {
            width: toPixels(180),
            transformValue: ({ value }: { value: unknown }) =>
                Array.isArray(value) ? value.join(", ") :
                typeof value === "string" ? value.split(",").map((s: string) => s.trim()).join(", ") : value,
            editing: editable(inacReasonEditor),
        },
    },
    ModifyDate: { type: "DateTime", label: "Modify Date", sortOrder: 11, column: { width: toPixels(180), editing: editable(editor) } },
    CreateDate: { type: "DateTime", label: "Create Date", sortOrder: 12, showTime: false, column: { width: toPixels(140), formatter: "date", editing: editable(editor) } },
});

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<BusStopRow> | null = null;

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
        const { options } = createDataTable<BusStopRow>({
            data: dataTable.viewModel.data.dataStoreData({
                dataStore: this.dataStore,
                dataSourceName: "busstops",
            }),
            descriptors: busStopDescriptors,
            defaultSort: { key: "StopID", field: "StopID", direction: "asc" },
            editable: { optimisticUpdate: true },
            filtering: dataTable.viewModel.filtering.dialogFiltering(),
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";

import type { ViewModel } from "./view-model";

// schema, columns and editors all come from createDataTable via descriptors
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("EditableWithDescriptorsExample", "Editable with Descriptors");
    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ height: 500 }).contentTemplates((s) => {
                s.dataTable({
                    bindings: { data: "dataTableOptions" },
                });
            });
        });
    });
    return s.commitPage();
}
```

## Dates

How to display and filter date and datetime columns using the DateTime descriptor with no custom code.

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type EventRow = {
    readonly id:              number;
    readonly label:           string;
    readonly datetime:        string;
    readonly dateOnly:        string;
    readonly dateOnlyFromISO: string;
};

const rows: EventRow[] = [
    { id: 1, label: "Alpha",   datetime: "2021-03-09T20:27:00.000-05:00", dateOnly: "2021-03-09T00:00:00.000Z", dateOnlyFromISO: "2021-03-09" },
    { id: 2, label: "Beta",    datetime: "2022-07-14T08:00:00.000Z",      dateOnly: "2022-07-14T00:00:00.000Z", dateOnlyFromISO: "2022-07-14" },
    { id: 3, label: "Gamma",   datetime: "2023-01-01T00:00:00.000Z",      dateOnly: "2023-01-01T00:00:00.000Z", dateOnlyFromISO: "2023-01-01" },
    { id: 4, label: "Delta",   datetime: "2023-06-15T12:30:00.000Z",      dateOnly: "2023-06-15T00:00:00.000Z", dateOnlyFromISO: "2023-06-15" },
    { id: 5, label: "Epsilon", datetime: "2024-11-22T17:45:00.000Z",      dateOnly: "2024-11-22T00:00:00.000Z", dateOnlyFromISO: "2024-11-22" },
];

const descriptors = dataTable.viewModel.columns.defineColumnDescriptors<EventRow>()({
    id:    { type: "Number", label: "ID",    sortOrder: 1, column: { width: toPixels(50), align: "right" } },
    label: { type: "Text",   label: "Label", sortOrder: 2, column: { width: toPixels(90) } },
    datetime: {
        type: "DateTime", label: "Date & Time", sortOrder: 3,
        column: { width: toPixels(190) },
    },
    dateOnly: {
        type: "DateTime", label: "Date Only (ISO)", sortOrder: 4,
        showTime: false,
        column: { width: toPixels(155), formatter: "date" },
    },
    dateOnlyFromISO: {
        type: "DateTime", label: "Date Only (YYYY-MM-DD)", sortOrder: 5,
        showTime: false,
        column: { width: toPixels(200), formatter: "date" },
    },
});

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<EventRow> | null = null;

    public initialize(): void {
        const { options } = createDataTable<EventRow>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            descriptors,
            filtering: dataTable.viewModel.filtering.dialogFiltering(),
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import type { ViewModel } from "./view-model";

// columns come from createDataTable via descriptors; no duplicate columns array here
export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DatesExample", "Dates");
    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.div({ height: 400 }).contentTemplates((s) => {
                s.dataTable({
                    bindings: { data: "dataTableOptions" },
                });
            });
        });
    });
    return s.commitPage();
}
```
