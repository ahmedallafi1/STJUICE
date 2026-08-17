import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage, renderFooter } from "../lib/views.js";

const siteRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(siteRoot, "..");
const read = (path) => readFileSync(resolve(packageRoot, path), "utf8");
const json = (path) => JSON.parse(read(path));
const index = read("site/index.html");
const server = read("ordering/server.mjs");

for (const marker of ["<title>", 'name="description"', 'name="robots"', 'property="og:title"', 'name="twitter:card"', 'rel="manifest"']) {
  assert.ok(index.includes(marker), `index.html must include ${marker}`);
}
assert.ok(index.includes("noindex, nofollow"), "Pre-launch prototype must not be indexed");
assert.ok(existsSync(resolve(siteRoot, "robots.txt")), "robots.txt must exist");
assert.ok(read("site/robots.txt").includes("Disallow: /"), "Pre-launch robots must block indexing");
assert.doesNotThrow(() => json("site/site.webmanifest"), "Web manifest must be valid JSON");

for (const header of ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Cross-Origin-Opener-Policy", "Cross-Origin-Resource-Policy"]) {
  assert.ok(server.includes(`\"${header}\"`), `Server must set ${header}`);
}

const data = {
  catalog: json("menu/data/catalog.json"), modifiers: json("menu/data/modifiers.json"),
  builder: json("menu/data/build-your-mood.json"), bundles: json("menu/data/bundles-catering.json"),
  copy: json("content/site-copy.json"), media: json("media/manifests/media-manifest.json")
};
data.productById = new Map(data.catalog.products.map((item) => [item.id, item]));
data.categoryById = new Map(data.catalog.categories.map((item) => [item.id, item]));
data.modifierById = new Map(data.modifiers.groups.map((item) => [item.id, item]));
const state = { mode: "guest", service: "pickup", cart: [], menuFilters: { query: "", category: "all", mood: "all", occasion: "all", channel: "all" }, productDrafts: {}, builder: { step: 0, selections: { base: null, mood: null, "fruit-flavor": [], texture: null, sauce: [], topping: [], boost: [] }, name: "" }, cateringSuccess: false, cateringEmail: "", checkout: { step: 0, date: "2026-08-17", minDate: "2026-08-17", maxDate: "2026-08-23", slots: [], slot: "", address: {}, contact: {}, promoCode: "", tipPercent: 0, allergenAcknowledged: false, quote: null, preparing: false, busy: false, error: "" }, account: { signedIn: false, favorites: [], savedMixes: [], orderHistory: [] } };
for (const slug of ["privacy", "terms", "refunds", "cookies", "accessibility", "allergens", "contact"]) {
  const html = renderPage({ path: `/info/${slug}`, params: new URLSearchParams() }, { data, state });
  assert.ok(html.includes("Pre-launch draft"), `${slug} must identify draft status`);
  assert.ok(!html.includes("LAUNCH CONTENT PLACEHOLDER"), `${slug} must not be a dead-end placeholder`);
  assert.ok((html.match(/<h2/g) || []).length >= 3, `${slug} must contain substantive sections`);
}
const footer = renderFooter(data);
for (const route of ["allergens", "privacy", "terms", "refunds", "cookies", "accessibility", "contact"]) assert.ok(footer.includes(`#/info/${route}`), `Footer must link ${route}`);

const localRefs = [...index.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map((match) => match[1]).filter((value) => !/^(?:https?:|mailto:|tel:|data:)/.test(value));
for (const ref of localRefs) {
  const target = resolve(siteRoot, ref.split(/[?#]/)[0]);
  assert.ok(existsSync(target), `Local index reference must resolve: ${ref}`);
}

assert.ok(index.includes('href="#main-content"'), "Skip link must target the main landmark");
assert.ok(index.includes('aria-label="Primary navigation"'), "Primary navigation needs a label");
assert.ok(index.includes('aria-live="polite"'), "Dynamic updates need a polite live region");
assert.ok(read("site/styles.css").includes("prefers-reduced-motion"), "Reduced-motion styles must exist");
assert.ok(read("site/styles.css").includes(":focus-visible"), "Visible keyboard focus must exist");

console.log(JSON.stringify({ status: "valid", trustPages: 7, securityHeaders: 7, seoMode: "prelaunch_noindex", localReferencesChecked: localRefs.length }, null, 2));
