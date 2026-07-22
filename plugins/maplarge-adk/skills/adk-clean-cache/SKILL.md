---
name: adk-clean-cache
description: Clean the ADK build cache to fix stale or corrupt build artifacts. Use when an ADK build produces unexpected errors, stale output, or "module not found" at runtime. Triggers on "clean adk cache", "adk cache", "clean build cache", "stale build", "adk build broken", "/adk-clean-cache".
---

# Clean ADK Build Cache

Clean the `.adk/.build/` cache for MapLarge ADK extensions to fix stale or corrupt build artifacts.

## When to use

- ADK build produces unexpected errors after dependency changes
- Runtime "Module not Found" errors after a build that appeared to succeed
- TypeScript changes not reflected in build output
- After upgrading the MapLarge CLI or running `maplarge adk update-version`
- General "something is wrong with the build" troubleshooting

## Execution

```bash
# Clean cache for specific extension(s):
node ${CLAUDE_PLUGIN_ROOT}/scripts/clean_adk_cache.mjs --extensions MyExtension

# Clean cache for all extensions in the project:
node ${CLAUDE_PLUGIN_ROOT}/scripts/clean_adk_cache.mjs --all

# Clean cache and also clear compiled output (.www):
node ${CLAUDE_PLUGIN_ROOT}/scripts/clean_adk_cache.mjs --all --include-output
```

The script prints a JSON summary (project root, per-extension bytes freed, next step) to stdout.

## What gets cleaned

| Flag | Cleans | Path |
|------|--------|------|
| (default) | Build cache only | `.adk/.build/{ExtName}/` |
| `--include-output` | Build cache + compiled output | `.adk/.build/{ExtName}/` + `.adk/.www/ext/{ExtName}/` |

`.adk/lib/` and `.adk/types.d/` are NOT cleaned — those come from `maplarge adk init` and should be refreshed with `maplarge adk init` if needed.

## Project detection

The ADK project root is auto-detected by walking up from the current directory to the nearest `.adk` folder. Override with `--project <path>` or `--cwd <path>`.

## Output

Report to the user which extension caches were cleaned, the total disk space freed, and suggest running `maplarge adk build` next.
