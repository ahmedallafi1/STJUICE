import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { config } from "./lib/catalog-store.mjs";
import { generateSlots, quoteCart, validateDeliveryAddress } from "./lib/order-engine.mjs";
import { consumeTestPayment, createTestPaymentIntent, verifyTestPayment } from "./adapters/test-payment-adapter.mjs";
import { sendToTestPos } from "./adapters/test-pos-adapter.mjs";
import { attachOrder, handleAccountApi } from "../accounts/account-api.mjs";
import { sessionForRequest } from "../accounts/lib/account-store.mjs";
import { getLaunchReadiness } from "../launch/lib/readiness.mjs";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const quotes = new Map();
const orders = new Map();
const idempotency = new Map();
const deliveryChecks = new Map();
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4" };

function headers(type = "application/json; charset=utf-8") {
  return {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  };
}

function json(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, { ...headers(), ...extraHeaders });
  response.end(JSON.stringify(payload));
}

async function bodyJson(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === "string") {
    try { return JSON.parse(request.body); }
    catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400, code: "invalid_json" }); }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw Object.assign(new Error("Request body is too large."), { status: 413, code: "body_too_large" });
    chunks.push(chunk);
  }
  try { return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400, code: "invalid_json" }); }
}

function hasCardData(value) {
  if (!value || typeof value !== "object") return false;
  const forbidden = /^(card(number)?|pan|cvv|cvc|securitycode|expiry|expiration|expmonth|expyear)$/i;
  return Object.entries(value).some(([key, child]) => forbidden.test(key.replaceAll(/[_\s-]/g, "")) || hasCardData(child));
}

function publicConfig() {
  return {
    mode: config.meta.mode,
    currency: config.meta.currency,
    timezone: config.meta.timezone,
    location: config.location,
    fulfillment: config.fulfillment,
    pricing: config.pricing,
    payments: { adapter: config.payments.adapter, acceptsRawCardData: false, testButtonLabel: config.payments.testButtonLabel },
    orders: { storage: config.orders.storage, statuses: config.orders.statuses }
  };
}

