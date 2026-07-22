import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_DOCS_PORTAL_BASE_URL =
	"https://docs.maplarge.com/dashboard/ext/docportal/portal";
export const DEFAULT_ADK_RUN_HTTPS_URL = "https://localhost:8443";
export const DEFAULT_ADK_RUN_HTTP_URL = "http://localhost:8000";
export const ADK_URLS_GUIDANCE =
	"Use configuredRemoteServer for installed/deployed extensions. Use defaultRunHttpsUrl for maplarge adk run unless overridden by -httpsPort.";
export const PREFERRED_ADK_CLI_COMMANDS = [
	{
		task: "new-project",
		preferred: "maplarge adk new project <name|.>",
		aliases: ["maplarge adk new p <name|.>"],
		legacyCompatibility: ["maplarge adk create-project -name <name|.>"],
	},
	{
		task: "new-extension",
		preferred: "maplarge adk new extension <name>",
		aliases: ["maplarge adk new e <name>", "maplarge adk new ext <name>"],
		legacyCompatibility: ["maplarge adk create-extension -name <name>"],
	},
	{
		task: "new-component",
		preferred: "maplarge adk new component <type> <nameOrPath>",
		aliases: ["maplarge adk new c <type> <nameOrPath>"],
		legacyCompatibility: [],
	},
	{
		task: "new-feature",
		preferred: "maplarge adk new feature <name>",
		aliases: ["maplarge adk new f <name>"],
		legacyCompatibility: [],
	},
];

const scriptFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptFile);

export const pluginRoot = path.resolve(scriptsDir, "..");
export const repoRoot = path.resolve(pluginRoot, "..", "..");

function canonicalPath(targetPath) {
	try {
		return fs.realpathSync.native(targetPath);
	} catch {
		return path.resolve(targetPath);
	}
}

export function isExecutedAsScript(metaUrl, scriptPath = process.argv[1]) {
	if (!scriptPath) {
		return false;
	}

	return canonicalPath(fileURLToPath(metaUrl)) === canonicalPath(scriptPath);
}

export function pathExists(targetPath) {
	try {
		fs.accessSync(targetPath);
		return true;
	} catch {
		return false;
	}
}

export function isDirectory(targetPath) {
	try {
		return fs.statSync(targetPath).isDirectory();
	} catch {
		return false;
	}
}

export function isFile(targetPath) {
	try {
		return fs.statSync(targetPath).isFile();
	} catch {
		return false;
	}
}

export function isSubpath(candidate, parent, pathApi = path) {
	const relativePath = pathApi.relative(parent, candidate);
	return relativePath === "" || (!relativePath.startsWith("..") && !pathApi.isAbsolute(relativePath));
}

export function findUpward(startPath, matcher) {
	let current = path.resolve(startPath);

	while (true) {
		if (matcher(current)) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return null;
		}
		current = parent;
	}
}

export function looksLikeExtensionRoot(targetPath) {
	if (!isDirectory(targetPath)) {
		return false;
	}

	const manifestPath = path.join(targetPath, "manifest.json");
	if (!isFile(manifestPath)) {
		return false;
	}

	return isDirectory(path.join(targetPath, "client")) || isDirectory(path.join(targetPath, "server"));
}

export function findExtensionRoot(startPath) {
	return findUpward(startPath, looksLikeExtensionRoot);
}

export function findAdkProjectRoot(startPath) {
	return findUpward(startPath, (candidate) => isDirectory(path.join(candidate, ".adk")));
}

export function parseCliArgs(argv) {
	const options = {};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--cwd") {
			options.cwd = argv[index + 1];
			index += 1;
		} else if (token === "--config") {
			options.config = argv[index + 1];
			index += 1;
		} else if (token === "--discover-repos") {
			options.discoverRepos = argv[index + 1]
				?.split(",")
				.map((candidate) => candidate.trim())
				.filter(Boolean) ?? [];
			index += 1;
		} else if (token === "--discover-nearby") {
			options.discoverNearby = true;
		} else if (token === "--add") {
			options.add ??= [];
			options.add.push(argv[index + 1]);
			index += 1;
		}
	}

	return options;
}

