# Data Table - CRUD - Manual Reconciliation

<!-- Automatically generated, do not edit -->

## Manual Reconciliation

Write your own create, update, and delete operations, then tell the grid how to reflect the change with store.rows.applyInsert, applyUpdate, and applyRemove. These apply\* calls change the loaded rows without saving anything, so persist the change first. The examples below use ml.data.table.row.\* for MapLarge persistence.

applyUpdate repaints the row in place. applyInsert, applyRemove and applyRemoveBulk also trigger the table's full refresh, which re-reads the rows from the data engine and scrolls the grid back to the top, so the change must already be saved or the row comes back; Create therefore just dispatches actions.refresh().

### Create

```ts
const newRow: BusStop = { StopID: 99, StopName: "New Stop", Active: "Y" /* ... */ };

// 1. persist: ml.data.table.row.create (same path the data engine uses)
await ml.data.table.row.createAsync({
    tableName: "ml_samples/Miami_Busstops",
    primaryKey: "StopID",
    columns: ["StopID", "StopName", "Active" /* ... */],
    values: [String(newRow.StopID), newRow.StopName, newRow.Active /* ... */],
    create: true,
});

// 2. reconcile the grid: a new row's position depends on the sort, so re-read the rows
this.store.dispatch(actions.refresh());
```

### Update

```ts
const rowIndex = 3;
const row = { ...this.store.getRow(rowIndex)!, StopName: "Renamed" };

// 1. persist: ml.data.table.row.editMultiRow
await ml.data.table.row.editMultiRowAsync({
    tableName: "ml_samples/Miami_Busstops",
    primaryKey: "StopID",
    columns: ["StopID", "StopName"],
    multiValues: [[String(row.StopID), row.StopName]],
});

// 2. reconcile the grid
this.store.rows.applyUpdate({ rowIndex, row, fields: ["StopName"] });
```

### Delete

```ts
const rowIndex = 3;
const row = this.store.getRow(rowIndex)!;

// 1. persist: ml.data.table.row.removeByQuery (table/deletetablerows)
await ml.data.table.row.removeByQueryAsync("ml_samples/Miami_Busstops", {
    where: [[{ col: "StopID", test: "EqualAny", value: [String(row.StopID)] }]],
});

// 2. reconcile the grid
this.store.rows.applyRemove({ rowIndex });
```

### Bulk Delete

One server call removes all rows; reconcile each view row in descending index order so earlier indices stay valid.

```ts
const indices = [...this.store.getCheckboxRowsSelectedIndices()];
// store.getRow returns only rows loaded near the screen; read every checked row from the data engine
const rows = (await this.store.getRowsFromDataEngine({ rowIndices: indices, checkCache: true }))
    .filter((row): row is BusStopRow => row !== undefined);

// 1. persist: single bulk removeByQuery call
await ml.data.table.row.removeByQueryAsync("ml_samples/Miami_Busstops", {
    where: [[{ col: "StopID", test: "EqualAny", value: rows.map(r => String(r.StopID)) }]],
});

// 2. reconcile the grid: checks are positions, so clear them, then re-read the rows once
this.store.checkboxRowsUnselectAll();
this.store.dispatch(actions.refresh());
```

### CRUD with Manual Reconciliation Example

Same interactive grid using manual persistence and store.rows.apply\* reconciliation. Bulk delete uses the toolbar button; single-row delete uses the Delete button on each row.

**Example: Crud Manual**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import {
    actions,
    createDataTable,
    dataTable,
} from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

