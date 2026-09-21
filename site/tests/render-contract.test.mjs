import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateBuilderTotal, renderAccountDialog, renderCart, renderPage, renderServiceDialog } from "../lib/views.js";

const siteRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(siteRoot, "..");
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(packageRoot, relativePath), "utf8"));

const data = {
  catalog: readJson("menu/data/catalog.json"),
  modifiers: readJson("menu/data/modifiers.json"),
  builder: readJson("menu/data/build-your-mood.json"),
  bundles: readJson("menu/data/bundles-catering.json"),
  copy: readJson("content/site-copy.json"),
  media: readJson("media/manifests/media-manifest.json")
};
data.productById = new Map(data.catalog.products.map((item) => [item.id, item]));
data.categoryById = new Map(data.catalog.categories.map((item) => [item.id, item]));
data.modifierById = new Map(data.modifiers.groups.map((item) => [item.id, item]));

const state = {
  mode: "guest",
  service: "pickup",
  cart: [],
  menuFilters: { query: "", category: "all", mood: "all", occasion: "all", channel: "all" },
  productDrafts: {},
  builder: { step: 0, selections: { base: null, mood: null, "fruit-flavor": [], texture: null, sauce: [], topping: [], boost: [] }, name: "" },
  cateringSuccess: false,
  cateringEmail: "",
  checkout: {
    step: 0, schedule: "asap", paymentMethod: "card",
    address: { street: "", city: "St. Louis", state: "MO", postalCode: "" }, deliveryCheck: null,
    contact: { name: "", email: "", phone: "", marketingConsent: false }, promoCode: "", rewardGrantId: "", tipPercent: 0,
    allergenAcknowledged: false, quote: null, preparing: false, busy: false, error: ""
  },
  order: null,
  orderLoading: false
};

const routes = ["/", "/menu", "/product/pistachio-saint", "/build", "/drops", "/boxes", "/catering", "/rewards", "/location", "/account", "/about", "/checkout", "/info/privacy", "/info/terms", "/info/refunds", "/info/cookies", "/info/accessibility", "/info/allergens", "/info/contact", "/missing"];
for (const path of routes) {
  const html = renderPage({ path, params: new URLSearchParams() }, { data, state });
  assert.ok(html.length > 250, `${path} must render meaningful markup`);
  assert.ok(/<h1|<h2/.test(html), `${path} must contain a page heading`);
  assert.ok(!html.includes("undefined"), `${path} must not leak undefined values`);
  assert.ok(!html.includes("[object Object]"), `${path} must not stringify objects accidentally`);
}

const menuHtml = renderPage({ path: "/menu", params: new URLSearchParams() }, { data, state });
assert.equal((menuHtml.match(/class="product-card"/g) || []).length, 54, "Unfiltered menu must render all 54 catalog records");

state.menuFilters.query = "pistachio";
const filteredMenu = renderPage({ path: "/menu", params: new URLSearchParams() }, { data, state });
assert.ok((filteredMenu.match(/class="product-card"/g) || []).length >= 1, "Pistachio search must render matches");
state.menuFilters.query = "";

for (let step = 0; step < data.builder.steps.length; step += 1) {
  state.builder.step = step;
  const builderHtml = renderPage({ path: "/build", params: new URLSearchParams() }, { data, state });
  assert.ok(builderHtml.includes(`STEP ${step + 1} OF ${data.builder.steps.length}`), `Builder step ${step + 1} must render`);
}

state.builder.selections = { base: "crepe", mood: "pistachio", "fruit-flavor": ["strawberry"], texture: "crunchy-finish", sauce: ["pistachio-sauce"], topping: ["kataifi-crunch"], boost: ["soft-serve-scoop"] };
assert.equal(calculateBuilderTotal(data, state), 13.4, "Browser builder pricing must match authoritative included-choice rules");

const officeProduct = renderPage({ path: "/product/office-box", params: new URLSearchParams() }, { data, state });
assert.ok(officeProduct.includes("data-product-reference"), "Repeatable group formats must render product-reference quantity controls");

for (const mode of ["guest", "regular", "student", "business"]) {
  state.mode = mode;
  const accountHtml = renderAccountDialog(state);
  assert.ok(accountHtml.includes("Current experience"), `${mode} selector must expose current state`);
}