function quoteRecord(request) {
  const quote = quoteCart(request);
  const now = Date.now();
  const record = {
    ...quote,
    quoteId: `quote_${randomUUID()}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.orders.quoteMinutes * 60_000).toISOString()
  };
  if (record.valid) quotes.set(record.quoteId, record);
  return record;
}

function activeQuote(id) {
  const quote = quotes.get(String(id || ""));
  if (!quote) return { error: { code: "quote_not_found", message: "Validate the cart again before paying." } };
  if (Date.parse(quote.expiresAt) <= Date.now()) return { error: { code: "quote_expired", message: "This quote expired. Refresh the checkout totals." } };
  return { quote };
}

function validCustomer(customer = {}) {
  const errors = [];
  const name = String(customer.name || "").trim().slice(0, 100);
  const email = String(customer.email || "").trim().slice(0, 200);
  const phone = String(customer.phone || "").trim().slice(0, 40);
  if (name.length < 2) errors.push({ code: "customer_name_required", field: "name", message: "Enter the guest name." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ code: "customer_email_invalid", field: "email", message: "Enter a valid email." });
  if (phone.replace(/\D/g, "").length < 7) errors.push({ code: "customer_phone_invalid", field: "phone", message: "Enter a valid phone number." });
  return { valid: !errors.length, errors, customer: { name, email, phone, marketingConsent: customer.marketingConsent === true } };
}

function maskEmail(value) {
  const [name = "", domain = ""] = String(value).split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

function publicOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusHistory: order.statusHistory,
    service: order.service,
    schedule: order.schedule,
    payment: { method: order.payment.method, status: order.payment.status },
    customer: { name: order.customer.name, email: maskEmail(order.customer.email), phone: `***${order.customer.phone.replace(/\D/g, "").slice(-4)}` },
    items: order.items,
    totals: order.totals,
    mode: order.mode,
    location: config.location,
    pos: order.pos,
    createdAt: order.createdAt,
    notices: ["Safe test order only. No live payment or live POS transaction occurred.", "Orders are stored in memory and reset when the server restarts."]
  };
}

function scheduleValid(service, schedule) {
  if (schedule === "asap") return ["pickup", "delivery", "dine_in"].includes(service);
  const value = String(schedule || "");
  const date = value.slice(0, 10);
  const result = generateSlots(service, date);
  return result.valid && result.slots.some((slot) => slot.value === value);
}

async function api(request, response, url) {
  if (await handleAccountApi({ request, response, url, json, bodyJson, getOrder: (id) => orders.get(id), publicOrder })) return;
  if (request.method === "GET" && url.pathname === "/api/health") return json(response, 200, { ok: true, mode: config.meta.mode, payment: "token_only_test", storage: config.orders.storage, accounts: "memory_only_test" });
  if (request.method === "GET" && url.pathname === "/api/launch-readiness") return json(response, 200, getLaunchReadiness());
  if (request.method === "GET" && url.pathname === "/api/config") return json(response, 200, publicConfig());
  if (request.method === "GET" && url.pathname === "/api/slots") {
    const result = generateSlots(url.searchParams.get("service"), url.searchParams.get("date"));
    return json(response, result.valid ? 200 : 400, result);
  }
  if (request.method === "POST" && url.pathname === "/api/delivery/validate") {
    const input = await bodyJson(request);
    const result = validateDeliveryAddress(input.address);
    if (!result.valid) return json(response, 422, result);
    const deliveryCheckToken = `delivery_test_${randomUUID()}`;
    const record = { ...result, deliveryCheckToken, createdAt: new Date().toISOString() };
    deliveryChecks.set(deliveryCheckToken, record);
    return json(response, 200, record);
  }
  if (request.method === "POST" && (url.pathname === "/api/cart/validate" || url.pathname === "/api/promos/validate")) {
    const input = await bodyJson(request);
    const quote = quoteRecord(input);
    return json(response, quote.valid ? 200 : 422, quote);
  }
  if (request.method === "POST" && url.pathname === "/api/payment/intents") {
    const input = await bodyJson(request);
    if (hasCardData(input)) return json(response, 400, { error: { code: "raw_card_data_rejected", message: "Raw card details are never accepted by this server." } });
    const resolved = activeQuote(input.quoteId);
    if (resolved.error) return json(response, 409, resolved);
    return json(response, 201, createTestPaymentIntent({ quoteId: resolved.quote.quoteId, amount: resolved.quote.totals.total.cents, currency: config.meta.currency }));
  }
  if (request.method === "POST" && url.pathname === "/api/orders") {
    const input = await bodyJson(request);
    if (hasCardData(input)) return json(response, 400, { error: { code: "raw_card_data_rejected", message: "Submit only a provider token—never card numbers or security codes." } });
    const key = String(request.headers["idempotency-key"] || input.idempotencyKey || "").trim();
    if (!key || key.length > 200) return json(response, 400, { error: { code: "idempotency_required", message: "A valid idempotency key is required." } });
    const existing = idempotency.get(key);
    if (existing && existing.expiresAt > Date.now()) return json(response, 200, { idempotentReplay: true, order: publicOrder(orders.get(existing.orderId)) });
    const resolved = activeQuote(input.quoteId);
    if (resolved.error) return json(response, 409, resolved);
    const quote = resolved.quote;
    const customerResult = validCustomer(input.customer);
    if (!customerResult.valid) return json(response, 422, { valid: false, errors: customerResult.errors });
    if (input.allergenAcknowledged !== true) return json(response, 422, { valid: false, errors: [{ code: "allergen_acknowledgement_required", field: "allergenAcknowledged", message: "Review and acknowledge the allergen notice." }] });
    if (!scheduleValid(quote.service, input.schedule)) return json(response, 422, { valid: false, errors: [{ code: "schedule_invalid", field: "schedule", message: "Choose an available service time." }] });
    if (quote.service === "delivery" && !deliveryChecks.has(input.deliveryCheckToken)) return json(response, 422, { valid: false, errors: [{ code: "delivery_check_required", message: "Validate the delivery address first." }] });
    const paymentMethod = input.paymentMethod === "cash" ? "cash" : "card";
    if (quote.service === "delivery" && paymentMethod === "cash") return json(response, 422, { valid: false, errors: [{ code: "cash_not_available_for_delivery", field: "paymentMethod", message: "Cash is not available for delivery orders." }] });
    const payment = paymentMethod === "cash" ? null : verifyTestPayment({ token: input.paymentToken, quoteId: quote.quoteId, amount: quote.totals.total.cents });
    if (payment && !payment.valid) return json(response, 402, { error: { code: payment.code, message: "The safe test payment could not be verified." } });

    const createdAt = new Date().toISOString();
    const id = `order_${randomUUID()}`;
    const order = {
      id,
      orderNumber: `STJ-${String(orders.size + 1).padStart(4, "0")}`,
      status: "received",
      statusHistory: [{ status: "received", at: createdAt }],
      service: quote.service,
      schedule: input.schedule,
      customer: customerResult.customer,
      delivery: quote.service === "delivery" ? deliveryChecks.get(input.deliveryCheckToken) : null,
      items: quote.items,
      totals: quote.totals,
      quoteId: quote.quoteId,
      payment: paymentMethod === "cash"
        ? { method: "cash", provider: "pay_at_handoff", status: "due_at_handoff" }
        : { method: "card", provider: payment.intent.provider, status: "captured_test", tokenLast8: payment.intent.token.slice(-8) },
      mode: config.meta.mode,
      createdAt
    };
    const signedIn = sessionForRequest(request);
    if (signedIn) order.accountId = signedIn.account.id;
    order.pos = sendToTestPos(order);
    orders.set(id, order);
    if (order.accountId) attachOrder(order.accountId, id);
    if (paymentMethod === "card") consumeTestPayment(input.paymentToken);
    idempotency.set(key, { orderId: id, expiresAt: Date.now() + config.orders.idempotencyMinutes * 60_000 });
    return json(response, 201, { idempotentReplay: false, order: publicOrder(order) });
  }

  const match = url.pathname.match(/^\/api\/orders\/([^/]+)(?:\/(advance))?$/);
  if (match && request.method === "GET" && !match[2]) {
    const order = orders.get(decodeURIComponent(match[1]));
    return order ? json(response, 200, { order: publicOrder(order) }) : json(response, 404, { error: { code: "order_not_found", message: "Test order not found." } });
  }
  if (match && request.method === "POST" && match[2] === "advance") {
    const order = orders.get(decodeURIComponent(match[1]));
    if (!order) return json(response, 404, { error: { code: "order_not_found", message: "Test order not found." } });
    const flow = order.service === "delivery" ? ["received", "confirmed", "in_preparation", "out_for_delivery", "complete"] : ["received", "confirmed", "in_preparation", "ready_for_pickup", "complete"];
    const next = flow[Math.min(flow.length - 1, flow.indexOf(order.status) + 1)];
    if (next !== order.status) {
      order.status = next;
      order.statusHistory.push({ status: next, at: new Date().toISOString() });
    }
    return json(response, 200, { order: publicOrder(order) });
  }
  return json(response, 404, { error: { code: "api_not_found", message: "API route not found." } });
}

function staticFile(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return json(response, 405, { error: { code: "method_not_allowed", message: "Method not allowed." } });
  if (url.pathname === "/") { response.writeHead(302, { Location: "/site/" }); return response.end(); }
  const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  let path = resolve(packageRoot, requested);
  if (path !== packageRoot && !path.startsWith(`${packageRoot}${sep}`)) return json(response, 403, { error: { code: "forbidden", message: "Forbidden path." } });
  if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, "index.html");
  if (!existsSync(path) || !statSync(path).isFile()) return json(response, 404, { error: { code: "file_not_found", message: "File not found." } });
  response.writeHead(200, { ...headers(mime[extname(path)] || "application/octet-stream"), "Cache-Control": "public, max-age=60" });
  if (request.method === "HEAD") return response.end();
  createReadStream(path).pipe(response);
}

export function createOrderingServer() {
  return createServer(handleNodeRequest);
}

export async function handleNodeRequest(request, response) {
  try {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname.startsWith("/api/")) await api(request, response, url);
    else staticFile(request, response, url);
  } catch (error) {
    json(response, error.status || 500, { error: { code: error.code || "server_error", message: error.status ? error.message : "The safe test server could not complete the request." } });
  }
}

export async function startOrderingServer({ port = Number(process.env.PORT || 4173), host = process.env.HOST || "127.0.0.1" } = {}) {
  const server = createOrderingServer();
  await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(port, host, resolveListen); });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startOrderingServer();
  const address = server.address();
  console.log(`ST. JUICE Stage 09 launch-candidate server: http://127.0.0.1:${address.port}/site/`);
}
