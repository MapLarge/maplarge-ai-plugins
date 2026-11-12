# Data Table - Scrolling - Row Height Heuristics

<!-- Automatically generated, do not edit -->

## Row Height Heuristics

The view engine must determine each row's height from the rendered DOM. The rowHeightHeuristic option controls which columns are measured and how their heights are combined into a single row height. This has no effect when fixedRowHeight is passed to the scroll engine.

### Heuristic context

`RowHeightHeuristicContext` is passed to RowHeightHeuristic functions when measuring a rendered row.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `globalRowIndex` | `number` | yes | Global row index of the row being measured. |
| `row` | `unknown` | yes | The raw row data object. |
| `activeColumns` | `readonly { key: string; field?: string; contentHeight?: string; textWrap?: boolean }[]` | yes | Projection of all non-hidden columns. |
| `measureColumnHeightByIndex` | `(activeColumnIndex: number) => Pixels` | yes | Measure DOM height for a column in the viewport slot window. |
| `cachedColumnHeights` | `ReadonlyMap<string, Pixels>` | yes | Previously measured column heights for this row, keyed by column key. |

- rowHeightHeuristics.linearScan: (default) measures all active columns.
- rowHeightHeuristics.firstN: measures the first N active columns.
- rowHeightHeuristics.lastN: measures the last N active columns.
- rowHeightHeuristics.byIndexes: measures specific column positions.
- rowHeightHeuristics.byKeys: measures specific column keys.

firstN, lastN, byIndexes and byKeys also measure every column with textWrap: true. Other columns, including content-template columns of variable height, do not count toward the row height unless listed.

### rowHeightHeuristics.linearScan

Scans all active columns. On-screen columns are measured via the DOM. Off-screen columns use their declared contentHeight if set, then the height already measured for that column on this row while it was on screen, then offscreenColumnHeightHeuristic if provided, then 0. Row height is the maximum across all columns.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `rowHeightHeuristics.linearScan` | `RowHeightHeuristic` | no | Factory that returns a RowHeightHeuristic function. |
| `offscreenColumnHeightHeuristic` | `OffscreenColumnHeightHeuristic` | no | Called instead of DOM measurement for columns scrolled outside the horizontal viewport. Without this, those columns contribute 0 to the row height. |

### rowHeightHeuristics.firstN

Measures only the first N active columns.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `rowHeightHeuristics.firstN` | `RowHeightHeuristic` | no | Factory that returns a RowHeightHeuristic function. |
| `n` | `number` | yes | Number of leading active columns to measure. |
| `offscreenColumnHeightHeuristic` | `OffscreenColumnHeightHeuristic` | no | Called instead of DOM measurement for columns outside the horizontal viewport. |

### rowHeightHeuristics.lastN

Measures only the last N active columns. Columns before the last-N window are not measured and do not count toward the row height. Useful when the tallest content is typically in trailing columns.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `rowHeightHeuristics.lastN` | `RowHeightHeuristic` | no | Factory that returns a RowHeightHeuristic function. |
| `n` | `number` | yes | Number of trailing active columns to measure. |
| `offscreenColumnHeightHeuristic` | `OffscreenColumnHeightHeuristic` | no | Called instead of DOM measurement for columns outside the horizontal viewport. |

### rowHeightHeuristics.byIndexes

Measures only the columns at the specified active column indexes. Useful when only a subset of columns drives row height.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `rowHeightHeuristics.byIndexes` | `RowHeightHeuristic` | no | Factory that returns a RowHeightHeuristic function. |
| `indexes` | `readonly number[]` | yes | Active column indexes to measure. |
| `offscreenColumnHeightHeuristic` | `OffscreenColumnHeightHeuristic` | no | Called instead of DOM measurement for any of the specified indexes scrolled outside the horizontal viewport. |

### rowHeightHeuristics.byKeys

Measures only the columns with the specified column keys.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `rowHeightHeuristics.byKeys` | `RowHeightHeuristic` | no | Factory that returns a RowHeightHeuristic function. |
| `keys` | `readonly string[]` | yes | Column keys to measure. |
| `offscreenColumnHeightHeuristic` | `OffscreenColumnHeightHeuristic` | no | Called instead of DOM measurement for any of the specified keys scrolled outside the horizontal viewport. |

### Custom Row Height Heuristic

**Custom Row Height Heuristic Code Snippet**:

