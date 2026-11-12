# Data Table - Theme - Theme Options and more

<!-- Automatically generated, do not edit -->

Theme options style structural elements and apply conditional styling to rows, columns, cells, and headers inside `s.dataTable(dataTableOptions<TRow>({ theme: { ... } }))`.

`DataTableThemeStyling` is an alias for IViewDefinition, so any visual property you can set on a Raptor scriptor element is valid in the static keys; the conditional entries accept fewer.

The conditional entries (rowThemes, columnThemes, cellThemes, headerThemes) accept only properties that become CSS classes and inline styles, so use customCssClasses for spacing and text transforms there. The static keys are container, header, headerRow, headerCell, scrollBody, row, columnSlot, cell, footer and statusBar, rendered by the full Raptor renderer. The conditional entries go through the renderer's common properties (`background`, `border`, `opacity`, `display`, `flex`, `cursor`, `customCssClasses`, `customTextColor`, `customBackgroundColor`, `customFontSize`, `styleProperties` and the like) plus fontWeight, fontStyle, textColor, textBgColor, textTruncate, textAlignment and fontSize; padding, margin, width, height, textTransform, lineHeight, textDecoration, wordBreak and textWrap are ignored there, so use customCssClasses (for example "p-1" or "text-uppercase") instead.

## Theme Options

**Theme Summary**:

| Name | Description |
| --- | --- |
| `Static Keys` | Fixed styling for structural elements (container, header, row, cell, etc.). |
| `rowThemes` | Independent, stacking row-theme rules, each authored as a callback or a declarative rule. |
| `columnThemes` | Independent, stacking column-slot theme rules, each authored as a callback or a declarative rule. |
| `cellThemes` | Per-cell theming rules scoped to columns via matchers; later entries win on conflicts. Matching entries stack in order; only a later entry's inline values (customTextColor and customBackgroundColor) override earlier ones. Class-based styling (background, fontWeight, customCssClasses) from several entries all lands as classes and the stylesheet decides, so do not count on entry order to override a background. |
| `headerThemes` | Per-header-cell theming rules. |

## Static Keys

**Static Theme Key**:

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `container` | `DataTableThemeStyling` | no | V | Outermost container element. | `{ background: "light" }` |
| `header` | `DataTableThemeStyling` | no | V | Header strip that wraps the header row. | `{ background: "light" }` |
| `headerRow` | `DataTableThemeStyling` | no | V | Header row element. | `{ background: "light" }` |
| `headerCell` | `DataTableThemeStyling` | no | V | Each header cell element. | `{ background: "light" }` |
| `scrollBody` | `DataTableThemeStyling` | no | V | Scrollable body element. | `{ background: "light" }` |
| `row` | `DataTableThemeStyling` | no | V | Each row element (base static styling; use rowThemes for conditional). | `{ background: "light" }` |
| `columnSlot` | `DataTableThemeStyling` | no | V | Each column-slot element inside a row. | `{ background: "light" }` |
| `cell` | `DataTableThemeStyling` | no | V | Each cell span inside a column slot. | `{ background: "light" }` |
| `footer` | `DataTableThemeStyling` | no | V | Footer bar element. | `{ background: "light" }` |
| `statusBar` | `DataTableThemeStyling` | no | V | Status bar element. | `{ background: "light" }` |

### Example 1: Headers, Structure

**Example: Theme Static Keys Chrome**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";

