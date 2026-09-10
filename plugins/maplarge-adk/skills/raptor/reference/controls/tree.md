# Raptor Tree

Renders recursive parent/child data as an expand-collapse tree (carets + nested `<ul>`) or, in `flyoutMenu` mode, as a click/hover nav menu. Built from a single bound object whose recursion is described by key names.

## When to use

- A hierarchy: folder/file trees, layer lists, org charts, nested categories, menu structures.
- You have one object (or array of root nodes) where children live under a known property and you want carets, per-node click selection, and custom row content.
- For a searchable/filterable collapsible tree with keyboard nav, prefer the `CollapsibleTreeViewModel` + `buildCollapsibleTreeView` helper (see Patterns) over hand-wiring.
- For a flat, non-recursive list use `s.listGroup` / `s.list` instead (see `list-group.md`).

## Builder

RSScriptor method: `s.tree(binding, options, build)` -> node `type: "tree"` -> `Tree` RaptorNode.
Signature: `tree(binding: string | Bindings.ITreeStructureBinding, options: ViewDefinitions.ITree, build: (s) => void)`.

The first arg is the structure binding. If you pass a string it becomes `treeStructure.nodeModelKey`; pass the full `ITreeStructureBinding` object to describe the recursion. The `build` callback templates each node (scoped to a single node's data).

Key `ITree` option fields: `flyoutMenu` (render as nav flyout instead of inline tree), `flyoutMenuWidth`, `hideLineElement` (list-style, no tree lines), `ignoreFirstElement` (skip root styling collision), `caretColor`, `useTextAsAnchorTitle`, `title`, `unCamelCase`, `actionHandler` (catch-all handler every in-tree form change vectors through), and `liLeftPadding`/`liRightPadding`/`liTopPadding`/`liBottomPadding`.

```ts
// View — typed to MyVm
const s = RSScriptor.create<MyVm>();
s.tree(
    { treeModelKey: "rootNodes", recursionKey: "children", nodeTextKey: "name",
      expandKey: "isOpen", nodeModelKey: "id", selectedNodeKey: "isSelected",
      action: "onNodePicked" },
    { hideLineElement: false },
    s => s
        .div({ customCssClasses: ["hstack", "w-100"] })
        .contentTemplates(s => s
            .span({ bindings: { text: s.getProp("name") } })
        )
);
```

## Structure binding (`ITreeStructureBinding`)

Set via `bindings.treeStructure` (`IRaptorTreeBinding.treeStructure`). Fields:

- `treeModelKey` — VM property holding the whole tree object/array.
- `recursionKey` — child-array property name on each node (e.g. `"children"`).
- `nodeTextKey` — node property used as the visible label.
- `expandKey` — node boolean property toggled when the caret is clicked (the `Tree` writes the new value back here, then calls `raptorDom.update()`).
- `nodeModelKey` — unique-id property; enables node->binding mapping and selection tracking.
- `selectedNodeKey` — node boolean property marking the active node.
- `action` — handler method name fired on node click/selection.
- `externalRoute` / `popupDashboard` — alternative click behaviors (navigate / open popup).

## Bindings & events

- Per-node templates inside `build` accept normal bindings (`text`, `visible`, `checked`, etc.) scoped to that node — use `s.getProp("...")`.
- `events`: `IEvent_Tree[]` whose `event` is a pointer / contextmenu / keyboard type, or the tree-specific `TreeEventTypes` value `'treeDragAndDrop'` for drag-and-drop reordering.
- Selection/expansion are handled internally by the `Tree` node's pointerdown listeners; the `action` handler (in the structure binding) receives the clicked node's data.

## ViewModel / instance API

Backing class: `Tree extends RaptorNode`. Reach it with `this.raptorDom.nodeT<Tree>("treeViewName")`. Useful members:

- `setSelectedTreeNodeByNodeModel(nodeModel)` — programmatically select (or pass null to clear) by the bound node object.
- `setSelectedTreeNodeByModelKey(modelKey)` — select by a node's `modelKey` (handles cloned/overlay instances).
- `getVisibleViewModels()` — array of the currently-visible node models.
- `insertChild()` / `insertSibling()` — control whether subsequent tree-model inserts attach as a child vs sibling of the actioned node.
- `hasTreeNodeModel(nodeModel)` — membership test against the internal lookup.
- `selectedTreeAnchor` getter; `detachedChildren` map (collapsed groups, used by `CollapsibleTreeViewModel`).

## Patterns

- Searchable collapsible tree: subclass the abstract `CollapsibleTreeViewModel` (implement `nodes` returning `CollapsibleTree.ITreeNode[]` — `{ id, name, isGroup, children?, isExpanded?, notInSearchResults? }`, plus `performSearch`/`performClearSearch`/`isNodeExpanded`/`setNodeExpanded` and override `treeViewName`/`listViewName`/`searchInputId`). Build the matching view with `buildCollapsibleTreeView(options: ICollapsibleTreeViewOptions)` passing `treeViewName`, `searchId`, and a `nodeTemplate` slot. The base class handles search debounce, `<mark>` highlighting, group expand/collapse DOM sync, and keyboard navigation.
- Flyout nav menu: set `flyoutMenu: true` (optionally `flyoutMenuWidth`) to render levels as click-out popovers appended to `<body>` — the tree looks like the list-style sidebar nav.
- Controlled expand state: bind `expandKey` to a per-node boolean and toggle it from your own handler, then `update()` — the tree re-renders open/closed.

## Gotchas

- The caret toggle writes directly to the node's `expandKey` property and calls `raptorDom.update()`; if you omit `expandKey`, expansion is DOM-only and won't survive a re-render.
- `flyoutMenu` flyouts are reparented to `document.body`; they're cleaned up on `destroy()` — don't hold stale references to flyout DOM.
- `actionHandler` is a catch-all for any form input *inside* a tree node; it is separate from the per-click `action` in the structure binding.
- `Directory` is a narrow, prebuilt control (`type: "directory"`, `DirectoryViewModel`) that lists saved dashboards via `persist.list` — it is not a general filesystem browser; build trees with `s.tree`.
- Node templates run once per node and are scoped to that node's data; use `s.getProp(...)`, not VM-level property names.

## Related skills

- Parent: `raptor` (View/VM split, RSScriptor.create, update(), nodeT, RaptorNode lifecycle).
- Siblings: `list-group.md` (flat lists), `accordion.md` (single-level collapsible groups), `sidebar.md`/`nav-tabs.md` (navigation), `foreach.md` (repeating non-hierarchical content), `data-store.md` (feeding tree data from a data source).
