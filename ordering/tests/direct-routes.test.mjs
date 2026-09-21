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
  assert.equal(root.response.status, 200);
  assert.ok(root.text.includes('<base href="/site/" />'));
  assert.ok(root.text.includes("ST. JUICE"));

  const hiddenGiftCards = await textResponse("/gift-cards");
  assert.equal(hiddenGiftCards.response.status, 403);

  const forbidden = await textResponse("/database/schema.sql");
  assert.equal(forbidden.response.status, 403);

  console.log(JSON.stringify({
    status: "valid",
    customerDirectRoutes: true,
    cleanRootRoute: true,
    giftCardsUnpublished: true,
    operationsRoute: true,
    privateRepositoryFilesBlocked: true
  }, null, 2));
} finally {
  server.close();
  await once(server, "close");
}
