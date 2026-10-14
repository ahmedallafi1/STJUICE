import assert from "node:assert/strict";
import { generateSlots, quoteCart, validateDeliveryAddress } from "../lib/order-engine.mjs";
import { catalog } from "../lib/catalog-store.mjs";

assert.equal(catalog.products.length, 40, "Only 40 numbered HQ products are orderable");
const item = { kind:"catalog", productId:"blue-saint", sizeId:"16oz", quantity:2, modifierSelections:{}, unitPrice:0.01 };
const quote = quoteCart({ service:"pickup", items:[item], tipPercent:0 });
assert.equal(quote.valid, true, JSON.stringify(quote.errors));
assert.equal(quote.totals.subtotal.cents, 1700, "Server HQ price must override browser price");
assert.equal(quote.items[0].unitPrice.cents, 850);

const promo = quoteCart({ service:"pickup", items:[{ ...item, quantity:1 }], promoCode:"test10", tipPercent:20 });
assert.equal(promo.valid, true);
assert.equal(promo.totals.discount.cents, 85);
assert.ok(promo.totals.tip.cents > 0);

const benefit = quoteCart({ service:"pickup", items:[{ ...item, quantity:1 }], tipPercent:0 }, { benefits:{ discount:{activePercentOff:10} }, stackingPolicy:"best_discount" });
assert.equal(benefit.valid, true);
assert.equal(benefit.totals.discount.cents, 85);
assert.equal(benefit.discountBreakdown.account.cents, 85);

const forged = quoteCart({ service:"pickup", items:[{ ...item, quantity:1 }], tipPercent:0, accountBenefit:{activePercentOff:99} });
assert.equal(forged.totals.discount.cents, 0, "Client cannot issue its own account discount");

const reward = quoteCart(
  { service:"pickup", items:[{ ...item, quantity:1 }], rewardGrantId:"grant_test", tipPercent:0 },
  { benefits:{discount:{activePercentOff:10}}, rewardGrant:{id:"grant_test",status:"available",rewardType:"fixed_discount",value:5},
    accountPromoPolicy:"best_discount",rewardWithAccount:true,rewardWithPromo:false }
);
assert.equal(reward.valid, true);
assert.equal(reward.discountBreakdown.reward.cents, 500);
assert.equal(reward.totals.discount.cents, 585);

const fake = quoteCart({ service:"pickup", items:[{ kind:"catalog",productId:"pistachio-saint",sizeId:"16oz",quantity:1 }] });
assert.equal(fake.valid, false, "Old deleted products cannot be purchased");
assert.ok(fake.errors.some(x=>x.code==="product_not_found"));

const badModifier = quoteCart({service:"pickup",items:[{...item,quantity:1,modifierSelections:{"milk-choice":["oat-milk"]}}]});
assert.equal(badModifier.valid,false,"No modifications outside tested HQ recipes");
assert.ok(badModifier.errors.some(x=>x.code==="modifier_group_not_allowed"));

const serving = quoteCart({service:"pickup",items:[{kind:"catalog",productId:"pistachio-berry-minis",sizeId:"10minis",quantity:1,modifierSelections:{}}]});
assert.equal(serving.valid,true);
assert.equal(serving.items[0].unitPrice.cents,1150);

const now = new Date();
const fridayDelta = (5 - now.getUTCDay() + 7) % 7;
const friday = new Date(now); friday.setUTCDate(now.getUTCDate() + fridayDelta);
const slots=generateSlots("pickup",friday.toISOString().slice(0,10),now);
assert.equal(slots.valid,true);
assert.ok(slots.slots.some(entry=>entry.value.includes("22:30")));
assert.equal(validateDeliveryAddress({street:"11 S Vandeventer Ave",city:"St. Louis",state:"MO",postalCode:"63108"}).valid,true);
assert.equal(validateDeliveryAddress({city:"St. Louis"}).valid,false);

console.log(JSON.stringify({status:"valid",catalogProducts:40,authoritativePricing:true,removedProductsRejected:true,checkoutQuotesValid:true}));
