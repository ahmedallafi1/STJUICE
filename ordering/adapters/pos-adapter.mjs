import { config } from "../lib/catalog-store.mjs";
import { sendToTestPos } from "./test-pos-adapter.mjs";

export function sendToPos(order) {
  if (config.pos.adapter === "test_pos_receipt") return sendToTestPos(order);
  throw Object.assign(new Error("Live POS provider is not connected."), {
    code: "pos_provider_not_connected",
    status: 503
  });
}

export function posAdapterStatus() {
  return {
    adapter: config.pos.adapter,
    live: config.pos.adapter !== "test_pos_receipt"
  };
}
