import { builder, builderOptions, builderStepById, config, modifierById, productById } from "./catalog-store.mjs";

const cents = (value) => Math.round(Number(value || 0) * 100);
const dollars = (value) => Number((Number(value || 0) / 100).toFixed(2));
const cleanText = (value, max = 240) => String(value || "").trim().slice(0, max);
const asIds = (value) => Array.isArray(value) ? [...new Set(value.map(String))] : value ? [String(value)] : [];

function moneyFields(amount) {
  return { cents: amount, amount: dollars(amount), currency: config.meta.currency };
}

function validateQuantity(value, errors, index) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    errors.push({ code: "invalid_quantity", itemIndex: index, message: "Quantity must be a whole number from 1 to 20." });
    return 1;
  }
  return quantity;
}

function catalogGroupOptions(group) {
  if (group.options?.length) return group.options;
  const reused = modifierById.get(group.reuseOptionsFrom)?.options;
  if (reused?.length) return reused;
  return (group.eligibleProductIds || []).map((id) => productById.get(id)).filter(Boolean).map((product) => ({ id: product.id, name: product.name, allergenAdds: product.containsAllergens || [] }));
}

function catalogOptionCents(group, option, position) {
  if (Number.isFinite(Number(option.price))) return cents(option.price);
  if (position < Number(group.selection?.included || 0)) return 0;
  if (option.tier === "premium" && group.pricing?.premiumAfterIncluded != null) return cents(group.pricing.premiumAfterIncluded);
  if (group.pricing?.standardAfterIncluded != null) return cents(group.pricing.standardAfterIncluded);
  if (group.pricing?.eachAfterIncluded != null) return cents(group.pricing.eachAfterIncluded);
  return 0;
}

function catalogLine(input, index, service, errors, warnings) {
  const product = productById.get(String(input.productId || ""));
  if (!product) {
    errors.push({ code: "product_not_found", itemIndex: index, message: "This product is not in the active catalog." });
    return null;
  }
  if (!(product.availability?.channels || []).includes(service)) {
    errors.push({ code: "service_unavailable", itemIndex: index, message: `${product.name} is not available for ${service}.` });
  }
  const size = product.sizes?.find((entry) => entry.id === input.sizeId);
  if (!size) {
    errors.push({ code: "size_not_found", itemIndex: index, message: `Choose a valid size for ${product.name}.` });
    return null;
  }

  const selections = input.modifierSelections && typeof input.modifierSelections === "object" ? input.modifierSelections : {};
  const modifierLines = [];
  let modifierCents = 0;
  for (const suppliedId of Object.keys(selections)) {
    if (!(product.modifierGroupIds || []).includes(suppliedId)) {
      errors.push({ code: "modifier_group_not_allowed", itemIndex: index, groupId: suppliedId, message: `${suppliedId} is not available on ${product.name}.` });
    }
  }
  for (const groupId of product.modifierGroupIds || []) {
    const group = modifierById.get(groupId);
    if (!group) {
      errors.push({ code: "modifier_group_missing", itemIndex: index, groupId, message: "A menu modifier group could not be resolved." });
      continue;
    }
    const supplied = Array.isArray(selections[groupId]) ? selections[groupId].map(String) : selections[groupId] ? [String(selections[groupId])] : [];
    const ids = group.selection?.allowDuplicates ? supplied : [...new Set(supplied)];
    const min = Number(group.selection?.min || 0);
    const max = Number(group.selection?.max || 1);
    const options = catalogGroupOptions(group);
    if (options.length && ids.length < min) errors.push({ code: "modifier_minimum", itemIndex: index, groupId, message: `Choose at least ${min} option in ${group.name}.` });
    if (ids.length > max) errors.push({ code: "modifier_maximum", itemIndex: index, groupId, message: `Choose no more than ${max} in ${group.name}.` });
    if (!options.length && min > 0) warnings.push({ code: "dynamic_modifier_unconfigured", itemIndex: index, groupId, message: `${group.name} needs live POS options before launch.` });
    for (const [position, id] of ids.entries()) {
      const option = options.find((entry) => entry.id === id);
      if (!option) {
        errors.push({ code: "modifier_not_found", itemIndex: index, groupId, optionId: id, message: `An option in ${group.name} is not valid.` });
        continue;
      }
      const optionCents = catalogOptionCents(group, option, position);
      if (option.price == null && !option.tier && !group.pricing) warnings.push({ code: "modifier_price_unconfigured", itemIndex: index, groupId, optionId: id, message: `${option.name} is $0 in safe test mode until its price is approved.` });
      modifierCents += optionCents;
      modifierLines.push({ groupId, groupName: group.name, optionId: id, name: option.name, price: moneyFields(optionCents) });
    }
  }

  const quantity = validateQuantity(input.quantity, errors, index);
  const unitCents = cents(size.price) + modifierCents;
  return {
    kind: "catalog",
    key: cleanText(input.key, 500) || `${product.id}:${size.id}:${index}`,
    productId: product.id,
    name: product.name,
    sizeId: size.id,
    sizeLabel: size.label,
    quantity,
    instructions: cleanText(input.instructions),
    configuration: {
      sizeId: size.id,
      modifierSelections: Object.fromEntries((product.modifierGroupIds || []).map((groupId) => [groupId, [...(Array.isArray(selections[groupId]) ? selections[groupId].map(String) : selections[groupId] ? [String(selections[groupId])] : [])]]))
    },
    modifiers: modifierLines,
    allergens: [...new Set([...(product.containsAllergens || []), ...modifierLines.flatMap((line) => catalogGroupOptions(modifierById.get(line.groupId) || {}).find((option) => option.id === line.optionId)?.allergenAdds || [])])],
    unitPrice: moneyFields(unitCents),
    lineTotal: moneyFields(unitCents * quantity)
  };
}

