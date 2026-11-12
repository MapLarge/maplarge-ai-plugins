# Data Table recipe - Save layouts to your own backend

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## save-layouts-to-your-own-backend

**Save layouts to your own backend.** Store saved table layouts somewhere other than browser storage or user preferences.

Imports `[imports]`:

```ts
import { ok } from "data-ui/data-table";
import type { DataTableSavedState, IPersistenceEngine } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
const savedLayouts = new Map<string, DataTableSavedState>();

const layoutStore = (key: string): IPersistenceEngine => ({
    load: () => ok(savedLayouts.get(key)),
    save: (state) => {
        savedLayouts.set(key, state);
        return ok(undefined);
    },
    clear: () => {
        savedLayouts.delete(key);
        return ok(undefined);
    },
});
```

Merge into createDataTable({ ... }) `[options]`:

```ts
storage: layoutStore("assets-table"),
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code; storage.

- load, save and clear are synchronous; keep a local copy and sync it to your service in the background.

Reference: `persistence`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [persistence](../persistence.md): Persistence
