# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A **Claude Code plugins marketplace** for MapLarge development. It contains the following plugins:

- **`maplarge-adk`** — portable, customer-safe ADK extension-development guidance + product reference skills
  (maplarge-database, maplarge-datastreams, maplarge-notebooks), the `raptor` and `echarts` UI **router skills**
  (each fronts on-demand per-control / per-series reference docs under `reference/`), and the `ml-docgen`
  config-doc tool. No credentials or config.
- **`maplarge-internal-tools`** — internal Jira / Azure DevOps / TeamCity / local-server workflows. Needs
  credentials (env) and optional config.
- **`maplarge-reference`** — internal engineering reference library (maplarge-build, maplarge-rest-api,
  maplarge-logging, maplarge-ecosystem, maplarge-desktop-build, maplarge-oam-auth, maplarge-vfb-swarm).
  Docs only; no scripts or credentials.
- **`maplarge-rst`** — internal field-support plugin for the Remote Sensing Terminal (RST), the
  transit-deployable direct-downlink ground terminal deployed for Aurora Sentinel. Single `rst-support`
  knowledge skill (references + offline cheat-sheet asset + a bash MinIO-pull helper). Internal audience.
- **`maplarge-extensions/`** — container folder (not itself a plugin) holding one reference plugin per extension
  repo. First member **`nga-code`** — internal reference library for the nga-code ADK extensions repo (NGA-Code
  shell, COSA + WiFRA, HCF, DataAggregation, mock external APIs); assumes `maplarge-adk` is installed. Internal.
- **`jfailing-tools`** — legacy personal plugin (Windows/PowerShell). Every skill is superseded by the
  plugins above; pending retirement once the Node ports are validated. Do not extend.

Plus a newer **topical suite** of four plugins, added alongside the six above. Nothing
was removed; the plugins above are unchanged. Their `mlx-` prefix, `[JEF] …` displayName and
`jfailing-suite` category are load-bearing, not cosmetic — read docs/adr/0004 before renaming them:

- **`mlx-adk-tools`** — ADK/CLI/build/deploy tooling: extension-dev guidance + workspace grounding
  scripts (the suite's grounding entry point) + build-system references (maplarge-build,
  maplarge-desktop-build, maplarge-ecosystem). No credentials.
- **`mlx-ui-dev`** — Raptor/UI/JavaScript: adk-raptor-dev workflow skill, the `raptor` and `echarts`
  router skills (per-control / per-chart reference docs, docs/adr/0002), maplarge-vfb-swarm. Docs only.
- **`mlx-data-dev`** — core server/database/data: adk-query-dev, adk-data-dev, create-table (+ its
  script and a small vendored common.mjs), references maplarge-database, maplarge-datastreams,
  maplarge-notebooks, maplarge-rest-api, maplarge-oam-auth.
- **`mlx-dev-workflow`** — internal Jira / Azure DevOps / TeamCity / local-server / logging
  quality-of-life workflows. Needs credentials (env) and the shared config. Carries the commands, the
  code-reviewer agent, and the Jira WebFetch-blocking hook.

`CONTEXT.md` is the glossary (plugin, skill, reference skill, router skill, customer-safe, internal).
`customer-safe.json` lists the topical suite's skill dirs that must stay free of internal terms; a test
enforces it.

**Organization model:** team-audience tooling lives in the *topical* plugins (`maplarge-adk`,
`maplarge-internal-tools`); teammates may also add *personal* plugins as incubators. Don't duplicate an
existing workflow — extend the existing implementation. New shared scripts should be config-driven Node,
not PowerShell.

**Editing rule:** the six pre-existing plugins (`maplarge-adk`, `maplarge-internal-tools`,
`maplarge-reference`, `jfailing-tools`, `maplarge-rst`, `maplarge-extensions/nga-code`) are frozen.
Make changes in the topical suite; do not modify, deprecate, or remove the originals.

**Duplication is expected.** About a dozen skill names exist in both `maplarge-adk` and the `mlx-*`
suite (`raptor`, `echarts`, `adk-*`, `maplarge-database`, …), several byte-identical. This is
deliberate: the two groupings are alternative installs, not layers. Install one or the other.

