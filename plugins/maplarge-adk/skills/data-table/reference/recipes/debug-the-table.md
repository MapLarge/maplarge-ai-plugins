# Data Table recipe - Debug the table

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## debug-the-table

**Debug the table.** Find out why the table is slow, empty or not updating.

Merge into createDataTable({ ... }) `[options]`:

```ts
debugHud: { enabled: true },
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{ "debugHud": { "enabled": true } }
```

- The debug HUD shows rendering, cache, queue and action activity over the table. Leave it off in production.

Reference: `debug-hud`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [debug-hud](../debug-hud.md): Debug HUD
