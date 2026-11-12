# Data Table - Store - Store API and more

<!-- Automatically generated, do not edit -->

The data table store is the primary interoperability point.

- Subscribe to actions emitted by the data table.
- Dispatch actions into the data table.
- Query row and cell state from the current view.
- CRUD. Mutations or Manual Reconciliation.
- Dispatcher actions reference.

The store provides a clean abstraction layer by decoupling data table internals from both the table engines and consuming dashboards.

## Store API

The `DataTableStore` returned from `createDataTable()` exposes these methods:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `dispatch` | `(action: ActionBase) => void` | no | Dispatch any data table action into the store. |
| `subscribe` | `(actionCreator, handler) => () => void` | no | Listen for a specific action and return an unsubscribe function. |
| `getRow` | `(rowIndex: number) => TRow \| undefined` | no | Read a row by global row index from the loaded data cache. Returns undefined if the row is not currently loaded.  Use if you know the row is in or near the viewport. |
| `getRowsFromDataEngine` | `({ rowIndices: number[]; checkCache?: boolean }) => Promise<(TRow \| undefined)[]>` | no | Fetch rows by row indices through the data engine, checking the cache first if configured. Minimizes necessary outgoing calls to the data engine; needs one per contiguous section of indices. Pass checkCache: true to read the loaded row cache first. It works only with offset data engines. An entry is undefined when its index is invalid, the engine is not an offset engine, or the fetch for its run failed (failures are not reported). |
| `checkboxRowsSelectAll` | `() => void` | no | Select all rows for checkbox row selection if checkboxRows is on. |
| `checkboxRowsUnselectAll` | `() => void` | no | Clear all checkbox row selection if checkboxRows is on. |
| `getCheckboxRowsSelectedIndices` | `() => readonly number[]` | no | Return the global row indices currently selected by checkbox row selection. |
| `hideEmptyColumns` | `() => void` | no | Hide every visible column the empty-column engine reports as empty. |
| `showEmptyColumns` | `() => void` | no | Restore the columns hideEmptyColumns hid, leaving the user's own hides alone. |
| `getCellByCoordinates` | `(coordinates: SelectionCoordinates) => Cell<TRow> \| undefined` | no | Read a cell using `SelectionCoordinates` row/column coordinates. |
| `getCellByKey` | `(rowIndex: number, columnKey: string) => Cell<TRow> \| undefined` | no | Read a cell by row index and column key. |
| `getState` | `() => ViewStateData \| undefined` | no | Read the current view state. |
| `commitCurrentEdit` | `() => void` | no | Programmatically commit the current in-progress cell edit. |
| `rowSlotIndexToGlobalRowIndex` | `(rowSlotIndex: RowSlotIndex) => GlobalRowIndex \| undefined` | no | Maps a row slot index to the global row index it currently displays in the viewport. Returns undefined when the slot is unmapped. |
| `rows.applyInsert` | `(args: { atIndex: number; row: TRow }) => void` | no | Insert a row into the view cache synchronously. No persistence. See the CRUD page. The table then refreshes, re-reading the rows from the data engine and scrolling to the top, so the row stays only if the data engine has it. Save new rows with store.mutations.insert. |
| `rows.applyUpdate` | `(args: { rowIndex: number; row: TRow; fields: readonly (keyof TRow)[] }) => void` | no | Replace a row in the view cache synchronously; pass the complete row. No persistence. See the CRUD page. A partial row blanks the other cells, and there is no refresh. Build it as { ...store.getRow(rowIndex), status: "retired" }. A patch sent while a sort, filter or load is running is applied after it finishes. |
| `rows.applyRemove` | `(args: { rowIndex: number }) => void` | no | Remove a row from the view cache synchronously. No persistence. See the CRUD page. The table then refreshes, re-reading the rows from the data engine and scrolling to the top, so the row comes back unless the data engine removed it. Remove rows with store.mutations.remove. |
| `mutations` | `RowMutationsFactory<TRow>` | no | Factory for bound RowMutation instances with snapshot, revert, and .run(). See the CRUD page. |
| `cells.update` | `({ rowIndex: number; key: string; value: unknown }) => void` | no | Synchronously patch a single cell value in the cache (value cells only). It sets one property of a loaded cached row and repaints it, without saving and without a refresh. key is the row field to set (a data column's field, not its column key); nothing happens when the row is not loaded. |

## Subscribe to Actions

```ts
import { actions, createDataTable } from "data-ui/data-table";

const { options, store } = createDataTable<Row>({ data: dataEngine, schema });
this.dataTableOptions = options;

const unsubscribeSortDone = store.subscribe(actions.sortDone, (action) => {
    ml.log("sort completed", action.sort);
});

const unsubscribeRowUpdateFailed = store.subscribe(actions.rowsUpdateFailed, (action) => {
    console.log("row update failed", action.error);
});

unsubscribeSortDone();
unsubscribeRowUpdateFailed();
```

## Dispatch Actions

```ts
import { actions, createDataTable } from "data-ui/data-table";

const { options, store } = createDataTable<Row>({ data: dataEngine, schema });
this.dataTableOptions = options;

store.dispatch(
    actions.setFilter({
        key: "name",
        filter: { field: "name", operator: "Contains", values: { value: "acme" } },
    }),
);

store.dispatch(actions.refresh());
```

## Interactive Example

Try the store query and dispatch APIs from the ViewModel handlers below.

**Example: Store**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    actions,
    ArrayDataEngine,
    createDataTable,
    dataTable,
    schema,
    toRowSlotIndex,
} from "data-ui/data-table";
import type { DataTableOptions, DataTableStore } from "data-ui/data-table";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly department: string;
    readonly score: number;
};

