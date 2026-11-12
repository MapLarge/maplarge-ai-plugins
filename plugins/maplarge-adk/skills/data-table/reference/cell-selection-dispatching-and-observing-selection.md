# Data Table - Selection - Dispatching and Observing Selection

<!-- Automatically generated, do not edit -->

## Dispatching and Observing Selection

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `selection` | `SelectionState` | yes | The new selection. |
| `scrollIntoView` | `boolean` | no | When true, the view engine scrolls the selected row into the visible range after applying the new selection. It scrolls just far enough, vertically and horizontally, to bring the selected row and column into view. |

### Selection state

`SelectionState` describes the active cell or row passed to selectCell:

| Property | Type | Description |
| --- | --- | --- |
| `selectionMode` | `"row" \| "cell"` | Controls whether the selection is rendered as a full-row highlight or a single-cell highlight. `tableSelection.cell()` and `tableSelection.row()` always draw their own kind; `tableSelection["cell-or-row"]()` and custom engines follow `selectionMode`. |
| `coordinates` | `SelectionCoordinates` | The selected cell coordinates. row is the global row index; column is the active visible column index. |

This example uses `createDataTable()` with `defineVMColumns` because it needs the store handle to dispatch `actions.selectCell` and subscribe to selection changes. The View binds the resulting options via `dataTableOptions({ bindings: { data: "dataTableOptions" } })` - columns are not duplicated on the View.

**Example: Selection Dispatch And Observe**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    actions,
    ArrayDataEngine,
    createDataTable,
    dataTable,
    schema,
    toActiveColumnIndex,
    toGlobalRowIndex,
    toPixels,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = {
    id: number;
    region: string;
    owner: string;
    status: "active" | "paused" | "error";
    score: number;
};

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;
    selectionSummary = "no selection yet";
    private store: ReturnType<typeof createDataTable<Row>>["store"] | null = null;
    private unsubscribeSelection: (() => void) | null = null;

    public initialize(): void {
        const rows: Row[] = Array.from({ length: 36 }, (_, index) => ({
            id: index + 1,
            region: "region " + ((index % 6) + 1),
            owner: "owner " + ((index % 5) + 1),
            status: (index % 3 === 0 ? "active" : index % 3 === 1 ? "paused" : "error"),
            score: 55 + (index % 40),
        }));

        const dataEngine = new ArrayDataEngine<Row>({ data: rows });
        const table = createDataTable<Row>({
            data: dataEngine,
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    region: schema.string(),
                    owner: schema.string(),
                    status: schema.string(),
                    score: schema.number(),
                },
            }),
            columns: [
                column({ field: "id", header: "ID", width: toPixels(90), sort: true }),
                column({ field: "region", header: "Region", width: toPixels(150), sort: true }),
                column({ field: "owner", header: "Owner", width: toPixels(150), sort: true }),
                column({ field: "status", header: "Status", width: toPixels(140), sort: true }),
                column({ field: "score", header: "Score", width: toPixels(120), sort: true }),
            ],
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(30) }),
            tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "row" }),
            storage: dataTable.viewModel.storage.localStore({ prefix: "doc-selection-dispatch-observe" }),
        });

        this.dataTableOptions = table.options;
        this.store = table.store;
        this.unsubscribeSelection = table.store.subscribe(actions.selectCell, ({ selection }) => {
            this.selectionSummary =
                "mode: " + selection.selectionMode +
                " | row: " + (selection.coordinates.row as number) +
                " | column: " + (selection.coordinates.column as number);
            this.update();
        });

        this.update();
    }

    public destroy(): void {
        this.unsubscribeSelection?.();
        this.unsubscribeSelection = null;
    }

    public selectTopRow(): void {
        this.store?.dispatch(actions.selectCell({
            selection: {
                coordinates: { row: toGlobalRowIndex(0), column: toActiveColumnIndex(0) },
                selectionMode: "row",
            },
            scrollIntoView: true,
        }));
    }

    public selectMiddleRow(): void {
        this.store?.dispatch(actions.selectCell({
            selection: {
                coordinates: { row: toGlobalRowIndex(18), column: toActiveColumnIndex(2) },
                selectionMode: "row",
            },
            scrollIntoView: true,
        }));
    }

    public selectBottomRow(): void {
        this.store?.dispatch(actions.selectCell({
            selection: {
                coordinates: { row: toGlobalRowIndex(35), column: toActiveColumnIndex(1) },
                selectionMode: "row",
            },
            scrollIntoView: true,
        }));
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocSelectionDispatchObserve", "Dispatching and Observing Selection");
    s.view("main", s => {
        s.div({ height: 400 }).contentTemplates(s => {
            s
                .div({ margin: { bottom: 2 } })
                .contentTemplates(controls => {
                    controls
                        .button({
                            kind: "secondary",
                            size: "small",
                            events: [{ event: "click", handler: "selectTopRow" }],
                        })
                        .contentTemplates(btn => { btn.span({ text: "Select top row" }); });
                    controls
                        .button({
                            kind: "secondary",
                            size: "small",
                            margin: { left: 2 },
                            events: [{ event: "click", handler: "selectMiddleRow" }],
                        })
                        .contentTemplates(btn => { btn.span({ text: "Select middle row" }); });
                    controls
                        .button({
                            kind: "secondary",
                            size: "small",
                            margin: { left: 2 },
                            events: [{ event: "click", handler: "selectBottomRow" }],
                        })
                        .contentTemplates(btn => { btn.span({ text: "Select bottom row" }); });
                });

            s.paragraph({ bindings: { text: "selectionSummary" }, margin: { bottom: 2 } });

            s.div({ height: 320 }).contentTemplates(s => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                }));
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [cell-selection-selection-engines](cell-selection-selection-engines.md): Selection - Selection Engines and more
- [types](types.md): the declarations of the types used here, `SelectionState`; search it for a name rather than reading it whole
