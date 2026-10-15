import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sources = {
  catalog: "menu/data/catalog.json",
  modifiers: "menu/data/modifiers.json",
  builder: "menu/data/build-your-mood.json",
  bundles: "menu/data/bundles-catering.json",
  copy: "content/site-copy.json",
  media: "media/manifests/media-manifest.json"
};

const data = Object.fromEntries(Object.entries(sources).map(([key, path]) => [key, JSON.parse(readFileSync(resolve(root, path), "utf8"))]));
// Browser exports include only the forty HQ retail products. Keep obsolete custom
// builders, old modifier references and concept media references out of public JSON.
data.modifiers = { groups: [] };
data.builder = { steps: [] };
data.bundles.orderNowBoxes = [];
data.bundles.cateringPackages = [];
// Client-side metadata is a whitelist; the HQ photo atlas itself is in its own
// public static directory but private HQ recipes and retired product art never ship.
data.media.assets = (data.media.assets || []).filter((asset) => {
  const paths = [asset.path, ...(asset.derivatives || [])].map(String);
  return paths.every((path) => !/\/products\/|\/packaging\/|\/categories\/|\/motion\//.test(path))
    && paths.some((path) => /\/optimized\/webp\/(?:hero|account-modes)\//.test(path));
});
const output = resolve(root, "site/project-data.js");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `// Generated from canonical project JSON. Do not edit by hand.\nexport const projectData = ${JSON.stringify(data)};\n`);
console.log(JSON.stringify({ status: "generated", output: "site/project-data.js", sources: Object.keys(sources).length }));
