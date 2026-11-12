# Extension Dependencies

An extension can import client code from another extension. This page covers declaring the dependency, versions, importing from it, server-side code, a worked example, and what goes wrong.

`MapLarge.PluginDependencies` (the `plugin-dependencies` SDK) is the library every server plugin compiles against. Despite the name, it is not how extensions depend on each other.

Build and recovery steps on this page were checked on MapLarge CLI 1.0.90 to 1.0.94. Other details were tested on 1.0.94.

## Declaring a dependency

Add a top-level `Dependencies` array to `manifest.json` when this extension's client code imports from another extension through an `ext/<Name>/...` path.

```json
"Dependencies": [
  { "Extension": "producer" }
]
```

- `Extension` must match the other extension's manifest `Name`, the same name used in its `ext/<Name>/...` import path.
- Declare every extension you import from. An undeclared import can appear to work when the other extension happens to build first, then fail with `TS2307` when the order changes, for example when an extension gains a `Dependencies` entry. Without `Dependencies`, the build order depends on how the filesystem lists the extension folders.
- Declare only the extensions your own code imports from. If `alpha` imports from `beta` and `beta` imports from `gamma`, `alpha` declares only `beta`; `beta` declares `gamma`, and the ADK builds them in order.
- In a full build (`maplarge adk build` with no `-extensions`), the ADK builds each extension after the extensions it depends on. An explicit list such as `-extensions consumer,producer` is built in the order given, even when it conflicts with `Dependencies`. The ADK prints a warning, and the build fails with `TS2307` if a dependency's types file is missing or empty, or with `TS2305` (`has no exported member`) if it is out of date.
- The build does not check that `Extension` names a real extension. A misspelled name gets no warning and behaves like an undeclared dependency: the build may pass because the other extension happens to build first, or fail with `TS2307` on the import, which does not point to the manifest. When you see that error, check the spelling in `Dependencies`.

## Versions

Each `Dependencies` entry can include an optional `Version` rule that limits which versions of the other extension satisfy the dependency. Leave it out to accept any version.

```json
"Dependencies": [
  { "Extension": "producer", "Version": ">=2.8.0" }
]
```

- Write an operator (`>=`, `>`, `<=` or `<`) followed by a version, or an interval such as `"[2.0.0,3.0.0)"`, meaning 2.0.0 up to but not including 3.0.0 (`[` includes the bound, `)` excludes it).
- Always include an operator. A bare version such as `"2.8.0"` can mean "2.8.0 or newer" or "exactly 2.8.0", depending on the CLI version.
- `^` and `~` are not supported. A rule that cannot be parsed usually produces no error; it simply never matches.
- `maplarge adk build` ignores `Version` and uses `Dependencies` only for build order.
- `maplarge adk init` checks `Version` only for dependencies that are not in the project (resolved from the server or extension repos, on servers 4.92 and later), and fails if no matching version is found unless you pass `--bypass-dependency-failures`. A dependency in the same project is used whatever its version; newer CLIs print a warning.

## Consuming client exports

After declaring the dependency, import from the other extension with an `ext/<Name>/<path>` module path:

```ts
import { sayHello } from "ext/producer/greetings";
```

