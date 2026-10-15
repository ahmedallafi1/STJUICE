import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(siteRoot, "..");
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(packageRoot, relativePath), "utf8"));

const catalog = readJson("menu/data/catalog.json");
const modifiers = readJson("menu/data/modifiers.json");
const builder = readJson("menu/data/build-your-mood.json");
const bundles = readJson("menu/data/bundles-catering.json");
const copy = readJson("content/site-copy.json");
const media = readJson("media/manifests/media-manifest.json");


const crosswalk = readJson("hq/public-product-crosswalk.json");
assert.equal(crosswalk.meta.sourcePdfSha256, "d775c750ff12b4472838cee43c50514785a3e6abe26babec7b078b85df69f443", "Exact concept PDF fingerprint must be retained");
assert.equal(crosswalk.products.length, 40);
assert.equal(crosswalk.meta.pageCount, 52);
assert.equal(new Set(catalog.products.map((p) => p.hqNumber)).size, 40, "Each HQ photo number must be unique");
for (let i = 0; i < 40; i++) {
  const item = crosswalk.products[i];
  const product = catalog.products[i];
  assert.equal(product.hqNumber, i + 1, "Atlas photo slot must match HQ card order");
  assert.equal(product.name, item.name, "Customer menu name must match the source");
  assert.equal(product.sizes.length, 1, "HQ specifies only one size per product");
  assert.equal(product.sizes[0].label, item.serving, "Source serving must not be changed");
  assert.equal(product.sizes[0].price, item.suggestedPriceUsd, "Working menu price must be exact HQ suggestion");
  assert.equal(item.sourcePdfPage, 4 + Math.floor(i / 2), "Photo must correspond to printed page");
  assert.ok(!("estimatedKcal" in product), "Unverified nutritional claims must stay off storefront");
  for (const forbidden of ["ingredientsText", "foodCostUsd", "packagingCostUsd", "baseCogsUsd", "estimatedGrossProfitUsd"]) {
    assert.ok(!(forbidden in product), "Secret HQ data leaked into public menu: " + forbidden);
  }
}
assert.deepEqual(catalog.products.find((p) => p.id === "blueberry-oat").containsAllergens, [], "Plant-based oat milk does not establish dairy content");
assert.match(catalog.products.find((p) => p.id === "blueberry-oat").allergenReviewNote, /oat milk/i);
assert.equal(copy.drops.activeProductIds.length, 0);

assert.equal(catalog.categories.length, 11, "Stage 05 must expose all 11 HQ categories");
assert.equal(catalog.products.length, 40, "Catalog count must be 40 HQ products");
assert.equal(catalog.products.filter((item) => item.catalogRole === "primary").length, 40, "Exactly 40 HQ items must be primary");
assert.equal(catalog.products.filter((item) => item.catalogRole === "group_format").length, 0, "Legacy group formats must be removed");
assert.equal(copy.drops.activeProductIds.length, 0, "Legacy drops must be removed");
assert.equal(modifiers.groups.length, 28, "Modifier group count must remain 28");
assert.equal(builder.steps.length, 8, "Build Your Mood must remain an eight-step contract");
assert.equal(bundles.orderNowBoxes.length, 0, "Legacy boxes must be absent");
assert.equal(bundles.cateringPackages.length, 0, "Retired pre-priced catering package records must be absent");

const productIds = new Set(catalog.products.map((item) => item.id));
const categoryIds = new Set(catalog.categories.map((item) => item.id));
assert.equal(productIds.size, catalog.products.length, "Product IDs must be unique");
assert.equal(categoryIds.size, catalog.categories.length, "Category IDs must be unique");

for (const product of catalog.products) {
  assert.ok(categoryIds.has(product.categoryId), `Unknown category for ${product.id}`);
  for (const groupId of product.modifierGroupIds || []) {
    assert.ok(modifiers.groups.some((group) => group.id === groupId), `Unknown modifier group ${groupId} on ${product.id}`);
  }
}

for (const dropId of copy.drops.activeProductIds) assert.ok(productIds.has(dropId), `Unknown drop ${dropId}`);
for (const box of bundles.orderNowBoxes) assert.ok(productIds.has(box.productId), `Unknown box product ${box.productId}`);

for (const asset of media.assets) {
  assert.ok(existsSync(resolve(packageRoot, asset.path)), `Missing media source ${asset.path}`);
  for (const derivative of asset.derivatives || []) assert.ok(existsSync(resolve(packageRoot, derivative)), `Missing media derivative ${derivative}`);
}

const indexHtml = readFileSync(resolve(siteRoot, "index.html"), "utf8");
const appSource = readFileSync(resolve(siteRoot, "app.js"), "utf8");
const viewsSource = readFileSync(resolve(siteRoot, "lib/views.js"), "utf8");
const stylesSource = readFileSync(resolve(siteRoot, "styles.css"), "utf8");

for (const requiredId of ["main-content", "app", "cart-dialog", "account-dialog", "service-dialog", "toast-region"]) {
  assert.ok(indexHtml.includes(`id="${requiredId}"`), `Missing application shell ID ${requiredId}`);
}

for (const route of ["/menu", "/build", "/drops", "/boxes", "/catering", "/rewards", "/location", "/account", "/about", "/checkout", "/order/"]) {
  assert.ok(viewsSource.includes(`"${route}"`), `Missing route ${route}`);
}

assert.ok(stylesSource.includes("prefers-reduced-motion"), "Reduced-motion CSS is required");
assert.ok(stylesSource.includes(":focus-visible"), "Visible keyboard focus is required");
assert.ok(appSource.includes("localStorage"), "Cart and service continuity is required");
assert.ok(viewsSource.includes("data.catalog.categories.length} WAYS IN"), "Category count must be dynamic, not the old twelve");
assert.ok(!viewsSource.includes("12 WAYS IN"), "Old twelve-category claim must not remain");
assert.ok(viewsSource.includes("Potential: "), "Unverified allergens must not be asserted as confirmed");
assert.ok(!viewsSource.includes("Contains ${escapeHtml(titleCase(item))}"), "Product page cannot assert supplier-unverified allergens as confirmed");
assert.ok(viewsSource.includes("Opening hours to be confirmed"), "Unknown opening hours must not be presented as current");
assert.ok(viewsSource.includes("ORDERING PREVIEW"), "Ordering preview boundary must be visible");
assert.ok(appSource.includes("orderingApi"), "Checkout must use the authoritative order API");
assert.ok(appSource.includes("allergenAcknowledged"), "Checkout must require an allergen acknowledgement");
assert.ok(viewsSource.includes("No live card charge will occur yet."), "Preview payment boundary must be visible");
assert.ok(!viewsSource.includes('if (path === "/gift-cards")'), "Gift cards must remain unpublished until issuance, balance and redemption are live");

console.log(JSON.stringify({
  status: "valid",
  categories: catalog.categories.length,
  products: catalog.products.length,
  primaryItems: catalog.products.filter((item) => item.catalogRole === "primary").length,
  groupFormats: catalog.products.filter((item) => item.catalogRole === "group_format").length,
  modifierGroups: modifiers.groups.length,
  builderSteps: builder.steps.length,
  manifestAssets: media.assets.length,
  frontendRoutes: 11
}, null, 2));
