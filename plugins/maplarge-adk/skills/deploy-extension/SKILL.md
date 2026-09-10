---
name: deploy-extension
description: Deploy MapLarge ADK extensions to a server. Use when the user wants to deploy an extension, push an extension to a server, or upload an ADK extension. Triggers on "deploy extension", "deploy to [profile]", "push extension", or "/deploy-extension".
metadata:
  owner: "Abdullah Ali <abdullah.ali@maplarge.com> · AI Resource Team"
  provenance: "Imported from the internal claude-plugins pool; retrofitted under ARC-12"
  verified-against: "deploy_extension.mjs source + /restapi/v1/apps route family probed on MapLarge Server 4.139 (docs host), 2026-09-09 (ARC-45); ADK CLI @ 2026-08 import baseline"
---

# Deploy Extension

Deploy MapLarge ADK extensions to a server profile. Auth comes from the MapLarge CLI profile
(JWT token) — no plugin credentials or config needed. This skill covers the deploy step only:
building, packaging, `maplarge adk init`, and manifest work belong to `adk-extension-dev`, stale
local build output belongs to `adk-clean-cache`, and writing the code being deployed belongs to
the relevant dev skill (`adk-raptor-dev`, `adk-query-dev`, `adk-data-dev`).

## Required information

Collect from the user before proceeding:

- **Extension(s)**: extension name(s) to deploy (comma-separated for multiple)
- **Profile**: server profile name (run `maplarge config list-profiles` to see them)

## Execution

Run from anywhere inside the ADK project (the project root is auto-detected via the `.adk` folder; override with `--project`). Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`):

```bash
node <plugin-root>/scripts/deploy_extension.mjs --extensions "{extensions}" --profile "{profile}" --preserve-config
```

Options:

| Flag | Effect |
| ------ | -------- |
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

## Examples

- "Deploy my Reports extension to staging" (already installed there) →
  `node <plugin-root>/scripts/deploy_extension.mjs --extensions "Reports" --profile "staging" --preserve-config`
  — redeploys default to `--preserve-config` because an install can reset the extension's server-side config.
- "First deploy of NewDashboard to the dev profile" →
  `node <plugin-root>/scripts/deploy_extension.mjs --extensions "NewDashboard" --profile "dev"`
  — no `--preserve-config` on a first-time deploy; there is no existing config to snapshot, so preservation would just be skipped.
- "Deploy fails with: default framework is net8.0, but this profile is set to net6.0" →
  confirm the target server's runtime, then `maplarge config update-profile -name <profile> -targetFramework net8.0`
  and rerun the deploy. The profile pin, not the extension code, is what disagrees with the CLI default.

## Output

Report deployed extension(s), target profile, install status, and per-extension config preservation status (saved/restored/intact/failed/skipped) from the JSON summary.

## Hand-offs

- Build errors before the deploy starts, packaging, or manifest versions: use `adk-extension-dev`.
- Deploy succeeded but the server still serves stale behavior: hard-refresh first; if local
  artifacts are suspect, use `adk-clean-cache` and rebuild.
