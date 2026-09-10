# Workspace Detection

The plugin assumes only ADK structure, not a fixed filesystem layout.

## Rules

- If an ancestor folder contains `.adk/`, that folder is the ADK project root.
- If the current path sits inside an extension folder with `manifest.json` and `client/` or `server/`, that folder is the extension root.
- If no ADK project is found but an extension root is found, the workspace is treated as a standalone extension repo.
- Otherwise the workspace is treated as generic.

## Local repo context

Local MapLarge repos are optional. The plugin only uses them when:

- a repo path is explicitly configured in `localRepos`
- a legacy `repoHints` path points directly at a recognized repo
- the current working directory is inside a git repo with an exact `core` or `maplarge-cli` origin remote
- the current workspace is an ADK project or extension inside a generic MapLarge Azure DevOps or GitHub repo
- the current working directory itself is a recognized repo root by local markers
- a helper call includes explicit `--discover-repos` roots
- a helper call includes `--discover-nearby`

The helper must not infer source repositories from arbitrary parent folders, sibling folder names, or a presumed MapLarge checkout layout.

Remote markers are preferred over file-shape markers:

- `https://dev.azure.com/MapLarge/Internal/_git/maplarge-api-server-git` => `core`
- `https://dev.azure.com/MapLarge/Internal/_git/maplarge-cli` => `maplarge-cli`
- `https://dev.azure.com/MapLarge/...` => generic `maplarge-source` when the current workspace is an ADK project/extension or during explicit discovery
- `https://github.com/MapLarge/...` => generic `maplarge-source` when the current workspace is an ADK project/extension or during explicit discovery

Discovery is bounded to user-provided roots. Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json` (in a checkout of this repo, `plugins/maplarge-adk/`):

```bash
node <plugin-root>/scripts/detect_maplarge_workspace.mjs --cwd "$PWD" --discover-repos /path/to/search
```

Nearby discovery is also bounded. It searches the current repo's parent and grandparent folders, or the current folder's parent and grandparent when not inside a git repo:

```bash
node <plugin-root>/scripts/detect_maplarge_workspace.mjs --cwd "$PWD" --discover-nearby
```

Persist repo paths only with an explicit configuration command:

```bash
node <plugin-root>/scripts/configure_local_repos.mjs --add core=/path/to/core --add maplarge-cli=/path/to/maplarge-cli
```

The helper output also includes `preferredCliCommands` so Claude can prefer current `maplarge adk new ...` commands over legacy compatibility forms.

For ADK projects, the environment check also reports `cliUpgradeGuidance` and `versionAlignment` so Claude can distinguish between:

- a full CLI update request, which starts with `dotnet tool install -g MapLargeInc.CLI`
- a project-only refresh, where the installed CLI is already newer than the ADK project's CLI version and the fix is `maplarge adk update-version` followed by `maplarge adk init -profile <current-profile>`

When local repo context is active, the plugin may surface local docs, tool sources, and ADK template metadata in addition to the bundled docs and published docs portal.
