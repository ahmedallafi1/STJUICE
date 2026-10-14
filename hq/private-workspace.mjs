// Local-only HQ archive reader. Confidential financials must NEVER be committed,
// bundled into dist-public, or exposed through a public Vercel endpoint.
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const unavailable = (reason) => ({ available: false, reason, mode: "disabled" });
const isInside = (child, parent) => {
  const rel = relative(parent, child);
  return rel === "" || (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel));
};
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const fail = (message) => { throw new Error(message); };

export function privateWorkspaceAccess(request, env = process.env) {
  if (env.VERCEL || env.NODE_ENV === "production") return unavailable("no_cloud_access");
  if (env.ST_JUICE_HQ_PRIVATE_LOCAL_ENABLED !== "true") return unavailable("opt_in_required");
  const ip = String(request?.socket?.remoteAddress || "");
  const host = String(request?.headers?.host || "").split(":")[0].toLowerCase();
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip)
    || !["localhost", "127.0.0.1"].includes(host)) {
    return unavailable("loopback_only");
  }
  return { available: true, mode: "local_only" };
}

export function loadPrivateHq(filePath = process.env.ST_JUICE_HQ_MASTER_PATH) {
  if (!filePath || !isAbsolute(filePath)) fail("A private absolute HQ master path is required.");
  const resolved = realpathSync(filePath);
  if (isInside(resolved, root)) fail("Confidential HQ master must be outside the GitHub checkout.");
  const details = statSync(resolved);
  if (!details.isFile() || details.size > 25 * 1024 * 1024) fail("Invalid private HQ master.");
  const master = JSON.parse(readFileSync(resolved, "utf8"));
  return validatePrivateHq(master);
}

export function validatePrivateHq(master) {
  const cards = master?.cards;
  const pages = master?.sourcePages ?? master?.pages;
  if (!Array.isArray(cards) || cards.length !== 40) fail("HQ master must include all 40 numbered cards.");
  if (!Array.isArray(pages) || pages.length !== 52 || pages.some((page, index) =>
    Number(page.page ?? page.pdfPage) !== index + 1 || !String(page.text || "").trim()
  )) fail("HQ master must retain all 52 source-page texts.");
  for (const [i, c] of cards.entries()) {
    const n = Number(c.hqNumber);
    const price = Number(c.suggestedPriceUsd);
    const food = Number(c.foodCostUsd);
    const pack = Number(c.packagingCostUsd);
    const base = Number(c.baseCogsUsd);
    const gross = Number(c.estimatedGrossProfitUsd);
    if (n !== i + 1 || !String(c.name || "").trim()
      || !Number.isFinite(price) || price <= 0
      || ![food, pack, base, gross].every((x) => Number.isFinite(x) && x >= 0)
      || Math.abs(food + pack - base) > 0.011
      || Math.abs(price - base - gross) > 0.011
      || !String(c.ingredientsText ?? c.ingredients ?? "").trim()
      || !String(c.methodText ?? c.method ?? "").trim()
      || !String(c.presentationText ?? c.presentation ?? "").trim()) {
      fail("Incomplete or inconsistent HQ card #" + (i + 1) + ".");
    }
  }
  for (const field of ["unitEconomics", "discountExamples10Pct"]) {
    if (master[field] && (!Array.isArray(master[field]) || master[field].length !== 40)) {
      fail("HQ " + field + " must contain 40 source records when present.");
    }
  }
  return master;
}

export function privateHqSummary(master) {
  validatePrivateHq(master);
  const cards = master.cards.map((card) => {
    const price = Number(card.suggestedPriceUsd), base = Number(card.baseCogsUsd);
    const ratio = base / price;
    const discountedRatio = base / (price * 0.9);
    return {
      hqNumber: card.hqNumber,
      name: card.name,
      category: card.category,
      serving: card.serving,
      pdfPage: Number(card.sourcePdfPage ?? card.pdfPage),
      proposalPriceUsd: price,
      proposalBaseCogsUsd: base,
      proposalGrossProfitUsd: round(price - base),
      proposalGrossMarginPct: round((1 - ratio) * 100),
      proposed10PctDiscountGrossProfitUsd: round(price * 0.9 - base),
      modelBaseCogsAbove30Pct: ratio > 0.30000001,
      managerReviewAt10Pct: discountedRatio > 0.45000001,
      approval: card.status ?? { recipe: "unverified", nutrition: "unverified", ownerApproved: false }
    };
  });
  return {
    source: "HQ concept edition 1.2, 30 September 2026",
    pages: 52,
    productCount: cards.length,
    sourcePricesAreProposals: true,
    marginsExcludeOperatingOverhead: true,
    foodModelPrepLossPct: 7,
    manualReviewIfDiscountedCogsExceedsPct: 45,
    flagAbove30Pct: cards.filter((c) => c.modelBaseCogsAbove30Pct).length,
    flagDiscountManagerReview10Pct: cards.filter((c) => c.managerReviewAt10Pct).length,
    ownerApproved: cards.filter((c) => c.approval?.ownerApproved === true).length,
    cards
  };
}

export function privateHqCard(master, n) {
  validatePrivateHq(master);
  if (!Number.isInteger(n) || n < 1 || n > 40) return null;
  const c = master.cards[n - 1];
  return {
    ...c,
    ingredients: c.ingredientsText ?? c.ingredients,
    method: c.methodText ?? c.method,
    presentation: c.presentationText ?? c.presentation,
    sourcePdfPage: c.sourcePdfPage ?? c.pdfPage
  };
}

export function privateHqPage(master, n) {
  validatePrivateHq(master);
  if (!Number.isInteger(n) || n < 1 || n > 52) return null;
  const p = (master.sourcePages ?? master.pages)[n - 1];
  return { page: n, text: p.text };
}
