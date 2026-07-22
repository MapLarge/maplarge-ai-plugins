# Troubleshooting

## `Manifest not found for extension ...`

Likely causes:
- `-extensions` name does not match `extensions/<folder>/manifest.json`
- folder was renamed but ADK config/cache still points to the old name
- generated build config is stale

Checks:
```bash
find extensions -maxdepth 2 -name manifest.json
jq .Name extensions/<extension>/manifest.json
maplarge adk config
```

## TS2307: Cannot find module ...

Likely causes:
- invalid import alias
- generated declarations are stale
- extension was renamed
- importing route path as a module path

Checks:
```bash
rg "from ['\\\"]ext/" extensions/<extension>/client
rg "declare module" .adk/types.d/_<extension>*.d.ts
maplarge adk build -extensions <extension> -skipCompileUITests
```

Do not assume ext/<extension> is a valid TypeScript import prefix.

## Stale ADK build output

Likely causes:
- `.adk/.build/<extension>/` contains stale generated files
- `.adk/.www/ext/<extension>/` contains old compiled output
- the ADK project was refreshed but the extension cache was not rebuilt

Checks:
```bash
find .adk/.build -maxdepth 2 -type d
find .adk/.www/ext -maxdepth 2 -type d
```

Fix:

Remove only the affected extension cache and rebuild with `maplarge adk build`. Refresh `.adk/lib/` and `.adk/types.d/` with `maplarge adk init`, not manual deletion.

## Build files are locked

Likely causes:
- a local server process is still running
- a previous build process did not exit
- generated output is being watched by another tool

Fix:

Stop the process that owns the lock, then rerun the ADK build. Use platform-specific process tools only after identifying the target process; avoid broad process cleanup unless the user explicitly asks.

## Direct `tsc` build created odd artifacts

Likely causes:
- `tsc` was run directly in an ADK project instead of using MapLarge CLI commands
- TypeScript compiled with the wrong config or output paths for the ADK project

Checks:
```bash
git status --short
maplarge adk build -extensions <extension> -skipCompileUITests
```

Use `maplarge adk build`, `maplarge adk run`, `maplarge adk package`, or `maplarge adk deploy` for ADK project builds. Do not use direct `tsc` invocation as the normal ADK build path.

## Profile auth expires after a profile change

Likely causes:
- a saved ADK profile was modified with a short-lived token
- profile credentials were changed when the task only needed to reuse the existing profile

Fix:

Use the existing profile or re-run `maplarge adk init -profile <current-profile>` with user-approved credentials. Do not edit profile files directly or add saved tokens without explicit approval. Prefer password auth when supported.

## Page URL returns not found

Checks:
- registerPublicDashboard ID
- registerCustomRoute route and path
- route order when adding literal routes
- page key passed to engine.loadModule(...)
- local ADK URL vs installed extension URL

## ADK project CLI version is behind the installed CLI

Likely causes:
- `dotnet tool install -g MapLargeInc.CLI` was run previously, but the current ADK project was not refreshed
- `maplarge adk update-version` was run without re-running `maplarge adk init`

Checks:
```bash
maplarge version
maplarge adk version
maplarge adk config
```

Refresh the ADK project when the installed CLI version is newer:

```bash
maplarge adk update-version
maplarge adk init -profile <current-profile>
```
