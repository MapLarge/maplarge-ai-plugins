# Data Table recipe - Build a custom filter control

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## build-a-custom-filter-control

**Build a custom filter control.** Replace the filter input for a column type with your own control.

Imports `[imports]`:

```ts
import type { FilterControl, FilterControlRenderContext } from "data-ui/data-table";
```

Module scope `[module]`:

```ts
const percentControl: FilterControl = {
    type: "Percent",
    seed: ({ key, placeholder, activeValues }) => ({
        key,
        placeholder,
        inputType: "Percent",
        value: activeValues?.value === undefined ? "" : String(Number(activeValues.value) * 100),
    }),
    render: ({ s }: FilterControlRenderContext) => {
        s.div({ customCssClasses: "input-group" }).contentTemplates((group) => {
            group.input({ bindings: { value: "value" } });
            group.span({ customCssClasses: "input-group-text", text: "%" });
        });
    },
    resolveValues: ({ slot }) => {
        const text = String(slot.value ?? "");
        return text === "" ? undefined : { value: Number(text) / 100 };
    },
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
filtering: dataTable.viewModel.filtering.dialogFiltering(),
filterControls: [{ columnType: "number", operators: ["Greater", "Less"], control: percentControl }],
columns: [
    column({ field: "utilization", header: "Utilization", formatter: "percent", filtering: true }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "filtering": { "strategy": "dialogFiltering" },
  "columns": [
    {
      "field": "utilization",
      "header": "Utilization",
      "formatter": "percent",
      "filtering": true,
      "key": "utilization"
    }
  ]
}
```

Code only, not in the JSON form: module code; filterControls[0] (its control is code).

Reference: `filtering-column-filter-configuration`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [filtering-column-filter-configuration](../filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
