---
name: deploy-extension
description: Deploy MapLarge ADK extensions to a server. Use when the user wants to deploy an extension, push an extension to a server, or upload an ADK extension. Triggers on "deploy extension", "deploy to [profile]", "push extension", or "/deploy-extension".
---

# Deploy Extension

Deploy MapLarge ADK extensions to a server profile. Auth comes from the MapLarge CLI profile (JWT token) — no plugin credentials or config needed.

## Required information

Collect from the user before proceeding:
- **Extension(s)**: extension name(s) to deploy (comma-separated for multiple)
- **Profile**: server profile name (run `maplarge config list-profiles` to see them)

## Execution

Run from anywhere inside the ADK project (the project root is auto-detected via the `.adk` folder; override with `--project`):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/deploy_extension.mjs --extensions "{extensions}" --profile "{profile}" --preserve-config
```

Options:

| Flag | Effect |
|------|--------|
| `--increment-version BUILD\|MINOR\|MAJOR\|REVISION\|NONE` | Version increment (default: BUILD) |
| `--skip-install` | Upload without installing (installs by default) |
| `--preserve-config` | Snapshot extension config before deploy and restore it after. **Use by default when redeploying** to avoid config reset; omit only for first-time deploys |
| `--project <path>` / `--cwd <path>` | Override ADK project detection |

## Config preservation

With `--preserve-config`, the script:
1. Reads the current config for each extension via `GET /restapi/v1/apps/{ext}/config` (the route is case-sensitive — lowercase `config`; auth via the `aInfo` query param)
2. Deploys the extension(s) normally
3. Compares the post-install config and, only if it changed, writes the snapshot back via `admin/updateextensionconfig`

The snapshot is kept as a raw JSON string — the API requires the FULL config object, and JSON round-trips can silently truncate deeply nested configs. If the config read fails (extension not yet installed), preservation is skipped for that extension and the deploy continues.

## Failure diagnosis

The script recognizes two known failure modes and prints the likely fix:
- **targetFramework mismatch** ("default framework is netX but this profile is set to netY") → `maplarge config update-profile -name {profile} -targetFramework {netX}` after confirming the target server's runtime
- **NETSDK1005** → stale restore state; check the profile's targetFramework against the server runtime, or clean the extension's server obj/bin folders

## Output

Report deployed extension(s), target profile, install status, and per-extension config preservation status (saved/restored/intact/failed/skipped) from the JSON summary.
