# Data Table recipe - Control the table from code

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## control-the-table-from-code

**Control the table from code.** Sort, filter, refresh, select rows, or show and hide columns from ViewModel code.

Imports `[imports]`:

```ts
import { toActiveColumnIndex, toGlobalRowIndex } from "data-ui/data-table";
```

ViewModel members `[members]`:

```ts
public sortByName(): void {
    this.store?.dispatch(actions.sort({ sort: { key: "name", field: "name", direction: "asc" } }));
}

public showPumpsOnly(): void {
    this.store?.dispatch(actions.setFilter({ key: "category", filter: { field: "category", operator: "Equal", values: { value: "Pump" } } }));
}

public selectFirstRow(): void {
    this.store?.dispatch(actions.selectCell({
        selection: { coordinates: { row: toGlobalRowIndex(0), column: toActiveColumnIndex(0) }, selectionMode: "row" },
        scrollIntoView: true,
    }));
}

public hideCategory(): void {
    this.store?.dispatch(actions.setColumnVisibility({ key: "category", visible: false }));
}
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members.

- Read state with store.getState(), store.getRow(index) (rows loaded near the screen only), store.getRowsFromDataEngine({ rowIndices }) for any row, and store.getCellByKey(index, key).
- actions.selectCell records the selection and scrolls to it, but the row is drawn as selected only when the table has a selection engine: add tableSelection: dataTable.viewModel.tableSelection.overlaySelection({ type: "row" }). Without it selectFirstRow shows nothing.

Reference: `store-store-api`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [store-store-api](../store-store-api.md): Store - Store API and more
