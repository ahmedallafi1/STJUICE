import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { config } from "./lib/catalog-store.mjs";
import { generateSlots, quoteCart, validateDeliveryAddress } from "./lib/order-engine.mjs";
import { consumePayment, createPaymentIntent, verifyPayment } from "./adapters/payment-adapter.mjs";
import { sendToPos } from "./adapters/pos-adapter.mjs";
import { attachOrder, handleAccountApi } from "../accounts/account-api.mjs";
import { creditCompletedOrder, sessionForRequest } from "../accounts/lib/account-store.mjs";
import { availableRewardGrant, benefitSnapshot, benefitsConfig, consumeRewardGrant } from "../accounts/lib/benefits-engine.mjs";
import { getLaunchReadiness } from "../launch/lib/readiness.mjs";
import { handleAdminApi } from "../operations/admin-api.mjs";
import { createCateringRequest, publicCateringReceipt } from "../operations/lib/operations-store.mjs";
import { publicCommercialSnapshot } from "../operations/lib/commercial-control.mjs";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoots = ["site", "brand", "media", "ops"].map((name) => resolve(packageRoot, name));
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
  const requestHeaders = response.stjRequestId ? { "X-Request-Id": response.stjRequestId } : {};
  response.writeHead(status, { ...headers(), ...requestHeaders, ...extraHeaders });
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
    fulfillment: {
      supported: config.fulfillment.supported,
      hours: config.fulfillment.hours,
      leadMinutes: config.fulfillment.leadMinutes,
      schedulingDays: config.fulfillment.schedulingDays,
      delivery: { mode: config.fulfillment.delivery.mode }
    },
    pricing: {
      tax: { status: config.pricing.tax.status },
      deliveryFee: { status: config.pricing.deliveryFee.status },
      serviceFee: { status: config.pricing.serviceFee.status },
      tips: { allowedPercentages: config.pricing.tips.allowedPercentages }
    },
    payments: { acceptsRawCardData: false, live: config.payments.adapter !== "safe_test_token" },
    orders: { statuses: config.orders.statuses }
  };
}