export function candidateConfigPaths(explicitConfigPath = null) {
	const paths = [];

	if (explicitConfigPath) {
		paths.push(path.resolve(explicitConfigPath));
	}

	if (process.env.MAPLARGE_ADK_CONFIG) {
		paths.push(path.resolve(process.env.MAPLARGE_ADK_CONFIG));
	}

	if (process.env.CLAUDE_CONFIG_DIR) {
		paths.push(path.join(process.env.CLAUDE_CONFIG_DIR, "plugins", "maplarge-adk", "config.json"));
	}

	paths.push(path.join(os.homedir(), ".claude", "plugins", "maplarge-adk", "config.json"));

	return [...new Set(paths)];
}

export function loadPluginConfig(explicitConfigPath = null) {
	const configPath = candidateConfigPaths(explicitConfigPath).find((candidate) => isFile(candidate));

	const defaults = {
		repoHints: [],
		localRepos: {},
		docsPortalBaseUrl: DEFAULT_DOCS_PORTAL_BASE_URL,
		internalMode: false,
	};

	if (!configPath) {
		return {
			configPath: null,
			config: defaults,
		};
	}

	try {
		const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
		const configDirectory = path.dirname(configPath);
		return {
			configPath,
			config: {
				repoHints: Array.isArray(raw.repoHints)
					? raw.repoHints.map((hint) =>
						path.isAbsolute(hint) ? hint : path.resolve(configDirectory, hint),
					)
					: [],
				localRepos: normalizeLocalRepos(raw.localRepos, configDirectory),
				docsPortalBaseUrl:
					typeof raw.docsPortalBaseUrl === "string" && raw.docsPortalBaseUrl.trim()
						? raw.docsPortalBaseUrl
						: DEFAULT_DOCS_PORTAL_BASE_URL,
				internalMode: raw.internalMode === true,
			},
		};
	} catch (error) {
		return {
			configPath,
			config: defaults,
			configError:
				error instanceof Error
					? `Failed to load plugin config from ${configPath}: ${error.message}`
					: `Failed to load plugin config from ${configPath}.`,
		};
	}
}

function normalizeLocalRepos(rawLocalRepos, configDirectory) {
	if (!rawLocalRepos || typeof rawLocalRepos !== "object" || Array.isArray(rawLocalRepos)) {
		return {};
	}

	const normalized = {};
	for (const [name, repoPath] of Object.entries(rawLocalRepos)) {
		if (typeof name !== "string" || typeof repoPath !== "string" || !repoPath.trim()) {
			continue;
		}

		normalized[name] = path.isAbsolute(repoPath)
			? repoPath
			: path.resolve(configDirectory, repoPath);
	}

	return normalized;
}

export function resolveConfigPathForWrite(explicitConfigPath = null) {
	if (explicitConfigPath) {
		return path.resolve(explicitConfigPath);
	}

	if (process.env.MAPLARGE_ADK_CONFIG) {
		return path.resolve(process.env.MAPLARGE_ADK_CONFIG);
	}

	if (process.env.CLAUDE_CONFIG_DIR) {
		return path.join(process.env.CLAUDE_CONFIG_DIR, "plugins", "maplarge-adk", "config.json");
	}

	return path.join(os.homedir(), ".claude", "plugins", "maplarge-adk", "config.json");
}

export function readPluginConfigForWrite(explicitConfigPath = null) {
	const configPath = resolveConfigPathForWrite(explicitConfigPath);
	const raw = isFile(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};

	return {
		configPath,
		config: {
			...raw,
			repoHints: Array.isArray(raw.repoHints) ? raw.repoHints : [],
			localRepos: raw.localRepos && typeof raw.localRepos === "object" && !Array.isArray(raw.localRepos)
				? raw.localRepos
				: {},
			docsPortalBaseUrl:
				typeof raw.docsPortalBaseUrl === "string" && raw.docsPortalBaseUrl.trim()
					? raw.docsPortalBaseUrl
					: DEFAULT_DOCS_PORTAL_BASE_URL,
			internalMode: raw.internalMode === true,
		},
	};
}

