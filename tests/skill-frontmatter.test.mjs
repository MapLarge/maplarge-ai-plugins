import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertNoBlocking, everySkill, readFrontMatter, relPath } from "./common.mjs";

// Skill-frontmatter checks: items 1-5 and 8 of the docs/skill-template.md
// acceptance checklist, the mechanically checkable subset. Semantic judgments
// (description states what AND when, owner is a real person) stay with the
// human reviewer.

const DESCRIPTION_CAP = 1024; // skill-template.md §3: hard cap on `description`
const NAME_CAP = 64; // skill-template.md §3: hard cap on `name`
const BODY_LINE_CAP = 500; // skill-template.md §4.4: SKILL.md working-set cap
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED_METADATA = ["owner", "provenance", "verified-against"];

function loadSkills() {
	const skills = everySkill();
	// Guard against the walker silently finding nothing after a layout change.
	assert.ok(skills.length > 0, "no skills found under plugins/*/skills/ — has the layout changed?");
	return skills.map((skill) => ({
		...skill,
		path: relPath(skill.skillFile),
		text: fs.readFileSync(skill.skillFile, "utf8"),
	}));
}

const assertClean = (violations, t) => assertNoBlocking(t, violations, "skill front-matter violations");

test("every SKILL.md has parseable front matter with name and description", (t) => {
	const violations = [];
	for (const skill of loadSkills()) {
		const fm = readFrontMatter(skill.text);
		if (!fm.ok) {
			violations.push({
				rule: "frontmatter.parse",
				path: skill.path,
				message: fm.error === "missing" ? "no YAML front-matter fence" : `front matter does not parse (${fm.error})`,
			});
			continue;
		}
		if (!fm.value.name) {
			violations.push({ rule: "frontmatter.parse", path: skill.path, message: "front matter has no `name`" });
		}
		if (!fm.value.description) {
			violations.push({
				rule: "frontmatter.parse",
				path: skill.path,
				message: "front matter has no `description` — it is what makes the skill fire",
			});
		}
	}
	assertClean(violations, t);
});

test("skill `name` is kebab-case, matches the directory, and fits the cap (checklist item 1)", (t) => {
	const violations = [];
	for (const skill of loadSkills()) {
		const fm = readFrontMatter(skill.text);
		if (!fm.ok || !fm.value.name) continue; // reported by the parse test
		const name = String(fm.value.name);
		if (!KEBAB_CASE.test(name)) {
			violations.push({ rule: "frontmatter.name", path: skill.path, message: `name "${name}" is not kebab-case` });
		}
		if (name !== skill.name) {
			violations.push({
				rule: "frontmatter.name",
				path: skill.path,
				message: `name "${name}" does not match directory "${skill.name}"`,
			});
		}
		if (name.length > NAME_CAP) {
			violations.push({
				rule: "frontmatter.name",
				path: skill.path,
				message: `name is ${name.length} chars (cap ${NAME_CAP})`,
			});
		}
	}
	assertClean(violations, t);
});

test(`skill description is within the ${DESCRIPTION_CAP}-character cap (checklist item 2)`, (t) => {
	const violations = [];
	for (const skill of loadSkills()) {
		const fm = readFrontMatter(skill.text);
		if (!fm.ok || !fm.value.description) continue;
		const length = String(fm.value.description).length;
		if (length > DESCRIPTION_CAP) {
			violations.push({
				rule: "frontmatter.description-length",
				path: skill.path,
				message: `description is ${length} chars, ${length - DESCRIPTION_CAP} over the ${DESCRIPTION_CAP} cap — pickers truncate the tail, so trigger keywords parked there are dead weight`,
			});
		}
	}
	assertClean(violations, t);
});

test("skill metadata carries owner, provenance, and verified-against (checklist items 3-5)", (t) => {
	const violations = [];
	for (const skill of loadSkills()) {
		const fm = readFrontMatter(skill.text);
		if (!fm.ok) continue;
		const metadata = fm.value.metadata;
		if (metadata === null || metadata === undefined || typeof metadata !== "object") {
			violations.push({
				rule: "frontmatter.metadata",
				path: skill.path,
				message: "no `metadata:` block — owner, provenance, and verified-against are required (skill-template.md §3)",
			});
			continue;
		}
		for (const key of REQUIRED_METADATA) {
			const value = metadata[key];
			if (typeof value !== "string" || value.trim() === "") {
				violations.push({
					rule: "frontmatter.metadata",
					path: skill.path,
					message: `metadata.${key} is missing or empty`,
				});
			}
		}
	}
	assertClean(violations, t);
});

test(`SKILL.md stays within the ${BODY_LINE_CAP}-line working-set cap (checklist item 8)`, (t) => {
	const violations = [];
	for (const skill of loadSkills()) {
		const lines = skill.text.split(/\r?\n/);
		const count = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
		if (count > BODY_LINE_CAP) {
			violations.push({
				rule: "skill.line-cap",
				path: skill.path,
				message: `SKILL.md is ${count} lines (cap ${BODY_LINE_CAP}) — move detail to reference/ (skill-template.md §4.4)`,
			});
		}
	}
	assertClean(violations, t);
});
