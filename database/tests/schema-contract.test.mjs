import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

for (const table of [
  "accounts",
  "account_sessions",
  "student_verifications",
  "business_profiles",
  "rewards_enrollment",
  "reward_ledger",
  "reward_grants",
  "reservations",
  "account_orders",
  "account_audit_events"
]) {
  assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`), `Missing ${table} table`);
}

assert.match(schema, /reward_ledger_idempotency_unique/);
assert.match(schema, /reward_grants_source_unique/);
assert.match(schema, /token_digest/);
assert.match(schema, /csrf_digest/);
assert.doesNotMatch(schema, /pointsPerDollar|proposalPercentOff|reward-500|reward-900/i, "Schema must not bake proposal economics into persistence");
assert.match(readme, /must continue to report the database blocker/i);
assert.match(readme, /never fall back silently to memory/i);

console.log(JSON.stringify({
  status: "valid",
  persistenceTarget: "postgresql",
  schemaTablesChecked: 10,
  idempotencyIndexesChecked: true,
  proposalEconomicsExcluded: true
}, null, 2));
