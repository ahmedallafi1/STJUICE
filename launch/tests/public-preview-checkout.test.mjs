import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../../ordering/server.mjs";

// Contract: public preview keeps the WHOLE simulated checkout journey available,
// without real payment capture or any access to private HQ.
const previousVercel = process.env.VERCEL;
const previousClock = process.env.ST_JUICE_TEST_NOW;
process.env.VERCEL = "1";
process.env.ST_JUICE_TEST_NOW = "2026-09-20T18:00:00Z";
const server = await startOrderingServer({ port: 0 });
const base = "http://127.0.0.1:" + server.address().port;
const json = async (path, body) => {
  const response = await fetch(base + path, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  return { status: response.status, data: await response.json() };
};
try {
  const cfg = await json("/api/config");
  assert.equal(cfg.status, 200);
  assert.equal(cfg.data.mode, "safe_test");
  assert.equal(cfg.data.payments.live, false);
  const quote = await json("/api/cart/validate", {
    service: "pickup",
    items: [{ kind: "catalog", productId: "blue-saint", sizeId: "16oz", quantity: 1, modifierSelections: {} }],
    tipPercent: 0
  });
  assert.equal(quote.status, 200, JSON.stringify(quote.data));
  assert.equal(quote.data.valid, true);
  const testPayment = await json("/api/payment/intents", { quoteId: quote.data.quoteId });
  assert.equal(testPayment.status, 201, JSON.stringify(testPayment.data));
  assert.match(testPayment.data.token, /^test_pay_/);
  const orderBody = {
    quoteId: quote.data.quoteId, paymentToken: testPayment.data.token,
    paymentMethod: "card", schedule: "asap", allergenAcknowledged: true,
    customer: { name: "Preview Guest", email: "preview@example.com", phone: "3145550100", marketingConsent: false }
  };
  const response = await fetch(base + "/api/orders", {
    method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "ci-preview-intent-20261014" },
    body: JSON.stringify(orderBody)
  });
  const order = await response.json();
  assert.equal(response.status, 201, JSON.stringify(order));
  assert.equal(order.order.mode, "safe_test");
  assert.equal(order.order.payment.method, "card");
  assert.equal(order.order.payment.status, "captured_test");
  assert.equal(order.order.status, "received");
  const hqDenied = await json("/api/admin/hq/private/summary");
  assert.equal(hqDenied.status === 401 || hqDenied.status === 503, true);
  console.log(JSON.stringify({
    status: "passed", publicPreviewCheckout: "functional", simulatedPayment: true,
    orderCreated: true, mode: "safe_test", realCharge: false, confidentialHqProtected: true
  }));
} finally {
  server.close();
  await once(server, "close");
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;
  if (previousClock === undefined) delete process.env.ST_JUICE_TEST_NOW;
  else process.env.ST_JUICE_TEST_NOW = previousClock;
}
