import test from "node:test";
import assert from "node:assert/strict";
import { parseFlagsStrict } from "../plugins/maplarge-adk/scripts/common.mjs";
import { profileUserFromParsedConfig } from "../plugins/maplarge-adk/scripts/create_table.mjs";

// Unit pins for the pure helpers behind create_table.mjs (ARC-30). The
// CLI-calling functions are exercised by live runs, not here.

test("parseFlagsStrict parses string and boolean flags", () => {
	const spec = {
		"table-name": { type: "string" },
		visibility: { type: "string", values: ["Private", "Public"] },
		"force-geocode": { type: "boolean" },
	};
	const { flags } = parseFlagsStrict(
		["--table-name", "Vehicles", "--visibility", "Public", "--force-geocode"],
		spec,
	);
	assert.deepEqual(flags, { "table-name": "Vehicles", visibility: "Public", "force-geocode": true });
});

test("parseFlagsStrict defaults booleans to false", () => {
	const { flags } = parseFlagsStrict([], { verbose: { type: "boolean" } });
	assert.deepEqual(flags, { verbose: false });
});

test("parseFlagsStrict hard-fails bad input", () => {
	const spec = { profile: { type: "string", values: ["local", "dev"] } };
	assert.throws(() => parseFlagsStrict(["--nope", "x"], spec), /Unknown flag: --nope/);
	assert.throws(() => parseFlagsStrict(["--profile"], spec), /requires a value/);
	assert.throws(() => parseFlagsStrict(["--profile", "prod"], spec), /Invalid value for --profile/);
	assert.throws(() => parseFlagsStrict(["stray"], spec), /Unexpected argument: stray/);
});

test("profileUserFromParsedConfig matches profile keys case-insensitively", () => {
	const parsed = { profiles: { local: { user: "person@example.com" } } };
	assert.equal(profileUserFromParsedConfig(parsed, "Local"), "person@example.com");
	assert.equal(profileUserFromParsedConfig(parsed, "local"), "person@example.com");
});

test("profileUserFromParsedConfig returns null when nothing matches", () => {
	assert.equal(profileUserFromParsedConfig({}, "local"), null);
	assert.equal(profileUserFromParsedConfig({ profiles: null }, "local"), null);
	assert.equal(profileUserFromParsedConfig({ profiles: { dev: {} } }, "dev"), null);
	assert.equal(profileUserFromParsedConfig({ profiles: { dev: { user: "a@b.c" } } }, "local"), null);
});
