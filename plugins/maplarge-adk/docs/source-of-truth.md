# Source Of Truth Matrix

| Question                     | Prefer                                                   |
| ---------------------------- | -------------------------------------------------------- |
| Existing extension structure | Local extension files                                    |
| Raptor view syntax           | Nearby local Raptor views, then plugin Raptor docs       |
| Query syntax and patterns    | Bundled query docs, then the relevant DocPortal docs, then configured core source |
| Route matching behavior      | Official route docs or configured core source            |
| CLI command syntax           | Helper `preferredCliCommands`, then `maplarge <command> --help` |
| CLI default behavior         | Official docs or configured CLI source; do not infer from config |
| CLI upgrade remediation      | Helper `cliUpgradeGuidance` and `versionAlignment`, then `maplarge version`, `maplarge adk version`, and `maplarge adk config` |
| Manifest schema              | `.adk/manifest.schema.json`, then extension-reference.md |
| Running server API endpoints | Relevant DocPortal docs and live OpenAPI/Swagger first, then configured core source and local extension route definitions |
| Server plugin APIs           | Local generated declarations and configured core source   |
| Installed extension behavior | Target server docs and installed extension metadata      |
| Local ADK run behavior       | `maplarge adk run --help`, ADK docs, local server output |

Use local source only when helper output reports configured repos, recognized current git remotes, or explicitly discovered repos. Do not assume `core`, `maplarge-cli`, or a shared parent checkout exists.

Do not use the public `maplarge.com` developer pages as the source of truth for query syntax or running server API routes.
