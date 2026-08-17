import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteDirectory = fileURLToPath(new URL(".", import.meta.url));
const packageRoot = resolve(siteDirectory, "..");
const port = Number(process.env.ST_JUICE_PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function resolveRequest(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = normalize(join(packageRoot, decoded));
  return candidate.startsWith(packageRoot) ? candidate : null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");

  if (url.pathname === "/") {
    response.writeHead(302, { Location: "/site/" });
    response.end();
    return;
  }

  let filePath = resolveRequest(url.pathname);
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`ST. JUICE Stage 05 is running at http://127.0.0.1:${port}/site/`);
});
