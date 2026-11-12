# Data Table - CRUD - Row Lifecycle Callbacks

<!-- Automatically generated, do not edit -->

## Row Lifecycle Callbacks

**Row Callback Option**:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `onRowUpdate` | `(args: { row: TRow; changedFields: readonly (keyof TRow)[] }) => Promise<void>` | no | V B | Called after a cell edit commits. It runs once the data engine has saved the edit. To replace the engine's save, give dataStoreData or dataSourceData an updateRow. |
| `onRowDelete` | `(args: { rowIndex: GlobalRowIndex; row: TRow }) => Promise<void>` | no | V B | Accepted but not called at present. Deletes save through the data engine's removeRow and removeRows; give dataStoreData or dataSourceData your own, or run the mutation with { persist }. |
| `onRowCreate` | `(args: { row: TRow }) => Promise<void>` | no | V B | Accepted but not called at present. Inserts save through the data engine's createRow; give dataStoreData or dataSourceData your own, or run the mutation with { persist }. |

### onRowUpdate

**On Row Update Arg**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `row` | `TRow` | yes | The committed row snapshot. |
| `changedFields` | `readonly (keyof TRow)[]` | yes | Fields that changed during the edit. |

**Authored in View**:

```ts
// View
s.dataTable(dataTableOptions<BusStop>({
    onRowUpdate: { binding: "handleRowUpdate" },
}));

// ViewModel
async handleRowUpdate(args: {
    readonly row: BusStop;
    readonly changedFields: readonly (keyof BusStop)[];
}): Promise<void> {
    await ml.data.table.row.editMultiRowAsync({
        tableName: "ml_samples/Miami_Busstops",
        primaryKey: "StopID",
        columns: ["StopID", ...args.changedFields],
        multiValues: [[String(args.row.StopID), ...args.changedFields.map(f => String(args.row[f]))]],
    });
}
```

**Authored in ViewModel**:

```ts
// ViewModel
const { options } = createDataTable<BusStop>({
    onRowUpdate: async ({ row, changedFields }) => {
        await ml.data.table.row.editMultiRowAsync({
            tableName: "ml_samples/Miami_Busstops",
            primaryKey: "StopID",
            columns: ["StopID", ...changedFields],
            multiValues: [[String(row.StopID), ...changedFields.map(f => String(row[f]))]],
        });
    },
});
```

### onRowDelete

**On Row Delete Arg**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `rowIndex` | `GlobalRowIndex` | yes | Grid row index at commit time. Not called at present: onRowDelete is accepted but never invoked; delete with store.mutations.remove({ rowIndex }).run({ persist }) instead. |
| `row` | `TRow` | yes | The row snapshot being deleted. |

**Authored in View**:

```ts
// View
s.dataTable(dataTableOptions<BusStop>({
    onRowDelete: { binding: "handleRowDelete" },
}));

// ViewModel
async handleRowDelete(args: {
    readonly rowIndex: number;
    readonly row: BusStop;
}): Promise<void> {
    await ml.data.table.row.removeByQueryAsync("ml_samples/Miami_Busstops", {
        where: [[{ col: "StopID", test: "EqualAny", value: [String(args.row.StopID)] }]],
    });
}
```

**Authored in ViewModel**:

```ts
// ViewModel
const { options } = createDataTable<BusStop>({
    onRowDelete: async ({ row }) => {
        await ml.data.table.row.removeByQueryAsync("ml_samples/Miami_Busstops", {
            where: [[{ col: "StopID", test: "EqualAny", value: [String(row.StopID)] }]],
        });
    },
});
```

### onRowCreate

**On Row Create Arg**:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `row` | `TRow` | yes | The newly created row snapshot. Not called at present: onRowCreate is accepted but never invoked; add rows with store.mutations.insert({ row }).run({ persist }) instead. |

**Authored in View**:

```ts
// View
s.dataTable(dataTableOptions<BusStop>({
    onRowCreate: { binding: "handleRowCreate" },
}));

// ViewModel
async handleRowCreate(args: { readonly row: BusStop }): Promise<void> {
    await ml.data.table.row.createAsync({
        tableName: "ml_samples/Miami_Busstops",
        primaryKey: "StopID",
        columns: ["StopID", "StopName"],
        values: [String(args.row.StopID), args.row.StopName],
        create: true,
    });
}
```

**Authored in ViewModel**:

```ts
// ViewModel
const { options } = createDataTable<BusStop>({
    onRowCreate: async ({ row }) => {
        await ml.data.table.row.createAsync({
            tableName: "ml_samples/Miami_Busstops",
            primaryKey: "StopID",
            columns: ["StopID", "StopName"],
            values: [String(row.StopID), row.StopName],
            create: true,
        });
    },
});
```

## Related

- [crud-overview](crud-overview.md): CRUD - Overview and more
