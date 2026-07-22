# Raptor Data Store (IDataStore)

The dashboard-level manager for **named data sources and their filters**. It is how a view-model declares its tables/queries once, applies named where-clauses to them, and re-renders reactively when filtered results change.

## When to use
- A view-model needs one or more queryable data sources (a table name, a built `ml.data.query.IQuery`, or a prebuilt `ml.data.IDataSource`).
- You want to filter a data source by name (e.g. a sidebar filter, a map draw-to-select, a grid selection) and have every consumer of that source react.
- You want to subscribe a VM getter / control to *filtered* live results via `onDataSourceChanged`.
- You need stored-filter semantics: each filter has a stable **name** key, so re-setting it replaces the prior clause and other controls can read/remove it.

**Not** an RSScriptor node — there is no `s.dataStore(...)` / `s.dataSource(...)` builder. It is a programmatic API on the view-model. Map layers bound to a source use the sibling `map.md` layer store; bind controls to a source by passing a `dataSourceName` string (see `data-grid.md`, `numeric-range-filter.md`).

## Reaching the store
On a `DynamicViewModel` (the base for any data-driven page VM):
- `this.dataStore` → the `IDataStore` (concretely a `ScopeDataStore` exposing `IScopeDataStoreWrapper`; `MinimalDataStore` is the lightweight reference impl).
- The VM also forwards the common calls: `this.getDataSource`, `this.getDataSourceAsync`, `this.onDataSourceChanged`, `this.onDataSourceError`, `this.setFilter`, `this.removeFilter`, `this.getFilterCount`, `this.areDataSourcesLoaded`, and the protected `this.initializeDataSources(sources)` / `this.updateDataSource(sources)`.
- From a RaptorNode (no VM in hand): `(this.raptorDom as any)?.vm?.dataStore`.

## Registering sources
`register(sources: ISimpleDataSource | ISimpleDataSource[])` — call once during VM init (the protected `initializeDataSources` wraps this and wires the editor list). Each `ISimpleDataSource`:

```ts
this.dataStore.register([
  { name: "myThing", label: "My Things", dataSource: "myaccount/mytable" },
  { name: "myStats", dataSource: ml.data.query.create()/* ...IQuery... */ },
]);
```
`dataSource` is a `DataSourceDefinition = string | ml.data.query.IQuery | ml.data.IDataSource`. `update(sources)` replaces a definition by `name`; `remove(name | name[])` drops it. `updateParams(params)` sets scope params referenced in query JSON as `{{propertyName}}` — set them **before** registering sources that use them (the `MinimalDataStore` does not support params).

**Child / derived source (sub-query).** A source's `dataSource` can reference another *registered* source as a sub-query via the template `"{{otherName:asSubQuery}}"` (e.g. `{ name: "gridSource", dataSource: "{{tasks:asSubQuery}}" }`). The child **inherits the parent's active filters** (a filter on the parent flows down into the child), while filters set on the **child are independent and do not propagate up** to the parent. Use this to give one consumer (say a grid) an extra filter that other consumers sharing the parent (say a map) must not see — instead of filtering the shared parent, which would affect everyone.

## Filters — named where clauses
`setFilter(name, filter: INamedFilter)` adds or **replaces** a filter keyed by `filter.name`; `removeFilter(name, filterName)` clears it. `INamedFilter` / `DataStore.IFilter`:
```ts
await this.dataStore.setFilter("myThing", {
  name: "statusFilter",                 // stable key — re-setting replaces it
  label: "Status",                       // optional friendly name
  filter: { col: "status", test: "Equal", value: "open" }, // DataSourceFilter
});
await this.dataStore.removeFilter("myThing", "statusFilter");
```
`DataSourceFilter` accepts an `ml.data.query.IQueryWhere` (`{ col, test, value, exp? }`), an array (`IQueryWhere[]` = AND group, `IQueryWhere[][]` = OR of AND groups), or an `IQueryJoin`. Setting a filter whose `filter` is null/empty removes it. The store AND-combines all active named filters via `ml.data.query.combineWhereClauses` before producing the data source. `setFilter`/`removeFilter` return a `Promise<void>` that resolves **after** the next data-source update, so `await` before reading results.

