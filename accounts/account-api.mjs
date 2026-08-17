import {
  accountCollections,
  accountConfig,
  attachOrder,
  authRateLimit,
  authenticate,
  clearAuthAttempts,
  createSession,
  deleteAccount,
  destroySession,
  enrollRewards,
  exportAccount,
  parseCookies,
  publicAccount,
  registerAccount,
  removeAddress,
  removeEvent,
  removeMix,
  requestStudentVerification,
  requireAccount,
  saveAddress,
  saveEvent,
  saveMix,
  sessionForRequest,
  setFavorite,
  updateBusiness,
  updateProfile
} from "./lib/account-store.mjs";

function publicConfig() {
  return {
    mode: accountConfig.meta.mode,
    storage: accountConfig.meta.storage,
    accountTypes: accountConfig.accountTypes,
    rewards: accountConfig.rewards,
    studentVerification: {
      mode: accountConfig.studentVerification.mode,
      methods: accountConfig.studentVerification.methods,
      automaticApproval: false,
      expiration: null,
      affiliationDisclaimer: accountConfig.studentVerification.affiliationDisclaimer
    },
    privacy: accountConfig.privacy,
    authentication: {
      sessionHours: accountConfig.authentication.sessionHours,
      passwordMinimumCharacters: accountConfig.authentication.passwordMinimumCharacters,
      emailVerification: accountConfig.authentication.emailVerification
    }
  };
}

function safeSiteRequest(request) {
  if (request.headers["sec-fetch-site"] === "cross-site") throw Object.assign(new Error("Cross-site account requests are not accepted."), { code: "cross_site_rejected", status: 403 });
  const origin = request.headers.origin;
  if (origin && request.headers.host && new URL(origin).host !== request.headers.host) throw Object.assign(new Error("Account request origin did not match this site."), { code: "origin_rejected", status: 403 });
}

