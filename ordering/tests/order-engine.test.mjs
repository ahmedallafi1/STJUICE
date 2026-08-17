import assert from "node:assert/strict";
import { generateSlots, quoteCart, validateDeliveryAddress } from "../lib/order-engine.mjs";

const item = { kind: "catalog", productId: "pistachio-saint", sizeId: "16oz", quantity: 2, modifierSelections: { "milk-choice": ["oat-milk"] }, unitPrice: 0.01 };
const quote = quoteCart({ service: "pickup", items: [item], tipPercent: 0 });
assert.equal(quote.valid, true);
assert.equal(quote.totals.subtotal.cents, 2190, "Server catalog and modifier prices must override a supplied browser price");
assert.equal(quote.items[0].unitPrice.cents, 1095);
assert.equal(quote.items[0].modifiers[0].price.cents, 100);

const promo = quoteCart({ service: "pickup", items: [{ ...item, quantity: 1 }], promoCode: "test10", tipPercent: 20 });
assert.equal(promo.valid, true);
assert.equal(promo.totals.discount.cents, 110);
assert.equal(promo.totals.tip.cents, 197);
assert.equal(promo.totals.total.cents, 1182);

const invalid = quoteCart({ service: "pickup", items: [{ kind: "catalog", productId: "fake", sizeId: "tiny", quantity: 1 }] });
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some((entry) => entry.code === "product_not_found"));

const badModifier = quoteCart({ service: "pickup", items: [{ ...item, quantity: 1, modifierSelections: { "milk-choice": ["fake-option"] } }] });
assert.equal(badModifier.valid, false);
assert.ok(badModifier.errors.some((entry) => entry.code === "modifier_not_found"));

const tierPricing = quoteCart({ service: "pickup", items: [{ kind: "catalog", productId: "saint-acai", sizeId: "regular", quantity: 1, modifierSelections: { "bowl-fruit": ["strawberry", "banana", "blueberry"] } }] });
assert.equal(tierPricing.valid, true);
assert.equal(tierPricing.items[0].unitPrice.cents, 1320, "Two included fruits plus one premium fruit must price from group rules");

const officeChoices = ["orange-press", "orange-press", "watermelon-wave", "pineapple-lime", "carrot-glow", "beet-route", "lemon-mint", "strawberry-lemonade", "mango-passion-fizz", "blue-rush", "blue-rush"];
const office = quoteCart({ service: "pickup", items: [{ kind: "catalog", productId: "office-box", sizeId: "serves-8-10", quantity: 1, modifierSelections: { "office-drink-selection": officeChoices } }] });
assert.equal(office.valid, true);
assert.equal(office.items[0].unitPrice.cents, 8745, "Duplicate product-reference choices and each-after-included pricing must be preserved");

const builder = quoteCart({
  service: "delivery",
  items: [{
    kind: "builder",
    productId: "build-your-mood",
    quantity: 1,
    customName: "Pistachio Study Mood",
    builderSelections: { base: "crepe", mood: "pistachio", "fruit-flavor": ["strawberry"], texture: "crunchy-finish", sauce: ["pistachio-sauce"], topping: ["kataifi-crunch"], boost: ["soft-serve-scoop"] }
  }]
});
assert.equal(builder.valid, true);
assert.ok(builder.items[0].allergens.includes("tree_nut"));
assert.ok(builder.items[0].allergens.includes("wheat"));
assert.ok(builder.warnings.some((entry) => entry.code === "delivery_quality_notice"));

const now = new Date();
const fridayDelta = (5 - now.getUTCDay() + 7) % 7;
const friday = new Date(now); friday.setUTCDate(now.getUTCDate() + fridayDelta);
const fridayText = friday.toISOString().slice(0, 10);
const slots = generateSlots("pickup", fridayText, now);
assert.equal(slots.valid, true);
assert.ok(slots.slots.some((entry) => entry.value.includes("22:30")), "Friday must expose late-weekend slots");

assert.equal(validateDeliveryAddress({ street: "11 S Vandeventer Ave", city: "St. Louis", state: "MO", postalCode: "63108" }).valid, true);
assert.equal(validateDeliveryAddress({ city: "St. Louis" }).valid, false);

console.log(JSON.stringify({ status: "valid", authoritativePricing: true, builderValidated: true, fridaySlots: slots.slots.length, deliveryMode: "manual_review_test" }, null, 2));
