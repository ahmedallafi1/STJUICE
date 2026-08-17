import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAccountDialog, renderCart, renderPage, renderServiceDialog } from "../lib/views.js";

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
  cateringEmail: ""
};

const routes = ["/", "/menu", "/product/pistachio-saint", "/build", "/drops", "/boxes", "/catering", "/rewards", "/location", "/account", "/about", "/states", "/info/privacy", "/missing"];
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

console.log(JSON.stringify({ status: "valid", routesRendered: routes.length, builderStepsRendered: data.builder.steps.length, fullMenuCards: 54, accountModesRendered: 4 }, null, 2));
