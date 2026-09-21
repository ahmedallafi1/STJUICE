const cents = (value) => Math.round(Number(value || 0) * 100);

export function accountDiscountCents(subtotalCents, benefitSnapshot = null) {
  const subtotal = Math.max(0, Math.trunc(Number(subtotalCents || 0)));
  const percent = Number(benefitSnapshot?.discount?.activePercentOff || 0);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.max(0, Math.min(subtotal, Math.round(subtotal * percent / 100)));
}

export function rewardGrantDiscount({ subtotalCents, items = [], grant = null } = {}) {
  const subtotal = Math.max(0, Math.trunc(Number(subtotalCents || 0)));
  if (!grant || grant.status !== "available") {
    return { applicable: false, discountCents: 0, reason: grant ? "grant_not_available" : "no_grant" };
  }

  const pricing = grant.pricing || {};
  const kind = pricing.kind || (grant.rewardType === "fixed_discount" ? "fixed_discount" : "");
  if (kind === "fixed_discount") {
    const amount = Number(pricing.amount ?? grant.value);
    if (!(amount > 0)) return { applicable: false, discountCents: 0, reason: "grant_value_unconfigured" };
    return { applicable: true, discountCents: Math.min(subtotal, cents(amount)), kind };
  }

  if (kind === "free_product") {
    const eligible = new Set(Array.isArray(pricing.eligibleProductIds) ? pricing.eligibleProductIds.map(String) : []);
    if (!eligible.size) return { applicable: false, discountCents: 0, reason: "grant_eligibility_unconfigured" };
    const matching = items.find((item) => eligible.has(String(item.productId || "")) && Number(item.quantity || 0) > 0);
    if (!matching) return { applicable: false, discountCents: 0, reason: "eligible_product_missing" };
    const unitCents = Math.max(0, Number(matching.unitPrice?.cents || 0));
    const maxCents = pricing.maxAmount != null ? cents(pricing.maxAmount) : unitCents;
    return {
      applicable: true,
      discountCents: Math.min(subtotal, unitCents, maxCents),
      kind,
      productId: matching.productId
    };
  }

  if (kind === "item_discount") {
    const eligible = new Set(Array.isArray(pricing.eligibleProductIds) ? pricing.eligibleProductIds.map(String) : []);
    if (!eligible.size) return { applicable: false, discountCents: 0, reason: "grant_eligibility_unconfigured" };
    const matching = items.find((item) => eligible.has(String(item.productId || "")) && Number(item.quantity || 0) > 0);
    if (!matching) return { applicable: false, discountCents: 0, reason: "eligible_product_missing" };
    const amount = Number(pricing.amount ?? grant.value);
    if (!(amount > 0)) return { applicable: false, discountCents: 0, reason: "grant_value_unconfigured" };
    const unitCents = Math.max(0, Number(matching.unitPrice?.cents || 0));
    return {
      applicable: true,
      discountCents: Math.min(subtotal, unitCents, cents(amount)),
      kind,
      productId: matching.productId
    };
  }

  return { applicable: false, discountCents: 0, reason: "grant_pricing_unsupported" };
}

export function combineDiscounts({
  subtotalCents,
  promoDiscountCents = 0,
  benefitSnapshot = null,
  stackingPolicy = "best_discount"
} = {}) {
  const subtotal = Math.max(0, Math.trunc(Number(subtotalCents || 0)));
  const promo = Math.max(0, Math.min(subtotal, Math.trunc(Number(promoDiscountCents || 0))));
  const account = accountDiscountCents(subtotal, benefitSnapshot);

  let total = 0;
  let applied = [];
  if (stackingPolicy === "stack") {
    total = Math.min(subtotal, promo + account);
    if (promo) applied.push("promo");
    if (account) applied.push("account");
  } else {
    total = Math.max(promo, account);
    if (total && total === account && account >= promo) applied.push("account");
    else if (total) applied.push("promo");
  }

  return {
    totalDiscountCents: total,
    promoDiscountCents: applied.includes("promo") ? promo : 0,
    accountDiscountCents: applied.includes("account") ? account : 0,
    accountPercentOff: applied.includes("account") ? Number(benefitSnapshot?.discount?.activePercentOff || 0) : 0,
    stackingPolicy,
    applied
  };
}

export function combineCheckoutDiscounts({
  subtotalCents,
  items = [],
  promoDiscountCents = 0,
  benefitSnapshot = null,
  rewardGrant = null,
  accountPromoPolicy = "best_discount",
  rewardWithAccount = true,
  rewardWithPromo = false
} = {}) {
  const subtotal = Math.max(0, Math.trunc(Number(subtotalCents || 0)));
  const promo = Math.max(0, Math.min(subtotal, Math.trunc(Number(promoDiscountCents || 0))));
  const account = accountDiscountCents(subtotal, benefitSnapshot);
  const reward = rewardGrantDiscount({ subtotalCents: subtotal, items, grant: rewardGrant });

  const accountBase = accountPromoPolicy === "stack" ? Math.min(subtotal, promo + account) : account;
  const accountReward = Math.min(subtotal, account + (rewardWithAccount && reward.applicable ? reward.discountCents : 0));
  const promoReward = Math.min(subtotal, promo + (rewardWithPromo && reward.applicable ? reward.discountCents : 0));

  let total;
  let applied;
  if (accountPromoPolicy === "stack") {
    total = Math.min(subtotal, promo + account + (reward.applicable && (rewardWithAccount || rewardWithPromo) ? reward.discountCents : 0));
    applied = [
      ...(promo ? ["promo"] : []),
      ...(account ? ["account"] : []),
      ...(reward.applicable && (rewardWithAccount || rewardWithPromo) ? ["reward"] : [])
    ];
  } else {
    const candidates = [
      { total: promoReward, applied: [...(promo ? ["promo"] : []), ...(promo && rewardWithPromo && reward.applicable ? ["reward"] : [])] },
      { total: accountReward, applied: [...(account ? ["account"] : []), ...(rewardWithAccount && reward.applicable ? ["reward"] : [])] },
      { total: accountBase, applied: account >= promo ? (account ? ["account"] : []) : (promo ? ["promo"] : []) }
    ];
    candidates.sort((a, b) => b.total - a.total || b.applied.includes("reward") - a.applied.includes("reward"));
    total = candidates[0].total;
    applied = candidates[0].applied;
  }

  return {
    totalDiscountCents: total,
    promoDiscountCents: applied.includes("promo") ? promo : 0,
    accountDiscountCents: applied.includes("account") ? account : 0,
    rewardDiscountCents: applied.includes("reward") ? reward.discountCents : 0,
    accountPercentOff: applied.includes("account") ? Number(benefitSnapshot?.discount?.activePercentOff || 0) : 0,
    rewardApplied: applied.includes("reward"),
    rewardDetails: reward,
    stackingPolicy: {
      accountWithPromo: accountPromoPolicy,
      rewardWithAccount,
      rewardWithPromo
    },
    applied
  };
}
