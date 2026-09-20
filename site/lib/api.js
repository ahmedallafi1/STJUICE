async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({ error: { code: "invalid_response", message: "The order server returned an unreadable response." } }));
  if (!response.ok) {
    const error = new Error(payload.error?.message || payload.errors?.[0]?.message || "The order request failed.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const orderingApi = {
  config: () => request("../api/config"),
  slots: (service, date) => request(`../api/slots?service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}`),
  validateDelivery: (address) => request("../api/delivery/validate", { method: "POST", body: JSON.stringify({ address }) }),
  validateCart: (cart) => request("../api/cart/validate", { method: "POST", body: JSON.stringify(cart) }),
  createPaymentIntent: (quoteId) => request("../api/payment/intents", { method: "POST", body: JSON.stringify({ quoteId }) }),
  createOrder: (order, idempotencyKey) => request("../api/orders", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(order) }),
  getOrder: (id, trackingToken = "") => request(`../api/orders/${encodeURIComponent(id)}${trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : ""}`)
};


export const accountApi = {
  session: () => request("../api/account/session"),
  register: (input) => request("../api/account/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input) => request("../api/account/login", { method: "POST", body: JSON.stringify(input) }),
  logout: (csrfToken) => request("../api/account/logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: "{}" }),
  dashboard: () => request("../api/account/dashboard")
};
