import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const readJson = (url) => JSON.parse(readFileSync(fileURLToPath(url), "utf8"));
const catalog = readJson(new URL("../../menu/data/catalog.json", import.meta.url));
const copy = readJson(new URL("../../content/site-copy.json", import.meta.url));
const bundles = readJson(new URL("../../menu/data/bundles-catering.json", import.meta.url));
const orderConfig = readJson(new URL("../../ordering/config/order-config.json", import.meta.url));

const productStates = new Map(catalog.products.map((product) => [product.id, {
  productId: product.id,
  status: "available",
  note: "",
  updatedAt: null
}]));

const dropStates = new Map((copy.drops?.activeProductIds || []).map((productId, index) => [productId, {
  productId,
  status: "active",
  position: index + 1,
  startsAt: null,
  endsAt: null,
  updatedAt: null
}]));

const boxStates = new Map((bundles.orderNowBoxes || []).map((box) => [box.productId, {
  productId: box.productId,
  status: "available",
  leadTime: structuredClone(box.leadTime),
  updatedAt: null
}]));

const allowedProductStatus = new Set(["available", "paused", "sold_out"]);
const allowedDropStatus = new Set(["active", "low_availability", "sold_out", "archived", "scheduled"]);
const allowedBoxStatus = new Set(["available", "paused", "sold_out"]);

const fail = (message, code, status = 400) => {
  throw Object.assign(new Error(message), { code, status });
};

function localDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: orderConfig.meta.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function boundaryPassed(value, now, { end = false } = {}) {
  if (!value) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return end ? localDate(now) > value : localDate(now) >= value;
  }
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? now.getTime() >= instant : false;
}

function effectiveDropStatus(row, now = new Date()) {
  if (["sold_out", "archived"].includes(row.status)) return row.status;
  if (row.startsAt && !boundaryPassed(row.startsAt, now)) return "scheduled";
  if (row.endsAt && boundaryPassed(row.endsAt, now, { end: true })) return "archived";
  return row.status === "scheduled" ? "active" : row.status;
}

export function publicCommercialSnapshot() {
  return {
    products: Object.fromEntries([...productStates].map(([id, row]) => [id, { status: row.status }])),
    drops: [...dropStates.values()].map((row) => ({ ...structuredClone(row), status: effectiveDropStatus(row) })),
    boxes: Object.fromEntries([...boxStates].map(([id, row]) => [id, { status: row.status, leadTime: structuredClone(row.leadTime) }])),
    persistence: "memory_only_test"
  };
}

export function adminCommercialSnapshot() {
  return {
    products: [...productStates.values()].map((row) => structuredClone(row)),
    drops: [...dropStates.values()].map((row) => ({ ...structuredClone(row), effectiveStatus: effectiveDropStatus(row) })),
    boxes: [...boxStates.values()].map((row) => structuredClone(row)),
    persistence: "memory_only_test"
  };
}

export function productOperationalStatus(productId) {
  const id = String(productId || "");
  const productStatus = productStates.get(id)?.status || "available";
  if (productStatus !== "available") return productStatus;

  const boxStatus = boxStates.get(id)?.status;
  if (boxStatus && boxStatus !== "available") return boxStatus;

  const drop = dropStates.get(id);
  if (drop) {
    const dropStatus = effectiveDropStatus(drop);
    if (dropStatus === "sold_out") return "sold_out";
    if (!["active", "low_availability"].includes(dropStatus)) return "paused";
  }
  return "available";
}

export function boxOperationalState(productId) {
  return boxStates.get(String(productId || "")) || null;
}

export function adminUpdateProductState(productId, input = {}) {
  const row = productStates.get(String(productId || ""));
  if (!row) fail("Product not found.", "product_not_found", 404);
  const status = String(input.status || "");
  if (!allowedProductStatus.has(status)) fail("Invalid product availability status.", "product_status_invalid", 422);
  row.status = status;
  row.note = String(input.note || "").trim().slice(0, 240);
  row.updatedAt = new Date().toISOString();
  return structuredClone(row);
}

export function adminUpdateDropState(productId, input = {}) {
  const id = String(productId || "");
  const existing = dropStates.get(id);
  if (!existing && !productStates.has(id)) fail("Product not found.", "product_not_found", 404);

  const candidate = existing
    ? structuredClone(existing)
    : { productId: id, status: "scheduled", position: dropStates.size + 1, startsAt: null, endsAt: null, updatedAt: null };

  const status = String(input.status || "");
  if (!allowedDropStatus.has(status)) fail("Invalid drop status.", "drop_status_invalid", 422);
  candidate.status = status;

  if (input.position != null) candidate.position = Math.max(1, Math.trunc(Number(input.position) || 1));

  if (input.startsAt !== undefined) {
    const startsAt = input.startsAt ? String(input.startsAt) : null;
    if (startsAt && !/^\d{4}-\d{2}-\d{2}$/.test(startsAt) && !Number.isFinite(Date.parse(startsAt))) {
      fail("Invalid drop start date.", "drop_start_invalid", 422);
    }
    candidate.startsAt = startsAt;
  }

  if (input.endsAt !== undefined) {
    const endsAt = input.endsAt ? String(input.endsAt) : null;
    if (endsAt && !/^\d{4}-\d{2}-\d{2}$/.test(endsAt) && !Number.isFinite(Date.parse(endsAt))) {
      fail("Invalid drop end date.", "drop_end_invalid", 422);
    }
    candidate.endsAt = endsAt;
  }

  if (candidate.startsAt && candidate.endsAt) {
    const startComparable = /^\d{4}-\d{2}-\d{2}$/.test(candidate.startsAt) ? candidate.startsAt : new Date(candidate.startsAt).toISOString();
    const endComparable = /^\d{4}-\d{2}-\d{2}$/.test(candidate.endsAt) ? candidate.endsAt : new Date(candidate.endsAt).toISOString();
    if (endComparable <= startComparable) fail("Drop end date must be after its start date.", "drop_window_invalid", 422);
  }

  candidate.updatedAt = new Date().toISOString();
  dropStates.set(id, candidate);
  return structuredClone(candidate);
}

export function adminUpdateBoxState(productId, input = {}) {
  const row = boxStates.get(String(productId || ""));
  if (!row) fail("Party box not found.", "box_not_found", 404);
  const status = String(input.status || "");
  if (!allowedBoxStatus.has(status)) fail("Invalid party-box status.", "box_status_invalid", 422);
  row.status = status;
  if (input.leadTime && typeof input.leadTime === "object") {
    const type = String(input.leadTime.type || row.leadTime?.type || "");
    if (!["capacity_based", "scheduled"].includes(type)) fail("Invalid lead-time type.", "box_lead_time_invalid", 422);
    row.leadTime = type === "scheduled"
      ? { type, minimumHours: Math.max(1, Number(input.leadTime.minimumHours || row.leadTime?.minimumHours || 1)) }
      : { type, minimumMinutes: Math.max(1, Number(input.leadTime.minimumMinutes || row.leadTime?.minimumMinutes || 1)) };
  }
  row.updatedAt = new Date().toISOString();
  return structuredClone(row);
}

export function requiredLeadMinutesForItems(items = [], service = "pickup") {
  let lead = service === "delivery" ? 60 : service === "dine_in" ? 15 : 30;
  for (const item of items) {
    const box = boxStates.get(item.productId);
    if (!box || box.status !== "available") continue;
    const candidate = box.leadTime?.type === "scheduled"
      ? Number(box.leadTime.minimumHours || 0) * 60
      : Number(box.leadTime?.minimumMinutes || 0);
    lead = Math.max(lead, candidate);
  }
  return lead;
}
