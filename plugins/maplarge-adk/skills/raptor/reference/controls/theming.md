# Raptor Theming

Light/dark (and named) theme reactivity for Raptor UI. Colors live as CSS variables on the themed root element; controls resolve them at access time so they follow the active theme without a re-render. `setGlobalTheme` flips the theme; `RaptorThemeChangedEvent` notifies controls that own a non-CSS surface (canvas, ECharts, Monaco).

## When to use

- Making a control, palette, or chart color follow the app's light/dark theme.
- Switching or force-pinning the global theme programmatically.
- Reading a theme color from TypeScript (e.g. to style a canvas/ECharts option).
- Debugging colors that stay light when the user switches to dark (almost always: a color was hardcoded or resolved once instead of at access time).

## The model: CSS variables on a themed root

The framework keeps theming in CSS, not in JS. `raptorTheme.applyTheme(el)` adds class `ml-raptor-root` and attribute `ml-data-bs-theme="light" | "dark"` to the dashboard root (or each raptor wrapper). The active theme stylesheet defines `--bs-*` (Bootstrap-style tokens, e.g. `--bs-body-bg`, `--bs-body-color`) and extension `--chart-*` vars under that scope, with light/dark values. Because the variables are scoped to the themed element, **any element inside it inherits the right value automatically** — pure-CSS / LESS styling needs no JS.

The only thing you write in TS is resolving a var when you must hand a literal color to a non-CSS API (canvas 2D, ECharts options, Leaflet, etc.). Resolve it **fresh on each access**, never cache:

```ts
function resolveCssVar(name: string): string {
    const root = dom.getRaptorDivs()[0] ?? dom.getBody();
    return getComputedStyle(root).getPropertyValue(name).trim();
}
// e.g. resolveCssVar("--bs-body-bg"), resolveCssVar("--chart-series-1")
```

The framework's own helper is `raptorTheme.getThemeVariableValue(themeVar)` — pass the var name **without** the leading `--` (it prepends it): `raptorTheme.getThemeVariableValue("bs-body-bg")`.

## Switching the theme — `setGlobalTheme`

Top-level function (importable from `"index"`):

```ts
setGlobalTheme(themeName: string, overrideUserPreference: boolean, styleSheetPath?: string)
setGlobalTheme(themeDef: IThemeOptions, overrideUserPreference: boolean, styleSheetPath?: string)
```

- `themeName` — a named theme; `"Light"`/`"Dark"` map to `Default`/`Dark` (see Named themes). A null/empty name falls back to the OS `prefers-color-scheme`.
- `overrideUserPreference` — `false` honors the user's saved `theme` preference; `true` forces this theme and stops tracking the preference (`usePreferredTheme = false`).
- `styleSheetPath?` — optional alternate stylesheet (sets `raptorTheme.styleSheetName`); use for extension-supplied theme CSS.

Switching the theme swaps the `<link>` stylesheet, re-applies `ml-data-bs-theme`, and publishes `RaptorThemeChangedEvent`.

## The theme-change event

`RaptorThemeChangedEvent` (a `ml.EventSystem.PubSubEvent<RaptorThemeChangedEventArgs>`) fires after the new theme stylesheet loads. `RaptorThemeChangedEventArgs` carries `{ themeName, canvasGridLinesColor, canvasBgColor }` (the latter two read live from `--ml-lightBlue` / `--bs-body-bg`).

Subscribe only when your control caches colors in a place CSS can't reach — a canvas you painted, an ECharts instance, a Monaco editor. CSS-styled DOM needs no subscription.

```ts
this._themeSub = ml.EventSystem.EventAggregator.getAggregator()
    .getEvent(RaptorThemeChangedEvent)
    .subscribe((args: RaptorThemeChangedEventArgs) => {
        const dark = args.themeName.toLowerCase().indexOf("dark") >= 0;
        // re-paint / re-init the non-CSS surface for `dark`
    });
// dispose the returned IDisposable in your node's dispose()
```

## How RaptorChart consumes the theme (reference pattern)

