import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["--prefix", "site", "test"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ST_JUICE_TEST_NOW: process.env.ST_JUICE_TEST_NOW || "2026-09-20T18:00:00Z"
  }
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
