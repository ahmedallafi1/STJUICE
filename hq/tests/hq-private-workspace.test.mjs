import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startOrderingServer } from "../../ordering/server.mjs";
import {
  privateWorkspaceAccess, loadPrivateHq, validatePrivateHq,
  privateHqSummary, privateHqCard, privateHqPage
} from "../private-workspace.mjs";

const folder = mkdtempSync(join(tmpdir(), "stjuice-hq-test-"));
const path = join(folder, "fake-hq.json");
const master = {
  metadata: { pages: 52, cards: 40 },
  cards: Array.from({ length: 40 }, (_, i) => ({
    hqNumber: i + 1,
    name: "SYNTHETIC TEST CARD " + (i + 1),
    category: "TEST ONLY", sourcePdfPage: 4 + Math.floor(i / 2),
    serving: "16 oz", suggestedPriceUsd: 10,
    foodCostUsd: 1.5, packagingCostUsd: 0.5, baseCogsUsd: 2,
    estimatedGrossProfitUsd: 8, ingredientsText: "FAKE ingredient 100 mL",
    methodText: "FAKE shake", presentationText: "FAKE cup",
    allergenPrompt: "Unverified", status: { ownerApproved: false }
  })),
  sourcePages: Array.from({ length: 52 }, (_, i) => ({ page: i + 1, text: "SYNTHETIC SOURCE PAGE " + (i + 1) }))
};
writeFileSync(path, JSON.stringify(master), { mode: 0o600 });
assert.equal(loadPrivateHq(path).cards.length, 40);
assert.equal(validatePrivateHq(master).sourcePages.length, 52);
const review = privateHqSummary(master);
assert.equal(review.cards, 40);
assert.equal(review.pages, 52);
assert.equal(review.ownerApproved, 0);
assert.equal(review.flagAbove30Pct, 0);
assert.equal(privateHqCard(master, 40).name, "SYNTHETIC TEST CARD 40");
assert.equal(privateHqPage(master, 52).page, 52);
assert.equal(privateHqCard(master, 41), null);
assert.throws(() => validatePrivateHq({ ...master, cards: master.cards.slice(1) }), /40 numbered cards/);
assert.equal(privateWorkspaceAccess({ socket: { remoteAddress: "203.0.113.10" }, headers: { host: "localhost" } }, { ST_JUICE_HQ_PRIVATE_LOCAL_ENABLED: "true" }).available, false);
assert.equal(privateWorkspaceAccess({ socket: { remoteAddress: "127.0.0.1" }, headers: { host: "localhost" } }, { ST_JUICE_HQ_PRIVATE_LOCAL_ENABLED: "true", VERCEL: "1" }).available, false);

process.env.STJ_TEST_ADMIN_TOKEN = "hq-fake-local-only-test";
process.env.ST_JUICE_HQ_PRIVATE_LOCAL_ENABLED = "true";
process.env.ST_JUICE_HQ_MASTER_PATH = path;
const server = await startOrderingServer({ port: 0 });
const base = "http://127.0.0.1:" + server.address().port;
const request = (suffix, token = true) => fetch(base + "/api/admin/hq/private/" + suffix,
  { headers: token ? { "X-STJ-Admin-Token": process.env.STJ_TEST_ADMIN_TOKEN } : {} });
try {
  assert.equal((await request("status", false)).status, 401);
  const state = await (await request("status")).json();
  assert.equal(state.available, true);
  assert.equal(state.cards, 40);
  const summary = await (await request("summary")).json();
  assert.equal(summary.cards, 40);
  assert.equal(summary.sourcePricesAreProposals, true);
  const one = await (await request("cards/1")).json();
  assert.equal(one.ingredients, "FAKE ingredient 100 mL");
  assert.equal((await (await request("page?number=52")).json()).text, "SYNTHETIC SOURCE PAGE 52");
  assert.equal((await request("cards/41")).status, 404);
  process.env.VERCEL = "1";
  assert.equal((await (await request("status")).json()).available, false);
  assert.equal((await request("summary")).status, 403);
  delete process.env.VERCEL;
  console.log(JSON.stringify({ status: "passed", protectedAdmin: true, localOnly: true, cloudDenied: true, pages: 52, cards: 40 }));
} finally {
  delete process.env.VERCEL;
  server.close();
  await once(server, "close");
  delete process.env.STJ_TEST_ADMIN_TOKEN;
  delete process.env.ST_JUICE_HQ_PRIVATE_LOCAL_ENABLED;
  delete process.env.ST_JUICE_HQ_MASTER_PATH;
  rmSync(folder, { recursive: true, force: true });
}
