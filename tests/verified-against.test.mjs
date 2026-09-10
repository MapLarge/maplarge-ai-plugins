import assert from "node:assert/strict";
import test from "node:test";
import { mostRecentVerifiedDate } from "./common.mjs";

// ARC-55 date extractor: verified-against is free text by design, so the
// parser's tolerance (not the corpus) is the contract worth pinning here.

const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getTime();

test("full dates: picks the most recent of several", () => {
	const value =
		"MapLarge Server trunk 119ba585c6e (2026-08-26) source re-anchored + verbs verified live on Server 4.139 (docs host) 2026-09-09 (ARC-46); CLI @ 1.0.90";
	assert.equal(mostRecentVerifiedDate(value)?.getTime(), utc(2026, 9, 9));
});

test("month-precision baseline phrases resolve to the 1st", () => {
	assert.equal(mostRecentVerifiedDate("MapLarge ADK CLI @ 2026-08 import baseline")?.getTime(), utc(2026, 8, 1));
});

test("a full date outranks an older month baseline", () => {
	const value = "Raptor patterns @ 2026-08 import baseline; flags verified live 2026-09-09 (ARC-44)";
	assert.equal(mostRecentVerifiedDate(value)?.getTime(), utc(2026, 9, 9));
});

test("versions and commit hashes are not dates", () => {
	assert.equal(mostRecentVerifiedDate("MapLarge Server 4.139, CLI 1.0.90, trunk 119ba585c6e"), null);
});

test("invalid months and days are ignored", () => {
	assert.equal(mostRecentVerifiedDate("2026-13 baseline; 2026-00-10; 2026-05-40"), null);
});

test("non-string and empty inputs return null", () => {
	assert.equal(mostRecentVerifiedDate(undefined), null);
	assert.equal(mostRecentVerifiedDate(""), null);
});
