# Data Table recipe - Build a custom engine

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## build-a-custom-engine

**Build a custom engine.** Replace a built-in engine (status bar, footer, overlay, scrolling, slots) with your own; the status bar shown here follows the same pattern as the others.

Imports `[imports]`:

```ts
import type { StatusBarEngine } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
const assetCountStatusBar: StatusBarEngine = {
    formatStatusText: ({ totalRows }) => (totalRows === undefined ? "Counting assets..." : String(totalRows) + " assets"),
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
statusBar: assetCountStatusBar,
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: module code; statusBar.

- Every engine option accepts a built-in by name, an engine object like this one, or a factory registered under engines and picked by name.

Reference: `status-bar-status-bar`, `options-options`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [status-bar-status-bar](../status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
- [options-options](../options-options.md): Options - Options and more
