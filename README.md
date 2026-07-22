# MapLarge AI Plugins

A Claude Code marketplace for MapLarge development tools and workflows.

It contains the following plugins:

| Plugin | Audience | Platform | Credentials |
|--------|----------|----------|-------------|
| **`maplarge-adk`** | Anyone building ADK extensions | macOS / Linux / Windows (Node) | None |

## Requirements

- **Node.js ≥ 18** — runs all bundled helper scripts of the generic plugins.
- **git** — branch/PR workflows.
- **PowerShell 7+** (`pwsh`).
- **MapLarge CLI** (`maplarge`) and **.NET SDK 10.0** (`dotnet`) for ADK environment checks and the local server.

```bash
dotnet tool install -g MapLargeInc.CLI   # MapLarge CLI, if needed
```

## Installation

> This repository is maintained internally at MapLarge but is mirrored at GitHub.

Example installation using Claude Code's remote marketplace-add:

```
/plugin marketplace add https://github.com/maplarge/maplarge-ai-plugins-official
```


### Install the plugin(s) you want

```
/plugin install maplarge-adk@maplarge-claude-marketplace
/plugin list        # verify
```

The `@maplarge-claude-marketplace` suffix is the marketplace's declared name (from `.claude-plugin/marketplace.json`); it does **not** depend on the folder name you cloned into.


### Updating

A local-directory marketplace loads **in place from your clone** — there is no separate cached copy — so updating is just a pull + reload:

1. `git pull` in your clone.
2. Run `/reload-plugins` in-session (or restart Claude Code). No re-install needed.

Reference-doc edits take effect immediately (they're read on demand); changes to a skill's `SKILL.md` frontmatter — trigger keywords, version — require `/reload-plugins`.

### Alternative — declarative setup (no slash commands)

To standardize across machines, register and enable everything in your user `~/.claude/settings.json` instead of running the commands above:

```jsonc
{
  "extraKnownMarketplaces": {
    "maplarge-claude-marketplace": {
      "source": { "source": "directory", "path": "C:\\DevStuff\\repos\\claude-plugins" }
    }
  },
  "enabledPlugins": {
    "maplarge-adk@maplarge-claude-marketplace": true,
    "maplarge-internal-tools@maplarge-claude-marketplace": true,
    "maplarge-reference@maplarge-claude-marketplace": true
  }
}
```

The `extraKnownMarketplaces` key must match the marketplace's `name` from `.claude-plugin/marketplace.json`.

---

## maplarge-adk (portable)

Customer-safe guidance for building MapLarge ADK extensions. No configuration or credentials required.

**Skills:** `adk-extension-dev`, `adk-query-dev`, `adk-raptor-dev`, `adk-data-dev`, `adk-clean-cache`, `deploy-extension`.

**Docs** (`plugins/maplarge-adk/docs/`): ADK CLI workflows, extension/manifest reference, JSON query authoring, server API access, Raptor dashboard patterns + cookbook, mockups, source-of-truth precedence, troubleshooting, workspace detection, and local-repo context.

**Helper scripts** (`plugins/maplarge-adk/scripts/`, print JSON):

```bash
node <plugin-root>/scripts/detect_maplarge_workspace.mjs --cwd .
node <plugin-root>/scripts/check_adk_environment.mjs --cwd .
node <plugin-root>/scripts/configure_local_repos.mjs --add core=/path/to/core
node <plugin-root>/scripts/clean_adk_cache.mjs --all [--include-output]
node <plugin-root>/scripts/deploy_extension.mjs --extensions Ext1 --profile local --preserve-config
```

Optional config (only for explicit local source-repo paths / internal mode) lives at the first match of
`MAPLARGE_ADK_CONFIG`, `$CLAUDE_CONFIG_DIR/plugins/maplarge-adk/config.json`, or
`~/.claude/plugins/maplarge-adk/config.json`. See `plugins/maplarge-adk/config.example.json`.

---
