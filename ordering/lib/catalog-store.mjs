import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const readJson = (url) => JSON.parse(readFileSync(fileURLToPath(url), "utf8"));

export const catalog = readJson(new URL("../../menu/data/catalog.json", import.meta.url));
export const modifiers = readJson(new URL("../../menu/data/modifiers.json", import.meta.url));
export const builder = readJson(new URL("../../menu/data/build-your-mood.json", import.meta.url));
export const allergens = readJson(new URL("../../menu/data/allergens.json", import.meta.url));
export const config = readJson(new URL("../config/order-config.json", import.meta.url));

export const productById = new Map(catalog.products.map((item) => [item.id, item]));
export const modifierById = new Map(modifiers.groups.map((item) => [item.id, item]));
export const builderStepById = new Map(builder.steps.map((item) => [item.id, item]));

export function builderOptions(step) {
  if (step.options) return step.options;
  const groupId = step.reuseOptionsFrom?.split("#")[1];
  return modifierById.get(groupId)?.options || [];
}
