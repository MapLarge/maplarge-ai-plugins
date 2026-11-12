# Data Table - Scrolling - Build a Custom Row Scroll Engine

<!-- Automatically generated, do not edit -->

## Build a Custom Row Scroll Engine

Implement RowScrollEngine and pass it as rowScrolling on createDataTable({ ... }). This is a mostly mathematical abstraction; custom engines are rare.

### Height estimate context

`RowHeightEstimateContext` is passed to RowHeightEstimate functions when estimating heights for rows that have not been measured in the DOM.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `measuredHeights` | `ReadonlyMap<number, Pixels>` | yes | Measured row heights keyed by global row index. |
| `measuredHeightSum` | `Pixels` | yes | Sum of all measured row heights. |
| `totalRows` | `number \| undefined` | yes | Total row count when known; undefined for unknown totals. |
| `loadedRows` | `number` | yes | Number of rows currently loaded in memory. |

### Engine contract

`RowScrollEngine`: methods and flags your custom row scroll engine must implement. It must also implement getRowScrollTopPosition, reconcileScroll and getZoneInfo, which the example below shows.

getRowScrollTopPosition({ globalRowIndex, totalRows, loadedRows }) returns the scrollTop that brings a row to the top, used for scroll-into-view. reconcileScroll({ scrollTop, clientHeight, totalRows, loadedRows }) is called every scroll frame; return { adjustedScrollTop: undefined } when you do not remap scroll coordinates. getZoneInfo({ totalRows, loadedRows, viewportHeight }) returns { zoned: false, zone: 0, zoneCount: 1 } when not zoned. Leaving any of the three out breaks scrolling.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `getRowHeight` | `(args: { globalRowIndex: number }) => Pixels` | yes | Height of a single row. Constant for all rows in fixed-height engines. |
| `computeRowOffset` | `(args: { globalRowIndex: number }) => Pixels` | yes | Pixel offset of the top of a row from the top of the scroll container. |
| `computeContainerHeight` | `(args: { totalRows: number \| undefined; loadedRows: number }) => Pixels` | yes | Total scrollable container height: virtualScroll sizes it for all totalRows, infiniteScroll for loadedRows only, growing as rows load. virtualScroll uses totalRows x fixedRowHeight, or measured heights plus the estimate for every unmeasured row, capped at the browser's maximum CSS height. |
| `computeVisibleRange` | `(args: { scrollTop, clientHeight, totalRows, loadedRows }) => { firstRow, lastRow }` | yes | Global row indices of the first and last rows intersecting the current viewport. |
| `shouldLoadMoreBasedOnScrollPosition` | `(args: { scrollTop, clientHeight, loadedRows, totalRows, isLoading }) => boolean` | yes | Return true to signal the data table to load more rows. virtualScroll always returns false (full dataset is accessible via the scrollbar); infiniteScroll returns true when within loadThreshold pixels of the loaded content bottom. |
| `computeScrollState` | `(args: { totalRows: number \| undefined; loadedRows: number; firstVisibleRow: GlobalRowIndex; lastVisibleRow: GlobalRowIndex }) => ScrollState` | yes | Builds the scroll state used for the status bar and scroll tracking (statusText, hasMore, etc.). |
| `isFixedHeight` | `boolean` | yes | When false, the view engine calls setMeasuredRowHeight after rows are rendered to update heights from the DOM. |
| `requiresKnownRowCount` | `boolean` | yes | When true, the data engine must provide a known total row count (virtual scroll). |
| `setMeasuredRowHeight` | `(args: { globalRowIndex: number; measuredHeight: Pixels }) => boolean` | no | Called by the view engine with the actual rendered height of a row. Return true if the height changed and a re-layout is needed. |
| `clearMeasuredHeights` | `() => void` | no | Reset all stored row height measurements. |

### Custom Row Scroll Engine Example

Implements RowScrollEngine as a simple fixed-height engine that sizes the scroll container to the full dataset and always returns false for shouldLoadMoreBasedOnScrollPosition.

The engine class lives in the ViewModel - Views must stay serializable, so never construct an engine in a View. Register the factory by name on createDataTable({ engines: { rowScrolling: { ... } } }) and select it from the View with dataTable.view.rowScrolling.custom("name", args).

**Example: Custom Scroll Engine**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    ArrayDataEngine,
    createDataTable,
    dataTable,
    schema,
    toGlobalRowIndex,
    toPixels,
} from "data-ui/data-table";
import type {
    DataTableOptions,
    GlobalRowIndex,
    Pixels,
    RowScrollEngine,
} from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string };

