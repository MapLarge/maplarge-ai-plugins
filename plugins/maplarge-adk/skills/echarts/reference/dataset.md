# dataset component

A shared data table for a chart. Declare rows/columns once under the top-level `dataset` key; each `series` points at it with `datasetIndex` (or `datasetId`) and maps columns to roles with `encode`. The data-driven alternative to giving every series its own `data[]`.

## When to use

- Several series plot the **same columns** (e.g. one line per metric over the same x), or you want to switch which column is X / Y / color without rebuilding `data[]`.
- Source data is already row- or column-shaped (a query result, CSV-like rows, a `{col: values}` dict) and you'd rather not pivot it per series.
- You want a built-in **transform pipeline** (`filter`, `sort`) or a registered transform plugin (boxplot, ecStat regression/clustering/histogram) to derive a second dataset from a first.
- Prefer per-series **`data[]`** instead when a series is one-off, carries per-point styling (`itemStyle` in data items), uses `custom` renderItem tuples, or drives `markLine`/`markArea` — dataset does not feed those. See `line.md`, `bar.md`, `scatter.md`, `pie.md`, `custom.md`.

## Minimal config

```ts
const option: ml.echarts.EChartsOption = {
    legend: {},
    tooltip: { trigger: "axis" },
    dataset: {
        // first row = header → becomes dimension names
        source: [
            ["quarter", "revenue", "cost"],
            ["Q1", 120, 80],
            ["Q2", 200, 110],
            ["Q3", 150, 95],
            ["Q4", 220, 130],
        ],
    },
    xAxis: { type: "category" },   // category axis reads dimension 0 by default
    yAxis: { type: "value" },
    // two series, no per-series data — both read the one dataset:
    series: [
        { type: "bar", encode: { x: "quarter", y: "revenue" } },
        { type: "bar", encode: { x: "quarter", y: "cost" } },
    ],
};
```

With no `encode`, the first dimension maps to the category axis and each subsequent dimension becomes one series' value — so the two `series` entries above could even be `[{ type: "bar" }, { type: "bar" }]` and ECharts auto-assigns columns. Spell out `encode` once you have more than two columns.

## Data shape

`dataset.source` accepts three author-facing shapes (type `OptionSourceData`):

- **2D array (`arrayRows`)** — `Array<Array<value>>`. First row is the header when `sourceHeader` is truthy/`"auto"` (the default detects it).
- **Array of objects (`objectRows`)** — `Array<{ [col]: value }>`. Keys are the dimension names; no header row.
- **Column dictionary (`keyedColumns`)** — `{ col: value[] }`. Each key is a dimension, each array a column. Pair with `seriesLayoutBy: "column"` (the default).

`encode` then references columns **by dimension name** (string) or **by index** (number). The series itself carries **no `data`** — that's the whole point.

## Key options

On `DatasetComponentOption` (`ml.echarts.DatasetComponentOption`):

- `source : OptionSourceData` — the table: 2D array, object rows, or column dict.
- `dimensions : (string | { name, type?, displayName? })[]` — explicit dimension names/types. Overrides header detection; lets `encode` use names. `type` is `'number' | 'ordinal' | 'time' | 'float' | 'int'` etc.
- `sourceHeader : boolean | 'auto' | number` — whether row 0 (or first N rows) is a header. `'auto'` detects; `false` forces no header; a number = header row count.
- `seriesLayoutBy : 'column' | 'row'` — read each series down a column (default) or across a row. Use `'row'` for `keyedColumns`-style transposed data.
- `id` / `name` — identify this dataset so a series can use `datasetId` and transforms can use `fromDatasetId`.
- `transform : DataTransformOption | DataTransformOption[]` — derive this dataset from another via a transform (pipe = array). See reference.
- `fromDatasetIndex : number` / `fromDatasetId : string` — input dataset for the `transform`.
- `fromTransformResult : number` — when a transform returns multiple results (e.g. boxplot returns boxes + outliers), pick which one.

On each **series** (`SeriesEncodeOptionMixin`, mixed into every series type):

- `datasetIndex : number` — which dataset to read (default `0`).
- `datasetId : string | number` — reference a dataset by `id` instead of index.
- `encode : { x, y, tooltip, itemName, label, seriesName, value, ... }` — map column name(s)/index(es) to visual roles. Each value is a dimension or array of dimensions. `x`/`y` for cartesian; `value`/`itemName` for pie; `tooltip` lists extra columns to show.
- `seriesLayoutBy`, `sourceHeader`, `dimensions` — same fields, overridable per series.

## Patterns

### Switchable X / Y / color (one dataset, rebind encode)

Keep `source` static; change only `encode` from a ViewModel getter. No data re-shaping.