function cookie(session, request) {
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${accountConfig.authentication.cookieName}=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${accountConfig.authentication.sessionHours * 3600}${secure}`;
}

function clearCookie(request) {
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${accountConfig.authentication.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function errorResponse(error) {
  return { status: error.status || 500, payload: { error: { code: error.code || "account_error", message: error.status ? error.message : "The test account service could not complete the request.", ...(error.field ? { field: error.field } : {}), ...(error.details ? { details: error.details } : {}) } } };
}

function accountOrders(account, getOrder, publicOrder) {
  return account.orderIds.map((id) => getOrder(id)).filter(Boolean).map(publicOrder);
}

function reorderItems(order) {
  return order.items.map((item) => item.kind === "builder" ? {
    kind: "builder",
    productId: "build-your-mood",
    key: item.key,
    customName: item.name,
    builderSelections: structuredClone(item.configuration?.builderSelections || {}),
    quantity: item.quantity
  } : {
    kind: "catalog",
    productId: item.productId,
    key: item.key,
    sizeId: item.sizeId,
    modifierSelections: structuredClone(item.configuration?.modifierSelections || {}),
    instructions: item.instructions || "",
    quantity: item.quantity
  });
}

export async function handleAccountApi({ request, response, url, json, bodyJson, getOrder, publicOrder }) {
  if (!url.pathname.startsWith("/api/account")) return false;
  try {
    if (request.method === "GET" && url.pathname === "/api/account/config") { json(response, 200, publicConfig()); return true; }
    if (request.method === "GET" && url.pathname === "/api/account/session") {
      const resolved = sessionForRequest(request);
      json(response, 200, resolved ? { authenticated: true, account: publicAccount(resolved.account), csrfToken: resolved.session.csrfToken, config: publicConfig() } : { authenticated: false, account: null, csrfToken: null, config: publicConfig() });
      return true;
    }
    if (request.method === "POST" && ["/api/account/register", "/api/account/login"].includes(url.pathname)) {
      safeSiteRequest(request);
      const input = await bodyJson(request);
      const rateKey = `${request.socket.remoteAddress || "local"}:${String(input.email || "").toLowerCase()}`;
      authRateLimit(rateKey);
      const account = url.pathname.endsWith("register") ? registerAccount(input) : authenticate(input.email, input.password);
      clearAuthAttempts(rateKey);
      const session = createSession(account.id);
      json(response, url.pathname.endsWith("register") ? 201 : 200, { authenticated: true, account: publicAccount(account), csrfToken: session.csrfToken, config: publicConfig() }, { "Set-Cookie": cookie(session, request) });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/account/logout") {
      const { session } = requireAccount(request, { csrf: true });
      destroySession(session.token);
      json(response, 200, { authenticated: false }, { "Set-Cookie": clearCookie(request) });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/account/dashboard") {
      const { account } = requireAccount(request);
      json(response, 200, { account: publicAccount(account), ...accountCollections(account), orders: accountOrders(account, getOrder, publicOrder), config: publicConfig() });
      return true;
    }

    if (request.method === "PATCH" && url.pathname === "/api/account/profile") {
      const { account } = requireAccount(request, { csrf: true });
      json(response, 200, { account: publicAccount(updateProfile(account, await bodyJson(request))) });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/account/favorites") {
      const { account } = requireAccount(request, { csrf: true });
      const input = await bodyJson(request);
      json(response, 200, { productIds: setFavorite(account, String(input.productId || ""), input.active) });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/account/mixes") {
      const { account } = requireAccount(request, { csrf: true });
      json(response, 201, { mix: saveMix(account, await bodyJson(request)) });
      return true;
    }
    const mixMatch = url.pathname.match(/^\/api\/account\/mixes\/([^/]+)$/);
    if (request.method === "DELETE" && mixMatch) {
      const { account } = requireAccount(request, { csrf: true });
      json(response, removeMix(account, decodeURIComponent(mixMatch[1])) ? 200 : 404, { removed: true });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/account/addresses") {
      const { account } = requireAccount(request, { csrf: true });
      json(response, 201, { address: saveAddress(account, await bodyJson(request)) });
      return true;
    }
    const addressMatch = url.pathname.match(/^\/api\/account\/addresses\/([^/]+)$/);
    if (request.method === "DELETE" && addressMatch) {
      const { account } = requireAccount(request, { csrf: true });
      json(response, removeAddress(account, decodeURIComponent(addressMatch[1])) ? 200 : 404, { removed: true });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/account/student-verification") {
      const { account } = requireAccount(request, { csrf: true });
      json(response, 202, { student: requestStudentVerification(account, await bodyJson(request)), disclaimer: accountConfig.studentVerification.affiliationDisclaimer });
      return true;
    }

    if (request.method === "PATCH" && url.pathname === "/api/account/business") {
      const { account } = requireAccount(request, { csrf: true });
      json(response, 200, { business: updateBusiness(account, await bodyJson(request)) });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/account/events") {
      const { account } = requireAccount(request, { csrf: true });
      json(response, 201, { event: saveEvent(account, await bodyJson(request)) });
      return true;
    }
    const eventMatch = url.pathname.match(/^\/api\/account\/events\/([^/]+)$/);
    if (request.method === "DELETE" && eventMatch) {
      const { account } = requireAccount(request, { csrf: true });
      json(response, removeEvent(account, decodeURIComponent(eventMatch[1])) ? 200 : 404, { removed: true });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/account/rewards/enroll") {
      const { account } = requireAccount(request, { csrf: true });
      const input = await bodyJson(request);
      json(response, 200, { rewards: enrollRewards(account, input.consent), config: publicConfig().rewards });
      return true;
    }

    const reorderMatch = url.pathname.match(/^\/api\/account\/reorder\/([^/]+)$/);
    if (request.method === "GET" && reorderMatch) {
      const { account } = requireAccount(request);
      const order = getOrder(decodeURIComponent(reorderMatch[1]));
      if (!order || !account.orderIds.includes(order.id)) throw Object.assign(new Error("Order not found in this account."), { code: "order_not_found", status: 404 });
      json(response, 200, { service: order.service, items: reorderItems(order), notice: "Every reordered item must be revalidated against the current catalog before checkout." });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/account/export") {
      const { account } = requireAccount(request);
      json(response, 200, exportAccount(account, accountOrders(account, getOrder, publicOrder)), { "Content-Disposition": `attachment; filename="st-juice-account-export.json"` });
      return true;
    }

    if (request.method === "DELETE" && url.pathname === "/api/account") {
      const { account } = requireAccount(request, { csrf: true });
      const input = await bodyJson(request);
      deleteAccount(account, input.password);
      json(response, 200, { deleted: true }, { "Set-Cookie": clearCookie(request) });
      return true;
    }

    json(response, 404, { error: { code: "account_route_not_found", message: "Account route not found." } });
    return true;
  } catch (error) {
    const output = errorResponse(error);
    json(response, output.status, output.payload);
    return true;
  }
}

export { attachOrder };