The two generic plugins are cross-platform (macOS/Linux/Windows), driven by Node ≥18 (built-ins only, no
third-party packages), and config-driven (no hardcoded person/path/org values).

## Repository Structure

```
.claude-plugin/marketplace.json        # lists all ten plugins
package.json                           # node --test runner (type: module)
tests/                                 # node:test suite + fixtures (exercises maplarge-adk helpers)
plugins/
  maplarge-adk/                        # portable ADK guidance
    .claude-plugin/plugin.json
    config.example.json                # localRepos, repoHints, docsPortalBaseUrl, internalMode
    scripts/*.mjs                       # common, detect_maplarge_workspace, check_adk_environment, configure_local_repos
    docs/*.md                           # 13 institutional-knowledge docs
    skills/                             # adk-* dev skills, product refs, raptor + echarts router skills (+ reference/ docs), ml-docgen
  maplarge-internal-tools/             # internal workflows
    .claude-plugin/plugin.json          # references hooks/hooks.json
    config.example.json
    scripts/*.mjs                       # common + workflow/server scripts (see below)
    hooks/                              # block-jira-webfetch.mjs + hooks.json (PreToolUse/WebFetch)
    agents/code-reviewer.md
    commands/                           # save-session, save-jira-session, view-logs
    docs/internal-workflows.md
    skills/                             # internal-jira-dev, internal-azure-dev, internal-teamcity-dev, internal-server-dev
  maplarge-reference/                  # internal engineering reference library
    .claude-plugin/plugin.json
    skills/                             # 7 reference skills, each SKILL.md + reference/ doc
  maplarge-rst/                        # RST (Remote Sensing Terminal) field support
    .claude-plugin/plugin.json
    skills/rst-support/                 # SKILL.md + references/ + assets/cheat-sheet + scripts/pull_exercise_data.sh
  maplarge-extensions/                 # container for per-extension-repo reference plugins (not itself a plugin)
    nga-code/                          # nga-code extensions reference plugin
      .claude-plugin/plugin.json
      skills/                          # 24 reference skills (nga-code-*, cosa/wifra-*, hcf, data-aggregation, ...)
  jfailing-tools/                      # legacy PowerShell plugin (all skills superseded; pending retirement)
    .claude-plugin/plugin.json
    skills/  commands/  agents/  hooks/
  mlx-adk-tools/                  # topical suite: ADK/CLI/build/deploy
    config.example.json                 # ADK keys of the SHARED config (localRepos, repoHints, ...)
    scripts/*.mjs                       # common, detect_maplarge_workspace, check_adk_environment,
                                        # configure_local_repos, clean_adk_cache, deploy_extension
    skills/                             # adk-extension-dev, adk-clean-cache, deploy-extension, ml-docgen,
                                        # maplarge-build, maplarge-desktop-build, maplarge-ecosystem
  mlx-ui-dev/                     # topical suite: Raptor/UI/JS (no scripts)
    skills/                             # adk-raptor-dev, raptor (router), echarts (router), maplarge-vfb-swarm
  mlx-data-dev/                   # topical suite: core/DB/datastreams
    scripts/*.mjs                       # common (small vendored subset), create-table
    skills/                             # adk-query-dev, adk-data-dev, create-table, maplarge-database,
                                        # maplarge-datastreams, maplarge-notebooks, maplarge-rest-api, maplarge-oam-auth
  mlx-dev-workflow/               # topical suite: internal quality-of-life workflows
    .claude-plugin/plugin.json          # must NOT declare hooks (hooks/ auto-loads; declaring = double load)
    config.example.json                 # workflow keys of the SHARED config
    scripts/*.mjs                       # common + workflow/server scripts (see below)
    hooks/                              # block-jira-webfetch.mjs + hooks.json (PreToolUse/WebFetch)
    agents/code-reviewer.md
    commands/                           # save-session, save-jira-session, view-logs
    skills/                             # internal-{jira,azure,teamcity,server}-dev umbrellas, create-pr + pr-status,
                                        # commit, highside-transfer, clear-logs, set-log-level, start-logging,
                                        # start-server-*, stop-server, maplarge-logging
CONTEXT.md                             # marketplace glossary
customer-safe.json                     # skill dirs enforced clean by the leak test
docs/adr/                              # architecture decision records (extension plugins, router skills)
reference-sources.json                 # (untracked, author-side) maps bundled reference snapshots to canonical sources
sync-reference-docs.ps1                # (untracked, author-side) re-copies copy-mode snapshots
```