type BusStopRow = {
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

const TABLE_NAME = "ml_samples/Miami_Busstops";

function defaultNewRow(stopId: number, stopName: string): BusStopRow {
    return {
        StopID:     stopId,
        StopName:   stopName,
        Direction:  "",
        BusBay:     "N",
        Accessible: "N",
        Active:     "Y",
        Shelters:   0,
        Benches:    0,
        MUNIC_NAME: "",
        InacReason: [],
        ModifyDate: new Date().toISOString(),
        CreateDate: new Date().toISOString().slice(0, 10),
    };
}

async function nextStopId(): Promise<number> {
    return new Promise<number>(resolve => {
        ml.query()
            .from(TABLE_NAME)
            .select("max(StopID) as maxId")
            .run(result => resolve((result.data["maxId"]?.[0] as number | undefined) ?? 0));
    }).then(maxId => maxId + 1);
}

export class ViewModel extends DynamicViewModel {

    selectedCount = 0;
    selectionDisabled = true;
    newStopName = "";
    renameStopName = "";

    dataTableOptions: DataTableOptions<BusStopRow> | null = null;

    protected store: DataTableStore<BusStopRow> | null = null;

    public async initialize(): Promise<void> {
        this.dataStore.register({ name: "busstops", dataSource: TABLE_NAME });
        const dataEngine = dataTable.viewModel.data.dataStoreData<BusStopRow>({ dataStore: this.dataStore, dataSourceName: "busstops" });
        const { options, store } = createDataTable<BusStopRow>({ data: dataEngine });

        this.dataTableOptions = options;
        this.store = store;

        const updateSelectionState = () => {
            this.selectedCount = store.getCheckboxRowsSelectedIndices().length;
            this.selectionDisabled = this.selectedCount === 0;
            this.update();
        };
        store.subscribe(actions.checkboxSelectAll,   updateSelectionState);
        store.subscribe(actions.checkboxUnselectAll, updateSelectionState);
        store.subscribe(actions.checkboxToggleRow,   updateSelectionState);

        this.update();
    }

    protected firstSelectedRowIndex(): number | undefined {
        const store = this.store;
        if (!store) return undefined;
        const indices = store.getCheckboxRowsSelectedIndices();
        return indices.length > 0 ? indices[0] : undefined;
    }


    public async createRow(): Promise<void> {
        const store = this.store;
        if (!store) return;

        const stopId = await nextStopId();
        const newRow = defaultNewRow(stopId, this.newStopName || "New Stop");

        await ml.data.table.row.createAsync({
            tableName: TABLE_NAME,
            primaryKey: "StopID",
            columns: ["StopID", "StopName", "Direction", "BusBay", "Accessible", "Active", "Shelters", "Benches", "MUNIC_NAME", "ModifyDate", "CreateDate"],
            values: [
                String(newRow.StopID),
                newRow.StopName,
                newRow.Direction,
                newRow.BusBay,
                newRow.Accessible,
                newRow.Active,
                String(newRow.Shelters),
                String(newRow.Benches),
                newRow.MUNIC_NAME,
                newRow.ModifyDate,
                newRow.CreateDate,
            ],
            create: true,
        });

        store.dispatch(actions.refresh());
        this.newStopName = "";
        this.update();
    }

    public async updateSelected(): Promise<void> {
        const store = this.store;
        if (!store) return;

        const rowIndex = this.firstSelectedRowIndex();
        if (rowIndex === undefined) return;

        const current = store.getRow(rowIndex)!;
        const row = { ...current, StopName: this.renameStopName || current.StopName };

        await ml.data.table.row.editMultiRowAsync({
            tableName: TABLE_NAME,
            primaryKey: "StopID",
            columns: ["StopID", "StopName"],
            multiValues: [[String(row.StopID), row.StopName]],
        });

        store.rows.applyUpdate({ rowIndex, row, fields: ["StopName"] });
        this.renameStopName = "";
        this.update();
    }

    public async deleteRow(ctx: { rowIndex: number; globalRowIndex: number; row: BusStopRow }): Promise<void> {
        const store = this.store;
        if (!store) return;

        const { globalRowIndex, row } = ctx;

        await ml.data.table.row.removeByQueryAsync(TABLE_NAME, {
            where: [[{ col: "StopID", test: "EqualAny", value: [String(row.StopID)] }]],
        });

        store.rows.applyRemove({ rowIndex: globalRowIndex });
        this.update();
    }

    public async bulkDeleteSelected(): Promise<void> {
        const store = this.store;
        if (!store) return;

        const indices = [...store.getCheckboxRowsSelectedIndices()];
        const rows = (await store.getRowsFromDataEngine({ rowIndices: indices, checkCache: true }))
            .filter((row): row is BusStopRow => row !== undefined);

        await ml.data.table.row.removeByQueryAsync(TABLE_NAME, {
            where: [[{ col: "StopID", test: "EqualAny", value: rows.map(r => String(r.StopID)) }]],
        });

        store.checkboxRowsUnselectAll();
        store.dispatch(actions.refresh());
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTableOptions } from "data-ui/data-table";

import type { ViewModel } from "./view-model";
import {
    dataTable,
    schema,
    separatedBy,
    toPixels,
} from "data-ui/data-table";
import type { CellEditorDef } from "data-ui/data-table";

type BusStopRow = {
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
                            padding: { y: 0, x: 2 }, title: val,
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

const busStopSchema = dataTable.view.schema.createSchema({
    entries: {
        StopID:     schema.number(),
        StopName:   schema.string({ editing: { descriptor: { type: "Text",   required: true } }, filtering: { descriptor: { type: "Text",   required: true } } }),
        Direction:  schema.string(),
        Shelters:   schema.number({ editing: { descriptor: { type: "Number", min: 0, max: 20, invalidMessage: "Please enter between 0 and 20 shelters." } }, filtering: { descriptor: { type: "Number", min: 0, max: 20, invalidMessage: "Please enter between 0 and 20 shelters." } } }),
        Benches:    schema.number({ editing: { descriptor: { type: "Number", min: 0 } }, filtering: { descriptor: { type: "Number", min: 0 } } }),
        BusBay: schema.string({
            editing: { descriptor: {
                type: "Select",
                options: [{ value: "Y", label: "Yes" }, { value: "N", label: "No" }],
                clearable: false, enableFiltering: false,
            } },
        }),
        Accessible: schema.string({
            editing: { descriptor: {
                type: "Switch",
                toDescriptor:   (v: unknown) => v === "Y",
                fromDescriptor: (v: unknown) => v ? "Y" : "N",
            } },
        }),
        Active: schema.string({
            editing: { descriptor: {
                type: "Checkbox",
                toDescriptor:   (v: unknown) => v === "Y",
                fromDescriptor: (v: unknown) => v ? "Y" : "N",
            } },
        }),
        MUNIC_NAME: schema.string({ editing: { descriptor: { type: "TextArea" } } }),
        InacReason: schema.string({
            editing: { descriptor: {
                type: "MultiSelect",
                options: [
                    { value: "Service Request",                label: "Service Request" },
                    { value: "Other",                          label: "Other" },
                    { value: "Bus Stop Consolidation",         label: "Bus Stop Consolidation" },
                    { value: "Construction / Obstruction",     label: "Construction / Obstruction" },
                    { value: "Does not meet ADA requirements", label: "Does not meet ADA requirements" },
                ],
                clearable: true, enableFiltering: true,
            } },
        }),
        ModifyDate: schema.datetime(),
        CreateDate: schema.date(),
    },
});

const { column, virtualColumn } = dataTable.viewModel.defineColumns<BusStopRow>();

const busStopDataColumns = [
    column({ field: "StopID",     header: "Stop ID",      width: toPixels(90),  align: "right", editing: false }),
    column({ field: "StopName",   header: "Stop Name",    width: toPixels(200), editing: editable(editor) }),
    column({ field: "Shelters",   header: "Shelters",     width: toPixels(90),  align: "right", editing: editable(editor) }),
    column({ field: "Benches",    header: "Benches",      width: toPixels(90),  align: "right", editing: false }),
    column({ field: "Direction",  header: "Direction",    width: toPixels(100), editing: editable(directionEditor) }),
    column({ field: "BusBay",     header: "Bus Bay",      width: toPixels(110), editing: editable(editor) }),
    column({ field: "Accessible", header: "Accessible",   width: toPixels(110), align: "left",
        transformValue: ({ value }) => value === "Y" ? "Yes" : value === "N" ? "No" : value,
        editing: editable(editor),
    }),
    column({ field: "Active",     header: "Active",       width: toPixels(90),  align: "left",
        transformValue: ({ value }) => value === "Y" ? "Yes" : value === "N" ? "No" : value,
        editing: editable(editor),
    }),
    column({ field: "MUNIC_NAME", header: "Municipality", width: toPixels(160), editing: editable(editor) }),
    column({ field: "InacReason", header: "Inac. Reason", width: toPixels(180),
        transformValue: ({ value }) => Array.isArray(value) ? value.join(", ") : "",
        editing: editable(inacReasonEditor),
    }),
    column({ field: "ModifyDate", header: "Modify Date",  width: toPixels(180), editing: editable(editor) }),
    column({ field: "CreateDate", header: "Create Date",  width: toPixels(140), editing: editable(editor) }),
];

const busStopDeleteColumn = virtualColumn({
    key: "delete",
    header: "",
    width: toPixels(88),
    sort: false,
    resize: false,
    filtering: false,
    scope: { deleteRow: { binding: "deleteRow" } },
    contentTemplates: (cell) => {
        cell.s.button({
            kind: "danger",
            size: "small",
            outline: true,
            events: [{ event: "click", handler: cell.bindingPaths.scope.deleteRow }],
        }).contentTemplates(s => { s.span({ text: "Delete" }); });
    },
});


export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("CrudManualExample", "CRUD: Manual Reconciliation");
    s.view("main", (s) => {
        s.div({ padding: { around: 3 }, flex: { dFlex: true, flexColumn: true, gap: 2 } }).contentTemplates((s) => {
            s.row({ gutterSize: 2, flex: { alignItemsCenter: true }, margin: { bottom: 2 } }).contentTemplates((s) => {
                s.column({ column: 5, flex: { dFlex: true, gap: 2, alignItemsCenter: true } }).contentTemplates((s) => {
                    s.input({
                        inputType: "text",
                        placeholder: "Stop name (create)",
                        bindings: { textInput: "newStopName" },
                    });
                    s.button({
                        text: "Create",
                        kind: "primary",
                        events: [{ event: "click", handler: "createRow" }],
                    });
                });

                s.column({ column: 5, flex: { dFlex: true, gap: 2, alignItemsCenter: true } }).contentTemplates((s) => {
                    s.input({
                        inputType: "text",
                        placeholder: "New stop name",
                        bindings: { textInput: "renameStopName" },
                    });
                    s.button({
                        text: "Update Selected Row",
                        kind: "secondary",
                        bindings: { disable: "selectionDisabled" },
                        events: [{ event: "click", handler: "updateSelected" }],
                    });
                });

                s.column({ column: 2, flex: { dFlex: true, alignItemsCenter: true } }).contentTemplates((s) => {
                    s.button({
                        text: "Delete Selected Rows",
                        kind: "danger",
                        bindings: { disable: "selectionDisabled" },
                        events: [{ event: "click", handler: "bulkDeleteSelected" }],
                    });
                });
            });

            s.div({ height: 450 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<BusStopRow>({
                    bindings: { data: "dataTableOptions" },
                    schema: busStopSchema,
                    columns: [...busStopDataColumns, busStopDeleteColumn],
                    defaultSort: { key: "StopID", field: "StopID", direction: "desc" },
                    filtering: dataTable.view.filtering.dialogFiltering(),
                    checkboxRows: { showSelectAll: true },
                }));
            });

        });
    });
    return s.commitPage();
}
```

## Related

- [crud-overview](crud-overview.md): CRUD - Overview and more
