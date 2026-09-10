#!/usr/bin/env node
// ARC-15 static check suite entry point: one command, exit nonzero on any
// blocking failure. Four engines, one verdict:
//
//   1. node --test tests/        structural checks (frontmatter, links, eval schema,
//                                runtime neutrality, leak protection, manifest alignment,
//                                publish exclusions) — blocking
//   2. vale                      content rules from styles/MapLarge/ — errors blocking, rest advisory
//   3. markdownlint-cli2         markdown structural hygiene — blocking (corpus cleaned by the ARC-12 retrofit)
//   4. verified-against          stale skill verification dates (ARC-55) — advisory
//
// Findings that are already someone's ticket live in known-failures.json and
// are reported without failing the run; everything new blocks. CI
// (azure-pipelines.yml, ARC-33) runs exactly this command as the trunk PR gate.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { everySkill, findKnownFailure, mostRecentVerifiedDate, readFrontMatter, relPath, repoRoot } from "../tests/common.mjs";
import { fail, pass } from "./style.mjs";

// The `node --test <glob>` invocation below needs Node 21+ (glob args were a
// breaking change); the repo pins 22 LTS in .tool-versions and package.json engines.
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 22) {
	console.error(
		`Node ${process.versions.node} is too old for the check suite (node --test glob patterns need 21+).\n` +
			`Use Node 22 LTS or newer — see .tool-versions.`,
	);
	process.exit(1);
}

const results = []; // { engine, blocking, advisory, baselined, detail }

function heading(text) {
	console.log(`\n=== ${text} ${"=".repeat(Math.max(0, 60 - text.length))}`);
}

// ---------------------------------------------------------------------------
// 1. node --test (structural checks; they apply the baseline themselves)
// ---------------------------------------------------------------------------
heading("node --test tests/");
const nodeTests = spawnSync(process.execPath, ["--test", "tests/*.test.mjs"], {
	cwd: repoRoot,
	stdio: "inherit",
});
results.push({
	engine: "node tests (tests/*.test.mjs)",
	blocking: nodeTests.status === 0 ? 0 : 1,
	detail: nodeTests.status === 0 ? "pass" : "FAIL — see test output above",
});

// ---------------------------------------------------------------------------
// 2. Vale (content rules; errors block unless baselined)
// ---------------------------------------------------------------------------
heading("vale (styles/MapLarge/)");
// Explicit targets rather than "." so node_modules and .git are never walked.
const VALE_TARGETS = ["plugins", "docs", "README.md", "CLAUDE.md"];
const valeBin = process.env.VALE_BIN ?? "vale";
const vale = spawnSync(valeBin, ["--output=JSON", ...VALE_TARGETS], {
	cwd: repoRoot,
	encoding: "utf8",
	shell: false,
});

if (vale.error) {
	console.error(
		`could not run Vale ("${valeBin}"): ${vale.error.message}\n` +
			`install it once (Windows: winget install errata-ai.Vale · macOS: brew install vale)\n` +
			`or point VALE_BIN at the binary. The VS Code extension's bundled binary also works.`,
	);
	results.push({ engine: "vale", blocking: 1, detail: "FAIL — Vale is not installed" });
} else {
	let alerts;
	try {
		alerts = JSON.parse(vale.stdout || "{}");
	} catch {
		console.error(vale.stdout, vale.stderr);
		alerts = null;
	}
	if (alerts === null) {
		results.push({ engine: "vale", blocking: 1, detail: "FAIL — unparseable Vale output" });
	} else {
		let blocking = 0;
		let advisory = 0;
		let baselined = 0;
		const grouped = new Map(); // condensed one-line-per-(file, check) reporting
		const tally = (kind, relFile, alert, extra = "") => {
			const key = `  ${kind}: ${relFile} [${alert.Check}]${extra}`;
			grouped.set(key, (grouped.get(key) ?? 0) + 1);
		};
		for (const [file, fileAlerts] of Object.entries(alerts)) {
			const relFile = path.isAbsolute(file)
				? path.relative(repoRoot, file).split(path.sep).join("/")
				: file.split(path.sep).join("/").replace(/\\/g, "/");
			for (const alert of fileAlerts) {
				if (alert.Severity !== "error") {
					advisory++;
					tally(`advisory (${alert.Severity})`, relFile, alert);
					continue;
				}
				const known = findKnownFailure(alert.Check, relFile);
				if (known) {
					baselined++;
					tally("known failure", relFile, alert, ` → ${known.ticket}`);
				} else {
					blocking++;
					// New drift is always printed in full, one line per hit.
					console.error(`  BLOCKING: ${relFile}:${alert.Line} [${alert.Check}] ${alert.Message}`);
				}
			}
		}
		for (const [line, count] of grouped) console.log(count > 1 ? `${line} ×${count}` : line);
		console.log(`vale: ${blocking} blocking, ${baselined} known (ticketed), ${advisory} advisory`);
		results.push({
			engine: "vale (content rules)",
			blocking,
			advisory,
			baselined,
			detail: blocking === 0 ? "pass" : `FAIL — ${blocking} unbaselined error(s)`,
		});
	}
}

