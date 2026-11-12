# Data Table recipe - Format coordinates

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## format-coordinates

**Format coordinates.** Show a point location as degrees-minutes-seconds or another coordinate format.

Merge into createDataTable({ ... }) `[options]`:

```ts
columns: [
    column({ field: "location", header: "Location", width: toPixels(240), formatter: "location", formatterArgs: { format: "DMS" } }),
],
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "columns": [
    {
      "field": "location",
      "header": "Location",
      "width": 240,
      "formatter": "location",
      "formatterArgs": { "format": "DMS" },
      "key": "location"
    }
  ]
}
```

- format takes a MapLarge location format name. Only points convert; lines and polygons show as they came.

Reference: `cells-and-content`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [cells-and-content](../cells-and-content.md): Cell Values
