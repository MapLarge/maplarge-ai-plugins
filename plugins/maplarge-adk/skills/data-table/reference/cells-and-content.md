# Data Table - Cell Values

<!-- Automatically generated, do not edit -->

Control cell display with formatters, transformValue, and contentTemplates on column definitions.

## Value Pipeline

A cell's value passes through these steps in order:

- The raw value is the row's field (rawValue in a cell template).
- Units: a column with unitInfo converts the raw value to its display unit first.
- transformValue, when set, turns the value or the whole row into anything: text, a number, or an object for a template. On a column with unitInfo return text or a number: the unit label is appended as text, so an object would show as [object Object] and the unit.
- formatter, when set, formats the result of transformValue, or the raw value when there is no transformValue.
- The result is displayValue. Without contentTemplates the cell shows it as text; a template binds to bindingPaths.displayValue and bindingPaths.rawValue.

Each column type adds a default formatter and alignment: number columns get the number formatter (thousands separators) and right alignment, date, datetime and time columns their date formatters, and boolean columns center alignment. The defaults apply only to a column with neither transformValue nor contentTemplates; such a column gets a formatter only when it names one.

## Transforming Cell Values

`transformValue` maps the pristine field value to what the cell displays: a function on the column in the ViewModel (V), or a binding to a ViewModel method in the View (B).

View definition JSON can also hold a declarative rule (R), which the TypeScript column helpers do not accept; a rule that does not match a row returns nothing, so that row's cell is blank, not its original value.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `transformValue` | `ColumnTransformValueFn \| DeclarativeRule<unknown> \| ViewDefinitionBinding` | no | V B | Inline callback, `{ where, applyValue }` rule evaluated against the row, or binding to a ViewModel transform method. | `({ value }) => String(value).toUpperCase()` |

Examples for `transformValue`:

Value (V):

```ts
// ViewModel
const { column } = dataTable.viewModel.defineColumns<Row>();

column({
    field: "createdAt",
    header: "Created",
    transformValue: ({ value }) => new Date(value as number).toLocaleDateString(),
})
```

Binding (B):

```ts
column({
    field: "createdAt",
    header: "Created",
    transformValue: { binding: "formatDate" },
});

// ViewModel
formatDate({ value }: { value: number }): string {
    return new Date(value).toLocaleDateString();
}
```

## Formatters

Built-in formatters apply common formatting without a custom transformValue. Author `formatter` and `formatterArgs` as literals on the column.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `formatter` | `string` | no | V | Name of a registered formatter applied as the column's display transform. | - |
| `formatterArgs` | `FormatterArgs` | no | V | Arguments passed to the formatter: a record of named values, such as { decimalPlaces: 2 } or { currency: "EUR" }. Each value can be a primitive, an object (e.g. unitInfo) or, in the View, a { binding } reference. A bare primitive is ignored. | `{ decimalPlaces: 2 }` |

### Built-in Formatters

The following formatters are pre-registered on every data table instance:

There is no parseJson or parseList formatter, and a formatter name that is not registered is ignored, so the cell shows the raw value; turn JSON text or a delimited line into a list or object with transformValue.

| Name | Example Input | Example Output | formatterArgs | Notes |
| --- | --- | --- | --- | --- |
| `number` | `9999999.99` | `9,999,999.99` | `{ format?: string }` | Thousands commas and at most 3 decimal places. 1234.56789 shows as 1,234.568; for other precision use decimal or a format pattern. |
| `integer` | `9999999.9` | `10,000,000` | `-` | Rounds to whole number, adds commas |
| `decimal` | `1234.5` | `1,234.50` | `{ decimalPlaces?: number }` | Default 2 decimal places |
| `currency` | `1234.5` | `$1,234.50` | `{ currency?, locale?, rounded? }` | Default USD / en-US. rounded: true drops the cents ($1,235). |
| `percent` | `0.4567` | `45.7%` | `{ decimalPlaces?: number }` | Default 1 decimal place |
| `shortNumber` | `1500000` | `1.5M` | `{ places?: number }` | Human-readable magnitude (k / M / B) |
| `scientific` | `1234567` | `1.23e+6` | `{ significantDigits?: number }` | significantDigits (default 2) counts the digits after the decimal point, so the default shows 1.23e+6. That is three significant digits; 4 shows 1.2345e+3. |
| `bytes` | `1572864` | `1.5 MB` | `-` | Binary tiers: B / KB / MB / GB |
| `datetime` | `<ISO string or timestamp ms>` | `1/31/2024 3:45 PM` | `{ format?: string }` | Defaults to user preferences. It uses the user's date format and time zone preferences (the browser's zone when none is set). format is a moment pattern or a token such as ShortDate ShortTime. The example assumes M/D/YYYY and a 12-hour clock; another user can see 2024-1-31 or a 24-hour clock. |
| `date` | `<ISO string or timestamp ms>` | `1/31/2024` | `{ format?: string }` | Defaults to user preferences. It uses the user's date format preference; with none set it shows 2024-1-31. |
| `time` | `<ISO string or timestamp ms>` | `3:45 PM` | `{ format?: string }` | Defaults to user preferences. It uses the user's time format and time zone preferences (the browser's zone when none is set). |
| `isoDate` | `<ISO string or timestamp ms>` | `2024-01-31` | `-` | UTC date, ISO 8601 format |
| `boolean` | `true` | `Yes` | `{ trueLabel?, falseLabel? }` | Default Yes / No |
| `uppercase` | `"hello"` | `"HELLO"` | `-` | String to uppercase |
| `lowercase` | `"HELLO"` | `"hello"` | `-` | String to lowercase |
| `titleCase` | `"hello world"` | `"Hello World"` | `-` | Capitalizes first letter of each word It lowercases the rest of each word: "NASA launch" gives "Nasa Launch". |
| `camelCase` | `"Hello world"` | `"HelloWorld"` | `-` | Drops separators and capitalizes the letter after each; other letters keep their case Separators are runs of spaces, hyphens or punctuation; underscores are kept. |
| `location` | `"POINT(-80.2 25.8)"` | `"25° 48' 0\" N 80° 12' 0\" W" (format: "DMS")` | `{ format?: string }` | Applies a geo format: WKT, LL, DD, DDM, DMS, UTM, MGRS, GEOREF, GARS. Without a format, or with an unknown one, the value shows unchanged. UTM, MGRS, GEOREF and GARS are answered by the server, so those cells are blank until the answer arrives; a polygon or line shows as it came. |
| `unit` | `30 (native m/s, display mph)` | `67.11 mph` | `{ unitInfo?: IUnitInfo }` | Deprecated: a unit column now gets its unit's precision from the number formatter, and the conversion and unit label are applied around whichever formatter the column has. |

