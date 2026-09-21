import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../../ordering/server.mjs";

process.env.STJ_TEST_ADMIN_TOKEN = "commercial-control-test";
const server = await startOrderingServer({ port: 0 });
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const adminHeaders = { "X-STJ-Admin-Token": process.env.STJ_TEST_ADMIN_TOKEN };

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

try {
  const initial = await json("/api/admin/commercial", { headers: adminHeaders });
  assert.equal(initial.response.status, 200);
  assert.ok(initial.payload.products.some((row) => row.productId === "pistachio-saint" && row.status === "available"));

  const soldOut = await json("/api/admin/commercial/products/pistachio-saint", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "sold_out" })
  });
  assert.equal(soldOut.response.status, 200);

  const soldOutQuote = await json("/api/cart/validate", {
    method: "POST",
    body: JSON.stringify({
      service: "pickup",
      items: [{ kind: "catalog", productId: "pistachio-saint", sizeId: "16oz", quantity: 1, modifierSelections: {} }],
      promoCode: "",
      tipPercent: 0
    })
  });
  assert.equal(soldOutQuote.response.status, 422);
  assert.ok(soldOutQuote.payload.errors.some((row) => row.code === "product_sold_out"));

  await json("/api/admin/commercial/products/pistachio-saint", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "available" })
  });

  const boxControl = await json("/api/admin/commercial/boxes/study-night-box", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "available", leadTime: { type: "scheduled", minimumHours: 4 } })
  });
  assert.equal(boxControl.response.status, 200);

  const boxQuote = await json("/api/cart/validate", {
    method: "POST",
    body: JSON.stringify({
      service: "pickup",
      items: [{
        kind: "catalog",
        productId: "study-night-box",
        sizeId: "serves-2-3",
        quantity: 1,
        modifierSelections: {
          "study-box-drinks": ["lemon-mint", "blue-rush"],
          "box-sauces": ["milk-chocolate"],
          "box-toppings": ["cookie-crumb"]
        }
      }],
      promoCode: "",
      tipPercent: 0
    })
  });
  assert.equal(boxQuote.response.status, 200, JSON.stringify(boxQuote.payload));
  assert.equal(boxQuote.payload.fulfillment.requiredLeadMinutes, 240);

  const boxSoldOut = await json("/api/admin/commercial/boxes/study-night-box", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "sold_out" })
  });
  assert.equal(boxSoldOut.response.status, 200);
  const boxSoldOutQuote = await json("/api/cart/validate", {
    method: "POST",
    body: JSON.stringify({
      service: "pickup",
      items: [{
        kind: "catalog",
        productId: "study-night-box",
        sizeId: "serves-2-3",
        quantity: 1,
        modifierSelections: {
          "study-box-drinks": ["lemon-mint", "blue-rush"],
          "box-sauces": ["milk-chocolate"],
          "box-toppings": ["cookie-crumb"]
        }
      }],
      promoCode: "",
      tipPercent: 0
    })
  });
  assert.equal(boxSoldOutQuote.response.status, 422);
  assert.ok(boxSoldOutQuote.payload.errors.some((row) => row.code === "product_sold_out"));
  await json("/api/admin/commercial/boxes/study-night-box", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "available", leadTime: { type: "scheduled", minimumHours: 4 } })
  });

  const scheduled = await json("/api/admin/commercial/drops/dragon-cloud-cup", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "scheduled", startsAt: "2999-01-01", endsAt: "2999-01-31" })
  });
  assert.equal(scheduled.response.status, 200);
  const scheduledPublic = await json("/api/catalog-status");
  assert.ok(scheduledPublic.payload.drops.some((row) => row.productId === "dragon-cloud-cup" && row.status === "scheduled"));

  const invalidWindow = await json("/api/admin/commercial/drops/dragon-cloud-cup", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "scheduled", startsAt: "2999-02-01", endsAt: "2999-01-01" })
  });
  assert.equal(invalidWindow.response.status, 422);
  assert.equal(invalidWindow.payload.error.code, "drop_window_invalid");

  const archived = await json("/api/admin/commercial/drops/dragon-cloud-cup", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "archived" })
  });
  assert.equal(archived.response.status, 200);

  const archivedQuote = await json("/api/cart/validate", {
    method: "POST",
    body: JSON.stringify({
      service: "pickup",
      items: [{
        kind: "catalog",
        productId: "dragon-cloud-cup",
        sizeId: "standard",
        quantity: 1,
        modifierSelections: {}
      }],
      promoCode: "",
      tipPercent: 0
    })
  });
  assert.equal(archivedQuote.response.status, 422);
  assert.ok(archivedQuote.payload.errors.some((row) => row.code === "product_paused"));

  const publicState = await json("/api/catalog-status");
  assert.equal(publicState.response.status, 200);
  assert.equal(publicState.payload.products["pistachio-saint"].status, "available");
  assert.equal(publicState.payload.boxes["study-night-box"].leadTime.minimumHours, 4);
  assert.ok(publicState.payload.drops.some((row) => row.productId === "dragon-cloud-cup" && row.status === "archived"));

  const audit = await json("/api/admin/audit", { headers: adminHeaders });
  for (const event of ["catalog.product_status_changed", "catalog.drop_status_changed", "catalog.box_status_changed"]) {
    assert.ok(audit.payload.events.some((row) => row.eventType === event), `Missing audit event: ${event}`);
  }

  console.log(JSON.stringify({
    status: "valid",
    soldOutBlockedServerSide: true,
    partyBoxLeadTimeEnforced: true,
    partyBoxSoldOutBlockedServerSide: true,
    dropLifecycleControlled: true,
    dropPublishWindowControlled: true,
    archivedDropBlockedServerSide: true,
    publicCommercialStateAvailable: true
  }, null, 2));
} finally {
  server.close();
  await once(server, "close");
}
