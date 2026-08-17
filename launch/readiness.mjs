import { getLaunchReadiness } from "./lib/readiness.mjs";

const result = getLaunchReadiness();
console.log(JSON.stringify(result, null, 2));
if (!result.launchReady && !process.argv.includes("--allow-blocked")) process.exitCode = 2;