### Units Formatting

A column with `unitInfo` (from the `IUnitInfo` metadata of some MapLarge tables, or a direct `unitInfo` object) is converted to the display unit and labelled around whichever formatter it has.

#### IUnitInfo fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `string` | Yes | Measurement category: distance, area, mass, temperature, speed, altitude, altimeter, visibility or time. Used for unit lookup and the user's global unit preference. Only those registered types convert; any other type leaves the value unconverted and labels it UNK. |
| `unit` | `string` | Yes | Native/storage unit the raw value is stored in (e.g. "m/s", "m"). |
| `displayUnit` | `string` | No | Default display unit (e.g. "mph"): ahead of the user's unit preference, behind a unit the user picks for the column. |
| `precision` | `number` | No | Number of significant digits kept for display, not decimal places. Precision 2 shows 22.3694 as 22, and 4 shows 22.37. For a fixed number of decimals use a format pattern or the decimal formatter. |
| `nearestDecimal` | `number` | No | Rounds to nearest decimal for display. Used only when precision is not set: -2 rounds to 2 decimal places, 0 to a whole number, 2 to the nearest hundred. |

**Example: Authored in the View**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";

/** ml_samples/Miami_Buses - speed column has unitInfo in server columnMetaData */
export type Row = { label: string; speed: number };

export class ViewModel extends DynamicViewModel {
    public initialize(): void {
        this.dataStore.register({ name: "buses", dataSource: "ml_samples/Miami_Buses" });
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
import type { Row, ViewModel } from "./view-model";

const busSchema = dataTable.view.schema.createSchema({
    entries: {
        label: schema.string(),
        speed: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocUnitFormatter", "Unit Formatter");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.dataStoreData({
                    dataStore: { binding: "dataStore" },
                    dataSourceName: "buses",
                }),
                schema: busSchema,
                rowScrolling: dataTable.view.rowScrolling.virtualScroll({ fixedRowHeight: 25 }),
                columns: [
                    // speed carries unitInfo in server metadata, so it converts and labels its values on its own
                    column({ field: "label", header: "Bus", width: toPixels(100) }),
                    column({ field: "speed", header: "Speed", width: toPixels(150) }),
                ],
            }));
        });
    });
    return s.commitPage();
}
```

**Example: Authored in the ViewModel**:

view-model.ts:

```ts
import { DynamicViewModel } from "raptor/raptorDom/viewModels/DynamicViewModel";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

/** ml_samples/Miami_Buses - speed column has unitInfo in server columnMetaData */
export type Row = { label: string; speed: number };

const busSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        label: schema.string(),
        speed: schema.number(),
    },
});

