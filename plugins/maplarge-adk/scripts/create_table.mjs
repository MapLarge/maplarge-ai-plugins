// Creates a MapLarge table via the MapLarge CLI (from a CSV file or a JSON
// schema), then verifies it actually exists. Backs the create-table skill:
// the skill designs the schema, this script owns the fragile CLI plumbing.
//
// Usage:
//   node create-table.mjs --table-name Vehicles --profile local --csv-file /tmp/vehicles.csv
//                         [--account acct] [--visibility Private] [--force-geocode]
//   node create-table.mjs --table-name Vehicles --profile local --schema '{"Name":"String","Age":"Int32"}'

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
	isExecutedAsScript,
	log,
	output,
	parseFlagsStrict,
	runMain,
} from "./common.mjs";

const FLAG_SPEC = {
	"table-name": { type: "string" },
	profile: { type: "string" },
	"csv-file": { type: "string" },
	schema: { type: "string" },
	account: { type: "string" },
	visibility: { type: "string", values: ["Private", "PublicUnlisted", "Public"] },
	"force-geocode": { type: "boolean" },
};

// Compared case-insensitively: a server returning "SYSADMIN" must still be
// filtered out of account auto-detection.
const SYSTEM_ACCOUNTS = new Set([
	"diagnostic", "nobody", "sysadmin", "sysquarantine", "automated_test",
	"_extensions", "_systemalerts", "_systemcrs",
]);

function isSystemAccount(code) {
	return SYSTEM_ACCOUNTS.has(String(code ?? "").toLowerCase());
}

