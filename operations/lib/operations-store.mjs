import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const cateringConfig = JSON.parse(readFileSync(new URL("../../menu/data/bundles-catering.json", import.meta.url), "utf8"));
const requests = new Map();
const auditEvents = [];

const clean = (value, max = 300) => String(value || "").trim().slice(0, max);
const fail = (message, code, status = 400, field) => {
  throw Object.assign(new Error(message), { code, status, field });
};
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const packageIds = new Set(cateringConfig.cateringPackages.map((item) => item.id));
const allowedStatuses = new Set([
  "requested",
  "needs_clarification",
  "quoted",
  "accepted",
  "payment_required",
  "confirmed",
  "in_preparation",
  "ready_or_out_for_delivery",
  "completed",
  "declined",
  "canceled"
]);

const allowedTransitions = {
  requested: ["needs_clarification", "quoted", "declined", "canceled"],
  needs_clarification: ["requested", "quoted", "declined", "canceled"],
  quoted: ["accepted", "needs_clarification", "declined", "canceled"],
  accepted: ["payment_required", "confirmed", "canceled"],
  payment_required: ["confirmed", "canceled"],
  confirmed: ["in_preparation", "canceled"],
  in_preparation: ["ready_or_out_for_delivery", "canceled"],
  ready_or_out_for_delivery: ["completed", "canceled"],
  completed: [],
  declined: [],
  canceled: []
};

function recordAudit(eventType, metadata = {}) {
  const event = {
    id: `audit_${randomUUID()}`,
    eventType,
    metadata: structuredClone(metadata),
    createdAt: new Date().toISOString()
  };
  auditEvents.unshift(event);
  if (auditEvents.length > 500) auditEvents.length = 500;
  return event;
}

function chicagoParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function validDateText(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return date.toISOString().slice(0, 10) === value;
}

