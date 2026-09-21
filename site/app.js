import { escapeHtml, hydrateIcons, loadProjectData, productImage, routeInfo, titleCase } from "./lib/core.js";
import { accountApi, cateringApi, orderingApi } from "./lib/api.js";
import { loadAccount } from "./lib/account.js";
import {
  builderAllergens,
  calculateBuilderTotal,
  calculateProductPrice,
  ensureProductDraft,
  modes,
  renderAccountDialog,
  renderCart,
  renderFooter,
  renderPage,
  renderServiceDialog
} from "./lib/views.js";

const storageKeys = {
  mode: "stjuice-stage06-mode",
  service: "stjuice-stage06-service",
  cart: "stjuice-stage06-cart"
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Non-essential browser storage can be unavailable without blocking checkout.
  }
}

function readSession(key, fallback) {
  try {
    const value = sessionStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeSession(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Order tracking can still be recovered from a signed-in account session. */ }
}

const savedMode = readStorage(storageKeys.mode, readStorage("stjuice-stage05-mode", "guest"));
const savedService = readStorage(storageKeys.service, readStorage("stjuice-stage05-service", "pickup"));
const savedCart = readStorage(storageKeys.cart, readStorage("stjuice-stage05-cart", []));

function freshCheckout() {
  return {
    step: 0,
    schedule: "asap",
    paymentMethod: "card",
    address: { street: "", city: "St. Louis", state: "MO", postalCode: "" },
    deliveryCheck: null,
    contact: { name: "", email: "", phone: "", marketingConsent: false },
    promoCode: "",
    rewardGrantId: "",
    tipPercent: 0,
    allergenAcknowledged: false,
    quote: null,
    autoPrepared: false,
    preparing: false,
    busy: false,
    idempotencyKey: "",
    error: ""
  };
}

const state = {
  mode: "guest",
  service: ["pickup", "delivery", "dine_in"].includes(savedService) ? savedService : "pickup",
  cart: savedCart,
  menuFilters: { query: "", category: "all", mood: "all", occasion: "all", channel: "all" },
  productDrafts: {},
  builder: {
    step: 0,
    selections: { base: null, mood: null, "fruit-flavor": [], texture: null, sauce: [], topping: [], boost: [] },
    name: ""
  },
  cateringSuccess: false,
  cateringEmail: "",
  cateringReference: "",
  checkout: freshCheckout(),
  order: null,
  orderLoading: false,
  orderRequestedId: "",
  orderTrackingTokens: readSession("stjuice-order-tracking", {}),
  accountIntent: "regular",
  runtimeConfig: null
};
state.account = { ...loadAccount(), signedIn: false, points: 0, csrfToken: "" };

let data;
let searchTimer;

const elements = {
  app: document.querySelector("#app"),
  loader: document.querySelector("#app-loader"),
  footer: document.querySelector("#site-footer"),
  header: document.querySelector("#site-header"),
  announcementCopy: document.querySelector("#announcement-copy"),
  announcementMode: document.querySelector("#announcement-mode"),
  serviceLabel: document.querySelector("#service-label"),
  cartCount: document.querySelector("#cart-count"),
  mobileCartCount: document.querySelector("#mobile-cart-count"),
  cartDialog: document.querySelector("#cart-dialog"),
  cartContent: document.querySelector("#cart-content"),
  accountDialog: document.querySelector("#account-dialog"),
  accountContent: document.querySelector("#account-content"),
  serviceDialog: document.querySelector("#service-dialog"),
  serviceContent: document.querySelector("#service-content"),
  toastRegion: document.querySelector("#toast-region")
};

function currentContext() {
  return { data, state };
}

function navigate(path, { replace = false } = {}) {
  const target = new URL(path, window.location.origin);
  const href = `${target.pathname}${target.search}${target.hash}`;
  if (replace) window.history.replaceState({}, "", href);
  else window.history.pushState({}, "", href);
  render();
}

function applyAccountSession(payload) {
  state.account.signedIn = Boolean(payload?.authenticated);
  state.account.csrfToken = payload?.csrfToken || "";
  if (!payload?.authenticated || !payload.account) {
    state.mode = "guest";
    state.account.profile = { ...state.account.profile, name: "", email: "", phone: "", birthday: "", mode: "regular" };
    state.account.student = { status: "not_submitted", schoolEmail: "", institution: "", expiresAt: "" };
    state.account.business = {};
    state.account.points = 0;
    state.account.benefits = null;
    state.account.reservations = [];
    state.account.addresses = [];
    state.account.cateringRequests = [];
    state.account.reservationConfig = null;
    state.account.rewardsWallet = { points: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, transactions: [], grants: [] };
    state.account.rewardsConfig = null;
    if (state.checkout) {
      state.checkout.rewardGrantId = "";
      state.checkout.quote = null;
      state.checkout.autoPrepared = false;
      state.checkout.idempotencyKey = "";
    }
    return;
  }
  const account = payload.account;
  state.account.profile = {
    ...state.account.profile,
    name: account.name || "",
    email: account.email || "",
    phone: account.phone || "",
    birthday: account.birthday || "",
    mode: account.type || "regular"
  };
  state.account.student = account.student || { status: "not_submitted" };
  state.account.business = account.business || {};
  state.account.points = Number(account.rewards?.points || 0);
  state.mode = modes[account.type] ? account.type : "regular";
}

function applyAccountDashboard(payload) {
  state.account.favorites = Array.isArray(payload?.favorites) ? payload.favorites : [];
  state.account.savedMixes = Array.isArray(payload?.mixes)
    ? payload.mixes.map((mix) => ({ ...mix, savedAt: mix.createdAt || mix.savedAt || new Date().toISOString() }))
    : [];
  state.account.orderHistory = Array.isArray(payload?.orders)
    ? payload.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        service: order.service,
        status: order.status,
        total: order.totals?.total?.amount || 0,
        items: order.items || [],
        createdAt: order.createdAt
      }))
    : [];
  state.account.reservations = Array.isArray(payload?.reservations) ? payload.reservations : [];
  state.account.addresses = Array.isArray(payload?.addresses) ? payload.addresses : [];
  state.account.cateringRequests = Array.isArray(payload?.cateringRequests) ? payload.cateringRequests : [];
  state.account.benefits = payload?.benefits || null;
  state.account.reservationConfig = payload?.config?.benefits?.reservations || null;
  state.account.rewardsWallet = payload?.rewardsWallet || { points: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, transactions: [], grants: [] };
  state.account.rewardsConfig = payload?.config?.benefits?.loyalty || null;
  state.account.points = Number(state.account.rewardsWallet?.points || payload?.account?.rewards?.points || 0);
}

