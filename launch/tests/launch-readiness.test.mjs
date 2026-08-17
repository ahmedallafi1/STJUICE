import assert from "node:assert/strict";
import { getLaunchReadiness, launchConfig } from "../lib/readiness.mjs";

const result = getLaunchReadiness();
assert.equal(launchConfig.release, "stage-09-launch-candidate");
assert.equal(result.mode, "safe_test", "Partially configured candidate must stay in safe-test mode");
assert.equal(result.launchReady, false, "Missing owner/vendor inputs must block a live claim");
assert.ok(result.required >= 20, "Launch gate must cover all operational domains");
assert.equal(result.configured, 2, "Approved legal identity and operating-hours assumptions must be retained");
for (const blocker of ["public_origin", "live_payment", "live_pos", "tax", "database", "nutrition", "release_approval"]) assert.ok(result.blockers.includes(blocker), `${blocker} must remain blocked`);
assert.ok(!JSON.stringify(launchConfig).match(/sk_live|password|secret_[A-Za-z0-9]/i), "Committed launch config must not contain credentials");

console.log(JSON.stringify({ status: "valid", launchReady: result.launchReady, requiredChecks: result.required, blockers: result.blockers.length, safeTestPreserved: true }, null, 2));
