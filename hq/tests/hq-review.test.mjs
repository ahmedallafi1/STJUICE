import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHqMenuReview } from "../public-review.mjs";

const catalog = JSON.parse(readFileSync(new URL("../../menu/data/catalog.json", import.meta.url), "utf8"));
const review = getHqMenuReview(catalog);
assert.equal(review.summary.hqProducts, 40);
assert.equal(review.products.length, 40);
assert.equal(review.status, "requires_owner_approval");
assert.equal(review.summary.nameUnmatched + review.summary.servingMappingRequired + review.summary.priceConflicts + review.summary.aligned, 40);
assert.equal(review.summary.nameUnmatched, 0, "Every HQ name must exist exactly in customer preview");
assert.equal(review.summary.priceConflicts, 0, "HQ suggestion now matches preview price, pending owner approval");
assert.equal(review.summary.servingMappingRequired, 0, "HQ preview portion should match source");
const blue = review.products.find((x) => x.name === "Blue Saint");
assert.equal(blue.suggestedPriceUsd, 8.50);
assert.equal(blue.webProducts[0].sizes.find((x) => x.label === "16 oz").workingPrice, 8.50);
const serialized = JSON.stringify(review);
for (const forbidden of ["foodCostUsd", "packagingCostUsd", "baseCogsUsd", "estimatedGrossProfitUsd", "sourceRawText", "ingredients"]) {
  assert.equal(serialized.includes(forbidden), false, "Private HQ attribute leaked into API: " + forbidden);
}
console.log(JSON.stringify({ status: "passed", ...review.summary }));
