import {
  buildProductCard,
  categoryImage,
  escapeHtml,
  icon,
  mediaBadge,
  money,
  productImage,
  productStartingPrice,
  titleCase,
  uniqueValues
} from "./core.js";
import { accountView } from "./account.js";

export const modes = {
  guest: {
    label: "Guest",
    short: "Guest mode",
    theme: "default",
    icon: "spark",
    announcement: "Open daily on Vandeventer · Pickup and delivery available.",
    line: "Browse the full menu and checkout without an account.",
    detail: "No sign-in required. Your cart and service choice stay on this device."
  },
  regular: {
    label: "Regular",
    short: "Regular mode",
    theme: "default",
    icon: "heart",
    announcement: "Your favorites, rewards preview and faster reorder—in one mood.",
    line: "Save favorites, collect rewards and reorder faster.",
    detail: "Sign in to save favorites, mixes and member activity to your account."
  },
  student: {
    label: "Student",
    short: "Student mode",
    theme: "student",
    icon: "spark",
    announcement: "Student mode · Study-night picks and eligible offers up front.",
    line: "Study-night boxes, student-value picks and verification planning.",
    detail: "No university sponsorship or affiliation is implied."
  },
  business: {
    label: "Business & Catering",
    short: "Business mode",
    theme: "business",
    icon: "calendar",
    announcement: "Business mode · Group orders, recurring events and catering tools.",
    line: "Plan group orders, save event details and request a quote.",
    detail: "Rates, delivery and service terms remain subject to confirmation."
  }
};

export const serviceModes = {
  pickup: { label: "Pickup", icon: "pickup", detail: "Pick up on Vandeventer" },
  delivery: { label: "Delivery", icon: "delivery", detail: "Delivery availability is confirmed during checkout" },
  dine_in: { label: "Dine in", icon: "dine", detail: "Enjoy it at the shop" }
};

function pageHero(eyebrow, title, intro, actions = "") {
  return `
    <section class="page-hero">
      <div class="container page-hero__inner">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="lede">${escapeHtml(intro)}</p>
        ${actions ? `<div class="button-row" style="margin-top:1.5rem">${actions}</div>` : ""}
      </div>
    </section>`;
}

function categoryCards(data, limit = 12) {
  return data.catalog.categories.slice(0, limit).map((category) => `
    <a class="category-card" href="#/menu?category=${escapeHtml(category.id)}">
      <div class="category-card__image">
        ${mediaBadge()}
        <img src="${categoryImage(category.id)}" alt="Concept scene for ${escapeHtml(category.name)}" loading="lazy" width="360" height="360" />
      </div>
      <h3>${escapeHtml(category.name)}</h3>
    </a>`).join("");
}

function modeRibbon(state) {
  const mode = modes[state.mode];
  return `
    <div class="mode-ribbon">
      <div class="container mode-ribbon__inner">
        <div class="mode-ribbon__copy">
          <span class="mode-ribbon__badge">${escapeHtml(mode.label)}</span>
          <span>${escapeHtml(mode.line)}</span>
        </div>
        <button class="button button--outline button--small" type="button" data-action="open-account">Switch experience</button>
      </div>
    </div>`;
}

function renderHome({ data, state }) {
  const copy = data.copy;
  const drops = copy.drops.activeProductIds.map((id) => data.productById.get(id)).filter(Boolean);
  const featured = [...data.catalog.products]
    .filter((product) => product.catalogRole === "primary" && Number.isFinite(product.featuredRank))
    .sort((a, b) => a.featuredRank - b.featuredRank)
    .slice(0, 6);
  const boxes = data.bundles.orderNowBoxes
    .map((box) => data.productById.get(box.productId))
    .filter(Boolean)
    .slice(0, 3);

  const modeFeature = {
    guest: { eyebrow: "YOUR FIRST POUR", title: "Start with the craving.", body: "Explore the full menu, build your mood and check out as a guest whenever online ordering opens." },
    regular: { eyebrow: "YOUR ST. JUICE", title: "Your favorites, one tap away.", body: "Keep favorites, saved mixes and recent orders together under your account." },
    student: { eyebrow: "STUDENT EXPERIENCE", title: "Study fuel. Sweet breaks. Your lane.", body: "A focused blue-and-white experience built around value, group study moments and easy repeat ordering." },
    business: { eyebrow: "BUSINESS EXPERIENCE", title: "Bring the whole room into it.", body: "Move from office drops to catering requests with a darker, polished workspace built for groups." }
  }[state.mode];

  return `
    ${modeRibbon(state)}
    <section class="hero">
      <picture>
        <source media="(max-width: 760px)" srcset="../media/optimized/webp/hero/st-juice-hero-960.webp" />
        <img class="hero__image" src="../media/optimized/webp/hero/st-juice-hero-1600.webp" alt="ST. JUICE drinks and desserts" width="1599" height="900" fetchpriority="high" />
      </picture>
      <div class="hero__veil" aria-hidden="true"></div>
      <div class="hero__content">
        <div class="hero__copy">
          <p class="eyebrow">${escapeHtml(copy.home.hero.eyebrow)}</p>
          <h1>${escapeHtml(copy.home.hero.headline)}</h1>
          <p class="hero__body">${escapeHtml(copy.home.hero.body)}</p>
          <div class="button-row">
            <a class="button" href="#/menu">${escapeHtml(copy.home.hero.primaryCta)}</a>
            <a class="button button--outline" href="#/build">${escapeHtml(copy.home.hero.secondaryCta)}</a>
          </div>
          <div class="hero__meta">
            <span>Open from 6:30 AM</span>
            <span>Dine-in · Pickup · Delivery</span>
            <span>11 S Vandeventer Ave</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section--tight">
      <div class="container service-cards" aria-label="Choose service method">
        ${Object.entries(serviceModes).map(([id, service]) => `
          <button class="service-card ${state.service === id ? "is-active" : ""}" type="button" data-action="set-service" data-service="${id}">
            <span class="service-card__icon">${icon(service.icon)}</span>
            <span><h3>${escapeHtml(service.label)}</h3><p>${escapeHtml(service.detail)}</p></span>
            ${icon("arrow")}
          </button>`).join("")}
      </div>
    </section>

    <section class="section section--cream">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">NEW AT ST. JUICE</p><h2>Try what just dropped.</h2><p class="lede">Limited releases and new combinations live here first.</p></div>
          <a class="text-link" href="#/drops">Explore New Drops ${icon("arrow")}</a>
        </div>
        <div class="feature-grid">
          ${drops.map((product) => `
            <article class="feature-card">
              <img src="${productImage(product)}" alt="${escapeHtml(product.name)}" loading="lazy" width="720" height="900" />
              <div class="feature-card__content">
                <p class="eyebrow">NEW DROP</p>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.description)}</p>
                <a class="button button--light button--small" href="#/product/${escapeHtml(product.id)}">View drop</a>
              </div>
            </article>`).join("")}
          <article class="feature-card">
            <img src="../media/optimized/webp/packaging/birthday-box-concept-v1.webp" alt="ST. JUICE Birthday Box" loading="lazy" width="720" height="900" />
            <div class="feature-card__content">
              <p class="eyebrow">FOR THE GROUP</p>
              <h3>Bring the whole table.</h3>
              <p>Study nights, birthdays and office runs get a format of their own.</p>
              <a class="button button--light button--small" href="#/boxes">Explore Party Boxes</a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="section section--surface">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">SHOP THE MENU</p><h2>Juice, dessert and everything between.</h2><p class="lede">Start by category or search the full menu when you already know the mood.</p></div>
          <a class="button button--outline" href="#/menu">See full menu</a>
        </div>
        <div class="category-grid">${categoryCards(data)}</div>
      </div>
    </section>

    <section class="section section--cream">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">ST. JUICE SIGNATURES</p><h2>${escapeHtml(copy.home.signatures.headline)}</h2><p class="lede">${escapeHtml(copy.home.signatures.body)}</p></div>
          <a class="text-link" href="#/menu?category=signatures">Shop signatures ${icon("arrow")}</a>
        </div>
        <div class="product-grid">${featured.map((product, index) => buildProductCard(product, data, { eager: index < 2 })).join("")}</div>
      </div>
    </section>

    <section class="section section--surface">
      <div class="container split-feature">
        <div class="split-feature__copy">
          <p class="eyebrow">BUILD YOUR MOOD</p>
          <h2>${escapeHtml(copy.home.builder.headline)}</h2>
          <p class="lede">${escapeHtml(copy.home.builder.body)}</p>
          <div class="button-row"><a class="button" href="#/build">${escapeHtml(copy.home.builder.cta)}</a></div>
        </div>
        <div class="split-feature__media">
          <img src="../media/motion/st-juice-hero-loop.svg" alt="ST. JUICE Build Your Mood artwork" loading="lazy" width="1600" height="900" />
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">${escapeHtml(modeFeature.eyebrow)}</p><h2>${escapeHtml(modeFeature.title)}</h2><p class="lede">${escapeHtml(modeFeature.body)}</p></div>
          <button class="button" type="button" data-action="open-account">${state.account?.signedIn ? "Manage experience" : "Create your account"}</button>
        </div>
        <div class="account-showcase">
          <img src="../media/optimized/webp/account-modes/account-modes-concept-v1.webp" alt="Regular, Student and Business ST. JUICE experiences" loading="lazy" width="1400" height="700" />
          <div class="account-showcase__overlay">
            <div class="account-showcase__copy">
              <p class="eyebrow">ONE MENU · YOUR EXPERIENCE</p>
              <h2>Guest, Regular, Student or Business.</h2>
              <p>Guest stays simple. Member experiences unlock account-based shortcuts and, as they launch, account-specific benefits.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--cream">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">PARTY BOXES</p><h2>${escapeHtml(copy.boxes.title)}</h2><p class="lede">${escapeHtml(copy.boxes.intro)}</p></div>
          <a class="button button--outline" href="#/boxes">Explore boxes</a>
        </div>
        <div class="product-grid">${boxes.map((product) => buildProductCard(product, data)).join("")}</div>
      </div>
    </section>

    <section class="section section--dark">
      <div class="container">
        <div class="section-heading"><div><p class="eyebrow">WHY ST. JUICE</p><h2>Fresh early. Sweet late. Built for the whole day.</h2></div></div>
        <div class="principle-grid">
          <article class="principle-card"><span class="principle-card__number">01</span><h3>Fresh starts early.</h3><p>Juices, smoothies, protein-ready blends and bowls begin at 6:30 AM.</p></article>
          <article class="principle-card"><span class="principle-card__number">02</span><h3>Dessert owns the night.</h3><p>Crepes, chocolate, mini pancakes, pistachio and new drops carry the late shift.</p></article>
          <article class="principle-card"><span class="principle-card__number">03</span><h3>Groups have their own lane.</h3><p>Party Boxes and catering make the bigger order feel just as intentional as the single cup.</p></article>
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="container location-layout">
        <div class="location-card">
          <p class="eyebrow">VANDEVENTER</p>
          <h2>${escapeHtml(copy.home.location.headline)}</h2>
          <div class="location-card__facts">
            <div class="location-fact"><span class="location-fact__icon">${icon("pin")}</span><div><strong>${escapeHtml(copy.home.location.address)}</strong><span>St. Louis, Missouri</span></div></div>
            <div class="location-fact"><span class="location-fact__icon">${icon("clock")}</span><div><strong>${escapeHtml(copy.home.location.hours)}</strong><span>Open daily</span></div></div>
            <div class="location-fact"><span class="location-fact__icon">${icon("pickup")}</span><div><strong>Dine-in · Pickup · Delivery</strong><span>Choose the handoff that fits the day.</span></div></div>
          </div>
          <a class="button" href="#/location">Location & hours</a>
        </div>
        <div class="map-card" aria-label="ST. JUICE location">
          <div class="map-pin"><img src="../brand/assets/logos/st-juice-fruit-mark.svg" alt="" /></div>
          <div class="map-card__label"><strong>11 S Vandeventer Ave</strong><br /><span>St. Louis, Missouri</span></div>
        </div>
      </div>
    </section>`;
}

