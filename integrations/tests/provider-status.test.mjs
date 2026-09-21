import assert from "node:assert/strict";
import { integrationStatus } from "../provider-status.mjs";

const status = integrationStatus();
for (const key of ["payment","pos","database","tax","delivery","transactionalEmail","transactionalSms","errorMonitoring","uptimeMonitoring"]) {
  assert.ok(status[key], `Missing integration status: ${key}`);
  assert.equal(typeof status[key].configured, "boolean");
}
const serialized = JSON.stringify(status);
for (const forbidden of [
  process.env.ST_JUICE_PAYMENT_SECRET,
  process.env.ST_JUICE_POS_SECRET,
  process.env.ST_JUICE_DATABASE_URL,
  process.env.ST_JUICE_EMAIL_SECRET,
  process.env.ST_JUICE_SMS_SECRET
].filter(Boolean)) {
  assert.ok(!serialized.includes(forbidden), "Integration status must never expose credential values");
}
assert.equal(status.payment.configured, false);
assert.equal(status.pos.configured, false);
assert.equal(status.database.configured, false);

console.log(JSON.stringify({
  status: "valid",
  integrationsChecked: Object.keys(status).length,
  credentialsExposed: false,
  productionProvidersStillBlocked: true
}, null, 2));
