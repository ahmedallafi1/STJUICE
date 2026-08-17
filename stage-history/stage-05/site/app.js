import { escapeHtml, hydrateIcons, loadProjectData, productImage, routeInfo, titleCase } from "./lib/core.js";
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
  mode: "stjuice-stage05-mode",
  service: "stjuice-stage05-service",
  cart: "stjuice-stage05-cart"
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
    // The prototype still works when storage is unavailable.
  }
}

const savedMode = readStorage(storageKeys.mode, "guest");
const savedService = readStorage(storageKeys.service, "pickup");

const state = {
  mode: modes[savedMode] ? savedMode : "guest",
  service: ["pickup", "delivery", "dine_in"].includes(savedService) ? savedService : "pickup",
  cart: readStorage(storageKeys.cart, []),
  menuFilters: { query: "", category: "all", mood: "all", occasion: "all", channel: "all" },
  productDrafts: {},
  builder: {
    step: 0,
    selections: { base: null, mood: null, "fruit-flavor": [], texture: null, sauce: [], topping: [], boost: [] },
    name: ""
  },
  cateringSuccess: false,
  cateringEmail: ""
};

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
    "/states": "Interface States"
  };
  return `${labels[path] || titleCase(path.split("/").pop() || "Page")} — ST. JUICE`;
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
  document.title = routeTitle(route.path);

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
  writeStorage(storageKeys.cart, state.cart);
  updateShell();
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
    for (const id of selectedIds) {
      const option = group?.options?.find((item) => item.id === id);
      if (option) names.push(option.name);
    }
  }
  return names;
}

function addCartItem(item) {
  const existing = state.cart.find((cartItem) => cartItem.key === item.key);
  if (existing) existing.quantity += item.quantity;
  else state.cart.push(item);
  persistCart();
  toast(`${item.name} added`, `${item.sizeLabel || "Custom build"} · Bag saved on this device`);
}

function addProduct(productId) {
  const product = data.productById.get(productId);
  if (!product) return;
  const draft = ensureProductDraft(product, data, state);
  const size = product.sizes.find((item) => item.id === draft.sizeId) || product.sizes[0];
  const modifiers = modifierNames(product, draft);
  const signature = JSON.stringify([product.id, size?.id, Object.entries(draft.modifiers || {}).sort()]);
  addCartItem({
    key: signature,
    productId: product.id,
    name: product.name,
    image: productImage(product),
    sizeLabel: size?.label,
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
    key: signature,
    productId: "build-your-mood",
    name,
    image: "../media/optimized/webp/products/pistachio-saint-concept-v1.webp",
    sizeLabel: base.name,
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

document.addEventListener("click", (event) => {
  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) return;
  const action = actionElement.dataset.action;

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
    window.location.hash = "/menu";
    requestAnimationFrame(() => document.querySelector("#menu-search")?.focus());
  } else if (action === "set-mode") {
    const mode = actionElement.dataset.mode;
    if (!modes[mode]) return;
    state.mode = mode;
    writeStorage(storageKeys.mode, mode);
    closeDialog(elements.accountDialog);
    render({ preserveScroll: true });
    toast(`${modes[mode].label} mode is on`, modes[mode].detail);
  } else if (action === "set-service") {
    const service = actionElement.dataset.service;
    if (!["pickup", "delivery", "dine_in"].includes(service)) return;
    state.service = service;
    writeStorage(storageKeys.service, service);
    closeDialog(elements.serviceDialog);
    render({ preserveScroll: true });
    toast(`${titleCase(service)} selected`, service === "delivery" ? "Address eligibility connects in Stage 06." : "11 S Vandeventer Ave");
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
    toast("Cart is ready for Stage 06", "Payment, tax, fees, scheduling and order submission are intentionally not live yet.");
  } else if (action === "prefill-catering") {
    const select = document.querySelector("#package-interest");
    if (select) select.value = actionElement.dataset.package || "";
    document.querySelector("#catering-form")?.scrollIntoView({ behavior: "smooth" });
  }
});

document.addEventListener("change", (event) => {
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

  if (target.dataset.productModifier) {
    const product = data.productById.get(target.dataset.productId);
    const group = data.modifierById.get(target.dataset.productModifier);
    if (!product || !group) return;
    const draft = ensureProductDraft(product, data, state);
    const current = draft.modifiers[group.id] || [];
    if (target.type === "radio") draft.modifiers[group.id] = [target.value];
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
  }
});

document.addEventListener("submit", (event) => {
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== "catering-request") return;
  event.preventDefault();
  if (!event.target.checkValidity()) {
    event.target.reportValidity();
    return;
  }
  const formData = new FormData(event.target);
  state.cateringEmail = String(formData.get("email") || "your email");
  state.cateringSuccess = true;
  render({ preserveScroll: true });
  toast("Catering request preview complete", "This Stage 05 prototype did not transmit personal data.");
});

for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

window.addEventListener("hashchange", () => render());
window.addEventListener("scroll", () => elements.header.classList.toggle("is-scrolled", window.scrollY > 12), { passive: true });

hydrateIcons(document);

try {
  data = await loadProjectData();
  render();
} catch (error) {
  console.error(error);
  elements.loader.hidden = true;
  elements.app.hidden = false;
  elements.app.innerHTML = `
    <section class="section"><div class="container"><div class="empty-state"><span class="empty-state__icon">!</span><h1 style="font-size:3rem">The catalog did not load.</h1><p>Run this prototype through <code>node site/serve.mjs</code> from the cumulative package. No order or payment was attempted.</p></div></div></section>`;
}
