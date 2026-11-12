# Data Table recipe - Build a custom integration

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## build-a-custom-integration

**Build a custom integration.** Connect the table to something outside it, such as keeping the sort in the page URL.

Imports `[imports]`:

```ts
import type { TableIntegration } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
const sortInUrl: TableIntegration = {
    start: ({ store }) => store.on(actions.sortDone, ({ sort }) => {
        window.history.replaceState(null, "", sort ? "#sort=" + sort.key + ":" + sort.direction : "#");
    }),
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
integrations: [
    { key: "sortInUrl", engine: sortInUrl },
],
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code; integrations[0] (its engine is code).

- start runs once the table has mounted and its first load has finished, and again each time the entry is enabled; it returns the function that undoes what it applied, which runs when the entry is disabled or the table is destroyed.

Reference: `integrations`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [integrations](../integrations.md): Integrations