```ts
import type { RowHeightHeuristic, RowHeightHeuristicContext, Pixels } from "data-ui/data-table";

// type RowHeightHeuristic = (context: RowHeightHeuristicContext) => Pixels

// measures only the columns currently in the horizontal viewport, then enforces
// a minimum of 32px so rows never collapse to zero when all columns are empty
const myRowHeightHeuristic: RowHeightHeuristic = ({
    viewportColumnStart,
    viewportColumnEnd,
    measureColumnHeightByIndex,
}) => {
    let max = 0;
    for (let i = viewportColumnStart; i < viewportColumnEnd; i++) {
        max = Math.max(max, measureColumnHeightByIndex(i));
    }
    return Math.max(max, 32) as Pixels;
};
```

### Offscreen Column Height Heuristic

Each row height heuristic accepts an optional offscreenColumnHeightHeuristic. When a column is scrolled outside the horizontal viewport, there is no DOM node to measure. The offscreen heuristic handles that column instead.

Default offscreen heuristic, when rowHeightHeuristic is not set: fixedHeight (seeded from getRowHeight at index 0) when the row scroll engine uses fixedRowHeight, or averageOfFirstNKnownColumns({ n: 3 }) otherwise. Pass an explicit offscreenColumnHeightHeuristic to override.

When you pass your own rowHeightHeuristic, pass offscreenColumnHeightHeuristic explicitly too. Even rowHeightHeuristic.linearScan() adds no default: off-screen columns that were never measured then count as 0.

- estimateFromText: estimates from text content and column width.
- firstKnownColumnHeight: reuses the height of the first column that has been measured.
- fixedHeight: always returns the same height.
- averageOfFirstNKnownColumns: averages the cached heights of the first N measured columns.
- averageOfColumnsByKeys: averages the cached heights of specified column keys.
- averageOfColumnsByIndexes: averages the cached heights of specified column indexes.

#### offscreenColumnHeightHeuristics.estimateFromText

Estimates height from text content by computing how many lines the text wraps to given the column pixel width, font size, and average character width.

Only a column with textWrap: true is wrapped; a column without textWrap counts as one line, and resolveText is not called for it.

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `offscreenColumnHeightHeuristics.estimateFromText` | `OffscreenColumnHeightHeuristic` | no | - | Factory that returns an OffscreenColumnHeightHeuristic function. |
| `fontSize` | `number` | no | `14` | Font size in pixels used for line height and character width calculations. |
| `lineHeight` | `number` | no | `1.4` | Line height multiplier applied to fontSize. |
| `verticalPadding` | `number` | no | `16` | Pixels of vertical padding added to the estimated content height. |
| `averageCharWidthRatio` | `number` | no | `0.6` | Estimated average character width as a ratio of fontSize. Used to compute characters per line. |
| `resolveText` | `(key: string, row: unknown) => string` | no | - | Custom function to extract the cell text from a row. Defaults to row[key]. |

#### offscreenColumnHeightHeuristics.firstKnownColumnHeight

Returns the cached DOM height of the first column (by activeColumns order) that has been measured for this row. Falls back to 0 if no columns have been seen yet.

#### offscreenColumnHeightHeuristics.fixedHeight

Returns the same pixel value for every off-screen column. Default when the row scroll engine uses fixedRowHeight, where it is automatically seeded with that row height.

That covers fixedRowHeight on virtualScroll or infiniteScroll; a virtualScroll without fixedRowHeight defaults to averageOfFirstNKnownColumns({ n: 3 }).

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `offscreenColumnHeightHeuristics.fixedHeight` | `OffscreenColumnHeightHeuristic` | no | Factory that returns an OffscreenColumnHeightHeuristic function. |
| `height` | `Pixels` | no | Fixed height to use. |

#### offscreenColumnHeightHeuristics.averageOfFirstNKnownColumns

Averages the cached DOM heights of the first N columns (by activeColumns order) that have been measured for this row. Uncached columns are skipped; returns 0 if none are cached yet.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `offscreenColumnHeightHeuristics.averageOfFirstNKnownColumns` | `OffscreenColumnHeightHeuristic` | no | Factory that returns an OffscreenColumnHeightHeuristic function. |
| `n` | `number` | yes | Maximum number of cached column heights to include in the average. |

#### offscreenColumnHeightHeuristics.averageOfColumnsByKeys

Averages the cached DOM heights of the columns identified by the given keys. Columns not yet measured are excluded from the average; returns 0 if none of the specified columns are cached.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `offscreenColumnHeightHeuristics.averageOfColumnsByKeys` | `OffscreenColumnHeightHeuristic` | no | Factory that returns an OffscreenColumnHeightHeuristic function. |
| `keys` | `readonly string[]` | yes | Column keys whose cached heights to average. |

#### offscreenColumnHeightHeuristics.averageOfColumnsByIndexes

