# Local Repo Context

This plugin does not require a local MapLarge source checkout.

When a local checkout is available, it can improve answers in two cases:

- local docs are closer to the code the user is editing
- internal workflows need source-aware guidance, such as using `-localServerRoot`

The plugin should not assume repo names or sibling layout. It should use local context only from explicit configuration, explicit discovery roots, or the current working directory when it is itself a recognized repo root.

Use local source context only when a helper reports it from:

- `localRepos` in plugin config
- a legacy `repoHints` entry that points directly at a recognized repo
- an explicit `--discover-repos` search root
- explicit `--discover-nearby` bounded discovery
- the current working directory itself when it is a recognized repo root
- the current git repo when its `origin` remote exactly identifies `core` or `maplarge-cli`
- the current ADK project or extension repo when its `origin` remote is a generic MapLarge Azure DevOps or GitHub URL

Do not walk upward and assume a parent folder is a MapLarge source root. Do not assume `core`, `maplarge-cli`, or any other repo exists on the user's machine.

Prefer git origin remotes over folder names or file-shape markers. Exact `maplarge-api-server-git` and `maplarge-cli` Azure DevOps remotes identify those repos. Other MapLarge Azure DevOps or GitHub remotes are generic `maplarge-source` when the current workspace is already an ADK project/extension or during explicit discovery.

When local docs are used, prefer the most relevant ADK-focused material first and ignore unrelated notes or project-specific scratch files.