function includedCount(base, stepId) {
  if (stepId === "fruit-flavor") return Number(base.includes?.fruit || base.includes?.produce || 0);
  if (stepId === "sauce") return Number(base.includes?.sauce || 0);
  if (stepId === "topping") return Number(base.includes?.topping || 0);
  return 0;
}

function builderOptionCents(step, option) {
  if (step.id === "fruit-flavor") return cents(option.priceAfterIncluded);
  if (Number.isFinite(Number(option.price))) return cents(option.price);
  const groupId = step.reuseOptionsFrom?.split("#")[1];
  const pricing = modifierById.get(groupId)?.pricing;
  if (option.tier === "premium" && pricing?.premiumAfterIncluded != null) return cents(pricing.premiumAfterIncluded);
  return cents(pricing?.standardAfterIncluded);
}

function optionAllowed(base, stepId, option) {
  if (["base", "mood", "texture"].includes(stepId)) return true;
  if (option.allowedBaseIds && !option.allowedBaseIds.includes(base.id)) return false;
  if (stepId === "fruit-flavor") return base.allows.some((id) => id === "fruit-flavor" || id === "fruit-dessert");
  if (stepId === "sauce") return base.allows.some((id) => id.startsWith("sauces-"));
  if (stepId === "topping") return base.allows.some((id) => id.startsWith("toppings-"));
  return true;
}