async function refreshAccountSession() {
  try {
    const session = await accountApi.session();
    applyAccountSession(session);
    if (session.authenticated) applyAccountDashboard(await accountApi.dashboard());
    else applyAccountDashboard({});
  } catch {
    applyAccountSession({ authenticated: false, account: null, csrfToken: null });
    applyAccountDashboard({});
  }
}

function syncFiltersFromRoute(route) {
  if (route.path !== "/menu") return;
  const aliases = { q: "query", category: "category", mood: "mood", occasion: "occasion", channel: "channel" };
  for (const [param, stateKey] of Object.entries(aliases)) {
    if (route.params.has(param)) state.menuFilters[stateKey] = route.params.get(param) || (stateKey === "query" ? "" : "all");
  }
}

function routeTitle(path) {
  if (path === "/") return "ST. JUICE — Your mood, made fresh.";
  if (path.startsWith("/product/")) {
    const product = data.productById.get(decodeURIComponent(path.split("/")[2] || ""));
    return product ? `${product.name} — ST. JUICE` : "Product — ST. JUICE";
  }
  const labels = {
    "/menu": "Menu",
    "/build": "Build Your Mood",
    "/drops": "New Drops",
    "/boxes": "Party Boxes",
    "/catering": "Catering",
    "/rewards": "Rewards",
    "/location": "Vandeventer Location",
    "/account": "Account Experience",
    "/about": "Our Story",
    "/checkout": "Checkout",
  };
  return `${labels[path] || titleCase(path.split("/").pop() || "Page")} — ST. JUICE`;
}

function routeDescription(route) {
  if (route.path.startsWith("/product/")) {
    const product = data.productById.get(decodeURIComponent(route.path.split("/")[2] || ""));
    if (product?.description) return product.description;
  }
  const descriptions = {
    "/": data.copy.global.shortDescription,
    "/menu": data.copy.menu.intro,
    "/drops": data.copy.drops.intro,
    "/boxes": data.copy.boxes.intro,
    "/catering": data.copy.catering.intro,
    "/rewards": data.copy.rewards.intro,
    "/about": data.copy.about.body,
    "/location": data.copy.home.location.body || data.copy.home.location.service
  };
  return descriptions[route.path] || data.copy.global.shortDescription;
}

function updateRouteMeta(route) {
  const title = routeTitle(route.path);
  const description = routeDescription(route);
  document.title = title;

  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) descriptionMeta.setAttribute("content", description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", title);
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", description);

  const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  if (!robots.toLowerCase().includes("index") || robots.toLowerCase().includes("noindex")) return;

  const canonicalPath = route.path === "/" ? "/" : route.path;
  const canonicalUrl = new URL(canonicalPath, window.location.origin).href;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("data-stj-canonical", "");
    document.head.append(canonical);
  }
  canonical.setAttribute("href", canonicalUrl);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.append(ogUrl);
  }
  ogUrl.setAttribute("content", canonicalUrl);
}

