# Ordering and Payments — Safe Test Runtime

## Run

From the cumulative package root:

```bash
npm start
```

Open `http://127.0.0.1:4173/site/`. `node site/serve.mjs` is an equivalent compatibility entry point.

No installation or build step is required.

## Test

```bash
npm test
```

The suite validates the canonical menu, pricing engine, builder rules, time slots, delivery input, API lifecycle, raw-card rejection, masked contact output, idempotency and front-end rendering.

## Runtime model

- The browser keeps only mode, service and cart configuration in local storage.
- Guest contact, address, quote, payment token and order view remain in memory.
- The API reloads prices and rules from `menu/data/*.json` and ignores display prices sent by the browser.
- Money is calculated in integer cents.
- A valid quote lasts 15 minutes.
- A test payment token is tied to one quote and exact total.
- An idempotency key maps retries to the first created order for 60 minutes.
- Delivery, orders, quotes, payment intents and test POS receipts are memory-only.

## Safe test limitations

This package is a complete functional prototype, not a live commerce system. It must not be exposed as a public payment service. It has no production database, authenticated staff controls, rate limiting, live inventory, capacity management, tax engine, delivery-zone engine, payment processor, POS provider, messaging or refunds.

See `SECURITY_AND_LAUNCH.md` before connecting any provider or deploying publicly.
