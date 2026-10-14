import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../../ordering/server.mjs";
import hq from "../../hq/public-product-crosswalk.json" with { type: "json" };

process.env.STJ_TEST_ADMIN_TOKEN = "commercial-control-test";
const server = await startOrderingServer({ port: 0 });
const base = "http://127.0.0.1:" + server.address().port;
const adminHeaders = { "X-STJ-Admin-Token": process.env.STJ_TEST_ADMIN_TOKEN };

async function json(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}
const hqIds = new Set(hq.products.map((p) =>
  p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
));
const quoteFor = (productId) => json("/api/cart/validate", {
  method: "POST",
  body: JSON.stringify({ service: "pickup", items: [
    { kind: "catalog", productId, sizeId: "16oz", quantity: 1, modifierSelections: {} }
  ], promoCode: "", tipPercent: 0 })
});

try {
  const initial = await json("/api/admin/commercial", { headers: adminHeaders });
  assert.equal(initial.response.status, 200);
  assert.equal(initial.payload.products.length, 40);
  assert.deepEqual(new Set(initial.payload.products.map((row) => row.productId)), hqIds);
  assert.deepEqual(initial.payload.boxes, []);
  assert.ok(initial.payload.products.some((row) => row.productId === "blue-saint" && row.status === "available"));

  const soldOut = await json("/api/admin/commercial/products/blue-saint", {
    method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "sold_out" })
  });
  assert.equal(soldOut.response.status, 200);
  const blocked = await quoteFor("blue-saint");
  assert.equal(blocked.response.status, 422);
  assert.ok(blocked.payload.errors.some((row) => row.code === "product_sold_out"));
  await json("/api/admin/commercial/products/blue-saint", {
    method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "available" })
  });
  assert.equal((await quoteFor("blue-saint")).response.status, 200);

  const removed = await quoteFor("pistachio-saint");
  assert.equal(removed.response.status, 422);
  assert.ok(removed.payload.errors.some((row) => row.code === "product_not_found"));

  const scheduled = await json("/api/admin/commercial/drops/mango-passion", {
    method: "PATCH", headers: adminHeaders,
    body: JSON.stringify({ status: "scheduled", startsAt: "2999-01-01", endsAt: "2999-01-31" })
  });
  assert.equal(scheduled.response.status, 200);
  const publicState = await json("/api/catalog-status");
  assert.equal(publicState.response.status, 200);
  assert.ok(publicState.payload.drops.some((row) => row.productId === "mango-passion" && row.status === "scheduled"));

  const invalidWindow = await json("/api/admin/commercial/drops/mango-passion", {
    method: "PATCH", headers: adminHeaders,
    body: JSON.stringify({ status: "scheduled", startsAt: "2999-02-01", endsAt: "2999-01-01" })
  });
  assert.equal(invalidWindow.response.status, 422);
  assert.equal(invalidWindow.payload.error.code, "drop_window_invalid");

  const archived = await json("/api/admin/commercial/drops/mango-passion", {
    method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "archived" })
  });
  assert.equal(archived.response.status, 200);
  const archivedQuote = await quoteFor("mango-passion");
  assert.equal(archivedQuote.response.status, 422);
  assert.ok(archivedQuote.payload.errors.some((row) => row.code === "product_paused"));

  const publicAfter = await json("/api/catalog-status");
  assert.equal(publicAfter.payload.products["blue-saint"].status, "available");
  assert.equal(Object.keys(publicAfter.payload.boxes || {}).length, 0);
  const audit = await json("/api/admin/audit", { headers: adminHeaders });
  for (const event of ["catalog.product_status_changed", "catalog.drop_status_changed"]) {
    assert.ok(audit.payload.events.some((row) => row.eventType === event));
  }
  console.log(JSON.stringify({ status:"valid",hqOnly40:true,oldProductsRejected:true,
    soldOutBlockedServerSide:true,dropLifecycleControlled:true,unlistedBoxesRemoved:true }));
} finally {
  server.close();
  await once(server, "close");
}
