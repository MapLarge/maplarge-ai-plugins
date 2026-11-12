# Data Table recipe - Show values with units

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## show-units

**Show values with units.** Show a measurement with its unit, converted to the unit people expect (meters as feet, for example).

Merge into createDataTable({ ... }) `[options]`:

```ts
schema: dataTable.viewModel.schema.createSchema({
    entries: {
        ...assetSchemaEntries,
        lengthMeters: schema.number({ unitInfo: { type: "distance", unit: "m", displayUnit: "ft" } }),
    },
}),
columns: [
    column({ field: "lengthMeters", header: "Length", align: "right" }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [{ "field": "lengthMeters", "header": "Length", "align": "right", "key": "lengthMeters" }]
}
```

In view definition JSON the table transform's schema has no entries, so whatever this recipe sets on schema entries (an editor, limits, units) is not in the JSON form; give the node its own schema with those entries (a schema on the node replaces the transform's, so keep it discoverable), put units on the column as formatterArgs.unitInfo, or build the table in code.

- The value converts to displayUnit before any formatter runs, and the unit label is added after. Users can change the display unit in the column configurator.
- type is one of the platform's measurement types: distance, area, mass, temperature, speed, altitude, altimeter, visibility and time. unit and displayUnit take a unit id or abbreviation of that type: meter, kilometer, centimeter, millimeter, mile, nauticalMile, yard, feet, inch or m, km, ft, mi (distance); celsius, fahrenheit, kelvin (temperature, labelled with a degree sign); m/s, kph, mph, kts (speed; km/h is not an id and shows UNK); kilogram, pound, ton, tonne (mass); acre, hectare (area). unit and displayUnit may be the same unit, which labels the value without converting it. Use the ids for temperature: C matches only because the lookup accepts part of an abbreviation. The time type takes only the plural names milliseconds, seconds, minutes, hours, days, months or years; any other name (s, min, second) leaves the value unconverted but still labelled. An unknown type or unit shows the value unconverted, labelled UNK.
- In view definition JSON there is no schema to edit, so put the unit on the column: "formatterArgs": { "unitInfo": { "type": "distance", "unit": "m", "displayUnit": "ft" } }. A source that carries unit metadata already supplies it for the columns the table discovers.
- Tables with unit metadata get unitInfo from the source; a schema entry is only needed when the source has none.

Reference: `cells-and-content`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cells-and-content](../cells-and-content.md): Cell Values
