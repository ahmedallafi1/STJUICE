// Keep source PDF, all 52 pages of extracted text, recipe quantities and unit economics PRIVATE.
// The GitHub repository is public: never commit hq/private/ or expose this output to client bundles.
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = process.argv[2] && resolve(process.argv[2]);
if (!source) {
  console.error("Usage: node scripts/import-hq-catalog.mjs /absolute/path/St_Juice_HQ_Menu_Catalog.pdf");
  process.exit(2);
}
const signature = readFileSync(source).subarray(0, 4).toString("ascii");
if (signature !== "%PDF") throw new Error("Expected a PDF file.");
let extracted;
try {
  extracted = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", source, "-"], { encoding: "utf8", maxBuffer: 33554432 });
} catch (error) {
  throw new Error("PDF text extraction requires Poppler pdftotext. On macOS: brew install poppler. " + error.message);
}
const pages = extracted.replace(/\r/g, "").split("\f").filter((p) => p.trim());
if (pages.length !== 52) throw new Error("Expected 52 source pages, got " + pages.length);
const names = /(?:^|\n)\s*(\d{2})\s*\/\s*(FRESH JUICE|SIGNATURE FRUIT DRINK|SMOOTHIE|REFRESHER|BOWL|FRUIT & CREAM|MINI PANCAKES|CREPE|WAFFLE|CHOCOLATE|DESSERT|COFFEE|TEA|SAVORY|WELLNESS SHOT)\s*$/gm;
const section = (text, start, end) => {
  const match = text.match(new RegExp(start + "\\s*\\n([\\s\\S]*?)\\n\\s*" + end, "i"));
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
};
const cards = [];
pages.forEach((page, i) => {
  if (i < 3 || i > 22) return;
  const matches = [...page.matchAll(names)];
  matches.forEach((m, j) => {
    const portion = page.slice(m.index, matches[j + 1]?.index || page.length).split(/ST\. JUICE \/ HQ/)[0];
    const lines = portion.split("\n").map((s) => s.trim()).filter(Boolean);
    const parseMoney = (reg) => Number(portion.match(reg)?.[1] ?? NaN);
    const id = Number(m[1]);
    const card = {
      hqNumber: id,
      pdfPage: i + 1,
      category: m[2],
      name: lines[1],
      serving: lines[2]?.split("|")[0]?.trim(),
      suggestedPriceUsd: parseMoney(/Suggested\s*\$([\d.]+)/),
      estimatedKcal: Number(portion.match(/~(\d+)\s*kcal/)?.[1] || NaN),
      foodCostUsd: parseMoney(/Food\s*\$([\d.]+)/),
      packagingCostUsd: parseMoney(/pack\s*\$([\d.]+)/),
      baseCogsUsd: parseMoney(/Base\s*\$([\d.]+)/),
      estimatedGrossProfitUsd: parseMoney(/Est\.\s*gross profit\s*\$([\d.]+)/),
      ingredients: section(portion, "BUILD / ONE ORDER", "METHOD"),
      method: section(portion, "METHOD", "PRESENTATION"),
      presentation: section(portion, "PRESENTATION", "ALLERGEN CHECK"),
      allergenPrompt: portion.split("ALLERGEN CHECK")[1]?.trim().replace(/\s+/g, " ") || null,
      sourceRawText: portion
    };
    if (!card.name || !card.ingredients || !card.method || !card.presentation || !card.allergenPrompt || !Number.isFinite(card.suggestedPriceUsd)) {
      throw new Error("Incomplete card " + id + " on page " + (i + 1));
    }
    cards.push(card);
  });
});
if (cards.length !== 40 || cards.some((c, i) => c.hqNumber !== i + 1)) {
  throw new Error("Expected 40 correctly ordered HQ cards, got " + cards.length);
}
const privateDir = join(root, "hq", "private");
mkdirSync(privateDir, { recursive: true, mode: 0o700 });
const manifest = {
  metadata: {
    source: basename(source),
    edition: "2026-09-30 concept edition 1.2",
    pages: pages.length,
    cards: cards.length,
    approval: "ALL UNVERIFIED: owner, culinary, food-safety and suppliers must approve",
    confidentiality: "internal - never deploy as public static asset"
  },
  cards,
  pages: pages.map((text, i) => ({ pdfPage: i + 1, text }))
};
writeFileSync(join(privateDir, "hq-catalog-full.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
copyFileSync(source, join(privateDir, "hq-catalog-source.pdf"));
console.log(JSON.stringify({ status: "private_import_complete", pages: pages.length, cards: cards.length, destination: "hq/private/", notes: "Contains all source page text and original 52-page PDF including visuals; neither is committed to GitHub." }));
