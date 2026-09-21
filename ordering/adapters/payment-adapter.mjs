import { config } from "../lib/catalog-store.mjs";
import {
  consumeTestPayment,
  createTestPaymentIntent,
  verifyTestPayment
} from "./test-payment-adapter.mjs";

const unavailable = () => {
  throw Object.assign(new Error("Live payment provider is not connected."), {
    code: "payment_provider_not_connected",
    status: 503
  });
};

export function createPaymentIntent(input) {
  if (config.payments.adapter === "safe_test_token") return createTestPaymentIntent(input);
  return unavailable();
}

export function verifyPayment(input) {
  if (config.payments.adapter === "safe_test_token") return verifyTestPayment(input);
  return unavailable();
}

export function consumePayment(token) {
  if (config.payments.adapter === "safe_test_token") return consumeTestPayment(token);
  return unavailable();
}

export function paymentAdapterStatus() {
  return {
    adapter: config.payments.adapter,
    live: config.payments.adapter !== "safe_test_token",
    rawCardDataAccepted: false
  };
}
