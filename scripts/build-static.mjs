import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "dist-public");
if (!output.startsWith(`${root}/`) || output === root) throw new Error("Refusing to clean an unsafe output path.");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const files = [
  "site/index.html", "site/app.js", "site/styles.css", "site/site.webmanifest", "site/robots.txt",
  "content/site-copy.json",
  "menu/data/catalog.json", "menu/data/modifiers.json", "menu/data/build-your-mood.json", "menu/data/bundles-catering.json",
  "media/manifests/media-manifest.json", "media/motion/st-juice-hero-loop.svg", "media/motion/st-juice-hero-loop-fallback.svg"
];
const directories = ["site/lib", "brand/assets", "media/optimized"];

for (const source of files) {
  const target = resolve(output, source);
  mkdirSync(resolve(target, ".."), { recursive: true });
  cpSync(resolve(root, source), target);
}
for (const source of directories) cpSync(resolve(root, source), resolve(output, source), { recursive: true });

function countFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => total + (entry.isDirectory() ? countFiles(resolve(directory, entry.name)) : 1), 0);
}

function totalBytes(directory) {
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const path = resolve(directory, entry.name);
    return total + (entry.isDirectory() ? totalBytes(path) : statSync(path).size);
  }, 0);
}

const publicSources = ["site/index.html", "site/app.js", "site/styles.css", "site/lib/core.js", "site/lib/views.js"];
let referencesChecked = 0;
for (const source of publicSources) {
  const text = readFileSync(resolve(output, source), "utf8");
  for (const match of text.matchAll(/\.\.\/[A-Za-z0-9_./-]+\.(?:json|svg|webp|png|js|css|webmanifest)/g)) {
    const target = resolve(output, "site", match[0]);
    if (!statSync(target).isFile()) throw new Error(`Built asset is missing: ${match[0]} from ${source}`);
    referencesChecked += 1;
  }
}

console.log(JSON.stringify({ status: "built", output: "dist-public", files: countFiles(output), bytes: totalBytes(output), referencesChecked }, null, 2));
