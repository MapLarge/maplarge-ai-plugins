# Data Table recipe - Load rows from an API

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## load-from-an-api

**Load rows from an API.** Show rows from a REST endpoint or any async source, fetched a page at a time as the user scrolls.

Merge into createDataTable({ ... }) `[options]`:

```ts
data: dataTable.viewModel.data.asyncData<Asset>({
    fetchRows: async ({ start, count, sort, filter }) => {
        const response = await fetch("/api/assets", {
            method: "POST",
            body: JSON.stringify({ offset: start, limit: count, sort, filter }),
        });
        const body = (await response.json()) as { readonly rows: Asset[]; readonly total: number };
        return { rows: body.rows, totalSize: body.total };
    },
    defaultPageSize: 100,
    filterCapabilities: { operators: ["Equal", "EqualNot", "Contains", "StartsWith", "EqualAny", "Greater", "GreaterOR", "Less", "LessOR", "Between", "IsNull", "IsNotNull"] },
}),
```

No view definition JSON form; this recipe needs code.

- filterCapabilities lists the filter operators the service applies, and the filter dialog offers only those. Leave it out and every filter dialog opens with no condition and Add condition does nothing. List only operators the service really handles.
- fetchRows receives the current sort and filter, so the server can sort and filter before paging. sort is null or { key, field, direction }; filter is null or a group { logic: "and", filters } holding one entry per filtered column, even when only one column is filtered. Each entry is a condition { field, operator, values: { value, secondValue } } or, for a column with several dialog conditions, a nested { logic: "and" | "or", filters } group; never read filter.field on the top-level filter (the stand-in-in-code variant walks it with isCompositeFilterExpression).
- totalSize is the number of rows that match the filter, not the size of the whole dataset.
- For a MapLarge PagedApiCall use dataTable.viewModel.data.pagedApiCallData({ pagedApiCall }) instead.

Reference: `data-data-engines`

Variants, each in its own file with this recipe: `load-from-an-api#stand-in-in-code` (Stand in for an API in code).

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
- [load-from-an-api#stand-in-in-code](load-from-an-api--stand-in-in-code.md): Stand in for an API in code
