# Data Table - Status Bar/Footer - Status Bar and more

<!-- Automatically generated, do not edit -->

The two regions along the bottom of the table. The status bar reports on the data; the footer holds controls that act on it.

(Figure: The status bar on the left of the footer row, and the footer toolbar on the right.)

## Status Bar

Shows the visible row range and total count. A StatusBarEngine controls the text and, optionally, the markup.

## Status Bar Engines

**Status Bar Engine Summary**:

| Name | Description | Inputs |
| --- | --- | --- |
| `viewportCountStatusBar` | (default) Shows visible row range and total count. | Pass `statusBar: dataTable.view.statusBar.viewportCountStatusBar({... })` on s.dataTable({... }) (or omit for the default). |

## Engine: `viewportCountStatusBar`

Shows the visible row range and total row count. Pass formatStatusText to replace the entire displayed string, or showDataFreshness to also report how current the source is.

| Property | Type | Required | Arms | Description |
| --- | --- | --- | --- | --- |
| `formatStatusText` | `(args: StatusBarArgs) => string` | no | V B | Returns the full string displayed in the status bar. Receives firstVisible, lastVisible, totalRows, and loadedRows. When omitted, defaults to "Showing: 1 - 25 of 141,928 rows". The default shows "Showing: 1 - 25" while totalRows is undefined, and "Showing: 0 rows" when totalRows is 0. |
| `showDataFreshness` | `boolean` | no | V B | Reports how current the data is, beside the row count. |
| `freshness` | `() => DataFreshness \| null` | no | V B | Supplies the refresh state instead of reading it off the data engine. |
| `freshnessContentTemplates` | `InlineFreshnessReadout \| ((context: FreshnessTemplateContext) => void)` | no | V B | Replaces the readout's markup. Call statusText() where the status line belongs, and icon() for the default clock. In a View, build it with inlineFreshnessReadout(...); on the ViewModel, pass the function itself. |
| `freshnessTickMs` | `number` | no | V B | How often the readout re-reads the source. Defaults to 1000. |

Examples for `formatStatusText`:

Value (V):

```ts
// ViewModel
statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
    formatStatusText: ({ firstVisible, lastVisible, totalRows }) =>
        `Rows ${firstVisible + 1}-${lastVisible + 1} of ${totalRows?.toLocaleString() ?? "?"}`,
}),
```

Binding (B):

```ts
statusBar: {
    formatStatusText: { binding: "customStatusText" },
},
```

Examples for `freshness`:

Value (V):

```ts
// ViewModel
statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
    showDataFreshness: true,
    freshness: () => ({
        sourceName: "busstops",
        mode: "throttle",
        intervalMs: 30000,
        lastRefreshedAt: this.lastLoadedAt,
        nextRefreshAt: this.lastLoadedAt + 30000,
    }),
}),
```

Binding (B):

```ts
statusBar: {
    engine: dataTable.view.statusBar.viewportCountStatusBar({
        showDataFreshness: true,
        freshness: { binding: "gridFreshness" },
    }),
},
```

Examples for `freshnessContentTemplates`:

Value (V):

```ts
// ViewModel
statusBar: dataTable.viewModel.statusBar.viewportCountStatusBar({
    showDataFreshness: true,
    freshnessContentTemplates: ({ s, statusText, icon }) => {
        s.span({ text: "Feed:" });
        icon();
        statusText();
    },
}),
```

Binding (B):

```ts
statusBar: {
    engine: dataTable.view.statusBar.viewportCountStatusBar({
        showDataFreshness: true,
        freshnessContentTemplates: { binding: "freshnessLayout" },
    }),
},
```

### Data Freshness

With showDataFreshness, the status bar also reports how current the source is. The source owns that state; the table reads it and words it.

The readout shows when mode is "throttle" or "manual", or when mode is "auto" (the default) and isEphemeral is true ("Live"). A source in "auto" mode that is not updating rapidly shows no readout, even when freshness returns a lastRefreshedAt.

Supported automatically on dataSourceData and dataStoreData, for any source a DataStore is tracking. Other data engines require freshness. Without it, the readout stays hidden.

Pass freshness to supply the state yourself, and freshnessContentTemplates to change the readout's markup.

A template alone does not make the readout appear without a freshness source.

`DataFreshness` is the state the source reports:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `"auto" \| "throttle" \| "manual"` | no | How the source refreshes: on its own, on an interval, or only when asked. |
| `isEphemeral` | `boolean` | no | True when the source is updating rapidly enough to count as live. |
| `lastRefreshedAt` | `number \| null` | yes | Epoch ms of the last refresh, or null when the source has never refreshed. |
| `ratePerMin` | `number \| null` | no | Observed updates per minute, reported once a DataStore is tracking the source's update rate. |
| `intervalMs` | `number \| null` | no | Refresh interval the source is honoring, when it refreshes on a schedule. |
| `nextRefreshAt` | `number \| null` | no | Epoch ms of the next scheduled refresh. |
| `sourceName` | `string \| null` | no | The source's name, used to say which source is updating. |

