export function accountDiscountCents(subtotalCents, benefitSnapshot = null) {
  const percent = Number(benefitSnapshot?.discount?.activePercentOff || 0);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.max(0, Math.min(subtotalCents, Math.round(subtotalCents * percent / 100)));
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
