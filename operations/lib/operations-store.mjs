import { randomUUID } from "node:crypto";

const requests = new Map();
const auditEvents = [];

const clean = (value, max = 300) => String(value || "").trim().slice(0, max);
const fail = (message, code, status = 400, field) => {
  throw Object.assign(new Error(message), { code, status, field });
};
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

export function createCateringRequest(input = {}, now = new Date()) {
  const contactName = clean(input.contactName, 100);
  const email = clean(input.email, 200).toLowerCase();
  const phone = clean(input.phone, 40);
  const eventDate = clean(input.eventDate, 10);
  const serviceTime = clean(input.serviceTime, 5);
  const guestCount = Math.trunc(Number(input.guestCount || 0));
  const serviceMode = clean(input.serviceMode, 40);

  if (contactName.length < 2) fail("Enter the contact name.", "catering_contact_required", 422, "contactName");
  if (!validEmail(email)) fail("Enter a valid email.", "catering_email_invalid", 422, "email");
  if (phone.length < 7) fail("Enter a valid phone number.", "catering_phone_invalid", 422, "phone");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) fail("Choose a valid event date.", "catering_date_invalid", 422, "eventDate");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(serviceTime)) fail("Choose a valid service time.", "catering_time_invalid", 422, "serviceTime");
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 500) fail("Guest count must be between 1 and 500.", "catering_guest_count_invalid", 422, "guestCount");
  if (!["pickup", "delivery", "staffed_setup"].includes(serviceMode)) fail("Choose a valid service style.", "catering_service_invalid", 422, "serviceMode");
  if (input.contactConsent !== true) fail("Contact consent is required for this request.", "catering_contact_consent_required", 422, "contactConsent");

  const row = {
    id: `cat_${randomUUID()}`,
    reference: `STJ-CAT-${String(requests.size + 1).padStart(4, "0")}`,
    contactName,
    organization: clean(input.organization, 120),
    email,
    phone,
    eventDate,
    serviceTime,
    guestCount,
    serviceMode,
    packageInterest: clean(input.packageInterest, 80),
    notes: clean(input.notes, 1200),
    status: "requested",
    quote: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  requests.set(row.id, row);
  recordAudit("catering.requested", { cateringRequestId: row.id, reference: row.reference });
  return structuredClone(row);
}

export function publicCateringReceipt(row) {
  return {
    id: row.id,
    reference: row.reference,
    eventDate: row.eventDate,
    serviceTime: row.serviceTime,
    guestCount: row.guestCount,
    status: row.status,
    createdAt: row.createdAt
  };
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
  if (status && !["requested", "reviewing", "quoted", "accepted", "declined", "canceled"].includes(status)) {
    fail("Invalid catering request status.", "catering_status_invalid", 422);
  }
  if (status) row.status = status;
  if (input.quote != null) {
    const amount = Number(input.quote.amount);
    if (!Number.isFinite(amount) || amount < 0) fail("Quote amount must be valid.", "catering_quote_invalid", 422);
    row.quote = {
      amount: Number(amount.toFixed(2)),
      notes: clean(input.quote.notes, 600),
      version: Number(row.quote?.version || 0) + 1,
      createdAt: now.toISOString()
    };
    if (!status) row.status = "quoted";
  }
  row.updatedAt = now.toISOString();
  recordAudit("catering.updated", { cateringRequestId: row.id, status: row.status, quoteVersion: row.quote?.version || null });
  return structuredClone(row);
}

export function operationsAuditSnapshot(limit = 100) {
  return structuredClone(auditEvents.slice(0, Math.max(1, Math.min(500, Number(limit || 100)))));
}

export function recordOperationsAudit(eventType, metadata = {}) {
  return recordAudit(eventType, metadata);
}