function builderLine(input, index, errors, warnings) {
  const selections = input.builderSelections && typeof input.builderSelections === "object" ? input.builderSelections : {};
  const baseStep = builderStepById.get("base");
  const base = builderOptions(baseStep).find((entry) => entry.id === selections.base);
  if (!base) {
    errors.push({ code: "builder_base_required", itemIndex: index, message: "Choose a valid Build Your Mood base." });
    return null;
  }
  const mood = builderOptions(builderStepById.get("mood")).find((entry) => entry.id === selections.mood);
  if (!mood) errors.push({ code: "builder_mood_required", itemIndex: index, message: "Choose a valid mood." });

  let unitCents = cents(base.basePrice);
  const modifierLines = [];
  const allergens = new Set(base.defaultAllergens || []);
  for (const step of builder.steps.filter((entry) => !["base", "mood", "review"].includes(entry.id))) {
    const ids = asIds(selections[step.id]);
    const max = Number(step.selection?.max || 1);
    if (ids.length > max) errors.push({ code: "builder_selection_maximum", itemIndex: index, stepId: step.id, message: `Choose no more than ${max} in ${step.name}.` });
    const options = builderOptions(step);
    const free = includedCount(base, step.id);
    ids.forEach((id, position) => {
      const option = options.find((entry) => entry.id === id);
      if (!option) {
        errors.push({ code: "builder_option_not_found", itemIndex: index, stepId: step.id, optionId: id, message: `An option in ${step.name} is not valid.` });
        return;
      }
      if (!optionAllowed(base, step.id, option)) {
        errors.push({ code: "builder_option_not_allowed", itemIndex: index, stepId: step.id, optionId: id, message: `${option.name} is not available with ${base.name}.` });
        return;
      }
      const priceCents = position >= free ? builderOptionCents(step, option) : 0;
      unitCents += priceCents;
      for (const allergen of option.allergenAdds || []) allergens.add(allergen);
      if (["pistachio-sauce", "roasted-pistachio"].includes(id)) allergens.add("tree_nut");
      if (id === "kataifi-crunch") allergens.add("wheat");
      modifierLines.push({ stepId: step.id, stepName: step.name, optionId: id, name: option.name, included: position < free, price: moneyFields(priceCents) });
    });
  }
  if (["crepe", "waffle", "mini-pancakes-12", "soft-serve-regular"].includes(base.id)) {
    warnings.push({ code: "delivery_quality_notice", itemIndex: index, message: `${base.name} may change texture during delivery.` });
  }
  const quantity = validateQuantity(input.quantity, errors, index);
  const name = cleanText(input.customName, 30) || `${mood?.name || "Custom"} ${base.name}`;
  return {
    kind: "builder",
    key: cleanText(input.key, 500) || `builder:${index}`,
    productId: "build-your-mood",
    name,
    baseId: base.id,
    baseLabel: base.name,
    moodId: mood?.id || null,
    configuration: { builderSelections: structuredClone(selections) },
    quantity,
    modifiers: modifierLines,
    allergens: [...allergens],
    unitPrice: moneyFields(unitCents),
    lineTotal: moneyFields(unitCents * quantity)
  };
}