`RaptorChart` subscribes to `RaptorThemeChangedEvent`; on fire it recreates the ECharts instance only if the ECharts theme id actually changed (`onThemeChanged` → `getEChartsTheme()` returns `"dark"` when the selected theme contains `"Dark"`, else `undefined`). It registers a single ECharts dark theme via `raptorTheme.registerEChartsTheme()` (palette + axis/legend/tooltip styling) and reads the selected theme from the data context key `_selectedTheme`. Series colors themselves should still come from `--chart-*` vars resolved at access time — see the `echarts` skill.

## The `raptorTheme` singleton (`RaptorTheme`)

Exported instance `raptorTheme` from `renderer/RaptorTheme`. Useful members:

- `selectedTheme: string` (get/set) — current raptor theme name (`"Light"`/`"Dark"`); setting it triggers a theme change.
- `themes: string[]` — theme names for a picker dropdown to bind to.
- `getThemeVariableValue(themeVar): string` — resolve a `--var` (name without `--`) off the first raptor wrapper.
- `getCalendarHeatmapPlotBackgroundDefault(): string` — live `--bs-body-bg`, falling back to the ECharts dark fill.
- `applyTheme(el)`, `createBootstrapLink(cb, href?)`, `registerEChartsTheme()`.

## Named themes

`Theme.themeArray = [Default, Dark, Dark-2, Dark-New, Blue]`. Each is an `IThemeOptions` with `name`, `raptorThemeName` (`"Light"` | `"Dark"` | `"Blue"`), and a full token set (`primary`, `secondary`, `success`, `warning`, `danger`, `background`, `surface`, `error`, plus `*Variant`/`*Pressed`). `theme.getNamedTheme(name)` / `getNamedThemeFromRaptorTheme(raptorName)` resolve them; `setGlobalTheme(name, ...)` does this for you.

## Patterns

1. **Theme-reactive color in TS:** add a getter that resolves the var on each call, then reference it in your options/style — never store the resolved string.

   ```ts
   public get borderColor() { return resolveCssVar("--chart-grid-line"); }
   ```

   In a view binding you can point at the getter as a string path token: `color: ${vmKey}.chartTheme.textMuted`.
2. **Force a theme for a standalone/test page:** `setGlobalTheme("Light", false)` (or `true` to ignore the user preference).
3. **Repaint a canvas on theme flip:** subscribe to `RaptorThemeChangedEvent`, re-resolve your vars, redraw; dispose the subscription with the node.

## Gotchas

- **Resolve at access time.** Reading a CSS var once at construction freezes the color — it won't follow a later switch. The whole reactivity model depends on re-reading.
- **`getThemeVariableValue` takes the bare name** (`"bs-body-bg"`), not `"--bs-body-bg"`.
- **Only canvas/ECharts/Monaco surfaces need the event.** DOM styled by class/CSS var re-themes for free when `ml-data-bs-theme` flips — adding a subscription there is redundant churn.
- **`setGlobalTheme(name, false)` is a no-op if it conflicts with the user's saved preference** (`usePreferredTheme`). Pass `true` to override.
- **`"Light"`/`"Dark"` are aliases**, not raw stylesheet names — they map to `Default`/`Dark`. Use the `themeArray` names for the others.
- **The vars are scoped to `ml-raptor-root`**, not `:root` — resolve off a raptor wrapper (`dom.getRaptorDivs()[0]`), which `getThemeVariableValue` already does.

## Related skills

- `raptor` — parent: View/VM split, RaptorNode lifecycle (`dispose`), `update()`, bindings.
- `echarts` — the chart theming section: `--chart-series-N` palette, `--chart-heatmap-N` ramp, `getDataURL` background, the chart theme helper/service pattern.
- `chart.md` — the `s.chart` node that wires `RaptorChart`'s theme handling.
- `code-editor.md` — Monaco editor, which re-themes via `RaptorThemeChangedEvent`.
- `color-swatch.md` — theme-aware color selection UI.
