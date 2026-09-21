const els = {
  loginPanel: document.querySelector("#login-panel"),
  loginForm: document.querySelector("#login-form"),
  token: document.querySelector("#admin-token"),
  console: document.querySelector("#console"),
  panel: document.querySelector("#panel"),
  flash: document.querySelector("#flash"),
  connection: document.querySelector("#connection-state"),
  lock: document.querySelector("#lock-button"),
  tabs: [...document.querySelectorAll("[data-tab]")]
};

const state = {
  token: sessionStorage.getItem("stjuice-ops-token") || "",
  tab: "overview"
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[char]));

async function api(path, options = {}) {
  const response = await fetch(`../api/admin/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-STJ-Admin-Token": state.token,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Operations request failed.");
    error.code = payload.error?.code || "ops_error";
    error.status = response.status;
    throw error;
  }
  return payload;
}

function flash(message, kind = "info") {
  els.flash.hidden = false;
  els.flash.textContent = message;
  els.flash.dataset.kind = kind;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { els.flash.hidden = true; }, 4500);
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function status(value) {
  const kind = ["complete","confirmed","approved","verified","accepted"].includes(value) ? "ok"
    : ["declined","canceled"].includes(value) ? "danger" : "warn";
  return `<span class="status-pill ${kind}">${esc(String(value || "").replaceAll("_"," "))}</span>`;
}

function metric(label, value, detail = "") {
  return `<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${detail ? `<small class="muted">${esc(detail)}</small>` : ""}</article>`;
}

async function renderOverview() {
  const data = await api("summary");
  els.panel.innerHTML = `
    <div class="metrics">
      ${metric("Accounts", data.accounts.total, `${data.accounts.studentsPending + data.accounts.businessesPending} pending reviews`)}
      ${metric("Open orders", data.orders.open, `${data.orders.total} total`)}
      ${metric("Reservations", data.reservations.requested, `${data.reservations.confirmed} confirmed`)}
      ${metric("Catering", data.catering.open, `${data.catering.requested} new`)}
      ${metric("Launch blockers", data.launch.blockers.length, `${data.launch.configured}/${data.launch.required} ready`)}
    </div>
    <div class="section-title"><div><p class="eyebrow">OPERATING PULSE</p><h2>What needs attention.</h2></div></div>
    <div class="grid">
      <article class="panel-card"><p class="eyebrow">APPROVALS</p><h3>${data.accounts.studentsPending} Student · ${data.accounts.businessesPending} Business</h3><p class="muted">Account benefits stay inactive until these reviews are completed.</p></article>
      <article class="panel-card"><p class="eyebrow">LAUNCH</p><h3>${data.launch.launchReady ? "Ready" : "Still gated"}</h3><div class="blockers">${data.launch.blockers.slice(0,8).map((item) => `<span>${esc(item)}</span>`).join("")}</div></article>
    </div>`;
}

async function renderApprovals() {
  const { accounts } = await api("accounts");
  const students = accounts.filter((a) => a.type === "student" && a.student?.status === "pending_manual_review");
  const businesses = accounts.filter((a) => a.type === "business" && a.business?.status === "pending_review");
  const cards = [
    ...students.map((a) => `<article class="panel-card"><p class="eyebrow">STUDENT</p><h3>${esc(a.name)}</h3><p>${esc(a.email)}</p><p class="muted">${esc(a.student?.institution || "")} · ${esc(a.student?.schoolEmail || "")}</p><div class="row-actions"><button class="button button--small" data-review-student="${esc(a.id)}" data-status="verified">Verify</button><button class="button button--quiet button--small" data-review-student="${esc(a.id)}" data-status="declined">Decline</button></div></article>`),
    ...businesses.map((a) => `<article class="panel-card"><p class="eyebrow">BUSINESS</p><h3>${esc(a.business?.company || a.name)}</h3><p>${esc(a.name)} · ${esc(a.email)}</p><p class="muted">${esc(a.business?.role || "")} · ${esc(a.business?.recurringCadence || "")}</p><div class="row-actions"><button class="button button--small" data-review-business="${esc(a.id)}" data-status="approved">Approve</button><button class="button button--quiet button--small" data-review-business="${esc(a.id)}" data-status="declined">Decline</button></div></article>`)
  ];
  els.panel.innerHTML = `<div class="section-title"><div><p class="eyebrow">ACCOUNT REVIEWS</p><h2>Student & Business approvals.</h2></div></div><div class="grid">${cards.length ? cards.join("") : '<div class="empty">No pending account reviews.</div>'}</div>`;
}

async function renderReservations() {
  const { reservations, resources } = await api("reservations");
  const capacity = resources[0]?.capacity || "—";
  els.panel.innerHTML = `
    <div class="section-title"><div><p class="eyebrow">RESERVATIONS</p><h2>Group seating requests.</h2><p class="muted">Configured lounge capacity: ${esc(capacity)} seats. Confirmations are capacity checked server-side.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Guest</th><th>When</th><th>Group</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${reservations.map((r) => `<tr><td><strong>${esc(r.account.name)}</strong><br><span class="muted">${esc(r.account.email)}</span></td><td>${esc(r.date)}<br>${esc(r.startTime)} · ${r.durationMinutes} min</td><td>${esc(r.purpose.replaceAll("_"," "))}<br>${r.partySize} people</td><td>${status(r.status)}</td><td><div class="row-actions"><button class="button button--small" data-reservation="${esc(r.id)}" data-status="confirmed" ${r.status === "confirmed" ? "disabled" : ""}>Confirm</button><button class="button button--quiet button--small" data-reservation="${esc(r.id)}" data-status="declined">Decline</button></div></td></tr>`).join("") || '<tr><td colspan="5">No reservation requests.</td></tr>'}
    </tbody></table></div>`;
}

async function renderOrders() {
  const { orders } = await api("orders");
  const opts = ["received","confirmed","in_preparation","ready_for_pickup","out_for_delivery","complete","canceled"];
  els.panel.innerHTML = `
    <div class="section-title"><div><p class="eyebrow">ORDERS</p><h2>Order queue.</h2></div></div>
    <div class="table-wrap"><table><thead><tr><th>Order</th><th>Guest</th><th>Service</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${orders.map((o) => `<tr><td><strong>${esc(o.orderNumber)}</strong><br><span class="muted">${esc(o.id)}</span></td><td>${esc(o.customer.name)}<br><span class="muted">${esc(o.customer.email)}</span></td><td>${esc(o.service)}</td><td>${money(o.totals.total.amount)}</td><td><form class="inline-form" data-order-form="${esc(o.id)}"><select name="status">${opts.map((v) => `<option value="${v}" ${o.status === v ? "selected" : ""}>${v.replaceAll("_"," ")}</option>`).join("")}</select><span>${status(o.status)}</span><button class="button button--small" type="submit">Update</button></form></td></tr>`).join("") || '<tr><td colspan="5">No orders.</td></tr>'}
    </tbody></table></div>`;
}

async function renderCatering() {
  const { requests } = await api("catering");
  const statuses = ["requested","reviewing","quoted","accepted","declined","canceled"];
  els.panel.innerHTML = `
    <div class="section-title"><div><p class="eyebrow">CATERING</p><h2>Requests & quotes.</h2></div></div>
    <div class="grid">
      ${requests.map((r) => `<article class="panel-card"><p class="eyebrow">${esc(r.reference)}</p><h3>${esc(r.organization || r.contactName)}</h3><p>${esc(r.contactName)} · ${esc(r.email)} · ${esc(r.phone)}</p><p class="muted">${esc(r.eventDate)} · ${esc(r.serviceTime)} · ${r.guestCount} guests · ${esc(r.serviceMode)}</p><p>${esc(r.notes || "No notes")}</p><form data-catering-form="${esc(r.id)}"><div class="inline-form"><label>Status<select name="status">${statuses.map((v) => `<option ${r.status === v ? "selected" : ""} value="${v}">${v}</option>`).join("")}</select></label><label>Quote amount<input name="amount" type="number" min="0" step=".01" value="${r.quote?.amount ?? ""}" placeholder="Optional"></label><button class="button button--small" type="submit">Save</button></div></form>${r.quote ? `<p class="muted">Quote v${r.quote.version}: ${money(r.quote.amount)}</p>` : ""}</article>`).join("") || '<div class="empty">No catering requests.</div>'}
    </div>`;
}

async function renderCatalog() {
  const [{ products, storage, editableAtRuntime }, rewards, commercial] = await Promise.all([api("catalog"), api("rewards"), api("commercial")]);
  const productState = new Map(commercial.products.map((row) => [row.productId, row]));
  els.panel.innerHTML = `
    <div class="section-title"><div><p class="eyebrow">CATALOG & REWARDS</p><h2>Commercial controls.</h2><p class="muted">Runtime editing: ${editableAtRuntime ? "enabled" : "not yet"} · ${esc(storage)} · changes reset with preview-memory restarts.</p></div></div>
    <div class="metrics">${metric("Products", products.length)}${metric("Loyalty", rewards.config.loyalty.enabled ? "Active" : "Disabled")}${metric("Student benefit", rewards.config.accountDiscounts.student.enabled ? "Active" : "Disabled")}${metric("Business benefit", rewards.config.accountDiscounts.business.enabled ? "Active" : "Disabled")}${metric("Birthday", rewards.config.birthday.enabled ? "Active" : "Disabled")}</div>

    <div class="section-title"><div><p class="eyebrow">PRODUCT AVAILABILITY</p><h2>Pause or sell out items instantly.</h2></div></div>
    <div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Sizes</th><th>Status</th></tr></thead><tbody>
      ${products.map((p) => {
        const current = productState.get(p.id)?.status || "available";
        return `<tr><td><strong>${esc(p.name)}</strong><br><span class="muted">${esc(p.id)}</span></td><td>${esc(p.categoryId)}</td><td>${p.sizes.map((s) => `${esc(s.label)} ${money(s.price)}`).join("<br>")}</td><td><form class="inline-form" data-product-state-form="${esc(p.id)}"><select name="status">${["available","paused","sold_out"].map((v) => `<option value="${v}" ${current === v ? "selected" : ""}>${v.replaceAll("_"," ")}</option>`).join("")}</select><span>${status(current)}</span><button class="button button--small" type="submit">Save</button></form></td></tr>`;
      }).join("")}
    </tbody></table></div>

    <div class="section-title"><div><p class="eyebrow">NEW DROPS</p><h2>Publish, pause, sell out or archive drops.</h2></div></div>
    <div class="grid">
      ${commercial.drops.map((drop) => {
        const product = products.find((p) => p.id === drop.productId);
        return `<article class="panel-card"><p class="eyebrow">${esc(product?.name || drop.productId)}</p><h3>${status(drop.status)}</h3><form data-drop-state-form="${esc(drop.productId)}"><label>Status<select name="status">${["active","sold_out","archived","scheduled"].map((v) => `<option value="${v}" ${drop.status === v ? "selected" : ""}>${v.replaceAll("_"," ")}</option>`).join("")}</select></label><button class="button button--small" type="submit" style="margin-top:.7rem">Save drop</button></form></article>`;
      }).join("") || '<div class="empty">No drops configured.</div>'}
    </div>

    <div class="section-title"><div><p class="eyebrow">PARTY BOXES</p><h2>Availability & minimum prep.</h2></div></div>
    <div class="grid">
      ${commercial.boxes.map((box) => {
        const product = products.find((p) => p.id === box.productId);
        const scheduled = box.leadTime?.type === "scheduled";
        return `<article class="panel-card"><p class="eyebrow">${esc(product?.name || box.productId)}</p><form data-box-state-form="${esc(box.productId)}"><label>Status<select name="status">${["available","paused","sold_out"].map((v) => `<option value="${v}" ${box.status === v ? "selected" : ""}>${v.replaceAll("_"," ")}</option>`).join("")}</select></label><label style="margin-top:.7rem">Prep minutes<input name="leadMinutes" type="number" min="1" value="${scheduled ? Number(box.leadTime.minimumHours || 1) * 60 : Number(box.leadTime?.minimumMinutes || 30)}"></label><button class="button button--small" type="submit" style="margin-top:.7rem">Save box</button></form></article>`;
      }).join("")}
    </div>`;
}

async function renderLaunch() {
  const [readiness, audit] = await Promise.all([api("readiness"), api("audit?limit=40")]);
  els.panel.innerHTML = `
    <div class="section-title"><div><p class="eyebrow">LAUNCH CONTROL</p><h2>${readiness.launchReady ? "Ready for production." : "Production remains gated."}</h2><p class="muted">${readiness.configured} of ${readiness.required} readiness checks currently pass.</p></div></div>
    <div class="blockers">${readiness.blockers.map((b) => `<span>${esc(b)}</span>`).join("")}</div>
    <div class="section-title"><div><p class="eyebrow">AUDIT</p><h2>Recent staff actions.</h2></div></div>
    <div class="table-wrap"><table><thead><tr><th>Time</th><th>Event</th><th>Details</th></tr></thead><tbody>${audit.events.map((e) => `<tr><td>${esc(e.createdAt)}</td><td>${esc(e.eventType)}</td><td><code>${esc(JSON.stringify(e.metadata))}</code></td></tr>`).join("") || '<tr><td colspan="3">No staff actions yet.</td></tr>'}</tbody></table></div>`;
}

const renderers = { overview: renderOverview, approvals: renderApprovals, reservations: renderReservations, orders: renderOrders, catering: renderCatering, catalog: renderCatalog, launch: renderLaunch };

async function renderTab() {
  els.panel.innerHTML = '<div class="empty">Loading…</div>';
  try { await renderers[state.tab](); }
  catch (error) {
    if (error.status === 401 || error.status === 503) lock();
    els.panel.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
  }
}

function unlock() {
  els.loginPanel.hidden = true;
  els.console.hidden = false;
  els.lock.hidden = false;
  els.connection.textContent = "Connected";
  els.connection.className = "status-pill ok";
  renderTab();
}

function lock() {
  state.token = "";
  sessionStorage.removeItem("stjuice-ops-token");
  els.loginPanel.hidden = false;
  els.console.hidden = true;
  els.lock.hidden = true;
  els.connection.textContent = "Locked";
  els.connection.className = "status-pill";
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.token = els.token.value.trim();
  try {
    await api("session");
    sessionStorage.setItem("stjuice-ops-token", state.token);
    els.token.value = "";
    unlock();
  } catch (error) {
    lock();
    els.token.value = "";
    alert(error.message);
  }
});

els.lock.addEventListener("click", lock);

for (const button of els.tabs) {
  button.addEventListener("click", () => {
    state.tab = button.dataset.tab;
    els.tabs.forEach((item) => item.classList.toggle("is-active", item === button));
    renderTab();
  });
}

els.panel.addEventListener("click", async (event) => {
  const student = event.target.closest("[data-review-student]");
  const business = event.target.closest("[data-review-business]");
  const reservation = event.target.closest("[data-reservation]");
  try {
    if (student) {
      await api(`students/${encodeURIComponent(student.dataset.reviewStudent)}`, { method: "PATCH", body: JSON.stringify({ status: student.dataset.status, reviewerReference: "ops-console" }) });
      flash("Student review updated."); await renderTab();
    } else if (business) {
      await api(`businesses/${encodeURIComponent(business.dataset.reviewBusiness)}`, { method: "PATCH", body: JSON.stringify({ status: business.dataset.status, reviewerReference: "ops-console" }) });
      flash("Business review updated."); await renderTab();
    } else if (reservation) {
      await api(`reservations/${encodeURIComponent(reservation.dataset.reservation)}`, { method: "PATCH", body: JSON.stringify({ status: reservation.dataset.status, reviewerReference: "ops-console" }) });
      flash("Reservation updated."); await renderTab();
    }
  } catch (error) { flash(error.message, "error"); }
});

els.panel.addEventListener("submit", async (event) => {
  const orderForm = event.target.closest("[data-order-form]");
  const cateringForm = event.target.closest("[data-catering-form]");
  const productStateForm = event.target.closest("[data-product-state-form]");
  const dropStateForm = event.target.closest("[data-drop-state-form]");
  const boxStateForm = event.target.closest("[data-box-state-form]");
  if (!orderForm && !cateringForm && !productStateForm && !dropStateForm && !boxStateForm) return;
  event.preventDefault();
  try {
    if (orderForm) {
      const data = new FormData(orderForm);
      await api(`orders/${encodeURIComponent(orderForm.dataset.orderForm)}/status`, { method: "PATCH", body: JSON.stringify({ status: data.get("status") }) });
      flash("Order status updated."); await renderTab();
    } else if (cateringForm) {
      const data = new FormData(cateringForm);
      const amount = String(data.get("amount") || "").trim();
      await api(`catering/${encodeURIComponent(cateringForm.dataset.cateringForm)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: data.get("status"),
          ...(amount ? { quote: { amount: Number(amount), notes: "Operations console quote" } } : {})
        })
      });
      flash("Catering request updated."); await renderTab();
    } else if (productStateForm) {
      const data = new FormData(productStateForm);
      await api(`commercial/products/${encodeURIComponent(productStateForm.dataset.productStateForm)}`, { method: "PATCH", body: JSON.stringify({ status: data.get("status") }) });
      flash("Product availability updated."); await renderTab();
    } else if (dropStateForm) {
      const data = new FormData(dropStateForm);
      await api(`commercial/drops/${encodeURIComponent(dropStateForm.dataset.dropStateForm)}`, { method: "PATCH", body: JSON.stringify({ status: data.get("status") }) });
      flash("Drop status updated."); await renderTab();
    } else if (boxStateForm) {
      const data = new FormData(boxStateForm);
      const minutes = Math.max(1, Number(data.get("leadMinutes") || 30));
      const leadTime = minutes >= 60 && minutes % 60 === 0 ? { type: "scheduled", minimumHours: minutes / 60 } : { type: "capacity_based", minimumMinutes: minutes };
      await api(`commercial/boxes/${encodeURIComponent(boxStateForm.dataset.boxStateForm)}`, { method: "PATCH", body: JSON.stringify({ status: data.get("status"), leadTime }) });
      flash("Party box controls updated."); await renderTab();
    }
  } catch (error) { flash(error.message, "error"); }
});

if (state.token) {
  api("session").then(unlock).catch(lock);
}
