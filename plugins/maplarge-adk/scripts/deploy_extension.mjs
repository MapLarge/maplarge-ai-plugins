// Deploys MapLarge ADK extensions to a server profile via `maplarge adk
// deploy`, with optional extension-config preservation across the deploy.
//
// Port of jfailing-tools deploy-extension.ps1, keeping its hard-won gotchas:
//   - the extension config route is CASE-SENSITIVE (lowercase 'config';
//     capital-C returns 500 "No plugin <Ext>/Config"),
//   - auth goes via the aInfo query param (Bearer headers are not honored by
//     extension endpoints),
//   - the config snapshot is kept as a RAW string; JSON round-trips silently
//     truncate deeply nested configs,
//   - NETSDK1005 / targetFramework-mismatch deploy failures get a diagnosis.
//
// Usage:
//   node deploy_extension.mjs --extensions "Ext1,Ext2" --profile local [--preserve-config]
//                             [--increment-version BUILD|MINOR|MAJOR|REVISION|NONE]
//                             [--skip-install] [--project path] [--cwd path]

import process from "node:process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { spawnSync } from "node:child_process";
import { findAdkProjectRoot, isExecutedAsScript } from "./common.mjs";

const INCREMENT_VALUES = new Set(["BUILD", "MINOR", "MAJOR", "REVISION", "NONE"]);

function logProgress(message) {
	process.stderr.write(`${message}\n`);
}

function resolveProfileConnection(profile) {
	const result = spawnSync("maplarge", ["config", "list-profiles"], { encoding: "utf8" });
	if (result.status !== 0) {
		return { server: null, token: null };
	}
	const text = result.stdout ?? "";
	const server = new RegExp(`name: ${profile}[\\s\\S]*?server: (\\S+)`).exec(text)?.[1] ?? null;
	const token = new RegExp(`name: ${profile}[\\s\\S]*?token: (\\S+)`).exec(text)?.[1] ?? null;
	return { server: server ? server.replace(/\/+$/, "") : null, token };
}

// Local/dev servers use self-signed certs; requests inside fn run with TLS
// verification off (the PowerShell original used -SkipCertificateCheck).
async function withInsecureTls(fn) {
	const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	try {
		return await fn();
	} finally {
		if (previous === undefined) {
			delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		} else {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
		}
	}
}

export async function getExtensionConfig(server, token, extensionName) {
	return withInsecureTls(async () => {
		try {
			const response = await fetch(
				`${server}/restapi/v1/apps/${extensionName}/config?aInfo=mltoken:${token}`,
			);
			if (response.ok) {
				const text = await response.text();
				return text || null;
			}
		} catch {
			// Extension may not be installed yet or has no config endpoint.
		}
		return null;
	});
}

export async function restoreExtensionConfig(server, token, extensionName, rawConfig) {
	return withInsecureTls(async () => {
		const request = JSON.stringify({
			action: "admin/updateextensionconfig",
			extension: { name: extensionName, config: rawConfig },
		});
		const body = new URLSearchParams({ request, aInfo: `mltoken:${token}` });
		const response = await fetch(`${server}/Api/ProcessDirect`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});
		if (!response.ok) {
			return false;
		}
		try {
			const parsed = JSON.parse(await response.text());
			return parsed?.success === true;
		} catch {
			return false;
		}
	});
}

function diagnoseDeployFailure(outputText) {
	const frameworkMismatch = outputText.match(
		/default framework is (net[\d.]+), but this profile is set to (net[\d.]+)/,
	);
	if (frameworkMismatch) {
		return (
			`LIKELY CAUSE: the profile pins targetFramework '${frameworkMismatch[2]}' but the CLI default is '${frameworkMismatch[1]}'. ` +
			`Fix (after confirming the target server's runtime): maplarge config update-profile -name <profile> -targetFramework ${frameworkMismatch[1]}`
		);
	}
	if (/NETSDK1005/.test(outputText)) {
		return (
			"LIKELY CAUSE: stale restore state for the requested targetFramework. " +
			"Check the profile's targetFramework (maplarge config list-profiles) against the target server's runtime, " +
			"or clean the extension's server obj/bin folders and retry."
		);
	}
	return null;
}