function pseudoLocalMs(dateText, timeText = "00:00") {
  const [year, month, day] = String(dateText).split("-").map(Number);
  const [hour, minute] = String(timeText).split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

function localNowPseudoMs(now = new Date()) {
  const p = chicagoParts(now);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
}

function localDateText(now = new Date()) {
  const p = chicagoParts(now);
  return `${String(p.year).padStart(4,"0")}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`;
}

function businessDaysBetween(startDate, endDate) {
  let cursor = pseudoLocalMs(startDate);
  const end = pseudoLocalMs(endDate);
  let count = 0;
  while (cursor < end) {
    cursor += 86400000;
    const day = new Date(cursor).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function leadRule({ guestCount, serviceMode, customBrandingRequest }) {
  const staffedOrCustom = serviceMode === "staffed_setup" || customBrandingRequest === true;
  if (staffedOrCustom) return { type: "business_days", minimum: 5, label: "5 business days" };
  if (guestCount >= 51) return { type: "business_days", minimum: 5, label: "5 business days" };
  if (guestCount >= 21) return { type: "hours", minimum: 48, label: "48 hours" };
  if (guestCount >= 8) return { type: "hours", minimum: 24, label: "24 hours" };
  return { type: "store_capacity", minimum: 0, label: "store capacity" };
}

function validateLeadTime(eventDate, serviceTime, rule, now = new Date()) {
  if (rule.type === "hours") {
    const deltaHours = (pseudoLocalMs(eventDate, serviceTime) - localNowPseudoMs(now)) / 3600000;
    if (deltaHours < rule.minimum) fail(`This request needs at least ${rule.label} notice.`, "catering_lead_time_insufficient", 422, "eventDate");
  }
  if (rule.type === "business_days") {
    const available = businessDaysBetween(localDateText(now), eventDate);
    if (available < rule.minimum) fail(`This request needs at least ${rule.label} notice.`, "catering_lead_time_insufficient", 422, "eventDate");
  }
}

function normalizeVenueAddress(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const full = clean(value, 300);
    return full ? { full } : null;
  }
  const address = {
    street: clean(value.street, 120),
    city: clean(value.city, 80),
    state: clean(value.state, 40),
    postalCode: clean(value.postalCode, 20)
  };
  return Object.values(address).some(Boolean) ? address : null;
}

function completeVenue(address) {
  if (!address) return false;
  if (address.full) return address.full.length >= 8;
  return Boolean(address.street && address.city && address.state && address.postalCode);
}

function publicQuote(quote) {
  if (!quote) return null;
  return {
    amount: quote.amount,
    notes: quote.notes,
    version: quote.version,
    createdAt: quote.createdAt
  };
}

export function createCateringRequest(input = {}, now = new Date(), accountContext = null) {
  const contactName = clean(input.contactName, 100);
  const email = clean(input.email, 200).toLowerCase();
  const phone = clean(input.phone, 40);
  const eventDate = clean(input.eventDate, 10);
  const serviceTime = clean(input.serviceTime, 5);
  const guestCount = Math.trunc(Number(input.guestCount || 0));
  const serviceMode = clean(input.serviceMode, 40);
  const venueAddress = normalizeVenueAddress(input.venueAddress);
  const customBrandingRequest = input.customBrandingRequest === true;
  const taxExemptRequest = input.taxExemptRequest === true;
  const packageInterest = (Array.isArray(input.packageInterest) ? input.packageInterest : [input.packageInterest])
    .map((value) => clean(value, 80))
    .filter(Boolean);

  if (contactName.length < 2) fail("Enter the contact name.", "catering_contact_required", 422, "contactName");
  if (!validEmail(email)) fail("Enter a valid email.", "catering_email_invalid", 422, "email");
  if (phone.replace(/\D/g, "").length < 7) fail("Enter a valid phone number.", "catering_phone_invalid", 422, "phone");
  if (!validDateText(eventDate)) fail("Choose a valid event date.", "catering_date_invalid", 422, "eventDate");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(serviceTime)) fail("Choose a valid service time.", "catering_time_invalid", 422, "serviceTime");
  if (pseudoLocalMs(eventDate, serviceTime) <= localNowPseudoMs(now)) fail("Catering date and time must be in the future.", "catering_date_past", 422, "eventDate");
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 500) fail("Guest count must be between 1 and 500.", "catering_guest_count_invalid", 422, "guestCount");
  if (!["pickup", "delivery", "staffed_setup"].includes(serviceMode)) fail("Choose a valid service style.", "catering_service_invalid", 422, "serviceMode");
  if (["delivery", "staffed_setup"].includes(serviceMode) && !completeVenue(venueAddress)) fail("A complete venue address is required for delivery or staffed setup.", "catering_venue_required", 422, "venueAddress");
  if (packageInterest.some((id) => !packageIds.has(id))) fail("Choose a valid catering package.", "catering_package_invalid", 422, "packageInterest");
  if (input.contactConsent !== true) fail("Contact consent is required for this request.", "catering_contact_consent_required", 422, "contactConsent");

  const requiredLeadTime = leadRule({ guestCount, serviceMode, customBrandingRequest });
  validateLeadTime(eventDate, serviceTime, requiredLeadTime, now);

  const row = {
    id: `cat_${randomUUID()}`,
    reference: `STJ-CAT-${String(requests.size + 1).padStart(4, "0")}`,
    accountId: accountContext?.accountId || null,
    accountType: accountContext?.accountType || null,
    contactName,
    organization: clean(input.organization, 120),
    email,
    phone,
    eventDate,
    serviceTime,
    guestCount,
    serviceMode,
    venueAddress,
    packageInterest,
    budgetRange: clean(input.budgetRange, 80),
    dietaryAllergenNotes: clean(input.dietaryAllergenNotes, 1200),
    taxExemptRequest,
    customBrandingRequest,
    notes: clean(input.notes, 1200),
    contactConsent: true,
    requiredLeadTime,
    status: "requested",
    quote: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  requests.set(row.id, row);
  recordAudit("catering.requested", { cateringRequestId: row.id, reference: row.reference, accountId: row.accountId, guestCount, serviceMode });
  return structuredClone(row);
}

export function publicCateringReceipt(row) {
  return {
    id: row.id,
    reference: row.reference,
    eventDate: row.eventDate,
    serviceTime: row.serviceTime,
    guestCount: row.guestCount,
    serviceMode: row.serviceMode,
    packageInterest: structuredClone(row.packageInterest || []),
    status: row.status,
    quote: publicQuote(row.quote),
    requiredLeadTime: structuredClone(row.requiredLeadTime),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function cateringRequestsForAccount(accountId) {
  return [...requests.values()]
    .filter((row) => row.accountId === String(accountId || ""))
    .map(publicCateringReceipt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function acceptCateringQuoteForAccount(id, accountId, now = new Date()) {
  const row = requests.get(String(id || ""));
  if (!row || row.accountId !== String(accountId || "")) fail("Catering request not found in this account.", "catering_request_not_found", 404);
  if (row.status !== "quoted" || !row.quote) fail("This catering quote is not ready to accept.", "catering_quote_not_ready", 409);
  row.status = "accepted";
  row.updatedAt = now.toISOString();
  recordAudit("catering.customer_accepted", { cateringRequestId: row.id, accountId: row.accountId, quoteVersion: row.quote.version });
  return publicCateringReceipt(row);
}

export function adminCateringSnapshot() {
  return [...requests.values()]
    .map((row) => structuredClone(row))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function adminUpdateCateringRequest(id, input = {}, now = new Date()) {
  const row = requests.get(String(id || ""));
  if (!row) fail("Catering request not found.", "catering_request_not_found", 404);
  const status = clean(input.status, 40);
  if (status && !allowedStatuses.has(status)) fail("Invalid catering request status.", "catering_status_invalid", 422);

  const candidate = structuredClone(row);
  let quoteChanged = false;
  if (input.quote != null) {
    const amount = Number(input.quote.amount);
    if (!Number.isFinite(amount) || amount <= 0) fail("Quote amount must be greater than $0.", "catering_quote_invalid", 422);
    const notes = clean(input.quote.notes, 600);
    const normalizedAmount = Number(amount.toFixed(2));
    quoteChanged = !row.quote || row.quote.amount !== normalizedAmount || row.quote.notes !== notes;
    if (quoteChanged) {
      candidate.quote = {
        amount: normalizedAmount,
        notes,
        version: Number(row.quote?.version || 0) + 1,
        createdAt: now.toISOString()
      };
    }
  }

  const requestedStatus = status || (quoteChanged ? "quoted" : candidate.status);
  if (requestedStatus !== row.status) {
    const allowed = allowedTransitions[row.status] || [];
    if (!allowed.includes(requestedStatus)) {
      fail(`Cannot move catering request from ${row.status} to ${requestedStatus}.`, "catering_transition_invalid", 409);
    }
    candidate.status = requestedStatus;
  }
  if (candidate.status === "quoted" && !candidate.quote) fail("A quoted request requires a quote amount.", "catering_quote_required", 422);
  candidate.updatedAt = now.toISOString();

  requests.set(candidate.id, candidate);
  recordAudit("catering.updated", {
    cateringRequestId: candidate.id,
    previousStatus: row.status,
    status: candidate.status,
    quoteVersion: candidate.quote?.version || null,
    quoteChanged
  });
  return structuredClone(candidate);
}

export function operationsAuditSnapshot(limit = 100) {
  return structuredClone(auditEvents.slice(0, Math.max(1, Math.min(500, Number(limit || 100)))));
}

export function recordOperationsAudit(eventType, metadata = {}) {
  return recordAudit(eventType, metadata);
}
