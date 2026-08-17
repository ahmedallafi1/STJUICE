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
    detail: "Authentication and live rewards connect in Stage 07."
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

const serviceModes = {
  pickup: { label: "Pickup", icon: "pickup", detail: "Pick up on Vandeventer" },
  delivery: { label: "Delivery", icon: "delivery", detail: "Address eligibility checked later" },
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
    guest: { eyebrow: "ONE MENU · NO WALLS", title: "Start where the craving is.", body: "Browse as a guest, choose pickup or delivery and build the order before deciding whether an account is useful." },
    regular: { eyebrow: "REGULAR MODE", title: "Your usual, without the usual wait.", body: "Favorites, saved mixes and reorder tools are designed into the experience and will activate with accounts in Stage 07." },
    student: { eyebrow: "STUDENT MODE", title: "Study fuel meets the sweet break.", body: "Student-value merchandising and Study Night Boxes move forward without copying or implying affiliation with any university." },
    business: { eyebrow: "BUSINESS MODE", title: "The whole room has a mood.", body: "Move from office boxes to catered dessert tables with clear lead times and a quote-first workflow." }
  }[state.mode];

  return `
    ${modeRibbon(state)}
    <section class="hero">
      <picture>
        <source media="(max-width: 760px)" srcset="../media/optimized/webp/hero/st-juice-hero-960.webp" />
        <img class="hero__image" src="../media/optimized/webp/hero/st-juice-hero-1600.webp" alt="Concept tableau of ST. JUICE drinks and desserts" width="1599" height="900" fetchpriority="high" />
      </picture>
      <span class="media-status" style="top:1rem;left:auto;right:1rem">Concept visual</span>
      <div class="hero__veil" aria-hidden="true"></div>
      <div class="hero__content">
        <div class="hero__copy">
          <p class="eyebrow">${escapeHtml(copy.home.hero.eyebrow)}</p>
          <h1>${escapeHtml(copy.home.hero.headline)}</h1>
          <p class="hero__body">${escapeHtml(copy.home.hero.body)}</p>
          <div class="button-row">
            <a class="button" href="#/menu">${escapeHtml(copy.home.hero.primaryCta)}</a>
            <a class="button button--outline" href="#/menu">${escapeHtml(copy.home.hero.secondaryCta)}</a>
          </div>
          <div class="hero__meta">
            <span>Open from 6:30 AM</span>
            <span>Pickup · Delivery · Dine-in</span>
            <span>Friday + Saturday until 11 PM</span>
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
          <div>
            <p class="eyebrow">THIS WEEK AT ST. JUICE</p>
            <h2>${escapeHtml(copy.drops.title)}</h2>
            <p class="lede">${escapeHtml(copy.drops.intro)}</p>
          </div>
          <a class="text-link" href="#/drops">See both drops ${icon("arrow")}</a>
        </div>
        <div class="feature-grid">
          ${drops.map((product) => `
            <article class="feature-card">
              ${mediaBadge()}
              <img src="${productImage(product)}" alt="Concept visual for ${escapeHtml(product.name)}" loading="lazy" width="720" height="900" />
              <div class="feature-card__content">
                <p class="eyebrow">ACTIVE DROP</p>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.description)}</p>
                <a class="button button--light button--small" href="#/product/${escapeHtml(product.id)}">Order the drop</a>
              </div>
            </article>`).join("")}
          <article class="feature-card">
            ${mediaBadge("Packaging concept")}
            <img src="../media/optimized/webp/packaging/birthday-box-concept-v1.webp" alt="Concept Birthday Box presentation" loading="lazy" width="720" height="900" />
            <div class="feature-card__content">
              <p class="eyebrow">GROUP MOOD</p>
              <h3>Build the table.</h3>
              <p>Study night, birthdays and the whole office—one format, a lot of ways to finish it.</p>
              <a class="button button--light button--small" href="#/boxes">Explore boxes</a>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="section section--surface">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">SHOP BY TYPE</p><h2>Find the lane. Then make it yours.</h2></div>
          <a class="text-link" href="#/menu">View the full menu ${icon("arrow")}</a>
        </div>
        <div class="category-grid">${categoryCards(data)}</div>
      </div>
    </section>

    <section class="section section--cream">
      <div class="container">
        <div class="section-heading">
          <div>
            <p class="eyebrow">SIGNATURES FIRST</p>
            <h2>${escapeHtml(copy.home.signatures.headline)}</h2>
            <p class="lede">${escapeHtml(copy.home.signatures.body)}</p>
          </div>
          <a class="button button--outline" href="#/menu?category=signatures">${escapeHtml(copy.home.signatures.cta)}</a>
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
          <span class="media-status">Original motion prototype</span>
          <img src="../media/motion/st-juice-hero-loop.svg" alt="Abstract pistachio motion illustration" loading="lazy" width="1600" height="900" />
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">${escapeHtml(modeFeature.eyebrow)}</p><h2>${escapeHtml(modeFeature.title)}</h2><p class="lede">${escapeHtml(modeFeature.body)}</p></div>
          <button class="button" type="button" data-action="open-account">Choose your experience</button>
        </div>
        <div class="account-showcase">
          ${mediaBadge()}
          <img src="../media/optimized/webp/account-modes/account-modes-concept-v1.webp" alt="Concept scenes for regular, student and business experiences" loading="lazy" width="1400" height="700" />
          <div class="account-showcase__overlay">
            <div class="account-showcase__copy">
              <p class="eyebrow">ONE CATALOG · THREE DIRECTIONS</p>
              <h2>Same ST. JUICE. Your shortcuts.</h2>
              <p>Theme, offers and merchandising can change. Product facts, allergens, fees and availability never change silently.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--cream">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">BOXED FOR THE MOMENT</p><h2>${escapeHtml(copy.boxes.title)}</h2><p class="lede">${escapeHtml(copy.boxes.intro)}</p></div>
          <a class="button button--outline" href="#/boxes">${escapeHtml(copy.boxes.cta)}</a>
        </div>
        <div class="product-grid">${boxes.map((product) => buildProductCard(product, data)).join("")}</div>
      </div>
    </section>

    <section class="section section--dark">
      <div class="container">
        <div class="section-heading"><div><p class="eyebrow">WHY ST. JUICE</p><h2>Bright when you need it. Extra when you want it.</h2></div></div>
        <div class="principle-grid">
          <article class="principle-card"><span class="principle-card__number">01</span><h3>Fresh starts early.</h3><p>Juices, smoothies, protein-ready blends and bowls begin at 6:30 AM.</p></article>
          <article class="principle-card"><span class="principle-card__number">02</span><h3>Dessert owns the night.</h3><p>Crepes, chocolate, mini pancakes, pistachio and limited drops carry the late shift.</p></article>
          <article class="principle-card"><span class="principle-card__number">03</span><h3>The whole table counts.</h3><p>Personal builds, date-night formats, student boxes and catering all share one system.</p></article>
        </div>
      </div>
    </section>

    <section class="section section--surface">
      <div class="container split-feature">
        <div class="split-feature__media">
          ${mediaBadge("Storyboard concept")}
          <img src="../media/optimized/webp/motion/hero-loop-storyboard-concept-v1.webp" alt="Six-frame concept storyboard for ST. JUICE motion" loading="lazy" width="1200" height="800" />
        </div>
        <div class="split-feature__copy">
          <p class="eyebrow">FRESH BY DAY · SWEET AFTER DARK</p>
          <h2>Made to move, never to slow the order.</h2>
          <p class="lede">The visual direction starts with pours, drizzles, finishing and unboxing. Every important video keeps a still fallback.</p>
          <a class="text-link" href="#/states">Preview interface states ${icon("arrow")}</a>
        </div>
      </div>
    </section>

    <section class="section section--soft">
      <div class="container location-layout">
        <div class="location-card">
          <p class="eyebrow">FIRST HOME</p>
          <h2>${escapeHtml(copy.home.location.headline)}</h2>
          <div class="location-card__facts">
            <div class="location-fact"><span class="location-fact__icon">${icon("pin")}</span><div><strong>${escapeHtml(copy.home.location.address)}</strong><span>St. Louis, Missouri</span></div></div>
            <div class="location-fact"><span class="location-fact__icon">${icon("clock")}</span><div><strong>${escapeHtml(copy.home.location.hours)}</strong><span>One branch at launch</span></div></div>
            <div class="location-fact"><span class="location-fact__icon">${icon("pickup")}</span><div><strong>Dine-in · Pickup · Delivery</strong><span>No dedicated private parking is advertised.</span></div></div>
          </div>
          <a class="button" href="#/location">View location details</a>
        </div>
        <div class="map-card" aria-label="Stylized location placeholder">
          <div class="map-pin"><img src="../brand/assets/logos/st-juice-fruit-mark.svg" alt="" /></div>
          <div class="map-card__label"><strong>11 S Vandeventer Ave</strong><br /><span>Map service connects at launch.</span></div>
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

export function ensureProductDraft(product, data, state) {
  if (!state.productDrafts[product.id]) {
    const modifiers = {};
    for (const groupId of product.modifierGroupIds || []) {
      const group = data.modifierById.get(groupId);
      if (group?.selection?.min > 0 && group.options?.length) modifiers[groupId] = [group.options[0].id];
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
    for (const selectedId of selectedIds) {
      const option = group?.options?.find((item) => item.id === selectedId);
      total += Number(option?.price || 0);
    }
  }
  return total;
}

function productModifierGroups(product, draft, data) {
  return (product.modifierGroupIds || []).map((groupId) => data.modifierById.get(groupId)).filter(Boolean).map((group) => {
    const selection = draft.modifiers[group.id] || [];
    if (!group.options?.length) {
      return `<div class="info-panel"><h3>${escapeHtml(group.name)}</h3><p>This group uses catalog-dependent choices. The final selector connects with live availability in the ordering stage.</p></div>`;
    }
    const multiple = group.selection?.max > 1;
    return `
      <fieldset class="choice-group">
        <legend>${escapeHtml(group.name)} <span class="choice-group__hint">${group.selection?.min ? "Required" : "Optional"} · up to ${group.selection?.max || 1}</span></legend>
        <div class="choice-list ${group.options.length > 3 ? "choice-list--grid" : ""}">
          ${group.options.map((option) => `
            <label class="choice-option">
              <input type="${multiple ? "checkbox" : "radio"}" name="modifier-${escapeHtml(product.id)}-${escapeHtml(group.id)}" value="${escapeHtml(option.id)}" data-product-modifier="${escapeHtml(group.id)}" data-product-id="${escapeHtml(product.id)}" ${selection.includes(option.id) ? "checked" : ""} />
              <span class="choice-option__name">${escapeHtml(option.name)}</span>
              <span class="choice-option__price">${Number(option.price || 0) ? `+${money(option.price)}` : "Included"}</span>
            </label>`).join("")}
        </div>
      </fieldset>`;
  }).join("");
}

function renderProduct(productId, { data, state }) {
  const product = data.productById.get(productId);
  if (!product) return renderNotFound();
  const draft = ensureProductDraft(product, data, state);
  const size = product.sizes.find((item) => item.id === draft.sizeId) || product.sizes[0];
  const total = calculateProductPrice(product, draft, data);
  const category = data.categoryById.get(product.categoryId);
  const pairings = (product.pairingIds || []).map((id) => data.productById.get(id)).filter(Boolean).slice(0, 4);
  const alternatives = (product.alternativeIds || []).map((id) => data.productById.get(id)).filter(Boolean).slice(0, 4);

  return `
    <section class="product-page">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/menu">Menu</a><span>/</span><a href="#/menu?category=${escapeHtml(product.categoryId)}">${escapeHtml(category?.name || "Category")}</a><span>/</span><span aria-current="page">${escapeHtml(product.name)}</span></nav>
        <div class="product-detail">
          <div class="product-detail__media">
            <div class="product-detail__image">
              ${mediaBadge()}
              <img src="${productImage(product)}" alt="Concept visual for ${escapeHtml(product.name)}" width="720" height="900" fetchpriority="high" />
            </div>
            <div class="product-detail__thumbs">
              <div class="product-detail__thumb"><strong>Concept packshot</strong><br />Replace with real front image.</div>
              <div class="product-detail__thumb"><strong>Macro pending</strong><br />Real texture capture required.</div>
              <div class="product-detail__thumb"><strong>Scale pending</strong><br />Real vessel and hand view.</div>
            </div>
          </div>
          <div class="product-detail__copy">
            <p class="eyebrow">${escapeHtml(category?.name || "ST. JUICE")} · ${product.catalogRole === "group_format" ? "GROUP FORMAT" : "MADE TO ORDER"}</p>
            <h1>${escapeHtml(product.name)}</h1>
            <p class="product-detail__description">${escapeHtml(product.description)}</p>
            <div class="product-detail__price">${money(total)} <span class="working-badge">Working price</span></div>

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

            <div class="info-panel" style="margin-top:1.5rem">
              <h3>What's inside</h3>
              <p>${escapeHtml((product.draftIngredients || []).join(" · ") || "Recipe detail pending operational verification.")}</p>
            </div>
            <div class="info-panel">
              <h3>Allergen information</h3>
              <p>${escapeHtml(data.copy.product.allergenNote)}</p>
              <div class="allergen-row">${(product.containsAllergens || []).length ? product.containsAllergens.map((item) => `<span class="allergen-pill">Contains ${escapeHtml(titleCase(item))}</span>`).join("") : `<span class="chip">No fixed allergen listed · cross-contact possible</span>`}</div>
            </div>
            <div class="info-panel">
              <h3>Nutrition status</h3>
              <p>${escapeHtml(data.copy.product.nutritionUnverified)}</p>
            </div>
            <div class="info-panel">
              <h3>Service and preparation</h3>
              <p>${escapeHtml((product.availability?.channels || []).map(titleCase).join(" · "))} · Working prep estimate ${product.prepTimeMinutes?.min || "—"}–${product.prepTimeMinutes?.max || "—"} minutes · delivery suitability ${escapeHtml(product.availability?.deliverySuitability || "pending")}.</p>
            </div>

            <div class="product-order-bar">
              <div class="product-order-bar__total"><small>Live total</small><strong>${money(total)}</strong></div>
              <button class="button" type="button" data-action="add-product" data-product-id="${escapeHtml(product.id)}">${escapeHtml(data.copy.product.primaryCta)}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
    ${(pairings.length || alternatives.length) ? `
      <section class="section section--surface">
        <div class="container">
          <div class="section-heading"><div><p class="eyebrow">GOES WELL WITH</p><h2>Keep the mood going.</h2></div></div>
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

function builderOptionPrice(stepId, option) {
  if (stepId === "fruit-flavor") return Number(option.priceAfterIncluded || 0);
  return Number(option.price || 0);
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
      if (option && index >= free) total += builderOptionPrice(step.id, option);
    });
  }
  return total;
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
      <div class="review-card"><h3>Save status</h3><p>${state.mode === "guest" ? escapeHtml(data.copy.buildYourMood.guestSaveNote) : "Saved mixes activate with authenticated accounts in Stage 07."}</p></div>
    </div>`;

  const optionMarkup = compatible.length ? `
    <div class="builder-options">
      ${options.map((option) => {
        const allowed = builderOptionAllowed(step, option, data, state);
        const active = selected.includes(option.id);
        const optionPrice = step.id === "base" ? option.basePrice : builderOptionPrice(step.id, option);
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
                ? `<button class="button" type="button" data-action="builder-add" ${base ? "" : "disabled"}>Add mood · ${money(total)}</button>`
                : `<button class="button" type="button" data-action="builder-next" ${canNext ? "" : "disabled"}>Continue ${icon("arrow")}</button>`}
            </div>
          </div>
        </section>
        <aside class="builder-summary" aria-label="Current build summary">
          <div class="builder-summary__visual"><span class="media-status">Concept visual</span><img src="../media/optimized/webp/products/pistachio-saint-concept-v1.webp" alt="Concept product used as a builder placeholder" width="720" height="900" /></div>
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
  return `
    ${pageHero("LIMITED · TRACEABLE · CURRENT", data.copy.drops.title, data.copy.drops.intro)}
    <section class="section section--cream">
      <div class="container">
        <div class="feature-grid">
          ${active.map((product, index) => `<article class="feature-card ${index === 0 ? "" : ""}">${mediaBadge()}<img src="${productImage(product)}" alt="Concept visual for ${escapeHtml(product.name)}" width="720" height="900" /><div class="feature-card__content"><p class="eyebrow">DROP 0${index + 1} · ACTIVE</p><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><a class="button button--light button--small" href="#/product/${escapeHtml(product.id)}">${escapeHtml(data.copy.drops.cta)}</a></div></article>`).join("")}
          <article class="feature-card"><img src="${categoryImage("desserts-drops")}" alt="Concept dessert scene" width="360" height="360" /><div class="feature-card__content"><p class="eyebrow">THE ARCHIVE</p><h3>Had its moment.</h3><p>${escapeHtml(data.copy.drops.expiredState)}</p><a class="button button--light button--small" href="#/menu?category=desserts-drops">See what is live</a></div></article>
        </div>
        <div class="info-panel" style="margin-top:1.5rem"><h3>No fake countdown</h3><p>Drop dates and inventory must come from live operations. The interface intentionally avoids a countdown until a truthful end time is configured.</p></div>
      </div>
    </section>`;
}

function renderBoxes({ data }) {
  const cards = data.bundles.orderNowBoxes.map((box) => ({ ...box, product: data.productById.get(box.productId) }));
  return `
    ${pageHero("PARTIES · STUDY NIGHTS · OFFICES", data.copy.boxes.title, data.copy.boxes.intro, `<a class="button" href="#/catering">Plan a larger event</a>`)}
    <section class="section section--surface">
      <div class="container split-feature" style="margin-bottom:clamp(3rem,6vw,5rem)">
        <div class="split-feature__copy"><p class="eyebrow">QUIET OUTSIDE · MOOD INSIDE</p><h2>Built to arrive like the occasion matters.</h2><p class="lede">The packaging direction is coordinated, but final counts, dimensions and vendor structures still require approval.</p></div>
        <div class="split-feature__media">${mediaBadge("Packaging concept")}<img src="../media/optimized/webp/packaging/birthday-box-concept-v1.webp" alt="Concept Birthday Box presentation" width="720" height="900" /></div>
      </div>
      <div class="container">
        <div class="box-grid">
          ${cards.map(({ product, ...box }) => `
            <article class="box-card">
              <div class="box-card__top"><div><p class="eyebrow">SERVES ${box.serves.min}–${box.serves.max}</p><h3>${escapeHtml(product?.name || box.productId)}</h3></div><span class="box-card__price">${box.startingAt ? "From " : ""}${money(box.basePrice)}</span></div>
              <ul class="compact-list">${box.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              <p class="working-badge">Lead time: ${box.leadTime.type === "scheduled" ? `${box.leadTime.minimumHours} hours minimum` : `${box.leadTime.minimumMinutes} minutes minimum`}</p>
              ${box.studentOfferEligible ? `<p class="chip" style="margin-top:.75rem">Student-offer eligible · terms pending</p>` : ""}
              <a class="button button--small" href="#/product/${escapeHtml(box.productId)}" style="margin-top:1rem">Start this box</a>
            </article>`).join("")}
        </div>
      </div>
    </section>`;
}

function renderCatering({ data, state }) {
  return `
    ${pageHero("MEETINGS · PARTIES · FULL ROOMS", data.copy.catering.title, data.copy.catering.intro, `<a class="button" href="#catering-form">${escapeHtml(data.copy.catering.primaryCta)}</a><a class="button button--outline" href="#/boxes">${escapeHtml(data.copy.catering.secondaryCta)}</a>`)}
    <section class="section section--cream">
      <div class="container">
        <div class="section-heading"><div><p class="eyebrow">STARTING DIRECTIONS</p><h2>Choose the service shape.</h2><p class="lede">Working rates help design the flow. A submitted request is not a booking or final quote.</p></div></div>
        <div class="package-grid">
          ${data.bundles.cateringPackages.map((item) => `
            <article class="package-card">
              <div class="package-card__top"><div><p class="eyebrow">${item.guestRange.min}–${item.guestRange.max} GUESTS</p><h3>${escapeHtml(item.name)}</h3></div><span class="package-card__price">From ${money(item.workingRate.startingAt)}<small>/${item.workingRate.type === "per_recipient" ? "recipient" : "guest"}</small></span></div>
              <ul class="compact-list">${item.includes.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
              <button class="button button--outline button--small" type="button" data-action="prefill-catering" data-package="${escapeHtml(item.id)}">Choose package</button>
            </article>`).join("")}
        </div>
      </div>
    </section>
    <section class="section section--surface" id="catering-form">
      <div class="container form-shell">
        <div>
          <p class="eyebrow">QUOTE-FIRST WORKFLOW</p>
          <h2>Tell us what the room needs.</h2>
          <p class="lede">${escapeHtml(data.copy.catering.support)}</p>
          <div class="timeline">
            <div class="timeline__item"><span class="timeline__dot">1</span><div><h3>Send the event details.</h3><p>Date, guest count, service style and contact information.</p></div></div>
            <div class="timeline__item"><span class="timeline__dot">2</span><div><h3>We confirm capacity.</h3><p>Selection, delivery and setup remain subject to manager review.</p></div></div>
            <div class="timeline__item"><span class="timeline__dot">3</span><div><h3>Approve the final quote.</h3><p>No event is booked until terms and payment steps are confirmed.</p></div></div>
          </div>
        </div>
        <form class="form-card" id="catering-request" novalidate>
          ${state.cateringSuccess ? `<div class="success-panel" role="status"><h3>Request received.</h3><p>${escapeHtml(data.copy.catering.success.replace("[CUSTOMER EMAIL]", state.cateringEmail || "your email"))}</p></div>` : `
            <div class="form-grid">
              <label class="form-field"><span>Contact name *</span><input class="field" name="contactName" autocomplete="name" required /></label>
              <label class="form-field"><span>Organization</span><input class="field" name="organization" autocomplete="organization" /></label>
              <label class="form-field"><span>Email *</span><input class="field" type="email" name="email" autocomplete="email" required /></label>
              <label class="form-field"><span>Phone *</span><input class="field" type="tel" name="phone" autocomplete="tel" required /></label>
              <label class="form-field"><span>Event date *</span><input class="field" type="date" name="eventDate" required /></label>
              <label class="form-field"><span>Service time *</span><input class="field" type="time" name="serviceTime" required /></label>
              <label class="form-field"><span>Guest count *</span><input class="field" type="number" name="guestCount" min="1" required /></label>
              <label class="form-field"><span>Service mode *</span><select class="field" name="serviceMode" required><option value="">Choose one</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option><option value="staffed_setup">Staffed setup</option></select></label>
              <label class="form-field form-field--full"><span>Package interest</span><select class="field" name="packageInterest" id="package-interest"><option value="">Not sure yet</option>${data.bundles.cateringPackages.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
              <label class="form-field form-field--full"><span>Dietary, allergen and event notes</span><textarea class="field" name="notes" placeholder="Tell us the service style, venue and anything the team should review."></textarea></label>
              <label class="checkbox-field form-field--full"><input type="checkbox" name="contactConsent" required /><span>I agree that ST. JUICE may contact me about this request. This is separate from marketing consent.</span></label>
              <div class="form-field--full"><button class="button" type="submit">Send request</button><p style="margin:.75rem 0 0;color:var(--text-muted);font-size:.7rem">Prototype only: this Stage 05 form does not transmit personal data.</p></div>
            </div>`}
        </form>
      </div>
    </section>`;
}

function renderRewards({ data, state }) {
  const tiers = [
    { name: "Fresh", cue: "Start earning", body: "A clean entry point for eligible purchases and birthday details." },
    { name: "Gold", cue: "Keep the streak", body: "Preview challenges, add-on offers and saved favorites." },
    { name: "Saint", cue: "Get there early", body: "Early-access eligibility and drop bonuses when configured." },
    { name: "Icon", cue: "Top mood", body: "A future high-engagement tier; exact liability and benefits remain unapproved." }
  ];
  return `
    ${pageHero("REWARDS · FAVORITES · REORDER", data.copy.rewards.title, data.copy.rewards.intro, `<button class="button" type="button" data-action="open-account">${escapeHtml(data.copy.rewards.cta)}</button>`)}
    <section class="section section--cream">
      <div class="container">
        <div class="reward-grid">${tiers.map((tier, index) => `<article class="reward-card"><span class="principle-card__number">0${index + 1}</span><p class="eyebrow">${escapeHtml(tier.cue)}</p><h3>${escapeHtml(tier.name)}</h3><p>${escapeHtml(tier.body)}</p></article>`).join("")}</div>
        <div class="info-panel" style="margin-top:1.5rem"><h3>Rules are not invented</h3><p>${escapeHtml(data.copy.rewards.disclaimer)} Points-per-dollar, redemption value, expiration, birthday value and referral terms will not be published until approved.</p></div>
      </div>
    </section>
    <section class="section section--surface"><div class="container split-feature"><div class="split-feature__copy"><p class="eyebrow">CURRENT EXPERIENCE</p><h2>${escapeHtml(modes[state.mode].label)} mode is on.</h2><p class="lede">${escapeHtml(modes[state.mode].line)} Switch modes to see how the palette, messages and shortcuts adapt without duplicating the catalog.</p><button class="button" type="button" data-action="open-account">Change experience</button></div><div class="split-feature__media">${mediaBadge()}<img src="../media/optimized/webp/account-modes/account-modes-concept-v1.webp" alt="Concept account mode scenes" width="1400" height="700" /></div></div></section>`;
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
        <div class="map-card"><div class="map-pin"><img src="../brand/assets/logos/st-juice-fruit-mark.svg" alt="" /></div><div class="map-card__label"><strong>11 S Vandeventer Ave</strong><br /><span>Interactive map and local structured data connect in later launch stages.</span></div></div>
      </div>
    </section>`;
}