const scrollingRows: Row[] = Array.from({ length: 20 }, (_, rowIndex) => ({
    id: rowIndex + 1,
    name: "row-" + String(rowIndex + 1),
}));


const gridSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
    },
});


const { column } = dataTable.viewModel.defineColumns<Row>();
const columns = [
    column({ field: "id", header: "ID" }),
    column({ field: "name", header: "Name" }),
];


class FixedHeightScrollEngine implements RowScrollEngine {
    readonly isFixedHeight = true;
    readonly requiresKnownRowCount = true;
    private readonly rowHeight: Pixels;

    constructor(rowHeight: Pixels) {
        this.rowHeight = rowHeight;
    }

    getRowHeight(_args: { readonly globalRowIndex: number }): Pixels {
        return this.rowHeight;
    }

    computeRowOffset({ globalRowIndex }: { readonly globalRowIndex: number }): Pixels {
        return (globalRowIndex * (this.rowHeight as number)) as Pixels;
    }

    getRowScrollTopPosition({ globalRowIndex }: { readonly globalRowIndex: number }): Pixels {
        return this.computeRowOffset({ globalRowIndex });
    }

    computeContainerHeight({ totalRows }: { readonly totalRows: number | undefined; readonly loadedRows: number }): Pixels {
        return ((totalRows ?? 0) * (this.rowHeight as number)) as Pixels;
    }

    computeVisibleRange({ scrollTop, clientHeight, totalRows }: {
        readonly scrollTop: Pixels;
        readonly clientHeight: Pixels;
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
    }): { readonly firstRow: GlobalRowIndex; readonly lastRow: GlobalRowIndex } {
        const resolvedTotalRows = totalRows ?? 0;
        const rowHeight = this.rowHeight as number;
        const clampRowIndex = (naturalOffset: number) =>
            toGlobalRowIndex(Math.min(Math.max(Math.floor(naturalOffset / rowHeight), 0), Math.max(0, resolvedTotalRows - 1)));
        const maxNaturalOffset = Math.max(0, resolvedTotalRows * rowHeight - 1);
        const naturalScrollTop = Math.min(scrollTop as number, maxNaturalOffset);
        const naturalBottom = Math.min((scrollTop as number) + (clientHeight as number), maxNaturalOffset);
        return {
            firstRow: clampRowIndex(naturalScrollTop),
            lastRow: clampRowIndex(naturalBottom),
        };
    }

    reconcileScroll(): { readonly adjustedScrollTop: undefined } {
        return { adjustedScrollTop: undefined };
    }

    getZoneInfo(): { readonly zoned: false; readonly zone: 0; readonly zoneCount: 1 } {
        return { zoned: false, zone: 0, zoneCount: 1 };
    }

    shouldLoadMoreBasedOnScrollPosition(): boolean {
        return false;
    }

    computeScrollState({ totalRows, loadedRows, firstVisibleRow, lastVisibleRow }: {
        readonly totalRows: number | undefined;
        readonly loadedRows: number;
        readonly firstVisibleRow: GlobalRowIndex;
        readonly lastVisibleRow: GlobalRowIndex;
    }) {
        const resolvedTotalRows = totalRows ?? 0;
        const statusText = resolvedTotalRows === 0
            ? "0 rows"
            : `${firstVisibleRow + 1} - ${lastVisibleRow + 1} of ${resolvedTotalRows} rows`;
        return { loadedRows, totalRows: resolvedTotalRows, hasMore: loadedRows < resolvedTotalRows, statusText };
    }
}

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        // engines are class instances, so register the factory by name here;
        // the View selects it with dataTable.view.rowScrolling.custom("fixedHeight", { ... })
        const { options } = createDataTable<Row>({
            data: new ArrayDataEngine<Row>({ data: scrollingRows }),
            schema: gridSchema,
            columns,
            engines: {
                rowScrolling: {
                    fixedHeight: (args: { rowHeight?: number }) => new FixedHeightScrollEngine(toPixels(args.rowHeight ?? 32)),
                },
            },
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
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("ScrollingDocCustomScrollEngine", "Custom RowScrollEngine");
    s.view("main", (s) => {
        s.div({ height: 280 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                // select the registered engine by name; the ref stays serializable
                rowScrolling: dataTable.view.rowScrolling.custom("fixedHeight", { rowHeight: 32 }),
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [scrolling-row-scroll-engines](scrolling-row-scroll-engines.md): Scrolling - Row Scroll Engines and more
- [types](types.md): the declarations of the types used here, `RowHeightEstimate`, `RowScrollEngine`; search it for a name rather than reading it whole
