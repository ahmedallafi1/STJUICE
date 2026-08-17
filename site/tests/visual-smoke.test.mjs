import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtimeModules) throw new Error("CODEX_PRIMARY_RUNTIME_NODE_MODULES is required for visual QA");
const { chromium } = await import(pathToFileURL(resolve(runtimeModules, "playwright/index.mjs")));

const baseUrl = process.env.ST_JUICE_BASE_URL || "http://127.0.0.1:4173/site/";
const outputDirectory = resolve(new URL("../qa/screenshots", import.meta.url).pathname);
await mkdir(outputDirectory, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  if (String(error?.message || error).includes("Executable doesn't exist")) {
    console.log(JSON.stringify({ status: "skipped", reason: "Playwright browser binary is not installed in this environment." }, null, 2));
    process.exit(0);
  }
  throw error;
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") pageErrors.push(message.text());
});

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator("#app:not([hidden])").waitFor();
assert.match(await page.locator("h1").first().textContent(), /Your mood, made fresh/i);
await page.screenshot({ path: resolve(outputDirectory, "home-desktop.png"), fullPage: true });

await page.locator('[data-action="open-account"]').first().click();
await page.locator('[data-action="set-mode"][data-mode="student"]').click();
assert.equal(await page.locator("html").getAttribute("data-theme"), "student");
await page.screenshot({ path: resolve(outputDirectory, "home-student-mode.png"), fullPage: false });

await page.goto(`${baseUrl}#/menu`, { waitUntil: "networkidle" });
await page.locator("#menu-search").fill("pistachio");
await page.waitForTimeout(250);
assert.ok(await page.locator(".product-card").count() >= 1, "Pistachio search should return products");
await page.screenshot({ path: resolve(outputDirectory, "menu-filtered-desktop.png"), fullPage: true });

await page.goto(`${baseUrl}#/product/pistachio-saint`, { waitUntil: "networkidle" });
assert.match(await page.locator("h1").first().textContent(), /Pistachio Saint/i);
await page.locator('[data-action="add-product"]').click();
assert.ok(Number(await page.locator("#cart-count").textContent()) >= 1, "Add to bag should update the count");

await page.goto(`${baseUrl}#/build`, { waitUntil: "networkidle" });
await page.locator('[data-builder-option="base"]').first().check();
await page.locator('[data-action="builder-next"]').click();
await page.locator('[data-builder-option="mood"]').first().check();
await page.screenshot({ path: resolve(outputDirectory, "builder-desktop.png"), fullPage: true });

const duplicateIds = await page.evaluate(() => {
  const counts = new Map();
  for (const node of document.querySelectorAll("[id]")) counts.set(node.id, (counts.get(node.id) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1);
});
assert.deepEqual(duplicateIds, [], "Rendered page must not contain duplicate IDs");

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" });
const mobilePage = await mobile.newPage();
mobilePage.on("pageerror", (error) => pageErrors.push(`mobile: ${error.message}`));
await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
await mobilePage.locator("#app:not([hidden])").waitFor();
assert.ok(await mobilePage.locator(".mobile-nav").isVisible(), "Mobile navigation must be visible");
await mobilePage.screenshot({ path: resolve(outputDirectory, "home-mobile.png"), fullPage: true });
await mobilePage.goto(`${baseUrl}#/menu`, { waitUntil: "networkidle" });
assert.ok(await mobilePage.locator(".product-card").count() > 0, "Mobile menu should render products");
await mobilePage.screenshot({ path: resolve(outputDirectory, "menu-mobile.png"), fullPage: true });

await mobile.close();
await context.close();
await browser.close();

assert.deepEqual(pageErrors, [], `Browser errors detected: ${pageErrors.join(" | ")}`);
console.log(JSON.stringify({ status: "valid", screenshots: 6, browserErrors: 0, duplicateIds: 0, desktopWidth: 1440, mobileWidth: 390 }, null, 2));