## Configuration model (generic plugins)

Per-plugin, non-secret settings live in `config.json`; secrets live in environment variables.

Config resolution (first match wins):
1. `MAPLARGE_ADK_CONFIG` / `MAPLARGE_INTERNAL_TOOLS_CONFIG`
2. `$CLAUDE_CONFIG_DIR/plugins/<plugin>/config.json`
3. `~/.claude/plugins/<plugin>/config.json`

Internal config keys (defaults in parentheses): `azureOrganization` (MapLarge), `azureProject` (Internal),
`jiraBaseUrl`, `jiraProjectKey` (CORD), `branchUserSegment` (falls back to the Jira email local-part),
`defaultTargetBranch`, `localServerRoot`, `localServerUrl`, `teamCityUrl`, `prPendingTransitionName`
("PR Pending"), `releaseNoteIssueType` ("Release Note").

Secrets (env): `JIRA_EMAIL`, `JIRA_API_TOKEN`, `AZURE_DEVOPS_PAT`, optional `TEAMCITY_URL`/`TEAMCITY_TOKEN`.

## Configuration model (topical suite)

The four topical plugins share **one** non-secret config file; secrets stay in the same env vars above.

Resolution (first match wins):
1. `MAPLARGE_PLUGINS_CONFIG` (env var, explicit path)
2. `$CLAUDE_CONFIG_DIR/plugins/maplarge/config.json`
3. `~/.claude/plugins/maplarge/config.json`
4. Legacy fallbacks with a stderr note: `MAPLARGE_INTERNAL_TOOLS_CONFIG` / `MAPLARGE_ADK_CONFIG` and the
   old `plugins/maplarge-internal-tools` / `plugins/maplarge-adk` paths.

Workflow keys add `localServerListenUrls` (ASPNETCORE_URLS for start-server) to the internal keys above;
`jiraProjectKey` (CORD) is a fallback only — scripts infer the project from the branch or take
`--project-key`. `localServerRoot` is the server *project* dir (containing the .csproj and App_Data).
ADK keys: `localRepos`, `repoHints`, `docsPortalBaseUrl`, `internalMode`.

## mlx-dev-workflow scripts

`create-story`, `create-pr` (version bump + Jira comment/transition), `pr-status`, `review-pr`,
`search-repos`, `check-pipeline`, `teamcity-investigate`, `start-server`, `stop-server`, `kill-build`,
`clear-logs`, `set-log-level`, `check_internal_environment`. The server-lifecycle and logging scripts need
no PAT. Run grounding first:
`node ${CLAUDE_PLUGIN_ROOT}/scripts/check_internal_environment.mjs --cwd "$PWD"`.

## Node script conventions (topical suite)

In addition to the conventions below:

- **Strict flags**: use `parseFlagsStrict(argv, spec)` — unknown flags, valueless string flags, and
  out-of-set values are hard errors. Never let a typo silently change behavior on a destructive script.
- `${CLAUDE_PLUGIN_ROOT}` cannot reach a sibling plugin — cross-plugin references go by **skill name**.
- Emit the stdout JSON summary even on partial failure when side effects already happened.
- Watch for PowerShell-parity traps: `-match`/`-like`/`-eq`/`-notin` were case-insensitive; translated JS
  regexes and path/string comparisons usually need `/i` or explicit normalization.
- Match processes by executable name (`findProcessesByExecutable`), not command-line substrings.

## Testing

```bash
node --test                             # layout, leak protection, workspace detection, env checks, flag parsing
node --check plugins/**/scripts/*.mjs   # syntax-check
```

Tests cover both the pre-existing plugins and the topical suite; the suite's tests live in the
`adk-tools-*`, `dev-workflow-*`, and `topical-suite-*` test files.

