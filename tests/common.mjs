import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([".git", "node_modules"]);

/** Recursively collect files under `dir` (absolute paths), skipping vendored trees. */
export function walkFiles(dir, filter = () => true) {
	const out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			out.push(...walkFiles(path.join(dir, entry.name), filter));
		} else if (entry.isFile() && filter(entry.name)) {
			out.push(path.join(dir, entry.name));
		}
	}
	return out;
}

/** Repo-relative path with forward slashes, for stable reporting and baseline matching. */
export function relPath(absPath) {
	return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

/** Every skill directory across every plugin: { id, dir, skillFile }. */
export function everySkill() {
	const skills = [];
	const pluginsRoot = path.join(repoRoot, "plugins");
	for (const plugin of fs.readdirSync(pluginsRoot, { withFileTypes: true })) {
		if (!plugin.isDirectory()) continue;
		const skillsRoot = path.join(pluginsRoot, plugin.name, "skills");
		if (!fs.existsSync(skillsRoot)) continue;
		for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const skillFile = path.join(skillsRoot, entry.name, "SKILL.md");
			if (!fs.existsSync(skillFile)) continue;
			skills.push({
				id: `${plugin.name}/${entry.name}`,
				name: entry.name,
				dir: path.join(skillsRoot, entry.name),
				skillFile,
			});
		}
	}
	return skills;
}

// ---------------------------------------------------------------------------
// YAML front-matter subset parser (built-ins only, matching the repo rule)
// ---------------------------------------------------------------------------
// Handles the subset SKILL.md and eval files actually use: nested maps, lists
// of maps, inline JSON-style arrays, quoted scalars, and folded (>) / literal
// (|) block scalars. Not a general YAML parser on purpose: anchors, aliases,
// multi-docs, and flow maps are out, and hitting them throws so the file gets
// flagged rather than silently misread.

/**
 * Extract and parse the YAML front matter of a markdown file.
 * Returns { ok: true, value } or { ok: false, error } (error === "missing"
 * when there is no front-matter fence at all).
 */
export function readFrontMatter(text) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
	if (!match) return { ok: false, error: "missing" };
	try {
		return { ok: true, value: parseYaml(match[1]) };
	} catch (err) {
		return { ok: false, error: err.message };
	}
}

export function parseYaml(src) {
	const rawLines = src.split(/\r?\n/);
	// Token stream of meaningful lines: { indent, text, lineNo }
	const lines = [];
	for (let i = 0; i < rawLines.length; i++) {
		const raw = rawLines[i];
		if (/^\s*$/.test(raw)) continue;
		if (/^\s*#/.test(raw)) continue;
		const indent = raw.match(/^ */)[0].length;
		lines.push({ indent, text: raw.slice(indent), lineNo: i + 1, raw });
	}
	let pos = 0;

	function fail(msg, lineNo) {
		throw new Error(`YAML line ${lineNo}: ${msg}`);
	}

	function parseBlock() {
		if (pos >= lines.length) return null;
		return lines[pos].text.startsWith("- ") || lines[pos].text === "-"
			? parseList(lines[pos].indent)
			: parseMap(lines[pos].indent);
	}

	function parseMap(indent) {
		const map = {};
		while (pos < lines.length && lines[pos].indent === indent && !lines[pos].text.startsWith("- ")) {
			const line = lines[pos];
			const keyed = /^([^:\s][^:]*):(?:\s(.*))?$/.exec(line.text);
			if (!keyed) fail(`expected "key: value", got "${line.text}"`, line.lineNo);
			const key = keyed[1].trim();
			const rest = keyed[2] !== undefined ? keyed[2].trim() : line.text.endsWith(":") ? "" : undefined;
			if (rest === undefined) fail(`expected "key: value", got "${line.text}"`, line.lineNo);
			pos++;
			map[key] = parseValue(rest, indent);
		}
		if (pos < lines.length && lines[pos].indent > indent) {
			fail(`unexpected indentation`, lines[pos].lineNo);
		}
		return map;
	}

	function parseList(indent) {
		const list = [];
		while (pos < lines.length && lines[pos].indent === indent && (lines[pos].text.startsWith("- ") || lines[pos].text === "-")) {
			const line = lines[pos];
			const rest = line.text === "-" ? "" : line.text.slice(2);
			// Re-enter as if the item content started at indent + 2: a "- key: value"
			// item is a map whose remaining keys sit aligned under the first one.
			if (/^[^:\s][^:]*:(\s|$)/.test(rest)) {
				lines[pos] = { ...line, indent: indent + 2, text: rest };
				list.push(parseMap(indent + 2));
			} else {
				pos++;
				list.push(rest === "" ? parseBlock() : parseScalar(rest));
			}
		}
		return list;
	}

	function parseValue(rest, indent) {
		if (rest === "") {
			// Nested block (map or list) indented deeper than the key.
			if (pos < lines.length && lines[pos].indent > indent) return parseBlock();
			return null;
		}
		if (/^[>|]-?$/.test(rest)) return parseBlockScalar(indent, rest[0]);
		// Plain or quoted scalar; deeper-indented follow-up lines are YAML plain
		// continuations and join with a space.
		let text = rest;
		while (pos < lines.length && lines[pos].indent > indent) {
			text += ` ${lines[pos].text}`;
			pos++;
		}
		return parseScalar(text);
	}

	function parseBlockScalar(indent, style) {
		const collected = [];
		while (pos < lines.length && lines[pos].indent > indent) {
			collected.push(lines[pos].raw.slice(indent + 2 <= lines[pos].indent ? indent + 2 : lines[pos].indent));
			pos++;
		}
		return style === ">" ? collected.join(" ").trim() : collected.join("\n").trim();
	}

	function parseScalar(text) {
		const value = text.trim();
		if (value.startsWith("[")) {
			// Inline array; YAML double-quoted strings are JSON-compatible.
			try {
				return JSON.parse(value);
			} catch {
				throw new Error(`unparseable inline array: ${value}`);
			}
		}
		if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
			try {
				return JSON.parse(value);
			} catch {
				return value.slice(1, -1);
			}
		}
		if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
			return value.slice(1, -1);
		}
		return value;
	}

	const result = parseBlock(0);
	if (pos < lines.length) fail(`trailing content`, lines[pos].lineNo);
	return result ?? {};
}

