# Raptor Dashboard Patterns

Use these patterns when building ADK extension dashboards, pages, layouts, routes, dialogs, and view-model wiring.

## UI baseline

- Build dashboards with Raptor primitives first: layouts, pages, view models, bindings, charts, DataGrid, dialogs, layers, and platform classes.
- Avoid custom layout systems, injected HTML, and broad CSS. Add custom CSS only for small gaps that Raptor or platform classes do not cover.
- Preserve MapLarge dashboard chrome, spacing, and interaction patterns unless the user explicitly authorizes a different direction.
- Use Roboto typography. Do not introduce or import non-Roboto font families.

## Core bootstrap

Common extension modules follow this sequence:

1. Register a dashboard with `registerPublicDashboard`.
2. Optionally register a route with `registerCustomRoute`.
3. Set the global theme if the extension needs one.
4. Create a `RaptorEngine` and `await engine.initialize()`.
5. Add layouts, pages, view models, dialogs, and data contexts.
6. Finish with `engine.loadModule(...)`.

## Canonical module shape

```ts
registerPublicDashboard({
  id: "ext/my-extension/home",
  name: "My Extension",
  description: "My Extension Dashboard",
  hideSidebar: false,
  hideHeader: false,
});

export async function initModule(container: HTMLElement, route: ILocatedRoute): Promise<RaptorEngine> {
  setGlobalTheme("Light", true);

  const engine = new RaptorEngine(container);
  await engine.initialize();

  engine.addLayout(LayoutView());
  engine.addPage(HomeView());
  engine.addViewModels({ modelKey: HomeModelKey, viewModels: [HomeViewModel] });

  return engine.loadModule("my-extension", route.values.page as string, true);
}
```

## Route pattern

Use `registerCustomRoute` when the dashboard owns a route shape:

```ts
registerCustomRoute({
  route: "ext/my-extension/:page?/:segment1?/:segment2?",
  path: "ext/my-extension/home",
  params: {
    page: { type: "string" },
    segment1: { type: "string" },
    segment2: { type: "string" },
  },
  createNewDashboardForRoute: false,
});
```

## Route URL Examples

Given:

```ts
registerCustomRoute({
  route: "ext/my-extension/:page?",
  path: "ext/my-extension/home",
  params: {
    page: { type: "string" },
  },
  createNewDashboardForRoute: false,
});
```

Local ADK URLs are:
- `https://localhost:8443/dashboard/ext/my-extension/home`
- `https://localhost:8443/dashboard/ext/my-extension/MyPageKey`
The path points to the extension module dashboard. The route parameters are passed to `initModule` as `route.values`.

If a friendly URL should always load a specific page, add a literal route before the generic parameterized route and map it in `initModule`.

```ts
function getPageToLoad(route: ILocatedRoute): string {
  if (route.route.route === "ext/my-extension/my-url") {
    return MyPageKey;
  }

  return route.values.page as string || HomeModelKey;
}

registerCustomRoute({
  route: "ext/my-extension/my-url",
  path: "ext/my-extension/home",
  params: {},
  createNewDashboardForRoute: false,
});
```

## Composition rules

- Keep dashboard registration near the module entrypoint.
- Add layouts before pages and pages before view models.
- Add dialogs explicitly with `engine.addDialog(...)` when the module owns them.
- Add data contexts before loading the module when pages depend on shared state.
- Reuse existing extension naming patterns for dashboard ids, routes, and model keys instead of inventing a new convention.

## Official topics to prefer

When published docs are needed, start with these portal topics:

- `Overview: Dashboard Development`
- `Raptor: Bindings`
- `Raptor: Events`
- `Raptor: Data Sources`
- `Raptor: Nodes`
- `Raptor: Charts`
- `Raptor: Dialogs`
- `Working With Users` for user timezone and date/time display preferences
- `Client-Side Layers`

## Date and time patterns

- Prefer Luxon for dashboard date/time state, parsing, arithmetic, and serialization.
- In new module-based TypeScript, import the ESM module: `import { DateTime } from "luxon";`.
- In legacy namespaced code, older ADK projects, or existing Raptor examples, use `ml.luxon.DateTime` to match the surrounding pattern.
- Keep server and query boundary values as ISO strings. Parse known UTC values with `DateTime.fromISO(value, { zone: "utc" })` or `ml.luxon.DateTime.fromISO(value, { zone: "utc" })`, and serialize persisted values with `.toUTC().toISO()` when UTC is required.
- For user-visible date/time text, prefer the user's dashboard preferences:

```ts
const tz = this.raptorEngine.getUserContext().getTimezone();
const formats = this.raptorEngine.getUserContext().getUserPreference("formats");
return ml.util.Text.formatDate(this.timestamp, "ShortDate ShortTime", tz, formats);
```

- Raptor temporal controls may expect Luxon `DateTime` values or `DateTime.toObject()` values depending on the control contract; match the local control examples.
- Treat Moment as legacy interop only. Do not introduce new Moment-based dashboard code.

## Practical gotchas

- `traverseRaptorChart: true` resolves view-model getter references at initial render. If chart data arrives later, update the ECharts instance manually and call `resize()`.
- `DynamicViewModel` data source callbacks may provide a metadata descriptor. Query it for row data before populating charts or grids.
- For dynamic per-row colors, bind an inline style string through `attr.style`; the Raptor `style` binding is boolean-oriented.
- Server column type names can arrive as .NET names such as `Int32`, `Int64`, `Double`, `String`, `DateTime`, and `Guid`; normalize casing before comparing.
- Flex layouts that contain grids or scrollable content usually need `minHeight: 0` on every shrinking flex ancestor.
- For dialogs, destroy both the dialog DOM and the view-model instance when closing a dialog that owns its own model key.

## DataGrid and metadata patterns

Use a custom row view model when per-row behavior, actions, or conditional styles exceed simple text binding. For table metadata, prefer server-cache table metadata helpers already used by the extension before adding new server calls.

## Add A Page To An Existing Extension

Use this sequence when adding a new Raptor page to an existing ADK extension:

1. Inspect `client/home.ts`.
2. Identify the extension module name passed to `engine.loadModule(...)`.
3. Identify existing page keys and naming conventions.
4. If CLI component templates are available, scaffold the page and view model:
   `maplarge adk new component page MyPage -e <extension>`
   `maplarge adk new component viewmodel MyPageViewModel -e <extension>`
5. Otherwise add the new view file under `client/views/pages/` unless the work is explicitly a mockup or spike.
6. Add the new view model under `client/view-models/pages/` when the page needs state or behavior.
7. Import both in `client/home.ts`.
8. Register the page before registering the view model.
9. Register a route only if the existing route does not already support the desired URL.
10. Build with:
   `maplarge adk build -extensions <extension> -skipCompileDeclarations -skipCompileUITests`

Minimal wiring:

```ts
engine.addPage(MyPageView());
engine.addViewModels({ modelKey: MyPageKey, viewModels: [MyPageViewModel] });
```
