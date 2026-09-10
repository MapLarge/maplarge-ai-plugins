import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	formatViolations,
	partitionKnown,
	relPath,
	repoRoot,
	walkFiles,
} from "./common.mjs";

// Relative-link resolution across every markdown file in the repo (ARC-15
// acceptance criterion). VS Code's markdown.validate covers this in-editor
// only; this is the CLI/CI-side equivalent. External URLs are out of scope —
// checking them needs the network and fails on flaky hosts, not on drift.

/** Remove fenced code blocks so headings and links inside examples are not scanned. */
function stripFences(text) {
	return text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1`*~*[^\n]*$/gm, "");
}

/** Additionally remove inline code spans, for link extraction. */
function stripCode(text) {
	return stripFences(text).replace(/`[^`\n]*`/g, "");
}

/** GitHub-style heading slugs for a markdown file, duplicate-suffixed. */
function headingSlugs(text) {
	const slugs = new Set();
	const counts = new Map();
	// Inline code spans stay in (GitHub keeps their text in the slug); only
	// their backticks are stripped below with the other markdown syntax.
	for (const match of stripFences(text).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
		let heading = match[1];
		// Strip markdown emphasis/code/link syntax from the heading text.
		heading = heading.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");
		let slug = heading
			.toLowerCase()
			.trim()
			.replace(/[^\p{L}\p{N}\- ]/gu, "")
			.replace(/ /g, "-");
		const seen = counts.get(slug) ?? 0;
		counts.set(slug, seen + 1);
		if (seen > 0) slug = `${slug}-${seen}`;
		slugs.add(slug);
	}
	return slugs;
}

function extractLinks(text) {
	const links = [];
	const stripped = stripCode(text);
	for (const match of stripped.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
		let target = match[1].trim();
		// Drop an optional link title: (path "title")
		const title = /^(\S+)\s+["'(]/.exec(target);
		if (title) target = title[1];
		if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
		links.push(target);
	}
	return links;
}

test("every relative markdown link and anchor resolves", (t) => {
	const files = walkFiles(repoRoot, (name) => name.toLowerCase().endsWith(".md"));
	assert.ok(files.length > 0, "no markdown files found — has the layout changed?");

	const violations = [];
	const slugCache = new Map();
	const slugsOf = (absPath) => {
		if (!slugCache.has(absPath)) slugCache.set(absPath, headingSlugs(fs.readFileSync(absPath, "utf8")));
		return slugCache.get(absPath);
	};

	for (const file of files) {
		const filePath = relPath(file);
		const text = fs.readFileSync(file, "utf8");
		for (const rawTarget of extractLinks(text)) {
			if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) continue; // http:, https:, mailto:, vscode: …

			const [targetPath, anchor] = rawTarget.split("#", 2);
			let resolved;
			if (targetPath === "") {
				resolved = file; // same-file anchor
			} else {
				const decoded = decodeURIComponent(targetPath);
				resolved = decoded.startsWith("/")
					? path.join(repoRoot, decoded)
					: path.resolve(path.dirname(file), decoded);
			}

			if (!fs.existsSync(resolved)) {
				violations.push({
					rule: "links.resolve",
					path: filePath,
					message: `broken relative link: (${rawTarget}) — target does not exist`,
				});
				continue;
			}

			if (anchor !== undefined && anchor !== "" && fs.statSync(resolved).isFile() && resolved.toLowerCase().endsWith(".md")) {
				if (!slugsOf(resolved).has(anchor.toLowerCase())) {
					violations.push({
						rule: "links.anchor",
						path: filePath,
						message: `broken anchor: (${rawTarget}) — no heading in ${relPath(resolved)} slugs to "#${anchor}"`,
					});
				}
			}
		}
	}

	const { blocking, baselined } = partitionKnown(violations);
	for (const v of baselined) {
		t.diagnostic(`known failure (${v.ticket}): ${v.path} [${v.rule}] ${v.message}`);
	}
	assert.deepEqual(
		blocking.map((v) => `${v.path} [${v.rule}]`),
		[],
		`broken links:\n${formatViolations(blocking)}`,
	);
});