Inspect filters: `getFilter(name, filterName)`, `getFilterNames(name)`, `getNamedFilters(name)` (only filters with a clause), `getFilterCount(name)`.

## Subscribing & reading
`onDataSourceChanged(name, callback, opts?, skipInitialCallback?)` returns an `IDisposable`; the callback fires immediately if the source is already loaded (unless `skipInitialCallback`) and on every subsequent change. Updates are rate-limited/batched, so co-changing sources fire once. After your callback you typically `update()` the affected view.
```ts
this._sub = this.onDataSourceChanged("myThing", async ds => {
  this._rows = /* consume ds */;
  this.update("myList");
});
```
`opts: IDataSourceCallbackOptions` → `filtersToIgnore?: "All" | string[]` (return the source without those named filters) and `triggerOnTimezoneChange?: boolean`. `onDataSourceError(name, cb)` registers a `DataSourceErrorCallback`.

Pull on demand: `getDataSource(name, opts?)` returns the current `ml.data.IDataSource` (null until loaded); `getDataSourceAsync(name, opts?)` waits for load. Status: `areDataSourcesLoaded`, `hasDataSource(name)`, `getDataSourceStatus(name): IDataSourceStatus` (`{ loaded, processing, errors }`), `dataSourceNames`, `getDefinitions()`.

## Patterns
**Filter on selection.** A control writes a named filter; the grid/chart subscribed to that source re-renders automatically:
```ts
public selectThing(id: string) {
  this.dataStore.setFilter("myThing", { name: "selection", filter: { col: "id", test: "Equal", value: id } });
}
public clearSelection() { this.dataStore.removeFilter("myThing", "selection"); }
```
**Read unfiltered alongside filtered.** Subscribe twice (or call `getDataSource`) — once normally, once with `{ filtersToIgnore: "All" }` — to show "N of M".

**Stable filter keys per producer.** Give each producing control its own filter name (`"sidebar_status"`, `"map_geo"`, ...) so they compose by AND and each can clear only its own clause.

## Gotchas
- Filters merge with **AND** only. For OR, build a single `IQueryWhere[][]` clause and set it under one name.
- `setFilter`/`removeFilter` resolve after the update completes — `await` them; reading `getDataSource` synchronously right after returns the pre-update source.
- Re-`setFilter` with the same `name` replaces (does not stack). Different names stack.
- `getDataSource` returns `null` before initial load — guard with `areDataSourcesLoaded` / `getDataSourceStatus`, or use `getDataSourceAsync`.
- `updateParams` must run before registering sources that reference the params; unsupported on `MinimalDataStore`.
- `register` is for first-time setup; use `update` to change an existing definition (re-registering the same name re-creates the entry).

## Related skills
- Parent: **raptor** (View/VM split, `update()`, `DynamicViewModel`, `RSScriptor.create`).
- **data-grid.md** and **numeric-range-filter.md** — controls that bind to a source by `dataSourceName` and read/write store filters.
- **map.md** — the layer store and map layers driven off registered data sources.
- **quick-select.md**, **select.md**, **date-time.md** — common producers of named filters.
- **echarts** — chart series fed from a subscribed data source.

See the Reference section below for the full `IDataStore` / `IScopeDataStoreWrapper` method tables and supporting types.

---

## IDataStore — full surface

| Member | Signature | Notes |
|---|---|---|
| `areDataSourcesLoaded` | `get => boolean` | true once all sources finished initial load |
| `dataSourceNames` | `get => string[]` | names of registered sources |
| `register` | `(ISimpleDataSource \| ISimpleDataSource[]) => void` | first-time setup; triggers load |
| `update` | `(ISimpleDataSource \| ISimpleDataSource[]) => void` | replace a definition by name |
| `remove` | `(string \| string[]) => void` | drop sources, detaches callbacks |
| `getDefinitions` | `() => ISimpleDataSource[]` | (`DataStore.ISource[]` on ScopeDataStore) |
| `updateParams` | `(any) => void` | sets scope params `{{name}}`; set before register; unsupported on MinimalDataStore |
| `setFilter` | `(name, INamedFilter) => Promise<void>` | add/replace by `filter.name`; resolves after update |
| `removeFilter` | `(name, filterName) => Promise<void>` | clear filter; resolves after update |
| `getFilterCount` | `(name) => number` | |
| `getFilter` | `(name, filterName) => INamedFilter` | |
| `getFilterNames` | `(name) => readonly string[]` | |
| `getNamedFilters` | `(name) => Record<string, INamedFilter>` | only filters with a clause |
| `onDataSourceChanged` | `(name, DataSourceCallback, opts?: IDataSourceCallbackOptions, skipInitialCallback?: boolean) => IDisposable` | fires initially if loaded; batched/rate-limited |
| `onDataSourceError` | `(source, DataSourceErrorCallback) => IDisposable` | |
| `getDataSource` | `(name, opts?: IDataSourceCallbackOptions) => ml.data.IDataSource` | null until loaded |
| `getDataSourceAsync` | `(name, opts?) => Promise<ml.data.IDataSource>` | waits for load |
| `hasDataSource` | `(name) => boolean` | |
| `getDataSourceStatus` | `(name) => IDataSourceStatus` | `{ loaded, processing, errors }` |

