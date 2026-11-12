# Data Table - Filtering - Filter Controls

<!-- Automatically generated, do not edit -->

## Filter Controls

Filter controls customize the inputs shown in the filter dialog for a given column type and operator. Each control owns three concerns: seeding slot state, rendering UI, and resolving slot values into FilterCondition.values. Controls are registered per data table instance via filterControls on s.dataTable or createDataTable.

### filterControls option

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `filterControls` | `readonly FilterControlRoute[]` | no | Declarative bindings that attach a FilterControl to a column type and optional operators. Merged with built-in bindings; user entries override built-ins for the same (columnType, operator) pair. | `[ { columnType: "datetime", operators: ["Between"], control: myDateRangeControl }, ]` |

### FilterControlRoute

Each `FilterControlRoute` entry both supplies the control and routes it:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `columnType` | `string` | yes | Schema column type key (e.g. "datetime", "number", "string"). |
| `operators` | `readonly string[]` | no | Operator keys to apply this control to (e.g. "Between", "Equal"). Omit to apply to every operator of this column type that has no route of its own. The built-in routes for date and datetime Between and NotBetween keep the DateRange control unless you name those operators. |
| `control` | `FilterControl` | yes | The control implementation (seed, render, resolveValues). |

### FilterControl contract

Implement `FilterControl` with the following members:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `string` | yes | Registry key that identifies this control. Your seed must return a slot whose inputType is this key; the filter dialog shows the control when isControl_\<type> is true. The dialog finds resolveValues by slot.inputType. The key is not saved with a layout; the filter's values are, so keep the shape resolveValues writes and seed reads compatible between versions. |
| `seed` | `(args) => FilterSlot` | yes | Bootstrap a FilterSlot when the operator is selected or a dialog re-opens with an existing filter. Read activeValues to rehydrate from committed filter state. |
| `render` | `(ctx: FilterControlRenderContext) => void` | yes | Render this control's UI. The default renderer wraps each control in visible: isControl_\<type>; the control does not manage top-level visibility itself. |
| `resolveValues` | `(args) => Record<string, unknown> \| undefined` | yes | Convert the slot's current value into FilterCondition.values entries. Return undefined when the slot is empty (Apply drops the condition). Multi-key controls (e.g. date range) return { value, secondValue } directly. |
| `hasEntries` | `boolean` | no | When true, the control manages a list of entries (MultiValue-style) and the dialog validates each entry before Apply. A custom control with entries renders its own add and remove buttons; the built-in Add and remove buttons work only for the built-in MultiValue control (they change a slot whose inputType is "MultiValue"). |
| `validatesValue` | `boolean` | no | When true, the slot participates in single-value validation before Apply. |
| `preserveDraftValue` | `boolean` | no | When true, typed values are preserved across dialog re-renders while the dialog stays open. |
| `dispose` | `(slot: FilterSlotViewModel) => void` | no | Optional teardown for external resources. Raptor disposes rendered UI when the dialog closes. |

### FilterControlRenderContext

`FilterControlRenderContext` is passed to FilterControl.render:

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `s` | `IRootScriptor<FilterSlotViewModel>` | yes | Scriptor bound to the current filter slot. |
| `columnDescriptor` | `AnyDescriptor \| undefined` | no | Resolved column descriptor (e.g. DateTime showTime/timeZone for date-range controls). |
| `schemaEntry` | `ColumnSchemaEntry \| undefined` | no | Schema entry for the filtered column. |
| `valueChangeHandlerPath` | `string` | yes | Raptor handler path wired to the slot input's change event. |

### Custom Filter Control Example

Define a FilterControl and route it to a (columnType, operator) pair to override the built-in date range for datetime Between, or to attach a custom control to any existing column type without defining a new column type. The two tabs are alternatives - the same control authored on either surface, not two halves of one setup.

**Example: Authored in the View**:

view.ts:

```ts
import type { ViewDefinitions } from "index";
import { RSScriptor } from "index";
import {
    dataTable,
    dataTableOptions,
    schema,
    type FilterControl,
    type FilterControlRenderContext,
} from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const rows: readonly Row[] = [
    { id: 1, name: "alpha", qty: 2 },
    { id: 2, name: "beta", qty: 5 },
    { id: 3, name: "gamma", qty: 9 },
];

const numberRangeControl: FilterControl = {
    type: "NumberRange",
    preserveDraftValue: true,

    seed: ({ key, placeholder, activeValues }) => ({
        key,
        placeholder,
        inputType: "NumberRange",
        value: [activeValues?.value ?? "", activeValues?.secondValue ?? ""].join(","),
    }),

    render: ({ s }: FilterControlRenderContext) => {
        s.div({ flex: { dFlex: true, gap: 1, alignItemsCenter: true } }).contentTemplates((row) => {
            row.input({ bindings: { value: s.getTypedProp("value") } });
        });
    },

    resolveValues: ({ slot }) => {
        const [start, end] = String(slot.value ?? "").split(",");
        if (!start || !end) return undefined;
        return { value: Number(start), secondValue: Number(end) };
    },
};

const gridSchema = dataTable.view.schema.createSchema({
    entries: {
        id: schema.number(),
        name: schema.string(),
        qty: schema.number(),
    },
});

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("FilteringDocFilterControlsExampleView", "Custom Filter Control (View)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable(dataTableOptions<Row>({
                data: dataTable.view.data.arrayData({ data: rows }),
                schema: gridSchema,
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
                filterControls: [
                    { columnType: "number", operators: ["Between"], control: numberRangeControl },
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
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import {
    createDataTable,
    dataTable,
    schema,
    type FilterControl,
    type FilterControlRenderContext,
} from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = { readonly id: number; readonly name: string; readonly qty: number };

const numberRangeControl: FilterControl = {
    type: "NumberRange",
    preserveDraftValue: true,

    seed: ({ key, placeholder, activeValues }) => ({
        key,
        placeholder,
        inputType: "NumberRange",
        value: [activeValues?.value ?? "", activeValues?.secondValue ?? ""].join(","),
    }),

    render: ({ s }: FilterControlRenderContext) => {
        s.div({ flex: { dFlex: true, gap: 1, alignItemsCenter: true } }).contentTemplates((row) => {
            row.input({ bindings: { value: s.getTypedProp("value") } });
        });
    },

    resolveValues: ({ slot }) => {
        const [start, end] = String(slot.value ?? "").split(",");
        if (!start || !end) return undefined;
        return { value: Number(start), secondValue: Number(end) };
    },
};

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "alpha", qty: 2 },
            { id: 2, name: "beta", qty: 5 },
            { id: 3, name: "gamma", qty: 9 },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                    qty: schema.number(),
                },
            }),
            filterControls: [
                { columnType: "number", operators: ["Between"], control: numberRangeControl },
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
import { dataTable } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("FilteringDocFilterControlsExampleViewModel", "Custom Filter Control (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID" }),
                    column({ field: "name", header: "Name" }),
                    column({ field: "qty", header: "Qty" }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

To route an existing built-in control rather than define one, give control its registered name instead of a FilterControl object. This works the same on either surface.

```ts
s.dataTable(dataTableOptions<Row>({
    // ...
    filterControls: [
        { columnType: "number", operators: ["Equal"], control: "MultiValue" },
    ],
}));
```

## Related

- [filtering-column-filter-configuration](filtering-column-filter-configuration.md): Filtering - Column Filter Configuration and more
- [types](types.md): the declarations of the types used here, `ColumnSchemaEntry`, `ColumnTypeDefinition`, `InputRenderArgs`, `FilterExpression`; search it for a name rather than reading it whole