function quoteRecord(request, account = null) {
  const quote = quoteCart(request, {
    benefits: account ? benefitSnapshot(account) : null,
    rewardGrant: account ? availableRewardGrant(account, request.rewardGrantId) : null,
    accountPromoPolicy: benefitsConfig.stacking?.accountDiscountWithPromo || "best_discount",
    rewardWithAccount: benefitsConfig.stacking?.loyaltyRedemptionWithAccountDiscount !== false,
    rewardWithPromo: benefitsConfig.stacking?.loyaltyRedemptionWithPromo === true
  });
  const now = Date.now();
  const record = {
    ...quote,
    quoteId: `quote_${randomUUID()}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.orders.quoteMinutes * 60_000).toISOString()
  };
  Object.defineProperty(record, "accountId", {
    value: account?.id || null,
    enumerable: false,
    configurable: false,
    writable: false
  });
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
    estimatedReadyAt: order.estimatedReadyAt || null,
    notices: config.meta.mode === "safe_test"
      ? ["Online card payment is not live yet.", "Pre-opening order data may reset during deployments."]
      : []
  };
}

function adminOrderView(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    accountId: order.accountId || null,
    status: order.status,
    statusHistory: structuredClone(order.statusHistory || []),
    service: order.service,
    schedule: order.schedule,
    payment: structuredClone(order.payment),
    customer: structuredClone(order.customer),
    delivery: order.delivery ? structuredClone(order.delivery) : null,
    items: structuredClone(order.items),
    totals: structuredClone(order.totals),
    rewardGrantId: order.rewardGrantId || null,
    pos: structuredClone(order.pos),
    createdAt: order.createdAt
  };
}

function listOrdersForAdmin() {
  return [...orders.values()]
    .map(adminOrderView)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function adminSetOrderStatus(orderId, requestedStatus) {
  const order = orders.get(String(orderId || ""));
  if (!order) throw Object.assign(new Error("Order not found."), { code: "order_not_found", status: 404 });
  const status = String(requestedStatus || "");
  if (!config.orders.statuses.includes(status)) throw Object.assign(new Error("Invalid order status."), { code: "order_status_invalid", status: 422 });
  if (status === order.status) return adminOrderView(order);

  const allowed = {
    received: ["confirmed", "canceled"],
    confirmed: ["in_preparation", "canceled"],
    in_preparation: order.service === "delivery" ? ["out_for_delivery", "canceled"] : ["ready_for_pickup", "canceled"],
    ready_for_pickup: ["complete", "canceled"],
    out_for_delivery: ["complete", "canceled"],
    complete: [],
    canceled: []
  };
  if (!(allowed[order.status] || []).includes(status)) {
    throw Object.assign(new Error(`Cannot move order from ${order.status} to ${status}.`), { code: "order_transition_invalid", status: 409 });
  }
  order.status = status;
  order.statusHistory.push({ status, at: new Date().toISOString() });
  if (status === "complete") order.rewards = creditCompletedOrder(order);
  return adminOrderView(order);
}

function operationalNow() {
  const configured = config.meta.mode === "safe_test" ? String(process.env.ST_JUICE_TEST_NOW || "").trim() : "";
  if (configured) {
    const date = new Date(configured);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function localDateText(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.meta.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function scheduleResolution(service, schedule, requiredLeadMinutes = 0, now = new Date()) {
  if (schedule === "asap") {
    const date = localDateText(now);
    const result = generateSlots(service, date, now, requiredLeadMinutes);
    return {
      valid: result.valid && result.slots.length > 0,
      estimatedReadyAt: result.slots[0]?.value || null
    };
  }
  const value = String(schedule || "");
  const date = value.slice(0, 10);
  const result = generateSlots(service, date, now, requiredLeadMinutes);
  return {
    valid: result.valid && result.slots.some((slot) => slot.value === value),
    estimatedReadyAt: value || null
  };
}

function canReadOrder(request, url, order) {
  const signedIn = sessionForRequest(request);
  if (order.accountId) return signedIn?.account.id === order.accountId;
  const suppliedToken = String(request.headers["x-order-tracking-token"] || url.searchParams.get("token") || "");
  return Boolean(order.trackingToken && suppliedToken && suppliedToken === order.trackingToken);
}

function testAdminAuthorized(request) {
  const expected = process.env.ST_JUICE_ADMIN_TOKEN || process.env.STJ_TEST_ADMIN_TOKEN;
  return Boolean(expected && request.headers["x-stj-admin-token"] === expected);
}

async function api(request, response, url) {
  if (await handleAdminApi({
    request,
    response,
    url,
    json,
    bodyJson,
    listOrders: listOrdersForAdmin,
    updateOrderStatus: adminSetOrderStatus
  })) return;
  if (await handleAccountApi({ request, response, url, json, bodyJson, getOrder: (id) => orders.get(id), publicOrder })) return;
  if (request.method === "GET" && url.pathname === "/api/health") return json(response, 200, { ok: true, mode: config.meta.mode, payment: "token_only_test", storage: config.orders.storage, accounts: "memory_only_test" });
  if (request.method === "GET" && url.pathname === "/api/launch-readiness") return json(response, 200, getLaunchReadiness());
  if (request.method === "GET" && url.pathname === "/api/config") return json(response, 200, publicConfig());
  if (request.method === "GET" && url.pathname === "/api/catalog-status") return json(response, 200, publicCommercialSnapshot());
  if (request.method === "POST" && url.pathname === "/api/catering/requests") {
    const row = createCateringRequest(await bodyJson(request));
    return json(response, 201, { request: publicCateringReceipt(row) });
  }
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
    const signedIn = sessionForRequest(request);
    const quote = quoteRecord(input, signedIn?.account || null);
    return json(response, quote.valid ? 200 : 422, quote);
  }
  if (request.method === "POST" && url.pathname === "/api/payment/intents") {
    const input = await bodyJson(request);
    if (hasCardData(input)) return json(response, 400, { error: { code: "raw_card_data_rejected", message: "Raw card details are never accepted by this server." } });
    const resolved = activeQuote(input.quoteId);
    if (resolved.error) return json(response, 409, resolved);
    return json(response, 201, createPaymentIntent({ quoteId: resolved.quote.quoteId, amount: resolved.quote.totals.total.cents, currency: config.meta.currency }));
  }
  if (request.method === "POST" && url.pathname === "/api/orders") {
    const input = await bodyJson(request);
    if (hasCardData(input)) return json(response, 400, { error: { code: "raw_card_data_rejected", message: "Submit only a provider token—never card numbers or security codes." } });
    const key = String(request.headers["idempotency-key"] || input.idempotencyKey || "").trim();
    if (!key || key.length > 200) return json(response, 400, { error: { code: "idempotency_required", message: "A valid idempotency key is required." } });
    const existing = idempotency.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      const existingOrder = orders.get(existing.orderId);
      return json(response, 200, { idempotentReplay: true, order: publicOrder(existingOrder), trackingToken: existingOrder.trackingToken });
    }
    const resolved = activeQuote(input.quoteId);
    if (resolved.error) return json(response, 409, resolved);
    const quote = resolved.quote;
    const signedIn = sessionForRequest(request);
    if (quote.accountId && signedIn?.account.id !== quote.accountId) {
      return json(response, 409, { error: { code: "quote_account_mismatch", message: "Refresh the order total from the account that created this quote." } });
    }
    if (quote.rewardBenefit?.applied) {
      const activeGrant = signedIn ? availableRewardGrant(signedIn.account, quote.rewardBenefit.grantId) : null;
      if (!activeGrant) {
        return json(response, 409, { error: { code: "reward_grant_stale", message: "That reward is no longer available. Refresh the order total." } });
      }
    }
    const customerResult = validCustomer(input.customer);
    if (!customerResult.valid) return json(response, 422, { valid: false, errors: customerResult.errors });
    if (input.allergenAcknowledged !== true) return json(response, 422, { valid: false, errors: [{ code: "allergen_acknowledgement_required", field: "allergenAcknowledged", message: "Review and acknowledge the allergen notice." }] });
    const schedule = scheduleResolution(quote.service, input.schedule, quote.fulfillment?.requiredLeadMinutes || 0, operationalNow());
    if (!schedule.valid) return json(response, 422, { valid: false, errors: [{ code: "schedule_invalid", field: "schedule", message: "The store cannot complete this order within today's operating window. Try again during open hours." }] });
    if (quote.service === "delivery" && !deliveryChecks.has(input.deliveryCheckToken)) return json(response, 422, { valid: false, errors: [{ code: "delivery_check_required", message: "Validate the delivery address first." }] });
    const paymentMethod = input.paymentMethod === "cash" ? "cash" : "card";
    if (quote.service === "delivery" && paymentMethod === "cash") return json(response, 422, { valid: false, errors: [{ code: "cash_not_available_for_delivery", field: "paymentMethod", message: "Cash is not available for delivery orders." }] });
    const payment = paymentMethod === "cash" ? null : verifyPayment({ token: input.paymentToken, quoteId: quote.quoteId, amount: quote.totals.total.cents });
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
      rewardGrantId: quote.rewardBenefit?.applied ? quote.rewardBenefit.grantId : null,
      payment: paymentMethod === "cash"
        ? { method: "cash", provider: "pay_at_handoff", status: "due_at_handoff" }
        : { method: "card", provider: payment.intent.provider, status: "captured_test", tokenLast8: payment.intent.token.slice(-8) },
      mode: config.meta.mode,
      trackingToken: randomBytes(24).toString("base64url"),
      createdAt,
      estimatedReadyAt: schedule.estimatedReadyAt
    };
    if (signedIn) order.accountId = signedIn.account.id;
    order.pos = sendToPos(order);
    if (signedIn && order.rewardGrantId) consumeRewardGrant(signedIn.account, order.rewardGrantId, order.id, createdAt);
    orders.set(id, order);
    if (signedIn) attachOrder(signedIn.account, order);
    if (paymentMethod === "card") consumePayment(input.paymentToken);
    idempotency.set(key, { orderId: id, expiresAt: Date.now() + config.orders.idempotencyMinutes * 60_000 });
    return json(response, 201, { idempotentReplay: false, order: publicOrder(order), trackingToken: order.trackingToken });
  }

  const match = url.pathname.match(/^\/api\/orders\/([^/]+)(?:\/(advance))?$/);
  if (match && request.method === "GET" && !match[2]) {
    const order = orders.get(decodeURIComponent(match[1]));
    if (!order) return json(response, 404, { error: { code: "order_not_found", message: "Order not found." } });
    if (!canReadOrder(request, url, order)) return json(response, 403, { error: { code: "order_access_denied", message: "This order cannot be viewed from this session." } });
    return json(response, 200, { order: publicOrder(order) });
  }
  if (match && request.method === "POST" && match[2] === "advance") {
    if (!testAdminAuthorized(request)) return json(response, 404, { error: { code: "api_not_found", message: "API route not found." } });
    const order = orders.get(decodeURIComponent(match[1]));
    if (!order) return json(response, 404, { error: { code: "order_not_found", message: "Order not found." } });
    const flow = order.service === "delivery" ? ["received", "confirmed", "in_preparation", "out_for_delivery", "complete"] : ["received", "confirmed", "in_preparation", "ready_for_pickup", "complete"];
    const next = flow[Math.min(flow.length - 1, flow.indexOf(order.status) + 1)];
    if (next !== order.status) adminSetOrderStatus(order.id, next);
    return json(response, 200, { order: publicOrder(order) });
  }
  return json(response, 404, { error: { code: "api_not_found", message: "API route not found." } });
}

function staticFile(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return json(response, 405, { error: { code: "method_not_allowed", message: "Method not allowed." } });
  const customerRoute = /^(?:\/|\/(?:menu|drops|build|boxes|gift-cards|catering|rewards|location|account|about|checkout|product\/[^/]+|order\/[^/]+|info\/[^/]+)\/?)$/;
  if (customerRoute.test(url.pathname)) {
    const path = resolve(packageRoot, "site/index.html");
    response.writeHead(200, { ...headers("text/html; charset=utf-8"), ...(response.stjRequestId ? { "X-Request-Id": response.stjRequestId } : {}), "Cache-Control": "no-cache, max-age=0" });
    if (request.method === "HEAD") return response.end();
    return createReadStream(path).pipe(response);
  }
  const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  let path = resolve(packageRoot, requested);
  if (path !== packageRoot && !path.startsWith(`${packageRoot}${sep}`)) return json(response, 403, { error: { code: "forbidden", message: "Forbidden path." } });
  const isPublicPath = publicRoots.some((root) => path === root || path.startsWith(`${root}${sep}`));
  if (!isPublicPath) return json(response, 403, { error: { code: "forbidden", message: "Forbidden path." } });
  if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, "index.html");
  if (!existsSync(path) || !statSync(path).isFile()) return json(response, 404, { error: { code: "file_not_found", message: "File not found." } });
  response.writeHead(200, { ...headers(mime[extname(path)] || "application/octet-stream"), ...(response.stjRequestId ? { "X-Request-Id": response.stjRequestId } : {}), "Cache-Control": "public, max-age=60" });
  if (request.method === "HEAD") return response.end();
  createReadStream(path).pipe(response);
}

export function createOrderingServer() {
  return createServer(handleNodeRequest);
}

export async function handleNodeRequest(request, response) {
  response.stjRequestId = `req_${randomUUID()}`;
  let url;
  try {
    url = new URL(request.url || "/", "http://localhost");
    if (url.pathname.startsWith("/api/")) await api(request, response, url);
    else staticFile(request, response, url);
  } catch (error) {
    const status = error.status || 500;
    const code = error.code || "server_error";
    console.error(JSON.stringify({
      level: "error",
      requestId: response.stjRequestId,
      method: request.method || "GET",
      path: url?.pathname || "/",
      status,
      code
    }));
    json(response, status, { error: { code, message: error.status ? error.message : "The ordering service could not complete the request.", requestId: response.stjRequestId } });
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
