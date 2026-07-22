# ADK Workflows

Use current CLI syntax unless a task explicitly requires legacy commands.

## Create a Project or Extension

```bash
maplarge adk new project .
maplarge adk new p my-project
maplarge adk new extension my-extension
maplarge adk new e my-extension
```

Useful notes:

- `maplarge adk new project <name|.>` and `maplarge adk new extension <name>` are the current forms.
- Short aliases are available: `new p` for project, `new e` or `new ext` for extension.
- `maplarge adk create-project -name <name>` and `maplarge adk create-extension -name <name>` are legacy compatibility commands. Do not use them for new guidance.
- Use `maplarge adk list-templates` to inspect available templates before creating an extension.
- Extension templates may expose aliases. Common examples include `default` or `raptor` for a basic Raptor client extension, `raptor-map` for a Raptor map extension, and `server-extension-endpoint` for a server endpoint extension.

Examples:

```bash
maplarge adk new extension my-extension --template server-extension-endpoint
maplarge adk new ext my-extension --clone https://github.com/org/repo
```

## Add Components or Features

Prefer CLI scaffolding when it matches the requested work:

```bash
maplarge adk new component page MyPage -e my-extension
maplarge adk new c viewmodel MyPageViewModel -e my-extension
maplarge adk new feature playwright -e my-extension
```

Useful notes:

- `maplarge adk new component <type> <nameOrPath>` creates a component in the extension. For client components, paths are relative to `client/`.
- `maplarge adk new c <type> <nameOrPath>` is the short alias.
- Raptor page and view-model component templates commonly use aliases such as `page`, `p`, `viewmodel`, and `vm`.
- `maplarge adk new feature <name>` adds a feature template to an extension. Use `--args` only when the selected feature reports required parameters.
- `maplarge adk new f <name>` is the short alias.
- Generated components still need to be imported and registered in the module entrypoint when the CLI only creates files.

## Initialize

```bash
maplarge adk init -remoteServer https://your-server.example
```

Common options:

- `-remoteServer <url>`: required unless initialization uses an existing profile
- `-profile <name>`: reuse saved connection and auth settings
- `-localServerRoot <path>`: source-based internal development against a local server checkout
- `-configuration <name>` and `-targetFramework <name>`: control server-side build targets
- `-pathToTypeScriptDeclarations <path>` and `-pathToPluginDependencies <path>`: use local artifacts instead of downloading them
- `-verbose`: emit detailed logs

ADK profiles are user-managed local state. Do not edit saved profile files or add or replace a profile token without explicit user approval. If credentials must be supplied and password auth is sufficient, use `-user` and `-password`; do not persist short-lived tokens in profiles.

Examples:

```bash
maplarge adk init -remoteServer https://your-server.example -profile myprofile
maplarge adk init -remoteServer https://localhost:1234 -localServerRoot /path/to/maplarge-repo
```

For internal source-based development, `-localServerRoot` is only appropriate when a relevant local server repo is available.

## Build and run

```bash
maplarge adk build
maplarge adk run
```

To target specific extensions:

```bash
maplarge adk build -extensions "ext1,ext2"
maplarge adk run -extensions "ext1,ext2"
```

Useful `run` options include `-httpPort`, `-httpsPort`, `-nossl`, `-skipCompile`, `-skipCompileUITests`, and `-skipCompileDeclarations`.

If you are in a standalone extension repo without `.adk/`, package and `run` workflows usually need an ADK project root.

Do not use `tsc` directly to build an ADK project. ADK build, run, package, and deploy flows should go through `maplarge adk ...` commands so the CLI controls generated TypeScript config, declarations, source maps, and output locations.

### Local ADK Run URLs

`maplarge adk run` starts a local ADK web server. By default, the HTTPS URL is: `https://localhost:8443`

This is different from the remote server shown by `maplarge adk config`. The configured remote server is used for init, package, deploy, and installed-extension workflows.

Examples:

- Local ADK run: `https://localhost:8443/dashboard/ext/my-extension/home`
- Installed extension on configured server: `https://localhost:5501/dashboard/ext/my-extension/home`

Use `-httpsPort <port>` to override the local HTTPS port. Use `-httpPort <port> -nossl` for non-SSL local development.

## Package and deploy

```bash
maplarge adk package -extensions "my-extension" -i PRERELEASE
maplarge adk deploy -extensions "my-extension" -profile "my-profile" -install -i PATCH
```

Use a saved `-profile` when credentials or server settings are already configured.

Use `maplarge adk deploy` to deploy a new ADK extension. A separate `maplarge adk package` step is not required before deployment.

Use `-i <component>` by default for both package and deploy so the command creates an incremented version instead of reusing an existing version number.

