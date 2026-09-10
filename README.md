# MapLarge AI Plugins

A Claude Code marketplace for MapLarge development tools and workflows.

It contains the following plugins:

| Plugin             | Audience                         | Platform                         | Credentials |
|--------------------|----------------------------------|----------------------------------|-------------|
| **`maplarge-adk`** | Anyone building ADK extensions   | macOS / Linux / Windows (Node)   | None        |

## Requirements

- **Node.js ≥ 22** (current LTS; pinned in `.tool-versions`) — runs the static check suite, whose `node --test` glob patterns need Node 21+. The `maplarge-adk` helper scripts themselves only need Node ≥ 18.
- **git** — branch/PR workflows.
- **MapLarge CLI** (`maplarge`) and **.NET SDK 10.0** (`dotnet`) for ADK environment checks and the local server.

```bash
dotnet tool install -g MapLargeInc.CLI   # MapLarge CLI, if needed
```

## Installation

> This repository is maintained internally at MapLarge but is mirrored at GitHub.

Example installation using Claude Code's remote marketplace-add:

```bash
/plugin marketplace add https://github.com/maplarge/maplarge-ai-plugins
```

### Install the plugin(s) you want

```bash
/plugin install maplarge-adk@maplarge-claude-marketplace-public
/plugin list        # verify
```

The `@maplarge-claude-marketplace-public` suffix is the marketplace's declared name (from `.claude-plugin/marketplace.json`); it does **not** depend on the folder name you cloned into.

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
    "maplarge-claude-marketplace-public": {
      "source": { "source": "directory", "path": "/path/to/your/clone/maplarge-ai-plugins" }
    }
  },
  "enabledPlugins": {
    "maplarge-adk@maplarge-claude-marketplace-public": true
  }
}
```

The `extraKnownMarketplaces` key must match the marketplace's `name` from `.claude-plugin/marketplace.json`.

## Contributing: run the checks

Skill PRs must pass the static check suite - frontmatter schema, link resolution, banned terms, content rules:

```bash
npm install    # once per clone
npm run check
```

The same rules run in-editor as you type; open this repo as its own VS Code workspace and accept the recommended extensions (markdownlint + Vale).

---

## maplarge-adk (portable)

Customer-safe guidance for building MapLarge ADK extensions. No configuration or credentials required.

**Skills:** `adk-extension-dev`, `adk-query-dev`, `adk-raptor-dev`, `adk-data-dev`, `adk-clean-cache`, `deploy-extension`.

**Docs** (`plugins/maplarge-adk/docs/`): ADK CLI workflows, extension/manifest reference, JSON query authoring, server API access, Raptor dashboard patterns + cookbook, mockups, source-of-truth precedence, troubleshooting, workspace detection, and local-repo context.

**Helper scripts** (`plugins/maplarge-adk/scripts/`, print JSON). Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json`:

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
