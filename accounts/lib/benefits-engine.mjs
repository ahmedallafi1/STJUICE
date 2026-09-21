import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

export const benefitsConfig = JSON.parse(readFileSync(new URL("../config/benefits-config.json", import.meta.url), "utf8"));

const fail = (message, code, status = 400) => {
  throw Object.assign(new Error(message), { code, status });
};

const asDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateOnlyUtc = (year, month, day) => new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

function accountAgeDays(account, now) {
  const created = asDate(account?.createdAt);
  return created ? Math.floor((now.getTime() - created.getTime()) / 86400000) : 0;
}

function birthdayDistanceDays(birthday, now) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthday || ""));
  if (!match) return null;
  const month = Number(match[2]), day = Number(match[3]);
  const today = dateOnlyUtc(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  const candidates = [-1, 0, 1].map((offset) => dateOnlyUtc(now.getUTCFullYear() + offset, month, day));
  return candidates
    .map((candidate) => Math.round((candidate.getTime() - today.getTime()) / 86400000))
    .sort((a, b) => Math.abs(a) - Math.abs(b))[0];
}

function accountTypeStatus(account) {
  if (account?.type === "student") return account?.student?.status || "not_submitted";
  if (account?.type === "business") return account?.business?.status || "not_submitted";
  return "not_required";
}

export function rewardLedger(account) {
  const ledger = Array.isArray(account?.rewards?.ledger) ? account.rewards.ledger : [];
  const balance = ledger.reduce((sum, entry) => sum + Number(entry.points || 0), 0);
  const lifetimeEarned = ledger.filter((entry) => Number(entry.points) > 0).reduce((sum, entry) => sum + Number(entry.points), 0);
  const lifetimeRedeemed = Math.abs(ledger.filter((entry) => Number(entry.points) < 0).reduce((sum, entry) => sum + Number(entry.points), 0));
  return {
    points: balance,
    lifetimeEarned,
    lifetimeRedeemed,
    transactions: structuredClone(ledger)
  };
}

export function appendRewardTransaction(account, input = {}) {
  if (!account?.rewards) fail("Rewards account is unavailable.", "rewards_unavailable", 422);
  account.rewards.ledger ||= [];
  const type = String(input.type || "");
  if (!["earn", "redeem", "birthday", "adjustment", "refund_reversal"].includes(type)) fail("Invalid reward transaction type.", "reward_type_invalid", 422);
  const points = Math.trunc(Number(input.points || 0));
  if (!Number.isFinite(points) || points === 0) fail("Reward points must be a non-zero integer.", "reward_points_invalid", 422);
  if (type === "earn" && points < 0) fail("Earn transactions must add points.", "reward_points_direction_invalid", 422);
  if (["redeem", "refund_reversal"].includes(type) && points > 0) fail("This transaction must subtract points.", "reward_points_direction_invalid", 422);
  const sourceId = String(input.sourceId || "").trim();
  if (sourceId) {
    const duplicate = account.rewards.ledger.find((entry) => entry.type === type && entry.sourceId === sourceId);
    if (duplicate) return { entry: structuredClone(duplicate), summary: rewardLedger(account), idempotentReplay: true };
  }
  const current = rewardLedger(account).points;
  if (current + points < 0) fail("Not enough reward points.", "reward_points_insufficient", 422);
  const entry = {
    id: `rwd_${randomUUID()}`,
    type,
    points,
    sourceId: sourceId || null,
    reason: String(input.reason || "").trim().slice(0, 160),
    createdAt: (asDate(input.createdAt) || new Date()).toISOString()
  };
  account.rewards.ledger.push(entry);
  account.rewards.points = rewardLedger(account).points;
  return { entry: structuredClone(entry), summary: rewardLedger(account), idempotentReplay: false };
}

export function benefitSnapshot(account, nowInput = new Date()) {
  const now = asDate(nowInput) || new Date();
  const type = benefitsConfig.accountDiscounts[account?.type] ? account.type : "regular";
  const discountConfig = benefitsConfig.accountDiscounts[type];
  const verificationStatus = accountTypeStatus(account);
  const verificationSatisfied = !discountConfig.requiresVerification || verificationStatus === discountConfig.requiredStatus;
  const activePercentOff = discountConfig.enabled && verificationSatisfied ? Number(discountConfig.percentOff || discountConfig.proposalPercentOff || 0) : 0;

  const birthdayProposal = benefitsConfig.birthday.proposal;
  const birthdayDistance = birthdayDistanceDays(account?.birthday, now);
  const birthdayInWindow = birthdayDistance != null
    && birthdayDistance >= -Number(birthdayProposal.windowBeforeDays || 0)
    && birthdayDistance <= Number(birthdayProposal.windowAfterDays || 0);
  const birthdayAgeSatisfied = accountAgeDays(account, now) >= Number(birthdayProposal.minimumAccountAgeDays || 0);
  const birthdayEligibleByProposal = Boolean(account?.birthday && birthdayInWindow && birthdayAgeSatisfied);

  const rewards = rewardLedger(account || {});
  return {
    accountType: type,
    discount: {
      enabled: Boolean(discountConfig.enabled),
      verificationRequired: Boolean(discountConfig.requiresVerification),
      verificationStatus,
      verificationSatisfied,
      activePercentOff,
      proposalPercentOff: Number(discountConfig.proposalPercentOff || discountConfig.percentOff || 0)
    },
    loyalty: {
      enabled: Boolean(benefitsConfig.loyalty.enabled),
      enrolled: Boolean(account?.rewards?.enrolled),
      ...rewards,
      proposal: structuredClone(benefitsConfig.loyalty.proposal)
    },
    birthday: {
      enabled: Boolean(benefitsConfig.birthday.enabled),
      hasBirthday: Boolean(account?.birthday),
      inWindow: birthdayInWindow,
      accountAgeSatisfied: birthdayAgeSatisfied,
      eligible: Boolean(benefitsConfig.birthday.enabled && birthdayEligibleByProposal),
      proposalEligible: birthdayEligibleByProposal,
      proposal: structuredClone(birthdayProposal)
    }
  };
}
