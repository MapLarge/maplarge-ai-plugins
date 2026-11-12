# Data Table recipe - Handle wide data

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## handle-wide-data

**Handle wide data.** Keep the table fast with hundreds or thousands of columns.

Merge into createDataTable({ ... }) `[options]`:

```ts
columnSlots: dataTable.viewModel.columnSlots.virtualizedColumns({ maxColumnCount: 50 }),
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "columnSlots": { "strategy": "virtualizedColumns", "args": { "maxColumnCount": 50 } } }
```

- Only the columns near the viewport are rendered; maxColumnCount 50 covers any screen of 80 pixel columns, so leave it. Pair it with show-all-columns-automatically for sources whose columns are not known ahead of time.
- Columns generated in a loop belong in one array literal, so TypeScript checks each field: columns: [column({ field: "hour", header: "Hour" }), ...sensorIds.map((id) => column({ field: id, header: id }))]. Schema entries the same way: { hour: schema.string(), ...Object.fromEntries(sensorIds.map((id) => [id, schema.number()])) }.

Reference: `column-slots-column-slot-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [column-slots-column-slot-engines](../column-slots-column-slot-engines.md): Column Slots - Column Slot Engines and more
