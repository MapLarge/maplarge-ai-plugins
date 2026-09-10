import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	everySkill,
	formatViolations,
	partitionKnown,
	readFrontMatter,
	relPath,
} from "./common.mjs";

// Golden-prompt schema validation against docs/eval-format.md (ARC-14).
// ARC-15 owns the check-type vocabulary going forward; extend the constants
// here (and document the extension in docs/automated-checks.md), not in
// eval-format.md.

const TOP_LEVEL_FIELDS = new Set([
	"id", "skill", "title", "owner", "provenance", "created",
	"status", "setup", "prompt", "checks", "verified-against",
]);
const REQUIRED_FIELDS = ["id", "skill", "title", "owner", "provenance", "created", "prompt", "checks"];
const STATUS_VALUES = new Set(["active", "known-fail"]);
const SETUP_FIELDS = new Set(["plugin-installed", "server-profile", "workspace"]);
const SEVERITIES = new Set(["required", "expected"]);
const MODES = new Set(["static", "judge"]);
const STATIC_TYPES = new Set(["regex-absent", "regex-present", "file-exists", "command"]);
const REGEX_TARGETS = new Set(["artifacts", "transcript"]);
const CHECK_FIELDS = new Set([
	"id", "description", "severity", "mode", "type", "target", "pattern", "paths", "command", "criteria",
]);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function everyEvalFile() {
	const files = [];
	for (const skill of everySkill()) {
		const evalsDir = path.join(skill.dir, "evals");
		if (!fs.existsSync(evalsDir)) continue;
		for (const entry of fs.readdirSync(evalsDir, { withFileTypes: true })) {
			if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
			if (entry.name === "results.md") continue; // run log, not a case file
			files.push({ skill, file: path.join(evalsDir, entry.name), name: entry.name });
		}
	}
	return files;
}

/** Validate one check object; returns violation messages. */
function validateCheck(check, index, seenIds) {
	const messages = [];
	const label = `checks[${index}]${check?.id ? ` (${check.id})` : ""}`;
	if (check === null || typeof check !== "object" || Array.isArray(check)) {
		return [`${label}: each check must be a map`];
	}

	for (const key of Object.keys(check)) {
		if (!CHECK_FIELDS.has(key)) messages.push(`${label}: unknown field "${key}"`);
	}
	if (typeof check.id !== "string" || !SLUG.test(check.id)) {
		messages.push(`${label}: \`id\` must be a kebab-case slug`);
	} else if (seenIds.has(check.id)) {
		messages.push(`${label}: duplicate check id "${check.id}"`);
	} else {
		seenIds.add(check.id);
	}
	if (typeof check.description !== "string" || check.description.trim() === "") {
		messages.push(`${label}: \`description\` is required`);
	}
	if (!SEVERITIES.has(check.severity)) {
		messages.push(`${label}: \`severity\` must be "required" or "expected", got "${check.severity}"`);
	}
	if (!MODES.has(check.mode)) {
		messages.push(`${label}: \`mode\` must be "static" or "judge", got "${check.mode}"`);
		return messages;
	}

	if (check.mode === "judge") {
		if (typeof check.criteria !== "string" || check.criteria.trim() === "") {
			messages.push(`${label}: judge checks need written \`criteria\``);
		}
		for (const key of ["type", "target", "pattern", "paths", "command"]) {
			if (key in check) messages.push(`${label}: \`${key}\` is a static-check field, not valid on a judge check`);
		}
		return messages;
	}

	// mode: static
	if (!STATIC_TYPES.has(check.type)) {
		messages.push(`${label}: static checks need \`type\` of ${[...STATIC_TYPES].join(" / ")}, got "${check.type}"`);
		return messages;
	}
	if ("criteria" in check) {
		messages.push(`${label}: \`criteria\` is a judge-check field, not valid on a static check`);
	}

	const isRegex = check.type === "regex-absent" || check.type === "regex-present";
	if (isRegex) {
		if (!REGEX_TARGETS.has(check.target)) {
			messages.push(`${label}: regex checks need \`target\` of "artifacts" or "transcript", got "${check.target}"`);
		}
		if (typeof check.pattern !== "string" || check.pattern === "") {
			messages.push(`${label}: regex checks need a non-empty \`pattern\``);
		}
		if ("paths" in check && (!Array.isArray(check.paths) || check.paths.some((p) => typeof p !== "string"))) {
			messages.push(`${label}: \`paths\` must be a list of glob strings`);
		}
		// The first manual dry run (ARC-14, 2026-08-26) showed transcript-wide
		// absence checks false-fail correct answers that quote the forbidden
		// pattern in order to warn against it. eval-format.md steers these to
		// artifacts; this makes it a hard rule.
		if (check.type === "regex-absent" && check.target === "transcript") {
			messages.push(
				`${label}: regex-absent against the transcript false-fails answers that quote the pattern to warn against it — point it at artifacts, or use a judge check for prose`,
			);
		}
	}
	if (check.type === "command") {
		if (typeof check.command !== "string" || check.command.trim() === "") {
			messages.push(`${label}: command checks need a non-empty \`command\``);
		}
		for (const key of ["target", "pattern", "paths"]) {
			if (key in check) messages.push(`${label}: \`${key}\` is a regex-check field, not valid on a command check`);
		}
	}
	if (check.type === "file-exists") {
		// ARC-15 vocabulary decision: file-exists names its files via `paths`
		// (at least one glob), since eval-format.md left the field unassigned.
		if (!Array.isArray(check.paths) || check.paths.length === 0 || check.paths.some((p) => typeof p !== "string")) {
			messages.push(`${label}: file-exists checks need \`paths\`: a non-empty list of glob strings`);
		}
		for (const key of ["target", "pattern", "command"]) {
			if (key in check) messages.push(`${label}: \`${key}\` is not valid on a file-exists check`);
		}
	}
	return messages;
}