state.account = {
  signedIn: true,
  csrfToken: "csrf-test",
  profile: { name: "Student Tester", email: "student@example.edu", phone: "3145550100", birthday: "1999-09-20", mode: "student" },
  student: { status: "not_submitted" },
  business: { status: "not_submitted" },
  points: 999,
  favorites: [],
  savedMixes: [],
  orderHistory: [{ id: "order_old", orderNumber: "STJ-OLD", service: "pickup", status: "complete", total: 9.95, items: [], createdAt: "2026-09-01T12:00:00Z" }],
  addresses: [{ id: "addr_test", label: "Home", street: "11 S Vandeventer Ave", city: "St. Louis", state: "MO", postalCode: "63108" }],
  cateringRequests: [{ id: "cat_test", reference: "STJ-CAT-0001", eventDate: "2026-10-01", guestCount: 25, status: "quoted", quote: { amount: 450, version: 1 } }],
  reservations: [{
    id: "res_test",
    purpose: "study_group",
    date: "2026-09-21",
    startTime: "18:00",
    durationMinutes: 120,
    partySize: 8,
    status: "requested"
  }],
  benefits: {
    discount: { enabled: true, verificationRequired: true, verificationStatus: "not_submitted", verificationSatisfied: false, activePercentOff: 0 },
    loyalty: { enabled: true, enrolled: true, points: 999 },
    birthday: { enabled: true, eligible: false, alreadyIssuedThisYear: false }
  },
  rewardsWallet: {
    points: 999,
    lifetimeEarned: 999,
    lifetimeRedeemed: 0,
    transactions: [],
    grants: [{ id: "grant_test", label: "$5 reward", kind: "loyalty_redemption", rewardType: "fixed_discount", status: "available" }]
  },
  rewardsConfig: {
    enabled: true,
    pointsPerDollar: 10,
    autoEnrollOnAccountCreation: true,
    redemptions: [
      { id: "reward-500", label: "$5 reward", points: 500, type: "fixed_discount", value: 5 },
      { id: "reward-900", label: "Free drink", points: 900, type: "free_product", value: null },
      { id: "reward-1200", label: "Free dessert", points: 1200, type: "free_product", value: null },
      { id: "reward-1800", label: "$15 Party Box reward", points: 1800, type: "item_discount", value: 15 }
    ]
  },
  reservationConfig: {
    enabled: true,
    partySize: { min: 2, max: 40 },
    durationMinutes: { min: 30, max: 240, increment: 30 },
    purposes: ["study_group", "student_organization", "work_group", "meeting", "birthday", "celebration", "general_group", "other"]
  }
};
state.mode = "student";

const unverifiedStudentAccount = renderPage({ path: "/account", params: new URLSearchParams() }, { data, state });
assert.ok(unverifiedStudentAccount.includes("data-student-verification-form"), "Unverified Student must render verification submission");
assert.ok(!unverifiedStudentAccount.includes("10% active"), "Student discount must not activate before verification");

state.account.student = { status: "verified", expiresAt: "2027-09-20" };
state.account.benefits.discount = { enabled: true, verificationRequired: true, verificationStatus: "verified", verificationSatisfied: true, activePercentOff: 10 };
const studentAccount = renderPage({ path: "/account", params: new URLSearchParams() }, { data, state });
assert.ok(studentAccount.includes("Verified"));
assert.ok(studentAccount.includes("10% active"), "Verified Student must see the active fixed discount");
assert.ok(studentAccount.includes("data-reservation-form"), "Signed-in account must render reservation request form");
assert.ok(studentAccount.includes("Student organization"), "Expanded reservation purposes must be customer-readable");
assert.ok(studentAccount.includes("Requested"), "Reservation status must be visible");
assert.ok(studentAccount.includes("MEMBER WALLET"), "Signed-in account must render member wallet");
assert.ok(studentAccount.includes('data-action="apply-reward-grant"'), "Available wallet grant must be selectable for checkout");
assert.ok(studentAccount.includes("999 points"), "Wallet balance must render from server dashboard state");
assert.ok(studentAccount.includes("Free drink"), "Reward catalog labels must be visible");
assert.ok(studentAccount.includes("PROFILE"));
assert.ok(studentAccount.includes("SAVED ADDRESSES"));
assert.ok(studentAccount.includes("Home"));
assert.ok(studentAccount.includes("STJ-CAT-0001"));
assert.ok(studentAccount.includes("Accept quote"));
assert.ok(studentAccount.includes("Reorder"));

state.mode = "business";
state.account.profile.mode = "business";
state.account.business = { status: "pending_review", company: "Test Company", role: "Office Manager" };
state.account.benefits.discount = { enabled: true, verificationRequired: true, verificationStatus: "pending_review", verificationSatisfied: false, activePercentOff: 0 };
const pendingBusinessAccount = renderPage({ path: "/account", params: new URLSearchParams() }, { data, state });
assert.ok(pendingBusinessAccount.includes("data-business-form"), "Pending business account must render editable business profile");
assert.ok(pendingBusinessAccount.includes("Pending review"));
assert.ok(!pendingBusinessAccount.includes("8% active"), "Business discount must not activate before approval");

state.account.business = { status: "approved", company: "Test Company", role: "Office Manager" };
state.account.benefits.discount = { enabled: true, verificationRequired: true, verificationStatus: "approved", verificationSatisfied: true, activePercentOff: 8 };
const approvedBusinessAccount = renderPage({ path: "/account", params: new URLSearchParams() }, { data, state });
assert.ok(approvedBusinessAccount.includes("Approved business"));
assert.ok(approvedBusinessAccount.includes("8% active"), "Approved Business must see the active fixed discount");
assert.ok(approvedBusinessAccount.includes("Plan catering"));

state.account = undefined;
state.mode = "guest";