### Data Freshness Example

**Example: Authored in the View**:

view-model.ts:

```ts
import { RSScriptor } from "index";
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { dataTable } from "data-ui/data-table";
import type { DataFreshness, InlineFreshnessReadout } from "data-ui/data-table";

export type Row = { StopID: number; StopName: string; MUNIC_NAME: string };

export type FreshnessDemo = "live" | "throttled" | "manual" | "idle";

const createScriptor = () => RSScriptor.create<ViewModel>();

const defaultLayout = dataTable.view.statusBar.inlineFreshnessReadout(({ statusText, icon }) => {
    icon();
    statusText();
}, { createScriptor });

const customLayout = dataTable.view.statusBar.inlineFreshnessReadout(({ s, statusText, icon }) => {
    s.div({
        flex: { dFlex: true, alignItemsCenter: true, gap: 2 },
        background: "body-tertiary",
        border: { rounded: "pill" },
        padding: { top: 1, bottom: 1, x: 2 },
    }).contentTemplates(() => {
        s.span({ text: "Feed:" });
        icon();
        statusText();
    });
}, { createScriptor });

export class ViewModel extends DynamicViewModel {
    // bound by the View; swapping it updates the option like any other config change
    public freshnessLayout: InlineFreshnessReadout = defaultLayout;

    // bound to each button's disabled state
    public get defaultActive(): boolean { return this.freshnessLayout === defaultLayout; }

    public get customActive(): boolean { return this.freshnessLayout === customLayout; }

    public freshnessDemo: FreshnessDemo = "throttled";

    public get liveActive(): boolean { return this.freshnessDemo === "live"; }

    public get throttledActive(): boolean { return this.freshnessDemo === "throttled"; }

    public get manualActive(): boolean { return this.freshnessDemo === "manual"; }

    public get idleActive(): boolean { return this.freshnessDemo === "idle"; }

    private refreshedAt = Date.now();

    public initialize(): void {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });
        this.update();
    }

    // the real state comes off the data engine; this stands in so every wording is reachable
    public gridFreshness(): DataFreshness {
        const sourceName = "busstops";
        const lastRefreshedAt = this.refreshedAt;
        switch (this.freshnessDemo) {
            case "live":
                return { sourceName, mode: "auto", isEphemeral: true, lastRefreshedAt };
            case "throttled": {
                // roll forward on the interval, or the countdown freezes once the first tick passes
                const intervalMs = 30000;
                const tickedAt = this.refreshedAt + Math.floor((Date.now() - this.refreshedAt) / intervalMs) * intervalMs;
                return { sourceName, mode: "throttle", intervalMs, lastRefreshedAt: tickedAt, nextRefreshAt: tickedAt + intervalMs };
            }
            case "manual":
                return { sourceName, mode: "manual", lastRefreshedAt };
            default:
                return { sourceName, mode: "auto", isEphemeral: false, lastRefreshedAt };
        }
    }

    public showLive(): void { this.setDemo("live"); }
    public showThrottled(): void { this.setDemo("throttled"); }
    public showManual(): void { this.setDemo("manual"); }
    public showIdle(): void { this.setDemo("idle"); }

    // what a manual refresh does to the readout: the age resets and starts climbing again
    public refreshNow(): void {
        this.refreshedAt = Date.now();
        this.update();
    }

    private setDemo(demo: FreshnessDemo): void {
        this.freshnessDemo = demo;
        this.refreshedAt = Date.now();
        this.update();
    }

    public showDefaultLayout(): void {
        this.freshnessLayout = defaultLayout;
        this.update();
    }

    public showCustomLayout(): void {
        this.freshnessLayout = customLayout;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, schema } from "data-ui/data-table";

import type { Row, ViewModel } from "./view-model";

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        StopID: schema.number(),
        StopName: schema.string(),
        MUNIC_NAME: schema.string(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();
const columns = [
    column({ field: "StopID", header: "Stop ID" }),
    column({ field: "StopName", header: "Stop Name" }),
    column({ field: "MUNIC_NAME", header: "Municipality" }),
];

const modeButtons = [
    { text: "Default layout", handler: "showDefaultLayout", activeBinding: "defaultActive" },
    { text: "Custom layout", handler: "showCustomLayout", activeBinding: "customActive" },
];

const stateButtons = [
    { text: "Live", handler: "showLive", activeBinding: "liveActive" },
    { text: "Every 30s", handler: "showThrottled", activeBinding: "throttledActive" },
    { text: "On demand", handler: "showManual", activeBinding: "manualActive" },
    { text: "Idle (readout hides)", handler: "showIdle", activeBinding: "idleActive" },
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocFreshnessView", "Data freshness (View)");

    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            s.div({ height: 320 }).contentTemplates((s) => {
                s.dataTable(dataTableOptions<Row>({
                    data: dataTable.view.data.dataStoreData({ dataStore: { binding: "dataStore" }, dataSourceName: "busstops" }),
                    schema: gridSchema,
                    columns,
                    statusBar: dataTable.view.statusBar.viewportCountStatusBar({
                        showDataFreshness: true,
                        freshness: { binding: "gridFreshness" },
                        freshnessContentTemplates: { binding: "freshnessLayout" },
                    }),
                }));
            });
            s.div({ flex: { dFlex: true, flexWrap: true, gap: 2 }, margin: { top: 2 } }).contentTemplates((bar) => {
                modeButtons.forEach(({ text, handler, activeBinding }) => {
                    bar.button({
                        kind: "secondary",
                        size: "small",
                        bindings: { disable: activeBinding },
                        events: [{ event: "click", handler }],
                    }).contentTemplates((b) => { b.span({ text }); });
                });
            });
            s.div({ flex: { dFlex: true, flexWrap: true, gap: 2 }, margin: { top: 2 } }).contentTemplates((bar) => {
                stateButtons.forEach(({ text, handler, activeBinding }) => {
                    bar.button({
                        kind: "secondary",
                        size: "small",
                        bindings: { disable: activeBinding },
                        events: [{ event: "click", handler }],
                    }).contentTemplates((b) => { b.span({ text }); });
                });
                bar.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "refreshNow" }] })
                    .contentTemplates((b) => { b.span({ text: "Refresh now" }); });
            });
        });
    });
    return s.commitPage();
}
```