function updateNavigation(path) {
  document.querySelectorAll(".desktop-nav a, .mobile-nav a").forEach((link) => {
    const target = link.getAttribute("href")?.replace("#", "");
    const active = target === "/" ? path === "/" : path.startsWith(target || "__none__");
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function updateShell() {
  const mode = modes[state.mode];
  document.documentElement.dataset.theme = mode.theme;
  elements.announcementCopy.textContent = mode.announcement;
  elements.announcementMode.textContent = mode.short;
  elements.serviceLabel.textContent = state.service === "dine_in" ? "Dine in" : titleCase(state.service);
  const count = state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  elements.cartCount.textContent = String(count);
  elements.mobileCartCount.textContent = String(count);
  elements.footer.innerHTML = renderFooter(data);
  elements.accountContent.innerHTML = renderAccountDialog(state);
  elements.serviceContent.innerHTML = renderServiceDialog(state);
  elements.cartContent.innerHTML = renderCart(data, state);
  hydrateIcons(elements.footer);
  hydrateIcons(elements.accountContent);
  hydrateIcons(elements.serviceContent);
  hydrateIcons(elements.cartContent);
}

function render(options = {}) {
  const route = routeInfo();
  syncFiltersFromRoute(route);
  const scrollY = window.scrollY;
  elements.app.innerHTML = renderPage(route, currentContext());
  elements.app.hidden = false;
  elements.loader.hidden = true;
  hydrateIcons(elements.app);
  updateShell();
  updateNavigation(route.path);
  updateRouteMeta(route);

  if (route.path === "/checkout" && !state.checkout.preparing && !state.checkout.autoPrepared) {
    queueMicrotask(() => prepareCheckout());
  }
  if (route.path.startsWith("/order/")) {
    const orderId = decodeURIComponent(route.path.split("/")[2] || "");
    if (orderId && state.orderRequestedId !== orderId) queueMicrotask(() => loadOrder(orderId));
  }

  if (options.preserveScroll) window.scrollTo({ top: scrollY, behavior: "instant" });
  else window.scrollTo({ top: 0, behavior: "instant" });

  if (options.focus) {
    requestAnimationFrame(() => {
      const target = document.querySelector(options.focus);
      target?.focus();
      if (target instanceof HTMLInputElement) target.setSelectionRange(target.value.length, target.value.length);
    });
  }
}

function persistCart() {
  state.checkout.quote = null;
  state.checkout.autoPrepared = false;
  state.checkout.idempotencyKey = "";
  writeStorage(storageKeys.cart, state.cart);
  updateShell();
}

function errorMessage(error) {
  return error?.payload?.errors?.[0]?.message || error?.payload?.error?.message || error?.message || "The order service could not complete this step.";
}

function cartRequest() {
  return {
    service: state.service,
    items: state.cart.map((item) => item.kind === "builder" ? {
      kind: "builder", key: item.key, productId: "build-your-mood", builderSelections: item.builderSelections,
      customName: item.customName || item.name, quantity: item.quantity
    } : {
      kind: "catalog", key: item.key, productId: item.productId, sizeId: item.sizeId,
      modifierSelections: item.modifierSelections || {}, instructions: item.instructions || "", quantity: item.quantity
    }),
    promoCode: state.checkout.promoCode,
    rewardGrantId: state.checkout.rewardGrantId,
    tipPercent: state.checkout.tipPercent
  };
}

async function refreshQuote() {
  state.checkout.quote = await orderingApi.validateCart(cartRequest());
  return state.checkout.quote;
}

async function prepareCheckout() {
  if (!state.cart.length || state.checkout.preparing) return;
  state.checkout.preparing = true;
  state.checkout.autoPrepared = true;
  state.checkout.error = "";
  try { await refreshQuote(); }
  catch (error) { state.checkout.error = errorMessage(error); }
  finally { state.checkout.preparing = false; render({ preserveScroll: true }); }
}

async function loadOrder(orderId) {
  state.orderRequestedId = orderId;
  state.orderLoading = true;
  try {
    state.order = (await orderingApi.getOrder(orderId, state.orderTrackingTokens[orderId] || "")).order;
    if (state.account.signedIn) {
      try { applyAccountDashboard(await accountApi.dashboard()); } catch { /* Keep the order view available even if dashboard refresh fails. */ }
    }
  }
  catch (error) {
    state.order = { id: orderId, orderNumber: "Order preview unavailable", status: "canceled", statusHistory: [], service: "pickup", schedule: "—", customer: { name: "Guest", email: "—", phone: "—" }, items: [], totals: { subtotal: { amount: 0 }, discount: { amount: 0 }, tax: { amount: 0 }, deliveryFee: { amount: 0 }, serviceFee: { amount: 0 }, tip: { amount: 0, percent: 0 }, total: { amount: 0 } }, pos: { reference: "—", adapter: "—", status: errorMessage(error) } };
  } finally { state.orderLoading = false; render({ preserveScroll: true }); }
}

function toast(title, detail = "") {
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `<span class="toast__icon">✓</span><span><strong>${escapeHtml(title)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</span>`;
  elements.toastRegion.append(item);
  window.setTimeout(() => item.remove(), 3600);
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function openDialog(dialog) {
  updateShell();
  if (!dialog.open) dialog.showModal();
}

function modifierNames(product, draft) {
  const names = [];
  for (const [groupId, selectedIds] of Object.entries(draft.modifiers || {})) {
    const group = data.modifierById.get(groupId);
    const options = group?.options?.length ? group.options : data.modifierById.get(group?.reuseOptionsFrom)?.options || (group?.eligibleProductIds || []).map((id) => data.productById.get(id)).filter(Boolean);
    for (const id of selectedIds) {
      const option = options.find((item) => item.id === id);
      if (option) names.push(option.name);
    }
  }
  return names;
}

function migrateStage05Cart() {
  let changed = false;
  state.cart = state.cart.filter((item) => {
    if (item.kind === "builder" && item.builderSelections) return true;
    if (item.productId === "build-your-mood") { changed = true; return false; }
    const product = data.productById.get(item.productId);
    if (!product) { changed = true; return false; }
    if (!item.kind) { item.kind = "catalog"; changed = true; }
    if (!item.sizeId) {
      item.sizeId = product.sizes.find((size) => size.label === item.sizeLabel)?.id || product.sizes[0]?.id;
      changed = true;
    }
    if (!item.modifierSelections) { item.modifierSelections = {}; changed = true; }
    return Boolean(item.sizeId);
  });
  if (changed) writeStorage(storageKeys.cart, state.cart);
}

function addCartItem(item) {
  const existing = state.cart.find((cartItem) => cartItem.key === item.key);
  if (existing) existing.quantity += item.quantity;
  else state.cart.push(item);
  persistCart();
  toast(`${item.name} added`, `${item.sizeLabel || "Custom build"} · Bag saved on this device`);
}

function cartItemFromReorder(item) {
  if (item.kind === "builder") {
    const selections = structuredClone(item.builderSelections || {});
    const customName = String(item.customName || "My Mood");
    const base = builderOptions("base").find((option) => option.id === selections.base);
    const tempState = { builder: { selections, name: customName } };
    return {
      kind: "builder",
      key: `builder:${JSON.stringify(selections)}:${customName}`,
      productId: "build-your-mood",
      name: customName,
      image: "../media/optimized/webp/products/pistachio-saint-concept-v1.webp",
      sizeLabel: base?.name || "Custom build",
      builderSelections: selections,
      customName,
      modifiers: [],
      unitPrice: calculateBuilderTotal(data, tempState),
      quantity: Math.max(1, Number(item.quantity || 1)),
      allergens: builderAllergens(data, tempState)
    };
  }

  const product = data.productById.get(item.productId);
  if (!product || product.runtimeStatus && product.runtimeStatus !== "available") return null;
  const size = product.sizes.find((candidate) => candidate.id === item.sizeId);
  if (!size) return null;
  const draft = {
    sizeId: size.id,
    modifiers: structuredClone(item.modifierSelections || {}),
    instructions: String(item.instructions || "")
  };
  return {
    kind: "catalog",
    key: JSON.stringify([product.id, size.id, Object.entries(draft.modifiers).sort()]),
    productId: product.id,
    name: product.name,
    image: productImage(product),
    sizeLabel: size.label,
    sizeId: size.id,
    modifierSelections: draft.modifiers,
    modifiers: modifierNames(product, draft),
    instructions: draft.instructions,
    unitPrice: calculateProductPrice(product, draft, data),
    quantity: Math.max(1, Number(item.quantity || 1))
  };
}

function addProduct(productId) {
  const product = data.productById.get(productId);
  if (!product) return;
  const draft = ensureProductDraft(product, data, state);
  const size = product.sizes.find((item) => item.id === draft.sizeId) || product.sizes[0];
  const modifiers = modifierNames(product, draft);
  const signature = JSON.stringify([product.id, size?.id, Object.entries(draft.modifiers || {}).sort()]);
  addCartItem({
    kind: "catalog",
    key: signature,
    productId: product.id,
    name: product.name,
    image: productImage(product),
    sizeLabel: size?.label,
    sizeId: size?.id,
    modifierSelections: structuredClone(draft.modifiers || {}),
    modifiers,
    instructions: draft.instructions,
    unitPrice: calculateProductPrice(product, draft, data),
    quantity: 1
  });
}

function resetBuilder() {
  state.builder = {
    step: 0,
    selections: { base: null, mood: null, "fruit-flavor": [], texture: null, sauce: [], topping: [], boost: [] },
    name: ""
  };
}

function builderStep(stepId) {
  return data.builder.steps.find((step) => step.id === stepId);
}

function builderOptions(stepId) {
  const step = builderStep(stepId);
  if (step?.options) return step.options;
  const reference = step?.reuseOptionsFrom?.split("#")[1];
  return data.modifierById.get(reference)?.options || [];
}

function builderSelectedNames() {
  const result = [];
  for (const step of data.builder.steps) {
    if (["base", "review"].includes(step.id)) continue;
    const value = state.builder.selections[step.id];
    const ids = Array.isArray(value) ? value : value ? [value] : [];
    const options = builderOptions(step.id);
    for (const id of ids) {
      const option = options.find((item) => item.id === id);
      if (option) result.push(option.name);
    }
  }
  return result;
}

function addBuilderMood() {
  const base = builderOptions("base").find((item) => item.id === state.builder.selections.base);
  if (!base) return;
  const mood = builderOptions("mood").find((item) => item.id === state.builder.selections.mood);
  const name = state.builder.name.trim() || `${mood?.name || "Custom"} ${base.name}`;
  const signature = `builder:${JSON.stringify(state.builder.selections)}:${name}`;
  addCartItem({
    kind: "builder",
    key: signature,
    productId: "build-your-mood",
    name,
    image: "../media/optimized/webp/products/pistachio-saint-concept-v1.webp",
    sizeLabel: base.name,
    builderSelections: structuredClone(state.builder.selections),
    customName: name,
    modifiers: builderSelectedNames(),
    unitPrice: calculateBuilderTotal(data, state),
    quantity: 1,
    allergens: builderAllergens(data, state)
  });
}

function updateMenuFilter(element) {
  const key = element.dataset.filter;
  if (!key) return;
  state.menuFilters[key] = element.value;
  render({ preserveScroll: true, focus: key === "query" ? "#menu-search" : undefined });
}

document.addEventListener("click", async (event) => {
  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) return;
  const action = actionElement.dataset.action;
  if (action === "toggle-favorite") {
    if (!state.account.signedIn) {
      state.accountIntent = "regular";
      navigate("/account");
      toast("Sign in to save favorites");
      return;
    }
    const productId = actionElement.dataset.productId;
    const active = !state.account.favorites.includes(productId);
    try {
      const result = await accountApi.setFavorite(productId, active, state.account.csrfToken);
      state.account.favorites = result.productIds || [];
      render({ preserveScroll: true });
      toast(active ? "Added to favorites" : "Removed from favorites");
    } catch (error) { toast("Favorites did not update", errorMessage(error)); }
    return;
  }
  if (action === "save-builder-mix") {
    if (!state.account.signedIn) {
      state.accountIntent = "regular";
      navigate("/account");
      toast("Sign in to save your mix");
      return;
    }
    try {
      const result = await accountApi.saveMix({ name: state.builder.name || "My Mood", selections: structuredClone(state.builder.selections) }, state.account.csrfToken);
      state.account.savedMixes = [{ ...result.mix, savedAt: result.mix.createdAt }, ...state.account.savedMixes];
      render({ preserveScroll: true });
      toast("Mix saved", "Available in your account dashboard.");
    } catch (error) { toast("Mix did not save", errorMessage(error)); }
    return;
  }
  if (action === "apply-reward-grant") {
    state.checkout.rewardGrantId = actionElement.dataset.grantId || "";
    state.checkout.quote = null;
    state.checkout.autoPrepared = false;
    state.checkout.idempotencyKey = "";
    render({ preserveScroll: true });
    toast("Reward selected", state.cart.length ? "It will be validated against your bag at checkout." : "Add an eligible item, then the reward will be validated at checkout.");
    return;
  }
  if (action === "remove-reward-grant") {
    state.checkout.rewardGrantId = "";
    state.checkout.quote = null;
    state.checkout.autoPrepared = false;
    state.checkout.idempotencyKey = "";
    render({ preserveScroll: true });
    toast("Reward removed from checkout");
    return;
  }
  if (action === "enroll-rewards") {
    try {
      await accountApi.enrollRewards(state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Rewards joined", "Your wallet is ready. Points only earn after eligible completed orders.");
    } catch (error) { toast("Rewards enrollment did not complete", errorMessage(error)); }
    return;
  }
  if (action === "redeem-reward") {
    try {
      await accountApi.redeemReward(actionElement.dataset.rewardId || "", state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Reward unlocked", "Your available reward is now in your wallet.");
    } catch (error) { toast("Reward could not be redeemed", errorMessage(error)); }
    return;
  }
  if (action === "claim-birthday") {
    try {
      await accountApi.claimBirthday(state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Birthday benefit added", "Your birthday reward is now in your wallet.");
    } catch (error) { toast("Birthday benefit unavailable", errorMessage(error)); }
    return;
  }
  if (action === "accept-catering-quote") {
    try {
      await accountApi.acceptCateringQuote(actionElement.dataset.cateringId || "", state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Catering quote accepted", "Your request is now ready for the next confirmation/payment step.");
    } catch (error) { toast("Quote could not be accepted", errorMessage(error)); }
    return;
  }
  if (action === "remove-saved-address") {
    try {
      await accountApi.removeAddress(actionElement.dataset.addressId || "", state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Saved address removed");
    } catch (error) { toast("Address could not be removed", errorMessage(error)); }
    return;
  }
  if (action === "cancel-reservation") {
    try {
      await accountApi.cancelReservation(actionElement.dataset.reservationId, state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Reservation request canceled");
    } catch (error) { toast("Reservation could not be canceled", errorMessage(error)); }
    return;
  }
  if (action === "account-signout") {
    try { await accountApi.logout(state.account.csrfToken); }
    catch { /* Clear the local view even if the expired session is already gone. */ }
    applyAccountSession({ authenticated: false, account: null, csrfToken: null });
    applyAccountDashboard({});
    render();
    toast("Signed out");
    return;
  }
  if (action === "reorder-history") {
    const orderId = actionElement.dataset.orderId || "";
    try {
      const result = await accountApi.reorder(orderId);
      const rebuilt = (result.items || []).map(cartItemFromReorder).filter(Boolean);
      if (!rebuilt.length) throw new Error("None of the items from that order are currently available.");
      for (const item of rebuilt) {
        const existing = state.cart.find((cartItem) => cartItem.key === item.key);
        if (existing) existing.quantity += item.quantity;
        else state.cart.push(item);
      }
      if (["pickup", "delivery", "dine_in"].includes(result.service)) state.service = result.service;
      writeStorage(storageKeys.service, state.service);
      persistCart();
      toast("Order added to your bag", "Current menu prices and availability will be revalidated at checkout.");
      navigate("/checkout");
    } catch (error) {
      toast("Reorder could not be added", errorMessage(error));
    }
    return;
  }

  if (action === "open-account") {
    event.preventDefault();
    openDialog(elements.accountDialog);
  } else if (action === "open-cart") {
    event.preventDefault();
    openDialog(elements.cartDialog);
  } else if (action === "open-service") {
    event.preventDefault();
    openDialog(elements.serviceDialog);
  } else if (action === "close-dialog") {
    closeDialog(actionElement.closest("dialog"));
  } else if (action === "menu-search") {
    event.preventDefault();
    navigate("/menu");
    requestAnimationFrame(() => document.querySelector("#menu-search")?.focus());
  } else if (action === "set-mode") {
    const mode = actionElement.dataset.mode;
    if (!modes[mode]) return;
    if (mode === "guest") {
      state.mode = "guest";
      closeDialog(elements.accountDialog);
      render({ preserveScroll: true });
      return;
    }
    if (state.account.signedIn && state.account.profile.mode === mode) {
      state.mode = mode;
      closeDialog(elements.accountDialog);
      render({ preserveScroll: true });
      return;
    }
    state.accountIntent = mode;
    closeDialog(elements.accountDialog);
    navigate("/account");
    toast("Sign in required", `Sign in or create a ${modes[mode].label.toLowerCase()} account to use this experience.`);
  } else if (action === "set-service") {
    const service = actionElement.dataset.service;
    if (!["pickup", "delivery", "dine_in"].includes(service)) return;
    state.service = service;
    writeStorage(storageKeys.service, service);
    state.checkout.quote = null;
    state.checkout.autoPrepared = false;
    state.checkout.deliveryCheck = null;
    state.checkout.idempotencyKey = "";
    if (state.service === "delivery") state.checkout.paymentMethod = "card";
    closeDialog(elements.serviceDialog);
    render({ preserveScroll: true });
    toast(`${titleCase(service)} selected`, service === "delivery" ? "Delivery availability is reviewed at checkout." : "11 S Vandeventer Ave");
  } else if (action === "quick-add") {
    event.preventDefault();
    addProduct(actionElement.dataset.productId);
  } else if (action === "add-product") {
    addProduct(actionElement.dataset.productId);
  } else if (action === "set-channel") {
    state.menuFilters.channel = actionElement.dataset.channel || "all";
    render({ preserveScroll: true });
  } else if (action === "clear-filters") {
    state.menuFilters = { query: "", category: "all", mood: "all", occasion: "all", channel: "all" };
    render({ preserveScroll: true, focus: "#menu-search" });
  } else if (action === "builder-next") {
    state.builder.step = Math.min(data.builder.steps.length - 1, state.builder.step + 1);
    render({ preserveScroll: true });
  } else if (action === "builder-prev") {
    state.builder.step = Math.max(0, state.builder.step - 1);
    render({ preserveScroll: true });
  } else if (action === "reset-builder") {
    resetBuilder();
    render({ preserveScroll: true });
    toast("Builder reset", "Start with a new base.");
  } else if (action === "builder-add") {
    addBuilderMood();
  } else if (action === "cart-quantity") {
    const item = state.cart.find((cartItem) => cartItem.key === actionElement.dataset.key);
    if (!item) return;
    item.quantity = Math.max(0, item.quantity + Number(actionElement.dataset.delta || 0));
    if (item.quantity === 0) state.cart = state.cart.filter((cartItem) => cartItem !== item);
    persistCart();
  } else if (action === "remove-cart-item") {
    state.cart = state.cart.filter((item) => item.key !== actionElement.dataset.key);
    persistCart();
  } else if (action === "checkout-preview") {
    closeDialog(elements.cartDialog);
    navigate("/checkout");
  } else if (action === "checkout-service") {
    state.service = actionElement.dataset.service;
    writeStorage(storageKeys.service, state.service);
    state.checkout.quote = null;
    state.checkout.autoPrepared = false;
    state.checkout.deliveryCheck = null;
    state.checkout.idempotencyKey = "";
    if (state.service === "delivery") state.checkout.paymentMethod = "card";
    await prepareCheckout();
  } else if (action === "validate-delivery") {
    state.checkout.error = "";
    try {
      state.checkout.deliveryCheck = await orderingApi.validateDelivery(state.checkout.address);
      toast("Address reviewed", "Final delivery availability and fees will be confirmed when live ordering launches.");
      render({ preserveScroll: true });
    } catch (error) { state.checkout.error = errorMessage(error); render({ preserveScroll: true }); }
  } else if (action === "refresh-quote") {
    state.checkout.error = "";
    try { await refreshQuote(); toast("Order total refreshed", "Your items were recalculated from the current menu."); }
    catch (error) { state.checkout.error = errorMessage(error); }
    render({ preserveScroll: true });
  } else if (action === "checkout-back") {
    state.checkout.error = "";
    state.checkout.step = Math.max(0, state.checkout.step - 1);
    render();
  } else if (action === "checkout-next") {
    state.checkout.error = "";
    if (state.checkout.step === 0) {
      if (state.service === "delivery" && !state.checkout.deliveryCheck) state.checkout.error = "Check the delivery address before continuing.";
    } else if (state.checkout.step === 1) {
      if (state.checkout.contact.name.trim().length < 2) state.checkout.error = "Enter the guest name.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.checkout.contact.email)) state.checkout.error = "Enter a valid email address.";
      else if (state.checkout.contact.phone.replace(/\D/g, "").length < 7) state.checkout.error = "Enter a valid phone number.";
      else try { await refreshQuote(); } catch (error) { state.checkout.error = errorMessage(error); }
    } else if (state.checkout.step === 2) {
      try { await refreshQuote(); } catch (error) { state.checkout.error = errorMessage(error); }
      if (!state.checkout.error && !state.checkout.allergenAcknowledged) state.checkout.error = "Review and acknowledge the allergen notice.";
    }
    if (!state.checkout.error) state.checkout.step = Math.min(3, state.checkout.step + 1);
    render();
  } else if (action === "submit-test-order") {
    state.checkout.error = "";
    state.checkout.busy = true;
    render({ preserveScroll: true });
    try {
      const quote = await refreshQuote();
      const cashAllowed = state.service !== "delivery" && state.checkout.paymentMethod === "cash";
      const payment = cashAllowed ? null : await orderingApi.createPaymentIntent(quote.quoteId);
      if (!state.checkout.idempotencyKey) state.checkout.idempotencyKey = globalThis.crypto?.randomUUID?.() || `browser_${Date.now()}_${Math.random()}`;
      const result = await orderingApi.createOrder({
        quoteId: quote.quoteId,
        paymentMethod: cashAllowed ? "cash" : "card",
        paymentToken: payment?.token,
        schedule: "asap",
        deliveryCheckToken: state.checkout.deliveryCheck?.deliveryCheckToken,
        allergenAcknowledged: state.checkout.allergenAcknowledged,
        customer: state.checkout.contact
      }, state.checkout.idempotencyKey);
      state.order = result.order;
      state.orderRequestedId = result.order.id;
      if (result.trackingToken) {
        state.orderTrackingTokens[result.order.id] = result.trackingToken;
        writeSession("stjuice-order-tracking", state.orderTrackingTokens);
      }
      state.cart = [];
      writeStorage(storageKeys.cart, []);
      state.checkout = freshCheckout();
      navigate(`/order/${result.order.id}`);
      toast("Order preview created", result.order.orderNumber);
    } catch (error) {
      state.checkout.busy = false;
      state.checkout.error = errorMessage(error);
      render({ preserveScroll: true });
    }
  } else if (action === "refresh-order") {
    await loadOrder(actionElement.dataset.orderId);
  } else if (action === "prefill-catering") {
    const packageId = actionElement.dataset.package || "";
    const checkbox = [...document.querySelectorAll('input[name="packageInterest"]')].find((input) => input.value === packageId);
    if (checkbox) checkbox.checked = true;
    document.querySelector("#catering-form")?.scrollIntoView({ behavior: "smooth" });
  }
});

document.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  if (target.matches("[data-filter]")) {
    updateMenuFilter(target);
    return;
  }

  if (target.dataset.productSize) {
    const product = data.productById.get(target.dataset.productSize);
    if (!product) return;
    ensureProductDraft(product, data, state).sizeId = target.value;
    render({ preserveScroll: true });
    return;
  }

  if (target.dataset.checkoutField) {
    const field = target.dataset.checkoutField;
    state.checkout[field] = target.type === "checkbox" ? target.checked : target.value;
    state.checkout.idempotencyKey = "";
    state.checkout.error = "";
    if (["promoCode", "allergenAcknowledged"].includes(field)) state.checkout.quote = field === "promoCode" ? null : state.checkout.quote;
    render({ preserveScroll: true });
    return;
  }

  if (target.dataset.paymentMethod) {
    state.checkout.paymentMethod = target.value;
    state.checkout.idempotencyKey = "";
    render({ preserveScroll: true });
    return;
  }

  if (target.dataset.tipPercent) {
    state.checkout.tipPercent = Number(target.dataset.tipPercent);
    state.checkout.idempotencyKey = "";
    state.checkout.quote = null;
    try { await refreshQuote(); } catch (error) { state.checkout.error = errorMessage(error); }
    render({ preserveScroll: true });
    return;
  }

  if (target.dataset.contactField === "marketingConsent") {
    state.checkout.contact.marketingConsent = target.checked;
    state.checkout.idempotencyKey = "";
    return;
  }

  if (target.dataset.productModifier) {
    const product = data.productById.get(target.dataset.productId);
    const group = data.modifierById.get(target.dataset.productModifier);
    if (!product || !group) return;
    const draft = ensureProductDraft(product, data, state);
    const current = draft.modifiers[group.id] || [];
    if (target.dataset.productReference) {
      const optionId = target.dataset.productReference;
      const count = Math.max(0, Math.min(Number(group.selection?.max || 1), Number(target.value || 0)));
      const withoutOption = current.filter((id) => id !== optionId);
      if (withoutOption.length + count > Number(group.selection?.max || 1)) {
        toast("Selection limit reached", `Choose up to ${group.selection?.max || 1} in ${group.name}.`);
        render({ preserveScroll: true });
        return;
      }
      draft.modifiers[group.id] = [...withoutOption, ...Array.from({ length: count }, () => optionId)];
    } else if (target.type === "radio") draft.modifiers[group.id] = [target.value];
    else if (target.checked) {
      if (current.length >= Number(group.selection?.max || 1)) {
        target.checked = false;
        toast("Selection limit reached", `Choose up to ${group.selection?.max || 1} in ${group.name}.`);
        return;
      }
      draft.modifiers[group.id] = [...current, target.value];
    } else draft.modifiers[group.id] = current.filter((id) => id !== target.value);
    render({ preserveScroll: true });
    return;
  }

  if (target.dataset.builderOption) {
    const stepId = target.dataset.builderOption;
    const step = builderStep(stepId);
    if (!step) return;
    const multiple = Number(step.selection?.max || 1) > 1;
    if (!multiple) {
      state.builder.selections[stepId] = target.value;
      if (stepId === "base") {
        const mood = state.builder.selections.mood;
        state.builder.selections = { base: target.value, mood, "fruit-flavor": [], texture: null, sauce: [], topping: [], boost: [] };
      }
    } else {
      const current = Array.isArray(state.builder.selections[stepId]) ? state.builder.selections[stepId] : [];
      if (target.checked) {
        if (current.length >= Number(step.selection.max)) {
          target.checked = false;
          toast("Selection limit reached", `Choose up to ${step.selection.max} in this step.`);
          return;
        }
        state.builder.selections[stepId] = [...current, target.value];
      } else state.builder.selections[stepId] = current.filter((id) => id !== target.value);
    }
    render({ preserveScroll: true });
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  if (target.dataset.filter === "query") {
    state.menuFilters.query = target.value;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => render({ preserveScroll: true, focus: "#menu-search" }), 120);
  } else if (target.dataset.productInstructions) {
    const product = data.productById.get(target.dataset.productInstructions);
    if (product) ensureProductDraft(product, data, state).instructions = target.value;
  } else if (target.hasAttribute("data-builder-name")) {
    state.builder.name = target.value;
  } else if (target.dataset.checkoutField === "promoCode") {
    state.checkout.promoCode = target.value;
    state.checkout.quote = null;
    state.checkout.idempotencyKey = "";
  } else if (target.dataset.addressField) {
    state.checkout.address[target.dataset.addressField] = target.value;
    state.checkout.deliveryCheck = null;
    state.checkout.idempotencyKey = "";
  } else if (target.dataset.contactField) {
    state.checkout.contact[target.dataset.contactField] = target.value;
    state.checkout.idempotencyKey = "";
  }
});

document.addEventListener("submit", async (event) => {
  const loginForm = event.target.closest("[data-login-form]");
  if (loginForm) {
    event.preventDefault();
    const values = new FormData(loginForm);
    try {
      const payload = await accountApi.login({ email: String(values.get("email") || ""), password: String(values.get("password") || "") });
      applyAccountSession(payload);
      applyAccountDashboard(await accountApi.dashboard());
      render();
      toast("Welcome back", state.account.profile.name || "Your account is ready.");
    } catch (error) {
      toast("Sign in failed", errorMessage(error));
    }
    return;
  }

  const registerForm = event.target.closest("[data-register-form]");
  if (registerForm) {
    event.preventDefault();
    const values = new FormData(registerForm);
    const type = String(values.get("type") || state.accountIntent || "regular");
    try {
      const payload = await accountApi.register({
        name: String(values.get("name") || ""),
        email: String(values.get("email") || ""),
        password: String(values.get("password") || ""),
        birthday: String(values.get("birthday") || ""),
        type
      });
      applyAccountSession(payload);
      applyAccountDashboard(await accountApi.dashboard());
      render();
      toast("Account created", `${modes[state.mode].label} experience is ready.`);
    } catch (error) {
      toast("Account could not be created", errorMessage(error));
    }
    return;
  }
  const studentForm = event.target.closest("[data-student-verification-form]");
  if (studentForm) {
    event.preventDefault();
    if (!studentForm.checkValidity()) { studentForm.reportValidity(); return; }
    const values = new FormData(studentForm);
    try {
      const result = await accountApi.requestStudentVerification({
        schoolEmail: String(values.get("schoolEmail") || ""),
        institution: String(values.get("institution") || "")
      }, state.account.csrfToken);
      state.account.student = result.student;
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Student verification submitted", "Your account benefits stay unchanged until verification is approved.");
    } catch (error) { toast("Verification could not be submitted", errorMessage(error)); }
    return;
  }

  const businessForm = event.target.closest("[data-business-form]");
  if (businessForm) {
    event.preventDefault();
    if (!businessForm.checkValidity()) { businessForm.reportValidity(); return; }
    const values = new FormData(businessForm);
    try {
      const result = await accountApi.updateBusiness({
        company: String(values.get("company") || ""),
        role: String(values.get("role") || ""),
        recurringCadence: String(values.get("recurringCadence") || "")
      }, state.account.csrfToken);
      state.account.business = result.business;
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Business profile submitted", "Benefits remain inactive until the business profile is approved.");
    } catch (error) { toast("Business profile did not update", errorMessage(error)); }
    return;
  }

  const profileForm = event.target.closest("[data-profile-form]");
  if (profileForm) {
    event.preventDefault();
    if (!profileForm.checkValidity()) { profileForm.reportValidity(); return; }
    const values = new FormData(profileForm);
    try {
      const result = await accountApi.updateProfile({
        name: String(values.get("name") || ""),
        phone: String(values.get("phone") || ""),
        birthday: String(values.get("birthday") || "")
      }, state.account.csrfToken);
      applyAccountSession({ authenticated: true, account: result.account, csrfToken: state.account.csrfToken });
      applyAccountDashboard(await accountApi.dashboard());
      render({ preserveScroll: true });
      toast("Profile updated");
    } catch (error) { toast("Profile did not update", errorMessage(error)); }
    return;
  }

  const addressForm = event.target.closest("[data-address-form]");
  if (addressForm) {
    event.preventDefault();
    if (!addressForm.checkValidity()) { addressForm.reportValidity(); return; }
    const values = new FormData(addressForm);
    try {
      await accountApi.saveAddress({
        label: String(values.get("label") || ""),
        street: String(values.get("street") || ""),
        city: String(values.get("city") || ""),
        state: String(values.get("state") || ""),
        postalCode: String(values.get("postalCode") || "")
      }, state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      addressForm.reset();
      render({ preserveScroll: true });
      toast("Address saved");
    } catch (error) { toast("Address did not save", errorMessage(error)); }
    return;
  }

  const reservationForm = event.target.closest("[data-reservation-form]");
  if (reservationForm) {
    event.preventDefault();
    if (!reservationForm.checkValidity()) { reservationForm.reportValidity(); return; }
    const values = new FormData(reservationForm);
    try {
      await accountApi.createReservation({
        purpose: String(values.get("purpose") || ""),
        date: String(values.get("date") || ""),
        startTime: String(values.get("startTime") || ""),
        durationMinutes: Number(values.get("durationMinutes") || 0),
        partySize: Number(values.get("partySize") || 0),
        organization: String(values.get("organization") || ""),
        notes: String(values.get("notes") || "")
      }, state.account.csrfToken);
      applyAccountDashboard(await accountApi.dashboard());
      reservationForm.reset();
      render({ preserveScroll: true });
      toast("Reservation request saved", "It is requested, not confirmed, until the team approves it.");
    } catch (error) { toast("Reservation request did not save", errorMessage(error)); }
    return;
  }

  if (!(event.target instanceof HTMLFormElement) || event.target.id !== "catering-request") return;
  event.preventDefault();
  if (!event.target.checkValidity()) {
    event.target.reportValidity();
    return;
  }
  state.cateringSuccess = false;
  const values = new FormData(event.target);
  try {
    const result = await cateringApi.createRequest({
      contactName: String(values.get("contactName") || ""),
      organization: String(values.get("organization") || ""),
      email: String(values.get("email") || ""),
      phone: String(values.get("phone") || ""),
      eventDate: String(values.get("eventDate") || ""),
      serviceTime: String(values.get("serviceTime") || ""),
      guestCount: Number(values.get("guestCount") || 0),
      serviceMode: String(values.get("serviceMode") || ""),
      venueAddress: {
        street: String(values.get("venueStreet") || ""),
        city: String(values.get("venueCity") || ""),
        state: String(values.get("venueState") || ""),
        postalCode: String(values.get("venuePostalCode") || "")
      },
      packageInterest: values.getAll("packageInterest").map(String),
      budgetRange: String(values.get("budgetRange") || ""),
      dietaryAllergenNotes: String(values.get("dietaryAllergenNotes") || ""),
      taxExemptRequest: values.get("taxExemptRequest") === "on",
      customBrandingRequest: values.get("customBrandingRequest") === "on",
      notes: String(values.get("notes") || ""),
      contactConsent: values.get("contactConsent") === "on"
    });
    state.cateringSuccess = true;
    state.cateringEmail = String(values.get("email") || "");
    state.cateringReference = result.request?.reference || "";
    if (state.account.signedIn) {
      try { applyAccountDashboard(await accountApi.dashboard()); } catch { /* Request is saved even if dashboard refresh fails. */ }
    }
    render({ preserveScroll: true });
    toast("Catering request saved", state.cateringReference || "The team can now review your request.");
  } catch (error) {
    state.cateringSuccess = false;
    toast("Catering request did not save", errorMessage(error));
  }
});

for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

window.addEventListener("hashchange", () => render());
window.addEventListener("popstate", () => render());

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="/"]');
  if (!link || link.dataset.action || link.target === "_blank" || link.hasAttribute("download")) return;
  const target = new URL(link.href, window.location.origin);
  if (target.origin !== window.location.origin) return;
  event.preventDefault();
  navigate(`${target.pathname}${target.search}${target.hash}`);
});
window.addEventListener("scroll", () => elements.header.classList.toggle("is-scrolled", window.scrollY > 12), { passive: true });

hydrateIcons(document);

try {
  const [loadedData, runtimeConfig] = await Promise.all([
    loadProjectData(),
    orderingApi.config().catch(() => null)
  ]);
  data = loadedData;
  state.runtimeConfig = runtimeConfig;
  migrateStage05Cart();
  await refreshAccountSession();
  render();
} catch (error) {
  console.error(error);
  elements.loader.hidden = true;
  elements.app.hidden = false;
  elements.app.innerHTML = `
    <section class="section"><div class="container"><div class="empty-state"><span class="empty-state__icon">!</span><h1 style="font-size:3rem">The menu did not load.</h1><p>Please refresh the page. If the problem continues, try again shortly.</p></div></div></section>`;
}
