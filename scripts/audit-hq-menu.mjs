import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const hq = read("../hq/public-product-crosswalk.json");
const web = read("../menu/data/catalog.json");
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sizeNorm = (s) => norm(s).replace(/(\d+)\s+oz\b/g, "$1oz");

assert.equal(hq.meta.productCount, 40, "HQ product count must remain 40");
assert.equal(hq.meta.pageCount, 52, "HQ source must reference all 52 PDF pages");
assert.equal(hq.products.length, 40, "40 HQ product cards are required");
const seen = new Set();
const missingByName = [];
const priceConflicts = [];
const unalignedSizes = [];
const exactNames = [];

hq.products.forEach((item, index) => {
  assert.equal(item.hqNumber, index + 1, "HQ numbering must remain 1-40 and in order");
  assert.equal(item.sourcePdfPage, 4 + Math.floor(index / 2), "Unexpected HQ source page");
  assert.ok(item.name && item.serving && item.hqCategory && item.allergenPrompt);
  assert.ok(Number.isFinite(item.suggestedPriceUsd) && item.suggestedPriceUsd > 0);
  assert.ok(Number.isFinite(item.estimatedKcal) && item.estimatedKcal >= 0);
  assert.equal(item.nutritionStatus, "estimate_unverified");
  assert.equal(item.priceStatus, "working_unapproved");
  assert.equal(item.recipeStatus, "working_unapproved");
  assert.ok(!seen.has(norm(item.name)), "Repeated HQ product name");
  seen.add(norm(item.name));
  const matches = web.products.filter((product) => norm(product.name) === norm(item.name));
  assert.deepEqual(item.exactNameMatches, matches.map((product) => product.id), "Stale HQ crosswalk: " + item.name);
  if (!matches.length) return missingByName.push({ hq: item.hqNumber, name: item.name });
  exactNames.push({ hq: item.hqNumber, name: item.name, id: matches[0].id });
  for (const product of matches) {
    const sameSize = product.sizes.filter((s) => sizeNorm(s.label) === sizeNorm(item.serving));
    if (!sameSize.length) unalignedSizes.push({ name: item.name, hqServing: item.serving, siteSizes: product.sizes.map((s) => s.label) });
    for (const s of sameSize) {
      if (Math.abs(s.price - item.suggestedPriceUsd) > 0.001) {
        priceConflicts.push({ name: item.name, size: s.label, hqPrice: item.suggestedPriceUsd, webPrice: s.price });
      }
    }
  }
});
const summary = {
  status: missingByName.length || priceConflicts.length || unalignedSizes.length ? "requires_owner_reconciliation" : "aligned",
  source: "HQ draft edition 2026-09-30",
  hqProducts: hq.products.length,
  webProducts: web.products.length,
  exactNames,
  missingByName,
  priceConflicts,
  unalignedSizes,
  disclaimer: "Nonmatching names may be related recipes under different names; no automatic mapping, nutrition publication, or price override is permitted."
};
console.log(JSON.stringify(summary, null, 2));
if (process.argv.includes("--strict") && summary.status !== "aligned") process.exitCode = 1;
