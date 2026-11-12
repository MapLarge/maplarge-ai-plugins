# Data Table recipe - Stand in for an API in code

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

### load-from-an-api#stand-in-in-code

**Stand in for an API in code.** Serve pages of rows from code the way a paged API would, applying the table's sort and filter, for a demo or a test before the real service exists.

Apply the recipe above, then:

Imports `[imports]`:

```ts
import { isCompositeFilterExpression } from "data-ui/data-table";
import type { FilterExpression, SortState } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
function compareValues(a: unknown, b: unknown): number {
    return typeof a === "number" ? a - Number(b) : String(a ?? "").localeCompare(String(b ?? ""));
}

function matchesFilter(asset: Asset, filter: FilterExpression): boolean {
    if (isCompositeFilterExpression(filter)) {
        return filter.logic === "and" ? filter.filters.every((part) => matchesFilter(asset, part)) : filter.filters.some((part) => matchesFilter(asset, part));
    }
    const value: unknown = asset[filter.field as keyof Asset];
    const wanted = filter.values.value;
    const text = String(value ?? "").toLowerCase();
    const wantedText = String(wanted ?? "").toLowerCase();
    switch (filter.operator) {
        case "Equal": return text === wantedText;
        case "EqualNot": return text !== wantedText;
        case "Contains": return text.includes(wantedText);
        case "StartsWith": return text.startsWith(wantedText);
        case "EqualAny": return Array.isArray(wanted) && wanted.some((item) => String(item).toLowerCase() === text);
        case "Greater": return compareValues(value, wanted) > 0;
        case "GreaterOR": return compareValues(value, wanted) >= 0;
        case "Less": return compareValues(value, wanted) < 0;
        case "LessOR": return compareValues(value, wanted) <= 0;
        case "Between": return compareValues(value, wanted) >= 0 && compareValues(value, filter.values.secondValue) <= 0;
        case "IsNull": return value === null || value === undefined;
        case "IsNotNull": return value !== null && value !== undefined;
        default: return true;
    }
}

const allAssets: Asset[] = Array.from({ length: 5000 }, (_unused, index) => {
    const template = assets[index % assets.length];
    return { ...template, id: index + 1, name: template.name + " " + String(index + 1) };
});

async function fetchAssetPage(start: number, count: number, sort: SortState | null, filter: FilterExpression | null): Promise<{ rows: Asset[]; totalSize: number }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const rows = filter === null ? [...allAssets] : allAssets.filter((asset) => matchesFilter(asset, filter));
    if (sort !== null) {
        const key = sort.field as keyof Asset;
        const direction = sort.direction === "asc" ? 1 : -1;
        rows.sort((a, b) => direction * compareValues(a[key], b[key]));
    }
    return { rows: rows.slice(start, start + count), totalSize: rows.length };
}
```

Merge into createDataTable({ ... }) `[options]`, in place of the recipe's block:

```ts
data: dataTable.viewModel.data.asyncData<Asset>({
    fetchRows: ({ start, count, sort, filter }) => fetchAssetPage(start, count, sort, filter),
    defaultPageSize: 100,
    filterCapabilities: { operators: ["Equal", "EqualNot", "Contains", "StartsWith", "EqualAny", "Greater", "GreaterOR", "Less", "LessOR", "Between", "IsNull", "IsNotNull"] },
}),
```

- filterCapabilities lists the operators matchesFilter handles, and the filter dialog offers only those; without it every filter dialog opens with no condition and Add condition does nothing. Keep the list and matchesFilter's cases the same.
- allAssets builds every row once, outside fetchAssetPage, from its index alone (no Math.random; times count back from one new Date() taken when the module loads, never Date.now() inside the fetch), so a page fetched twice returns the same rows. fetchAssetPage then filters and sorts that whole array before it takes the page, and returns the filtered count as totalSize.
- Never generate only the requested page: a page alone cannot be filtered, sorted or counted correctly, so the table shows one page's worth of rows and loses the rest.
- The filter fetchRows receives is a group { logic: "and", filters } with one entry per filtered column (even for one column); an entry is a condition { field, operator, values: { value, secondValue } } or a nested group. isCompositeFilterExpression tells them apart, and matchesFilter walks the groups. It covers the operators the filter dialog offers.
- When the real service exists, swap fetchAssetPage for a fetch to it, as the recipe above does.

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [load-from-an-api](load-from-an-api.md): Load rows from an API
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
