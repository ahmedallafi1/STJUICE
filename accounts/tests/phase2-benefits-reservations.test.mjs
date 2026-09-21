import assert from "node:assert/strict";
import {
  adminReviewBusiness,
  adminReviewStudent,
  registerAccount,
  requestStudentVerification,
  updateBusiness
} from "../lib/account-store.mjs";
import {
  appendRewardTransaction,
  availableRewardGrant,
  benefitSnapshot,
  benefitsConfig,
  claimBirthdayReward,
  consumeRewardGrant,
  creditOrderRewards,
  publicBenefitSnapshot,
  redeemConfiguredReward,
  reverseOrderRewards,
  rewardLedger
} from "../lib/benefits-engine.mjs";
import {
  cancelReservation,
  createReservationRequest,
  listReservations
} from "../lib/reservation-store.mjs";
import { rewardGrantDiscount } from "../../ordering/lib/promotion-engine.mjs";

const now = new Date("2026-09-20T17:00:00Z");

assert.equal(benefitsConfig.loyalty.enabled, true);
assert.equal(benefitsConfig.loyalty.autoEnrollOnAccountCreation, true);
assert.equal(benefitsConfig.loyalty.pointsPerDollar, 10);
assert.deepEqual((benefitsConfig.loyalty.redemptions || []).map((row) => row.points), [500, 900, 1200, 1800]);
assert.equal(benefitsConfig.accountDiscounts.student.enabled, true);
assert.equal(benefitsConfig.accountDiscounts.student.percentOff, 10);
assert.equal(benefitsConfig.accountDiscounts.business.enabled, true);
assert.equal(benefitsConfig.accountDiscounts.business.percentOff, 8);
assert.equal(benefitsConfig.birthday.enabled, true);
assert.equal(benefitsConfig.birthday.windowBeforeDays, 3);
assert.equal(benefitsConfig.birthday.windowAfterDays, 7);
assert.equal(benefitsConfig.birthday.minimumAccountAgeDays, 30);

const regular = registerAccount({
  name: "Requirements Regular",
  email: "requirements-regular@example.com",
  password: "Requirements!123",
  type: "regular"
});
assert.equal(regular.rewards.enrolled, true, "Registered accounts must join rewards automatically");
assert.equal(rewardLedger(regular).points, 0);

const earned = appendRewardTransaction(regular, {
  type: "earn",
  points: 100,
  sourceId: "order_requirements_1",
  reason: "Eligible purchase",
  createdAt: now
});
assert.equal(earned.summary.points, 100);
assert.equal(earned.idempotentReplay, false);
const replay = appendRewardTransaction(regular, {
  type: "earn",
  points: 100,
  sourceId: "order_requirements_1",
  reason: "Duplicate event",
  createdAt: now
});
assert.equal(replay.idempotentReplay, true);
assert.equal(replay.summary.points, 100);

const student = registerAccount({
  name: "Requirements Student",
  email: "requirements-student@example.edu",
  password: "Requirements!123",
  type: "student",
  birthday: "1999-09-20"
});
student.createdAt = "2026-01-01T00:00:00.000Z";
let studentBenefits = benefitSnapshot(student, now);
assert.equal(studentBenefits.discount.activePercentOff, 0);
assert.equal(studentBenefits.discount.verificationSatisfied, false);
assert.equal(studentBenefits.birthday.eligible, true);

requestStudentVerification(student, {
  schoolEmail: "requirements@university.edu",
  institution: "Example University"
});
studentBenefits = benefitSnapshot(student, now);
assert.equal(studentBenefits.discount.verificationStatus, "pending_manual_review");
assert.equal(studentBenefits.discount.activePercentOff, 0);

adminReviewStudent(student.id, {
  status: "verified",
  expiresAt: "2027-09-20",
  reviewerReference: "requirements-test"
});
studentBenefits = benefitSnapshot(student, now);
assert.equal(studentBenefits.discount.verificationStatus, "verified");
assert.equal(studentBenefits.discount.activePercentOff, 10, "Verified Student must receive the configured fixed discount");

student.student.expiresAt = "2026-01-01";
studentBenefits = benefitSnapshot(student, now);
assert.equal(studentBenefits.discount.verificationStatus, "expired");
assert.equal(studentBenefits.discount.activePercentOff, 0, "Expired Student verification must stop the discount");
student.student.expiresAt = "2027-09-20";

const business = registerAccount({
  name: "Requirements Business",
  email: "requirements-business@example.com",
  password: "Requirements!123",
  type: "business"
});
const businessProfile = updateBusiness(business, { company: "Example Co", role: "Office Manager" });
assert.equal(businessProfile.status, "pending_review");
let businessBenefits = benefitSnapshot(business, now);
assert.equal(businessBenefits.discount.activePercentOff, 0);
adminReviewBusiness(business.id, { status: "approved", reviewerReference: "requirements-test" });
businessBenefits = benefitSnapshot(business, now);
assert.equal(businessBenefits.discount.activePercentOff, 8, "Approved Business account must receive configured fixed discount");

const publicStudentBenefits = publicBenefitSnapshot(student, now);
assert.equal("proposalPercentOff" in publicStudentBenefits.discount, false);
assert.equal("proposal" in publicStudentBenefits.loyalty, false);
assert.equal("proposalEligible" in publicStudentBenefits.birthday, false);

