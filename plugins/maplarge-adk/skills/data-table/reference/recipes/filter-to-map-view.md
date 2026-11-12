# Data Table recipe - Show only rows in the map view

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## filter-to-map-view

**Show only rows in the map view.** Put a map beside the table, draw the table's rows on it, and narrow the table to rows inside the visible map area as the user pans and zooms.

Merge into createDataTable({ ... }) `[options]`:

```ts
integrations: [
    { engine: dataTable.viewModel.integrations.mapViewportSync({ mapId: "assetsMap", debounceMs: 250 }) },
],
footer: dataTable.viewModel.footer.footerToolbar({ showSyncWithViewport: true }),
```

After createDataTable `[afterCreate]`:

```ts
this.registerLayers([{ id: "assetsLayer", dataSourceName: "assets", baseLayerOpts: { name: "Assets", visible: true } }]);
```

table `[table]`:

```ts
s.div({ height: 500, flex: { dFlex: true, gap: 3 } }).contentTemplates((row) => {
    row.div({ flex: { flex: 1 } }).contentTemplates((mapPane) => {
        mapPane.raptorMap({
            viewName: "assetsMap",
            mapOptions: { mapId: "assetsMap", api: "LEAFLET", lat: 25.76, lng: -80.19, z: 11 },
            bindings: { data: "defaultMapOptions" },
        });
    });
    row.div({ flex: { flex: 1 }, overflow: "hidden" }).contentTemplates((s) => {
        s.dataTable(dataTableOptions<Asset>({
            bindings: { data: "dataTableOptions" },
        }));
    });
});
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "integrations": [
    {
      "engine": { "strategy": "mapViewportSync", "args": { "mapId": "assetsMap", "debounceMs": 250 } }
    }
  ],
  "footer": { "strategy": "footerToolbar", "args": { "showSyncWithViewport": true } }
}
```

Code only, not in the JSON form: setup code; view layout.

- The table reads a MapLarge source with a geometry column registered on the data store under "assets", as load-from-dashboard-data-source does, so registerLayers can draw the same table on the map. geoField on dataStoreData picks the column when there are several. The viewport link alone also works with load-from-a-data-source-directly, but then nothing is drawn on the map.
- Keep the raptorMap node as written. Without bindings: { data: "defaultMapOptions" } the layers from registerLayers never reach the map; keep mapId, api, lat, lng and z in mapOptions on the node so the map opens where you want it and mapViewportSync can find it by mapId.
- On the raptorMap node, mapOptions sets mapId (what mapViewportSync looks up), api ("LEAFLET" or "CESIUM") and the starting view: lat, lng and z (zoom). bindings: { data: "defaultMapOptions" } adds the layers registered with registerLayers; keep mapId and the view in mapOptions on the node.
- registerLayers takes one entry per layer: { id, dataSourceName, baseLayerOpts: { name, visible } }, plus an optional style. Layer styling and the other map options are in the map-layers and map-options skills (the dashboard skill folder).
- The two panes share the row's 500 pixel height side by side; overflow: "hidden" lets the table's pane shrink, so a wide table scrolls sideways instead of squeezing the map. The footer toolbar's Sync With Viewport checkbox turns the map filter on and off. Leave the integration's key out: the checkbox toggles the default key, mapViewportSync.
- The table only follows the map. Nothing built in highlights or zooms to the clicked row on the map; react-to-row-selection gives the clicked row to your own code.

Reference: `integrations`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [integrations](../integrations.md): Integrations
