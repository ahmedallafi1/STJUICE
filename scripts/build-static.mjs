import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import "./generate-browser-data.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "dist-public");
if (!output.startsWith(`${root}/`) || output === root) throw new Error("Refusing to clean an unsafe output path.");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const files = [
  "site/index.html", "site/app.js", "site/project-data.js", "site/styles.css", "site/site.webmanifest", "site/robots.txt",
  "content/site-copy.json",
  "menu/data/catalog.json", "menu/data/modifiers.json", "menu/data/build-your-mood.json", "menu/data/bundles-catering.json",
  "media/manifests/media-manifest.json", "media/motion/st-juice-hero-loop.svg", "media/motion/st-juice-hero-loop-fallback.svg"
];
const directories = ["site/lib", "brand/assets", "media/optimized", "ops"];

for (const source of files) {
  const target = resolve(output, source);
  mkdirSync(resolve(target, ".."), { recursive: true });
  cpSync(resolve(root, source), target);
}
for (const source of directories) cpSync(resolve(root, source), resolve(output, source), { recursive: true });
// Keep a root copy for the conservative public-reference audit; the browser uses /site/project-data.js.
cpSync(resolve(root, "site/project-data.js"), resolve(output, "project-data.js"));
// robots.txt must exist at the domain root as well as under /site/.
cpSync(resolve(root, "site/robots.txt"), resolve(output, "robots.txt"));

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

const publicOrigin = String(process.env.ST_JUICE_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
const indexingEnabled = process.env.ST_JUICE_ENABLE_INDEXING === "true";
if (indexingEnabled && !/^https:\/\//.test(publicOrigin)) {
  throw new Error("ST_JUICE_PUBLIC_ORIGIN must be an https URL before indexing can be enabled.");
}

let sitemapGenerated = false;
if (indexingEnabled) {
  const catalog = JSON.parse(readFileSync(resolve(root, "menu/data/catalog.json"), "utf8"));
  const routes = [
    "/", "/menu", "/drops", "/build", "/boxes", "/catering", "/rewards", "/location", "/about",
    ...catalog.products.map((product) => `/product/${encodeURIComponent(product.id)}`)
  ];
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((route) => `  <url><loc>${publicOrigin}${route}</loc></url>`),
    '</urlset>',
    ''
  ].join("\n");
  writeFileSync(resolve(output, "sitemap.xml"), sitemap);

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${publicOrigin}/sitemap.xml\n`;
  writeFileSync(resolve(output, "site/robots.txt"), robots);
  writeFileSync(resolve(output, "robots.txt"), robots);

  const indexPath = resolve(output, "site/index.html");
  let indexHtml = readFileSync(indexPath, "utf8");
  indexHtml = indexHtml.replace(
    '<meta name="robots" content="noindex, nofollow, noarchive" />',
    '<meta name="robots" content="index, follow" />'
  );
  indexHtml = indexHtml.replace(
    '<meta property="og:site_name" content="ST. JUICE" />',
    `<meta property="og:site_name" content="ST. JUICE" />\n    <meta property="og:url" content="${publicOrigin}/" />\n    <link rel="canonical" href="${publicOrigin}/" data-stj-canonical />`
  );
  writeFileSync(indexPath, indexHtml);
  sitemapGenerated = true;
}

console.log(JSON.stringify({
  status: "built",
  output: "dist-public",
  files: countFiles(output),
  bytes: totalBytes(output),
  referencesChecked,
  indexingEnabled,
  sitemapGenerated
}, null, 2));
