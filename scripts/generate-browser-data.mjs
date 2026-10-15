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
const output = resolve(root, "site/project-data.js");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `// Generated from canonical project JSON. Do not edit by hand.\nexport const projectData = ${JSON.stringify(data)};\n`);
console.log(JSON.stringify({ status: "generated", output: "site/project-data.js", sources: Object.keys(sources).length }));
