import { randomUUID } from "node:crypto";

const intents = new Map();

export function createTestPaymentIntent({ quoteId, amount, currency }) {
  if (!quoteId || !Number.isInteger(amount) || amount < 0) throw new Error("Invalid test payment request");
  const token = `test_pay_${randomUUID()}`;
  const intent = {
    token,
    quoteId,
    amount,
    currency,
    status: "authorized_test",
    provider: "safe_test_token",
    createdAt: new Date().toISOString(),
    storesRawCardData: false
  };
  intents.set(token, intent);
  return { ...intent };
}

export function verifyTestPayment({ token, quoteId, amount }) {
  const intent = intents.get(token);
  if (!intent) return { valid: false, code: "payment_token_not_found" };
  if (intent.quoteId !== quoteId) return { valid: false, code: "payment_quote_mismatch" };
  if (intent.amount !== amount) return { valid: false, code: "payment_amount_mismatch" };
  if (intent.status !== "authorized_test") return { valid: false, code: "payment_not_authorized" };
  return { valid: true, intent: { ...intent } };
}

export function consumeTestPayment(token) {
  const intent = intents.get(token);
  if (!intent) return false;
  intent.status = "captured_test";
  intent.capturedAt = new Date().toISOString();
  return true;
}
