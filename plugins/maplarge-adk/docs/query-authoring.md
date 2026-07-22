# Query Authoring

Use MapLarge JSON query documents as the default output for ADK extension work, including front-end code, running-server API calls, and CLI flows that accept query documents. The fluent API is also acceptable when it clearly matches the surrounding code, but JSON should stay the default in most cases. Use SQL-like syntax only when the user explicitly asks for it or when it is clearly more appropriate than the JSON or fluent forms.

## Rules

- Start from the closest schema, descriptor, or existing query JSON in the workspace.
- Check likely extension paths first, such as `client/data/`, `client/layers/`, `client/view-models/`, and server code that returns query documents.
- Keep field names, aggregate names, and filter values grounded in local code or user-provided schema.
- Treat any `take` value less than `1` as unbounded. `take: 0` does not mean "return zero rows"; it means "no limit".
- If a request is underspecified, ask for the missing schema details instead of inventing them.
- Prefer JSON over the fluent API unless the surrounding code already centers the fluent form.
- Do not switch to SQL just because the query is sent through a REST endpoint, a pre-REST `/Remote/` action, or a CLI wrapper.
- If you show a fluent or SQL-like example, label it as secondary and keep the JSON form first.

## Canonical shape

Common extension code uses lowercase `IQuery` keys such as:

- `table`
- `where`
- `sqlselect`
- `groupby`
- `orderby`
- `join`
- `take`
- `usenullvalues`

Queries are commonly executed as:

```ts
const query = ml.data.query.getQueryFromJSON(json);
const result = await query.runAsync();
```

## Table model notes

- Use table paths in `account/table` form unless the task explicitly needs a fixed table version.
- `account/table` resolves to the active version. `account/table/version` targets a specific version and should be treated as a point-in-time reference.
- `_system/...` tables are platform-managed. Query them only when the task explicitly needs system data and the user/server permissions allow it.
- `_sq_...` tables are subquery/cache artifacts, not durable extension schema. Do not use them as configured target tables or manifest table names.
- Column types are fixed MapLarge types such as `Int32`, `Int64`, `Double`, `String`, `Json`, `Guid`, `DateTime`, `XY`, `Line`, and `Poly`. Keep generated schemas aligned with local examples or core `ColumnType`.
- Table tags are table-level metadata. Avoid custom keys that start with `ml-` or `_` unless using a documented platform tag.

## Common patterns

Simple filtered query:

```ts
let json: IQuery = {
  usenullvalues: true,
  take: -1,
  table: TaskingRequestShortTableName,
  where: [[
    { col: whereColumn, test: "Equal", value: whereCriteria },
  ]],
  sqlselect: ["*", "XY", "Line", "Polygon"],
};
```

Use a positive `take` only when the caller actually wants a capped result set. Do not use `take: 0` for schema-only checks or "dry runs"; in `core`, queries with `take <= 0` are treated as unlimited.

Grouped query:

```ts
let json: IQuery = {
  table: TaskingRequestShortTableName,
  sqlselect: ["provider"],
  orderby: ["provider"],
  groupby: ["provider"],
};
```

Join with a nested query:

```ts
let json: IQuery = {
  table: `${TaskingAccount}/${ml_satelliteOperations.getEnvironmentPrefix()}${orderTableName}`,
  join: {
    table: {
      query: {
        table: TaskingRequestShortTableName,
        where: [[
          { col: "primaryKey", test: "Equal", value: apiRequestPk },
        ]],
        sqlselect: ["primaryKey as ao_primaryKey", "name as ao_name"],
      },
    },
    method: "Equals",
    leftcolumn: "apiRequestId",
    rightcolumn: "ao_primaryKey",
    cartesian: true,
  },
  sqlselect: ["*", "ao_name"],
};
```

## Common mistakes

- Treating SQL as the source of truth instead of the JSON document the extension will actually use.
- Translating a JSON query into SQL just because the execution path happens to go through a server API or CLI command.
- Reaching for SQL because nearby code happens to include a query string when JSON or fluent forms would still fit the task better.
- Inventing operators or clauses that do not match local query conventions.
- Dropping schema grounding when translating a natural-language request into a query.
- Using `take: 0` to mean "no rows". If you only need column metadata from server-side extension code, prefer `systemContext.Database.GetExistingTable(...).GetColumnInfo()` over issuing a query.

## Validation

When a local query execution surface exists, validate before treating a query as correct:

- Existing extension code may expose `validate`, `validateAsync`, or an equivalent wrapper next to `run` or `runAsync`.
- Use the same table names, server/profile context, and auth path that the extension already uses.
- If no local validation path is visible, keep the query grounded in local schema and ask for the missing table/column details instead of guessing.