export class ViewModel extends DynamicViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        this.dataStore.register({ name: "buses", dataSource: "ml_samples/Miami_Buses" });
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.dataStoreData({
                dataStore: this.dataStore,
                dataSourceName: "buses",
            }),
            schema: busSchema,
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(25) }),
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTable, dataTableOptions, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocUnitFormatterViewModel", "Unit Formatter (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 300 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
                columns: [
                    // speed carries unitInfo in server metadata, so it converts and labels its values on its own
                    column({ field: "label", header: "Bus", width: toPixels(100) }),
                    column({ field: "speed", header: "Speed", width: toPixels(150) }),
                ],
            }));
        });
    });
    return s.commitPage();
}
```

### Custom Formatters

Register custom formatters via `createDataTable({ formatters: { ... } })` on the ViewModel, then reference them by name from column `formatter`. Because the registry lives on the resulting options, the View binds to them with `bindings: { data: "dataTableOptions" }`. A formatter may return a `Promise<string>`: the cell renders blank and fills in when it resolves.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `formatters` | `Record<string, DataTableValueFormatter \| { format: DataTableValueFormatter; columnTypes?: readonly string[]; decimals?: (formatterArgs) => number \| undefined }>` | no | Named custom formatters merged with built-ins. Reference by name in column({ formatter: "name" }). Pass the function on its own, or { format, columnTypes } to say which column types it suits - the column picker offers it only on those, and a formatter with no columnTypes is offered on every column. On a unit column, `decimals` says how many decimal places the text shows, so the editor and filter round a converted value the same way; without it they round to 2. |

**Example: Cells And Content Custom Formatter**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, schema, toPixels } from "data-ui/data-table";
import type { DataTableOptions, DataTableValueFormatter } from "data-ui/data-table";

export type Row = { name: string; revenue: number; bandwidth: number };

const rows: Row[] = [
    { name: "North America", revenue: 4820000, bandwidth: 125000000 },
    { name: "Europe", revenue: 3150000, bandwidth: 89000000 },
    { name: "Asia Pacific", revenue: 6970000, bandwidth: 210000000 },
];

const gridSchema = dataTable.viewModel.schema.createSchema({
    entries: {
        name: schema.string(),
        revenue: schema.number(),
        bandwidth: schema.number(),
    },
});

const bpsFormatter: DataTableValueFormatter = ({ value }) => {
    if (value == null) return "";
    const bps = Number(value);
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(2)} Kbps`;
    return `${bps} bps`;
};

const { column } = dataTable.viewModel.defineColumns<Row>();

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        // formatters is a createDataTable-only option, so the table is built here and the View binds to it
        const { options } = createDataTable<Row>({
            data: rows,
            schema: gridSchema,
            rowScrolling: dataTable.viewModel.rowScrolling.virtualScroll({ fixedRowHeight: toPixels(25) }),
            formatters: { bps: bpsFormatter },
            columns: [
                column({ field: "name", header: "Region", width: toPixels(200) }),
                column({
                    field: "revenue",
                    header: "Revenue (EUR)",
                    width: toPixels(180),
                    formatter: "currency",
                    formatterArgs: { currency: "EUR", locale: "de-DE" },
                }),
                column({ field: "bandwidth", header: "Bandwidth", width: toPixels(160), formatter: "bps" }),
            ],
        });
        this.dataTableOptions = options;
        this.update();
    }
}
```

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import { dataTableOptions } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("DataDocCustomFormatter", "Custom Formatter");
    s.view("main", (s) => {
        s.div({ height: 220 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                bindings: { data: "dataTableOptions" },
            }));
        });
    });
    return s.commitPage();
}
```

## getGlobalUserContext

Optional callback that supplies timezone and user-preference lookups to formatters and cell editors. When omitted, the data table falls back to the framework default (`getGlobalUserContext()` from `index`).

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `getGlobalUserContext` | `GlobalUserContextProvider` | no | V B | Returns `{ getTimezone, getUserPreference }` used by the built-in date formatters and date cell editors. It also feeds the date patterns in the column configurator. Both methods are required; if either throws, the date formatters ignore the provider. Unit display preferences do not use it; they come from the framework's global user context. | `() => ({ getTimezone: () => "America/New_York", getUserPreference: (_key: string) => undefined })` |

Examples for `getGlobalUserContext`:

Value (V):

```ts
// ViewModel
const { options } = createDataTable<Row>({
    // ...
    getGlobalUserContext: () => ({
        getTimezone: () => "America/New_York",
        getUserPreference: (_key: string) => undefined,
    }),
});
```

Binding (B):

```ts
s.dataTable(dataTableOptions<Row>({
    // ...
    getGlobalUserContext: { binding: "userContext" },
}));

userContext() {
    return {
        getTimezone: () => "America/New_York",
        getUserPreference: (_key: string) => undefined,
    };
}
```

## Cell Templates

Replace the default cell renderer with arbitrary Raptor markup using `contentTemplates` and `scope`. See the Cell Templates page.

## Checkbox Rows

Enable checkbox row selection with `checkboxRows` on `s.dataTable({... })`. For V - R - B authoring examples, store APIs, and selection-engine docs, see the Selection page.

## Related

- [cell-templates](cell-templates.md): Cell Templates
- [cell-selection-selection-engines](cell-selection-selection-engines.md): Selection - Selection Engines and more
- [types](types.md): the declarations of the types used here, `ColumnBase`, `InlineContentTemplates`, `ColumnEditConfig`, `EditTransformContext`, `EditTrigger`, `DeclarativeRule`, `CellEditor`, `CellEditorStartContext`, `ColumnTypeDefinition`, `InputRenderArgs`, `ColumnSchemaEntry`, `FilterExpression`, `CellEditorInitContext`, `DataTableStore`, `SelectionState`, `RowMutationsFactory`, `FormatterArgs`, `CellContext`, `DataTableValueFormatter`; search it for a name rather than reading it whole
