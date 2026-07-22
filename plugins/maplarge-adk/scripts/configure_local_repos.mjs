import path from "node:path";
import process from "node:process";
import {
	isExecutedAsScript,
	parseCliArgs,
	readPluginConfigForWrite,
	validateConfiguredRepo,
	writePluginConfig,
} from "./common.mjs";

function parseAddValue(value) {
	if (typeof value !== "string" || !value.includes("=")) {
		throw new Error("--add values must use name=/path/to/repo.");
	}

	const [name, ...pathParts] = value.split("=");
	const repoPath = pathParts.join("=");
	const trimmedRepoPath = repoPath.trim();

	if (!/^[A-Za-z0-9_-]+$/.test(name)) {
		throw new Error(`Invalid repo name: ${name}`);
	}

	if (!trimmedRepoPath) {
		throw new Error(`Missing path for repo: ${name}`);
	}

	return {
		name,
		path: path.resolve(trimmedRepoPath),
	};
}

export function configureLocalRepos(argv = process.argv.slice(2)) {
	const options = parseCliArgs(argv);
	const additions = options.add ?? [];
	if (additions.length === 0) {
		throw new Error("At least one --add name=/path/to/repo value is required.");
	}

	const { configPath, config } = readPluginConfigForWrite(options.config ?? null);
	const configuredRepos = [];

	for (const value of additions) {
		const addition = parseAddValue(value);
		const validation = validateConfiguredRepo(addition.name, addition.path);
		if (!validation.available) {
			throw new Error(`${addition.name}: ${validation.error}`);
		}

		config.localRepos[addition.name] = addition.path;
		configuredRepos.push({
			name: addition.name,
			path: addition.path,
			available: true,
		});
	}

	writePluginConfig(configPath, config);

	return {
		configPath,
		configuredRepos,
	};
}

export function main(argv = process.argv.slice(2)) {
	try {
		const payload = configureLocalRepos(argv);
		process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
	} catch (error) {
		process.stderr.write(`${String(error?.message ?? error)}\n`);
		process.exitCode = 1;
	}
}

if (isExecutedAsScript(import.meta.url)) {
	main();
}