Do not use bare `-i`. The CLI requires an increment component such as `PRERELEASE` or `PATCH`.

Choose the increment component from the current version:

- If the current version has a pre-release tag, such as `2.1.4-alpha.3`, use `-i PRERELEASE`.
- If the current version has no pre-release tag, such as `7.2.0` or `4.5`, use `-i PATCH`.
- If the user explicitly asks for a minor or major version upgrade, use `-i MINOR` or `-i MAJOR`.

Do not manually edit `manifest.json` to change the extension version. Let the CLI increment the version.

Only omit `-i <component>` when the user explicitly wants to reuse the exact same version and understands that this is an exception workflow.

Never use `-overwrite` unless the user explicitly instructs you to overwrite an existing version.

`-incrementVersion` is deprecated compatibility syntax for `-i`; prefer `-i <component>` in new guidance.

`maplarge adk deploy` requires `-profile`. Use an existing profile when possible. If credentials must be supplied and password auth is sufficient, use `-user` and `-password`; do not add or replace a saved profile token without explicit user approval.

If redeploying an installed extension that has user-edited config, preserve the full config object before deploy and restore it after install. Use the target server's documented app config API or an existing project helper; do not hand-edit a partial config merge. If config preservation fails because the extension is not installed yet, continue as a first install and report that preservation was skipped.

## Project Info

```bash
maplarge adk version
maplarge adk config
maplarge adk update-version
```

Use these to inspect the current ADK project state or refresh support files after a CLI upgrade.

## CLI Upgrade and Version Alignment

When a user asks to update the MapLarge CLI, perform this sequence:

```bash
dotnet tool install -g MapLargeInc.CLI
maplarge adk update-version
maplarge adk init -profile <current-profile>
```

Rules:

- Run all three steps for each relevant ADK project.
- If `dotnet tool install -g MapLargeInc.CLI` reports that the current CLI version is already installed, skip the global install step and still refresh any ADK project whose `maplarge adk version` is older than the installed CLI.
- When the installed CLI version is newer than the ADK project's CLI version, run `maplarge adk update-version` and then re-run `maplarge adk init` with the project's current profile.
- Use `maplarge adk version` to compare the ADK project version with the installed CLI version.
- Use `maplarge adk config` or `.adk/.www/maplarge.adk.config.json` to confirm the current profile before re-running `init`.
- Re-running `init` with an existing profile should not change saved profile credentials unless the user explicitly approves that change.

Example project refresh:

```bash
maplarge adk update-version
maplarge adk init -profile myprofile
```

## Help and Discovery

```bash
maplarge -h
maplarge adk -h
maplarge adk new -h
maplarge adk new p -h
maplarge adk new e -h
maplarge adk new c -h
maplarge adk new f -h
maplarge adk deploy -h
maplarge adk list-templates
```

Some environments also support `-?`, but `-h` and `--help` are usually safer across shells.

## Generated Build Files

ADK build commands may create temporary root-level files such as:

- `tsconfig_<extension>.json`
- `tsconfig.declarations_<extension>.json`

These are build artifacts unless the repo explicitly tracks them. Do not include them in source changes without checking `git ls-files`.

Direct `tsc` runs can bypass the ADK-managed configuration and leave artifacts such as source maps in unexpected locations.

## ADK Cache Maintenance

When builds appear stale after dependency, template, or CLI changes, clean only the affected extension cache under `.adk/.build/<extension>/`, then run `maplarge adk build`. If runtime output is stale, also remove the matching compiled output under `.adk/.www/ext/<extension>/`.

Do not remove `.adk/lib/` or `.adk/types.d/` as a cache-cleaning shortcut. Refresh those with `maplarge adk init`.

If a build fails because files are locked, stop the process holding the generated output or server assembly, then rerun the ADK build. Avoid workstation-specific process-kill commands in reusable guidance.

## Verification Ladder

Use the lightest verification that answers the question:

1. TypeScript syntax/import check:
   `maplarge adk build -extensions <extension> -skipCompileDeclarations -skipCompileUITests`

2. Full client build:
   `maplarge adk build -extensions <extension>`

3. Local runtime check:
   `maplarge adk run -extensions <extension>`

4. Installed extension check:
   package/deploy/install to a target server.

For route or page changes, prefer at least step 1. For server plugin changes, also run relevant dotnet tests/builds.

## General Guidance

Avoid `-verbose` unless detailed diagnostics are required. Some CLI verbose output can include profile details such as saved usernames, tokens, or server configuration. Prefer non-verbose commands for routine build checks.

## Canonical References

- [ADK docs portal](https://docs.maplarge.com/dashboard/ext/docportal/portal)
- [MapLarge CLI guide](https://docs.maplarge.com/dashboard/ext/docportal/portal/MapLargeCLI)