```ts
// VM returns the current series fragment:
public get scatterSeries(): ml.echarts.ScatterSeriesOption[] {
    return [{ type: "scatter", encode: { x: this.xDim, y: this.yDim, tooltip: [this.xDim, this.yDim, "label"] } }];
}
// view binds series (and dataset.source separately); flipping xDim/yDim re-renders.
```

### Chained transforms — filter then sort

Each dataset can derive from the previous. Index them and reference with `fromDatasetIndex`.

```ts
dataset: [
    { source: rows },                                                  // 0: raw
    { transform: { type: "filter", config: { dimension: "cost", ">": 100 } } }, // 1: from 0
    { fromDatasetIndex: 1, transform: { type: "sort", config: { dimension: "revenue", order: "desc" } } },
],
series: [{ type: "bar", datasetIndex: 2, encode: { x: "quarter", y: "revenue" } }],
```

`filter` and `sort` are built in. `boxplot`, regression/`ecStat:*` etc. must be **registered first** (see Gotchas).

### Object-rows + encode by name

```ts
dataset: { source: [
    { region: "North", units: 40, returns: 3 },
    { region: "South", units: 65, returns: 7 },
] },
series: [{ type: "bar", encode: { x: "region", y: "units" } }],
```

## Gotchas

- **dataset and series `data` are mutually exclusive per series.** If a series has its own `data`, that data wins and the dataset is ignored for it. Don't set both.
- **Header detection is implicit.** With a 2D array and an unexpected first row, set `sourceHeader: true | false` explicitly so dimension 0 isn't silently treated as a data row (or vice-versa).
- **`encode` is by name only when names exist.** Names come from the header row or `dimensions`. Without either, reference columns by **index** (`encode: { x: 0, y: 1 }`).
- **Transform plugins aren't built in.** Only `filter` and `sort` ship. `boxplot`, histogram, regression, clustering live in the `ecStat`/`dataTool` packages and must be installed via `echarts.registerTransform(...)` before `type: "ecStat:regression"` resolves — otherwise the dataset silently yields nothing. The d.ts types these loosely as `DataTransformOption { type, config?, print? }`, so TS won't catch a missing registration.
- **Category axis pulls from the dataset too.** On `xAxis: { type: "category" }` with a dataset, ECharts takes categories from the encoded x dimension — don't also set `xAxis.data`, which would conflict.
- **`seriesLayoutBy` default is `'column'`.** Column-dictionary (`keyedColumns`) source plotted "by row" needs `seriesLayoutBy: "row"`; mismatches read the wrong axis.
- **Merge semantics.** Re-emitting `dataset` deep-merges like any component; return a fresh `source` array from the VM getter to fully replace rows (see parent skill on setOption merge).

## Related skills

- `echarts` — parent: the option model, `setOption` merge behavior, and `ml.echarts.*` types.
- the `raptor` skill's chart control (`../../raptor/reference/controls/chart.md`) — how the chart mounts: `s.chart({ options })`, `traverseRaptorChart` bindings, binding `dataset.source` / `series` to ViewModel getters.
- `line.md`, `bar.md`, `scatter.md`, `pie.md` — the per-series `data[]` alternative and the series that most commonly consume a dataset via `encode`.
- `boxplot.md` — boxplot's `dataset` `transform: { type: "boxplot" }` workflow (registered transform).
- `tooltip.md` — `encode.tooltip` controls which dataset columns appear in tooltips.

---
*A deeper option/field cheatsheet lives in the Reference section below.*

---

## dataset — option & field cheatsheet

Type: `ml.echarts.DatasetComponentOption` (exported alias of internal `DatasetOption`). Top-level key `dataset?: DatasetComponentOption | DatasetComponentOption[]`.

## DatasetComponentOption fields (from d.ts)

| field | type | notes |
| --- | --- | --- |
| `source` | `OptionSourceData` | 2D array \| object rows \| column dict (see formats below). Omit when this dataset is derived via `transform`. |
| `dimensions` | `DimensionDefinitionLoose[]` | `string` or `{ name?, type?, displayName? }`. Names enable string `encode`. |
| `sourceHeader` | `boolean \| 'auto' \| number` | header row(s). `'auto'` = detect. |
| `seriesLayoutBy` | `'column' \| 'row'` | default `'column'`. |
| `transform` | `DataTransformOption \| DataTransformOption[]` | single transform or a pipe (array runs in order). |
| `fromDatasetIndex` | `number` | input dataset for `transform`. |
| `fromDatasetId` | `string` | input dataset by `id`. |
| `fromTransformResult` | `number` | pick one of a multi-result transform. |
| `id` / `name` | `OptionId` / string | identify for `datasetId` / `fromDatasetId`. |
| `mainType` | `'dataset'` | internal; never set. |

