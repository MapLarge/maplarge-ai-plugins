# ml-docgen — architecture & design reference

Deep reference for the ml-docgen tool. Pairs with `SKILL.md`. Also mirrored as
`ARCHITECTURE.md` inside the tool repo so it travels with the code.

## Purpose

Generate a Swagger/Redoc-style **config reference** per ADK extension:
`extensions/<Name>/docs/config-reference.md` (diff-friendly, GitHub-rendered) and
`config-reference.html` (self-contained, packaged with the extension). Source of truth is the
extension's **TypeScript config interfaces**; descriptions come from JSDoc; examples come from
the extension's real **config.json**.

## Pipeline (per extension)

1. **Resolve scope** (`manifest.ts`): read `manifest.json`; pick the root config type from
   `Config.DocRootType` (fallback convention `I<sanitizedName>Config`); compute transitive
   `Dependencies`.
2. **Build a TS Program once** (`extract.ts:createProgram`) from the repo-root `tsconfig.json`
   (same resolution the editor uses) — reused across all extensions for speed. This is why the
   tool must run inside an ADK extensions checkout.
3. **Extract** (`extract.ts`): locate the root interface declaration, walk its properties with
   the type checker into a `DocType[]` IR.
4. **Attach examples** (`examples.ts`): walk config.json and the type tree in parallel by field
   name, attaching a representative (array/depth-capped) example to each model.
5. **Order** (`outline.ts`): build the containment tree + Shared Types forest for nav/index.
6. **Render** (`render.ts`): emit Markdown and self-contained HTML.

## IR (`model.ts`)

- `DocField { name, typeLabel, link?, links[], required, doc? }` — `link` = primary linked
  model (for the type-label anchor); `links` = **all** documented models referenced by the
  field incl. union members + array element (used for containment edges).
- `DocType { name, anonymous, doc?, fields[], subtypes[], example? }` — `subtypes` = documented
  interfaces that `extends` this one.
- `DocModel { extension, rootTypeName, dependencies[], types[] }` — `types` insertion-ordered,
  root first.

## extract.ts details

- **Root lookup** (`findRootDeclaration`): scans source files for the interface/type-alias by
  name, preferring real `/extensions/` source over generated `/.adk/` `.d.ts` (rank()).
- **Traversal** (`ensureModel` → `describe` → `buildField`):
  - Dedup models by **symbol** (`nameBySymbol`) so generic instantiations (e.g.
    `IFilterPanelItem<IFilterOptions>`) collapse to one model — prevents `IFoo2` duplicates.
  - Also dedup by `Type` identity (`nameByType`).
  - `describe()` returns `{label, link?, links[]}`. Handles: type parameters → bare label;
    unions → boolean detection, string/number literal enums (`"a" | "b"`), optional unwrap
    (`T | undefined` → T), and otherwise joins members AND collects every member's links;
    arrays → element label + `[]`, propagating links; primitives → label; named in-scope types
    → expand + link; named out-of-scope (framework) types → opaque label only; anonymous object
    literals → expand inline under a generated `Parent_field` name.
  - `MAX_DEPTH=10`, `MAX_MODELS=400` guards.
- **Scope** (`inScope`): a symbol is in-scope (expanded into its own documented section) if any
  declaration is under `/extensions/` OR in a generated `_<Ext>.d.ts` / `*__<Ext>.d.ts` for the
  extension or a transitive dependency. Framework types (raptor, `MapLarge.Server`) are
  out-of-scope → shown as opaque type labels; their real shape still shows via the example JSON.
  This keeps docs from exploding into the whole MapLarge query/layer type graph.
- **Comments** (`symbolDoc`): `/** */` JSDoc first (`getDocumentationComment`); fall back to
  `//` leading line comments read from source (`getLeadingCommentRanges`). The `//` fallback
  only works when the type resolves to **source** — generated `.d.ts` strip `//`.
- **Subtype index** (`buildSubtypeIndex`): scans all interface `extends` clauses, mapping base
  symbol → subtype types. `documentSubtypes` attaches in-scope subtypes to a type's `subtypes`
  and documents them. Subtypes are a SEPARATE concern from containment (rendered as collapses,
  not folded into the containment tree).

## outline.ts details (nav / index ordering)

- **Primary** types = non-subtype documented types. Subtypes ride with their base (collapses in
  HTML; indented `_(variant)_` entries in the MD index).
- **Containment edge** A→B when A has a field whose `links` includes primary B.
- **Shared** = primary type referenced by **2+ distinct primary parents** (and not the root).
- **Main tree**: DFS from the root type, descending only into non-shared children.
- **Shared region**: every primary type not reached in the main tree — shared types + types
  only reachable through them (or only via unions/subtypes). Nested among themselves; this is
  the bottom "Shared Types" group. (Capturing union members in `links` was essential — without
  it, union-typed fields like `serviceConfig: A | B` lost edges and the targets became
  top-level orphans.)
- `bodyOrder` = tree pre-order then shared pre-order; `sharedStartIndex` marks the boundary.

## render.ts details

- **Markdown**: indented `## Contents` tree (2 spaces/depth) with a `- **Shared types**` group;
  body sections in `bodyOrder` with subtypes emitted right after their base and a `# Shared
  Types` divider before the shared region. Keeps a `**Known variants:**` line per type.
- **HTML** (self-contained, inline CSS + JS):
  - Sidebar nav = nested `<ul>` containment tree (real nesting → indentation), each `<li>` with
    a `nav-sub` `<details>` collapse listing its subtypes, plus a bottom `nav-group` "Shared
    types" section.
  - Main body: each type = `<section>` (heading, doc, fields table, **collapsed** Example
    `<details>`); subtypes nested in a **collapsed** `<details class="subtypes">` after the
    parent. A `<h2 class="shared-divider">Shared Types</h2>` precedes the shared region.
  - Everything collapsed by default. A small inline script (`mlOpenTarget`) opens any collapsed
    `<details>` ancestors of a targeted anchor on load/hashchange so links into collapsed
    sections reveal themselves (browsers don't auto-expand).
  - Sidebar sizing: `width:max-content; min-width:240px; overflow-x:hidden` + `white-space:
    nowrap` on links so deep indentation never triggers a horizontal scrollbar.

## Conventions & gotchas

- **DocRootType ≠ always `I<Name>Config`.** It must match the literal root of config.json.
  Usually `I<Name>Config`, but it can be a differently-named or wrapper type — e.g. a root
  interface that wraps an inner config, declared as `{ MyExt: IMyExtConfig }`.
- **Stale `.d.ts`:** a dependent extension sees a shared type via `.adk/types.d/_<Dep>.d.ts`,
  refreshed only by a build (`mlcomp "<Name>"` / `maplarge adk build`). Source edits to shared
  types appear in the OWNING extension's docs immediately but in dependents only after rebuild.
- Prefer `/** */` JSDoc (not `//`) on shared/dependency config interfaces — only JSDoc survives
  `.d.ts` generation.
- Run is timestamp-free for clean diffs. `tsx` runs the TS directly (no build step for the tool).
- Typecheck the tool with `npx tsc --noEmit` from the tool dir.

## Extending — common tasks

- New documented relationship in nav/body → change `outline.ts` (ordering) and `render.ts`.
- Capture more reference kinds (e.g. record/index types) → extend `describe()` in `extract.ts`
  to populate `links`.
- New extension onboarding → add `Config.DocRootType` to its manifest; ensure its config root
  interface exists; run `--all`.
- Output location/format → `index.ts` (paths) and `render.ts` (templates).
