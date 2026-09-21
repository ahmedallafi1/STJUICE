import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../server.mjs";

const server = await startOrderingServer({ port: 0 });
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function textResponse(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  return { response, text: await response.text() };
}

try {
  for (const path of ["/menu", "/catering", "/product/pistachio-saint", "/info/privacy"]) {
    const result = await textResponse(path);
    assert.equal(result.response.status, 200, path);
    assert.match(result.response.headers.get("content-type") || "", /text\/html/);
    assert.ok(result.text.includes('<base href="/site/" />'), `${path} must serve the storefront shell`);
    assert.ok(result.text.includes("ST. JUICE"));
  }

  const ops = await textResponse("/ops/");
  assert.equal(ops.response.status, 200);
  assert.ok(ops.text.includes("ST. JUICE Operations"));
  assert.ok(ops.text.includes("noindex,nofollow,noarchive"));

  const root = await textResponse("/");
  assert.equal(root.response.status, 302);
  assert.equal(root.response.headers.get("location"), "/site/");

  const forbidden = await textResponse("/database/schema.sql");
  assert.equal(forbidden.response.status, 403);

  console.log(JSON.stringify({
    status: "valid",
    customerDirectRoutes: true,
    operationsRoute: true,
    privateRepositoryFilesBlocked: true
  }, null, 2));
} finally {
  server.close();
  await once(server, "close");
}
