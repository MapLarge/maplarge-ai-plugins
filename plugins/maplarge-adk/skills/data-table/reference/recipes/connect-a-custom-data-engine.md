# Data Table recipe - Connect a custom data engine

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## connect-a-custom-data-engine

**Connect a custom data engine.** Back the table with any source the built-in engines do not cover, owning paging, sorting and filtering yourself.

Imports `[imports]`:

```ts
import type { DataEngine, FilterExpression, SortState } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
function createAssetEngine(source: readonly Asset[]): DataEngine<Asset> {
    let sorted: readonly Asset[] = source;
    return {
        type: "offset",
        rowCount: source.length,
        getRows: async ({ start, count }) => ({ rows: sorted.slice(start, start + count), hasMore: start + count < sorted.length }),
        setSort: ({ sort }: { readonly sort: SortState | null }) => {
            if (sort === null) {
                sorted = source;
                return;
            }
            const key = sort.field as keyof Asset;
            const direction = sort.direction === "asc" ? 1 : -1;
            sorted = [...source].sort((a, b) => (a[key] > b[key] ? direction : a[key] < b[key] ? -direction : 0));
        },
        setFilters: (_args: { readonly filter: FilterExpression | null }) => undefined,
    };
}
```

Merge into createDataTable({ ... }) `[options]`:

```ts
data: createAssetEngine(assets),
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code.

- For most remote sources load-from-an-api is enough: asyncData already implements this contract around one fetch callback.

Reference: `data-data-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [data-data-engines](../data-data-engines.md): Data - Data Engines and more