const DEPARTMENTS = ["Engineering", "Design", "Sales", "Support", "Marketing"];
const NAMES = ["Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Hank", "Iris", "Jack"];

const rows: Row[] = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: NAMES[i % NAMES.length] + " " + (Math.floor(i / NAMES.length) + 1),
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    score: 40 + ((i * 17) % 60),
}));


const gridSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        department: schema.string(),
        score: schema.number(),
    },
});


export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    outputMonaco = { code: "", language: "plaintext", readOnly: true };
    getRowIndex = "0";
    getCellRowIndex = "0";
    slotIndex = "0";
    private store: DataTableStore<Row> | null = null;
    private unsubscribeSortDone: (() => void) | null = null;

    public initialize(): void {
        const { options, store } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({ data: rows }),
            schema: gridSchema,
        });
        this.dataTableOptions = options;
        this.store = store;

        this.unsubscribeSortDone = store.subscribe(actions.sortDone, ({ sort }) => {
            this.setOutput(sort
                ? `subscribe(actions.sortDone): { key: "${sort.key}", direction: "${sort.direction}" }`
                : "subscribe(actions.sortDone): sort cleared");
        });

        this.update();
    }

    public destroy(): void {
        this.unsubscribeSortDone?.();
        this.unsubscribeSortDone = null;
    }

    private setOutput(code: string): void {
        this.outputMonaco = { code, language: "plaintext", readOnly: true };
        this.update();
    }

    public readRow(): void {
        const index = Number(this.getRowIndex);
        const row = this.store?.getRow(index);
        this.setOutput(row
            ? `getRow(${index}): { id: ${row.id}, name: "${row.name}", department: "${row.department}", score: ${row.score} }`
            : `getRow(${index}): undefined`);
    }

    public readCell(): void {
        const index = Number(this.getCellRowIndex);
        const cell = this.store?.getCellByKey(index, "name");
        this.setOutput(cell
            ? `getCellByKey(${index}, "name"): "${cell.displayValue}"`
            : `getCellByKey(${index}, "name"): undefined`);
    }

    public readState(): void {
        const state = this.store?.getState();
        if (!state) {
            this.setOutput("getState(): undefined (grid not yet mounted)");
            return;
        }
        const sort = state.sort;
        this.setOutput(sort
            ? `getState().sort: { key: "${sort.key}", direction: "${sort.direction}" }`
            : "getState().sort: null (no sort applied)");
    }

    public dispatchSort(): void {
        this.store?.dispatch(
            actions.sort({ sort: { key: "name", field: "name", direction: "asc" } }),
        );
    }

    public readSlotToGlobal(): void {
        const index = Number(this.slotIndex);
        const globalRowIndex = this.store?.rowSlotIndexToGlobalRowIndex(toRowSlotIndex(index));
        this.setOutput(globalRowIndex !== undefined
            ? `rowSlotIndexToGlobalRowIndex(slot ${index}): global row ${globalRowIndex as number}`
            : `rowSlotIndexToGlobalRowIndex(slot ${index}): undefined`);
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "id", header: "ID", width: toPixels(70), sort: true }),
    column({ field: "name", header: "Name", width: toPixels(180), sort: true }),
    column({ field: "department", header: "Department", width: toPixels(160), sort: true }),
    column({ field: "score", header: "Score", width: toPixels(100), sort: true, align: "right" }),
];


