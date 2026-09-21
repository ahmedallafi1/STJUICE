import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const build = await readFile(new URL("../../scripts/build-static.mjs", import.meta.url), "utf8");
const index = await readFile(new URL("../../site/index.html", import.meta.url), "utf8");
const robots = await readFile(new URL("../../site/robots.txt", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../../site/site.webmanifest", import.meta.url), "utf8"));
const core = await readFile(new URL("../../site/lib/core.js", import.meta.url), "utf8");
const views = await readFile(new URL("../../site/lib/views.js", import.meta.url), "utf8");

assert.match(index, /noindex, nofollow, noarchive/);
assert.match(index, /<base href="\/site\/" \/>/);
assert.match(robots, /Disallow: \/$/m);
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.match(build, /ST_JUICE_ENABLE_INDEXING/);
assert.match(build, /ST_JUICE_PUBLIC_ORIGIN/);
assert.match(build, /sitemap\.xml/);
assert.match(build, /index, follow/);
assert.match(build, /must be an https URL before indexing can be enabled/);
for (const [name, text] of [["index", index], ["core", core], ["views", views]]) {
  assert.ok(!text.includes('href="#/'), `${name} must use clean customer routes instead of hash navigation`);
}

console.log(JSON.stringify({
  status: "valid",
  defaultIndexing: "blocked",
  explicitProductionIndexingGate: true,
  sitemapBuildPath: true,
  httpsOriginRequired: true,
  cleanRoutesRequired: true,
  manifestUsesCleanRoot: true
}, null, 2));
