# Data Table recipe - Load rows held in code

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## load-static-rows

**Load rows held in code.** Show rows the ViewModel already holds, such as a fixed list or rows computed in code. Sorting and filtering run in the browser.

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id }),
```

No view definition JSON form; this recipe needs code.

- getRowId returns the field that identifies a row. Edits and the engine's updateRow find their row by it; without it an edit shows on screen but never reaches the engine's copy, so it reverts at the next sort, filter, refresh or delete.
- A read-only table can pass the array itself (data: assets).

Reference: `data-data-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
