# Data Table recipe - Tune performance

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## tune-performance

**Tune performance.** Trade rendering work for smoothness on slow devices or heavy cell templates.

Merge into createDataTable({ ... }) `[options]`:

```ts
viewportOnlyEvaluation: true,
columnMountBudgetMs: 8,
bindingEvalBudgetMs: 8,
rowRecycleBuffer: 10,
extraColumnBuffer: 2,
maxCachedSegments: 50,
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "viewportOnlyEvaluation": true,
  "columnMountBudgetMs": 8,
  "bindingEvalBudgetMs": 8,
  "rowRecycleBuffer": 10,
  "extraColumnBuffer": 2,
  "maxCachedSegments": 50
}
```

Reference: `performance`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [performance](../performance.md): Performance