- `ext/<Name>/<path>` refers to `<path>.ts` under the `client/` folder of the extension whose manifest `Name` is `<Name>`: drop `client/` and `.ts`. For example, `ext/producer/greetings` is `extensions/producer/client/greetings.ts`. `<Name>` is the manifest `Name`, which should match the extension's folder name (see [Common Manifest Gotchas](extension-reference.md#common-manifest-gotchas)).
- Only `export`ed declarations can be imported. Anything the other extension does not export is not visible to your code.
- TypeScript checks these imports against the other extension's types file, `.adk/types.d/_<Name>.d.ts`. The ADK regenerates it whenever that extension's declarations compile: in a full build (`maplarge adk build` with no `-extensions`) or a multi-extension build, or any build with `-disableOptimizations`. A single-extension build skips this. If the types file is empty, the import fails with `TS2307`; if it is out of date, with `TS2305`; if it is missing, a single-extension build fails with `TS6053` (see [Failure modes](#failure-modes)).
- Put imports that only register something with the other extension, such as a call to a registry function it exports, in `client/init.ts`, so they run when your extension loads. New extensions don't include this file; create it. `client/init.ts` itself cannot be imported as `ext/<Name>/init`.
- Dashboard IDs and URLs, such as `ext/producer/home`, look like module paths. They work as imports only when a matching `client/<path>.ts` exists; the default `home.ts` is one.

## Server-side code

`Dependencies` and `ext/<Name>/...` imports apply to client code. The server SDK has no method for calling another extension's server code directly.

- To read another installed extension's name, version, config or packaged files, use the SDK's `GetExtensionInfo` method.
- To use another extension's server logic, call its HTTP endpoints. The SDK's `CreateManagedHttpClient` method creates an HTTP client.
- Do not reference another extension's plugin DLL from your `.csproj`. It may compile, but it is untested at runtime.

## Worked example

Start from an ADK project that has been initialized against a MapLarge server; see [Create a Project or Extension](adk-workflows.md#create-a-project-or-extension) and [Initialize](adk-workflows.md#initialize). This example creates a `producer` extension that exports a function, and a `consumer` extension that imports it.

1. Create both extensions, then rerun `init` with your profile so the ADK picks them up:

   ```bash
   maplarge adk new extension producer
   maplarge adk new extension consumer
   maplarge adk init -profile <your-profile>
   ```

   In a project that has already been built, follow `init` with one `maplarge adk build -disableOptimizations` (see [Failure modes](#failure-modes)).

2. Create `extensions/producer/client/greetings.ts` and export a function. Other extensions import this file as `ext/producer/greetings`:

   ```ts
   export function sayHello(name: string): string {
     return `Hello, ${name}`;
   }
   ```

3. In `extensions/consumer/manifest.json`, add a top-level `Dependencies` array. New extensions don't include one, so add a comma after the property before it:

   ```json
   "Dependencies": [
     { "Extension": "producer" }
   ]
   ```

4. Create `extensions/consumer/client/init.ts`; new extensions don't include one. Code in this file runs when the extension loads:

   ```ts
   import { sayHello } from "ext/producer/greetings";

   console.log(sayHello("world"));
   ```

5. Build:

   ```bash
   maplarge adk build
   ```

   The `Dependencies` entry guarantees that the build compiles declarations for `producer` before `consumer`, whatever order the folders are listed in. The build finishes without errors, and `.adk/types.d/_producer.d.ts` contains `declare module "ext/producer/greetings"`.

## Failure modes

Most dependency failures come down to the other extension's types file, `.adk/types.d/_<Name>.d.ts`, being missing, empty or out of date when your extension compiles. When an `ext/<Name>/...` import fails, check that file first.

A broken setup can keep building while old types files are still in place, and only fail after `maplarge adk init`, on a checkout without `.adk/types.d/`, or after a type changes. The build stops at the first extension that fails, so extensions after it don't compile.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `TS2307: Cannot find module 'ext/<Name>/...' or its corresponding type declarations` while compiling your extension's declarations, before `<Name>`'s | `<Name>` is missing from `Dependencies` or misspelled there. This can go unnoticed while `<Name>` happens to build first, and show up later, for example after `<Name>` gains its own `Dependencies` entry, or on a machine whose filesystem lists folders in a different order | Declare `<Name>` and check the spelling against its manifest `Name`. `maplarge adk init` fails on an entry that matches no extension in the project, on the server or in a repo (`... was not found in any source`). It deletes the types files before failing, so after fixing the entry, run one `-disableOptimizations` build |
| `TS2307` for an `ext/<Name>/...` path, after `<Name>`'s declarations compile | The import path doesn't match a file in `<Name>` | Check the path against the `client/` folder of the extension whose manifest `Name` is `<Name>` |
| `WARNING: the supplied extension order ... differs from the inferred dependency order`, then `TS2307` or `TS2305` if `<Name>`'s types file is missing or out of date | An explicit `-extensions` list overrides `Dependencies` | Run a full build (`maplarge adk build` with no `-extensions`), or list `<Name>` first. If the error continues in the correct order, see the next row |
| `TS2307` although `<Name>` is declared and its declarations compile first, and `_<Name>.d.ts` is 0 bytes | `maplarge adk init` deletes the types files but keeps the build records (`_<Name>_NEW.tsbuildinfo`). The next build can trust those records and skip regenerating the types file | Run one build with `-disableOptimizations` (below). Running `init` again does not help |
| The build stops at `<Name>`'s declarations with errors such as `TS2322` or `TS7006`, and your extension never compiles | `<Name>` has TypeScript errors. ADK projects compile with `strict: true` by default, so implicit `any` and similar errors fail the build | Fix `<Name>`'s errors |
| `TS2307`, or `TS2305: Module '"ext/<Name>/..."' has no exported member ...`, after building one extension on its own or with `-skipCompileDeclarations` | A single-extension build skips declaration compilation unless the extension has UI tests or you pass `-disableOptimizations`, and `-skipCompileDeclarations` always skips it, so the types file is missing or out of date | Run a full build (`maplarge adk build` with no `-extensions`), without skipping declarations |
| `TS6053: File '.../.adk/types.d/_<Name>.d.ts' not found` when building one extension | A types file was deleted, and the single-extension build skipped declarations | Run a full build (`maplarge adk build` with no `-extensions`) |
| `WARNING: circular dependency detected among extensions: ...`. The build may pass while old types files exist, then fail with `TS2307` after `init` or on a checkout without `.adk/types.d/` | The `Dependencies` entries of two or more extensions form a cycle, usually because they import from each other. The warning also lists extensions that depend on the cycle | Move the shared code into one extension, or into a third extension both import from, and remove the reverse `Dependencies` entry |

To recover from stale build records, run one full build, then go back to normal builds:

```bash
maplarge adk build -disableOptimizations
```

Run this once after `maplarge adk init` in a project that has already been built. It compiles everything from scratch, so it can be slower; it clears the build output for the whole project (including what the local dev server serves); and it rewrites `tsconfig.json`. Do not commit that change.
