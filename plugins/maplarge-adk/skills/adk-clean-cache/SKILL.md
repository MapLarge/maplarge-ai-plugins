---
name: adk-clean-cache
description: Clean the ADK build cache to fix stale or corrupt build artifacts. Use when an ADK build produces unexpected errors, stale output, or "module not found" at runtime. Triggers on "clean adk cache", "adk cache", "clean build cache", "stale build", "adk build broken", "/adk-clean-cache".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "clean_adk_cache.mjs verified by live run 2026-09-09 (ARC-40); MapLarge ADK CLI @ 2026-08 import baseline"
---

# Clean ADK Build Cache

Clean the `.adk/.build/` cache for MapLarge ADK extensions to fix stale or corrupt build
artifacts. This skill only removes per-extension build cache (and optionally compiled output);
it never touches `.adk/lib/` or `.adk/types.d/`, which come from `maplarge adk init` and are
refreshed by rerunning init (`adk-extension-dev` covers init and the rest of the project
workflow). For deploy-time staleness on a server rather than local build staleness, use
`deploy-extension` instead.

## When to use

- ADK build produces unexpected errors after dependency changes
- Runtime "Module not Found" errors after a build that appeared to succeed
- TypeScript changes not reflected in build output
- After upgrading the MapLarge CLI or running `maplarge adk update-version`
- General "something is wrong with the build" troubleshooting

## Execution

Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`).

```bash
# Clean cache for specific extension(s):
node <plugin-root>/scripts/clean_adk_cache.mjs --extensions MyExtension

# Clean cache for all extensions in the project:
node <plugin-root>/scripts/clean_adk_cache.mjs --all

# Clean cache and also clear compiled output (.www):
node <plugin-root>/scripts/clean_adk_cache.mjs --all --include-output
```

The script prints a JSON summary (project root, per-extension bytes freed, next step) to stdout.

## What gets cleaned

| Flag | Cleans | Path |
| ------ | -------- | ------ |
| (default) | Build cache only | `.adk/.build/{ExtName}/` |
| `--include-output` | Build cache + compiled output | `.adk/.build/{ExtName}/` + `.adk/.www/ext/{ExtName}/` |

`.adk/lib/` and `.adk/types.d/` are NOT cleaned — those come from `maplarge adk init` and should be refreshed with `maplarge adk init` if needed.

`--extensions` and `--all` are mutually exclusive; `--extensions` takes a comma-separated list (`--extensions Reports,Inventory`).

## Project detection

The ADK project root is auto-detected by walking up from the current directory to the nearest `.adk` folder. Override with `--project <path>` or `--cwd <path>`.

## Examples

- "My build succeeded but the server says Module not Found for Reports at runtime" →
  `node <plugin-root>/scripts/clean_adk_cache.mjs --extensions Reports`, then `maplarge adk build -extensions Reports`.
  Stale compiled artifacts survive a nominally green build; clearing the cache forces a real rebuild.
- "I upgraded the CLI and now every extension builds weird" →
  `node <plugin-root>/scripts/clean_adk_cache.mjs --all --include-output`, then rebuild.
  A CLI upgrade can invalidate every extension's cache and compiled output at once, so clean both, project-wide.
- "TypeScript types from a dependency extension are stale" → not a cache-clean problem; the
  generated `.adk/types.d/` files refresh via `maplarge adk init`, which this script deliberately never touches.

## Output

Report to the user which extension caches were cleaned, the total disk space freed, and suggest running `maplarge adk build` next.

## Hand-offs

- Project setup, `maplarge adk init`, or manifest work: use `adk-extension-dev`.
- The build is fine locally but the deployed server shows stale behavior: use `deploy-extension`.