**Example: Authored in the ViewModel**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, schema, viewportCountStatusBar } from "data-ui/data-table";
import type { DataFreshness, DataTableOptions, DataTableStore, FreshnessTemplateContext } from "data-ui/data-table";

export type FreshnessMode = "default" | "custom";

export type FreshnessDemo = "live" | "throttled" | "manual" | "idle";

export type Row = { StopID: number; StopName: string; MUNIC_NAME: string };

export class ViewModel extends DynamicViewModel {
    public dataTableOptions: DataTableOptions<Row> | null = null;

    public mode: FreshnessMode = "default";

    // bound to each button's disabled state
    public get defaultActive(): boolean { return this.mode === "default"; }

    public get customActive(): boolean { return this.mode === "custom"; }

    public freshnessDemo: FreshnessDemo = "throttled";

    public get liveActive(): boolean { return this.freshnessDemo === "live"; }

    public get throttledActive(): boolean { return this.freshnessDemo === "throttled"; }

    public get manualActive(): boolean { return this.freshnessDemo === "manual"; }

    public get idleActive(): boolean { return this.freshnessDemo === "idle"; }

    private store: DataTableStore<Row> | null = null;

    private refreshedAt = Date.now();

    public initialize(): void {
        this.dataStore.register({ name: "busstops", dataSource: "ml_samples/Miami_Busstops" });

        const { column } = dataTable.viewModel.defineColumns<Row>();
        const { options, store } = createDataTable<Row>({
            data: dataTable.viewModel.data.dataStoreData({ dataStore: this.dataStore, dataSourceName: "busstops" }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    StopID: schema.number(),
                    StopName: schema.string(),
                    MUNIC_NAME: schema.string(),
                },
            }),
            columns: [
                column({ field: "StopID", header: "Stop ID" }),
                column({ field: "StopName", header: "Stop Name" }),
                column({ field: "MUNIC_NAME", header: "Municipality" }),
            ],
            statusBar: this.buildStatusBar(),
        });

        this.dataTableOptions = options;
        this.store = store;
        this.update();
    }

    // the real state comes off the data engine; this stands in so every wording is reachable
    private gridFreshness(): DataFreshness {
        const sourceName = "busstops";
        const lastRefreshedAt = this.refreshedAt;
        switch (this.freshnessDemo) {
            case "live":
                return { sourceName, mode: "auto", isEphemeral: true, lastRefreshedAt };
            case "throttled": {
                // roll forward on the interval, or the countdown freezes once the first tick passes
                const intervalMs = 30000;
                const tickedAt = this.refreshedAt + Math.floor((Date.now() - this.refreshedAt) / intervalMs) * intervalMs;
                return { sourceName, mode: "throttle", intervalMs, lastRefreshedAt: tickedAt, nextRefreshAt: tickedAt + intervalMs };
            }
            case "manual":
                return { sourceName, mode: "manual", lastRefreshedAt };
            default:
                return { sourceName, mode: "auto", isEphemeral: false, lastRefreshedAt };
        }
    }

    public showLive(): void { this.setDemo("live"); }
    public showThrottled(): void { this.setDemo("throttled"); }
    public showManual(): void { this.setDemo("manual"); }
    public showIdle(): void { this.setDemo("idle"); }

    // what a manual refresh does to the readout: the age resets and starts climbing again
    public refreshNow(): void {
        this.refreshedAt = Date.now();
        this.update();
    }

    private setDemo(demo: FreshnessDemo): void {
        this.freshnessDemo = demo;
        this.refreshedAt = Date.now();
        this.update();
    }

    private buildStatusBar(freshnessContentTemplates?: (context: FreshnessTemplateContext) => void) {
        return viewportCountStatusBar({
            showDataFreshness: true,
            freshness: () => this.gridFreshness(),
            freshnessContentTemplates,
        });
    }

    // statusBar reboots the table, so the new engine remounts the readout with the new markup
    public showDefaultLayout(): void {
        this.mode = "default";
        this.store?.updateConfig({ statusBar: this.buildStatusBar() });
        this.update();
    }

    public showCustomLayout(): void {
        this.mode = "custom";
        this.store?.updateConfig({
            statusBar: this.buildStatusBar(({ s, statusText, icon }) => {
                s.div({
                    flex: { dFlex: true, alignItemsCenter: true, gap: 2 },
                    background: "body-tertiary",
                    border: { rounded: "pill" },
                    padding: { top: 1, bottom: 1, x: 2 },
                }).contentTemplates(() => {
                    s.span({ text: "Feed:" });
                    icon();
                    statusText();
                });
            }),
        });
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";

import type { ViewModel } from "./view-model";

const modeButtons = [
    { text: "Default layout", handler: "showDefaultLayout", activeBinding: "defaultActive" },
    { text: "Custom layout", handler: "showCustomLayout", activeBinding: "customActive" },
];

const stateButtons = [
    { text: "Live", handler: "showLive", activeBinding: "liveActive" },
    { text: "Every 30s", handler: "showThrottled", activeBinding: "throttledActive" },
    { text: "On demand", handler: "showManual", activeBinding: "manualActive" },
    { text: "Idle (readout hides)", handler: "showIdle", activeBinding: "idleActive" },
];

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocFreshnessViewModel", "Data freshness (ViewModel)");
    s.view("main", (s) => {
        s.div().contentTemplates((s) => {
            s.div({ height: 320 }).contentTemplates((s) => {
                s.dataTable({ bindings: { data: "dataTableOptions" } });
            });
            s.div({ flex: { dFlex: true, flexWrap: true, gap: 2 }, margin: { top: 2 } }).contentTemplates((bar) => {
                modeButtons.forEach(({ text, handler, activeBinding }) => {
                    bar.button({
                        kind: "secondary",
                        size: "small",
                        bindings: { disable: activeBinding },
                        events: [{ event: "click", handler }],
                    }).contentTemplates((b) => { b.span({ text }); });
                });
            });
            s.div({ flex: { dFlex: true, flexWrap: true, gap: 2 }, margin: { top: 2 } }).contentTemplates((bar) => {
                stateButtons.forEach(({ text, handler, activeBinding }) => {
                    bar.button({
                        kind: "secondary",
                        size: "small",
                        bindings: { disable: activeBinding },
                        events: [{ event: "click", handler }],
                    }).contentTemplates((b) => { b.span({ text }); });
                });
                bar.button({ kind: "secondary", size: "small", events: [{ event: "click", handler: "refreshNow" }] })
                    .contentTemplates((b) => { b.span({ text: "Refresh now" }); });
            });
        });
    });
    return s.commitPage();
}
```

### Status bar args

`StatusBarArgs` is passed to formatStatusText on every scroll and segment load.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `firstVisible` | `number` | yes | Zero-based index of the first row currently visible in the viewport. Both firstVisible and lastVisible are 0 when the table has no rows, so a custom formatStatusText checks totalRows === 0 first. |
| `lastVisible` | `number` | yes | Zero-based index of the last row currently visible in the viewport. |
| `totalRows` | `number \| undefined` | yes | Total row count reported by the data engine. undefined when the total is not yet known (e.g. during initial infinite scroll load). |
| `loadedRows` | `number` | yes | Number of rows currently loaded in the segment cache. |

## Related

- [status-bar-build-a-custom-status-bar-engine](status-bar-build-a-custom-status-bar-engine.md): Status Bar/Footer - Build a Custom Status Bar Engine and more
- [status-bar-footer-template](status-bar-footer-template.md): Status Bar/Footer - Engine: footerTemplate and more
- [types](types.md): the declarations of the types used here, `StatusBarArgs`, `DataFreshness`, `FreshnessTemplateContext`; search it for a name rather than reading it whole