assert.ok(renderServiceDialog(state).includes("Pickup"), "Service dialog must include pickup");
assert.ok(renderServiceDialog(state).includes("Delivery"), "Service dialog must include delivery");
assert.ok(renderCart(data, state).includes(data.copy.cartCheckout.emptyCart), "Empty cart state must use canonical copy");

state.cart = [{ key: "test", name: "Pistachio Saint", image: "test.webp", sizeLabel: "16 oz", modifiers: [], unitPrice: 9.95, quantity: 2 }];
assert.ok(renderCart(data, state).includes("$19.90"), "Cart must calculate line totals");

state.checkout.quote = {
  mode: "safe_test",
  promo: null,
  fulfillment: { requiredLeadMinutes: 240 },
  items: [{ name: "Pistachio Saint", sizeLabel: "16 oz", quantity: 2, allergens: ["milk", "tree_nut"], lineTotal: { amount: 19.9 } }],
  totals: { subtotal: { amount: 19.9 }, discount: { amount: 0 }, tax: { amount: 0 }, deliveryFee: { amount: 0 }, serviceFee: { amount: 0 }, tip: { amount: 0, percent: 0 }, total: { amount: 19.9 } }
};
const checkout = renderPage({ path: "/checkout", params: new URLSearchParams() }, { data, state });
assert.ok(checkout.includes("Checkout without surprises"));
assert.ok(checkout.includes("ORDERING PREVIEW"));
assert.ok(checkout.includes("No live card charge will occur yet."));
assert.ok(!checkout.includes("SAFE TEST"));
assert.ok(checkout.includes("Order for now."));
assert.ok(!checkout.includes("Service date"));
assert.ok(!checkout.includes("Available time"));

state.runtimeConfig = { mode: "production", payments: { live: true } };
state.checkout.quote.mode = "production";
const liveCheckout = renderPage({ path: "/checkout", params: new URLSearchParams() }, { data, state });
assert.ok(liveCheckout.includes("CHECKOUT"));
assert.ok(!liveCheckout.includes("ORDERING PREVIEW"));
assert.ok(!liveCheckout.includes("No live card charge will occur yet."));
state.runtimeConfig = null;
state.checkout.quote.mode = "safe_test";
assert.ok(checkout.includes("Minimum prep:"));
assert.ok(checkout.includes("4 hr"));

state.checkout.quote.discountBreakdown = {
  promo: { amount: 0 },
  account: { amount: 1.1 },
  reward: { amount: 5 }
};
state.checkout.quote.totals.discount.amount = 6.1;
state.checkout.quote.totals.total.amount = 13.8;
const benefitCheckout = renderPage({ path: "/checkout", params: new URLSearchParams() }, { data, state });
assert.ok(benefitCheckout.includes("Member benefit"));
assert.ok(benefitCheckout.includes("Reward"));
assert.ok(!benefitCheckout.includes(">Discount<"), "Detailed discount breakdown should replace generic discount when available");

state.checkout.step = 3;
state.checkout.paymentMethod = "cash";
const pickupPayment = renderPage({ path: "/checkout", params: new URLSearchParams() }, { data, state });
assert.ok(pickupPayment.includes("Cash at pickup"));
state.service = "dine_in";
const dineInPayment = renderPage({ path: "/checkout", params: new URLSearchParams() }, { data, state });
assert.ok(dineInPayment.includes("Cash at the counter"));
state.service = "delivery";
const deliveryPayment = renderPage({ path: "/checkout", params: new URLSearchParams() }, { data, state });
assert.ok(deliveryPayment.includes("Cash is not available for delivery"));
assert.ok(!deliveryPayment.includes("Cash at pickup"));
state.service = "pickup";

state.order = { id: "order_test", orderNumber: "STJ-0001", status: "received", service: "pickup", schedule: "asap", estimatedReadyAt: "2026-08-17T08:30:00", customer: { name: "Test Guest", email: "t***@example.com", phone: "***0100" }, items: state.checkout.quote.items, totals: state.checkout.quote.totals, pos: { reference: "test_pos_123", adapter: "test_pos_receipt", status: "accepted_test" } };
const order = renderPage({ path: "/order/order_test", params: new URLSearchParams() }, { data, state });
assert.ok(order.includes("STJ-0001"));
assert.ok(order.includes("Refresh status"));
assert.ok(order.includes("Estimated ready"));
assert.ok(order.includes("2026-08-17 · 08:30"));
assert.ok(!order.includes("Advance test status"));

state.order.mode = "production";
const liveOrder = renderPage({ path: "/order/order_test", params: new URLSearchParams() }, { data, state });
assert.ok(liveOrder.includes("ORDER STATUS"));
assert.ok(!liveOrder.includes("Preview receipt"));
assert.ok(!liveOrder.includes("No live card charge occurred."));

console.log(JSON.stringify({ status: "valid", routesRendered: routes.length + 1, builderStepsRendered: data.builder.steps.length, fullMenuCards: 54, accountModesRendered: 4, checkoutRendered: true, liveCheckoutCopyValidated: true, orderRendered: true, liveOrderCopyValidated: true }, null, 2));
