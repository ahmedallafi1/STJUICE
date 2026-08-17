const paths = {
  catalog: "../menu/data/catalog.json",
  modifiers: "../menu/data/modifiers.json",
  builder: "../menu/data/build-your-mood.json",
  bundles: "../menu/data/bundles-catering.json",
  copy: "../content/site-copy.json",
  media: "../media/manifests/media-manifest.json"
};

export async function loadProjectData() {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, url]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Unable to load ${key}: ${response.status}`);
      return [key, await response.json()];
    })
  );

  const data = Object.fromEntries(entries);
  data.productById = new Map(data.catalog.products.map((item) => [item.id, item]));
  data.categoryById = new Map(data.catalog.categories.map((item) => [item.id, item]));
  data.modifierById = new Map(data.modifiers.groups.map((item) => [item.id, item]));
  return data;
}

export function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function routeInfo() {
  const raw = window.location.hash.slice(1) || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const normalized = `/${pathPart}`.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return { path: normalized, params: new URLSearchParams(queryPart) };
}

export function productStartingPrice(product) {
  return Math.min(...product.sizes.map((size) => Number(size.price)));
}

export function productImage(product) {
  const direct = {
    "pistachio-saint": "../media/optimized/webp/products/pistachio-saint-concept-v1.webp",
    "saint-sunset": "../media/optimized/webp/products/saint-sunset-concept-v1.webp",
    "dubai-strawberry-cup": "../media/optimized/webp/products/dubai-strawberry-cup-concept-v1.webp",
    "st-crepe": "../media/optimized/webp/products/st-crepe-concept-v1.webp",
    "dragon-cloud-cup": "../media/optimized/webp/products/dragon-cloud-cup-concept-v1.webp",
    "birthday-box": "../media/optimized/webp/packaging/birthday-box-concept-v1.webp"
  };
  return direct[product.id] || categoryImage(product.categoryId);
}

export function categoryImage(categoryId) {
  const known = new Set([
    "signatures",
    "fresh-juices",
    "smoothies-protein",
    "refreshers",
    "bowls-fruit",
    "chocolate-lab",
    "crepes-waffles",
    "mini-pancakes",
    "soft-serve-shakes",
    "dubai-collection",
    "desserts-drops",
    "flights-liters-boxes"
  ]);
  const safe = known.has(categoryId) ? categoryId : "signatures";
  return `../media/optimized/webp/categories/${safe}-concept-v1.webp`;
}

export function uniqueValues(products, key) {
  return [...new Set(products.flatMap((product) => product[key] || []))].sort((a, b) => a.localeCompare(b));
}

export function titleCase(value = "") {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function icon(name) {
  const pathsByName = {
    home: '<path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.8v-6.7H9.3V21H3.5a.5.5 0 0 1-.5-.5z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    spark: '<path d="m12 2 1.7 5.2L19 9l-5.3 1.8L12 16l-1.7-5.2L5 9l5.3-1.8z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.4 3.4-6.5 8-6.5s7.3 2.1 8 6.5"/>',
    bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    search: '<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.2 16.2 4.4 4.4"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    pickup: '<path d="M4 8h16v12H4zM7 8V5h10v3"/><path d="M8 13h8M8 16h5"/>',
    delivery: '<path d="M3 6h11v12H3zM14 10h4l3 4v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    dine: '<path d="M7 3v18M4 3v6c0 2 1 3 3 3s3-1 3-3V3M17 3v18M17 3c3 2 4 6 0 9"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    alert: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17.5h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    reward: '<path d="M4 10h16v11H4zM12 10v11M3 7.5A2.5 2.5 0 0 1 5.5 5C9 5 12 10 12 10H5.5A2.5 2.5 0 0 1 3 7.5ZM21 7.5A2.5 2.5 0 0 0 18.5 5C15 5 12 10 12 10h6.5A2.5 2.5 0 0 0 21 7.5Z"/>',
    heart: '<path d="M20.8 5.8c-2.2-2.2-5.7-2.2-7.9 0L12 6.7l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 22l8.8-8.3a5.6 5.6 0 0 0 0-7.9Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'
  };
  const body = pathsByName[name] || pathsByName.spark;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = icon(element.dataset.icon);
  });
}

export function mediaBadge(label = "Concept visual") {
  return `<span class="media-status">${escapeHtml(label)}</span>`;
}

export function buildProductCard(product, data, options = {}) {
  const category = data.categoryById.get(product.categoryId);
  const complex = (product.modifierGroupIds || []).length > 2 || product.catalogRole === "group_format";
  const actionText = complex ? "Customize" : "Quick add";
  const action = complex ? `href="#/product/${escapeHtml(product.id)}"` : `href="#/product/${escapeHtml(product.id)}" data-action="quick-add" data-product-id="${escapeHtml(product.id)}"`;
  const loading = options.eager ? "eager" : "lazy";
  return `
    <article class="product-card">
      <a class="product-card__media" href="#/product/${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.name)}">
        ${mediaBadge()}
        <img src="${productImage(product)}" alt="Concept visual for ${escapeHtml(product.name)}" loading="${loading}" width="720" height="900" />
      </a>
      <div class="product-card__body">
        <div class="product-card__meta">
          <span class="product-card__category">${escapeHtml(category?.name || "ST. JUICE")}</span>
          <span class="working-badge">Working price</span>
        </div>
        <h3><a href="#/product/${escapeHtml(product.id)}">${escapeHtml(product.name)}</a></h3>
        <p class="product-card__description">${escapeHtml(product.description)}</p>
        <div class="price-row">
          <span class="product-card__price">From ${money(productStartingPrice(product))}</span>
          <span class="working-badge">${escapeHtml(product.productType)}</span>
        </div>
        <div class="product-card__actions">
          <a class="button button--small" ${action}>${actionText}</a>
          <a class="button button--outline button--small" href="#/product/${escapeHtml(product.id)}" aria-label="See details for ${escapeHtml(product.name)}">Details</a>
          ${options.favoriteButton ? `<button class="icon-button" type="button" data-action="toggle-favorite" data-product-id="${escapeHtml(product.id)}" aria-label="Toggle ${escapeHtml(product.name)} favorite">${icon("heart")}</button>` : ""}
        </div>
      </div>
    </article>`;
}
