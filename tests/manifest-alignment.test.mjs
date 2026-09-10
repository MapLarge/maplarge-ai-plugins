import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { everySkill, repoRoot } from "./common.mjs";

// Manifest alignment (ARC-33, ported from the internal suite): the root
// marketplace and each plugin's own manifest must describe the same reality -
// names match directories, versions match, every listed source exists.
//
// The internal check also aligns .codex-plugin manifests; this repo ships no
// Codex distribution surface, so that half does not apply. If one is ever
// added, extend this file to assert Claude/Codex version alignment the way
// claude-plugins/tests/codex-parity.test.mjs does.
//
// EXPECTED_SKILLS is deliberately hard-coded: adding a skill is a reviewed,
// deliberate act, and the count bump in this file is part of the same change
// (the same ritual the internal suite uses).

const EXPECTED_SKILLS = new Map([["maplarge-adk", 12]]);

function pluginDirs() {
	const pluginsRoot = path.join(repoRoot, "plugins");
	return fs
		.readdirSync(pluginsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

function readJson(...segments) {
	return JSON.parse(fs.readFileSync(path.join(repoRoot, ...segments), "utf8"));
}

test("every plugin has a manifest whose name matches its directory", () => {
	for (const name of pluginDirs()) {
		const manifestPath = path.join(repoRoot, "plugins", name, ".claude-plugin", "plugin.json");
		assert.equal(fs.existsSync(manifestPath), true, `plugins/${name} has no .claude-plugin/plugin.json`);
		const manifest = readJson("plugins", name, ".claude-plugin", "plugin.json");
		assert.equal(manifest.name, name, `plugins/${name}: manifest name "${manifest.name}" must match the directory`);
		assert.equal(typeof manifest.version, "string", `plugins/${name}: manifest needs a version`);
	}
});

test("marketplace lists every plugin with a matching source path and version", () => {
	const marketplace = readJson(".claude-plugin", "marketplace.json");

	for (const name of pluginDirs()) {
		const entry = marketplace.plugins.find((plugin) => plugin.name === name);
		assert.ok(entry, `marketplace.json has no entry for plugins/${name}`);
		assert.equal(entry.source, `./plugins/${name}`, `${name}: marketplace source path`);

		const manifest = readJson("plugins", name, ".claude-plugin", "plugin.json");
		assert.equal(
			entry.version,
			manifest.version,
			`${name}: marketplace version ${entry.version} drifts from plugin.json ${manifest.version}`,
		);

		// Repository pointers drift too (plugin.json once pointed at the internal
		// claude-plugins repo; both now point at the public GitHub mirror): when
		// both files name one, they must agree. No URL is hard-coded here on
		// purpose — any future move lands cleanly as long as it updates both
		// files in the same commit (which this assertion is here to force).
		if (entry.repository && manifest.repository) {
			assert.equal(
				manifest.repository,
				entry.repository,
				`${name}: plugin.json repository ${manifest.repository} drifts from marketplace ${entry.repository}`,
			);
		}
	}

	// No dangling entries: every marketplace source must exist on disk.
	for (const entry of marketplace.plugins) {
		const source = path.join(repoRoot, entry.source);
		assert.equal(fs.existsSync(source), true, `${entry.name}: marketplace source ${entry.source} does not exist`);
	}
});

test("each plugin ships its expected skill count (bump this when adding a skill)", () => {
	const byPlugin = new Map();
	for (const skill of everySkill()) {
		const plugin = skill.id.split("/")[0];
		byPlugin.set(plugin, (byPlugin.get(plugin) ?? 0) + 1);
	}

	for (const name of pluginDirs()) {
		assert.ok(
			EXPECTED_SKILLS.has(name),
			`plugins/${name} has no expected skill count — add it to EXPECTED_SKILLS in this file`,
		);
		assert.equal(
			byPlugin.get(name) ?? 0,
			EXPECTED_SKILLS.get(name),
			`${name}: skill count changed — if that is deliberate, update EXPECTED_SKILLS in the same change`,
		);
	}
});
