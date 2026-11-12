# Data Table recipe - Size the table

<!-- Automatically generated, do not edit -->

This recipe changes the base table in `recipe-base`: put each block at the slot it names.

## size-the-table

**Size the table.** Give the table the height it needs: a fixed height, or the full height of a panel or dialog.

table `[table]`:

```ts
s.div({ height: 600 }).contentTemplates((s) => {
    s.dataTable(dataTableOptions<Asset>({
        bindings: { data: "dataTableOptions" },
    }));
});
```

View definition JSON:

```jsonc
// a pixel height on the dataTable node itself
{ "type": "dataTable", "height": 400 }
```

- The table fills its container and has no height of its own, so the container needs a pixel height (600 here). heightPercentage: 100 works only when every parent up to the page has a fixed height, such as a panel or dialog of a set size; in a page or sandbox it does not, and the table then grows as tall as all its rows, rendering blank space past the first screenful.
- In view definition JSON, give the dataTable node a pixel height; in a slide's floating panel, give it a width, height and placement rect like the other panels.

Reference: `pitfalls`, `view-definition-json`

## Related

- [recipe-base](../recipe-base.md): Data Table recipe base
- [recipes](../recipes.md): Data Table recipes
- [pitfalls](../pitfalls.md): Pitfalls
- [view-definition-json](../view-definition-json.md): View Definition JSON
