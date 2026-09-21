import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const build = await readFile(new URL("../../scripts/build-static.mjs", import.meta.url), "utf8");
const index = await readFile(new URL("../../site/index.html", import.meta.url), "utf8");
const robots = await readFile(new URL("../../site/robots.txt", import.meta.url), "utf8");

assert.match(index, /noindex, nofollow, noarchive/);
assert.match(index, /<base href="\/site\/" \/>/);
assert.match(robots, /Disallow: \/$/m);
assert.match(build, /ST_JUICE_ENABLE_INDEXING/);
assert.match(build, /ST_JUICE_PUBLIC_ORIGIN/);
assert.match(build, /sitemap\.xml/);
assert.match(build, /index, follow/);
assert.match(build, /must be an https URL before indexing can be enabled/);

console.log(JSON.stringify({
  status: "valid",
  defaultIndexing: "blocked",
  explicitProductionIndexingGate: true,
  sitemapBuildPath: true,
  httpsOriginRequired: true
}, null, 2));
