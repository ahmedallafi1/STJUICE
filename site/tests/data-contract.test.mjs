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

assert.equal(catalog.categories.length, 12, "Stage 05 must expose all 12 categories");
assert.equal(catalog.products.length, 54, "Catalog count must remain 54");
assert.equal(catalog.products.filter((item) => item.catalogRole === "primary").length, 45, "Primary item count must remain 45");
assert.equal(catalog.products.filter((item) => item.catalogRole === "group_format").length, 9, "Group format count must remain 9");
assert.equal(copy.drops.activeProductIds.length, 2, "Two active drops must remain configured");
assert.equal(modifiers.groups.length, 28, "Modifier group count must remain 28");
assert.equal(builder.steps.length, 8, "Build Your Mood must remain an eight-step contract");
assert.equal(bundles.orderNowBoxes.length, 5, "Five direct-order box formats are required");
assert.equal(bundles.cateringPackages.length, 4, "Four catering starting directions are required");

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

for (const route of ["/menu", "/build", "/drops", "/boxes", "/gift-cards", "/catering", "/rewards", "/location", "/account", "/about", "/states", "/checkout", "/order/"]) {
  assert.ok(viewsSource.includes(`"${route}"`), `Missing route ${route}`);
}

assert.ok(stylesSource.includes("prefers-reduced-motion"), "Reduced-motion CSS is required");
assert.ok(stylesSource.includes(":focus-visible"), "Visible keyboard focus is required");
assert.ok(appSource.includes("localStorage"), "Prototype mode/cart continuity is required");
assert.ok(viewsSource.includes("Concept visual"), "Generated media must remain visibly labeled");
assert.ok(viewsSource.includes("SAFE TEST"), "Ordering safety boundary must be visible");
assert.ok(appSource.includes("orderingApi"), "Checkout must use the authoritative order API");
assert.ok(appSource.includes("allergenAcknowledged"), "Checkout must require an allergen acknowledgement");
assert.ok(viewsSource.includes("No card fields. No live charge."), "Safe test payment boundary must be visible");

console.log(JSON.stringify({
  status: "valid",
  categories: catalog.categories.length,
  products: catalog.products.length,
  primaryItems: catalog.products.filter((item) => item.catalogRole === "primary").length,
  groupFormats: catalog.products.filter((item) => item.catalogRole === "group_format").length,
  modifierGroups: modifiers.groups.length,
  builderSteps: builder.steps.length,
  manifestAssets: media.assets.length,
  frontendRoutes: 13
}, null, 2));
