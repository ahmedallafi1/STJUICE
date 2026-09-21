import assert from "node:assert/strict";
import { config } from "../lib/catalog-store.mjs";
import {
  createPaymentIntent,
  paymentAdapterStatus
} from "../adapters/payment-adapter.mjs";
import { sendToPos, posAdapterStatus } from "../adapters/pos-adapter.mjs";
import { deliveryAdapterStatus, validateDeliveryWithProvider } from "../adapters/delivery-adapter.mjs";

const originalPayment = config.payments.adapter;
const originalPos = config.pos.adapter;
const originalDelivery = config.fulfillment.delivery.mode;

assert.equal(paymentAdapterStatus().live, false);
assert.equal(paymentAdapterStatus().rawCardDataAccepted, false);
assert.equal(posAdapterStatus().live, false);
assert.equal(deliveryAdapterStatus().live, false);

const testIntent = createPaymentIntent({ quoteId: "quote_provider_test", amount: 1000, currency: "USD" });
assert.ok(testIntent.token.startsWith("test_pay_"));

const manualDelivery = validateDeliveryWithProvider({
  street: "11 S Vandeventer Ave",
  city: "St. Louis",
  state: "MO",
  postalCode: "63108"
});
assert.equal(manualDelivery.valid, true);
assert.equal(manualDelivery.realEligibilityConfirmed, false);

try {
  config.payments.adapter = "production_unconfigured";
  assert.throws(
    () => createPaymentIntent({ quoteId: "quote_live_test", amount: 1000, currency: "USD" }),
    (error) => error?.code === "payment_provider_not_connected" && error?.status === 503
  );

  config.pos.adapter = "production_unconfigured";
  assert.throws(
    () => sendToPos({ id: "order_provider_test" }),
    (error) => error?.code === "pos_provider_not_connected" && error?.status === 503
  );

  config.fulfillment.delivery.mode = "production_unconfigured";
  assert.throws(
    () => validateDeliveryWithProvider({ street: "1 Main St", city: "St. Louis", state: "MO", postalCode: "63101" }),
    (error) => error?.code === "delivery_provider_not_connected" && error?.status === 503
  );
} finally {
  config.payments.adapter = originalPayment;
  config.pos.adapter = originalPos;
  config.fulfillment.delivery.mode = originalDelivery;
}

console.log(JSON.stringify({
  status: "valid",
  paymentFailClosed: true,
  posFailClosed: true,
  deliveryFailClosed: true,
  rawCardDataAccepted: false
}, null, 2));