Averages the cached DOM heights of the columns at the given active-column indexes. Returns 0 if none of the specified columns are cached.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `offscreenColumnHeightHeuristics.averageOfColumnsByIndexes` | `OffscreenColumnHeightHeuristic` | no | Factory that returns an OffscreenColumnHeightHeuristic function. |
| `indexes` | `readonly number[]` | yes | Active column indexes whose cached heights to average. |

**Row Height Heuristic Code Snippet**:

```ts
import { dataTable, dataTableOptions } from "data-ui/data-table";

// measure all columns (linearScan)
s.dataTable(dataTableOptions<Row>({
    data,
    schema,
    columns,
    rowScrolling: dataTable.view.rowScrolling.infiniteScroll({
        rowHeightEstimate: dataTable.view.rowHeightEstimate.runningAverage({ initialEstimate: 40 }),
    }),
    rowHeightHeuristic: dataTable.view.rowHeightHeuristic.linearScan(),
}));

// only measure the "description" column; estimate off-screen columns from text
s.dataTable(dataTableOptions<Row>({
    data,
    schema,
    columns,
    rowScrolling: dataTable.view.rowScrolling.infiniteScroll({
        rowHeightEstimate: dataTable.view.rowHeightEstimate.median({ initialEstimate: 40 }),
    }),
    rowHeightHeuristic: dataTable.view.rowHeightHeuristic.byKeys({
        keys: ["description"],
        offscreenColumnHeightHeuristic: dataTable.view.rowHeightHeuristic.offscreen.estimateFromText({
            resolveText: { binding: "resolveCellText" },
        }),
    }),
}));

// average the first 10 measured columns for off-screen columns
s.dataTable(dataTableOptions<Row>({
    data,
    schema,
    columns,
    rowScrolling: dataTable.view.rowScrolling.infiniteScroll(),
    rowHeightHeuristic: dataTable.view.rowHeightHeuristic.linearScan({
        offscreenColumnHeightHeuristic: dataTable.view.rowHeightHeuristic.offscreen.averageOfFirstNKnownColumns({ n: 10 }),
    }),
}));
```

#### Custom Offscreen Heuristic

Implement OffscreenColumnHeightHeuristic to estimate column height from your own data instead of using the built-in heuristics.

#### Offscreen heuristic context

`OffscreenColumnHeightHeuristicContext` is passed to each OffscreenColumnHeightHeuristic when estimating a column that is scrolled outside the horizontal viewport.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | `string` | yes | The column key of the off-screen column being estimated. |
| `row` | `unknown` | yes | The raw row data object. |
| `columnWidth` | `Pixels` | yes | Resolved pixel width of the column. |
| `cachedColumnHeights` | `ReadonlyMap<string, Pixels>` | yes | Previously measured heights for this row's columns, keyed by column key. |
| `activeColumns` | `ReadonlyArray<{ key: string }>` | yes | All non-hidden columns in active-column order. |

**Custom Offscreen Column Height Heuristic Code Snippet**:

```ts
import type { OffscreenColumnHeightHeuristic, Pixels } from "data-ui/data-table";
import { dataTable, dataTableOptions } from "data-ui/data-table";

// ViewModel member; the View names it with a binding, since a View must stay serializable
public readonly estimateOffscreenHeight: OffscreenColumnHeightHeuristic = ({
    key,
    row,
    columnWidth,
    cachedColumnHeights,
}) => {
    // prefer a cached measurement from a sibling column with the same key prefix
    for (const [cachedKey, cachedHeight] of cachedColumnHeights) {
        if (cachedKey.startsWith(key.split("_")[0])) return cachedHeight;
    }

    // fall back to text-length estimate
    const text = String((row as Record<string, unknown>)[key] ?? "");
    const charsPerLine = Math.max(1, Math.floor(columnWidth / 8));
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    return lines * 20 + 16 as Pixels;
};

s.dataTable(dataTableOptions<Row>({
    data,
    schema,
    columns,
    rowScrolling: dataTable.view.rowScrolling.infiniteScroll({
        rowHeightEstimate: dataTable.view.rowHeightEstimate.runningAverage({ initialEstimate: 25 }),
    }),
    rowHeightHeuristic: dataTable.view.rowHeightHeuristic.linearScan({
        offscreenColumnHeightHeuristic: { binding: "estimateOffscreenHeight" },
    }),
}));
```

## Related

- [scrolling-row-scroll-engines](scrolling-row-scroll-engines.md): Scrolling - Row Scroll Engines and more
- [types](types.md): the declarations of the types used here, `RowHeightHeuristic`; search it for a name rather than reading it whole
