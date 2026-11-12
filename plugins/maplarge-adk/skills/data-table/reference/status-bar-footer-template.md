# Data Table - Status Bar/Footer - Engine: footerTemplate and more

<!-- Automatically generated, do not edit -->

## Engine: `footerTemplate`

Renders your own Raptor markup into the footer. There is no row here, so the only binding paths are the ones scope declares, and they resolve against the ViewModel.

Read the scope paths from bindingPaths.scope. A template method written on the ViewModel can also bind to member names directly, as the ViewModel example does.

**Footer Template Arg**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `contentTemplate` | `InlineFooterContentTemplate \| ((footer: FooterContext) => void)` | no | V B | The markup to render. In a View, build it with inlineFooterContentTemplate(...) or name a ViewModel method with { binding }. On the ViewModel, pass the function itself. | `inlineFooterContentTemplate((footer) => { ... }, { createScriptor })` |
| `scope` | `Record<string, ViewDefinitionBinding>` | no | V | ViewModel members the template reads, exposed as bindingPaths.scope paths. An entry can name a value to bind or a method to call from an event. | `{ export: { binding: "exportVisible" } }` |

### Footer context

`FooterContext` is passed to the content template when it is built:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `s` | `IRootScriptor<TViewModel>` | yes | Scriptor for building the footer markup. |
| `bindingPaths.scope` | `Record<string, string>` | yes | Paths for the members declared in the engine's scope. Empty when no scope is declared. |

### Footer Template Example

**Example: Authored in the View**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export class ViewModel extends RaptorViewModel {
    public footerNote = "";

    public initialize(): void {
        this.footerNote = "Updated just now";
        this.update();
    }

    public exportVisible(): void {
        console.log("export");
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, inlineFooterContentTemplate, schema } from "data-ui/data-table";

import type { ViewModel } from "./view-model";

type Row = { id: number; name: string };

const rows: Row[] = [
    { id: 1, name: "alpha" },
    { id: 2, name: "beta" },
];

const gridSchema = dataTable.view.schema.createSchema({
    entries: { id: schema.number(), name: schema.string() },
});

const createScriptor = () => RSScriptor.create<ViewModel>();
const { column } = dataTable.view.defineColumns<Row, ViewModel>({ createScriptor });

const footerContent = inlineFooterContentTemplate<ViewModel, { note: never; export: never }>(
    (footer) => {
        footer.s.div({ flex: { dFlex: true, alignItemsCenter: true, gap: 2 } }).contentTemplates((s) => {
            s.span({ bindings: { text: footer.bindingPaths.scope.note } });
            s.button({
                kind: "secondary",
                size: "small",
                events: [{ event: "click", handler: footer.bindingPaths.scope.export }],
            }).contentTemplates((b) => { b.span({ text: "Export" }); });
        });
    },
    { createScriptor },
);

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocFooterTemplateView", "Footer - template (View)");
    s.view("main", (s) => {
        s.div({ height: 240 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [column({ field: "id", header: "ID" }), column({ field: "name", header: "Name" })],
                footer: dataTable.view.footer.footerTemplate({
                    contentTemplate: footerContent,
                    scope: {
                        note: { binding: "footerNote" },
                        export: { binding: "exportVisible" },
                    },
                }),
            }));
        });
    });
    return s.commitPage();
}
```

**Example: Authored in the ViewModel**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, footerTemplate, schema } from "data-ui/data-table";
import type { DataTableOptions, FooterContext } from "data-ui/data-table";

export type Row = { id: number; name: string };

const rows: Row[] = [
    { id: 1, name: "alpha" },
    { id: 2, name: "beta" },
];

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public footerNote = "Updated just now";

    public initialize(): void {
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: { id: schema.number(), name: schema.string() },
            }),
            columns: [column({ field: "id", header: "ID" }), column({ field: "name", header: "Name" })],
            footer: footerTemplate({
                contentTemplate: (footer: FooterContext): void => {
                    footer.s.div({ flex: { dFlex: true, alignItemsCenter: true, gap: 2 } }).contentTemplates((s) => {
                        s.span({ bindings: { text: "footerNote" } });
                        s.button({
                            kind: "secondary",
                            size: "small",
                            events: [{ event: "click", handler: "exportVisible" }],
                        }).contentTemplates((b) => { b.span({ text: "Export" }); });
                    });
                },
            }),
        });
        this.dataTableOptions = options;
        this.update();
    }

    public exportVisible(): void {
        console.log("export");
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";

import type { ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocFooterTemplateViewModel", "Footer - template (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 240 }).contentTemplates((s) => {
            s.dataTable({ bindings: { data: "dataTableOptions" } });
        });
    });
    return s.commitPage();
}
```

## Build a Custom Footer Engine

Implement `FooterEngine` to own the footer content region and whatever behavior goes with it:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `mount` | `(context: FooterMountContext) => void` | yes | Renders the footer content and wires its behavior. Runs again after every rebuild. |
| `unmount` | `() => void` | no | Undoes anything mount wired up, such as timers and listeners. The container itself is emptied for you. |
| `dispose` | `() => void` | no | Teardown when the table is destroyed or rebooted. Keep unmount and dispose safe to repeat. A reboot (for example after store.updateConfig changes an option that reboots the table) destroys and rebuilds the view engine, so an engine built in the ViewModel can be mounted again after dispose. |

### Mount context

`FooterMountContext` is passed to mount:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `containerEl` | `HTMLElement` | yes | The footer content region, emptied before every mount. |
| `createScriptor` | `() => IRootScriptor<unknown>` | yes | Creates a scriptor for building the content. |
| `renderView` | `(element: HTMLElement, viewDefinition: unknown) => void` | yes | Renders a committed view definition into an element. Bindings resolve against the ViewModel. |
| `store` | `DataTableStore` | yes | The table's store. The table's internal store, not the object createDataTable returns: dispatch(action), on(actionCreator, handler), selectors, getViewState() and getDataState(). on returns an unsubscribe function, and selectors include selectors.isIntegrationEnabled({ key }). It has no subscribe, getRow, getExportSource or mutations. |
| `dataEngine` | `unknown` | yes | The table's data engine. Probe it for the optional capabilities you need, such as getExportSource. |
| `testIds` | `boolean` | yes | Whether the table is emitting data-test-id attributes. |

### Register a Named Footer Engine

A ViewModel registers footer engines by name on createDataTable({ engines: { footer: { ... } } }), the same way the other engine options accept custom factories. A View then selects one by name, without holding a reference to the engine itself.

```ts
// ViewModel
import { createDataTable } from "data-ui/data-table";
import type { FooterEngine, FooterMountContext } from "data-ui/data-table";

const { options } = createDataTable<Row>({
    engines: {
        footer: {
            rowCountFooter: (args: { readonly label?: string }): FooterEngine => ({
                mount: (context: FooterMountContext) => {
                    const scriptor = context.createScriptor();
                    scriptor.span({ text: args.label ?? "Rows" });
                    context.renderView(context.containerEl, scriptor.commit());
                },
            }),
        },
    },
});
this.dataTableOptions = options;

// View
s.dataTable(dataTableOptions<Row>({
    bindings: { data: "dataTableOptions" },
    footer: dataTable.view.footer.custom("rowCountFooter", { label: "Records" }),
}));
```

## Related

- [status-bar-status-bar](status-bar-status-bar.md): Status Bar/Footer - Status Bar and more
- [types](types.md): the declarations of the types used here, `FooterContext`, `FooterEngine`, `FooterMountContext`, `StatusBarEngine`, `StatusBarRenderContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `StatusBarArgs`; search it for a name rather than reading it whole
