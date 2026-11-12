# Data Table - How It Works - The Pieces and more

<!-- Automatically generated, do not edit -->

How the table turns your code into rows and cells. The recipes cover common tasks; when a request combines things no recipe shows, the rules here tell you what will work, and why the usual mistakes fail.

## The Pieces

A table in code is a ViewModel that builds the table's options and a View that places the table on the page. The table itself is a Raptor node: it draws what the options describe and keeps only view state (sort, filters, column layout, selection, the open edit), never your dataset.

```ts
ViewModel (view-model.ts)                          View (view.ts)
  createDataTable({ data, schema, columns, ... })
    returns { options, store }
  this.dataTableOptions = options  ------------->   s.dataTable(dataTableOptions({
  this.store = store                                    bindings: { data: "dataTableOptions" },
  this.update()                                       }))

the table node  ---- asks for pages of rows ---->  the data engine (arrayData, asyncData, dataStoreData, ...)
```

The View reads ViewModel members by name through bindings and runs ViewModel methods named as event handlers; an option such as transformValue: { binding: "statusLabel" } hands the method itself to the table, which calls it.

```ts
// view-model.ts
export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Asset> | null = null;
    public store: DataTableStore<Asset> | null = null;
    public summaryText = "";

    public async initialize(): Promise<void> {
        const { options, store } = createDataTable<Asset>({
            data: dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id }),
            schema: assetSchema,
            columns: [column({ field: "name", header: "Name", width: toPixels(220) })],
        });
        this.dataTableOptions = options;
        this.store = store;
        this.summaryText = String(assets.length) + " assets";
        this.update();
    }
}

// view.ts
s.view("main", (s) => {
    s.div({ heightPercentage: 100 }).contentTemplates((s) => {
        s.div({ height: 400 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Asset>({
                bindings: { data: "dataTableOptions" },
            }));
        });
        s.div({ margin: { top: 2 }, bindings: { text: "summaryText" } });
    });
});
```

## Where Rows Live

The table asks the data engine for pages of rows by position (start, count) and keeps the pages it has loaded (up to 50 pages of 50 rows by default, dropping the oldest beyond that), so a large dataset is never held whole.

```ts
arrayData({ data, getRowId })     rows held in code. Copies your array once, keeps your row objects,
                                  sorts, filters and applies constraints in the browser.
asyncData({ fetchRows, ... })     rows from your own async function. Calls fetchRows({ start, count, sort, filter })
                                  for each page and needs { rows, totalSize } back.
dataStoreData / dataSourceData    rows from a MapLarge table. The server sorts, filters and pages.
```

arrayData copies your list once:

```ts
const engine = dataTable.viewModel.data.arrayData({ data: assets, getRowId: (asset) => asset.id });

assets.push(newAsset);                                   // not shown: the engine copied the list
await this.store?.mutations.insert({ row: newAsset }).run();   // shown, and kept in the engine's copy
```

asyncData asks for another page only while start + rows.length is less than totalSize:

```ts
data: dataTable.viewModel.data.asyncData<Asset>({
    fetchRows: async ({ start, count, sort, filter }) => {
        const rows = await fetchAssetPage(start, count, sort, filter);
        return { rows, totalSize: rows.length === count ? start + rows.length + 1 : start + rows.length };
    },
    defaultPageSize: 25,
    filterCapabilities: { operators: ["Equal", "Contains", "Greater", "Less"] },
}),
```

Your own copy changes in the same function as the table's rows:

```ts
private uploads: Upload[] = [...startingUploads];   // the timer works from this copy

public readonly retry = (ctx: RowActionContext): void => {
    const restarted: Upload = { ...ctx.row, status: "Queued", progress: 0 };
    this.uploads = this.uploads.map((upload) => (upload.id === restarted.id ? restarted : upload));   // the copy
    void this.store?.mutations.update({ rowIndex: ctx.globalRowIndex, row: restarted, fields: ["status", "progress"] }).run();   // the table
};
```

- Keep one source of truth. A Retry that updates the table but not the timer's copy shows Queued while the timer, working from its copy, never starts the upload again.

## Related

- [how-it-works-from-field-to-cell](how-it-works-from-field-to-cell.md): How It Works - From Field to Cell
- [how-it-works-cell-templates](how-it-works-cell-templates.md): How It Works - Cell Templates
- [how-it-works-bindings-and-events](how-it-works-bindings-and-events.md): How It Works - Bindings and Events
- [how-it-works-sorting-filtering-and-constraints](how-it-works-sorting-filtering-and-constraints.md): How It Works - Sorting, Filtering and Constraints
- [how-it-works-changing-rows](how-it-works-changing-rows.md): How It Works - Changing Rows
- [how-it-works-dates-and-numbers](how-it-works-dates-and-numbers.md): How It Works - Dates and Numbers
- [how-it-works-when-no-recipe-fits](how-it-works-when-no-recipe-fits.md): How It Works - When No Recipe Fits
