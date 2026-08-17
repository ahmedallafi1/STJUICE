# ST. JUICE — Current Ordering System Index

Mode: Safe test until the release gate passes.  
Runtime: Node.js 20–22, browser ES modules, no runtime dependencies.

## Implemented

| Step | Behavior |
| --- | --- |
| Bag | Canonical product, size, modifier and builder IDs |
| Fulfillment | Pickup, Delivery and Dine-in schedules |
| Delivery | Required address fields and explicit manual-review state |
| Guest | Name, email and phone validation; separate optional marketing consent |
| Review | Server-authoritative repricing, allergen flags, test promo and tips |
| Totals | Separate subtotal, discount, tax, fees, tip and total |
| Payment | Quote-bound exact-amount test token; raw card fields rejected |
| Submission | Expiring quotes and idempotent order creation |
| POS | Replaceable test adapter with traceable reference |
| Confirmation | Masked contact and service-specific status timeline |

## Runtime files

- `ordering/server.mjs` — local server and reusable Vercel request handler.
- `ordering/lib/order-engine.mjs` — catalog validation, integer-cent pricing and fulfillment rules.
- `ordering/adapters/` — test payment/POS boundaries.
- `api/index.js` — Vercel function entry point.
- `launch/lib/readiness.mjs` — production activation gate.

## Commercial boundary

Working prices, $0 unconfigured tax/fees, `TEST10`, manual-review delivery, in-memory orders and test payment/POS behavior are deliberate release blockers. They must not be represented as live commerce. `npm run readiness` is the authoritative activation gate.
