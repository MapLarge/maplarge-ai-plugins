# Data Table - Overlays - Register a Named Overlay Engine

<!-- Automatically generated, do not edit -->

## Register a Named Overlay Engine

An overlay engine carries a render callback, so it must be built in the ViewModel. Register the factory by name on createDataTable({ engines: { overlays: { ... } } }) and select it from the View with dataTable.view.overlays.custom("name", args).

**Example: Custom Overlay Engine**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { actions, createDataTable, dataTable, schema } from "data-ui/data-table";
import type { DataTableOptions, DataTableStore, OverlayEngine } from "data-ui/data-table";

export type Row = { readonly id: number; readonly status: string };

const rows: Row[] = [
    { id: 1, status: "active" },
    { id: 2, status: "pending" },
    { id: 3, status: "disabled" },
];

// a custom engine is a plain object with a render callback, so it must live here
const bannerOverlay = (args: { message?: string }): OverlayEngine => ({
    type: "template",
    coverage: "full",
    contentTemplates: () => {},
    render: ({ scriptor }) => {
        scriptor.div({ flex: { dFlex: true, flexColumn: true, alignItemsCenter: true, gap: 2 }, padding: { around: 3 } }).contentTemplates((box) => {
            box.span({ text: args.message ?? "Working...", fontWeight: "bold" });
            box.span({ text: "custom overlay engine", fontSize: "small", customCssClasses: "text-body-secondary" });
        });
    },
});

export class ViewModel extends RaptorViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;
    public dataTableStore: DataTableStore<Row> | null = null;

    public initialize(): void {
        // register the factory by name; the View selects it with overlays.custom("banner", { ... })
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    status: schema.string(),
                },
            }),
            engines: {
                overlays: { banner: (args: { message?: string }) => bannerOverlay(args) },
            },
        });
        this.dataTableOptions = options;
        this.dataTableStore = store;
        this.update();
    }

    public showBanner(): void {
        this.dataTableStore?.dispatch(actions.showOverlay({ overlayType: "loading" }));
    }

    public hideBanner(): void {
        this.dataTableStore?.dispatch(actions.hideOverlay({ overlayType: "loading" }));
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("OverlaysDocCustomEngine", "Custom Overlay Engine");
    s.view("main", (s) => {
        s.div({ height: 320 }).contentTemplates((s) => {
            s.div({ height: 240 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    bindings: { data: "dataTableOptions" },
                    columns: [
                        column({ field: "id", header: "Id" }),
                        column({ field: "status", header: "Status" }),
                    ],
                    overlays: {
                        // select the registered engine by name; the ref stays serializable
                        loading: dataTable.view.overlays.custom("banner", { message: "Refreshing rows" }),
                    },
                }));
            });
            s.div({ margin: { top: 2 } }).contentTemplates((buttons) => {
                buttons.button({ text: "Show", kind: "primary", events: [{ event: "click", handler: "showBanner" }] });
                buttons.button({ text: "Hide", kind: "secondary", margin: { left: 1 }, events: [{ event: "click", handler: "hideBanner" }] });
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [overlays-overlay-engines](overlays-overlay-engines.md): Overlays - Overlay Engines and more
