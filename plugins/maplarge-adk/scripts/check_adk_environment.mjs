import process from "node:process";
import { spawnSync } from "node:child_process";
import {
	detectWorkspace,
	getAdkUrls,
	isExecutedAsScript,
	parseCliArgs,
	resolveCurrentAdkProfile,
} from "./common.mjs";

function checkCommand(command, args, spawnOptions = {}) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		// Windows needs a shell to resolve .cmd/.bat shims via PATHEXT; args here are fixed literals.
		shell: process.platform === "win32",
		...spawnOptions,
	});

	if (result.error) {
		return {
			available: false,
			version: null,
			error: result.error.code ?? result.error.message,
		};
	}

	const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
	return {
		available: result.status === 0,
		version: output || null,
		error: result.status === 0 ? null : output || `exit:${result.status}`,
	};
}

function parseVersion(output) {
	if (typeof output !== "string" || !output.trim()) {
		return null;
	}

	const match = output.match(/\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/);
	return match?.[0] ?? null;
}

function compareVersions(left, right) {
	if (!left || !right) {
		return null;
	}

	const leftParts = left.split(/[.-]/).map((part) => Number.parseInt(part, 10));
	const rightParts = right.split(/[.-]/).map((part) => Number.parseInt(part, 10));
	const length = Math.max(leftParts.length, rightParts.length);

	for (let index = 0; index < length; index += 1) {
		const leftValue = Number.isNaN(leftParts[index]) ? 0 : (leftParts[index] ?? 0);
		const rightValue = Number.isNaN(rightParts[index]) ? 0 : (rightParts[index] ?? 0);
		if (leftValue !== rightValue) {
			return leftValue - rightValue;
		}
	}

	return 0;
}

function inspectAdkVersion(projectRoot, options = {}) {
	if (!projectRoot) {
		return {
			available: false,
			version: null,
			raw: null,
			error: null,
		};
	}

	const result = checkCommand("maplarge", ["adk", "version"], {
		cwd: projectRoot,
		env: options.commandEnv ?? process.env,
	});

	return {
		available: result.available,
		version: parseVersion(result.version),
		raw: result.version,
		error: result.error,
	};
}

function getCliUpgradeGuidance(projectRoot, currentProfile) {
	const projectRefreshCommands = ["maplarge adk update-version"];
	if (projectRoot && currentProfile) {
		projectRefreshCommands.push(`maplarge adk init -profile ${currentProfile}`);
	}

	return {
		installCommand: "dotnet tool install -g MapLargeInc.CLI",
		projectRefreshCommands,
		currentProfile,
		guidance: currentProfile
			? "If an ADK project is behind the installed CLI version, run update-version and then re-run init with the current profile."
			: "If an ADK project is behind the installed CLI version, run update-version and then re-run init with the project's current profile or equivalent server arguments.",
	};
}

function getVersionAlignment(workspace, commands, options = {}) {
	const currentProfile = resolveCurrentAdkProfile(workspace.projectRoot);
	const cliVersion = parseVersion(commands.maplarge.version);
	const projectVersion =
		workspace.workspaceKind === "adk_project" && commands.maplarge.available
			? inspectAdkVersion(workspace.projectRoot, options)
			: {
				available: false,
				version: null,
				raw: null,
				error: null,
			};
	const comparison =
		cliVersion && projectVersion.version ? compareVersions(cliVersion, projectVersion.version) : null;
	const isMismatch = comparison !== null && comparison !== 0;

	let guidance = null;
	if (comparison === null && workspace.workspaceKind === "adk_project" && commands.maplarge.available) {
		guidance = "MapLarge CLI is available, but the ADK project version could not be compared.";
	} else if (comparison > 0) {
		guidance = currentProfile
			? `Installed CLI version ${cliVersion} is newer than ADK project version ${projectVersion.version}. Run maplarge adk update-version and maplarge adk init -profile ${currentProfile}.`
			: `Installed CLI version ${cliVersion} is newer than ADK project version ${projectVersion.version}. Run maplarge adk update-version and re-run maplarge adk init with the project's current profile or equivalent server arguments.`;
	} else if (comparison < 0) {
		guidance = `Installed CLI version ${cliVersion} is older than ADK project version ${projectVersion.version}. Update the global CLI before working in this project.`;
	} else if (comparison === 0 && cliVersion) {
		guidance = `Installed CLI version ${cliVersion} matches the ADK project version.`;
	}

	return {
		globalCliVersion: cliVersion,
		projectCliVersion: projectVersion.version,
		currentProfile,
		isMismatch,
		projectVersionSourceAvailable: projectVersion.available,
		projectVersionError: projectVersion.error,
		guidance,
	};
}

export function checkEnvironment(cwd, explicitConfigPath = null, options = {}) {
	const workspace = detectWorkspace(cwd, explicitConfigPath, options);
	const adkUrls = getAdkUrls(workspace.projectRoot);
	const commands = {
		maplarge: checkCommand("maplarge", ["version"], {
			env: options.commandEnv ?? process.env,
		}),
		dotnet: checkCommand("dotnet", ["--version"], {
			env: options.commandEnv ?? process.env,
		}),
		node: checkCommand("node", ["--version"], {
			env: options.commandEnv ?? process.env,
		}),
	};
	const cliUpgradeGuidance = getCliUpgradeGuidance(
		workspace.workspaceKind === "adk_project" ? workspace.projectRoot : null,
		resolveCurrentAdkProfile(workspace.projectRoot),
	);
	const versionAlignment = getVersionAlignment(workspace, commands, options);

	const missingPrerequisites = [];
	if (!commands.maplarge.available) {
		missingPrerequisites.push("MapLarge CLI (`maplarge`) is not available.");
	}
	if (!commands.dotnet.available) {
		missingPrerequisites.push(".NET SDK (`dotnet`) is not available.");
	}
	if (!commands.node.available) {
		missingPrerequisites.push("Node.js (`node`) is not available.");
	}
	if (workspace.workspaceKind === "generic") {
		missingPrerequisites.push("No ADK project root or extension root was detected from the current directory.");
	}

	return {
		cwd: workspace.cwd,
		workspaceKind: workspace.workspaceKind,
		configPath: workspace.configPath,
		commands,
		adkMarkers: {
			projectRoot: workspace.projectRoot,
			extensionRoot: workspace.extensionRoot,
			localRepoRoots: workspace.localRepoRoots,
		},
		adkUrls,
		docSources: workspace.docSources,
		configuredRepos: workspace.configuredRepos,
		discoveredRepoCandidates: workspace.discoveredRepoCandidates,
		localToolSources: workspace.localToolSources,
		adkTemplates: workspace.adkTemplates,
		preferredCliCommands: workspace.preferredCliCommands,
		cliUpgradeGuidance,
		versionAlignment,
		missingPrerequisites,
	};
}

export function main(argv = process.argv.slice(2)) {
	const options = parseCliArgs(argv);
	const payload = checkEnvironment(options.cwd ?? process.cwd(), options.config ?? null, {
		discoverRepos: options.discoverRepos ?? [],
		discoverNearby: options.discoverNearby === true,
	});
	process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

if (isExecutedAsScript(import.meta.url)) {
	main();
}
