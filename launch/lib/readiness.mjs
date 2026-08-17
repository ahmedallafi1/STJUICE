import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const launchRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const config = JSON.parse(readFileSync(resolve(launchRoot, "config/launch-config.json"), "utf8"));

const requirements = [
  ["public_origin", () => Boolean(process.env.ST_JUICE_PUBLIC_ORIGIN || config.publicOrigin)],
  ["public_phone", () => Boolean(process.env.ST_JUICE_PUBLIC_PHONE || config.business.publicPhone)],
  ["public_email", () => Boolean(process.env.ST_JUICE_PUBLIC_EMAIL || config.business.publicEmail)],
  ["legal_name", () => config.business.legalNameApproved === true],
  ["hours", () => config.business.hoursApproved === true],
  ["maps_listing", () => config.business.mapsListingApproved === true],
  ["live_payment", () => config.commerce.paymentProvider !== "test_only" && Boolean(process.env.ST_JUICE_PAYMENT_SECRET)],
  ["live_pos", () => config.commerce.posProvider !== "test_only" && Boolean(process.env.ST_JUICE_POS_SECRET)],
  ["tax", () => config.commerce.taxConfigured === true],
  ["delivery", () => config.commerce.deliveryConfigured === true],
  ["refund_policy", () => config.commerce.refundPolicyApproved === true],
  ["catering_terms", () => config.commerce.cateringTermsApproved === true],
  ["database", () => config.customerData.database !== "memory_only_test" && Boolean(process.env.ST_JUICE_DATABASE_URL)],
  ["authentication", () => config.customerData.authentication !== "prototype_only"],
  ["privacy", () => config.customerData.privacyPolicyApproved === true && config.customerData.retentionApproved === true],
  ["cookies", () => config.customerData.cookiePlanApproved === true],
  ["transactional_email", () => config.communications.transactionalEmail !== "not_configured"],
  ["transactional_sms", () => config.communications.transactionalSms !== "not_configured"],
  ["approved_content", () => config.content.pricesApproved && config.content.recipesApproved && config.content.allergenControlsApproved],
  ["nutrition", () => config.content.nutritionVerified === true],
  ["final_media", () => config.content.finalPhotographyApproved === true],
  ["rewards", () => config.content.rewardsRulesApproved === true],
  ["student_verification", () => config.content.studentVerificationApproved === true],
  ["monitoring", () => config.observability.errorMonitoring !== "not_configured" && config.observability.uptimeMonitoring !== "not_configured"],
  ["backup_restore", () => config.observability.backupRestoreTested === true],
  ["release_approval", () => Object.values(config.releaseApproval).every((value) => value === true)]
];

export function getLaunchReadiness() {
  const checks = requirements.map(([id, check]) => ({ id, ready: Boolean(check()) }));
  const blockers = checks.filter((item) => !item.ready).map((item) => item.id);
  return {
    release: config.release,
    launchReady: blockers.length === 0,
    mode: blockers.length ? "safe_test" : "production",
    configured: checks.length - blockers.length,
    required: checks.length,
    blockers
  };
}

export { config as launchConfig };