export class ViewModel extends RaptorViewModel {
    public initialize(): void {
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    dataTable,
    dataTableOptions,
    schema,
    toPixels,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

function generateRows(count: number): Row[] {
    const services = ["api-gateway", "auth-service", "payment-api", "user-service", "email-worker", "cache-proxy", "report-svc", "search-api"];
    const regions  = ["us-east", "us-west", "eu-central", "ap-south"];
    const statuses = ["healthy", "degraded", "down"] as const;
    return Array.from({ length: count }, (_, i) => ({
        service:   services[i % services.length],
        region:    regions[i % regions.length],
        latencyMs: Math.floor(Math.random() * 3501) + 500,
        status:    statuses[i % statuses.length],
    }));
}

import type { ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocThemeStaticKeysChrome", "Theme - Static Keys (chrome)");
    s.view("main", (s) => {
        s.div({ height: 380 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: generateRows(200) }),
            schema: dataTable.view.schema.createSchema({
                entries: {
                    service:   schema.string(),
                    region:    schema.string(),
                    latencyMs: schema.number(),
                    status:    schema.string(),
                },
            }),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(26) }),
                statusBar: dataTable.view.statusBar.viewportCountStatusBar(),
                columns: [
                    column({ field: "service", header: "Service", width: toPixels(160) }),
                    column({ field: "region", header: "Region", width: toPixels(120) }),
                    column({ field: "latencyMs", header: "Latency", width: toPixels(130) }),
                    column({ field: "status", header: "Status", width: toPixels(110) }),
                ],
                theme: {
                    container: { border: { rounded: 4 }, padding: { around: 3 } },
                    header: { background: "primary", padding: { around: 1 } },
                    headerRow: { customTextColor: "#fff" },
                    headerCell: { textTransform: "uppercase", fontWeight: "bold", fontSize: 4 },
                    footer: { background: "primary", border: { rounded: 4 }, padding: { around: 2 }, margin: { top: 2 } },
                    statusBar: { customTextColor: "#fff", fontWeight: "bold", textAlignment: { textCenter: true } },
                },
            }));
        });
    });
    return s.commitPage();
}
```

### Example 2: Body, Rows, Cells

**Example: Theme Static Keys Body**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    type GetRowThemeStylingContext,
    type DataTableThemeStyling,
} from "data-ui/data-table";

export class ViewModel extends RaptorViewModel {
    getRowStripeStyling({ globalRowIndex }: GetRowThemeStylingContext<object>): DataTableThemeStyling | undefined {
        return globalRowIndex % 2 === 1 ? { customBackgroundColor: "#b6d4fe" } : undefined;
    }

    public initialize(): void {
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    dataTable,
    dataTableOptions,
    schema,
    toPixels,
} from "data-ui/data-table";

export type Row = {
    service: string;
    region: string;
    latencyMs: number;
    status: "healthy" | "degraded" | "down";
};

function generateRows(count: number): Row[] {
    const services = ["api-gateway", "auth-service", "payment-api", "user-service", "email-worker", "cache-proxy", "report-svc", "search-api"];
    const regions  = ["us-east", "us-west", "eu-central", "ap-south"];
    const statuses = ["healthy", "degraded", "down"] as const;
    return Array.from({ length: count }, (_, i) => ({
        service:   services[i % services.length],
        region:    regions[i % regions.length],
        latencyMs: Math.floor(Math.random() * 3501) + 500,
        status:    statuses[i % statuses.length],
    }));
}

import type { ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocThemeStaticKeysBody", "Theme - Static Keys (body)");
    s.view("main", (s) => {
        s.div({ height: 380 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: generateRows(200) }),
            schema: dataTable.view.schema.createSchema({
                entries: {
                    service:   schema.string(),
                    region:    schema.string(),
                    latencyMs: schema.number(),
                    status:    schema.string(),
                },
            }),
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(26) }),
                columns: [
                    column({ field: "service", header: "Service", width: toPixels(160) }),
                    column({ field: "region", header: "Region", width: toPixels(120) }),
                    column({ field: "latencyMs", header: "Latency", width: toPixels(130) }),
                    column({ field: "status", header: "Status", width: toPixels(110) }),
                ],
                theme: {
                    header:     { background: "primary", customTextColor: "#fff" },
                    scrollBody: { padding: { around: 2 } },
                    row:        { customBackgroundColor: "#cfe2ff" },
                    columnSlot: { padding: { left: 3 } },
                    cell:       { customBackgroundColor: "#fff", customTextColor: "#212529", border: { rounded: 2 }, padding: { around: 1 } },
                    rowThemes: [
                        { callback: { binding: "getRowStripeStyling" } },
                    ],
                },
            }));
        });
    });
    return s.commitPage();
}
```

## Related

- [theme-dynamic-keys](theme-dynamic-keys.md): Theme - Dynamic Keys and more
- [types](types.md): the declarations of the types used here, `DataTableThemeStyling`; search it for a name rather than reading it whole
