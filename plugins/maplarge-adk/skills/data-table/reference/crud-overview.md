# Data Table - CRUD - Overview and more

<!-- Automatically generated, do not edit -->

## Overview

Data Table balances being a pure visualization component with the pragmatic need to support common CRUD operations.

DataTable supports CRUD operations for rows through one of two strategies.

**Crud Strategy Summary**:

| Name | Description |
| --- | --- |
| `Mutations` (recommended) | Data Table provides helpers to create, update, and delete rows with common defaults per data engine. Mutations proxy persistence and provide easy handles for applying visual reconciliation on success or rollback on failure. |
| `Manual Reconciliation` | Manually call the data table visual reconciliation methods after manually persisting the change. |

## Getting started

Keep the `DataTableStore` from createDataTable on your ViewModel. All examples below assume this setup:

```ts
const { store } = createDataTable<BusStop>({
    schema: busStopSchema,
    columns: busStopColumns,
    data: dataTable.viewModel.data.dataStoreData({ dataStore: this.dataStore, dataSourceName: "busstops" }),
    checkboxRows: { showSelectAll: true },
});

// keep store reference to use in CRUD operations
this.store = store;
```

## Mutations

Mutations are atomic, reversible row changes. Data Table provides these helpers as a way to wrap common CRUD MapLarge API operations with Data Table visual reconciliation. They save through the data engine when it has the matching method and reconcile the data table view; otherwise pass run({ persist }).

The engine methods are createRow, updateRow, removeRow and removeRows; the view is repainted either way, and with no engine method and no persist the change is not saved. arrayData, dataStoreData and dataSourceData have those methods; asyncData and pagedApiCallData only when you pass them, and removeBulk throws without removeRows.

### Create

```ts
public async createStop(): Promise<void> {
    const newRow: BusStop = {
        StopID: 3,
        StopName: this.newStopName,
    };

    await this.store.mutations.insert({ row: newRow }).run();
}
```

### Delete

### Bulk Delete

```ts
public async deleteSelected(): Promise<void> {
    const indices = [...this.store.getCheckboxRowsSelectedIndices()];

    await this.store.mutations.removeBulk(
        indices.map(rowIndex => ({ rowIndex }))
    ).run();

    this.store.checkboxRowsUnselectAll();
}
```

### Update

```ts
public async renameStop(rowIndex: number, stopName: string): Promise<void> {
    const row = { ...this.store.getRow(rowIndex)!, StopName: stopName };

    await this.store.mutations.update({
        rowIndex,
        row,
        fields: ["StopName"],
    }).run();
}
```

### Composed

Groups several mutations into one apply/revert unit. Pass run({ persist }) to replace the members' saves with one shared persist call.

Without run({ persist }) each member's engine save runs in sequence, so a failure part way reverts the view for every member although earlier ones were already saved. The reconciler's refresh option has no effect on a composed run, so do not compose insert().

```ts
public async archiveStops(rowIndices: number[]): Promise<void> {
    // store.getRow returns only rows loaded near the screen; read the rows from the data engine first
    const rows = await this.store.getRowsFromDataEngine({ rowIndices, checkCache: true });
    const found = rowIndices.flatMap((rowIndex, position) => {
        const row = rows[position];
        return row === undefined ? [] : [{ rowIndex, row }];
    });
    await this.store.mutations.compose(
        found.map(({ rowIndex, row }) => this.store.mutations.update({
            rowIndex,
            row: { ...row, Active: "N" },
            fields: ["Active"],
        }))
    ).run({
        persist: async () => {
            await ml.data.table.row.editMultiRowAsync({
                tableName: "ml_samples/Miami_Busstops",
                primaryKey: "StopID",
                columns: ["StopID", "Active"],
                multiValues: found.map(({ row }) => [String(row.StopID), "N"]),
            });
        },
    });
}
```

### Persistence Override

Pass `persist` to .run() when the data engine default is not what you need.

```ts
await this.store.mutations
    .remove({ rowIndex })
    .run({
        persist: async (row) => {
            if (!row) return;
            await ml.data.table.row.removeByQueryAsync("ml_samples/Miami_Busstops", {
                where: [[{ col: "StopID", test: "EqualAny", value: [String(row.StopID)] }]],
            });
        },
    });
```

### Reconciler

Mutations separate the data patching from view reconciliation concerns such as loading overlays and optimistic vs pessimistic updates. Pass a `MutationReconciler` to .run({ reconciler }) to control that lifecycle.

### Engine: `store.mutations.reconciler`

