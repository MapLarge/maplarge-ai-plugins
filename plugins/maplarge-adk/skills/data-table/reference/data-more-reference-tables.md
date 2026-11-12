# Data Table - Data - More reference tables

<!-- Automatically generated, do not edit -->

## More reference tables

**Data Engine Injectable Pipeline**:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `stringify` | `(value: unknown) => string` | no | V B | Injectable hash function used to detect no-op sort/filter re-queries. Defaults to ml.util.orderedStringify. |
| `getPrimaryKeyColumn` | `(ds: ml.data.IDataSource) => { readonly name: string } \| undefined` | no | V B | Injectable primary key lookup. Defaults to ml.data.dataSource.getPrimaryKeyColumn. |
| `queryDistinctValues` | `(ds: ml.data.IDataSource, field: string) => Promise<readonly unknown[]>` | no | V B | Injectable distinct-values query. Defaults to an ml.query() groupby chain. |

**Data Engine Simple Persistence**:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `updateRow` | `(args: { readonly row: TRow; readonly changedFields: readonly (keyof TRow)[]; }) => Promise<Outcome<void, unknown>>` | no | V B | Row update handler. |
| `removeRow` | `(args: { readonly rowIndex: GlobalRowIndex; readonly row?: TRow; }) => Promise<Outcome<void, unknown>>` | no | V B | Row delete handler. |
| `createRow` | `(args: { readonly row: TRow; readonly atIndex?: GlobalRowIndex; }) => Promise<Outcome<void, unknown>>` | no | V B | Row creation handler. |

**Data Engine Persistence Option**:

| Property | Type | Required | Default | Arms | Description |
| --- | --- | --- | --- | --- | --- |
| `editable` | `boolean` | no | `true` | V B | When true (default), wires createRow, updateRow, and removeRow to MapLarge table APIs for backed data sources. Set false to omit default persistence handlers. It also wires removeRows when the table has a primary key; false saves nothing to the table. Either way the table is read-only in the UI unless the table's editable or a column's editing is set. |
| `createRow` | `(args: { readonly row: TRow; readonly atIndex?: GlobalRowIndex; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom row creation handler. Replaces the engine's entire default createRow pipeline when provided. When omitted and editable is true, the engine builds the payload and calls createRowImpl (defaults to ml.data.table.row.create). |
| `updateRow` | `(args: { readonly row: TRow; readonly changedFields: readonly (keyof TRow)[]; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom row update handler. Replaces the engine's entire default updateRow pipeline when provided. When omitted and editable is true, the engine builds the payload and calls updateRowImpl (PK mode) or updateRowByIdImpl (rowId mode). |
| `removeRow` | `(args: { readonly rowIndex: GlobalRowIndex; readonly row?: TRow; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom single-row delete handler. Replaces the engine's entire default removeRow pipeline when provided. When omitted and editable is true, the engine calls removeRowImpl (PK mode) or removeRowByIndexImpl (rowId mode). |
| `removeRows` | `(args: { readonly rowIndices: readonly GlobalRowIndex[]; readonly rows: readonly TRow[]; }) => Promise<Outcome<void, unknown>>` | no | - | V B | Custom bulk-delete handler. Replaces the engine's entire default removeRows pipeline when provided. When omitted and editable is true (PK mode only), the engine issues a single removeRowImpl call with all PK values. Not available in rowId mode. |

**Data Engine Persistence Impl Option**:

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `createRowImpl` | `(data: ml.data.table.iRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | V B | Low-level hook for the default createRow path. Swap the underlying table API call while keeping the engine's row-to-payload mapping. Defaults to ml.data.table.row.create. |
| `updateRowImpl` | `(data: ml.data.table.iMultiRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | V B | Low-level hook for the default updateRow path when rowIdentity is primaryKey. Defaults to ml.data.table.row.editMultiRow. |
| `updateRowByIdImpl` | `(data: ml.data.table.iRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | V B | Low-level hook for the default updateRow path when rowIdentity is rowId. Defaults to a SQL update keyed on the row's MapLargeRowID. |
| `removeRowImpl` | `(tableName: string, query: { where: ml.data.query.IQueryWhere[][] }, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | V B | Low-level hook for the default removeRow/removeRows path when rowIdentity is primaryKey. Defaults to ml.data.table.row.removeByQuery. |
| `removeRowByIndexImpl` | `(data: ml.data.table.iRowData, cb: (error: ml.data.api.ApiError \| null) => void) => void` | no | V B | Low-level hook for the default removeRow path when rowIdentity is rowId. Defaults to a SQL delete keyed on the row's MapLargeRowID. |
| `rowIdentity` | `"primaryKey" \| "rowId"` | no | V B | Controls which low-level update/remove hooks the default handlers use. primaryKey (default when a PK column exists) uses updateRowImpl/removeRowImpl. rowId uses updateRowByIdImpl/removeRowByIndexImpl for tables without a primary key. |

## Related

- [data-data-engines](data-data-engines.md): Data - Data Engines and more
- [types](types.md): the declarations of the types used here, `IPersistenceEngine`, `DataTableSavedState`, `FilterExpression`; search it for a name rather than reading it whole