export function writePluginConfig(configPath, config) {
	fs.mkdirSync(path.dirname(configPath), { recursive: true });
	fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function pluginDocSource() {
	return {
		source: "plugin",
		priority: 1,
		path: path.join(pluginRoot, "docs"),
	};
}

function portalDocSources(baseUrl) {
	return [
		{
			source: "portal",
			priority: 2,
			url: baseUrl,
		},
		{
			source: "portal",
			priority: 2,
			url: `${baseUrl}/MapLargeCLI`,
		},
		{
			source: "portal",
			priority: 2,
			url: `${baseUrl}/ADKFolder`,
		},
	];
}

function collectLocalDocSources(repo) {
	const sources = [];
	const candidates = repo.docPaths ?? [];

	for (const candidate of candidates) {
		if (isFile(candidate)) {
			sources.push({
				source: "local",
				priority: 3,
				path: candidate,
			});
		}
	}

	return sources;
}

const MAPLARGE_AZURE_REMOTE_PREFIX = "https://dev.azure.com/MapLarge/";
const MAPLARGE_GITHUB_REMOTE_PREFIX = "https://github.com/MapLarge/";
const MAPLARGE_CORE_REMOTE = "https://dev.azure.com/MapLarge/Internal/_git/maplarge-api-server-git";
const MAPLARGE_CLI_REMOTE = "https://dev.azure.com/MapLarge/Internal/_git/maplarge-cli";

function findGitRoot(startPath) {
	return findUpward(startPath, (candidate) =>
		isDirectory(path.join(candidate, ".git")) || isFile(path.join(candidate, ".git")),
	);
}

function parseGitOriginRemote(rootPath) {
	let gitConfigPath = path.join(rootPath, ".git", "config");
	const gitFilePath = path.join(rootPath, ".git");
	if (!isFile(gitConfigPath) && isFile(gitFilePath)) {
		const gitFile = fs.readFileSync(gitFilePath, "utf8");
		const match = gitFile.match(/^gitdir:\s*(.+?)\s*$/m);
		if (match) {
			const gitDir = path.isAbsolute(match[1])
				? match[1]
				: path.resolve(rootPath, match[1]);
			gitConfigPath = path.join(gitDir, "config");
		}
	}

	if (!isFile(gitConfigPath)) {
		return null;
	}

	const raw = fs.readFileSync(gitConfigPath, "utf8");
	let inOrigin = false;

	for (const line of raw.split(/\r?\n/)) {
		const section = line.match(/^\s*\[remote\s+"([^"]+)"\]\s*$/);
		if (section) {
			inOrigin = section[1] === "origin";
			continue;
		}

		if (!inOrigin) {
			continue;
		}

		const url = line.match(/^\s*url\s*=\s*(.+?)\s*$/);
		if (url) {
			return url[1];
		}
	}

	return null;
}

function identifyRepoFromRemote(remoteUrl) {
	if (!remoteUrl) {
		return null;
	}

	const normalized = remoteUrl.replace(/\/$/, "");
	if (normalized === MAPLARGE_CORE_REMOTE) {
		return { name: "core", remoteUrl };
	}

	if (normalized === MAPLARGE_CLI_REMOTE) {
		return { name: "maplarge-cli", remoteUrl };
	}

	if (
		normalized.startsWith(MAPLARGE_AZURE_REMOTE_PREFIX)
		|| normalized.startsWith(MAPLARGE_GITHUB_REMOTE_PREFIX)
	) {
		return { name: "maplarge-source", remoteUrl };
	}

	return null;
}

function localRepoPayload(name, resolvedRoot, remoteUrl = null) {
	const coreManifest = path.join(resolvedRoot, "MapLarge.Engine", "Extensibility", "ExtensionManifest.cs");
	const coreAdkDocs = path.join(
		resolvedRoot,
		"docs",
		"extensions",
		"ml-docs-core",
		"client",
		"_static",
		"adk",
		"adk-local-environment.md",
	);
	const coreQueryReference = path.join(
		resolvedRoot,
		"docs",
		"extensions",
		"ml-docs-dev",
		"client",
		"_static",
		"QueryReference.md",
	);
	const coreQueryJson = path.join(
		resolvedRoot,
		"docs",
		"extensions",
		"ml-docs-dev",
		"client",
		"_static",
		"query",
		"query-json.md",
	);
	const coreRaptorBindings = path.join(
		resolvedRoot,
		"docs",
		"extensions",
		"ml-docs-dev",
		"client",
		"raptor-bindings.ts",
	);
	const coreRaptorNodes = path.join(
		resolvedRoot,
		"docs",
		"extensions",
		"ml-docs-dev",
		"client",
		"raptor-nodes.ts",
	);
	const coreRestApiQuickStart = path.join(
		resolvedRoot,
		"docs",
		"extensions",
		"ml-docs-dev",
		"client",
		"rest-api-quick-start.ts",
	);
	const maplargeCliTemplates = path.join(resolvedRoot, "dotnet", "adk-templates", "templates.json");
	const maplargeCliAdkSource = path.join(resolvedRoot, "dotnet", "cli", "adk");
	const pluginManifest = path.join(resolvedRoot, ".claude-plugin", "plugin.json");

	if (name === "core") {
		return {
			name,
			path: resolvedRoot,
			...(remoteUrl ? { remoteUrl } : {}),
			docPaths: [
				coreAdkDocs,
				coreQueryReference,
				coreQueryJson,
				coreRaptorBindings,
				coreRaptorNodes,
				coreRestApiQuickStart,
			],
			toolSources: [
				{ repo: "core", kind: "extension-manifest-source", path: coreManifest },
			].filter((source) => isFile(source.path)),
		};
	}

	if (name === "maplarge-cli") {
		return {
			name,
			path: resolvedRoot,
			...(remoteUrl ? { remoteUrl } : {}),
			docPaths: [],
			toolSources: [
				{ repo: "maplarge-cli", kind: "adk-templates", path: maplargeCliTemplates },
				{ repo: "maplarge-cli", kind: "adk-cli-source", path: maplargeCliAdkSource },
			].filter((source) => isFile(source.path) || isDirectory(source.path)),
		};
	}

	if (name === "maplarge-adk-plugin") {
		return {
			name,
			path: resolvedRoot,
			...(remoteUrl ? { remoteUrl } : {}),
			docPaths: [path.join(resolvedRoot, "docs", "getting-started.md")],
			toolSources: [
				{ repo: "maplarge-adk-plugin", kind: "plugin-manifest", path: pluginManifest },
			],
		};
	}

	return {
		name,
		path: resolvedRoot,
		...(remoteUrl ? { remoteUrl } : {}),
		docPaths: [],
		toolSources: [],
	};
}

function identifyLocalRepoRoot(rootPath) {
	const resolvedRoot = path.resolve(rootPath);
	const remoteUrl = parseGitOriginRemote(resolvedRoot);
	const remoteMatch = identifyRepoFromRemote(remoteUrl);
	if (remoteMatch) {
		return localRepoPayload(remoteMatch.name, resolvedRoot, remoteMatch.remoteUrl);
	}

	const maplargeCliTemplates = path.join(resolvedRoot, "dotnet", "adk-templates", "templates.json");
	const maplargeCliAdkSource = path.join(resolvedRoot, "dotnet", "cli", "adk");
	if (isFile(maplargeCliTemplates) && isDirectory(maplargeCliAdkSource)) {
		return localRepoPayload("maplarge-cli", resolvedRoot);
	}

	const coreManifest = path.join(resolvedRoot, "MapLarge.Engine", "Extensibility", "ExtensionManifest.cs");
	const coreAdkDocs = path.join(
		resolvedRoot,
		"docs",
		"extensions",
		"ml-docs-core",
		"client",
		"_static",
		"adk",
		"adk-local-environment.md",
	);
	const coreCliQuickReference = path.join(resolvedRoot, "docs", "CLI-Extension-Quick-Reference.md");
	if (isFile(coreManifest) || isFile(coreAdkDocs)) {
		return localRepoPayload("core", resolvedRoot);
	}

	const pluginManifest = path.join(resolvedRoot, ".claude-plugin", "plugin.json");
	if (isFile(pluginManifest)) {
		return localRepoPayload("maplarge-adk-plugin", resolvedRoot);
	}

	return null;
}

export function validateConfiguredRepo(name, repoPath) {
	const identified = identifyLocalRepoRoot(repoPath);
	if (!identified) {
		return {
			name,
			path: path.resolve(repoPath),
			available: false,
			error: "No recognized MapLarge ADK repo markers were found at this path.",
		};
	}

	if (name !== identified.name) {
		return {
			name,
			path: path.resolve(repoPath),
			available: false,
			detectedName: identified.name,
			error: `Expected ${name} repo markers but found ${identified.name}.`,
		};
	}

	return {
		...identified,
		available: true,
	};
}

function configuredRepoEntries(config) {
	const entries = [];

	for (const [name, repoPath] of Object.entries(config.localRepos ?? {})) {
		entries.push(validateConfiguredRepo(name, repoPath));
	}

	for (const repoPath of config.repoHints ?? []) {
		const identified = identifyLocalRepoRoot(repoPath);
		entries.push({
			...(identified ?? {}),
			name: identified?.name ?? "repoHint",
			path: path.resolve(repoPath),
			available: Boolean(identified),
			via: "repoHint",
			error: identified ? undefined : "No recognized MapLarge ADK repo markers were found at this path.",
		});
	}

	return entries;
}

function currentWorkspaceRepoEntry(cwd, options = {}) {
	const gitRoot = findGitRoot(cwd);
	const identified = identifyLocalRepoRoot(gitRoot ?? cwd);
	if (!identified) {
		return null;
	}

	if (identified.name === "maplarge-source" && options.allowGenericMapLargeSource !== true) {
		return null;
	}

	return {
		...identified,
		available: true,
		via: "cwd",
	};
}

function shouldSkipDiscoveryEntry(entryName) {
	return entryName === ".git"
		|| entryName === "node_modules"
		|| entryName === "bin"
		|| entryName === "obj"
		|| entryName === ".adk";
}

export function discoverLocalRepoCandidates(searchRoots = [], maxDepth = 3) {
	const candidates = [];
	const seen = new Set();

	for (const searchRoot of searchRoots) {
		const root = path.resolve(searchRoot);
		if (!isDirectory(root)) {
			continue;
		}

		const queue = [{ candidate: root, depth: 0 }];
		for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
			const { candidate, depth } = queue[queueIndex];
			const canonical = canonicalPath(candidate);
			if (seen.has(canonical)) {
				continue;
			}
			seen.add(canonical);

			const identified = identifyLocalRepoRoot(candidate);
			if (identified) {
				candidates.push({
					name: identified.name,
					path: identified.path,
					confidence: "high",
					...(identified.remoteUrl ? { remoteUrl: identified.remoteUrl } : {}),
					docPaths: identified.docPaths,
					toolSources: identified.toolSources,
				});
				continue;
			}

			if (depth >= maxDepth) {
				continue;
			}

			for (const entry of fs.readdirSync(candidate, { withFileTypes: true })) {
				if (!entry.isDirectory() || shouldSkipDiscoveryEntry(entry.name)) {
					continue;
				}

				queue.push({
					candidate: path.join(candidate, entry.name),
					depth: depth + 1,
				});
			}
		}
	}

	return candidates;
}

