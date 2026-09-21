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
  if (current + points < 0 && type !== "refund_reversal") fail("Not enough reward points.", "reward_points_insufficient", 422);
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
  const activePercentOff = discountConfig.enabled && verificationSatisfied
    ? Number(discountConfig.percentOff || 0)
    : 0;

  const activeBirthdayRules = benefitsConfig.birthday.enabled ? benefitsConfig.birthday : null;
  const birthdayProposal = benefitsConfig.birthday.proposal;
  const birthdayDistance = birthdayDistanceDays(account?.birthday, now);
  const activeBirthdayInWindow = activeBirthdayRules && birthdayDistance != null
    ? birthdayDistance >= -Number(activeBirthdayRules.windowBeforeDays || 0)
      && birthdayDistance <= Number(activeBirthdayRules.windowAfterDays || 0)
    : false;
  const activeBirthdayAgeSatisfied = activeBirthdayRules
    ? accountAgeDays(account, now) >= Number(activeBirthdayRules.minimumAccountAgeDays || 0)
    : false;
  const birthdayEligible = Boolean(
    activeBirthdayRules
    && activeBirthdayRules.reward
    && account?.birthday
    && activeBirthdayInWindow
    && activeBirthdayAgeSatisfied
  );

  const proposalInWindow = birthdayDistance != null
    && birthdayDistance >= -Number(birthdayProposal.windowBeforeDays || 0)
    && birthdayDistance <= Number(birthdayProposal.windowAfterDays || 0);
  const proposalAgeSatisfied = accountAgeDays(account, now) >= Number(birthdayProposal.minimumAccountAgeDays || 0);
  const proposalEligible = Boolean(account?.birthday && proposalInWindow && proposalAgeSatisfied);

  const rewards = rewardLedger(account || {});
  return {
    accountType: type,
    discount: {
      enabled: Boolean(discountConfig.enabled),
      verificationRequired: Boolean(discountConfig.requiresVerification),
      verificationStatus,
      verificationSatisfied,
      activePercentOff,
      proposalPercentOff: Number(discountConfig.proposalPercentOff || 0)
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
      inWindow: activeBirthdayInWindow,
      accountAgeSatisfied: activeBirthdayAgeSatisfied,
      eligible: birthdayEligible,
      proposalEligible,
      proposal: structuredClone(birthdayProposal)
    }
  };
}

export function publicBenefitSnapshot(account, nowInput = new Date()) {
  const snapshot = benefitSnapshot(account, nowInput);
  return {
    accountType: snapshot.accountType,
    discount: {
      enabled: snapshot.discount.enabled,
      verificationRequired: snapshot.discount.verificationRequired,
      verificationStatus: snapshot.discount.verificationStatus,
      verificationSatisfied: snapshot.discount.verificationSatisfied,
      activePercentOff: snapshot.discount.activePercentOff
    },
    loyalty: {
      enabled: snapshot.loyalty.enabled,
      enrolled: snapshot.loyalty.enrolled,
      points: snapshot.loyalty.points,
      lifetimeEarned: snapshot.loyalty.lifetimeEarned,
      lifetimeRedeemed: snapshot.loyalty.lifetimeRedeemed
    },
    birthday: {
      enabled: snapshot.birthday.enabled,
      hasBirthday: snapshot.birthday.hasBirthday,
      inWindow: snapshot.birthday.inWindow,
      accountAgeSatisfied: snapshot.birthday.accountAgeSatisfied,
      eligible: snapshot.birthday.eligible
    }
  };
}

export function creditOrderRewards(account, order) {
  if (!benefitsConfig.loyalty.enabled || !account?.rewards?.enrolled) {
    return { credited: false, reason: "loyalty_inactive", summary: rewardLedger(account || {}) };
  }
  const pointsPerDollar = Number(benefitsConfig.loyalty.pointsPerDollar || 0);
  if (!(pointsPerDollar > 0)) {
    return { credited: false, reason: "earning_rate_unconfigured", summary: rewardLedger(account) };
  }
  const subtotalCents = Number(order?.totals?.subtotal?.cents || 0);
  const discountCents = Number(order?.totals?.discount?.cents || 0);
  const eligibleCents = Math.max(0, subtotalCents - discountCents);
  const points = Math.floor(eligibleCents * pointsPerDollar / 100);
  if (points <= 0) return { credited: false, reason: "no_eligible_spend", summary: rewardLedger(account) };
  const result = appendRewardTransaction(account, {
    type: "earn",
    points,
    sourceId: order.id,
    reason: `Eligible purchase ${order.orderNumber || order.id}`,
    createdAt: order.createdAt
  });
  return { credited: !result.idempotentReplay, ...result };
}

