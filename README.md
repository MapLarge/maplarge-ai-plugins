# MapLarge AI Plugins

AI skills for building on the MapLarge platform: scaffolding and deploying ADK extensions, authoring queries, building Raptor dashboards and ECharts charts, working with tables, DataStream pipelines, and Notebooks. Each skill is a `SKILL.md` instruction document in the [Agent Skills](https://agentskills.io) format that teaches an AI coding assistant how to do the work correctly.

Built for developers using an AI assistant against a MapLarge server. Claude Code is the primary target (this repository is a Claude Code plugin marketplace), and the same skills install into GitHub Copilot, Cursor, Codex, and other agents through the GitHub CLI - see [Other assistants](#other-assistants).

> This repository is maintained internally at MapLarge and mirrored to GitHub.

## Quickstart (Claude Code)

Add the marketplace, install the plugin, verify:

```bash
/plugin marketplace add https://github.com/maplarge/maplarge-ai-plugins
/plugin install maplarge-adk@maplarge-claude-marketplace-public
/plugin list        # shows maplarge-adk
```

The `@maplarge-claude-marketplace-public` suffix is the marketplace's declared name (from `.claude-plugin/marketplace.json`); it does **not** depend on the folder name you cloned into.

### Requirements

- **Node.js >= 18** - runs the plugin's bundled helper scripts (contributors need >= 22; see [Contributing](#contributing-run-the-checks)).
- **git** - branch/PR workflows.
- **MapLarge CLI** (`maplarge`) and **.NET SDK 10.0** (`dotnet`) for ADK environment checks and the local server.

```bash
dotnet tool install -g MapLargeInc.CLI   # MapLarge CLI, if needed
```

## What's inside

| Plugin             | Audience                         | Platform                         | Credentials |
|--------------------|----------------------------------|----------------------------------|-------------|
| **`maplarge-adk`** | Anyone building ADK extensions   | macOS / Linux / Windows (Node)   | None        |

### maplarge-adk

Customer-safe guidance for building MapLarge ADK extensions. No configuration or credentials required.

**Workflow skills** (procedural, end to end): `adk-extension-dev`, `adk-query-dev`, `adk-raptor-dev`, `adk-data-dev`, `adk-clean-cache`, `deploy-extension`.

**Reference skills** (routers with on-demand reference docs): `maplarge-database` (tables, queries, versions, permissions across the CLI, REST, ProcessDirect, and plugin API surfaces), `raptor` (the Raptor control catalog and view patterns), `echarts` (every chart type and component), `maplarge-datastreams` (on-ramp and off-ramp pipelines), `maplarge-notebooks`, `ml-docgen`.

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

## Other assistants

The skills follow the Agent Skills `SKILL.md` standard, so assistants beyond Claude Code can consume them.

### GitHub CLI (`gh skill`, preview)

The GitHub CLI discovers this repository's skills automatically and installs them for many agents; GitHub Copilot, Cursor, Codex, and others share the project-scope `.agents/skills/` directory:

```bash
gh skill install MapLarge/maplarge-ai-plugins                    # no skill name: lists what is available
gh skill install MapLarge/maplarge-ai-plugins maplarge-database  # install one (default agent: Copilot)
gh skill preview MapLarge/maplarge-ai-plugins raptor             # read a skill without installing
```

Verified with gh 2.100.0. Two practical notes:

- `gh skill` copies the skill folder, including its `reference/` docs. The six workflow skills also point at plugin-level `docs/` and `scripts/`, which do not travel with a single-skill install; for those, clone the repository or use the Claude Code marketplace, which loads the whole plugin.
- Run `gh auth login` first: unauthenticated installs of the larger reference skills can hit GitHub's API rate limit mid-install.

### Codex

Codex picks up project-scope skills from `.agents/skills/`, which `gh skill install` populates (see above). For the full set with docs and helper scripts, clone this repository instead and add a pointer in your project's `AGENTS.md` standing instructions, for example: "For MapLarge work, consult the skills under `<clone-path>/plugins/maplarge-adk/skills/` and follow the matching skill before acting."

### Cursor

`gh skill install ... --agent cursor` places skills where Cursor's Agent Skills support reads them, or clone the repository and wire the skills into your workspace.

## Updating

If you registered the marketplace from a clone (see [Declarative setup](#declarative-setup-no-slash-commands)), it loads **in place from your clone** - there is no separate cached copy - so updating is just a pull + reload:

1. `git pull` in your clone.
2. Run `/reload-plugins` in-session (or restart Claude Code). No re-install needed.

Reference-doc edits take effect immediately (they're read on demand); changes to a skill's `SKILL.md` frontmatter - trigger keywords, version - require `/reload-plugins`.

## Declarative setup (no slash commands)

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

Contributors need **Node.js >= 22** (current LTS; pinned in `.tool-versions`) - the suite's `node --test` glob patterns require it.

The same rules run in-editor as you type; open this repo as its own VS Code workspace and accept the recommended extensions (markdownlint + Vale).