Built-in mutation reconciler factory. Returns a `MutationReconciler` whose overlay hooks dispatch overlay/show and overlay/hide on the store.

**Mutation Reconciler Factory Option**:

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `optimistic` | `boolean` | no | `false` | When true, the grid updates immediately and reverts if the async call fails. When false, the grid only updates after the async call succeeds. insert() has no immediate view change, so optimistic has no visible effect on it: the new row appears through the refresh after persist, which its implicit reconciler turns on but store.mutations.reconciler() does not, so pass refresh: true when you give insert().run() your own reconciler. |
| `overlay` | `boolean` | no | `true` | When true, dispatches overlay/show and overlay/hide for the "loading" overlay around the mutation lifecycle. |
| `refresh` | `boolean` | no | `false` | When true, dispatches a full data table refresh after persist succeeds so sort and filter are re-applied by the data engine. A refresh re-reads the rows, scrolls the grid back to the top and drops every loaded page. insert() always refreshes after persist, and remove() and removeBulk() refresh too even with refresh: false (removing a shown row triggers it); only update() repaints in place unless refresh: true is passed. |

#### Custom Reconciler

Implement `MutationReconciler` directly if needed.

**Mutation Reconciler Interface**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `optimistic` | `boolean` | yes | Mirrors the optimistic option passed to the factory. When true, the grid updates immediately and reverts if the async call fails. When false, the grid only updates after the async call succeeds. |
| `refresh` | `boolean` | yes | Mirrors the refresh option passed to the factory. When true, a full data table refresh is dispatched after persist succeeds so the data engine re-applies sort and filter. |
| `onStart` | `() => void` | yes | Called immediately before the mutation runs. |
| `onSuccess` | `() => void` | yes | Called after persist resolves and the view patch is committed. |
| `onError` | `() => void` | yes | Called after persist rejects, before the error is re-thrown. Optimistic mutations revert the view patch first. |

#### Run options

All options passed to `RowMutationRunOptions`:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `reconciler` | `MutationReconciler` | no | Controls overlay, whether the grid updates before or after the async call, and whether to refresh after persist. Create via store.mutations.reconciler(). When omitted, the grid updates immediately and reverts on failure, with no overlay and no refresh - except insert(), which refreshes after persist so the new row is fetched in sort order. |
| `persist` | `(snapshot: TRow \| undefined) => Promise<void>` | no | Persistence override. Receives the row snapshot captured at mutation creation time. When omitted, the data engine's default create/update/remove is used. |

#### Usage

```ts
// pass nothing for the default reconciler
await store.mutations.remove({ rowIndex }).run();

// pass specific options for the reconciler
await store.mutations.update({ rowIndex, row, fields }).run({
    reconciler: store.mutations.reconciler({ optimistic: true, overlay: false }),
});
```

### CRUD with Mutators Example

**Example: Crud Mutations**:

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
        await store.mutations.insert({
            row: defaultNewRow(stopId, this.newStopName || "New Stop"),
        }).run();

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

        await store.mutations.update({
            rowIndex,
            row,
            fields: ["StopName"],
        }).run();

        this.renameStopName = "";
        this.update();
    }

    public async deleteRow(ctx: { rowIndex: number; globalRowIndex: number; row: BusStopRow }): Promise<void> {
        const store = this.store;
        if (!store) return;

        await store.mutations.remove({ rowIndex: ctx.globalRowIndex }).run();
        this.update();
    }

    public async bulkDeleteSelected(): Promise<void> {
        const store = this.store;
        if (!store) return;

        const indices = [...store.getCheckboxRowsSelectedIndices()];
        const rows = (await store.getRowsFromDataEngine({ rowIndices: indices, checkCache: true }))
            .filter((row): row is BusStopRow => row !== undefined);

        await store.mutations.removeBulk(
            indices.map(rowIndex => ({ rowIndex }))
        ).run({
            persist: async () => {
                await ml.data.table.row.removeByQueryAsync(TABLE_NAME, {
                    where: [[{ col: "StopID", test: "EqualAny", value: rows.map(r => String(r.StopID)) }]],
                });
            },
        });

        store.checkboxRowsUnselectAll();
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
    s.page("CrudMutationsExample", "CRUD: Mutations");
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

- [crud-manual-reconciliation](crud-manual-reconciliation.md): CRUD - Manual Reconciliation
- [crud-row-lifecycle-callbacks](crud-row-lifecycle-callbacks.md): CRUD - Row Lifecycle Callbacks
- [types](types.md): the declarations of the types used here, `DataTableStore`, `RowMutationsFactory`; search it for a name rather than reading it whole
