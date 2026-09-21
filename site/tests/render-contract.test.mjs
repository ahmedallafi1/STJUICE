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

const routes = ["/", "/menu", "/product/pistachio-saint", "/build", "/drops", "/boxes", "/gift-cards", "/catering", "/rewards", "/location", "/account", "/about", "/states", "/checkout", "/info/privacy", "/info/terms", "/info/refunds", "/info/cookies", "/info/accessibility", "/info/allergens", "/info/contact", "/missing"];
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
  profile: { name: "Student Tester", email: "student@example.edu", phone: "", birthday: "", mode: "student" },
  student: { status: "not_submitted" },
  business: { status: "not_submitted" },
  points: 0,
  favorites: [],
  savedMixes: [],
  orderHistory: [],
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
    discount: { enabled: false, verificationRequired: true, verificationStatus: "not_submitted", activePercentOff: 0 },
    loyalty: { enabled: true, enrolled: true, points: 99 },
    birthday: { enabled: false, eligible: false }
  },
  rewardsWallet: {
    points: 99,
    lifetimeEarned: 99,
    lifetimeRedeemed: 0,
    transactions: [],
    grants: [{ id: "grant_test", kind: "loyalty_redemption", rewardType: "fixed_discount", status: "available" }]
  },
  rewardsConfig: {
    enabled: true,
    pointsPerDollar: 10,
    redemptions: [{ id: "reward_test", points: 50, type: "fixed_discount", value: 5 }]
  },
  reservationConfig: {
    enabled: true,
    partySize: { min: 2, max: 40 },
    durationMinutes: { min: 30, max: 240, increment: 30 },
    purposes: ["study_group", "work_group", "meeting", "social", "other"]
  }
};
state.mode = "student";
const studentAccount = renderPage({ path: "/account", params: new URLSearchParams() }, { data, state });
assert.ok(studentAccount.includes("data-student-verification-form"), "Student account must render verification submission");
assert.ok(studentAccount.includes("data-reservation-form"), "Signed-in account must render reservation request form");
assert.ok(studentAccount.includes("Study group"), "Reservation purpose must be customer-readable");
assert.ok(studentAccount.includes("Requested"), "Reservation status must be visible");
assert.ok(studentAccount.includes("MEMBER WALLET"), "Signed-in account must render the member wallet");
assert.ok(studentAccount.includes('data-action="apply-reward-grant"'), "Available wallet grant must be selectable for checkout");
assert.ok(studentAccount.includes("99 points"), "Active wallet balance must render from server dashboard state");
assert.ok(!studentAccount.includes("10%"), "Disabled proposal discount must not be advertised as an active benefit");

state.mode = "business";
state.account.profile.mode = "business";
state.account.business = { status: "pending_review", company: "Test Company", role: "Office Manager" };
state.account.benefits.discount = { enabled: false, verificationRequired: true, verificationStatus: "pending_review", activePercentOff: 0 };
const businessAccount = renderPage({ path: "/account", params: new URLSearchParams() }, { data, state });
assert.ok(businessAccount.includes("data-business-form"), "Pending business account must render editable business profile");
assert.ok(businessAccount.includes("Pending review"), "Business review status must be visible");
assert.ok(!businessAccount.includes("8%"), "Disabled proposal business discount must not be advertised as active");

state.account = undefined;
state.mode = "guest";

assert.ok(renderServiceDialog(state).includes("Pickup"), "Service dialog must include pickup");
assert.ok(renderServiceDialog(state).includes("Delivery"), "Service dialog must include delivery");
assert.ok(renderCart(data, state).includes(data.copy.cartCheckout.emptyCart), "Empty cart state must use canonical copy");

state.cart = [{ key: "test", name: "Pistachio Saint", image: "test.webp", sizeLabel: "16 oz", modifiers: [], unitPrice: 9.95, quantity: 2 }];
assert.ok(renderCart(data, state).includes("$19.90"), "Cart must calculate line totals");

state.checkout.quote = {
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

console.log(JSON.stringify({ status: "valid", routesRendered: routes.length + 1, builderStepsRendered: data.builder.steps.length, fullMenuCards: 54, accountModesRendered: 4, checkoutRendered: true, orderRendered: true }, null, 2));
