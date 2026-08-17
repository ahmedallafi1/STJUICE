# ST. JUICE HTTP API

All request and response bodies are JSON. Errors use either `{ "error": { "code", "message" } }` or validation `{ "valid": false, "errors": [...] }`.

## Read endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Runtime mode and storage safety check |
| GET | `/api/launch-readiness` | Non-secret production readiness status and blocker IDs |
| GET | `/api/config` | Public location, fulfillment, pricing-status and test-provider settings |
| GET | `/api/slots?service=pickup&date=YYYY-MM-DD` | Seven-day service slot generation |
| GET | `/api/orders/:id` | Masked public test-order status |

## Checkout endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/delivery/validate` | Validate required address fields and issue a manual-review test token |
| POST | `/api/cart/validate` | Re-price IDs from canonical data, validate rules and create a 15-minute quote |
| POST | `/api/promos/validate` | Same authoritative quote path, including promo validation |
| POST | `/api/payment/intents` | Issue an exact-amount test token for a valid quote |
| POST | `/api/orders` | Validate guest, schedule, acknowledgement, delivery token and payment; create idempotently |
| POST | `/api/orders/:id/advance` | Advance the status timeline in test mode |

## Cart example

```json
{
  "service": "pickup",
  "items": [
    {
      "kind": "catalog",
      "productId": "pistachio-saint",
      "sizeId": "16oz",
      "modifierSelections": { "milk-choice": ["oat-milk"] },
      "instructions": "Light ice",
      "quantity": 1
    }
  ],
  "promoCode": "TEST10",
  "tipPercent": 15
}
```

The response includes authoritative item names, selected options, allergen flags, integer cents plus display amounts, warnings, `quoteId`, creation time and expiry.

## Order example

Send a unique `Idempotency-Key` header:

```json
{
  "quoteId": "quote_…",
  "paymentToken": "test_pay_…",
  "schedule": "2026-08-17T08:00:00",
  "allergenAcknowledged": true,
  "customer": {
    "name": "Guest Name",
    "email": "guest@example.com",
    "phone": "3145550100",
    "marketingConsent": false
  }
}
```

Delivery orders must also send `deliveryCheckToken`. Repeating a successful request with the same idempotency key returns the same order. A payment token cannot be reused with a different quote or amount.

## Status paths

- Pickup/dine-in: `received → confirmed → in_preparation → ready_for_pickup → complete`.
- Delivery: `received → confirmed → in_preparation → out_for_delivery → complete`.

The advance endpoint exists only to demonstrate UI behavior. A live system must accept verified provider/POS events through authenticated server-to-server paths.