### IScopeDataStoreWrapper (ScopeDataStore — the default impl) adds
| Member | Signature | Notes |
|---|---|---|
| `dataStore` | `get => DataStore` | underlying scope control |
| `scopeObject` | `get => DataStore.IScopeData` | scope data object |
| `scope` | `get => IScope` | dashboard scope |
| `dataSources` | `get => IDataSourceInfo[]` | `{ name, label, dataSource }[]` |
| `showFilterEditor` | `(name) => void` | built-in filter editor dialog |
| `showAddData` | `() => void` | built-in data picker |
| `showAddAnalytic` | `() => void` | built-in analytic picker |

The other concrete impl is `MinimalDataStore` (reference implementation; no params/editor UI).

## Supporting types

```ts
interface ISimpleDataSource {
  name: string;                 // key for getDataSource / setFilter
  label?: string;
  dataSource: DataSourceDefinition;
  initialFilters?: Record<string, INamedFilter>; // applied at register time
}

type DataSourceDefinition = string | ml.data.query.IQuery | ml.data.IDataSource;

interface INamedFilter {        // === DataStore.IFilter (extends INamedFilter)
  name: string;                 // stable key; re-setting replaces
  label?: string;
  filter: DataSourceFilter;     // null/empty => removed
}

type DataSourceFilter =
  | ml.data.query.IQueryWhere          // single clause
  | ml.data.query.IQueryWhere[]        // AND group
  | ml.data.query.IQueryWhere[][]      // OR of AND groups
  | ml.data.query.IQueryJoin;

interface IQueryWhere { col: string; test: string; value: any; exp?: string; }

interface IDataSourceCallbackOptions {
  filtersToIgnore?: "All" | string[]; // return source minus these named filters
  triggerOnTimezoneChange?: boolean;
}

interface IDataSourceStatus { loaded: boolean; processing: boolean; errors: string[] | null; }

type DataSourceCallback = (ds: ml.data.IDataSource) => Promise<void> | void;
type DataSourceErrorCallback = (errors: string[]) => Promise<void>;
```

`IQueryWhere.test` values are the standard MapLarge comparison ops (e.g. `Equal`, `NotEqual`, `GreaterThan`, `LessThan`, `Contains`, `In`, geo ops like `DWithin`/`Overlaps`). Use `ml.data.query.combineWhereClauses(clauses, "And" | "Or")` to merge clauses yourself; the store does the AND-combine internally before exposing the filtered `ml.data.IDataSource`.

## Filtered-source mechanics
The store produces a filtered `ml.data.IDataSource` by AND-combining all active named-filter clauses and applying them (`ml.data.dataSource.addFilter`). `getDataSource(name, { filtersToIgnore: "All" })` returns the unfiltered source; `{ filtersToIgnore: ["foo"] }` returns it with all filters except `foo`. The same options select which variant a subscription receives.

## VM convenience forwarders (DynamicViewModel)
`initializeDataSources(sources)` (protected; wraps `register` + wires the editor source list), `updateDataSource(sources)`, `getDataSource`, `getDataSourceAsync`-equivalent via store, `onDataSourceChanged`, `onDataSourceError`, `setFilter`, `removeFilter`, `getFilterCount`, `areDataSourcesLoaded`, `dataSources`, plus design-time helpers `showAddData` / `showAddAnalytic` / `showFilterEditor`.
