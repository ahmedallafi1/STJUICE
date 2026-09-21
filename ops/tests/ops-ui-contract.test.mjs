import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

for (const marker of ["ST. JUICE Operations", "noindex,nofollow,noarchive", 'id="login-form"', 'id="console"', 'data-tab="catalog"', 'data-tab="launch"']) {
  assert.ok(html.includes(marker), `Operations HTML missing ${marker}`);
}
for (const marker of ["api(\"commercial\")", "api(\"rewards\")", "data-product-state-form", "data-drop-state-form", "data-box-state-form", "data-benefits-policy-form", "commercial/products/", "commercial/drops/", "commercial/boxes/", "low_availability", "Recent staff actions", "Launch"]) {
  assert.ok(app.toLowerCase().includes(marker.toLowerCase()), `Operations app missing ${marker}`);
}
assert.match(app, /sessionStorage\.setItem\("stjuice-ops-token"/);
assert.doesNotMatch(app, /localStorage\.setItem\([^\n]*ops-token/i, "Operations token must not persist in localStorage");
assert.match(styles, /@media \(max-width: 620px\)/);

console.log(JSON.stringify({
  status: "valid",
  consoleNoindex: true,
  commercialControls: true,
  launchControl: true,
  tokenSessionOnly: true,
  responsive: true
}, null, 2));
