import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(resolve(here, name), "utf8"));
const fail = (message) => { throw new Error(message); };
const unique = (items, label) => {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) fail(`Duplicate ${label}: ${item}`);
    seen.add(item);
  }
  return seen;
};

const catalog = load("catalog.json");
const modifiers = load("modifiers.json");
const builder = load("build-your-mood.json");
const bundles = load("bundles-catering.json");
const allergenData = load("allergens.json");
const deferred = load("deferred-catalog.json");
const siteCopy = JSON.parse(readFileSync(resolve(here, "../../content/site-copy.json"), "utf8"));

const categoryIds = unique(catalog.categories.map((x) => x.id), "category id");
unique(catalog.categories.map((x) => x.slug), "category slug");
const productIds = unique(catalog.products.map((x) => x.id), "product id");
unique(catalog.products.map((x) => x.slug), "product slug");
const modifierIds = unique(modifiers.groups.map((x) => x.id), "modifier group id");
const allergenIds = unique(allergenData.allergens.map((x) => x.id), "allergen id");
const deferredIds = unique(deferred.items.map((x) => x.id), "deferred item id");

if (catalog.categories.length !== 12) fail(`Expected 12 categories, found ${catalog.categories.length}`);
const primaryCount = catalog.products.filter((x) => x.catalogRole === "primary").length;
const groupCount = catalog.products.filter((x) => x.catalogRole === "group_format").length;
const activeDropCount = catalog.products.filter((x) => x.drop?.status === "active_working").length;
if (primaryCount !== catalog.meta.primaryItemCount) fail(`Primary count mismatch: ${primaryCount}`);
if (groupCount !== catalog.meta.groupFormatCount) fail(`Group-format count mismatch: ${groupCount}`);
if (activeDropCount !== catalog.meta.activeDropCount) fail(`Active-drop count mismatch: ${activeDropCount}`);

if (catalog.recordDefaults.nutrition.status !== "unverified" || catalog.recordDefaults.nutrition.values !== null) {
  fail("Nutrition defaults must remain unverified with null values");
}

for (const product of catalog.products) {
  if (!categoryIds.has(product.categoryId)) fail(`${product.id}: unknown category ${product.categoryId}`);
  if (!product.sizes?.length) fail(`${product.id}: missing sellable size`);
  for (const size of product.sizes) {
    if (!Number.isFinite(size.price) || size.price < 0) fail(`${product.id}/${size.id}: invalid price`);
    if (Math.abs(Math.round(size.price * 100) - size.price * 100) > 1e-8) fail(`${product.id}/${size.id}: price has more than two decimals`);
  }
  for (const ref of product.modifierGroupIds) if (!modifierIds.has(ref)) fail(`${product.id}: unknown modifier ${ref}`);
  for (const ref of [...product.pairingIds, ...product.alternativeIds]) if (!productIds.has(ref)) fail(`${product.id}: unknown product reference ${ref}`);
  for (const ref of product.containsAllergens) if (!allergenIds.has(ref)) fail(`${product.id}: unknown allergen ${ref}`);
  if (product.prepTimeMinutes.min > product.prepTimeMinutes.max) fail(`${product.id}: reversed prep-time range`);
  if (!product.description?.trim()) fail(`${product.id}: missing description`);
}

for (const group of modifiers.groups) {
  for (const ref of group.eligibleProductIds ?? []) if (!productIds.has(ref)) fail(`${group.id}: unknown eligible product ${ref}`);
  if (group.reuseOptionsFrom && !modifierIds.has(group.reuseOptionsFrom)) fail(`${group.id}: unknown reused modifier ${group.reuseOptionsFrom}`);
  for (const option of group.options ?? []) {
    for (const ref of option.allergenAdds ?? []) if (!allergenIds.has(ref)) fail(`${group.id}/${option.id}: unknown allergen ${ref}`);
  }
}

const baseStep = builder.steps.find((x) => x.id === "base");
if (!baseStep || baseStep.options.length !== 8) fail("Build Your Mood must contain eight bases");
if (!builder.steps.some((x) => x.id === "review")) fail("Build Your Mood review step missing");

for (const box of bundles.orderNowBoxes) if (!productIds.has(box.productId)) fail(`Bundle references unknown product ${box.productId}`);
for (const ref of siteCopy.drops.activeProductIds) if (!productIds.has(ref)) fail(`Site copy references unknown drop ${ref}`);
for (const item of deferred.items) {
  if (productIds.has(item.id)) fail(`Deferred item is also live: ${item.id}`);
  if (!categoryIds.has(item.family)) fail(`Deferred item ${item.id} has unknown family ${item.family}`);
}

const categoryCoverage = new Map(catalog.categories.map((x) => [x.id, 0]));
for (const product of catalog.products) categoryCoverage.set(product.categoryId, categoryCoverage.get(product.categoryId) + 1);
for (const [id, count] of categoryCoverage) if (!count) fail(`Category ${id} has no products`);

console.log(JSON.stringify({
  status: "valid",
  categories: catalog.categories.length,
  products: catalog.products.length,
  primaryItems: primaryCount,
  groupFormats: groupCount,
  activeDrops: activeDropCount,
  modifierGroups: modifiers.groups.length,
  deferredItems: deferredIds.size,
  nutrition: catalog.recordDefaults.nutrition.status
}, null, 2));
