import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const launch = JSON.parse(readFileSync(fileURLToPath(new URL("../launch/config/launch-config.json", import.meta.url)), "utf8"));

const has = (name) => Boolean(String(process.env[name] || "").trim());

export function integrationStatus() {
  return {
    payment: {
      provider: launch.commerce.paymentProvider,
      configured: launch.commerce.paymentProvider !== "test_only" && has("ST_JUICE_PAYMENT_SECRET")
    },
    pos: {
      provider: launch.commerce.posProvider,
      configured: launch.commerce.posProvider !== "test_only" && has("ST_JUICE_POS_SECRET")
    },
    database: {
      provider: launch.customerData.databaseTarget || null,
      configured: launch.customerData.database !== "memory_only_test" && has("ST_JUICE_DATABASE_URL")
    },
    tax: {
      provider: launch.commerce.taxProvider || null,
      configured: launch.commerce.taxConfigured === true
    },
    delivery: {
      provider: launch.commerce.deliveryProvider || null,
      configured: launch.commerce.deliveryConfigured === true
    },
    transactionalEmail: {
      provider: launch.communications.transactionalEmail,
      configured: launch.communications.transactionalEmail !== "not_configured" && has("ST_JUICE_EMAIL_SECRET")
    },
    transactionalSms: {
      provider: launch.communications.transactionalSms,
      configured: launch.communications.transactionalSms !== "not_configured" && has("ST_JUICE_SMS_SECRET")
    },
    errorMonitoring: {
      provider: launch.observability.errorMonitoring,
      configured: launch.observability.errorMonitoring !== "not_configured"
    },
    uptimeMonitoring: {
      provider: launch.observability.uptimeMonitoring,
      configured: launch.observability.uptimeMonitoring !== "not_configured"
    }
  };
}

export function productionIntegrationReady() {
  const status = integrationStatus();
  return Object.values(status).every((entry) => entry.configured === true);
}
