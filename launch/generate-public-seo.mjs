import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const origin = String(process.env.ST_JUICE_PUBLIC_ORIGIN || "").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)) throw new Error("Set ST_JUICE_PUBLIC_ORIGIN to the approved HTTPS origin before generating public SEO files.");

const indexPath = resolve(root, "site/index.html");
let index = readFileSync(indexPath, "utf8");
index = index.replace('<meta name="robots" content="noindex, nofollow, noarchive" />', '<meta name="robots" content="index, follow" />');
if (!index.includes('rel="canonical"')) index = index.replace("    <title>", `    <link rel="canonical" href="${origin}/site/" />\n    <meta property="og:url" content="${origin}/site/" />\n    <title>`);
writeFileSync(indexPath, index);

writeFileSync(resolve(root, "site/robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/site/sitemap.xml\n`);
// URL fragments are client-side state and must not be listed as separate sitemap URLs.
const urls = ["/site/"];
writeFileSync(resolve(root, "site/sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(JSON.stringify({ status: "generated", origin, files: ["site/index.html", "site/robots.txt", "site/sitemap.xml"] }, null, 2));
