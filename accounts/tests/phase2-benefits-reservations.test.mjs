import assert from "node:assert/strict";
import {
  registerAccount,
  requestStudentVerification,
  updateBusiness
} from "../lib/account-store.mjs";
import {
  appendRewardTransaction,
  benefitSnapshot,
  benefitsConfig,
  rewardLedger
} from "../lib/benefits-engine.mjs";
import {
  cancelReservation,
  createReservationRequest,
  listReservations
} from "../lib/reservation-store.mjs";

const now = new Date("2026-09-20T17:00:00Z");

assert.equal(benefitsConfig.loyalty.enabled, false, "Proposed loyalty economics must not activate without owner approval");
assert.equal(benefitsConfig.loyalty.proposal.pointsPerDollar, 10);
assert.equal(benefitsConfig.accountDiscounts.student.enabled, false);
assert.equal(benefitsConfig.accountDiscounts.student.proposalPercentOff, 10);
assert.equal(benefitsConfig.accountDiscounts.business.enabled, false);
assert.equal(benefitsConfig.accountDiscounts.business.proposalPercentOff, 8);

const regular = registerAccount({
  name: "Phase Two Regular",
  email: "phase2-regular@example.com",
  password: "PhaseTwoTest!123",
  type: "regular"
});
assert.equal(rewardLedger(regular).points, 0);

const earned = appendRewardTransaction(regular, {
  type: "earn",
  points: 100,
  sourceId: "order_phase2_1",
  reason: "Test eligible purchase",
  createdAt: now
});
assert.equal(earned.summary.points, 100);
assert.equal(earned.idempotentReplay, false);

const replay = appendRewardTransaction(regular, {
  type: "earn",
  points: 100,
  sourceId: "order_phase2_1",
  reason: "Duplicate delivery",
  createdAt: now
});
assert.equal(replay.summary.points, 100, "Idempotent reward source must not double-credit points");
assert.equal(replay.idempotentReplay, true);

const redeemed = appendRewardTransaction(regular, {
  type: "redeem",
  points: -40,
  sourceId: "redeem_phase2_1",
  reason: "Test redemption",
  createdAt: now
});
assert.equal(redeemed.summary.points, 60);
assert.throws(
  () => appendRewardTransaction(regular, { type: "redeem", points: -100, sourceId: "redeem_too_much" }),
  (error) => error?.code === "reward_points_insufficient"
);

const student = registerAccount({
  name: "Phase Two Student",
  email: "phase2-student@example.edu",
  password: "PhaseTwoTest!123",
  type: "student",
  birthday: "1999-09-20"
});
student.createdAt = "2026-01-01T00:00:00.000Z";
let studentBenefits = benefitSnapshot(student, now);
assert.equal(studentBenefits.discount.activePercentOff, 0);
assert.equal(studentBenefits.discount.proposalPercentOff, 10);
assert.equal(studentBenefits.discount.verificationSatisfied, false);
assert.equal(studentBenefits.birthday.proposalEligible, true);
assert.equal(studentBenefits.birthday.eligible, false, "Birthday benefit must remain disabled until activation");

requestStudentVerification(student, {
  schoolEmail: "student@university.edu",
  institution: "Example University"
});
studentBenefits = benefitSnapshot(student, now);
assert.equal(studentBenefits.discount.verificationStatus, "pending_manual_review");
assert.equal(studentBenefits.discount.activePercentOff, 0, "Pending verification must never activate a student discount");

const business = registerAccount({
  name: "Phase Two Business",
  email: "phase2-business@example.com",
  password: "PhaseTwoTest!123",
  type: "business"
});
const businessProfile = updateBusiness(business, { company: "Example Co", role: "Office Manager" });
assert.equal(businessProfile.status, "pending_review");
const businessBenefits = benefitSnapshot(business, now);
assert.equal(businessBenefits.discount.proposalPercentOff, 8);
assert.equal(businessBenefits.discount.activePercentOff, 0);

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
assert.equal(reservation.partySize, 8);
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

const canceled = cancelReservation(student, reservation.id, new Date("2026-09-20T18:00:00Z"));
assert.equal(canceled.status, "canceled");
assert.equal(listReservations(student)[0].status, "canceled");

console.log(JSON.stringify({
  status: "valid",
  rewardLedgerBalance: rewardLedger(regular).points,
  studentProposalPercent: studentBenefits.discount.proposalPercentOff,
  businessProposalPercent: businessBenefits.discount.proposalPercentOff,
  birthdayProposalEligible: studentBenefits.birthday.proposalEligible,
  reservationStatus: listReservations(student)[0].status
}, null, 2));