function renderMenu({ data, state }) {
  const filters = state.menuFilters;
  const query = filters.query.trim().toLowerCase();
  const products = data.catalog.products.filter((product) => {
    const haystack = [product.name, product.description, ...(product.draftIngredients || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (filters.category === "all" || product.categoryId === filters.category)
      && (filters.mood === "all" || (product.moods || []).includes(filters.mood))
      && (filters.occasion === "all" || (product.occasions || []).includes(filters.occasion))
      && (filters.channel === "all" || (product.availability?.channels || []).includes(filters.channel));
  });

  const moods = uniqueValues(data.catalog.products, "moods");
  const occasions = uniqueValues(data.catalog.products, "occasions");
  const categoryLabel = filters.category === "all" ? "All menu" : data.categoryById.get(filters.category)?.name || "All menu";

  return `
    ${pageHero("THE FULL CATALOG", data.copy.menu.title, data.copy.menu.intro)}
    <section class="section section--surface">
      <div class="container">
        <div class="section-heading"><div><p class="eyebrow">12 WAYS IN</p><h2>Shop by category.</h2></div></div>
        <div class="category-grid">${categoryCards(data)}</div>
      </div>
    </section>
    <div class="filter-shell">
      <div class="container filter-shell__inner">
        <div class="search-row">
          <label class="search-field-wrap">
            <span data-icon="search" aria-hidden="true"></span>
            <span class="sr-only">Search menu</span>
            <input class="search-field" id="menu-search" type="search" value="${escapeHtml(filters.query)}" placeholder="${escapeHtml(data.copy.menu.searchPlaceholder)}" data-filter="query" autocomplete="off" />
          </label>
          <select class="field" data-filter="category" aria-label="Filter by category">
            <option value="all">All categories</option>
            ${data.catalog.categories.map((category) => `<option value="${escapeHtml(category.id)}" ${filters.category === category.id ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("")}
          </select>
          <select class="field" data-filter="mood" aria-label="Filter by mood">
            <option value="all">Every mood</option>
            ${moods.map((mood) => `<option value="${escapeHtml(mood)}" ${filters.mood === mood ? "selected" : ""}>${escapeHtml(titleCase(mood))}</option>`).join("")}
          </select>
          <select class="field" data-filter="occasion" aria-label="Filter by occasion">
            <option value="all">Every occasion</option>
            ${occasions.map((occasion) => `<option value="${escapeHtml(occasion)}" ${filters.occasion === occasion ? "selected" : ""}>${escapeHtml(titleCase(occasion))}</option>`).join("")}
          </select>
          <span class="filter-result-count">${products.length} results</span>
        </div>
        <div class="chip-row" style="margin-top:.7rem">
          <button class="chip ${filters.channel === "all" ? "is-active" : ""}" type="button" data-action="set-channel" data-channel="all">All service modes</button>
          <button class="chip ${filters.channel === "pickup" ? "is-active" : ""}" type="button" data-action="set-channel" data-channel="pickup">Pickup friendly</button>
          <button class="chip ${filters.channel === "delivery" ? "is-active" : ""}" type="button" data-action="set-channel" data-channel="delivery">Delivery friendly</button>
          <button class="chip" type="button" data-action="clear-filters">Clear filters</button>
        </div>
      </div>
    </div>
    <section class="menu-results">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">${escapeHtml(categoryLabel)}</p><h2>${products.length ? `${products.length} ways to set it.` : "No match yet."}</h2></div>
        </div>
        ${products.length ? `<div class="product-grid">${products.map((product) => buildProductCard(product, data)).join("")}</div>` : `
          <div class="empty-state">
            <span class="empty-state__icon">${icon("search")}</span>
            <h2>Nothing matches every filter.</h2>
            <p>${escapeHtml(data.copy.menu.noResults)}</p>
            <button class="button" type="button" data-action="clear-filters">Clear filters</button>
          </div>`}
      </div>
    </section>`;
}

function productGroupOptions(group, data) {
  if (group?.options?.length) return group.options;
  const reused = data.modifierById.get(group?.reuseOptionsFrom)?.options;
  if (reused?.length) return reused;
  return (group?.eligibleProductIds || []).map((id) => data.productById.get(id)).filter(Boolean).map((item) => ({ id: item.id, name: item.name, allergenAdds: item.containsAllergens || [] }));
}

function productModifierPrice(group, option, position) {
  if (Number.isFinite(Number(option.price))) return Number(option.price);
  if (position < Number(group.selection?.included || 0)) return 0;
  if (option.tier === "premium" && group.pricing?.premiumAfterIncluded != null) return Number(group.pricing.premiumAfterIncluded);
  return Number(group.pricing?.standardAfterIncluded || group.pricing?.eachAfterIncluded || 0);
}

function productModifierPriceLabel(group, option) {
  if (Number.isFinite(Number(option.price))) return Number(option.price) ? `+${money(option.price)}` : "Included";
  const afterIncluded = option.tier === "premium" ? group.pricing?.premiumAfterIncluded : group.pricing?.standardAfterIncluded;
  if (afterIncluded != null) return `After included +${money(afterIncluded)}`;
  return "Included / selection-based";
}

export function ensureProductDraft(product, data, state) {
  if (!state.productDrafts[product.id]) {
    const modifiers = {};
    for (const groupId of product.modifierGroupIds || []) {
      const group = data.modifierById.get(groupId);
      const options = productGroupOptions(group, data);
      if (group?.selection?.min > 0 && options.length) {
        modifiers[groupId] = Array.from({ length: Number(group.selection.min) }, (_, index) => options[index % options.length].id);
      }
    }
    state.productDrafts[product.id] = {
      sizeId: product.sizes[0]?.id,
      modifiers,
      instructions: ""
    };
  }
  return state.productDrafts[product.id];
}

export function calculateProductPrice(product, draft, data) {
  const size = product.sizes.find((item) => item.id === draft.sizeId) || product.sizes[0];
  let total = Number(size?.price || 0);
  for (const [groupId, selectedIds] of Object.entries(draft.modifiers || {})) {
    const group = data.modifierById.get(groupId);
    const options = productGroupOptions(group, data);
    for (const [position, selectedId] of selectedIds.entries()) {
      const option = options.find((item) => item.id === selectedId);
      if (option) total += productModifierPrice(group, option, position);
    }
  }
  return Math.round(total * 100) / 100;
}

function productModifierGroups(product, draft, data) {
  return (product.modifierGroupIds || []).map((groupId) => data.modifierById.get(groupId)).filter(Boolean).map((group) => {
    const selection = draft.modifiers[group.id] || [];
    const options = productGroupOptions(group, data);
    if (!options.length) {
      return `<div class="info-panel"><h3>${escapeHtml(group.name)}</h3><p>This group uses catalog-dependent choices. The final selector connects with live availability in the ordering stage.</p></div>`;
    }
    if (group.display === "product_reference" && group.selection?.allowDuplicates) {
      return `<fieldset class="choice-group"><legend>${escapeHtml(group.name)} <span class="choice-group__hint">Required ${group.selection.min} · up to ${group.selection.max}</span></legend><div class="choice-list choice-list--grid">${options.map((option) => {
        const count = selection.filter((id) => id === option.id).length;
        return `<label class="choice-option"><span class="choice-option__name">${escapeHtml(option.name)}</span><input class="field reference-count" type="number" min="0" max="${group.selection.max}" value="${count}" data-product-modifier="${escapeHtml(group.id)}" data-product-reference="${escapeHtml(option.id)}" data-product-id="${escapeHtml(product.id)}" aria-label="Quantity of ${escapeHtml(option.name)}" /></label>`;
      }).join("")}</div></fieldset>`;
    }
    const multiple = group.selection?.max > 1;
    return `
      <fieldset class="choice-group">
        <legend>${escapeHtml(group.name)} <span class="choice-group__hint">${group.selection?.min ? "Required" : "Optional"} · up to ${group.selection?.max || 1}</span></legend>
        <div class="choice-list ${group.options.length > 3 ? "choice-list--grid" : ""}">
          ${options.map((option) => `
            <label class="choice-option">
              <input type="${multiple ? "checkbox" : "radio"}" name="modifier-${escapeHtml(product.id)}-${escapeHtml(group.id)}" value="${escapeHtml(option.id)}" data-product-modifier="${escapeHtml(group.id)}" data-product-id="${escapeHtml(product.id)}" ${selection.includes(option.id) ? "checked" : ""} />
              <span class="choice-option__name">${escapeHtml(option.name)}</span>
              <span class="choice-option__price">${escapeHtml(productModifierPriceLabel(group, option))}</span>
            </label>`).join("")}
        </div>
      </fieldset>`;
  }).join("");
}

function renderProduct(productId, { data, state }) {
  state.account ||= { signedIn: false, favorites: [], savedMixes: [], orderHistory: [], points: 0, profile: {}, student: {}, business: {} };
  const product = data.productById.get(productId);
  if (!product) return renderNotFound();
  const draft = ensureProductDraft(product, data, state);
  const size = product.sizes.find((item) => item.id === draft.sizeId) || product.sizes[0];
  const total = calculateProductPrice(product, draft, data);
  const category = data.categoryById.get(product.categoryId);
  const pairings = (product.pairingIds || []).map((id) => data.productById.get(id)).filter(Boolean).slice(0, 4);
  const alternatives = (product.alternativeIds || []).map((id) => data.productById.get(id)).filter(Boolean).slice(0, 4);
  const channels = (product.availability?.channels || []).map(titleCase);
  const prep = product.prepTimeMinutes?.min && product.prepTimeMinutes?.max
    ? `${product.prepTimeMinutes.min}–${product.prepTimeMinutes.max} min`
    : "Made to order";

  return `
    <section class="product-page">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/menu">Menu</a><span>/</span><a href="#/menu?category=${escapeHtml(product.categoryId)}">${escapeHtml(category?.name || "Category")}</a><span>/</span><span aria-current="page">${escapeHtml(product.name)}</span></nav>
        <div class="product-detail">
          <div class="product-detail__media">
            <div class="product-detail__image">
              <img src="${productImage(product)}" alt="${escapeHtml(product.name)}" width="720" height="900" fetchpriority="high" />
            </div>
            <div class="product-detail__facts">
              <span>${escapeHtml(prep)}</span>
              ${channels.map((channel) => `<span>${escapeHtml(channel)}</span>`).join("")}
              ${product.catalogRole === "group_format" ? "<span>Group format</span>" : "<span>Made to order</span>"}
            </div>
          </div>

          <div class="product-detail__copy">
            <p class="eyebrow">${escapeHtml(category?.name || "ST. JUICE")}</p>
            <h1>${escapeHtml(product.name)}</h1>
            <p class="product-detail__description">${escapeHtml(product.description)}</p>
            <div class="product-detail__price">${money(total)}</div>

            <fieldset class="choice-group">
              <legend>Choose your size <span class="choice-group__hint">Required</span></legend>
              <div class="choice-list choice-list--grid">
                ${product.sizes.map((option) => `
                  <label class="choice-option">
                    <input type="radio" name="product-size" value="${escapeHtml(option.id)}" data-product-size="${escapeHtml(product.id)}" ${size?.id === option.id ? "checked" : ""} />
                    <span class="choice-option__name">${escapeHtml(option.label)}</span>
                    <span class="choice-option__price">${money(option.price)}</span>
                  </label>`).join("")}
              </div>
            </fieldset>

            ${productModifierGroups(product, draft, data)}

            <label class="form-field"><span class="form-field__label">Special instructions</span><textarea class="field" data-product-instructions="${escapeHtml(product.id)}" maxlength="180" placeholder="Keep requests short. Ingredient substitutions are not guaranteed.">${escapeHtml(draft.instructions)}</textarea></label>

            <div class="product-info-grid">
              <div class="info-panel">
                <h3>What's inside</h3>
                <p>${escapeHtml((product.draftIngredients || []).join(" · ") || "Ask the team for the current recipe details.")}</p>
              </div>
              <div class="info-panel">
                <h3>Allergen information</h3>
                <p>${escapeHtml(data.copy.product.allergenNote)}</p>
                <div class="allergen-row">${(product.containsAllergens || []).length ? product.containsAllergens.map((item) => `<span class="allergen-pill">Contains ${escapeHtml(titleCase(item))}</span>`).join("") : `<span class="chip">Cross-contact may still occur</span>`}</div>
              </div>
            </div>

            <div class="product-order-bar">
              <div class="product-order-bar__total"><small>Your item</small><strong>${money(total)}</strong></div>
              <button class="button button--outline" type="button" data-action="toggle-favorite" data-product-id="${escapeHtml(product.id)}">${state.account.favorites.includes(product.id) ? "Saved" : "Save"}</button>
              <button class="button" type="button" data-action="add-product" data-product-id="${escapeHtml(product.id)}">${escapeHtml(data.copy.product.primaryCta)}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
    ${(pairings.length || alternatives.length) ? `
      <section class="section section--surface">
        <div class="container">
          <div class="section-heading"><div><p class="eyebrow">PAIR IT UP</p><h2>Keep the mood going.</h2></div></div>
          <div class="product-grid">${[...pairings, ...alternatives].slice(0, 4).map((item) => buildProductCard(item, data)).join("")}</div>
        </div>
      </section>` : ""}`;
}

function builderStepOptions(step, data, state) {
  if (step.options) return step.options;
  const reference = step.reuseOptionsFrom?.split("#")[1];
  return data.modifierById.get(reference)?.options || [];
}

function selectedBuilderIds(state, stepId) {
  const value = state.builder.selections[stepId];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function builderBase(data, state) {
  return data.builder.steps.find((step) => step.id === "base")?.options.find((option) => option.id === state.builder.selections.base);
}

function builderOptionAllowed(step, option, data, state) {
  const base = builderBase(data, state);
  if (step.id === "base" || step.id === "mood") return true;
  if (!base) return false;
  if (option.allowedBaseIds && !option.allowedBaseIds.includes(base.id)) return false;
  if (step.id === "fruit-flavor") return base.allows.some((item) => item === "fruit-flavor" || item === "fruit-dessert");
  if (step.id === "sauce") return base.allows.some((item) => item.startsWith("sauces-"));
  if (step.id === "topping") return base.allows.some((item) => item.startsWith("toppings-"));
  if (step.id === "boost") return !option.allowedBaseIds || option.allowedBaseIds.includes(base.id);
  return true;
}

function builderOptionPrice(step, option, data) {
  if (step.id === "fruit-flavor") return Number(option.priceAfterIncluded || 0);
  if (Number.isFinite(Number(option.price))) return Number(option.price);
  const groupId = step.reuseOptionsFrom?.split("#")[1];
  const pricing = data.modifierById.get(groupId)?.pricing;
  if (option.tier === "premium" && pricing?.premiumAfterIncluded != null) return Number(pricing.premiumAfterIncluded);
  return Number(pricing?.standardAfterIncluded || 0);
}

function includedCount(base, stepId) {
  if (!base) return 0;
  if (stepId === "fruit-flavor") return Number(base.includes?.fruit || base.includes?.produce || 0);
  if (stepId === "sauce") return Number(base.includes?.sauce || 0);
  if (stepId === "topping") return Number(base.includes?.topping || 0);
  return 0;
}

export function calculateBuilderTotal(data, state) {
  const base = builderBase(data, state);
  let total = Number(base?.basePrice || 0);
  for (const step of data.builder.steps) {
    if (["base", "mood", "texture", "review"].includes(step.id)) continue;
    const selected = selectedBuilderIds(state, step.id);
    const free = includedCount(base, step.id);
    const options = builderStepOptions(step, data, state);
    selected.forEach((id, index) => {
      const option = options.find((item) => item.id === id);
      if (option && index >= free) total += builderOptionPrice(step, option, data);
    });
  }
  return Math.round(total * 100) / 100;
}

export function builderAllergens(data, state) {
  const allergens = new Set(builderBase(data, state)?.defaultAllergens || []);
  for (const step of data.builder.steps) {
    const selected = selectedBuilderIds(state, step.id);
    const options = builderStepOptions(step, data, state);
    for (const id of selected) {
      const option = options.find((item) => item.id === id);
      for (const allergen of option?.allergenAdds || []) allergens.add(allergen);
      if (["pistachio-sauce", "roasted-pistachio"].includes(id)) allergens.add("tree_nut");
      if (id === "kataifi-crunch") allergens.add("wheat");
    }
  }
  return [...allergens];
}

function builderSelectionLabel(step, data, state) {
  const selected = selectedBuilderIds(state, step.id);
  const options = builderStepOptions(step, data, state);
  return selected.map((id) => options.find((item) => item.id === id)?.name).filter(Boolean).join(", ");
}

function renderBuilder({ data, state }) {
  state.account ||= { signedIn: false, favorites: [], savedMixes: [], orderHistory: [], points: 0, profile: {}, student: {}, business: {} };
  const stepIndex = state.builder.step;
  const step = data.builder.steps[stepIndex];
  const base = builderBase(data, state);
  const options = builderStepOptions(step, data, state);
  const selected = selectedBuilderIds(state, step.id);
  const allergens = builderAllergens(data, state);
  const total = calculateBuilderTotal(data, state);
  const max = step.selection?.max || 1;
  const compatible = options.filter((option) => builderOptionAllowed(step, option, data, state));
  const isReview = step.id === "review";
  const baseName = base?.name || "No base yet";
  const moodStep = data.builder.steps.find((item) => item.id === "mood");
  const moodName = builderSelectionLabel(moodStep, data, state) || "No mood yet";
  const canNext = !step.required || isReview || selected.length >= Number(step.selection?.min || 0);

  const selectionsMarkup = data.builder.steps
    .filter((item) => !["review"].includes(item.id))
    .map((item) => ({ name: item.name, value: builderSelectionLabel(item, data, state) }))
    .filter((item) => item.value)
    .map((item) => `<div class="builder-summary__line"><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.value)}</strong></div>`)
    .join("");

  const reviewMarkup = `
    <div class="review-stack">
      <label class="form-field"><span class="form-field__label">Name this mood</span><input class="field" type="text" maxlength="30" value="${escapeHtml(state.builder.name)}" data-builder-name placeholder="My Vandeventer mood" /></label>
      <div class="review-card"><h3>Base and mood</h3><p>${escapeHtml(baseName)} · ${escapeHtml(moodName)}</p></div>
      <div class="review-card"><h3>Your choices</h3><p>${escapeHtml(data.builder.steps.filter((item) => !["base", "mood", "review"].includes(item.id)).map((item) => builderSelectionLabel(item, data, state)).filter(Boolean).join(" · ") || "No optional additions selected.")}</p></div>
      <div class="review-card"><h3>Draft allergen set</h3><p>${escapeHtml(allergens.map(titleCase).join(" · ") || "No default allergens listed. Cross-contact remains possible.")}</p></div>
      <div class="review-card"><h3>Quality note</h3><p>${["crepe", "waffle", "mini-pancakes-12", "soft-serve-regular"].includes(base?.id) ? "Warm/frozen quality may change during delivery. Final hold tests remain pending." : "Final delivery quality depends on packaging and operational testing."}</p></div>
      <div class="review-card"><h3>Save status</h3><p>${state.mode === "guest" ? escapeHtml(data.copy.buildYourMood.guestSaveNote) : "Saved mixes are available on this device and activate across devices with production accounts."}</p></div>
    </div>`;

  const optionMarkup = compatible.length ? `
    <div class="builder-options">
      ${options.map((option) => {
        const allowed = builderOptionAllowed(step, option, data, state);
        const active = selected.includes(option.id);
        const optionPrice = step.id === "base" ? option.basePrice : builderOptionPrice(step, option, data);
        const inputType = max > 1 ? "checkbox" : "radio";
        const detail = step.id === "base"
          ? `${money(option.basePrice)} · includes ${Object.entries(option.includes || {}).map(([key, value]) => `${value} ${titleCase(key)}`).join(", ") || "guided choices"}`
          : option.status ? titleCase(option.status) : option.tier ? `${titleCase(option.tier)} option` : "Compatible choice";
        return `
          <label class="choice-option builder-option ${allowed ? "" : "is-disabled"}">
            <input type="${inputType}" name="builder-${escapeHtml(step.id)}" value="${escapeHtml(option.id)}" data-builder-option="${escapeHtml(step.id)}" ${active ? "checked" : ""} ${allowed ? "" : "disabled"} />
            <span class="builder-option__top"><span class="choice-option__name">${escapeHtml(option.name)}</span><span class="choice-option__price">${optionPrice ? `${step.id === "base" ? "" : "+"}${money(optionPrice)}` : "Included"}</span></span>
            <span class="builder-option__detail">${escapeHtml(detail)}</span>
          </label>`;
      }).join("")}
    </div>` : `
      <div class="empty-state" style="min-height:18rem">
        <span class="empty-state__icon">${icon("info")}</span>
        <h3>No compatible choices in this step.</h3>
        <p>This base keeps the current step simple. Continue to the next option.</p>
      </div>`;

  return `
    <div class="builder-page">
      ${pageHero("GUIDED CUSTOMIZATION", data.copy.buildYourMood.title, data.copy.buildYourMood.intro, `<button class="button button--outline" type="button" data-action="reset-builder">Start over</button>`)}
      <div class="container builder-shell">
        <section>
          <div class="builder-progress" aria-label="Builder progress">${data.builder.steps.map((item, index) => `<span class="${index < stepIndex ? "is-complete" : index === stepIndex ? "is-current" : ""}" title="${escapeHtml(item.name)}"></span>`).join("")}</div>
          <div class="builder-card">
            <header class="builder-card__header"><p class="eyebrow">STEP ${stepIndex + 1} OF ${data.builder.steps.length}</p><h2>${escapeHtml(step.name)}</h2><p class="lede">${step.id === "base" ? "Start with the format. Compatibility rules shape every step after this." : step.id === "mood" ? "This guides recommendations without changing base product facts." : isReview ? "Check the live total and allergen impact before adding it." : `Choose up to ${max}. Included choices are calculated from your base.`}</p></header>
            ${isReview ? reviewMarkup : optionMarkup}
            <div class="builder-nav">
              <button class="button button--outline" type="button" data-action="builder-prev" ${stepIndex === 0 ? "disabled" : ""}>Back</button>
              ${isReview
                ? `${state.account.signedIn ? `<button class="button button--outline" type="button" data-action="save-builder-mix" ${base ? "" : "disabled"}>Save mix</button>` : ""}<button class="button" type="button" data-action="builder-add" ${base ? "" : "disabled"}>Add mood · ${money(total)}</button>`
                : `<button class="button" type="button" data-action="builder-next" ${canNext ? "" : "disabled"}>Continue ${icon("arrow")}</button>`}
            </div>
          </div>
        </section>
        <aside class="builder-summary" aria-label="Current build summary">
          <div class="builder-summary__visual"><img src="../media/optimized/webp/products/pistachio-saint-concept-v1.webp" alt="ST. JUICE Build Your Mood preview" width="720" height="900" /></div>
          <div class="builder-summary__body">
            <p class="eyebrow">LIVE BUILD</p>
            <h3>${escapeHtml(state.builder.name || `${moodName === "No mood yet" ? "Your" : moodName} mood`)}</h3>
            ${selectionsMarkup || `<div class="builder-summary__line"><span>Start</span><strong>Pick a base</strong></div>`}
            ${allergens.length ? `<div class="builder-summary__line"><span>Allergens</span><strong>${escapeHtml(allergens.map(titleCase).join(", "))}</strong></div>` : ""}
            <div class="builder-summary__total"><span>Total</span><strong>${money(total)}</strong></div>
          </div>
        </aside>
      </div>
    </div>`;
}

function renderDrops({ data }) {
  const active = data.copy.drops.activeProductIds.map((id) => data.productById.get(id)).filter(Boolean);
  const [lead, ...rest] = active;
  return `
    ${pageHero("NEW DROPS", data.copy.drops.title, "Limited releases, seasonal ideas and the newest reasons to come back.")}
    <section class="section section--cream">
      <div class="container">
        ${lead ? `
          <article class="drop-hero">
            <div class="drop-hero__media"><img src="${productImage(lead)}" alt="${escapeHtml(lead.name)}" width="960" height="960" /></div>
            <div class="drop-hero__copy">
              <p class="eyebrow">FEATURED DROP</p>
              <h2>${escapeHtml(lead.name)}</h2>
              <p class="lede">${escapeHtml(lead.description)}</p>
              <div class="drop-hero__meta"><span>Limited release</span><span>Available while offered</span></div>
              <a class="button" href="#/product/${escapeHtml(lead.id)}">Order the drop</a>
            </div>
          </article>` : ""}
        ${rest.length ? `
          <div class="section-heading drop-heading"><div><p class="eyebrow">MORE TO TRY</p><h2>Still fresh.</h2></div></div>
          <div class="drop-grid">
            ${rest.map((product) => `
              <article class="drop-card">
                <a class="drop-card__media" href="#/product/${escapeHtml(product.id)}"><img src="${productImage(product)}" alt="${escapeHtml(product.name)}" width="720" height="720" /></a>
                <div class="drop-card__body"><p class="eyebrow">CURRENT DROP</p><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><a class="text-link" href="#/product/${escapeHtml(product.id)}">View drop ${icon("arrow")}</a></div>
              </article>`).join("")}
          </div>` : ""}
        <div class="drop-archive">
          <div><p class="eyebrow">DROP ARCHIVE</p><h2>Past favorites make room for what is next.</h2><p>When a release ends, it moves here instead of disappearing from the story.</p></div>
          <a class="button button--outline" href="#/menu?category=desserts-drops">Shop what is available</a>
        </div>
      </div>
    </section>`;
}

function renderBoxes({ data }) {
  const cards = data.bundles.orderNowBoxes.map((box) => ({ ...box, product: data.productById.get(box.productId) }));
  return `
    ${pageHero("PARTY BOXES", data.copy.boxes.title, "Built for study nights, birthdays, office tables and the moments that need more than one order.", `<a class="button" href="#/catering">Planning something bigger?</a>`)}
    <section class="section section--surface">
      <div class="container box-showcase">
        ${cards.map(({ product, ...box }) => `
          <article class="party-box-card">
            <a class="party-box-card__media" href="#/product/${escapeHtml(box.productId)}">
              <img src="${productImage(product || { id: box.productId, categoryId: "flights-liters-boxes" })}" alt="${escapeHtml(product?.name || box.productId)}" loading="lazy" width="720" height="620" />
            </a>
            <div class="party-box-card__body">
              <div class="party-box-card__heading"><div><p class="eyebrow">SERVES ${box.serves.min}–${box.serves.max}</p><h3>${escapeHtml(product?.name || box.productId)}</h3></div><strong>${box.startingAt ? "From " : ""}${money(box.basePrice)}</strong></div>
              <ul class="compact-list">${box.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              <div class="party-box-card__meta"><span>${box.leadTime.type === "scheduled" ? `${box.leadTime.minimumHours} hr minimum prep` : `${box.leadTime.minimumMinutes} min minimum prep`}</span><span>Customize before checkout</span></div>
              <a class="button" href="#/product/${escapeHtml(box.productId)}">Customize box</a>
            </div>
          </article>`).join("")}
      </div>
    </section>`;
}

function renderCatering({ data, state }) {
  return `
    ${pageHero("CATERING", data.copy.catering.title, "Drinks, desserts and full-table moments for teams, celebrations and groups.", `<a class="button" href="#catering-form">Start a request</a><a class="button button--outline" href="#/boxes">Shop party boxes</a>`)}
    <section class="section section--cream">
      <div class="container">
        <div class="section-heading"><div><p class="eyebrow">CHOOSE YOUR FORMAT</p><h2>Start with the kind of service you need.</h2><p class="lede">Every catering request is reviewed around guest count, date, setup and menu availability before it is confirmed.</p></div></div>
        <div class="package-grid">
          ${data.bundles.cateringPackages.map((item) => `
            <article class="package-card">
              <div class="package-card__top"><div><p class="eyebrow">${item.guestRange.min}–${item.guestRange.max} GUESTS</p><h3>${escapeHtml(item.name)}</h3></div><span class="package-card__price">Custom quote</span></div>
              <ul class="compact-list">${item.includes.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
              <button class="button button--outline button--small" type="button" data-action="prefill-catering" data-package="${escapeHtml(item.id)}">Choose this format</button>
            </article>`).join("")}
        </div>
      </div>
    </section>
    <section class="section section--surface" id="catering-form">
      <div class="container form-shell">
        <div>
          <p class="eyebrow">YOUR EVENT</p>
          <h2>Tell us what you are planning.</h2>
          <p class="lede">Share the essentials and we will shape the menu around the group.</p>
          <div class="timeline">
            <div class="timeline__item"><span class="timeline__dot">1</span><div><h3>Share the details.</h3><p>Date, group size, service style and contact information.</p></div></div>
            <div class="timeline__item"><span class="timeline__dot">2</span><div><h3>We review the request.</h3><p>We confirm availability, menu fit and any delivery or setup needs.</p></div></div>
            <div class="timeline__item"><span class="timeline__dot">3</span><div><h3>Confirm the plan.</h3><p>Your event becomes confirmed only after the final quote and required payment steps are accepted.</p></div></div>
          </div>
        </div>
        <form class="form-card" id="catering-request" novalidate>
          ${state.cateringSuccess ? `<div class="success-panel" role="status"><h3>Request received.</h3><p>${escapeHtml(data.copy.catering.success.replace("[CUSTOMER EMAIL]", state.cateringEmail || "your email"))}</p>${state.cateringReference ? `<p><strong>Reference:</strong> ${escapeHtml(state.cateringReference)}</p>` : ""}</div>` : `
            <div class="form-grid">
              <label class="form-field"><span>Contact name *</span><input class="field" name="contactName" autocomplete="name" required /></label>
              <label class="form-field"><span>Organization</span><input class="field" name="organization" autocomplete="organization" /></label>
              <label class="form-field"><span>Email *</span><input class="field" type="email" name="email" autocomplete="email" required /></label>
              <label class="form-field"><span>Phone *</span><input class="field" type="tel" name="phone" autocomplete="tel" required /></label>
              <label class="form-field"><span>Event date *</span><input class="field" type="date" name="eventDate" required /></label>
              <label class="form-field"><span>Service time *</span><input class="field" type="time" name="serviceTime" required /></label>
              <label class="form-field"><span>Guest count *</span><input class="field" type="number" name="guestCount" min="1" required /></label>
              <label class="form-field"><span>Service style *</span><select class="field" name="serviceMode" required><option value="">Choose one</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option><option value="staffed_setup">Staffed setup</option></select></label>
              <label class="form-field form-field--full"><span>Package interest</span><select class="field" name="packageInterest" id="package-interest"><option value="">Help me choose</option>${data.bundles.cateringPackages.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
              <label class="form-field form-field--full"><span>Dietary, allergen and event notes</span><textarea class="field" name="notes" placeholder="Venue, service style, dietary needs, timing or anything else we should know."></textarea></label>
              <label class="checkbox-field form-field--full"><input type="checkbox" name="contactConsent" required /><span>I agree that ST. JUICE may contact me about this request.</span></label>
              <div class="form-field--full"><button class="button" type="submit">Request catering</button><p class="form-note">A confirmation will only appear after the request is securely saved.</p></div>
            </div>`}
        </form>
      </div>
    </section>`;
}

function renderGiftCards() {
  return `
    ${pageHero("GIFT CARDS", "A little ST. JUICE, on them.", "Digital and physical gift cards are part of the upcoming ST. JUICE account experience.")}
    <section class="section section--cream">
      <div class="container">
        <div class="coming-soon-card">
          <p class="eyebrow">COMING SOON</p>
          <h2>Birthdays, thank-yous and random sweet moves.</h2>
          <p class="lede">Gift cards will launch with secure balance tracking, receipts and clear terms. Until then, no gift-card balance is created or sold online.</p>
          <a class="button" href="#/menu">Explore the menu</a>
        </div>
      </div>
    </section>`;
}

function renderRewards({ state }) {
  const signedIn = Boolean(state.account?.signedIn);
  return `
    ${pageHero("ST. REWARDS", "The more ST. JUICE becomes your spot, the more your account should give back.", "Rewards, account offers and birthday benefits are the next system being connected to member accounts.")}
    <section class="section section--cream">
      <div class="container rewards-preview-grid">
        <article class="account-panel account-panel--accent">
          <p class="eyebrow">${signedIn ? "YOUR ACCOUNT" : "MEMBER BENEFITS"}</p>
          <h2>${signedIn ? "You're ready for rewards." : "Create an account once. Keep the benefits together."}</h2>
          <p>${signedIn ? "Your signed-in account is already the home for favorites and saved mixes. Points and redeemable rewards will appear here when the loyalty ledger launches." : "Regular, Student and Business members will use the same account for rewards, offers, birthday benefits and saved activity."}</p>
          <a class="button" href="#/account">${signedIn ? "Open account" : "Create account"}</a>
        </article>
        <article class="account-panel">
          <p class="eyebrow">WHAT'S COMING</p>
          <h2>Earn. Unlock. Use it when you want.</h2>
          <ul class="feature-list">
            <li>Points tied to eligible purchases</li>
            <li>Rewards that can be redeemed from your account</li>
            <li>Birthday benefits</li>
            <li>Account-type offers for verified members</li>
          </ul>
          <p class="legal-note">Exact earning rates, redemption values and eligibility rules will be published with the rewards launch.</p>
        </article>
      </div>
    </section>`;
}

function renderLocation({ data, state }) {
  const location = data.copy.location;
  return `
    ${pageHero("ONE BRANCH · OPEN DAILY", location.title, "Fresh mornings, sweet late nights and three ways to get the order.", `<a class="button" href="https://www.google.com/maps/search/?api=1&query=11%20S%20Vandeventer%20Ave%2C%20St.%20Louis%2C%20MO" target="_blank" rel="noreferrer">Get directions</a>`)}
    <section class="section section--cream">
      <div class="container location-layout">
        <div class="location-card">
          <p class="eyebrow">ST. JUICE · VANDEVENTER</p><h2>Meet us here.</h2>
          <div class="location-card__facts">
            <div class="location-fact"><span class="location-fact__icon">${icon("pin")}</span><div><strong>${escapeHtml(location.address)}</strong><span>Confirmed first branch</span></div></div>
            <div class="location-fact"><span class="location-fact__icon">${icon("clock")}</span><div><strong>${escapeHtml(location.hours)}</strong><span>Friday and Saturday run later.</span></div></div>
            <div class="location-fact"><span class="location-fact__icon">${icon("pickup")}</span><div><strong>${escapeHtml(location.services.join(" · "))}</strong><span>Current selection: ${escapeHtml(serviceModes[state.service].label)}</span></div></div>
          </div>
          <p>${escapeHtml(location.parking)}</p>
          <div class="info-panel"><h3>Contact placeholders</h3><p>Phone and customer-service email are intentionally hidden until real values are confirmed.</p></div>
          <div class="button-row" style="margin-top:1rem"><button class="button" type="button" data-action="open-service">Choose service</button><a class="button button--outline" href="#/menu">Browse menu</a></div>
        </div>
        <div class="map-card"><div class="map-pin"><img src="../brand/assets/logos/st-juice-fruit-mark.svg" alt="" /></div><div class="map-card__label"><strong>11 S Vandeventer Ave</strong><br /><span>Directions and map details will be available here.</span></div></div>
      </div>
    </section>`;
}

function dashboardContent(mode, data) {
  if (mode === "guest") return `<div class="empty-state" style="min-height:22rem"><span class="empty-state__icon">${icon("user")}</span><h2>Keep browsing as a guest.</h2><p>Your cart and service choice work without an account. Choose an account type only when it adds value.</p><button class="button" type="button" data-action="open-account">See account options</button></div>`;
  const content = {
    regular: { title: "Your regular dashboard", metrics: [["—", "Rewards"], ["0", "Saved favorites"], ["0", "Saved mixes"]], note: "Orders, favorites, rewards and saved addresses share one account after production activation." },
    student: { title: "Your student dashboard", metrics: [["Pending", "Verification status"], ["—", "Eligible offers"], ["1", "Study Night Box"]], note: "Verification must be minimal, visible and free of implied university affiliation." },
    business: { title: "Your business dashboard", metrics: [["0", "Upcoming events"], ["0", "Saved locations"], ["Draft", "Quote status"]], note: "Recurring orders, business contacts, quotes and receipts appear here after integrations." }
  }[mode];
  return `<div class="dashboard-panel"><p class="eyebrow">${escapeHtml(modes[mode].label)}</p><h2>${escapeHtml(content.title)}</h2><p class="lede">${escapeHtml(content.note)}</p><div class="metric-grid">${content.metrics.map(([value, label]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("")}</div><div class="info-panel" style="margin-top:1rem"><h3>Account privacy</h3><p>Your member experience follows the signed-in account. Sensitive payment details are never stored in the browser.</p></div></div>`;
}

function renderAccount({ data, state }) {
  state.account ||= { signedIn: false, favorites: [], savedMixes: [], orderHistory: [], reservations: [], points: 0, profile: {}, student: {}, business: {}, benefits: null };
  const account = accountView(state.account);
  if (account.signedIn) {
    const favorites = account.favorites.map((id) => data.productById.get(id)).filter(Boolean);
    const benefits = account.benefits || {};
    const discount = benefits.discount || {};
    const loyalty = benefits.loyalty || {};
    const birthday = benefits.birthday || {};
    const reservations = Array.isArray(account.reservations) ? account.reservations : [];
    const reservationConfig = account.reservationConfig || { partySize: { min: 2, max: 40 }, durationMinutes: { min: 30, max: 240, increment: 30 }, purposes: ["study_group", "work_group", "meeting", "social", "other"] };
    const purposeLabels = { study_group: "Study group", work_group: "Work group", meeting: "Meeting", social: "Social group", other: "Other" };
    const reservationStatus = { requested: "Requested", confirmed: "Confirmed", declined: "Declined", canceled: "Canceled" };
    const verificationLabel = discount.verificationRequired
      ? titleCase(discount.verificationStatus || "not_submitted")
      : "Not required";
    const rewardsLabel = loyalty.enabled ? `${Number(loyalty.points || 0)} points` : "Coming soon";
    const benefitLabel = Number(discount.activePercentOff || 0) > 0 ? `${discount.activePercentOff}% active` : discount.verificationRequired ? verificationLabel : "Member account";
    const birthdayLabel = birthday.eligible ? "Available now" : birthday.enabled ? "Not active today" : "Coming soon";
    const wallet = account.rewardsWallet || { points: Number(loyalty.points || 0), lifetimeEarned: 0, lifetimeRedeemed: 0, transactions: [], grants: [] };
    const rewardsConfig = account.rewardsConfig || { enabled: false, redemptions: [] };
    const availableGrants = (wallet.grants || []).filter((grant) => grant.status === "available");

    return `${pageHero("YOUR ST. JUICE", `Hey, ${account.profile.name || "friend"}.`, modes[state.mode].line, `<button class="button button--outline" type="button" data-action="account-signout">Sign out</button>`)}
    <section class="section section--cream"><div class="container account-dashboard">
      <div class="account-stats">
        <article><span>Rewards</span><strong>${escapeHtml(rewardsLabel)}</strong><small>Earn and redeem from your member wallet when activated</small></article>
        <article><span>Account benefit</span><strong>${escapeHtml(benefitLabel)}</strong><small>${discount.verificationRequired ? "Verification controls eligibility" : "Your member experience"}</small></article>
        <article><span>Birthday</span><strong>${escapeHtml(birthdayLabel)}</strong><small>Benefits appear here only when eligible and active</small></article>
        <article><span>Reservations</span><strong>${reservations.filter((item) => ["requested", "confirmed"].includes(item.status)).length}</strong><small>Open group requests</small></article>
      </div>

      <div class="account-section member-wallet">
        <div class="section-heading account-section__heading">
          <div><p class="eyebrow">MEMBER WALLET</p><h2>Rewards, benefits and offers in one place.</h2><p class="lede">Only active, account-eligible benefits appear here. Proposed program values are never shown as live offers.</p></div>
        </div>
        <div class="wallet-grid">
          <article class="account-panel">
            <p class="eyebrow">POINTS</p>
            <h2>${rewardsConfig.enabled ? `${Number(wallet.points || 0)} points` : "Rewards coming soon"}</h2>
            <p>${rewardsConfig.enabled ? `${Number(wallet.lifetimeEarned || 0)} earned · ${Number(wallet.lifetimeRedeemed || 0)} redeemed` : "Your account is ready for the loyalty program when the final earning and redemption rules are approved."}</p>
            ${rewardsConfig.enabled && !loyalty.enrolled ? `<button class="button" type="button" data-action="enroll-rewards">Join ST. Rewards</button>` : ""}
          </article>
          <article class="account-panel">
            <p class="eyebrow">AVAILABLE REWARDS</p>
            ${rewardsConfig.enabled && loyalty.enrolled && (rewardsConfig.redemptions || []).length
              ? `<div class="wallet-rewards">${rewardsConfig.redemptions.map((reward) => `<div class="wallet-reward"><div><strong>${escapeHtml(titleCase(reward.type))}</strong><small>${reward.points} points</small></div><button class="button button--outline button--small" type="button" data-action="redeem-reward" data-reward-id="${escapeHtml(reward.id)}" ${Number(wallet.points || 0) < Number(reward.points || 0) ? "disabled" : ""}>Redeem</button></div>`).join("")}</div>`
              : `<p>${rewardsConfig.enabled ? "No redeemable rewards are configured for this account yet." : "Rewards will appear here after the program is activated."}</p>`}
          </article>
          <article class="account-panel">
            <p class="eyebrow">BIRTHDAY</p>
            <h2>${escapeHtml(birthdayLabel)}</h2>
            <p>${birthday.enabled ? "Birthday eligibility is calculated from your account birthday and program rules." : "Birthday benefits will appear here when the program is activated."}</p>
            ${birthday.enabled && birthday.eligible ? `<button class="button button--outline" type="button" data-action="claim-birthday">Add birthday benefit</button>` : ""}
          </article>
        </div>
        ${availableGrants.length ? `<div class="wallet-grants"><p class="eyebrow">READY TO USE</p>${availableGrants.map((grant) => `<article><div><strong>${escapeHtml(titleCase(grant.rewardType || grant.kind))}</strong><small>${escapeHtml(grant.kind === "birthday" ? "Birthday benefit" : "Reward redemption")} · Available</small></div><button class="button button--outline button--small" type="button" data-action="apply-reward-grant" data-grant-id="${escapeHtml(grant.id)}">${state.checkout.rewardGrantId === grant.id ? "Selected" : "Use reward"}</button></article>`).join("")}${state.checkout.rewardGrantId ? `<button class="text-button" type="button" data-action="remove-reward-grant">Remove selected reward</button>` : ""}</div>` : ""}
      </div>

      ${state.mode === "student" ? `
        <div class="verification-card">
          <p class="eyebrow">STUDENT VERIFICATION</p>
          <h2>${account.student.status === "verified" ? "Verified" : account.student.status === "pending_manual_review" ? "Pending review" : "Verify your student account"}</h2>
          <p>Student benefits never activate from account type alone. Verification is required and ST. JUICE does not imply university affiliation.</p>
          ${account.student.status === "not_submitted" ? `
            <form class="account-form compact-account-form" data-student-verification-form>
              <div class="form-grid">
                <label class="form-field"><span>School email *</span><input class="field" name="schoolEmail" type="email" autocomplete="email" required /></label>
                <label class="form-field"><span>Institution *</span><input class="field" name="institution" required /></label>
              </div>
              <button class="button" type="submit">Submit for verification</button>
            </form>` : ""}
        </div>` : ""}

      ${state.mode === "business" ? `
        <div class="verification-card">
          <p class="eyebrow">BUSINESS PROFILE</p>
          <h2>${account.business.status === "approved" ? "Approved business" : account.business.status === "pending_review" ? "Pending review" : "Set up your business profile"}</h2>
          <p>Business pricing or account benefits only activate after approval. Your profile can still be used for group planning and catering requests.</p>
          ${account.business.status !== "approved" ? `
            <form class="account-form compact-account-form" data-business-form>
              <div class="form-grid">
                <label class="form-field"><span>Company *</span><input class="field" name="company" value="${escapeHtml(account.business.company || "")}" required /></label>
                <label class="form-field"><span>Your role</span><input class="field" name="role" value="${escapeHtml(account.business.role || "")}" /></label>
                <label class="form-field form-field--full"><span>Typical ordering cadence</span><select class="field" name="recurringCadence"><option value="">Choose one</option>${["Weekly","Monthly","Quarterly","Occasional"].map((value) => `<option ${String(account.business.recurringCadence || "").toLowerCase() === value.toLowerCase() ? "selected" : ""}>${value}</option>`).join("")}</select></label>
              </div>
              <button class="button" type="submit">${account.business.status === "pending_review" ? "Update business profile" : "Submit business profile"}</button>
            </form>` : `<a class="button button--outline" href="#/catering">Plan catering</a>`}
        </div>` : ""}

      <div class="account-section reservation-section">
        <div class="section-heading account-section__heading">
          <div><p class="eyebrow">GROUP RESERVATIONS</p><h2>Request space for the group.</h2><p class="lede">Study groups, work groups, meetings and social groups can request a time. A request is not confirmed until the team approves it.</p></div>
        </div>
        <div class="reservation-layout">
          <form class="account-form" data-reservation-form>
            <div class="form-grid">
              <label class="form-field"><span>Purpose *</span><select class="field" name="purpose" required><option value="">Choose one</option>${(reservationConfig.purposes || []).map((purpose) => `<option value="${escapeHtml(purpose)}">${escapeHtml(purposeLabels[purpose] || titleCase(purpose))}</option>`).join("")}</select></label>
              <label class="form-field"><span>Group size *</span><input class="field" name="partySize" type="number" min="${reservationConfig.partySize?.min || 2}" max="${reservationConfig.partySize?.max || 40}" required /></label>
              <label class="form-field"><span>Date *</span><input class="field" name="date" type="date" required /></label>
              <label class="form-field"><span>Start time *</span><input class="field" name="startTime" type="time" required /></label>
              <label class="form-field"><span>Duration *</span><select class="field" name="durationMinutes" required><option value="">Choose duration</option>${[30,60,90,120,150,180,210,240].filter((value) => value >= Number(reservationConfig.durationMinutes?.min || 30) && value <= Number(reservationConfig.durationMinutes?.max || 240)).map((value) => `<option value="${value}">${value < 60 ? `${value} min` : value % 60 ? `${Math.floor(value/60)} hr ${value%60} min` : `${value/60} hr`}</option>`).join("")}</select></label>
              <label class="form-field"><span>Organization</span><input class="field" name="organization" placeholder="Optional" /></label>
              <label class="form-field form-field--full"><span>Notes</span><textarea class="field" name="notes" maxlength="600" placeholder="Seating needs, outlets, meeting notes or anything the team should know."></textarea></label>
            </div>
            <button class="button" type="submit">Request a table</button>
          </form>
          <div class="reservation-list">
            <p class="eyebrow">YOUR REQUESTS</p>
            ${reservations.length ? reservations.map((reservation) => `
              <article class="reservation-card">
                <div><strong>${escapeHtml(purposeLabels[reservation.purpose] || titleCase(reservation.purpose))}</strong><small>${escapeHtml(reservation.date)} · ${escapeHtml(reservation.startTime)} · ${reservation.partySize} people · ${reservation.durationMinutes} min</small></div>
                <span class="status-pill status-pill--${escapeHtml(reservation.status)}">${escapeHtml(reservationStatus[reservation.status] || titleCase(reservation.status))}</span>
                ${["requested", "confirmed"].includes(reservation.status) ? `<button class="text-button" type="button" data-action="cancel-reservation" data-reservation-id="${escapeHtml(reservation.id)}">Cancel request</button>` : ""}
              </article>`).join("") : `<div class="empty-state empty-state--compact"><h3>No reservation requests yet.</h3><p>Your requests will appear here after you submit them.</p></div>`}
          </div>
        </div>
      </div>

      <div class="account-section"><div><p class="eyebrow">FAVORITES</p><h2>Your repeat cravings</h2></div><div class="product-grid">${favorites.length ? favorites.map((product) => buildProductCard(product, data)).join("") : `<div class="empty-state"><span class="empty-state__icon">${icon("heart")}</span><h3>No favorites yet.</h3><p>Use the heart button on a product page.</p><a class="button" href="#/menu">Browse menu</a></div>`}</div></div>
      <div class="account-section"><div><p class="eyebrow">SAVED MIXES</p><h2>Your moods</h2></div><div class="saved-list">${account.savedMixes.length ? account.savedMixes.map((mix) => `<article><strong>${escapeHtml(mix.name)}</strong><small>${new Date(mix.savedAt).toLocaleDateString()}</small><a href="#/build">Open builder</a></article>`).join("") : `<p>No saved mixes yet. Finish a Build Your Mood recipe and save it here.</p>`}</div></div>
      <div class="account-section"><div><p class="eyebrow">ORDER HISTORY</p><h2>Your recent orders</h2></div><div class="saved-list">${account.orderHistory.length ? account.orderHistory.map((order) => `<article><strong>${escapeHtml(order.orderNumber)}</strong><small>${escapeHtml(order.status)} · ${money(order.total)}</small><button class="text-button" data-action="reorder-history" data-order-id="${escapeHtml(order.id)}">Reorder</button></article>`).join("") : `<p>Your completed orders will appear here.</p>`}</div></div>
    </div></section>`;
  }

  const requestedType = modes[state.accountIntent] && state.accountIntent !== "guest" ? state.accountIntent : "regular";
  return `
    ${pageHero("YOUR ACCOUNT", "Sign in to unlock your ST. JUICE experience.", "Guest checkout stays available. Regular, Student and Business experiences are tied to a real account session.")}
    <section class="section section--cream">
      <div class="container account-auth-grid">
        <form class="account-form" data-login-form>
          <div><p class="eyebrow">WELCOME BACK</p><h2>Sign in</h2><p>Use your account to access your member experience, saved items and group requests.</p></div>
          <div class="form-grid">
            <label class="form-field form-field--full"><span>Email *</span><input class="field" name="email" type="email" autocomplete="email" required /></label>
            <label class="form-field form-field--full"><span>Password *</span><input class="field" name="password" type="password" autocomplete="current-password" required /></label>
          </div>
          <button class="button" type="submit">Sign in</button>
        </form>
        <form class="account-form" data-register-form>
          <div><p class="eyebrow">NEW ACCOUNT</p><h2>Create your account</h2><p>Choose the account type that matches how you use ST. JUICE.</p></div>
          <div class="form-grid">
            <label class="form-field"><span>Name *</span><input class="field" name="name" autocomplete="name" required /></label>
            <label class="form-field"><span>Email *</span><input class="field" name="email" type="email" autocomplete="email" required /></label>
            <label class="form-field form-field--full"><span>Password *</span><input class="field" name="password" type="password" minlength="12" autocomplete="new-password" required /></label>
            <label class="form-field"><span>Birthday</span><input class="field" name="birthday" type="date" autocomplete="bday" /></label>
            <label class="form-field"><span>Why we ask</span><input class="field" value="Optional · used for birthday benefits" disabled aria-label="Birthday explanation" /></label>
            <label class="form-field form-field--full"><span>Account type *</span><select class="field" name="type" required>
              <option value="regular" ${requestedType === "regular" ? "selected" : ""}>Regular</option>
              <option value="student" ${requestedType === "student" ? "selected" : ""}>Student</option>
              <option value="business" ${requestedType === "business" ? "selected" : ""}>Business</option>
            </select></label>
          </div>
          <button class="button" type="submit">Create account</button>
        </form>
      </div>
    </section>`;
}

function renderAbout({ data }) {
  return `
    ${pageHero("OUR STORY", data.copy.about.title, data.copy.about.body)}
    <section class="section section--surface"><div class="container split-feature"><div class="split-feature__copy"><p class="eyebrow">YOUR MOOD, MADE FRESH</p><h2>Fresh and indulgent share the same counter.</h2><p class="lede">${escapeHtml(data.copy.about.story)}</p><a class="button" href="#/menu">Explore the menu</a></div><div class="split-feature__media">${mediaBadge("Packaging concept")}<img src="../media/optimized/webp/packaging/packaging-lineup-concept-v1.webp" alt="Concept ST. JUICE packaging lineup" width="1200" height="800" /></div></div></section>
    <section class="section section--dark"><div class="container"><div class="principle-grid"><article class="principle-card"><span class="principle-card__number">01</span><h3>St. Louis first.</h3><p>The first home is 11 S Vandeventer Ave, with one branch at launch.</p></article><article class="principle-card"><span class="principle-card__number">02</span><h3>Original identity.</h3><p>No competitor imagery, recipes, protected marks or university identity is copied.</p></article><article class="principle-card"><span class="principle-card__number">03</span><h3>Truth before claims.</h3><p>Prices, nutrition, allergens, rewards and packaging advance only with verification.</p></article></div></div></section>`;
}

function renderStates({ data }) {
  const states = [
    { title: "Loading", text: "Content keeps its structure while canonical data arrives.", type: "loading" },
    { title: "Nothing matched", text: data.copy.menu.noResults, icon: "search" },
    { title: "Out of stock", text: data.copy.errors.outOfStock, icon: "alert", kind: "warning" },
    { title: "Closed", text: data.copy.errors.closed, icon: "clock", kind: "warning" },
    { title: "Delivery unavailable", text: data.copy.errors.deliveryUnavailable, icon: "delivery", kind: "warning" },
    { title: "Payment failed", text: data.copy.errors.payment, icon: "alert", kind: "error" },
    { title: "Network lost", text: data.copy.errors.network, icon: "alert", kind: "error" },
    { title: "Empty cart", text: data.copy.cartCheckout.emptyCart, icon: "bag" },
    { title: "Form success", text: "Your request is in. It is not a confirmed booking yet.", icon: "check" }
  ];
  return `
    ${pageHero("SYSTEM STATES", "Ready for the moments that are not perfect.", "Loading, empty, unavailable, error and success treatments are part of the design—not an afterthought.")}
    <section class="section section--cream"><div class="container"><div class="state-grid">${states.map((item) => item.type === "loading" ? `<article class="state-card"><div class="skeleton skeleton--image"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div></article>` : `<article class="state-card ${item.kind ? `state-card--${item.kind}` : ""}"><span class="state-card__icon">${icon(item.icon)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join("")}</div></div></section>
    <section class="section section--surface"><div class="container"><div class="section-heading"><div><p class="eyebrow">ORDER STATUS PREVIEW</p><h2>One clear sentence at every step.</h2></div></div><div class="timeline">${Object.entries(data.copy.orderStatuses).map(([key, value], index) => `<div class="timeline__item"><span class="timeline__dot">${index + 1}</span><div><h3>${escapeHtml(titleCase(key))}</h3><p>${escapeHtml(value.replace("[PUBLIC PHONE]", "the store"))}</p></div></div>`).join("")}</div></div></section>`;
}

function renderInfo(path) {
  const slug = path.split("/").pop();
  const pages = {
    privacy: {
      title: "Privacy Notice",
      intro: "A plain-language explanation of how this website handles information before full online ordering launches.",
      sections: [
        ["What this site handles", "Cart and service preferences may be stored on this device. Account sessions and ordering previews are temporary until durable production storage is connected."],
        ["Why information is used", "Information is used to prepare an order preview, display status, remember selected preferences, and keep optional marketing consent separate from transactional communication."],
        ["What is not active", "There is no live payment processor, production customer database, analytics pixel, advertising tracker, SMS provider, email provider, or POS connection in this package."],
        ["Before public launch", "Name the business contact, production vendors, retention periods, consumer-request process, cookie choices, and any state-specific rights. Obtain appropriate legal review before publishing."],
      ]
    },
    terms: {
      title: "Website & Ordering Terms",
      intro: "Website and ordering terms for the current pre-opening experience. Final operating terms will be published before live commerce begins.",
      sections: [
        ["Current ordering status", "Online ordering and payment are not live yet. Order previews do not create a live sale, charge, reservation, or rewards liability."],
        ["Product information", "Menu descriptions, prices, availability, recipes, portions, nutrition, allergens, and photography may change before opening as operations are finalized."],
        ["Customer responsibility", "Customers must review their order details and tell the store about allergies or dietary concerns. Online information cannot guarantee an allergen-free preparation environment."],
        ["Launch approval needed", "The owner must approve governing law, dispute terms, cancellation rules, gift-card terms, promotions, rewards, delivery responsibility, and liability language before publication."],
      ]
    },
    refunds: {
      title: "Refunds & Order Issues",
      intro: "How order issues and refunds will be handled as live ordering comes online.",
      sections: [
        ["Before live payment", "No live card payment is processed through the current ordering preview, so there is no online card charge to refund yet."],
        ["Recommended service flow", "At launch, customers should contact the store promptly with the order number, item, and issue. The team should review missing, incorrect, damaged, or quality-related items consistently."],
        ["Owner decisions required", "Approve the reporting window, cancellation cutoff, remakes, partial refunds, delivery-platform orders, catering deposits, no-shows, chargebacks, and the original-payment-method rule before going live."],
      ]
    },
    cookies: {
      title: "Cookies & Device Storage",
      intro: "A plain-language inventory of browser storage used by the current site.",
      sections: [
        ["Essential local storage", "The site can remember cart and service preferences on this device. Signed-in member data is handled through the account service."],
        ["No advertising cookies", "This package does not include analytics, advertising pixels, cross-site tracking, or third-party marketing cookies."],
        ["Before adding vendors", "Add a consent mechanism where required, list each vendor and purpose, respect opt-out signals where applicable, and update this notice before enabling analytics or advertising."],
      ]
    },
    accessibility: {
      title: "Accessibility Statement",
      intro: "ST. JUICE aims to provide a usable ordering experience across keyboard, touch, screen reader, zoom, and reduced-motion settings.",
      sections: [
        ["Current support", "The interface includes a skip link, semantic landmarks, labeled controls, visible focus, keyboard-operable dialogs, live status messaging, reduced-motion handling, and responsive layouts."],
        ["Known limits", "The experience will continue to be tested with real users and assistive technologies as payment, map, POS and verification tools are connected."],
        ["Report a barrier", "A public accessibility contact method is required before launch. Until then, document the page, device, browser, assistive technology, and problem for the owner’s launch review."],
      ]
    },
    allergens: {
      title: "Nutrition & Allergens",
      intro: "Ingredient and allergen flags are working data. Nutrition facts are intentionally withheld until recipes, weights, suppliers, and preparation methods are verified.",
      sections: [
        ["Shared preparation", "The planned kitchen may handle milk, tree nuts, peanuts, wheat/gluten, soy, eggs, sesame, and other ingredients. Cross-contact may occur; no item is represented as allergen-free."],
        ["Customization changes risk", "Sauces, toppings, bases, boosts, substitutions, and shared equipment can change an item’s allergen profile. Review the final build and speak with the store before ordering."],
        ["Nutrition status", "No calorie, macro, sugar, or nutrient figure in this project should be published as fact until calculated from approved recipes and verified portions."],
        ["Emergency warning", "People with severe allergies should not rely only on the website. The owner must approve kitchen controls, staff scripts, supplier records, and escalation procedures before launch."],
      ]
    },
    contact: {
      title: "Contact ST. JUICE",
      intro: "The first planned location is 11 S Vandeventer Ave, St. Louis, Missouri.",
      sections: [
        ["Public contact pending", "Public phone, email, map listing and accessibility contact details will be published once they are approved for opening."],
        ["Catering", "The catering request flow is available for planning, but a date is not reserved until the request is saved, reviewed and confirmed."],
        ["Before launch", "Add monitored contact channels, response expectations, holiday hours, parking and pickup instructions, and an escalation path for order issues."],
      ]
    }
  };
  const page = pages[slug];
  if (!page) return renderNotFound();
  return `${pageHero("SITE POLICIES", page.title, page.intro)}<section class="section section--cream"><div class="container policy-layout"><aside class="policy-status"><strong>Before opening</strong><p>These pages reflect the current pre-opening experience and will be updated as live ordering, vendors and operating policies are finalized.</p><p><strong>Updated:</strong> September 20, 2026</p></aside><div class="policy-content">${page.sections.map(([heading, body]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`).join("")}<div class="info-panel"><h2>Before live ordering</h2><p>This page will be updated as final vendors, recipes, public contacts and operating details are approved.</p></div></div></div></section>`;
}

function renderNotFound() {
  return `${pageHero("404", "That mood is not here.", "The route may have moved, or the item is not part of the launch catalog.")}<section class="section section--cream"><div class="container"><div class="empty-state"><span class="empty-state__icon">${icon("search")}</span><h2>Try the full menu.</h2><p>Every launch category and active product is available from one canonical source.</p><a class="button" href="#/menu">Explore the menu</a></div></div></section>`;
}

function quoteTotals(quote) {
  if (!quote) return `<div class="info-panel"><h3>Order total</h3><p>Your items will be recalculated before the order preview is created.</p></div>`;
  const rows = [["Subtotal", quote.totals.subtotal.amount]];
  const breakdown = quote.discountBreakdown || {};
  const hasBreakdown = Number(breakdown.promo?.amount || 0) > 0 || Number(breakdown.account?.amount || 0) > 0 || Number(breakdown.reward?.amount || 0) > 0;
  if (Number(breakdown.account?.amount || 0) > 0) rows.push(["Member benefit", -breakdown.account.amount]);
  if (Number(breakdown.promo?.amount || 0) > 0) rows.push(["Promo", -breakdown.promo.amount]);
  if (Number(breakdown.reward?.amount || 0) > 0) rows.push(["Reward", -breakdown.reward.amount]);
  if (!hasBreakdown && quote.totals.discount.amount > 0) rows.push(["Discount", -quote.totals.discount.amount]);
  if (quote.totals.tip.amount > 0) rows.push([`Tip · ${quote.totals.tip.percent}%`, quote.totals.tip.amount]);
  return `<div class="quote-totals">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${value < 0 ? `−${money(Math.abs(value))}` : money(value)}</strong></div>`).join("")}<div class="quote-totals__grand"><span>Preview total</span><strong>${money(quote.totals.total.amount)}</strong></div><p class="quote-totals__note">Tax and any delivery/service fees will be finalized when online ordering goes live.</p></div>`;
}

function checkoutProgress(step) {
  const labels = ["Fulfillment", "Details", "Review", "Payment"];
  return `<ol class="checkout-progress" aria-label="Checkout progress">${labels.map((label, index) => `<li class="${index === step ? "is-current" : index < step ? "is-complete" : ""}"><span>${index < step ? "✓" : index + 1}</span><small>${escapeHtml(label)}</small></li>`).join("")}</ol>`;
}

function checkoutFulfillment(state) {
  const checkout = state.checkout;
  return `<div class="checkout-card"><p class="eyebrow">STEP 1</p><h2>How should we make the handoff?</h2>
    <div class="service-grid checkout-services">${Object.entries(serviceModes).map(([id, service]) => `<button class="service-option ${state.service === id ? "is-active" : ""}" type="button" data-action="checkout-service" data-service="${id}"><span data-icon="${service.icon}"></span><strong>${escapeHtml(service.label)}</strong><small>${escapeHtml(service.detail)}</small></button>`).join("")}</div>
    <div class="privacy-note"><span>${icon("clock")}</span><p><strong>Order for now.</strong> No date or time selection is needed.</p></div>
    ${state.service === "delivery" ? `<div class="delivery-panel"><h3>Delivery address</h3><p>Enter the full address so delivery availability can be reviewed.</p><div class="form-grid"><label class="form-field form-field--full"><span>Street *</span><input class="field" autocomplete="street-address" data-address-field="street" value="${escapeHtml(checkout.address.street)}" /></label><label class="form-field"><span>City *</span><input class="field" autocomplete="address-level2" data-address-field="city" value="${escapeHtml(checkout.address.city)}" /></label><label class="form-field"><span>State *</span><input class="field" autocomplete="address-level1" maxlength="30" data-address-field="state" value="${escapeHtml(checkout.address.state)}" /></label><label class="form-field"><span>Postal code *</span><input class="field" autocomplete="postal-code" data-address-field="postalCode" value="${escapeHtml(checkout.address.postalCode)}" /></label></div><button class="button button--outline" type="button" data-action="validate-delivery">${checkout.deliveryCheck ? "Address reviewed" : "Check address"}</button></div>` : ""}
    <div class="checkout-actions"><a class="button button--outline" href="#/menu">Keep shopping</a><button class="button" type="button" data-action="checkout-next">Continue</button></div></div>`;
}

function checkoutGuest(state) {
  const checkout = state.checkout;
  return `<div class="checkout-card"><p class="eyebrow">STEP 2</p><h2>Contact details</h2><p>We use these details for order communication. Guest checkout does not require an account.</p><div class="form-grid checkout-fields"><label class="form-field form-field--full"><span>Name *</span><input class="field" autocomplete="name" data-contact-field="name" value="${escapeHtml(checkout.contact.name)}" /></label><label class="form-field"><span>Email *</span><input class="field" type="email" autocomplete="email" data-contact-field="email" value="${escapeHtml(checkout.contact.email)}" /></label><label class="form-field"><span>Phone *</span><input class="field" type="tel" autocomplete="tel" data-contact-field="phone" value="${escapeHtml(checkout.contact.phone)}" /></label><label class="checkbox-field form-field--full"><input type="checkbox" data-contact-field="marketingConsent" ${checkout.contact.marketingConsent ? "checked" : ""} /><span>Optional: send me ST. JUICE news and offers.</span></label></div><div class="checkout-actions"><button class="button button--outline" type="button" data-action="checkout-back">Back</button><button class="button" type="button" data-action="checkout-next">Review order</button></div></div>`;
}

function checkoutReview(state) {
  const checkout = state.checkout;
  const quote = checkout.quote;
  return `<div class="checkout-card"><p class="eyebrow">STEP 3</p><h2>Review your order</h2>
    ${quote?.items?.length ? `<div class="review-lines">${quote.items.map((item) => `<article><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sizeLabel || item.baseLabel || "Custom build")} · Qty ${item.quantity}</small>${item.allergens?.length ? `<small>Allergen flags: ${escapeHtml(item.allergens.join(", "))}</small>` : ""}</div><strong>${money(item.lineTotal.amount)}</strong></article>`).join("")}</div>` : ""}
    ${quote?.warnings?.length ? `<details class="quote-warnings"><summary>Important order notes</summary><ul>${quote.warnings.map((warning) => `<li>${escapeHtml(warning.message.replace(/safe[- ]test/ig, "ordering preview"))}</li>`).join("")}</ul></details>` : ""}
    <fieldset class="form-field"><legend>Optional tip</legend><div class="tip-options">${[0, 15, 18, 20].map((value) => `<label><input type="radio" name="tip" data-tip-percent="${value}" ${checkout.tipPercent === value ? "checked" : ""} /><span>${value === 0 ? "No tip" : `${value}%`}</span></label>`).join("")}</div></fieldset>
    ${quoteTotals(quote)}
    <label class="checkbox-field allergen-ack"><input type="checkbox" data-checkout-field="allergenAcknowledged" ${checkout.allergenAcknowledged ? "checked" : ""} /><span>I reviewed the ingredient and allergen information and understand cross-contact may occur.</span></label>
    <div class="checkout-actions"><button class="button button--outline" type="button" data-action="checkout-back">Back</button><button class="button" type="button" data-action="checkout-next">Continue</button></div></div>`;
}

function checkoutPayment(state) {
  const checkout = state.checkout;
  const cashAllowed = state.service !== "delivery";
  if (!cashAllowed && checkout.paymentMethod === "cash") checkout.paymentMethod = "card";
  const cash = cashAllowed && checkout.paymentMethod === "cash";
  return `<div class="checkout-card"><p class="eyebrow">STEP 4</p><h2>Choose payment</h2><fieldset class="form-field"><legend>Payment method</legend><div class="tip-options"><label><input type="radio" name="payment-method" value="card" data-payment-method ${!cash ? "checked" : ""} /><span>Pay online</span></label>${cashAllowed ? `<label><input type="radio" name="payment-method" value="cash" data-payment-method ${cash ? "checked" : ""} /><span>Cash at ${state.service === "pickup" ? "pickup" : "the counter"}</span></label>` : ""}</div>${state.service === "delivery" ? `<small>Delivery orders require online payment. Cash is not available for delivery.</small>` : ""}</fieldset><div class="test-payment-card"><span class="test-payment-card__mark">${cash ? "CASH" : "PREVIEW"}</span><div><strong>${cash ? "Pay when you receive your order." : "Online payment is not live yet."}</strong><p>${cash ? `Cash payment of ${money(checkout.quote?.totals?.total?.amount || 0)} would be due at ${state.service === "pickup" ? "pickup" : "the counter"}.` : "No card details are collected and no live charge will occur while ordering remains in preview."}</p></div></div>${quoteTotals(checkout.quote)}<div class="checkout-actions"><button class="button button--outline" type="button" data-action="checkout-back">Back</button><button class="button" type="button" data-action="submit-test-order" ${checkout.busy ? "disabled" : ""}>${checkout.busy ? "Creating preview…" : "Create order preview"}</button></div></div>`;
}

function renderCheckout({ state }) {
  if (!state.cart.length) return `${pageHero("CHECKOUT", "Your bag needs a mood.", "Add at least one item before checkout.")}<section class="section section--cream"><div class="container"><div class="empty-state"><span class="empty-state__icon">${icon("bag")}</span><h2>Your bag is empty.</h2><a class="button" href="#/menu">Explore menu</a></div></div></section>`;
  const panels = [checkoutFulfillment, checkoutGuest, checkoutReview, checkoutPayment];
  return `${pageHero("ORDERING PREVIEW", "Checkout without surprises.", "Build the full order flow now. Live payment and final fees will switch on with production ordering.")}<section class="section section--cream checkout-section"><div class="container checkout-layout"><div><div class="launch-notice"><strong>Ordering preview</strong><span>No live card charge will occur yet.</span></div>${checkoutProgress(state.checkout.step)}${state.checkout.error ? `<div class="checkout-error" role="alert"><strong>Check this step</strong><p>${escapeHtml(state.checkout.error)}</p></div>` : ""}${panels[state.checkout.step](state)}</div><aside class="checkout-aside"><p class="eyebrow">YOUR BAG</p><h3>${state.cart.reduce((sum, item) => sum + item.quantity, 0)} item${state.cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}</h3><p>${escapeHtml(serviceModes[state.service].label)} · 11 S Vandeventer Ave</p>${quoteTotals(state.checkout.quote)}<p class="checkout-aside__note">Final taxes, fees and live payment activate with production ordering.</p></aside></div></section>`;
}

const statusLabels = { received: "Received", confirmed: "Confirmed", in_preparation: "In preparation", ready_for_pickup: "Ready for pickup", out_for_delivery: "Out for delivery", complete: "Complete", canceled: "Canceled" };

function renderOrder(orderId, { state }) {
  const order = state.order;
  if (state.orderLoading || !order || order.id !== orderId) return `${pageHero("ORDER STATUS", "Loading your order preview…", "Checking the latest status.")}<section class="section section--cream"><div class="container"><div class="skeleton skeleton--line"></div></div></section>`;
  const flow = order.service === "delivery" ? ["received", "confirmed", "in_preparation", "out_for_delivery", "complete"] : ["received", "confirmed", "in_preparation", "ready_for_pickup", "complete"];
  const current = flow.indexOf(order.status);
  return `${pageHero("ORDER PREVIEW", `Thanks, ${order.customer.name}.`, `${order.orderNumber} is ${statusLabels[order.status].toLowerCase()}.`)}<section class="section section--cream"><div class="container order-confirmation"><div class="order-card"><div class="launch-notice"><strong>Preview receipt</strong><span>No live card charge occurred.</span></div><div class="order-meta"><div><span>Order</span><strong>${escapeHtml(order.orderNumber)}</strong></div><div><span>Service</span><strong>${escapeHtml(serviceModes[order.service].label)}</strong></div><div><span>When</span><strong>${order.schedule === "asap" ? "Now" : escapeHtml(String(order.schedule).replace("T", " · ").slice(0, 18))}</strong></div><div><span>Total</span><strong>${money(order.totals.total.amount)}</strong></div></div><ol class="status-tracker">${flow.map((status, index) => `<li class="${index <= current ? "is-complete" : ""} ${index === current ? "is-current" : ""}"><span>${index < current ? "✓" : index + 1}</span><div><strong>${statusLabels[status]}</strong>${index === current ? `<small>Current status</small>` : ""}</div></li>`).join("")}</ol><div class="order-lines">${order.items.map((item) => `<div><span>${item.quantity} × ${escapeHtml(item.name)}</span><strong>${money(item.lineTotal.amount)}</strong></div>`).join("")}</div>${quoteTotals({ totals: order.totals })}<div class="checkout-actions"><button class="button button--outline" type="button" data-action="refresh-order" data-order-id="${escapeHtml(order.id)}">Refresh status</button></div></div><aside class="checkout-aside"><p class="eyebrow">CONTACT</p><h3>${escapeHtml(order.customer.name)}</h3><p>${escapeHtml(order.customer.email)} · ${escapeHtml(order.customer.phone)}</p><p class="checkout-aside__note">Only masked contact details are returned here.</p><a class="button button--outline" href="#/menu">Start another order</a></aside></div></section>`;
}

export function renderPage(route, context) {
  const { path } = route;
  if (path === "/") return renderHome(context);
  if (path === "/menu") return renderMenu(context);
  if (path.startsWith("/product/")) return renderProduct(decodeURIComponent(path.split("/")[2] || ""), context);
  if (path === "/build") return renderBuilder(context);
  if (path === "/drops") return renderDrops(context);
  if (path === "/boxes") return renderBoxes(context);
  if (path === "/gift-cards") return renderGiftCards(context);
  if (path === "/catering") return renderCatering(context);
  if (path === "/rewards") return renderRewards(context);
  if (path === "/location") return renderLocation(context);
  if (path === "/account") return renderAccount(context);
  if (path === "/about") return renderAbout(context);
  if (path === "/states") return renderStates(context);
  if (path === "/checkout") return renderCheckout(context);
  if (path.startsWith("/order/")) return renderOrder(decodeURIComponent(path.split("/")[2] || ""), context);
  if (path.startsWith("/info/")) return renderInfo(path);
  return renderNotFound();
}

export function renderFooter(data) {
  return `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand"><img src="../brand/assets/logos/st-juice-lockup-horizontal.svg" alt="ST. JUICE" width="194" height="54" /><p>${escapeHtml(data.copy.footer.line)}</p><p>11 S Vandeventer Ave · St. Louis, Missouri</p></div>
        <div class="footer-column"><h2>Menu</h2><a href="#/menu">Full menu</a><a href="#/build">Build Your Mood</a><a href="#/drops">New Drops</a><a href="#/boxes">Party Boxes</a><a href="#/catering">Catering</a></div>
        <div class="footer-column"><h2>ST. JUICE</h2><a href="#/about">Our story</a><a href="#/rewards">Rewards</a><a href="#/gift-cards">Gift cards</a><a href="#/location">Location & hours</a><a href="#/account">Account</a></div>
        <div class="footer-column"><h2>Help</h2><a href="#/info/allergens">Nutrition & Allergens</a><a href="#/info/privacy">Privacy</a><a href="#/info/terms">Terms</a><a href="#/info/refunds">Refunds</a><a href="#/info/cookies">Cookies</a><a href="#/info/accessibility">Accessibility</a><a href="#/info/contact">Contact</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 ST. JUICE</span><span>11 S Vandeventer Ave · St. Louis, Missouri</span></div>
    </div>`;
}

export function renderAccountDialog(state) {
  const signedIn = Boolean(state.account?.signedIn);
  return `
    <p class="lede" style="font-size:.9rem">${signedIn ? `Signed in as ${escapeHtml(state.account.profile.name || state.account.profile.email)}.` : "Guest browsing stays open. Member experiences require an account."}</p>
    <div class="mode-cards">
      ${Object.entries(modes).map(([id, mode]) => {
        const available = id === "guest" || (signedIn && state.account.profile.mode === id);
        const label = state.mode === id ? "Current experience" : available ? "Open experience" : "Sign in to unlock";
        return `
        <button class="mode-card ${state.mode === id ? "is-active" : ""}" type="button" data-action="set-mode" data-mode="${id}">
          <span class="mode-card__icon">${icon(mode.icon)}</span><strong>${escapeHtml(mode.label)}</strong><small>${escapeHtml(mode.line)}</small><span class="mode-card__state">${label}</span>
        </button>`;
      }).join("")}
    </div>
    <div class="info-panel" style="margin-top:1rem"><h3>Experience access</h3><p>Regular, Student and Business experiences are tied to the signed-in account. Guest browsing never requires an account.</p></div>
    <a class="button button--outline" href="#/account" data-action="close-dialog" style="margin-top:1rem;width:100%">Manage account</a>`;
}

export function renderServiceDialog(state) {
  return Object.entries(serviceModes).map(([id, service]) => `
    <button class="service-option ${state.service === id ? "is-active" : ""}" type="button" data-action="set-service" data-service="${id}"><span data-icon="${service.icon}"></span><strong>${escapeHtml(service.label)}</strong><small>${escapeHtml(service.detail)}</small></button>`).join("");
}

export function renderCart(data, state) {
  if (!state.cart.length) return `<div class="empty-state"><span class="empty-state__icon">${icon("bag")}</span><h3>${escapeHtml(data.copy.cartCheckout.emptyCart)}</h3><p>Start with a signature, a drop or a mood of your own.</p><a class="button" href="#/menu" data-action="close-dialog">${escapeHtml(data.copy.cartCheckout.emptyCartCta)}</a></div>`;
  const subtotal = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return `
    <div class="cart-list">
      ${state.cart.map((item) => `
        <article class="cart-item">
          <div class="cart-item__image"><img src="${escapeHtml(item.image)}" alt="" width="90" height="100" /></div>
          <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.sizeLabel || "Custom build")}</p>${item.modifiers?.length ? `<p>${escapeHtml(item.modifiers.join(" · "))}</p>` : ""}<div class="quantity-control"><button type="button" data-action="cart-quantity" data-key="${escapeHtml(item.key)}" data-delta="-1" aria-label="Decrease quantity">${icon("minus")}</button><span>${item.quantity}</span><button type="button" data-action="cart-quantity" data-key="${escapeHtml(item.key)}" data-delta="1" aria-label="Increase quantity">${icon("plus")}</button></div></div>
          <div><span class="cart-item__price">${money(item.unitPrice * item.quantity)}</span><button class="icon-button" type="button" data-action="remove-cart-item" data-key="${escapeHtml(item.key)}" aria-label="Remove ${escapeHtml(item.name)}">${icon("close")}</button></div>
        </article>`).join("")}
    </div>
    <div class="cart-summary"><div class="cart-summary__row"><span>Service</span><strong>${escapeHtml(serviceModes[state.service].label)}</strong></div><div class="cart-summary__row"><span>Displayed subtotal</span><strong>${money(subtotal)}</strong></div><div class="cart-summary__row"><span>Tax and fees</span><span>Server review required</span></div><div class="cart-summary__row cart-summary__row--total"><span>Current total</span><strong>${money(subtotal)}</strong></div><button class="button" type="button" data-action="checkout-preview">Continue to checkout</button><p style="margin:.7rem 0 0;color:var(--text-muted);font-size:.67rem">Your bag is recalculated before checkout. Online payment is not live yet.</p></div>`;
}
