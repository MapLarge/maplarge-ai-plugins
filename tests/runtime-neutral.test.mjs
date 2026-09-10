import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assertNoBlocking, relPath, repoRoot, walkFiles } from "./common.mjs";

// Runtime-neutral plugin paths (ARC-33, ported from the internal suite's
// codex-parity check): skill markdown must not depend on any one assistant's
// runtime. `${CLAUDE_PLUGIN_ROOT}` only exists under Claude Code — and the
// same goes for any other assistant's root variable (`${CODEX_PLUGIN_ROOT}`
// and friends), so the patterns below match ANY `${*_PLUGIN_ROOT}` variable
// and any "is set by <runtime> when the skill runs" promise, not just
// Claude's. Shipped guidance uses the `<plugin-root>` placeholder instead —
// and any file that uses the placeholder must define it, so a reader (human
// or model) landing on that file alone knows how to resolve it.
//
// evals/ are exempt for the same reason they are exempt in .vale.ini: golden
// prompts legitimately quote the patterns skills must not contain, and the
// mirror strips them before anything ships (ARC-31/34).
//
// Scope is plugins/**/*.md on purpose - do not widen to docs/ or the repo
// root: contributor docs (docs/automated-checks.md included) quote
// ${CLAUDE_PLUGIN_ROOT} as the anti-example and would self-flag, and plugin
// scripts legitimately reference runtime homes in code. Unlike leak
// protection, a Claude-specific path in a non-skill file is a style question,
// not a shipping defect. The one exception: the defining-sentence test below
// also scans README.md, because the README demos the helper scripts via
// <plugin-root> and is the first file a GitHub reader sees.

// Kept verbatim from the internal suite even though this repo currently ships
// no .codex-plugin manifests: the sentence describes resolution in the
// *installed* runtime, and matching the internal wording keeps promoted skills
// passing both suites unchanged.
const DEFINING_SENTENCE =
	"Resolve `<plugin-root>` as the directory containing `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json`";

// ${CLAUDE_PLUGIN_ROOT}, ${CODEX_PLUGIN_ROOT}, or any future runtime's variant.
const RUNTIME_VARIABLE = /\$\{[A-Z_]*PLUGIN_ROOT[A-Z_]*\}/;
// "is set by Claude Code when the skill runs" and any other runtime's version.
const RUNTIME_PROMISE = /is set by [^.\n]{1,40}? when the skill runs/;

/** Every shipped plugin markdown file (skills, docs, references) minus evals/. */
function pluginMarkdown() {
	const pluginsRoot = path.join(repoRoot, "plugins");
	const files = walkFiles(pluginsRoot, (name) => name.endsWith(".md")).filter(
		(file) => !relPath(file).split("/").includes("evals"),
	);
	assert.ok(files.length > 0, "no markdown found under plugins/ — has the layout changed?");
	return files.map((file) => ({ path: relPath(file), text: fs.readFileSync(file, "utf8") }));
}

test("plugin markdown never references a Claude-only runtime", (t) => {
	const violations = [];
	for (const file of pluginMarkdown()) {
		const variable = file.text.match(RUNTIME_VARIABLE);
		if (variable) {
			violations.push({
				rule: "runtime-neutral.plugin-root",
				path: file.path,
				message: `uses ${variable[0]} — use \`<plugin-root>\` or a relative link instead`,
			});
		}
		const promise = file.text.match(RUNTIME_PROMISE);
		if (promise) {
			violations.push({
				rule: "runtime-neutral.runtime-promise",
				path: file.path,
				message: `promises a single runtime's environment ("${promise[0]}")`,
			});
		}
	}
	assertNoBlocking(t, violations, "runtime-neutrality violations");
});

test("every file using <plugin-root> defines how to resolve it", (t) => {
	// README.md is scanned too: it demos the helper scripts via <plugin-root>,
	// and a GitHub reader lands there first.
	const candidates = [
		...pluginMarkdown(),
		{ path: "README.md", text: fs.readFileSync(path.join(repoRoot, "README.md"), "utf8") },
	];
	const violations = [];
	for (const file of candidates) {
		if (!file.text.includes("<plugin-root>")) continue;
		if (!file.text.includes(DEFINING_SENTENCE)) {
			violations.push({
				rule: "runtime-neutral.plugin-root-definition",
				path: file.path,
				message: "uses <plugin-root> without the defining sentence (see docs/automated-checks.md)",
			});
		}
	}
	assertNoBlocking(t, violations, "plugin-root definition violations");
});