## Source formats (`OptionSourceData` union)

```text
arrayRows    OptionSourceDataArrayRows    = Array<Array<value>>     // header row optional
objectRows   OptionSourceDataObjectRows   = Array<{ [col]: value }> // keys are dimensions
keyedColumns OptionSourceDataKeyedColumns = { [col]: value[] }      // each key a column
original     OptionSourceDataOriginal     = ArrayLike<item>         // value | value[] | {value,...}
typedArray   OptionSourceDataTypedArray   = ArrayLike<number>       // perf path
```

`value` (`OptionDataValue`) = `string | number | Date | null | undefined`.

`DimensionDefinition = { type?: DataStoreDimensionType; name?: string; displayName?: string }`. `DimensionDefinitionLoose = string | DimensionDefinition`.

## series-side encode (`SeriesEncodeOptionMixin`, on every series)

| field | type |
| --- | --- |
| `datasetIndex` | `number` |
| `datasetId` | `string \| number` |
| `seriesLayoutBy` | `'column' \| 'row'` |
| `sourceHeader` | `boolean \| 'auto' \| number` |
| `dimensions` | `DimensionDefinitionLoose[]` |
| `encode` | `OptionEncode` |

### OptionEncode roles

Coordinate dims (open-ended `[coordDim: string]`): `x`, `y`, `radius`, `angle`, `value`, `single`, `lng`, `lat` ... plus visual roles from `OptionEncodeVisualDimensions`:

| role | meaning |
| --- | --- |
| `tooltip` | columns shown in tooltip |
| `label` | column driving the on-chart label |
| `itemName` | name per item (pie/funnel slice name) |
| `itemId` | stable id per item |
| `seriesName` | column naming the series |
| `itemGroupId` / `childGroupdId` | grouping for transitions/drilldown |

Each value is `DimensionLoose | DimensionLoose[]` — a dimension name (string), index (number), or list of them. Example: `encode: { x: "date", y: ["open","close"], tooltip: ["date","open","high","low","close"] }`.

## Transforms (`DataTransformOption`)

```ts
interface DataTransformOption { type: string; config?: unknown; print?: boolean; }
type PipedDataTransformOption = DataTransformOption[];   // run in order
```

`print: true` logs the transform output to console for debugging.

Built in: `'filter'`, `'sort'`.

```ts
// filter
{ type: "filter", config: { dimension: "year", gte: 2020 } }
// filter with logical combinators
{ type: "filter", config: { and: [ { dimension: "v", ">": 0 }, { dimension: "v", "<": 100 } ] } }
// sort (single or multi-key)
{ type: "sort", config: { dimension: "score", order: "desc" } }
{ type: "sort", config: [ { dimension: "cat", order: "asc" }, { dimension: "score", order: "desc" } ] }
```

Filter comparators: `<`, `<=`, `>`, `>=`, `=`, `!=`, `reg` (regex), plus `and`/`or`/`not` nesting. `order`: `'asc' | 'desc'`. `parser: 'time'` / `'number'` / `'trim'` coerces a dimension before comparing.

External plugins (must register before use):

```ts
import * as ecStat from "echarts-stat";
echarts.registerTransform(ecStat.transform.regression);
echarts.registerTransform(ecStat.transform.clustering);
echarts.registerTransform(ecStat.transform.histogram);
// then:
{ transform: { type: "ecStat:regression", config: { method: "linear" } } }
// boxplot ships in echarts/extension dataTool:
import { transform as boxplotTransform } from "echarts/extension/dataTool";  // registerTransform(...)
{ transform: { type: "boxplot", config: { itemNameFormatter: "expr {value}" } } }
```

Boxplot returns two results — boxes (default index 0) and outliers — so the scatter overlay dataset uses `fromTransformResult: 1`.

`registerExternalTransform({ type, transform })` is the lower-level API; a transform returns `{ data, dimensions? }` (`ExternalDataTransformResultItem`) or an array of them.

## Resolution rules (semantics)

- A series with its own `data` ignores the dataset entirely.
- Default `datasetIndex` is `0`; default `encode` maps dim 0 → category axis, remaining dims → one series each.
- Dimension names resolve from (a) `dataset.dimensions`, else (b) header row when `sourceHeader` truthy, else none → use indices.
- `xAxis.type: "category"` with a dataset reads categories from the encoded x dimension; do not also set `xAxis.data`.
- Multiple `dataset` entries form a pipeline: a downstream entry's `fromDatasetIndex`/`fromDatasetId` + `transform` consumes an upstream entry.

Official reference (SPA — open in a browser, do not scrape): <https://echarts.apache.org/en/option.html#dataset>
