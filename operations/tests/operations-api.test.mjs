import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../../ordering/server.mjs";

process.env.STJ_TEST_ADMIN_TOKEN = "phase3-ops-test";
process.env.ST_JUICE_TEST_NOW = "2026-09-20T18:00:00Z";
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

async function register(name, email, type) {
  const result = await json("/api/account/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password: "PhaseThreeTest!123", type })
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.payload));
  return {
    account: result.payload.account,
    csrf: result.payload.csrfToken,
    cookie: result.response.headers.get("set-cookie").split(";")[0]
  };
}

try {
  const denied = await json("/api/admin/summary");
  assert.equal(denied.response.status, 401);

  const session = await json("/api/admin/session", { headers: adminHeaders });
  assert.equal(session.response.status, 200);
  assert.equal(session.payload.authenticated, true);

  const student1 = await register("Student One", "student.one@example.edu", "student");
  const student2 = await register("Student Two", "student.two@example.edu", "student");
  const business = await register("Business Owner", "business@example.com", "business");

  await json("/api/account/student-verification", {
    method: "POST",
    headers: { Cookie: student1.cookie, "X-CSRF-Token": student1.csrf },
    body: JSON.stringify({ schoolEmail: "student.one@university.edu", institution: "Example University" })
  });
  await json("/api/account/student-verification", {
    method: "POST",
    headers: { Cookie: student2.cookie, "X-CSRF-Token": student2.csrf },
    body: JSON.stringify({ schoolEmail: "student.two@university.edu", institution: "Example University" })
  });
  await json("/api/account/business", {
    method: "PATCH",
    headers: { Cookie: business.cookie, "X-CSRF-Token": business.csrf },
    body: JSON.stringify({ company: "Example Office", role: "Manager", recurringCadence: "Weekly" })
  });

  const studentReview = await json(`/api/admin/students/${student1.account.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "verified", reviewerReference: "phase3-test" })
  });
  assert.equal(studentReview.response.status, 200);
  assert.equal(studentReview.payload.student.status, "verified");

  const businessReview = await json(`/api/admin/businesses/${business.account.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "approved", reviewerReference: "phase3-test" })
  });
  assert.equal(businessReview.response.status, 200);
  assert.equal(businessReview.payload.business.status, "approved");

  const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const reservationBody = {
    purpose: "study_group",
    date: future,
    startTime: "18:00",
    durationMinutes: 120,
    organization: "Study Group",
    notes: "Need outlets."
  };
  const res1 = await json("/api/account/reservations", {
    method: "POST",
    headers: { Cookie: student1.cookie, "X-CSRF-Token": student1.csrf },
    body: JSON.stringify({ ...reservationBody, partySize: 30 })
  });
  const res2 = await json("/api/account/reservations", {
    method: "POST",
    headers: { Cookie: student2.cookie, "X-CSRF-Token": student2.csrf },
    body: JSON.stringify({ ...reservationBody, partySize: 20 })
  });
  assert.equal(res1.response.status, 201);
  assert.equal(res2.response.status, 201);

  const confirmed1 = await json(`/api/admin/reservations/${res1.payload.reservation.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "confirmed", reviewerReference: "phase3-test" })
  });
  assert.equal(confirmed1.response.status, 200);

  const overCapacity = await json(`/api/admin/reservations/${res2.payload.reservation.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "confirmed", reviewerReference: "phase3-test" })
  });
  assert.equal(overCapacity.response.status, 409);
  assert.equal(overCapacity.payload.error.code, "reservation_capacity_exceeded");

  const catering = await json("/api/catering/requests", {
    method: "POST",
    body: JSON.stringify({
      contactName: "Office Manager",
      organization: "Example Office",
      email: "manager@example.com",
      phone: "3145550100",
      eventDate: future,
      serviceTime: "12:00",
      guestCount: 25,
      serviceMode: "pickup",
      packageInterest: "",
      notes: "Team lunch",
      contactConsent: true
    })
  });
  assert.equal(catering.response.status, 201);
  assert.match(catering.payload.request.reference, /^STJ-CAT-/);

  const cateringList = await json("/api/admin/catering", { headers: adminHeaders });
  const cateringRow = cateringList.payload.requests.find((row) => row.id === catering.payload.request.id);
  assert.ok(cateringRow);

  const quoted = await json(`/api/admin/catering/${cateringRow.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "quoted", quote: { amount: 450, notes: "Test quote" } })
  });
  assert.equal(quoted.response.status, 200);
  assert.equal(quoted.payload.request.quote.amount, 450);
  assert.equal(quoted.payload.request.quote.version, 1);

  const cart = await json("/api/cart/validate", {
    method: "POST",
    body: JSON.stringify({
      service: "dine_in",
      items: [{ kind: "catalog", productId: "pistachio-saint", sizeId: "16oz", quantity: 1, modifierSelections: {} }],
      promoCode: "",
      tipPercent: 0
    })
  });
  const order = await json("/api/orders", {
    method: "POST",
    headers: { "Idempotency-Key": `phase3-ops-${Date.now()}` },
    body: JSON.stringify({
      quoteId: cart.payload.quoteId,
      paymentMethod: "cash",
      schedule: "asap",
      allergenAcknowledged: true,
      customer: { name: "Ops Guest", email: "ops.guest@example.com", phone: "3145550199", marketingConsent: false }
    })
  });
  assert.equal(order.response.status, 201);

  const orders = await json("/api/admin/orders", { headers: adminHeaders });
  assert.ok(orders.payload.orders.some((row) => row.id === order.payload.order.id));

  const confirmedOrder = await json(`/api/admin/orders/${order.payload.order.id}/status`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "confirmed" })
  });
  assert.equal(confirmedOrder.response.status, 200);
  assert.equal(confirmedOrder.payload.order.status, "confirmed");

  const invalidTransition = await json(`/api/admin/orders/${order.payload.order.id}/status`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "complete" })
  });
  assert.equal(invalidTransition.response.status, 409);

  const summary = await json("/api/admin/summary", { headers: adminHeaders });
  assert.equal(summary.response.status, 200);
  assert.ok(summary.payload.accounts.total >= 3);
  assert.ok(summary.payload.catering.open >= 1);
  assert.ok(summary.payload.launch.blockers.includes("staff_auth"));
  assert.ok(summary.payload.launch.blockers.includes("operations_audit"));

  const audit = await json("/api/admin/audit", { headers: adminHeaders });
  for (const event of ["student.reviewed", "business.reviewed", "reservation.reviewed", "catering.updated", "order.status_changed"]) {
    assert.ok(audit.payload.events.some((row) => row.eventType === event), `Missing audit event: ${event}`);
  }

  console.log(JSON.stringify({
    status: "valid",
    unauthorizedAdminBlocked: true,
    studentReviewed: true,
    businessReviewed: true,
    reservationCapacityEnforced: true,
    cateringPersistedAndQuoted: true,
    orderWorkflowControlled: true,
    auditRecorded: true
  }, null, 2));
} finally {
  server.close();
  await once(server, "close");
}