// ---------------------------------------------------------------------------
// verified-against date extraction (ARC-55)
// ---------------------------------------------------------------------------

/**
 * Most recent date in a free-text verified-against value, or null.
 * Tolerates YYYY-MM-DD and month-precision phrases like "2026-08 import
 * baseline" (resolved to the 1st); the field stays free text on purpose.
 */
export function mostRecentVerifiedDate(text) {
	if (typeof text !== "string") return null;
	let latest = null;
	for (const m of text.matchAll(/(?<![\d-])(\d{4})-(\d{2})(?:-(\d{2}))?(?![\d-])/g)) {
		const [, year, month, day] = m;
		const mo = Number(month);
		const d = day === undefined ? 1 : Number(day);
		if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
		const date = new Date(Date.UTC(Number(year), mo - 1, d));
		if (latest === null || date > latest) latest = date;
	}
	return latest;
}

// ---------------------------------------------------------------------------
// Known-failures baseline
// ---------------------------------------------------------------------------
// known-failures.json downgrades findings that are already someone's ticket
// (ARC-12 retrofit, DE-761 DataGrid docs) from failures to diagnostics, so the
// suite stays green on trunk while NEW drift still blocks. Every entry must
// carry a ticket; remove entries as the tickets land.

function loadKnownFailures() {
	const file = path.join(repoRoot, "known-failures.json");
	if (!fs.existsSync(file)) return [];
	const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
	for (const entry of parsed.entries ?? []) {
		if (!entry.rule || !entry.path || !entry.ticket) {
			throw new Error(`known-failures.json: every entry needs rule, path, and ticket: ${JSON.stringify(entry)}`);
		}
	}
	return parsed.entries ?? [];
}

export const knownFailures = loadKnownFailures();

/** Glob-lite matcher: `*` in a baseline path matches anything, including `/`. */
function pathMatches(patternText, candidate) {
	const pattern = new RegExp(
		`^${patternText.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`,
	);
	return pattern.test(candidate);
}

export function findKnownFailure(rule, filePath) {
	return knownFailures.find((e) => e.rule === rule && pathMatches(e.path, filePath));
}

/**
 * Split violations ({ rule, path, message }) into { blocking, baselined }.
 * Tests assert blocking is empty and report baselined entries (annotated with
 * their ticket) as diagnostics.
 */
export function partitionKnown(violations) {
	const blocking = [];
	const baselined = [];
	for (const v of violations) {
		const entry = findKnownFailure(v.rule, v.path);
		if (entry) baselined.push({ ...v, ticket: entry.ticket });
		else blocking.push(v);
	}
	return { blocking, baselined };
}

export function formatViolations(violations) {
	return violations.map((v) => `  ${v.path} [${v.rule}] ${v.message}`).join("\n");
}

/**
 * Standard verdict for violation-collecting tests: report baselined findings
 * (annotated with their ticket) as diagnostics, fail on anything blocking.
 */
export function assertNoBlocking(t, violations, label) {
	const { blocking, baselined } = partitionKnown(violations);
	for (const v of baselined) {
		t.diagnostic(`known failure (${v.ticket ?? "ticketed"}): ${v.path} [${v.rule}] ${v.message}`);
	}
	assert.deepEqual(
		blocking.map((v) => `${v.path} [${v.rule}]`),
		[],
		`${label}:\n${formatViolations(blocking)}`,
	);
}