const rewardMember = registerAccount({
  name: "Reward Member",
  email: "requirements-reward@example.com",
  password: "Requirements!123",
  type: "regular"
});
const rewardOrder = {
  id: "order_reward_test",
  orderNumber: "STJ-REWARD",
  createdAt: now.toISOString(),
  totals: { subtotal: { cents: 10000 }, discount: { cents: 1000 } }
};
const credited = creditOrderRewards(rewardMember, rewardOrder);
assert.equal(credited.credited, true);
assert.equal(rewardLedger(rewardMember).points, 900, "10 points/$ must be based on eligible spend after discounts");
const creditedAgain = creditOrderRewards(rewardMember, rewardOrder);
assert.equal(creditedAgain.credited, false);
assert.equal(rewardLedger(rewardMember).points, 900);

const freeDrink = redeemConfiguredReward(rewardMember, "reward-900", now);
assert.equal(freeDrink.rewards.points, 0);
assert.equal(freeDrink.grant.label, "Free drink");
assert.equal(freeDrink.grant.status, "available");
assert.equal(availableRewardGrant(rewardMember, freeDrink.grant.id)?.id, freeDrink.grant.id);

const freeDrinkPricing = rewardGrantDiscount({
  subtotalCents: 995,
  items: [{ productId: "pistachio-saint", quantity: 1, unitPrice: { cents: 995 } }],
  grant: freeDrink.grant
});
assert.equal(freeDrinkPricing.applicable, true);
assert.equal(freeDrinkPricing.discountCents, 995);

const consumedGrant = consumeRewardGrant(rewardMember, freeDrink.grant.id, "order_grant_test", now);
assert.equal(consumedGrant.grant.status, "consumed");
assert.equal(availableRewardGrant(rewardMember, freeDrink.grant.id), null);
assert.equal(consumeRewardGrant(rewardMember, freeDrink.grant.id, "order_grant_test", now).idempotentReplay, true);

const reverseMember = registerAccount({
  name: "Refund Member",
  email: "requirements-refund@example.com",
  password: "Requirements!123",
  type: "regular"
});
const reverseOrder = {
  id: "order_reverse_test",
  orderNumber: "STJ-REVERSE",
  createdAt: now.toISOString(),
  totals: { subtotal: { cents: 1000 }, discount: { cents: 0 } }
};
creditOrderRewards(reverseMember, reverseOrder);
appendRewardTransaction(reverseMember, { type: "redeem", points: -50, sourceId: "redeem_1", reason: "Reward spend", createdAt: now });
const reversed = reverseOrderRewards(reverseMember, reverseOrder, "Refunded test order");
assert.equal(reversed.reversed, true);
assert.equal(rewardLedger(reverseMember).points, -50);
assert.equal(rewardLedger(reverseMember).lifetimeRedeemed, 50, "Refund clawback must not inflate lifetime redeemed");
assert.equal(reverseOrderRewards(reverseMember, reverseOrder).reason, "already_reversed");

const birthdayMember = registerAccount({
  name: "Birthday Member",
  email: "requirements-birthday@example.com",
  password: "Requirements!123",
  type: "regular",
  birthday: "1990-09-20"
});
birthdayMember.createdAt = "2025-01-01T00:00:00.000Z";
const birthdayBefore = benefitSnapshot(birthdayMember, now);
assert.equal(birthdayBefore.birthday.eligible, true);
const birthdayGrant = claimBirthdayReward(birthdayMember, now);
assert.equal(birthdayGrant.idempotentReplay, false);
assert.equal(birthdayGrant.grant.label, "Birthday drink");
assert.equal(benefitSnapshot(birthdayMember, now).birthday.alreadyIssuedThisYear, true);
assert.equal(benefitSnapshot(birthdayMember, now).birthday.eligible, false);
const birthdayReplay = claimBirthdayReward(birthdayMember, now);
assert.equal(birthdayReplay.idempotentReplay, true, "Birthday reward must issue once per calendar year");

const reservation = createReservationRequest(student, {
  purpose: "study_group",
  date: "2026-09-21",
  startTime: "18:00",
  durationMinutes: 120,
  partySize: 8,
  organization: "Study group",
  notes: "Need outlets near the table."
}, now);
assert.equal(reservation.status, "requested");
assert.equal(listReservations(student).length, 1);

assert.throws(
  () => createReservationRequest(student, {
    purpose: "study_group",
    date: "2026-09-21",
    startTime: "18:00",
    durationMinutes: 120,
    partySize: 41
  }, now),
  (error) => error?.code === "reservation_party_size_invalid"
);
assert.throws(
  () => createReservationRequest(student, {
    purpose: "birthday",
    date: "2026-09-21",
    startTime: "22:00",
    durationMinutes: 60,
    partySize: 8
  }, now),
  (error) => error?.code === "reservation_outside_hours"
);
assert.throws(
  () => createReservationRequest(student, {
    purpose: "meeting",
    date: "2026-02-31",
    startTime: "18:00",
    durationMinutes: 60,
    partySize: 4
  }, now),
  (error) => error?.code === "reservation_date_invalid"
);

const canceled = cancelReservation(student, reservation.id, new Date("2026-09-20T18:00:00Z"));
assert.equal(canceled.status, "canceled");

console.log(JSON.stringify({
  status: "valid",
  automaticRewards: true,
  pointsPerDollar: benefitsConfig.loyalty.pointsPerDollar,
  studentPercent: 10,
  businessPercent: 8,
  birthdayOncePerYear: true,
  studentExpiryEnforced: true,
  reservationHoursEnforced: true
}, null, 2));