export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("StoreExample", "Store Example");

    s.view("main", (s) => {
        s.div({ padding: { around: 3 } }).contentTemplates((s) => {
            s.row({ gutterSize: 2, margin: { bottom: 2 } }).contentTemplates((s) => {
                s.column({ column: 6, flex: { dFlex: true, alignItemsCenter: true, gap: 1 } }).contentTemplates((g) => {
                    g.span({ text: "row:", customCssClasses: "text-body-secondary", fontSize: "small" });
                    g.input({ inputType: "number", size: "small", width: 65, bindings: { textInput: "getRowIndex" } });
                    g.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "readRow" }] })
                        .contentTemplates((b) => { b.span({ text: "getRow(n)" }); });
                });
                s.column({ column: 6, flex: { dFlex: true, alignItemsCenter: true, gap: 1 } }).contentTemplates((g) => {
                    g.span({ text: "row:", customCssClasses: "text-body-secondary", fontSize: "small" });
                    g.input({ inputType: "number", size: "small", width: 65, bindings: { textInput: "getCellRowIndex" } });
                    g.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "readCell" }] })
                        .contentTemplates((b) => { b.span({ text: 'getCellByKey(n, "name")' }); });
                });
                s.column({ column: 6, flex: { dFlex: true, alignItemsCenter: true, gap: 1 } }).contentTemplates((g) => {
                    g.span({ text: "slot:", customCssClasses: "text-body-secondary", fontSize: "small" });
                    g.input({ inputType: "number", size: "small", width: 65, bindings: { textInput: "slotIndex" } });
                    g.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "readSlotToGlobal" }] })
                        .contentTemplates((b) => { b.span({ text: "rowSlotIndexToGlobalRowIndex(n)" }); });
                });
                s.column({ column: 6, flex: { dFlex: true, alignItemsCenter: true, gap: 2 } }).contentTemplates((g) => {
                    g.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "readState" }] })
                        .contentTemplates((b) => { b.span({ text: "getState()" }); });
                    g.button({ kind: "primary", size: "small", events: [{ event: "click", handler: "dispatchSort" }] })
                        .contentTemplates((b) => { b.span({ text: "dispatch: sort by name" }); });
                });
            });

            s.div({ flex: { dFlex: true, alignItemsCenter: true, gap: 2 }, margin: { bottom: 1 } }).contentTemplates((s) => {
                s.span({ text: "Output", customCssClasses: "text-body-secondary", fontSize: "small" });
                s.span({ text: "(listening: store.subscribe(actions.sortDone, ...))", customCssClasses: "text-body-secondary", fontSize: "small", fontStyle: "italic" });
            });
            s.codeEditorMonaco({ height: 52, margin: { bottom: 2 }, bindings: { data: "outputMonaco" } });


            s.div({ height: 340 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    columns,
                }));
            });
        });
    });

    return s.commitPage();
}
```

Row create, update, and delete APIs are documented on the CRUD page.

## Related

- [store-dispatcher-actions](store-dispatcher-actions.md): Store - Dispatcher Actions
- [types](types.md): the declarations of the types used here, `DataTableStore`, `SelectionState`, `RowMutationsFactory`; search it for a name rather than reading it whole