function maplargeCli(args) {
	// account/table listings on a large server can exceed spawnSync's default
	// 1 MB maxBuffer, which would kill the child and read as a failure AFTER
	// the table was actually created.
	const result = spawnSync("maplarge", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	return {
		status: result.status,
		stdout: (result.stdout ?? "").trim(),
		stderr: (result.stderr ?? "").trim(),
		error: result.error,
	};
}

function maplargeCliOrThrow(args) {
	const result = maplargeCli(args);
	if (result.error?.code === "ENOENT") {
		throw new Error("MapLarge CLI not found. Install it with: dotnet tool install -g MapLargeInc.CLI");
	}
	if (result.status !== 0) {
		throw new Error(
			`maplarge ${args.join(" ")} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`,
		);
	}
	return result.stdout;
}

export function verifyProfileExists(profile) {
	const text = maplargeCliOrThrow(["config", "list-profiles"]);
	const names = [...text.matchAll(/^name:\s*(.+?)\s*$/gm)].map((match) => match[1]);
	// Case-insensitive: `--profile Local` must still resolve a profile named `local`.
	const wanted = String(profile).toLowerCase();
	if (!names.some((name) => name.toLowerCase() === wanted)) {
		throw new Error(
			`Profile '${profile}' not found. Available profiles: ${names.join(", ") || "(none)"}. ` +
				`Create one with: maplarge config create-profile -name "${profile}" -server "https://yourserver.com" -user "user@email.com" -password "..."`,
		);
	}
}

// Looks up a profile's login email in a parsed CLI config. Key match is
// case-insensitive to match verifyProfileExists - otherwise autoDetectAccount
// silently falls back to the wrong owned account for e.g. `--profile Local`.
export function profileUserFromParsedConfig(parsed, profile) {
	const profiles = parsed?.profiles;
	if (!profiles || typeof profiles !== "object") {
		return null;
	}
	const wanted = String(profile).toLowerCase();
	const key = Object.keys(profiles).find((name) => name.toLowerCase() === wanted);
	return (key === undefined ? null : profiles[key]?.user) ?? null;
}

// Reads the profile's login email from the CLI config when it exists - the
// config dir varies per OS because the CLI is a .NET tool. Used only to prefer
// the caller's own account during auto-detection; absence just weakens the match.
function profileEmailFromCliConfig(profile) {
	const baseDirs = [
		process.env.APPDATA,
		process.env.XDG_CONFIG_HOME,
		process.platform === "darwin" ? path.join(os.homedir(), "Library", "Application Support") : null,
		path.join(os.homedir(), ".config"),
	].filter(Boolean);
	for (const baseDir of baseDirs) {
		try {
			const configPath = path.join(baseDir, "MapLargeCLI", "maplarge.cli.config.json");
			const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
			return profileUserFromParsedConfig(parsed, profile);
		} catch {
			// Try the next candidate.
		}
	}
	return null;
}

export function autoDetectAccount(profile) {
	log("No account specified, auto-detecting...");
	const json = maplargeCliOrThrow(["admin", "account", "list", "-profile", profile, "-outputTypes", "JSON"]);
	let accounts;
	try {
		accounts = JSON.parse(json)?._embedded?.items ?? [];
	} catch {
		throw new Error(
			"Failed to parse account list from the server. Check connectivity with: " +
				`maplarge admin account list -profile ${profile} -outputTypes JSON`,
		);
	}

	const profileEmail = profileEmailFromCliConfig(profile);
	const owned = accounts.filter((account) => account.owner && !isSystemAccount(account.code));
	// Email compares case-insensitively; otherwise the caller's own account is
	// missed and a different owned account is chosen.
	const wantedEmail = profileEmail ? profileEmail.toLowerCase() : null;
	const chosen =
		(wantedEmail &&
			owned.find((account) => String(account.owner.email ?? "").toLowerCase() === wantedEmail)) ??
		owned[0];
	if (!chosen) {
		const available = accounts.map((account) => account.code).join(", ");
		throw new Error(
			`No user-owned account found on this server. Available accounts: ${available}. ` +
				"Specify one explicitly with --account.",
		);
	}
	log(`Using account: ${chosen.code}`);
	return chosen.code;
}

// The CLI's -input flag expects JSON with single quotes instead of double
// quotes (and no whitespace).
function cliInputJson(value) {
	return JSON.stringify(value).replace(/"/g, "'");
}

export function verifyTableExists(profile, account, tableName) {
	const json = maplargeCliOrThrow(["table", "list", "-profile", profile, "-account", account, "-outputMode", "JSON"]);
	let items;
	try {
		items = JSON.parse(json)?._embedded?.items ?? [];
	} catch {
		// Distinct from "not found": a garbled listing is a connectivity/server
		// problem, not evidence the create failed.
		throw new Error(
			"Failed to parse table list from the server. Check connectivity with: " +
				`maplarge table list -profile ${profile} -account ${account} -outputMode JSON`,
		);
	}
	// Case-insensitive: a server that canonicalizes the name's case must not
	// read as "created but missing" after a successful create.
	const wanted = String(tableName).toLowerCase();
	return items.find((item) => String(item.name ?? "").toLowerCase() === wanted) ?? null;
}

// -local-file-paths imports asynchronously per the CLI's help, so a correct
// create can lag behind table list on a loaded server - poll before failing.
async function waitForTable(profile, account, tableName, { attempts = 5, delayMs = 2000 } = {}) {
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		if (attempt > 0) {
			log("Table not listed yet, retrying...");
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
		const found = verifyTableExists(profile, account, tableName);
		if (found) {
			return found;
		}
	}
	return null;
}

export async function main(argv = process.argv.slice(2)) {
	const { flags } = parseFlagsStrict(argv, FLAG_SPEC);
	const tableName = flags["table-name"];
	const profile = flags.profile;
	const csvFile = flags["csv-file"] ?? null;
	const schemaJson = flags.schema ?? null;
	const visibility = flags.visibility ?? "Private";
	const forceGeocode = flags["force-geocode"];

	if (!tableName || !profile) {
		throw new Error("--table-name and --profile are required.");
	}
	if (forceGeocode && !csvFile) {
		log("WARNING: --force-geocode only applies to CSV uploads; ignored for an empty table.");
	}
	if ((csvFile === null) === (schemaJson === null)) {
		throw new Error("Specify exactly one of --csv-file <path> (upload) or --schema <json> (empty table).");
	}

	verifyProfileExists(profile);

	let schema = null;
	let rowCount = 0;
	if (csvFile) {
		if (!fs.existsSync(csvFile)) {
			throw new Error(`CSV file not found: ${csvFile}`);
		}
		const lines = fs.readFileSync(csvFile, "utf8").split(/\r?\n/).filter((line) => line.trim() !== "");
		rowCount = Math.max(lines.length - 1, 0);
	} else {
		try {
			schema = JSON.parse(schemaJson);
		} catch {
			throw new Error(`Invalid schema JSON: ${schemaJson}`);
		}
	}

	const account = flags.account || autoDetectAccount(profile);

	const inputPayload = { visibility: visibility.toLowerCase() };
	let cliArgs;
	if (csvFile) {
		if (forceGeocode) {
			inputPayload.options = { forceGeocode: true };
			log("Geocoding enabled for address columns.");
		}
		log(`Creating table ${account}/${tableName} with ${rowCount} rows...`);
		cliArgs = [
			"table", "create-table",
			"-account", account,
			"-table-name", tableName,
			"-local-file-paths", csvFile,
			"-profile", profile,
			"-input", cliInputJson(inputPayload),
		];
	} else {
		inputPayload.schema = schema;
		log(`Creating empty table ${account}/${tableName} with ${Object.keys(schema).length} columns...`);
		cliArgs = [
			"table", "create-empty",
			"-account", account,
			"-table-name", tableName,
			"-profile", profile,
			"-input", cliInputJson(inputPayload),
		];
	}

	log(`Running: maplarge ${cliArgs.join(" ")}`);
	maplargeCliOrThrow(cliArgs);

	log("Verifying table was created...");
	const found = await waitForTable(profile, account, tableName);
	if (!found) {
		throw new Error(
			`CLI reported success but table '${account}/${tableName}' is not listed yet. ` +
				`A large CSV import may still be in progress, or the account '${account}' may not be valid. ` +
				`Check again with: maplarge table list -profile ${profile} -account ${account} -outputMode JSON`,
		);
	}

	// Clean up generated CSVs staged in the temp dir. Containment check uses
	// path.relative, not a raw prefix match (which would hit siblings like
	// ...\Temp2\). macOS tmpdir is $TMPDIR under /var/folders, so /tmp is checked too.
	if (csvFile) {
		let resolved = path.resolve(csvFile);
		try {
			resolved = fs.realpathSync(resolved);
		} catch {
			// Already deleted or inaccessible; leave as resolved.
		}
		const tempRoots = [os.tmpdir()];
		if (process.platform !== "win32") {
			tempRoots.push("/tmp");
		}
		const inTemp = tempRoots.some((root) => {
			let realRoot = root;
			try {
				realRoot = fs.realpathSync(root);
			} catch {
				return false;
			}
			const rel = path.relative(realRoot, resolved);
			return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
		});
		if (inTemp) {
			fs.rmSync(csvFile, { force: true });
			log("Cleaned up temp CSV file.");
		}
	}

	log(`Table created and verified: ${account}/${tableName}`);
	log(`Query with: maplarge query exec -profile ${profile} -input "SELECT * FROM ${account}.${tableName} LIMIT 10" -lang sql -outputTypes json`);

	output({
		success: true,
		account,
		tableName,
		fullName: `${account}/${tableName}`,
		rows: csvFile ? (found.rowCount ?? rowCount) : 0,
		columns: schema ? Object.keys(schema).length : undefined,
		schema: schema ?? undefined,
		visibility,
		profile,
		geocoded: Boolean(csvFile) && forceGeocode,
	});
}

if (isExecutedAsScript(import.meta.url)) {
	runMain(main);
}
