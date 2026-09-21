import { config } from "../lib/catalog-store.mjs";

const clean = (value, max = 100) => String(value || "").trim().slice(0, max);

export function validateDeliveryWithProvider(address = {}) {
  const required = ["street", "city", "state", "postalCode"];
  const missing = required.filter((key) => !clean(address[key]));
  if (missing.length) {
    return {
      valid: false,
      eligible: false,
      errors: missing.map((field) => ({ code: "address_required", field, message: `${field} is required.` }))
    };
  }

  if (config.fulfillment.delivery.mode === "manual_review_test") {
    return {
      valid: true,
      eligible: true,
      mode: config.fulfillment.delivery.mode,
      address: Object.fromEntries(required.map((key) => [key, clean(address[key])])),
      warning: config.fulfillment.delivery.testBehavior,
      realEligibilityConfirmed: false
    };
  }

  throw Object.assign(new Error("Live delivery validation is not connected."), {
    code: "delivery_provider_not_connected",
    status: 503
  });
}

export function deliveryAdapterStatus() {
  return {
    mode: config.fulfillment.delivery.mode,
    live: config.fulfillment.delivery.mode !== "manual_review_test"
  };
}