export async function main(argv = process.argv.slice(2)) {
	const options = {
		extensions: [],
		profile: null,
		incrementVersion: "BUILD",
		skipInstall: false,
		preserveConfig: false,
		cwd: process.cwd(),
		projectPath: null,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--extensions") {
			options.extensions = (argv[index + 1] ?? "").split(",").map((name) => name.trim()).filter(Boolean);
			index += 1;
		} else if (token === "--profile") {
			options.profile = argv[index + 1];
			index += 1;
		} else if (token === "--increment-version") {
			options.incrementVersion = (argv[index + 1] ?? "").toUpperCase();
			index += 1;
		} else if (token === "--skip-install") {
			options.skipInstall = true;
		} else if (token === "--preserve-config") {
			options.preserveConfig = true;
		} else if (token === "--cwd") {
			options.cwd = argv[index + 1];
			index += 1;
		} else if (token === "--project") {
			options.projectPath = argv[index + 1];
			index += 1;
		}
	}

	if (options.extensions.length === 0 || !options.profile) {
		throw new Error("--extensions \"Name1,Name2\" and --profile are required.");
	}
	if (!INCREMENT_VALUES.has(options.incrementVersion)) {
		throw new Error(`--increment-version must be one of: ${[...INCREMENT_VALUES].join(", ")}.`);
	}

	const projectRoot = options.projectPath
		? path.resolve(options.projectPath)
		: findAdkProjectRoot(path.resolve(options.cwd));
	if (!projectRoot) {
		throw new Error(
			"Could not find an ADK project root (.adk folder). Run from within an ADK project or pass --project <path>.",
		);
	}
	logProgress(`ADK project: ${projectRoot}`);

	// Config preservation: snapshot before the deploy resets configs.
	const savedConfigs = new Map();
	let preservation = {};
	let server = null;
	let token = null;
	if (options.preserveConfig) {
		({ server, token } = resolveProfileConnection(options.profile));
		if (!server || !token) {
			logProgress(`WARNING: could not extract server/token for profile '${options.profile}'. Config preservation disabled.`);
			options.preserveConfig = false;
		} else {
			logProgress("Snapshotting extension configs...");
			for (const extension of options.extensions) {
				const config = await getExtensionConfig(server, token, extension);
				if (config) {
					savedConfigs.set(extension, config);
					preservation[extension] = "saved";
					logProgress(`  Saved config for: ${extension}`);
				} else {
					preservation[extension] = "skipped";
					logProgress(`  No existing config for: ${extension} (skipping)`);
				}
			}
		}
	}

	const deployArgs = [
		"adk", "deploy",
		"-extensions", options.extensions.join(","),
		"-profile", options.profile,
		"-seedVersion", "SERVER_INSTALLED",
		"-incrementVersion", options.incrementVersion,
		"-overwrite",
	];
	if (!options.skipInstall) {
		deployArgs.push("-install");
	}

	logProgress(`Deploying ${options.extensions.join(", ")} to profile '${options.profile}' ` +
		`(increment: ${options.incrementVersion}, install: ${!options.skipInstall})...`);
	logProgress(`Running: maplarge ${deployArgs.join(" ")}`);

	const deploy = spawnSync("maplarge", deployArgs, { encoding: "utf8", cwd: projectRoot });
	const deployOutput = `${deploy.stdout ?? ""}${deploy.stderr ?? ""}`;
	process.stderr.write(deployOutput);

	if (deploy.status !== 0) {
		const diagnosis = diagnoseDeployFailure(deployOutput);
		throw new Error(
			`Deployment failed with exit code ${deploy.status}.${diagnosis ? ` ${diagnosis}` : ""}`,
		);
	}

	// Restore configs after install. Installs do not always reset config
	// (verified on core 4.131) — compare first and skip intact ones.
	if (options.preserveConfig && savedConfigs.size > 0) {
		logProgress("Restoring extension configs...");
		await delay(2000);
		for (const [extension, saved] of savedConfigs) {
			const current = await getExtensionConfig(server, token, extension);
			if (current === saved) {
				preservation[extension] = "intact";
				logProgress(`  Config intact for: ${extension} (no restore needed)`);
				continue;
			}
			const restored = await restoreExtensionConfig(server, token, extension, saved);
			preservation[extension] = restored ? "restored" : "failed";
			logProgress(restored
				? `  Restored config for: ${extension}`
				: `  FAILED to restore config for: ${extension}`);
		}
	}

	process.stdout.write(`${JSON.stringify({
		deployed: true,
		extensions: options.extensions,
		profile: options.profile,
		incrementVersion: options.incrementVersion,
		installed: !options.skipInstall,
		projectRoot,
		configPreservation: preservation,
	}, null, 2)}\n`);
}

if (isExecutedAsScript(import.meta.url)) {
	main().catch((error) => {
		process.stderr.write(`\nError: ${error?.message ?? error}\n`);
		process.exitCode = 1;
	});
}
