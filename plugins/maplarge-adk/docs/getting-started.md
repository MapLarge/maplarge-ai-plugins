# Getting Started

This plugin is designed to work from any of these starting points:

- an ADK project root containing `.adk/`
- an extension folder containing `manifest.json` and `client/` or `server/`
- a generic folder where you want guidance before creating an ADK project

## Installation Model

The plugin is installed once at the user level through the Claude Code plugin system and reused across
every ADK workspace:

```
/plugin marketplace add https://dev.azure.com/MapLarge/Internal/_git/claude-plugins
/plugin install maplarge-adk@maplarge-claude-marketplace
```

To develop or test the plugin from a local checkout of this repo, add the repo directory itself as a
marketplace (`.claude-plugin/marketplace.json` at the repo root describes the available plugins):

```
/plugin marketplace add ./
/plugin install maplarge-adk@maplarge-claude-marketplace
```

Install once, then reuse across as many ADK workspaces as you want, alongside other Claude Code plugins.

## Documentation Order

Use sources in this order:

1. Bundled plugin docs in this directory
2. Published MapLarge docs at [docs.maplarge.com](https://docs.maplarge.com/dashboard/ext/docportal/portal)
3. Configured local repo docs or source when helper output marks them available and relevant

For query syntax, dashboard behavior, and running server API routes, prefer the relevant DocPortal pages and configured `core` source over the public `maplarge.com` developer pages.

The bundled docs cover the common path first:

- [`adk-workflows.md`](./adk-workflows.md): create, init, build, run, package, deploy
- [`extension-reference.md`](./extension-reference.md): extension layout, manifest basics, and runtime schema enforcement
- [`query-authoring.md`](./query-authoring.md): JSON-first query guidance for extension work
- [`server-api-access.md`](./server-api-access.md): when to use running server APIs, and how to approach REST vs pre-REST calls
- [`raptor-dashboard-patterns.md`](./raptor-dashboard-patterns.md): dashboard, route, and view-model composition patterns
- [`raptor-cookbook.md`](./raptor-cookbook.md): small Raptor view snippets
- [`mockups.md`](./mockups.md): mockup and spike guidance
- [`source-of-truth.md`](./source-of-truth.md): which source to prefer by question type
- [`troubleshooting.md`](./troubleshooting.md): common ADK failure modes, stale caches, and build locks
- [`workspace-detection.md`](./workspace-detection.md): how the plugin classifies the current workspace
- [`local-repo-context.md`](./local-repo-context.md): when local MapLarge docs should influence guidance

## Optional Setup

No setup is required for the basic workflows.

If you want the plugin to use explicit local source repo paths or enable internal-only guidance, create a config file in one of these locations (first match wins):

1. the path in the `MAPLARGE_ADK_CONFIG` environment variable
2. `$CLAUDE_CONFIG_DIR/plugins/maplarge-adk/config.json`
3. `~/.claude/plugins/maplarge-adk/config.json`

Use [`../config.example.json`](../config.example.json) as the template.

To deliberately add validated local source repos, use:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/configure_local_repos.mjs --add core=/path/to/core --add maplarge-cli=/path/to/maplarge-cli
```

To inspect candidates without writing config, pass explicit discovery roots:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect_maplarge_workspace.mjs --cwd . --discover-repos /path/to/search
```

To inspect nearby sibling or cousin repos without writing config, use bounded nearby discovery:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect_maplarge_workspace.mjs --cwd . --discover-nearby
```

## Bundled Helpers

- `scripts/detect_maplarge_workspace.mjs`: detects ADK projects, extension roots, and doc sources
- `scripts/check_adk_environment.mjs`: checks `maplarge`, `dotnet`, `node`, ADK markers, ADK URL context (`configuredRemoteServer`, default local run URLs), CLI upgrade guidance, ADK/CLI version alignment, and missing prerequisites
- `scripts/configure_local_repos.mjs`: validates and writes explicit local repo paths

All helpers print JSON to stdout, so Claude can consume their output directly. `${CLAUDE_PLUGIN_ROOT}` is set
by Claude Code when a skill runs; from a local checkout of this repo you can substitute
`plugins/maplarge-adk` for the plugin root.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect_maplarge_workspace.mjs --cwd .
node ${CLAUDE_PLUGIN_ROOT}/scripts/check_adk_environment.mjs --cwd .
```