export function reverseOrderRewards(account, order, reason = "Order refund or reversal") {
  const earned = (account?.rewards?.ledger || []).find((entry) => entry.type === "earn" && entry.sourceId === order?.id);
  if (!earned) return { reversed: false, reason: "no_earned_points", summary: rewardLedger(account || {}) };
  const existing = (account?.rewards?.ledger || []).find((entry) => entry.type === "refund_reversal" && entry.sourceId === order?.id);
  if (existing) return { reversed: false, reason: "already_reversed", entry: structuredClone(existing), summary: rewardLedger(account) };
  const result = appendRewardTransaction(account, {
    type: "refund_reversal",
    points: -Math.abs(Number(earned.points || 0)),
    sourceId: order.id,
    reason,
    createdAt: new Date()
  });
  return { reversed: true, ...result };
}

function ensureGrantStore(account) {
  if (!account?.rewards) fail("Rewards account is unavailable.", "rewards_unavailable", 422);
  account.rewards.grants ||= [];
  return account.rewards.grants;
}

export function redeemConfiguredReward(account, rewardId, nowInput = new Date()) {
  if (!benefitsConfig.loyalty.enabled) fail("Rewards are not active yet.", "rewards_inactive", 409);
  if (!account?.rewards?.enrolled) fail("Rewards enrollment is required.", "rewards_enrollment_required", 422);
  const reward = (benefitsConfig.loyalty.redemptions || []).find((item) => item.id === rewardId);
  if (!reward) fail("That reward is not available.", "reward_not_available", 404);
  const points = Math.trunc(Number(reward.points || 0));
  if (!(points > 0)) fail("Reward points are not configured.", "reward_not_configured", 500);
  const now = asDate(nowInput) || new Date();
  const transaction = appendRewardTransaction(account, {
    type: "redeem",
    points: -points,
    reason: `Redeemed ${reward.id}`,
    createdAt: now
  });
  const grant = {
    id: `grant_${randomUUID()}`,
    kind: "loyalty_redemption",
    rewardId: reward.id,
    rewardType: reward.type,
    value: reward.value ?? null,
    status: "available",
    issuedAt: now.toISOString(),
    redeemedAt: null
  };
  ensureGrantStore(account).unshift(grant);
  return { grant: structuredClone(grant), rewards: transaction.summary };
}

export function claimBirthdayReward(account, nowInput = new Date()) {
  const now = asDate(nowInput) || new Date();
  const snapshot = benefitSnapshot(account, now);
  if (!snapshot.birthday.enabled) fail("Birthday benefits are not active yet.", "birthday_inactive", 409);
  if (!snapshot.birthday.eligible) fail("This account is not currently eligible for a birthday benefit.", "birthday_not_eligible", 422);
  const grants = ensureGrantStore(account);
  const year = now.getUTCFullYear();
  const sourceId = `birthday:${year}`;
  const existing = grants.find((grant) => grant.sourceId === sourceId);
  if (existing) return { grant: structuredClone(existing), idempotentReplay: true };
  const reward = benefitsConfig.birthday.reward;
  const grant = {
    id: `grant_${randomUUID()}`,
    sourceId,
    kind: "birthday",
    rewardType: reward.type,
    value: reward.value ?? null,
    status: "available",
    issuedAt: now.toISOString(),
    redeemedAt: null
  };
  grants.unshift(grant);
  return { grant: structuredClone(grant), idempotentReplay: false };
}

export function rewardWallet(account) {
  return {
    ...rewardLedger(account),
    grants: structuredClone(account?.rewards?.grants || [])
  };
}

