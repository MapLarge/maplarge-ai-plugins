import process from "node:process";
import { detectWorkspace, isExecutedAsScript, parseCliArgs } from "./common.mjs";

export function main(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  const payload = detectWorkspace(options.cwd ?? process.cwd(), options.config ?? null, {
    discoverRepos: options.discoverRepos ?? [],
    discoverNearby: options.discoverNearby === true,
  });
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

if (isExecutedAsScript(import.meta.url)) {
  main();
}
