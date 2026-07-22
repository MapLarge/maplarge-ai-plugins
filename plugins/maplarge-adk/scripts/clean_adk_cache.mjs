// Cleans the .adk/.build cache (and optionally .adk/.www/ext compiled output)
// for ADK extensions, to fix stale or corrupt build artifacts.
//
// Port of jfailing-tools adk-clean-cache.ps1. Needs no credentials or config;
// the project root is detected by walking up to the nearest .adk folder.
//
// Usage:
//   node clean_adk_cache.mjs --extensions Name1,Name2 [--include-output] [--cwd path] [--project path]
//   node clean_adk_cache.mjs --all [--include-output]

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { findAdkProjectRoot, isDirectory, isExecutedAsScript } from "./common.mjs";

function directorySizeBytes(targetPath) {
	let total = 0;
	let entries;
	try {
		entries = fs.readdirSync(targetPath, { withFileTypes: true });
	} catch {
		return 0;
	}

	for (const entry of entries) {
		const entryPath = path.join(targetPath, entry.name);
		if (entry.isDirectory()) {
			total += directorySizeBytes(entryPath);
		} else if (entry.isFile()) {
			try {
				total += fs.statSync(entryPath).size;
			} catch {
				// Unreadable file; skip it for sizing purposes.
			}
		}
	}

	return total;
}

function listSubdirectories(targetPath) {
	if (!isDirectory(targetPath)) {
		return [];
	}

	return fs
		.readdirSync(targetPath, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

export function cleanAdkCache(cwd, options = {}) {
	const { extensions = [], all = false, includeOutput = false, projectPath = null } = options;

	if (!all && extensions.length === 0) {
		throw new Error("Specify --extensions Name1,Name2 or --all.");
	}
	if (all && extensions.length > 0) {
		throw new Error("--extensions and --all are mutually exclusive.");
	}

	const projectRoot = projectPath ? path.resolve(projectPath) : findAdkProjectRoot(path.resolve(cwd));
	if (!projectRoot || !isDirectory(path.join(projectRoot, ".adk"))) {
		throw new Error(
			"Could not find an ADK project root (.adk folder). Run from within an ADK project or pass --project <path>.",
		);
	}

	const buildPath = path.join(projectRoot, ".adk", ".build");
	const wwwExtPath = path.join(projectRoot, ".adk", ".www", "ext");

	// --all covers extensions with a build cache plus extensions/ entries that
	// have none yet, matching what a full rebuild would touch.
	const targets = all
		? [...new Set([
			...listSubdirectories(buildPath),
			...listSubdirectories(path.join(projectRoot, "extensions")),
		])]
		: extensions;

	const cleaned = [];
	let totalFreedBytes = 0;

	for (const extension of targets) {
		const buildDir = path.join(buildPath, extension);
		const outputDir = path.join(wwwExtPath, extension);
		const entry = { extension, buildCacheFreedBytes: 0, outputFreedBytes: 0 };

		if (isDirectory(buildDir)) {
			entry.buildCacheFreedBytes = directorySizeBytes(buildDir);
			fs.rmSync(buildDir, { recursive: true, force: true });
		}

		if (includeOutput && isDirectory(outputDir)) {
			entry.outputFreedBytes = directorySizeBytes(outputDir);
			fs.rmSync(outputDir, { recursive: true, force: true });
		}

		totalFreedBytes += entry.buildCacheFreedBytes + entry.outputFreedBytes;
		cleaned.push(entry);
	}

	// .adk/lib and .adk/types.d are intentionally untouched — they come from
	// `maplarge adk init`, which is also how they get refreshed.
	return {
		projectRoot,
		includeOutput,
		cleaned,
		extensionsCleaned: cleaned.filter(
			(entry) => entry.buildCacheFreedBytes > 0 || entry.outputFreedBytes > 0,
		).length,
		totalFreedBytes,
		nextStep: "Run 'maplarge adk build -extensions <name>' to rebuild.",
	};
}

export function main(argv = process.argv.slice(2)) {
	const options = {
		extensions: [],
		all: false,
		includeOutput: false,
		cwd: process.cwd(),
		projectPath: null,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--extensions") {
			options.extensions = (argv[index + 1] ?? "")
				.split(",")
				.map((name) => name.trim())
				.filter(Boolean);
			index += 1;
		} else if (token === "--all") {
			options.all = true;
		} else if (token === "--include-output") {
			options.includeOutput = true;
		} else if (token === "--cwd") {
			options.cwd = argv[index + 1];
			index += 1;
		} else if (token === "--project") {
			options.projectPath = argv[index + 1];
			index += 1;
		}
	}

	const payload = cleanAdkCache(options.cwd, options);
	process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

if (isExecutedAsScript(import.meta.url)) {
	main();
}
