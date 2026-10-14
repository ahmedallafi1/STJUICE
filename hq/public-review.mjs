import { readFileSync } from "node:fs";
const hq = JSON.parse(readFileSync(new URL("./public-product-crosswalk.json", import.meta.url), "utf8"));
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normSize = (s) => norm(s).replace(/(\d+)\s+oz\b/g, "$1oz");

// Read-only, public-safe review data. Confidential private PDF, food costs and recipe
// weights must never be loaded by the preview operations or customer APIs.
export function getHqMenuReview(catalog) {
  const products = hq.products.map((item) => {
    const matched = catalog.products.filter((product) => norm(product.name) === norm(item.name));
    const webProducts = matched.map((product) => ({
      id: product.id,
      name: product.name,
      sizes: product.sizes.map((s) => ({ label: s.label, workingPrice: s.price }))
    }));
    const comparable = webProducts.flatMap((product) => product.sizes.filter((s) => normSize(s.label) === normSize(item.serving)));
    const differences = comparable.filter((s) => Math.abs(s.workingPrice - item.suggestedPriceUsd) >= 0.001);
    const reviewStatus = !matched.length ? "name_unmatched"
      : !comparable.length ? "serving_requires_mapping"
      : differences.length ? "price_conflict" : "name_size_price_aligned";
    return {
      hqNumber: item.hqNumber,
      pdfPage: item.sourcePdfPage,
      hqCategory: item.hqCategory,
      name: item.name,
      serving: item.serving,
      suggestedPriceUsd: item.suggestedPriceUsd,
      estimatedKcalUnverified: item.estimatedKcal,
      allergenPromptUnverified: item.allergenPrompt,
      reviewStatus,
      webProducts
    };
  });
  return {
    source: hq.meta.origin,
    edition: hq.meta.edition,
    status: "requires_owner_approval",
    publicSafeguard: "Internal cost, supplier and recipe-detail data excluded. Nutrition and allergens are NOT verified or published.",
    summary: {
      hqProducts: products.length,
      siteProducts: catalog.products.length,
      nameUnmatched: products.filter((p) => p.reviewStatus === "name_unmatched").length,
      servingMappingRequired: products.filter((p) => p.reviewStatus === "serving_requires_mapping").length,
      priceConflicts: products.filter((p) => p.reviewStatus === "price_conflict").length,
      aligned: products.filter((p) => p.reviewStatus === "name_size_price_aligned").length
    },
    products
  };
}