// ---------------------------------------------------------------------------
// 3. markdownlint-cli2 (blocking since the ARC-12 retrofit cleaned the corpus)
// ---------------------------------------------------------------------------
heading("markdownlint-cli2");
try {
	// Read package.json off disk: the package's `exports` map blocks require()ing it.
	const pkgDir = path.join(repoRoot, "node_modules", "markdownlint-cli2");
	const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
	const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin["markdownlint-cli2"];
	const binPath = path.join(pkgDir, bin);
	const mdlint = spawnSync(process.execPath, [binPath, "**/*.md", "!node_modules"], {
		cwd: repoRoot,
		encoding: "utf8",
	});
	const output = `${mdlint.stdout ?? ""}${mdlint.stderr ?? ""}`.trim();
	const findings = output.split(/\r?\n/).filter((line) => /:\d+/.test(line));
	if (mdlint.status === 0) {
		console.log("no findings");
		results.push({ engine: "markdownlint (structure)", blocking: 0, detail: "pass" });
	} else {
		// Same baseline mechanics as the other engines: a finding is either
		// ticketed in known-failures.json (rule = "MDnnn/rule-name") or it blocks.
		let blocking = 0;
		let baselined = 0;
		for (const line of findings) {
			const m = line.match(/^(.+?):\d+(?::\d+)?\s+error\s+(MD\d+\/[\w./-]+)/);
			const known = m ? findKnownFailure(m[2], m[1].split(path.sep).join("/")) : undefined;
			if (known) {
				baselined++;
				console.log(`  known failure: ${line} → ${known.ticket}`);
			} else {
				blocking++;
				console.error(`  BLOCKING: ${line}`);
			}
		}
		console.log(`markdownlint: ${blocking} blocking, ${baselined} known (ticketed)`);
		results.push({
			engine: "markdownlint (structure)",
			blocking,
			baselined,
			detail: blocking === 0 ? "pass" : `FAIL — ${blocking} unbaselined finding(s)`,
		});
	}
} catch (err) {
	console.error(`could not run markdownlint-cli2 (${err.message}) — run \`npm install\` first`);
	results.push({ engine: "markdownlint (structure)", blocking: 1, detail: "FAIL — markdownlint-cli2 not installed (npm install)" });
}

// ---------------------------------------------------------------------------
// 4. verified-against freshness (ARC-55; advisory — promote only if ignored)
// ---------------------------------------------------------------------------
heading("verified-against freshness (advisory)");
{
	const STALE_DAYS = 90; // mirrors the internal knowledge repo's 3-month warning
	const NORM_DAYS = 180; // working norm: re-verify or downgrade to a baseline claim
	const DAY_MS = 86_400_000;
	let advisory = 0;
	for (const skill of everySkill()) {
		const front = readFrontMatter(fs.readFileSync(skill.skillFile, "utf8"));
		// Missing frontmatter or field is skill-frontmatter.test.mjs's job (blocking).
		const value = front.ok ? front.value?.metadata?.["verified-against"] : undefined;
		if (typeof value !== "string") continue;
		const rel = relPath(skill.skillFile);
		const latest = mostRecentVerifiedDate(value);
		if (latest === null) {
			advisory++;
			console.log(`  advisory: ${rel} — no parseable date in verified-against ("${value}")`);
			continue;
		}
		const age = Math.floor((Date.now() - latest.getTime()) / DAY_MS);
		if (age > STALE_DAYS) {
			advisory++;
			const norm = age > NORM_DAYS
				? ` — past the ${NORM_DAYS}-day norm: re-verify or downgrade to an explicit baseline claim`
				: "";
			console.log(`  advisory: ${rel} — most recent verification ${latest.toISOString().slice(0, 10)} is ${age} days old${norm}`);
		}
	}
	if (advisory === 0) console.log("no stale verified-against dates");
	results.push({
		engine: "verified-against freshness (advisory)",
		blocking: 0,
		advisory,
		detail: advisory === 0 ? "pass" : `${advisory} stale or unparseable date(s) (advisory)`,
	});
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------
heading("summary");
let failed = false;
for (const r of results) {
	if (r.blocking > 0) failed = true;
	console.log(`  ${r.blocking > 0 ? fail("FAIL") : pass("ok  ")}  ${r.engine}: ${r.detail}`);
}
console.log(
	failed
		? `\n${fail("BLOCKED")}: fix the failures above, or ticket them and add known-failures.json entries.`
		: `\n${pass("All checks pass.")}`,
);
process.exit(failed ? 1 : 0);
