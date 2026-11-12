# Data Table recipe - React to table events

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## react-to-events

**React to table events.** Run code when the user sorts, filters or edits, or when another action completes.

ViewModel members `[members]`:

```ts
private readonly unsubscribers: (() => void)[] = [];
```

After createDataTable `[afterCreate]`:

```ts
this.unsubscribers.push(
    store.subscribe(actions.sortDone, ({ sort }) => console.log("sorted", sort)),
    store.subscribe(actions.setFilterDone, () => console.log("filters changed")),
);
```

In destroy() `[destroy]`:

```ts
this.unsubscribers.forEach((unsubscribe) => unsubscribe());
```

No view definition JSON form; this recipe needs code. Code only, not in the JSON form: ViewModel members; setup code; cleanup code.

- Only actions that finish asynchronously have Done and Failed variants to subscribe to: sort (sortDone, sortFailed), setFilter, clearFilters, setConstraint, rowsUpdate (after an edit is saved), loadSegments, hideEmptyColumns and showEmptyColumns (showEmptyColumns has only Done). For any other action subscribe to the action itself, such as store.subscribe(actions.selectCell, handler).

Reference: `store-store-api`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [store-store-api](../store-store-api.md): Store - Store API and more
