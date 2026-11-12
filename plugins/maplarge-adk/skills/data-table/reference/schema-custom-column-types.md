# Data Table - Schema - Custom Column Types

<!-- Automatically generated, do not edit -->

## Custom Column Types

Use defineColumnType to create your own column type.

| Property | Type | Required | Arms | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `name` | `string (literal)` | yes | V | Unique string identifier for this column type. Becomes ColumnSchemaEntry.type for entries created by the returned factory. | - |
| `defaultOverrides` | `SchemaOverrides \| undefined` | no | V | Default filtering or editing overrides applied to every schema entry from this factory. Consumer overrides win. | `{ filtering: { type: "text" } }` |
| `renderInput` | `(args: InputRenderArgs) => void` | yes | V | Renders the filter input UI for this type. defaultRenderInput(htmlInputType) is the easiest option for standard HTML input elements. It is used only when the type has no descriptor. When descriptor returns one, that descriptor's control renders the filter input and renderInput is not used. | - |
| `defaultFilterOperators` | `readonly string[] \| undefined` | no | V | Default operators shown in the filter dialog for columns of this type. | - |
| `coerceEditValue` | `((rawValue: unknown) => unknown) \| undefined` | no | V | Converts raw editor values into the desired JS value type for edits. | - |
| `serverTypes` | `readonly string[] \| undefined` | no | V | Server-side type strings (case-insensitive) that map discovered columns to this custom type. | - |
| `descriptor` | `() => AnyDescriptor \| undefined` | no | V | Factory for the default filter and edit descriptor (e.g. Text, TextArea, Number). | - |

Call dataTable.viewModel.columnTypes.defineColumnType with a single args object: dataTable.viewModel.columnTypes.defineColumnType({ name: "mytype", renderInput, ... }).

### Custom Column Type Example: bigstring

This custom type uses a textarea filter input. Custom column types are ViewModel-only - `renderInput` is a live callback, so the schema that carries it cannot be authored on the View.

**Example: Schema Custom Column Type Bigstring Snippet**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, passEvents, schema } from "data-ui/data-table";
import type { DataTableOptions } from "data-ui/data-table";

export type Row = {
    readonly id: number;
    readonly summary: string;
    readonly notes: string;
};

const bigstring = dataTable.viewModel.columnTypes.defineColumnType({
    name: "bigstring",
    renderInput: ({ s, bindings, events, noAutoEvent }) => {
        s.textArea({ rows: 4, noAutoEvent, bindings, events: passEvents(events) });
    },
    defaultFilterOperators: ["Contains", "StartsWith", "Equal", "EqualNot", "IsNull", "IsNotNull"],
});

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, summary: "Short summary", notes: "A longer freeform note that benefits from a multi-line filter input." },
            { id: 2, summary: "Another item", notes: "Notes can run long, which is exactly what bigstring is for." },
        ];
        const { options } = createDataTable<Row>({
            data: dataTable.viewModel.data.arrayData({ data: rows }),
            schema: dataTable.viewModel.schema.createSchema({
                entries: {
                    id: schema.number(),
                    summary: bigstring(),
                    notes: bigstring(),
                },
            }),
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
import { dataTable, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocCustomColumnTypeBigstringViewModel", "Custom Column Type: bigstring (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(60) }),
                    column({ field: "summary", header: "Summary", width: toPixels(220) }),
                    column({ field: "notes", header: "Notes", width: toPixels(320) }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

### Using Custom Types in a Discoverable Schema

When a column's name is known ahead of time, it can be placed directly in entries. `serverTypes` applies to columns that are not listed in entries and are instead returned by the backend at runtime. It maps a backend type name to a custom column type so that any discovered column with that type is handled correctly.

In this example, the geometry column is discovered from backend metadata and is not listed in entries. The backend says its type is `wkt`. Because `serverTypes` includes `wkt`, the data table assigns the custom geometry type to it.

**Example: Schema Custom Column Type Server Mapping Snippet**:

view-model.ts:

```ts
import { RaptorViewModel } from "raptor/raptorDom/viewModels/RaptorViewModel";
import { createDataTable, dataTable, passEvents, schema } from "data-ui/data-table";
import type { DataEngine, DataTableOptions } from "data-ui/data-table";

export type Row = {
    readonly id: number;
    readonly name: string;
    readonly geometry: string;
};

function createGeometryAwareEngine(rows: readonly Row[]): DataEngine<Row> {
    const inner = dataTable.viewModel.data.arrayData({ data: [...rows] });
    return {
        type: "offset",
        getRows: (args) => inner.getRows(args),
        setSort: (args) => inner.setSort(args),
        setFilters: (args) => inner.setFilters(args),
        rowCount: inner.rowCount,
        getColumnMetadata: () => [
            ...(inner.getColumnMetadata?.() ?? []),
            { name: "geometry", serverType: "wkt" },
        ],
    };
}

const geometryColumnType = dataTable.viewModel.columnTypes.defineColumnType({
    name: "geometry",
    renderInput: ({ s, bindings, events, noAutoEvent }) => {
        s.textArea({ rows: 3, noAutoEvent, bindings, events: passEvents(events) });
    },
    serverTypes: ["wkt"],
});

export class ViewModel extends RaptorViewModel {
    dataTableOptions: DataTableOptions<Row> | null = null;

    public initialize(): void {
        const rows: Row[] = [
            { id: 1, name: "Site A", geometry: "POINT (-84.388 33.749)" },
            { id: 2, name: "Site B", geometry: "POINT (-84.390 33.753)" },
        ];
        const { options } = createDataTable<Row>({
            data: createGeometryAwareEngine(rows),
            schema: dataTable.viewModel.schema.createDiscoverableSchema({
                entries: {
                    id: schema.number(),
                    name: schema.string(),
                },
                columnTypes: [geometryColumnType],
            }),
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
import { dataTable, toPixels } from "data-ui/data-table";
import type { Row, ViewModel } from "./view-model";

const { column } = dataTable.view.defineColumns<Row, ViewModel>();

export function View(): ViewDefinitions.IRenderingDefinition {
    const s = RSScriptor.create<ViewModel>();
    s.page("SchemaDocCustomColumnTypeServerMappingViewModel", "Custom Type Server Mapping (ViewModel)");
    s.view("main", (s) => {
        s.div({ height: 260 }).contentTemplates((s) => {
            s.dataTable({
                bindings: { data: "dataTableOptions" },
                columns: [
                    column({ field: "id", header: "ID", width: toPixels(60) }),
                    column({ field: "name", header: "Name", width: toPixels(140) }),
                    column({ field: "geometry", header: "Geometry", width: toPixels(220) }),
                ],
            });
        });
    });
    return s.commitPage();
}
```

## Related

- [schema-schema-types](schema-schema-types.md): Schema - Schema Types and more
- [types](types.md): the declarations of the types used here, `ColumnSchemaEntry`, `ColumnTypeDefinition`, `InputRenderArgs`, `FilterExpression`; search it for a name rather than reading it whole
