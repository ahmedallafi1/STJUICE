import { renderPage as originalRenderPage, renderFooter as originalRenderFooter } from "./views.js";

// HQ-only public catalog presentation. Keep the original design and fully
// functioning demo cart, but remove old standalone boxes/custom products.
function removeCard(html, marker) {
  const center = html.indexOf(marker);
  if (center < 0) return html;
  const start = html.lastIndexOf('<article class="feature-card">', center);
  const end = html.indexOf("</article>", center);
  return start >= 0 && end >= 0 ? html.slice(0, start) + html.slice(end + 10) : html;
}

function removeSection(html, marker) {
  const center = html.indexOf(marker);
  if (center < 0) return html;
  const start = html.lastIndexOf('<section class="', center);
  const end = html.indexOf("</section>", center);
  return start >= 0 && end >= 0 ? html.slice(0, start) + html.slice(end + 10) : html;
}

export function renderPage(route, context) {
  const path = route.path;
  if (path === "/build" || path === "/boxes") {
    return originalRenderPage({ ...route, path: "/menu" }, context);
  }
  let html = originalRenderPage(route, context);
  if (path === "/") {
    html = removeCard(html, 'birthday-box-concept-v1.webp');
    html = removeSection(html, '<p class="eyebrow">BUILD YOUR MOOD</p>');
    html = removeSection(html, '<p class="eyebrow">PARTY BOXES</p>');
    html = html.replaceAll('href="/build"', 'href="/menu?category=fresh-juices"');
    html = html.replaceAll('href="/boxes"', 'href="/catering"');
    html = html.replaceAll('PARTY BOXES', 'CATERING & GROUP ORDERS');
    html = html.replaceAll('Party Boxes and catering make the bigger order feel just as intentional as the single cup.', 'Group inquiries use the same 40-product HQ menu.');
  }
  return html;
}

export function renderFooter(data) {
  return originalRenderFooter(data)
    .replaceAll('<a href="/build">Build Your Mood</a>', '<a href="/menu?category=fresh-juices">Fresh Juices</a>')
    .replaceAll('<a href="/boxes">Party Boxes</a>', '<a href="/catering">Catering</a>');
}