function nearbyDiscoveryRoots(cwd) {
	const roots = [];
	const resolvedCwd = path.resolve(cwd);
	const gitRoot = findGitRoot(resolvedCwd);
	const anchor = gitRoot ?? resolvedCwd;
	const parent = path.dirname(anchor);
	const grandparent = path.dirname(parent);

	for (const candidate of [parent, grandparent]) {
		if (candidate && candidate !== anchor && isDirectory(candidate)) {
			roots.push(candidate);
		}
	}

	return [...new Set(roots)];
}

function dedupeRepoEntries(entries) {
	const seen = new Set();
	const deduped = [];

	for (const entry of entries) {
		const key = `${entry.name}:${entry.path}`;
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push(entry);
	}

	return deduped;
}

function collectToolSources(repos) {
	return repos.flatMap((repo) => repo.toolSources ?? []);
}

function readAdkTemplates(localToolSources) {
	const templates = [];
	const seen = new Set();

	for (const source of localToolSources) {
		if (source.repo !== "maplarge-cli" || source.kind !== "adk-templates" || !isFile(source.path)) {
			continue;
		}

		const parsed = readJsonFile(source.path);
		if (!Array.isArray(parsed)) {
			continue;
		}

		for (const template of parsed) {
			if (!template || typeof template !== "object" || typeof template.name !== "string") {
				continue;
			}

			const key = `${source.path}:${template.name}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);

			templates.push({
				name: template.name,
				aliases: Array.isArray(template.aliases) ? template.aliases : [],
				type: template.type ?? null,
				description: template.description ?? null,
				rootFolder: template.rootFolder ?? null,
				location: template.location ?? null,
				defaultPath: template.defaultPath ?? null,
				listed: template.listed === true,
			});
		}
	}

	return templates;
}

export function detectWorkspace(cwd, explicitConfigPath = null, options = {}) {
	const resolvedCwd = path.resolve(cwd);
	const { configPath, config } = loadPluginConfig(explicitConfigPath);
	const projectRoot = findAdkProjectRoot(resolvedCwd);
	const extensionRoot = findExtensionRoot(resolvedCwd);

	let workspaceKind = "generic";
	if (projectRoot) {
		workspaceKind = "adk_project";
	} else if (extensionRoot) {
		workspaceKind = "extension_repo";
	}

	const configuredRepos = configuredRepoEntries(config);
	const discoveryRoots = [
		...(options.discoverRepos ?? []),
		...(options.discoverNearby ? nearbyDiscoveryRoots(resolvedCwd) : []),
	];
	const discoveredRepoCandidates = discoverLocalRepoCandidates(discoveryRoots);
	const localRepos = dedupeRepoEntries([
		...configuredRepos.filter((repo) => repo.available),
		currentWorkspaceRepoEntry(resolvedCwd, {
			allowGenericMapLargeSource: workspaceKind !== "generic",
		}),
		...discoveredRepoCandidates.map((repo) => ({ ...repo, available: true, via: "discovery" })),
	].filter(Boolean));
	const localToolSources = collectToolSources(localRepos);
	const adkTemplates = readAdkTemplates(localToolSources);

	const docSources = [
		pluginDocSource(),
		...portalDocSources(config.docsPortalBaseUrl),
		...localRepos.flatMap((entry) => collectLocalDocSources(entry)),
	];

	return {
		cwd: resolvedCwd,
		workspaceKind,
		projectRoot,
		extensionRoot,
		configPath,
		internalMode: config.internalMode,
		repoHints: config.repoHints,
		configuredRepos: configuredRepos.map((entry) => ({
			name: entry.name,
			path: entry.path,
			available: entry.available,
			...(entry.remoteUrl ? { remoteUrl: entry.remoteUrl } : {}),
			...(entry.detectedName ? { detectedName: entry.detectedName } : {}),
			...(entry.error ? { error: entry.error } : {}),
		})),
		discoveredRepoCandidates: discoveredRepoCandidates.map((entry) => ({
			name: entry.name,
			path: entry.path,
			confidence: entry.confidence,
			...(entry.remoteUrl ? { remoteUrl: entry.remoteUrl } : {}),
		})),
		localRepoRoots: localRepos.map((entry) => ({
			root: entry.path,
			via: entry.via ?? "configured",
			name: entry.name,
			...(entry.remoteUrl ? { remoteUrl: entry.remoteUrl } : {}),
		})),
		localToolSources,
		adkTemplates,
		preferredCliCommands: PREFERRED_ADK_CLI_COMMANDS,
		docSources,
	};
}

function readJsonFile(filePath) {
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch {
		return null;
	}
}

export function resolveConfiguredRemoteServer(projectRoot) {
	const adk = readAdkProjectConfig(projectRoot);
	if (!adk) {
		return null;
	}

	if (typeof adk.server === "string" && adk.server.trim()) {
		return adk.server;
	}

	if (typeof adk.remoteServer === "string" && adk.remoteServer.trim()) {
		return adk.remoteServer;
	}

	return null;
}

export function readAdkProjectConfig(projectRoot) {
	if (!projectRoot) {
		return null;
	}

	const adkConfigPath = path.join(projectRoot, ".adk", ".www", "maplarge.adk.config.json");
	if (!isFile(adkConfigPath)) {
		return null;
	}

	const parsed = readJsonFile(adkConfigPath);
	const adk = parsed?.adk;

	return adk && typeof adk === "object" ? adk : null;
}

export function resolveCurrentAdkProfile(projectRoot) {
	const adk = readAdkProjectConfig(projectRoot);
	if (!adk) {
		return null;
	}

	if (typeof adk.currentProfile === "string" && adk.currentProfile.trim()) {
		return adk.currentProfile;
	}

	return null;
}

export function getAdkUrls(projectRoot) {
	return {
		configuredRemoteServer: resolveConfiguredRemoteServer(projectRoot),
		defaultRunHttpsUrl: DEFAULT_ADK_RUN_HTTPS_URL,
		defaultRunHttpUrl: DEFAULT_ADK_RUN_HTTP_URL,
		guidance: ADK_URLS_GUIDANCE,
	};
}
