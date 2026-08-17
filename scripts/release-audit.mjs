import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const textNames = new Set(["Dockerfile", ".dockerignore", ".env.example", ".gitignore", ".nvmrc"]);
const textExts = new Set([".md", ".json", ".js", ".mjs", ".html", ".css", ".txt", ".webmanifest", ".yml", ".yaml"]);
const files = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if ([".git", "node_modules", "dist-public"].includes(name)) continue;
    const path = resolve(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(root);

const textFiles = files.filter((path) => textNames.has(path.split("/").pop()) || textExts.has(extname(path)));
const decoder = new TextDecoder("utf-8", { fatal: true });
let words = 0;
let markdownLinks = 0;
for (const path of textFiles) {
  const bytes = readFileSync(path);
  assert.doesNotThrow(() => decoder.decode(bytes), `${relative(root, path)} must be valid UTF-8`);
  const text = bytes.toString("utf8");
  assert.ok(!text.includes("\u0000"), `${relative(root, path)} must not contain NUL bytes`);
  words += (text.match(/\b[\p{L}\p{N}][\p{L}\p{N}’'._-]*\b/gu) || []).length;
  if ([".json", ".webmanifest"].includes(extname(path)) || path.endsWith("package-lock.json")) {
    assert.doesNotThrow(() => JSON.parse(text), `${relative(root, path)} must contain valid JSON`);
  }
  if (extname(path) === ".md") {
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].trim().replace(/^<|>$/g, "").split("#")[0].split("?")[0];
      if (!target || /^(?:https?:|mailto:|tel:|data:)/i.test(target)) continue;
      markdownLinks += 1;
      assert.ok(statSafe(resolve(dirname(path), decodeURIComponent(target))), `${relative(root, path)} has a broken link: ${match[1]}`);
    }
  }
}

function statSafe(path) {
  try { return statSync(path).isFile() || statSync(path).isDirectory(); }
  catch { return false; }
}

const combinedCurrent = [
  "README.md", "SITE_FRONTEND_INDEX.md", "ORDERING_SYSTEM_INDEX.md",
  "site/README.md", "ordering/README.md", "ordering/API.md", "launch/README.md"
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
for (const phrase of ["assigned to Stage", "belongs to Stage 07", "belongs to Stage 08", "Trust placeholders", "Stage 06 Site and Checkout"]) {
  assert.ok(!combinedCurrent.includes(phrase), `Current documentation must not contain stale phrase: ${phrase}`);
}

const allText = textFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[opsu]_[A-Za-z0-9]{30,}\b/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/
];
for (const pattern of secretPatterns) assert.ok(!pattern.test(allText), `Repository must not contain credentials matching ${pattern}`);

for (const path of files) assert.ok(statSync(path).size < 100 * 1024 * 1024, `${relative(root, path)} exceeds GitHub's 100 MB file limit`);
assert.ok(statSafe(resolve(root, "vercel.json")));
assert.ok(statSafe(resolve(root, "api/[...path].js")));
assert.ok(statSafe(resolve(root, ".github/workflows/ci.yml")));
assert.ok(statSafe(resolve(root, "package-lock.json")));

console.log(JSON.stringify({
  status: "valid",
  filesInspected: files.length,
  textFilesInspected: textFiles.length,
  wordsInspected: words,
  jsonFilesParsed: textFiles.filter((path) => [".json", ".webmanifest"].includes(extname(path))).length,
  markdownLinksChecked: markdownLinks,
  secretPatternsChecked: secretPatterns.length,
  githubFileLimitChecked: true,
  vercelEntrypointChecked: true
}, null, 2));