export function quoteCart(request = {}) {
  const errors = [];
  const warnings = [];
  const service = String(request.service || "");
  if (!config.fulfillment.supported.includes(service)) errors.push({ code: "invalid_service", message: "Choose pickup, delivery or dine in." });
  const sourceItems = Array.isArray(request.items) ? request.items : [];
  if (!sourceItems.length) errors.push({ code: "empty_cart", message: "Add at least one item before checkout." });
  if (sourceItems.length > 50) errors.push({ code: "cart_too_large", message: "This test checkout accepts up to 50 distinct lines." });
  const items = sourceItems.slice(0, 50).map((input, index) => {
    if (input?.kind === "builder" || input?.productId === "build-your-mood") return builderLine(input || {}, index, errors, warnings);
    return catalogLine(input || {}, index, service, errors, warnings);
  }).filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal.cents, 0);
  let discount = 0;
  const promoCode = cleanText(request.promoCode, 30).toUpperCase();
  if (promoCode) {
    const promo = config.pricing.promo;
    if (promoCode === promo.testCode) discount = Math.min(Math.round(subtotal * promo.percentOff / 100), cents(promo.maximumDiscount));
    else errors.push({ code: "promo_invalid", message: "That promo code is not valid in safe test mode." });
  }
  const tipPercent = Number(request.tipPercent || 0);
  if (!config.pricing.tips.allowedPercentages.includes(tipPercent)) errors.push({ code: "tip_invalid", message: "Choose an available tip percentage." });
  const taxable = Math.max(0, subtotal - discount);
  const tax = cents(config.pricing.tax.safeTestAmount);
  const deliveryFee = service === "delivery" ? cents(config.pricing.deliveryFee.safeTestAmount) : 0;
  const serviceFee = cents(config.pricing.serviceFee.safeTestAmount);
  const tip = Math.round(taxable * tipPercent / 100);
  const total = taxable + tax + deliveryFee + serviceFee + tip;
  warnings.push(
    { code: "working_catalog_prices", message: "Catalog prices are working values pending owner approval." },
    { code: "tax_not_configured", message: "Tax is $0 in safe test mode and must be configured before launch." },
    { code: "fees_not_configured", message: "Delivery and service fees are $0 in safe test mode and must be configured before launch." }
  );
  return {
    valid: errors.length === 0,
    mode: config.meta.mode,
    service,
    items,
    errors,
    warnings,
    promo: promoCode ? { code: promoCode, status: discount ? "applied_test" : "invalid" } : null,
    totals: {
      subtotal: moneyFields(subtotal),
      discount: moneyFields(discount),
      tax: { ...moneyFields(tax), status: config.pricing.tax.status },
      deliveryFee: { ...moneyFields(deliveryFee), status: config.pricing.deliveryFee.status },
      serviceFee: { ...moneyFields(serviceFee), status: config.pricing.serviceFee.status },
      tip: { ...moneyFields(tip), percent: tipPercent },
      total: moneyFields(total)
    }
  };
}

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const parseMinutes = (value) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
const clock = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function localParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: config.meta.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function generateSlots(service, dateText, now = new Date()) {
  if (!config.fulfillment.supported.includes(service)) return { valid: false, errors: [{ code: "invalid_service", message: "Invalid service." }], slots: [] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText || ""))) return { valid: false, errors: [{ code: "invalid_date", message: "Use a YYYY-MM-DD date." }], slots: [] };
  const date = new Date(`${dateText}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return { valid: false, errors: [{ code: "invalid_date", message: "Choose a valid date." }], slots: [] };
  const localNow = localParts(now);
  const startToday = new Date(`${localNow.date}T12:00:00Z`);
  const delta = Math.round((date - startToday) / 86400000);
  if (delta < 0 || delta >= config.fulfillment.schedulingDays) return { valid: false, errors: [{ code: "date_out_of_range", message: `Choose a date within ${config.fulfillment.schedulingDays} days.` }], slots: [] };
  const hours = config.fulfillment.hours[dayNames[date.getUTCDay()]];
  const slots = [];
  const earliest = delta === 0 ? localNow.minute + config.fulfillment.leadMinutes[service] : parseMinutes(hours.open);
  for (let minute = parseMinutes(hours.open); minute <= parseMinutes(hours.close) - config.fulfillment.leadMinutes[service]; minute += config.fulfillment.slotIncrementMinutes) {
    if (minute < earliest) continue;
    slots.push({ value: `${dateText}T${clock(minute)}:00`, label: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(`2000-01-01T${clock(minute)}:00Z`)) });
  }
  return { valid: true, service, date: dateText, timezone: config.meta.timezone, hours, leadMinutes: config.fulfillment.leadMinutes[service], slots };
}

export function validateDeliveryAddress(address = {}) {
  const required = ["street", "city", "state", "postalCode"];
  const missing = required.filter((key) => !cleanText(address[key], 100));
  if (missing.length) return { valid: false, eligible: false, errors: missing.map((field) => ({ code: "address_required", field, message: `${field} is required.` })) };
  return {
    valid: true,
    eligible: true,
    mode: config.fulfillment.delivery.mode,
    address: Object.fromEntries(required.map((key) => [key, cleanText(address[key], 100)])),
    warning: config.fulfillment.delivery.testBehavior,
    realEligibilityConfirmed: false
  };
}