test("every golden-prompt file conforms to docs/eval-format.md", (t) => {
	const evalFiles = everyEvalFile();
	if (evalFiles.length === 0) {
		t.diagnostic("no evals/ case files exist yet — schema validation is a no-op until the first golden prompt lands (ARC-12/ARC-30)");
		return;
	}

	const violations = [];
	const seenGlobalIds = new Set();
	const report = (path_, message) => violations.push({ rule: "eval.schema", path: path_, message });

	for (const { skill, file, name } of evalFiles) {
		const filePath = relPath(file);
		const slug = name.replace(/\.md$/, "");
		if (!SLUG.test(slug)) report(filePath, `case file name "${name}" must be a kebab-case slug + .md`);

		const fm = readFrontMatter(fs.readFileSync(file, "utf8"));
		if (!fm.ok) {
			report(filePath, fm.error === "missing" ? "no YAML front-matter fence" : `front matter does not parse (${fm.error})`);
			continue;
		}
		const doc = fm.value;

		for (const key of Object.keys(doc)) {
			if (!TOP_LEVEL_FIELDS.has(key)) report(filePath, `unknown top-level field "${key}"`);
		}
		for (const key of REQUIRED_FIELDS) {
			if (!(key in doc) || doc[key] === null || doc[key] === "") report(filePath, `required field \`${key}\` is missing`);
		}

		if (typeof doc.id === "string") {
			const expected = `${skill.name}/${slug}`;
			if (doc.id !== expected) report(filePath, `\`id\` must be "${expected}" (skill folder / file slug), got "${doc.id}"`);
			if (seenGlobalIds.has(doc.id)) report(filePath, `duplicate eval id "${doc.id}"`);
			seenGlobalIds.add(doc.id);
		}
		if (typeof doc.skill === "string" && doc.skill !== skill.name) {
			report(filePath, `\`skill\` is "${doc.skill}" but the file lives under "${skill.name}"`);
		}
		if (typeof doc.created === "string" && !ISO_DATE.test(doc.created)) {
			report(filePath, `\`created\` must be an ISO date (YYYY-MM-DD), got "${doc.created}"`);
		}
		if ("status" in doc && doc.status !== null && !STATUS_VALUES.has(doc.status)) {
			report(filePath, `\`status\` must be "active" or "known-fail", got "${doc.status}"`);
		}
		if ("setup" in doc && doc.setup !== null) {
			if (typeof doc.setup !== "object" || Array.isArray(doc.setup)) {
				report(filePath, "`setup` must be a map");
			} else {
				for (const key of Object.keys(doc.setup)) {
					if (!SETUP_FIELDS.has(key)) report(filePath, `unknown setup field "${key}"`);
				}
			}
		}

		if (!Array.isArray(doc.checks) || doc.checks.length === 0) {
			report(filePath, "`checks` must be a non-empty list");
			continue;
		}
		const seenCheckIds = new Set();
		doc.checks.forEach((check, i) => {
			for (const message of validateCheck(check, i, seenCheckIds)) report(filePath, message);
		});
		if (!doc.checks.some((c) => c && c.severity === "required")) {
			report(filePath, "at least one check must have severity `required`");
		}
	}

	const { blocking, baselined } = partitionKnown(violations);
	for (const v of baselined) {
		t.diagnostic(`known failure (${v.ticket}): ${v.path} [${v.rule}] ${v.message}`);
	}
	assert.deepEqual(
		blocking.map((v) => v.path),
		[],
		`eval schema violations:\n${formatViolations(blocking)}`,
	);
});