function dashboardContent(mode, data) {
  if (mode === "guest") return `<div class="empty-state" style="min-height:22rem"><span class="empty-state__icon">${icon("user")}</span><h2>Keep browsing as a guest.</h2><p>Your cart and service choice work without an account. Choose an account type only when it adds value.</p><button class="button" type="button" data-action="open-account">See account options</button></div>`;
  const content = {
    regular: { title: "Your regular dashboard", metrics: [["—", "Points connect in Stage 07"], ["0", "Saved favorites"], ["0", "Saved mixes"]], note: "Orders, favorites, rewards and saved addresses share one account." },
    student: { title: "Your student dashboard", metrics: [["Pending", "Verification status"], ["—", "Eligible offers"], ["1", "Study Night Box"]], note: "Verification must be minimal, visible and free of implied university affiliation." },
    business: { title: "Your business dashboard", metrics: [["0", "Upcoming events"], ["0", "Saved locations"], ["Draft", "Quote status"]], note: "Recurring orders, business contacts, quotes and receipts appear here after integrations." }
  }[mode];
  return `<div class="dashboard-panel"><p class="eyebrow">${escapeHtml(modes[mode].label)}</p><h2>${escapeHtml(content.title)}</h2><p class="lede">${escapeHtml(content.note)}</p><div class="metric-grid">${content.metrics.map(([value, label]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("")}</div><div class="info-panel" style="margin-top:1rem"><h3>Prototype boundary</h3><p>No identity, verification, address or payment information is stored in Stage 05.</p></div></div>`;
}