Live Jira/Azure/TeamCity calls require real credentials; verify against throwaway tickets/branches.

## maplarge-internal-tools scripts

`create-story`, `create-pr` (version bump + Jira comment/transition), `pr-status`, `review-pr`, `search-repos`,
`check-pipeline`, `teamcity-investigate`, `start-server`, `stop-server`, `kill-build`,
`check_internal_environment`. The server-lifecycle three need no PAT. Run grounding first:
`node ${CLAUDE_PLUGIN_ROOT}/scripts/check_internal_environment.mjs --cwd "$PWD"`.

## Node script conventions (generic plugins)

- ESM `.mjs`, Node ≥18 built-ins only (`fetch`, `node:*`). No third-party deps.
- Resolve the plugin dir via `${CLAUDE_PLUGIN_ROOT}` (set by Claude Code when a skill runs).
- Shared helpers in each plugin's `scripts/common.mjs` (config load, auth headers, REST, git, process helpers).
- Print human progress to **stderr**; print a machine-readable **JSON** summary to **stdout**.
- Fail with a clear message and non-zero exit; never hardcode person/path/org values — read config.
- Cross-platform process/port handling: `lsof` on macOS/Linux, `Get-NetTCPConnection`/`netstat` on Windows.

## PowerShell script conventions (jfailing-tools)

- Shebang: `#!/usr/bin/env pwsh`; fail-fast: `$ErrorActionPreference = "Stop"`.
- Plugin root placeholder: `${CLAUDE_PLUGIN_ROOT}` (resolved at runtime); exit-code checks after git/external commands.
- Color output: Cyan (info), Green (success), Yellow (warning).

## Naming conventions

- Branch names: `feature/{branchUserSegment}/{JiraKey}-{sanitized-title}` (lowercase, ≤50 chars, special chars removed)
- PR titles: `{JiraKey}: {Jira Issue Title}`
- Release notes linked to stories via the "Relates" link type
- Jira descriptions use ADF (Atlassian Document Format)

## API integrations

| Service | Base URL (default) | Auth |
|---------|--------------------|------|
| Jira REST API v3 | config `jiraBaseUrl` (`https://maplarge.atlassian.net`) | Basic (email:token) |
| Azure DevOps API v7.x | `https://dev.azure.com/{azureOrganization}/{azureProject}` | Basic (empty:PAT) |
| TeamCity REST | config `teamCityUrl` / `TEAMCITY_URL` | Bearer token |
| MapLarge CLI | `maplarge` | Profile-based |

Never use WebFetch for Jira (a PreToolUse hook blocks it); use the REST API or the scripts. Jira project key: `CORD`.

## Adding a skill (generic plugins)

1. Create `plugins/<plugin>/skills/{name}/SKILL.md` with YAML front matter (`name`, `description`).
2. Add any `.mjs` under `scripts/`, importing shared helpers from `common.mjs`.
3. Reference scripts via `${CLAUDE_PLUGIN_ROOT}/scripts/...`; document required env/config and output.

## Adding a reference skill (domain knowledge)

Reference skills carry a MapLarge knowledge doc the model reads on demand (e.g. `maplarge-database`).
They have no executable script — the value is the bundled doc plus a keyword-rich description.
Customer-safe product references live in `maplarge-adk`; internal engineering references live in
`maplarge-reference`. Choose by audience.

1. Create `skills/{skill-name}/` with a `reference/` subfolder.
2. Bundle the doc as `reference/{doc}.md` — snapshot it INTO the repo; never point at an external/absolute path
   (it won't exist on a teammate's machine).
3. In `SKILL.md`: write a keyword-rich `description` (this is what makes it auto-fire), and point the body at
   the bundled doc with the portable placeholder `${CLAUDE_PLUGIN_ROOT}/skills/{skill-name}/reference/{doc}.md`.
4. If the doc has a canonical source elsewhere, add it to `reference-sources.json`; `sync-reference-docs.ps1`
   re-copies the copy-mode snapshots (author-side only).

## Commit messages

Use the `/commit` skill for clean commits without AI attribution (no Co-Authored-By lines, no robot emoji,
no "Generated with" text).
