import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler from "../../api/[...path].js";

async function invoke(url, { method = "GET", body } = {}) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  request.url = url;
  request.method = method;
  request.headers = { "content-type": "application/json" };
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      headers: {},
      writeHead(status, headers = {}) { this.statusCode = status; this.headers = headers; },
      end(value = "") {
        try { resolve({ status: this.statusCode, headers: this.headers, payload: value ? JSON.parse(String(value)) : null }); }
        catch (error) { reject(error); }
      }
    };
    Promise.resolve(handler(request, response)).catch(reject);
  });
}

const health = await invoke("/api/health");
assert.equal(health.status, 200);
assert.equal(health.payload.ok, true);
assert.equal(health.headers["Cache-Control"], "no-store");

const readiness = await invoke("/api/launch-readiness");
assert.equal(readiness.status, 200);
assert.equal(readiness.payload.launchReady, false);
assert.ok(readiness.payload.blockers.includes("database"));

const invalidCart = await invoke("/api/cart/validate", { method: "POST", body: { service: "pickup", items: [] } });
assert.equal(invalidCart.status, 422);
assert.equal(invalidCart.payload.valid, false);

console.log(JSON.stringify({ status: "valid", vercelHandler: true, health: true, readiness: true, parsedBody: true }, null, 2));
