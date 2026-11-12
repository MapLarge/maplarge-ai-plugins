# Data Table - View Definition JSON

<!-- Automatically generated, do not edit -->

In a view definition a data table is a node with "type": "dataTable". Its options sit on the node itself, in the same shape the View authoring arm builds, because the View helpers only produce plain data.

## Node Shape

In the dashboard editor a table binds to a DataTableTransform. Assigning a data source to a Data Table widget creates the transform, names it \<dataSource>_\<placement>_dtvm, sets its filterIsolationKey to the node's viewName, and binds the node to it:

```json
// the dataTable node
{
    "type": "dataTable",
    "viewName": "busStopsTable",
    "height": 400,
    "bindings": { "data": "busstops_busStopsTable_dtvm" },
    "transformNames": ["busstops_busStopsTable_dtvm"],
    "columns": [
        { "field": "StopName", "header": "Stop Name", "width": 250 }
    ]
}

// the transform it binds to
{
    "name": "busstops_busStopsTable_dtvm",
    "className": "DataTableTransform",
    "classModule": "data-ui/data-table/DataTableTransform",
    "options": { "dataSource": "busstops", "filterIsolationKey": "busStopsTable" }
}
```

The transform discovers every column of the source except geometry columns; columns on the node rename, size or format them, and the Columns page shows how to show only some. Options on the node apply on top of the transform's.

A view definition written by hand can instead give the node its own data, with saved column state:

```json
{
    "type": "dataTable",
    "viewName": "busStopsTable",
    "data": {
        "strategy": "dataStoreData",
        "args": { "dataStore": { "binding": "dataStore" }, "dataSourceName": "busstops" }
    },
    "schema": {
        "type": "static",
        "entries": { "StopName": { "type": "string" }, "Benches": { "type": "number" } }
    },
    "columns": [
        { "field": "StopName", "header": "Stop Name", "width": 250 },
        { "field": "Benches", "header": "Benches", "width": 120 }
    ],
    "storage": { "strategy": "userPrefs" }
}
```

## Size

- The table fills its container and has no height of its own, so it needs one from the node or its parent.
- Give the dataTable node a pixel height, such as "height": 400.
- In a slide's floating panel, give the node a width, a height and a placement rect, like the other panels.

## Value Forms

Each option takes one of these forms; the property tables on each page list which forms an option accepts in its Authoring column.

**View Definition Value Form**:

| Property | Type | Required | Description | Example |
| --- | --- | --- | --- | --- |
| `literal` | `string \| number \| boolean \| object \| array` | no | Written as is, e.g. a column header or a pixel width. | `"header": "Stop Name"` |
| `strategy ref` | `{ strategy: string; args?: object }` | no | Picks a built-in engine for an engine-typed option such as data, rowScrolling, filtering, or storage. args may be left out when every arg is optional. | `"rowScrolling": { "strategy": "virtualScroll", "args": { "fixedRowHeight": 26 } }` |
| `binding` | `{ binding: string }` | no | Names a member of the dashboard ViewModel that supplies the value. When no ViewModel has that member, the table reports that the binding did not resolve on any live ViewModel context. | `"dataStore": { "binding": "dataStore" }` |
| `rule` | `{ where: WhereCondition; applyValue: T }` | no | Applies applyValue while where matches the table state; see the Options page for the rule reference. | `"rowStriping": { "where": { "field": "isFiltered", "test": "Equal", "value": false }, "applyValue": true }` |

## viewName and Storage

- viewName names the table on its dashboard. The table's identity is \<dashboardId>_\<viewName>, or \<dashboardId>_\<node key> when viewName is missing.
- storage with the userPrefs or localStore engine uses that identity as its key when preferenceKey or prefix is left out, so a table with a viewName needs no key of its own.
- Set preferenceKey only to share or rename saved state. It is a plain string; wrap it in { "binding": "..." } only when a ViewModel member holds the key.
- Outside a dashboard there is no dashboard id, so userPrefs needs an explicit preferenceKey.

## Cell Templates

A column's contentTemplates is an inlineContentTemplates object whose viewDef is the cell's markup. Inside it, a binding path is written as a sentinel the table replaces with the real path when the cell mounts:

```json
{
    "field": "status",
    "header": "Status",
    "contentTemplates": {
        "type": "inlineContentTemplates",
        "viewDef": {
            "type": "div",
            "contentTemplates": [
                { "type": "span", "badge": true, "textBgColor": "info", "bindings": { "text": "@@DT_CELL/displayValue@@" } }
            ]
        }
    }
}
```

- @@DT_CELL/displayValue@@ is the display value, after transformValue and the formatter; @@DT_CELL/rawValue@@ is the stored field value.
- @@DT_CELL/row@@ is the whole row; @@DT_CELL/row@@.status is one of its fields.
- @@DT_CELL/field@@ is the column's field name, for columns that have one.
- @@DT_CELL/scope/name@@ is the path of the column's scope entry name, declared as "scope": { "name": { "binding": "member" } }.
- A sentinel goes only where a binding path goes (bindings, events). customCssClasses is static text: a look that depends on the value is a theme.cellThemes rule, or one node per look with its own visible path.

## Charts in Cells

A chart in a cell is a raptorChart viewDef whose series data binds to the cell's value. The field holds the points as JSON text, which the parseJson formatter turns into the array the chart reads:

```json
{
    "field": "trend",
    "header": "Trend",
    "width": 170,
    "formatter": "parseJson",
    "contentTemplates": {
        "type": "inlineContentTemplates",
        "viewDef": {
            "type": "raptorChart",
            "height": 26,
            "disableMenu": true,
            "options": {
                "backgroundColor": "transparent",
                "xAxis": { "type": "category", "show": false, "boundaryGap": false },
                "yAxis": { "type": "value", "show": false, "scale": true },
                "series": [
                    { "type": "line", "smooth": true, "symbol": "none", "lineStyle": { "width": 2 }, "data": "@@DT_CELL/displayValue@@" }
                ]
            },
            "bindings": { "traverseRaptorChart": true }
        }
    }
}
```

- series.data is the sentinel as a string, never wrapped in an array; bindings.traverseRaptorChart makes the chart read it as a binding path.
- height 26 fits the default 25 px row; a taller chart needs a taller fixedRowHeight on the row scroll engine.
- yAxis.scale true fits each cell's own range, and a sparkline has no grid, so it stays inside the row.
- The column's field is the JSON column itself, with no key of its own: a key other than the field leaves the discovered column in place, showing the raw text beside the chart.

## Related

- [types](types.md): the declarations of the types used here, `DeclarativeRule`; search it for a name rather than reading it whole
