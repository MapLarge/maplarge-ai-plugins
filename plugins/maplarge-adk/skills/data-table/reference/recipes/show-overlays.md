# Data Table recipe - Show overlay messages

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## show-overlays

**Show overlay messages.** Show a message over the table, such as when no rows match the filters, and control the loading overlay.

ViewModel members `[members]`:

```ts
public readonly showLoading = (): void => {
    this.store?.dispatch(actions.showOverlay({ overlayType: "loading" }));
};

public readonly hideLoading = (): void => {
    this.store?.dispatch(actions.hideOverlay({ overlayType: "loading" }));
};
```

Merge into createDataTable({ ... }) `[options]`:

```ts
overlays: {
    loading: dataTable.viewModel.overlays.floatingBoxOverlayEngine({ text: "Loading assets...", spinner: true }),
    noResults: dataTable.viewModel.overlays.floatingBoxOverlayEngine({ text: "No assets match your filters" }),
},
```

View definition JSON, merged into the dataTable node (see `bind-to-the-dashboard-table-transform`):

```json
{
  "overlays": {
    "loading": {
      "strategy": "floatingBoxOverlayEngine",
      "args": { "text": "Loading assets...", "spinner": true }
    },
    "noResults": { "strategy": "floatingBoxOverlayEngine", "args": { "text": "No assets match your filters" } }
  }
}
```

Code only, not in the JSON form: ViewModel members.

- Built-in overlay slots: loading, noData, noResults and error. templateOverlayEngine renders your own markup.

Reference: `overlays-overlay-engines`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [bind-to-the-dashboard-table-transform](bind-to-the-dashboard-table-transform.md): Bind to the dashboard editor's table transform
- [overlays-overlay-engines](../overlays-overlay-engines.md): Overlays - Overlay Engines and more
