# Data Table - View and ViewModel

<!-- Automatically generated, do not edit -->

A table's options can be written in the ViewModel with createDataTable, or in the View with s.dataTable. The two take the same options, so converting between them is a handful of mechanical swaps.

## The Same Table Both Ways

Written in the ViewModel, the options are built there and the view only binds them. createDataTable\<TRow>(options) returns { options, store }: options is a DataTableOptions\<TRow>, an opaque object to keep on a ViewModel member and bind from the view, and store is the DataTableStore\<TRow> for actions and state.

```ts
// view-model.ts
const { column } = dataTable.viewModel.defineColumns<Asset>();

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;

    public async initialize(): Promise<void> {
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.dataStoreData<Asset>({ dataStore: this.dataStore, dataSourceName: "assets" }),
            schema: assetSchema,
            columns: [
                column({ field: "status", transformValue: ({ value }) => statusLabels[value] ?? value }),
            ],
        });
        this.dataTableOptions = options;
        this.update();
    }
}

// view.ts
s.dataTable(dataTableOptions<Asset>({
    bindings: { data: "dataTableOptions" },
}));
```

Written in the View, the options live in the view and name ViewModel members with bindings:

```ts
// view-model.ts
export class ViewModel extends DynamicViewModel {
    public statusLabel(ctx: { readonly value: string }): string {
        return statusLabels[ctx.value] ?? ctx.value;
    }
}

// view.ts
const { column } = dataTable.view.defineColumns<Asset, ViewModel>();

s.dataTable(dataTableOptions<Asset>({
    data: dataTable.view.data.dataStoreData({ dataStore: { binding: "dataStore" }, dataSourceName: "assets" }),
    schema: dataTable.view.schema.createSchema({ entries: { status: schema.string() } }),
    columns: [
        column({ field: "status", transformValue: { binding: "statusLabel" } }),
    ],
}));
```

## Conversion Rules

Each ViewModel form on the left has the View form on the right:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `createDataTable<Row>({ ... })` | `s.dataTable(dataTableOptions<Row>({ ... }))` | no | Where the options are written. The ViewModel keeps the returned options on a property, and the view binds to it with bindings: { data: "\<property>" }. |
| `dataTable.viewModel.<group>.<name>(args)` | `dataTable.view.<group>.<name>(args)` | no | Engine builders sit in the same groups on both sides, almost always under the same name; selection is the exception (overlaySelection({ type: "row" }) in the ViewModel, tableSelection.row() in the View). The ViewModel version builds the engine; the View version builds a { strategy, args } reference to it. |
| `dataTable.viewModel.defineColumns<Row>()` | `dataTable.view.defineColumns<Row, ViewModel>()` | no | The View version also takes the ViewModel type, so bindings to its members are checked. |
| `this.member, or a function` | `{ binding: "member" }` | no | Any value the ViewModel passes directly, such as this.dataStore or a callback, is named with a binding in the View. Callbacks become ViewModel methods. |
| `contentTemplates: (ctx) => { ... }` | `contentTemplates: { binding: "renderCell" }` | no | A cell template function moves to a ViewModel method with the same signature, or to inlineContentTemplates in the View. |
| `{ where, applyValue }` | `{ where, applyValue }` | no | Declarative rules are plain data and read the same on both sides. |

## ViewModel Only

These have no View form, so a table that uses them is written in the ViewModel:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `store` | `DataTableStore` | no | dispatch, subscribe, mutations and row access come from createDataTable's store, so anything that drives or watches the table from code needs the ViewModel side. |
| `formatters` | `Record<string, FormatterEntry>` | no | Custom formatters registered by name. |
| `cellEditors` | `Record<string, CellEditorRegistration>` | no | Custom cell editors registered by name. |
| `columnTypeDefinitions` | `Record<string, ColumnTypeFactory>` | no | Custom column types. |
| `descriptors` | `ColumnDescriptors<Row>` | no | Descriptor-driven schema and columns, and descriptorAdapter. |
| `engines` | `Record<string, Record<string, factory>>` | no | Custom engine factories registered by name, which a View can then select by name. |

## Mixing the Two

A view can bind ViewModel-built options and still add its own columns on the same node, for example columns whose cell templates bind to ViewModel methods.

View options are plain data, so they are also how a table is written in view definition JSON; see the View Definition JSON page.

## Related

- [types](types.md): the declarations of the types used here, `DataTableStore`, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `FilterExpression`, `EditTrigger`, `CellEditorInitContext`, `SelectionState`, `RowMutationsFactory`, `ColumnDescriptors`, `ColumnDescriptor`, `ColumnBase`, `InlineContentTemplates`, `ColumnEditConfig`, `EditTransformContext`, `DeclarativeRule`, `FormatterArgs`, `CellContext`; search it for a name rather than reading it whole
