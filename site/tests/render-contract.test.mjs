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
    step: 0, date: new Date().toISOString().slice(0, 10), slots: [], slot: "",
    address: { street: "", city: "St. Louis", state: "MO", postalCode: "" }, deliveryCheck: null,
    contact: { name: "", email: "", phone: "", marketingConsent: false }, promoCode: "", tipPercent: 0,
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
  assert.ok(accountHtml.includes("Current mode"), `${mode} selector must expose current state`);
}

assert.ok(renderServiceDialog(state).includes("Pickup"), "Service dialog must include pickup");
assert.ok(renderServiceDialog(state).includes("Delivery"), "Service dialog must include delivery");
assert.ok(renderCart(data, state).includes(data.copy.cartCheckout.emptyCart), "Empty cart state must use canonical copy");

state.cart = [{ key: "test", name: "Pistachio Saint", image: "test.webp", sizeLabel: "16 oz", modifiers: [], unitPrice: 9.95, quantity: 2 }];
assert.ok(renderCart(data, state).includes("$19.90"), "Cart must calculate line totals");

state.checkout.quote = {
  promo: null,
  items: [{ name: "Pistachio Saint", sizeLabel: "16 oz", quantity: 2, allergens: ["milk", "tree_nut"], lineTotal: { amount: 19.9 } }],
  totals: { subtotal: { amount: 19.9 }, discount: { amount: 0 }, tax: { amount: 0 }, deliveryFee: { amount: 0 }, serviceFee: { amount: 0 }, tip: { amount: 0, percent: 0 }, total: { amount: 19.9 } }
};
const checkout = renderPage({ path: "/checkout", params: new URLSearchParams() }, { data, state });
assert.ok(checkout.includes("Checkout without surprises"));
assert.ok(checkout.includes("SAFE TEST"));

state.order = { id: "order_test", orderNumber: "STJ-0001", status: "received", service: "pickup", schedule: "2026-08-17T08:00:00", customer: { name: "Test Guest", email: "t***@example.com", phone: "***0100" }, items: state.checkout.quote.items, totals: state.checkout.quote.totals, pos: { reference: "test_pos_123", adapter: "test_pos_receipt", status: "accepted_test" } };
const order = renderPage({ path: "/order/order_test", params: new URLSearchParams() }, { data, state });
assert.ok(order.includes("STJ-0001"));
assert.ok(order.includes("Advance test status"));

console.log(JSON.stringify({ status: "valid", routesRendered: routes.length + 1, builderStepsRendered: data.builder.steps.length, fullMenuCards: 54, accountModesRendered: 4, checkoutRendered: true, orderRendered: true }, null, 2));
