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
  dashboard: () => request("../api/account/dashboard"),
  benefits: () => request("../api/account/benefits"),
  rewardsLedger: () => request("../api/account/rewards/ledger"),
  enrollRewards: (csrfToken) => request("../api/account/rewards/enroll", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify({ consent: true }) }),
  redeemReward: (rewardId, csrfToken) => request("../api/account/rewards/redeem", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify({ rewardId }) }),
  claimBirthday: (csrfToken) => request("../api/account/birthday/claim", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: "{}" }),
  reservations: () => request("../api/account/reservations"),
  createReservation: (input, csrfToken) => request("../api/account/reservations", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify(input) }),
  cancelReservation: (id, csrfToken) => request(`../api/account/reservations/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } }),
  requestStudentVerification: (input, csrfToken) => request("../api/account/student-verification", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify(input) }),
  updateBusiness: (input, csrfToken) => request("../api/account/business", { method: "PATCH", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify(input) }),
  setFavorite: (productId, active, csrfToken) => request("../api/account/favorites", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify({ productId, active }) }),
  saveMix: (mix, csrfToken) => request("../api/account/mixes", { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify(mix) })
};
