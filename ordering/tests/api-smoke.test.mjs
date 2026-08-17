import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../server.mjs";

const server = await startOrderingServer({ port: 0 });
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const payload = await response.json();
  return { response, payload };
}

try {
  const health = await json("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.payload.mode, "safe_test");
  const readiness = await json("/api/launch-readiness");
  assert.equal(readiness.response.status, 200);
  assert.equal(readiness.payload.launchReady, false);
  assert.ok(readiness.payload.blockers.includes("live_payment"));

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const slots = await json(`/api/slots?service=pickup&date=${tomorrow}`);
  assert.ok(slots.payload.slots.length > 0);
  const schedule = slots.payload.slots[0].value;

  const cartBody = { service: "pickup", items: [{ kind: "catalog", productId: "pistachio-saint", sizeId: "16oz", quantity: 1, modifierSelections: {} }], promoCode: "TEST10", tipPercent: 0 };
  const quote = await json("/api/cart/validate", { method: "POST", body: JSON.stringify(cartBody) });
  assert.equal(quote.response.status, 200);
  assert.equal(quote.payload.valid, true);

  const rawCard = await json("/api/payment/intents", { method: "POST", body: JSON.stringify({ quoteId: quote.payload.quoteId, cardNumber: "4242424242424242" }) });
  assert.equal(rawCard.response.status, 400);
  assert.equal(rawCard.payload.error.code, "raw_card_data_rejected");

  const payment = await json("/api/payment/intents", { method: "POST", body: JSON.stringify({ quoteId: quote.payload.quoteId }) });
  assert.equal(payment.response.status, 201);
  assert.ok(payment.payload.token.startsWith("test_pay_"));

  const key = `api-test-${Date.now()}`;
  const orderBody = { quoteId: quote.payload.quoteId, paymentToken: payment.payload.token, schedule, allergenAcknowledged: true, customer: { name: "Test Guest", email: "guest@example.com", phone: "3145550100", marketingConsent: false } };
  const order = await json("/api/orders", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(orderBody) });
  assert.equal(order.response.status, 201);
  assert.equal(order.payload.order.status, "received");
  assert.equal(order.payload.order.customer.email, "g***@example.com");
  assert.ok(!JSON.stringify(order.payload).includes("3145550100"), "Public order response must not expose the raw phone");

  const replay = await json("/api/orders", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(orderBody) });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.payload.idempotentReplay, true);
  assert.equal(replay.payload.order.id, order.payload.order.id);

  const fetched = await json(`/api/orders/${order.payload.order.id}`);
  assert.equal(fetched.response.status, 200);
  const advanced = await json(`/api/orders/${order.payload.order.id}/advance`, { method: "POST", body: "{}" });
  assert.equal(advanced.payload.order.status, "confirmed");

  const dineQuote = await json("/api/cart/validate", { method: "POST", body: JSON.stringify({ ...cartBody, service: "dine_in" }) });
  const cashOrder = await json("/api/orders", { method: "POST", headers: { "Idempotency-Key": `${key}-cash` }, body: JSON.stringify({ ...orderBody, quoteId: dineQuote.payload.quoteId, paymentMethod: "cash", paymentToken: undefined, schedule: "asap" }) });
  assert.equal(cashOrder.response.status, 201);
  assert.equal(cashOrder.payload.order.payment.method, "cash");
  assert.equal(cashOrder.payload.order.payment.status, "due_at_handoff");

  const badAddress = await json("/api/delivery/validate", { method: "POST", body: JSON.stringify({ address: { city: "St. Louis" } }) });
  assert.equal(badAddress.response.status, 422);
  const deliveryCheck = await json("/api/delivery/validate", { method: "POST", body: JSON.stringify({ address: { street: "11 S Vandeventer Ave", city: "St. Louis", state: "MO", postalCode: "63108" } }) });
  assert.equal(deliveryCheck.payload.mode, "manual_review_test");
  assert.equal(deliveryCheck.payload.realEligibilityConfirmed, false);

  const deliverySlots = await json(`/api/slots?service=delivery&date=${tomorrow}`);
  const deliveryQuote = await json("/api/cart/validate", { method: "POST", body: JSON.stringify({ ...cartBody, service: "delivery", promoCode: "", tipPercent: 15 }) });
  const deliveryCash = await json("/api/orders", { method: "POST", headers: { "Idempotency-Key": `${key}-delivery-cash` }, body: JSON.stringify({ ...orderBody, quoteId: deliveryQuote.payload.quoteId, paymentMethod: "cash", paymentToken: undefined, schedule: "asap", deliveryCheckToken: deliveryCheck.payload.deliveryCheckToken }) });
  assert.equal(deliveryCash.response.status, 422);
  assert.equal(deliveryCash.payload.errors[0].code, "cash_not_available_for_delivery");
  const deliveryPayment = await json("/api/payment/intents", { method: "POST", body: JSON.stringify({ quoteId: deliveryQuote.payload.quoteId }) });
  const deliveryOrder = await json("/api/orders", { method: "POST", headers: { "Idempotency-Key": `${key}-delivery` }, body: JSON.stringify({ ...orderBody, quoteId: deliveryQuote.payload.quoteId, paymentToken: deliveryPayment.payload.token, schedule: deliverySlots.payload.slots[0].value, deliveryCheckToken: deliveryCheck.payload.deliveryCheckToken }) });
  assert.equal(deliveryOrder.response.status, 201);
  let deliveryStatus = deliveryOrder.payload.order;
  for (let index = 0; index < 3; index += 1) deliveryStatus = (await json(`/api/orders/${deliveryStatus.id}/advance`, { method: "POST", body: "{}" })).payload.order;
  assert.equal(deliveryStatus.status, "out_for_delivery");

  console.log(JSON.stringify({ status: "valid", apiMode: "safe_test", pickupOrder: order.payload.order.orderNumber, cashDineInOrder: cashOrder.payload.order.orderNumber, deliveryOrder: deliveryOrder.payload.order.orderNumber, deliveryCashRejected: true, deliveryReviewOnly: true, rawCardsRejected: true, idempotencyReplay: true, statusAdvanced: true }, null, 2));
} finally {
  server.close();
  await once(server, "close");
}
