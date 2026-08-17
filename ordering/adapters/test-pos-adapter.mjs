import { randomUUID } from "node:crypto";

export function sendToTestPos(order) {
  return {
    status: "accepted_test",
    adapter: "test_pos_receipt",
    reference: `test_pos_${randomUUID().slice(0, 12)}`,
    orderId: order.id,
    sentAt: new Date().toISOString(),
    liveProviderConnected: false
  };
}
