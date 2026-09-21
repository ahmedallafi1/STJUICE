import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../server.mjs";

const server = await startOrderingServer({ port: 0 });
const { port } = server.address();

try {
  const response = await fetch(`http://127.0.0.1:${port}/api/config`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  const serialized = JSON.stringify(payload);
  assert.ok(!serialized.includes("TEST10"), "Public config must not expose preview promo codes");
  assert.ok(!serialized.includes("test_pos_receipt"), "Public config must not expose internal POS adapter names");
  assert.ok(!serialized.includes("safe_test_token"), "Public config must not expose internal payment adapter names");
  assert.equal(payload.payments.acceptsRawCardData, false);
  assert.ok(Array.isArray(payload.pricing.tips.allowedPercentages));

  console.log(JSON.stringify({
    status: "valid",
    promoCodeExposed: false,
    internalAdaptersExposed: false,
    rawCardDataAccepted: false
  }, null, 2));
} finally {
  server.close();
  await once(server, "close");
}