function renderAccount({ data, state }) {
  return `
    ${pageHero("ACCOUNT EXPERIENCE", "One menu. Different shortcuts.", modes[state.mode].line, `<button class="button" type="button" data-action="open-account">Switch mode</button>`)}
    <section class="section section--cream">
      <div class="container dashboard">
        <nav class="dashboard-nav" aria-label="Account sections"><a class="is-active" href="#/account">Overview</a><a href="#/rewards">Rewards</a><a href="#/build">Saved mixes</a><a href="#/menu">Favorites</a><a href="#/states">Order states</a></nav>
        ${dashboardContent(state.mode, data)}
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
  const labels = { privacy: "Privacy Policy", terms: "Terms", accessibility: "Accessibility Statement", allergens: "Nutrition & Allergens", contact: "Contact" };
  const label = labels[slug] || "Information";
  return `${pageHero("LAUNCH CONTENT PLACEHOLDER", label, "The final reviewed content for this page is assigned to Stage 08.")}<section class="section section--cream"><div class="container"><div class="empty-state"><span class="empty-state__icon">${icon("info")}</span><h2>Structure is ready. Final policy is not published.</h2><p>This front-end route prevents a dead link while avoiding invented legal, nutrition, allergen or contact claims. Final content requires the actual business settings and appropriate review.</p><a class="button" href="#/">Back home</a></div></div></section>`;
}

function renderNotFound() {
  return `${pageHero("404", "That mood is not here.", "The route may have moved, or the item is not part of the launch catalog.")}<section class="section section--cream"><div class="container"><div class="empty-state"><span class="empty-state__icon">${icon("search")}</span><h2>Try the full menu.</h2><p>Every launch category and active product is available from one canonical source.</p><a class="button" href="#/menu">Explore the menu</a></div></div></section>`;
}

export function renderPage(route, context) {
  const { path } = route;
  if (path === "/") return renderHome(context);
  if (path === "/menu") return renderMenu(context);
  if (path.startsWith("/product/")) return renderProduct(decodeURIComponent(path.split("/")[2] || ""), context);
  if (path === "/build") return renderBuilder(context);
  if (path === "/drops") return renderDrops(context);
  if (path === "/boxes") return renderBoxes(context);
  if (path === "/catering") return renderCatering(context);
  if (path === "/rewards") return renderRewards(context);
  if (path === "/location") return renderLocation(context);
  if (path === "/account") return renderAccount(context);
  if (path === "/about") return renderAbout(context);
  if (path === "/states") return renderStates(context);
  if (path.startsWith("/info/")) return renderInfo(path);
  return renderNotFound();
}

export function renderFooter(data) {
  return `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand"><img src="../brand/assets/logos/st-juice-lockup-horizontal.svg" alt="ST. JUICE" width="194" height="54" /><p>${escapeHtml(data.copy.footer.line)}</p><p>11 S Vandeventer Ave · St. Louis, Missouri</p></div>
        <div class="footer-column"><h2>Order</h2><a href="#/menu">Menu</a><a href="#/build">Build Your Mood</a><a href="#/drops">Drops</a><a href="#/boxes">Party Boxes</a><a href="#/catering">Catering</a></div>
        <div class="footer-column"><h2>ST. JUICE</h2><a href="#/about">Our story</a><a href="#/rewards">Rewards</a><a href="#/location">Location & hours</a><a href="#/account">Account modes</a><a href="#/states">Interface states</a></div>
        <div class="footer-column"><h2>Trust</h2><a href="#/info/allergens">Nutrition & Allergens</a><a href="#/info/privacy">Privacy</a><a href="#/info/terms">Terms</a><a href="#/info/accessibility">Accessibility</a><a href="#/info/contact">Contact</a></div>
      </div>
      <div class="footer-bottom"><span>© 2026 ST. JUICE · Stage 05 front-end prototype</span><span>Generated food and packaging visuals are labeled concept placeholders.</span></div>
    </div>`;
}

export function renderAccountDialog(state) {
  return `
    <p class="lede" style="font-size:.9rem">Browse first. Choose a mode only when its shortcuts help you.</p>
    <div class="mode-cards">
      ${Object.entries(modes).map(([id, mode]) => `
        <button class="mode-card ${state.mode === id ? "is-active" : ""}" type="button" data-action="set-mode" data-mode="${id}">
          <span class="mode-card__icon">${icon(mode.icon)}</span><strong>${escapeHtml(mode.label)}</strong><small>${escapeHtml(mode.line)}</small><span class="mode-card__state">${state.mode === id ? "Current mode" : "Choose mode"}</span>
        </button>`).join("")}
    </div>
    <div class="info-panel" style="margin-top:1rem"><h3>Important</h3><p>Mode changes theme, merchandising and shortcuts. It never silently changes product facts, allergens, fees, taxes or availability.</p></div>
    <a class="button button--outline" href="#/account" data-action="close-dialog" style="margin-top:1rem;width:100%">View account dashboard</a>`;
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
    <div class="cart-summary"><div class="cart-summary__row"><span>Service</span><strong>${escapeHtml(serviceModes[state.service].label)}</strong></div><div class="cart-summary__row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="cart-summary__row"><span>Tax, fees and tip</span><span>Calculated in Stage 06</span></div><div class="cart-summary__row cart-summary__row--total"><span>Current total</span><strong>${money(subtotal)}</strong></div><button class="button" type="button" data-action="checkout-preview">Continue to checkout</button><p style="margin:.7rem 0 0;color:var(--text-muted);font-size:.67rem">Real payment, tax, fees and order submission connect in Stage 06.</p></div>`;
}
