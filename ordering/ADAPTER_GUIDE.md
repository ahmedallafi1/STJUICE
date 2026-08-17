# Provider Adapter Guide

Provider-specific work is isolated so the site and canonical menu do not need to be rewritten.

## Payment adapter

Replace `adapters/test-payment-adapter.mjs` with a server adapter for the selected provider. The browser should render the provider’s hosted fields or wallet component and submit only a provider token. The adapter must support amount/currency binding, idempotency, authorization/capture policy, declines, timeouts, refunds and webhook verification.

Do not change the public order contract to accept card number, CVV, expiry or bank credentials.

## POS adapter

Replace `adapters/test-pos-adapter.mjs` with a mapping layer from canonical product/size/modifier IDs to provider item IDs. It must record provider response IDs, distinguish accepted/pending/rejected, retry safely, reconcile payment/order outcomes and receive authenticated status events.

## Tax and fees

Replace `safeTestAmount` only after verified rules exist. Tax must be calculated from approved nexus, location, item classification, discounts and fulfillment behavior. Fees and minimums must be returned as explicit lines and included in the payment amount.

## Delivery and scheduling

Replace `manual_review_test` with an address/zone service and operational capacity source. A live slot must be reserved or rechecked immediately before payment/order creation. Delivery estimates and fees must be deterministic and displayed before authorization.

## Durable orders

Move quote, idempotency and order records from process maps into durable storage. Keep an immutable commercial snapshot per order: item IDs/names, configuration, unit/line totals, tax/fees/tip/discount, currency, price version, payment reference, POS reference and fulfillment details.

## Acceptance contract

Keep all existing tests and add provider sandbox tests for decline, timeout, duplicate webhook, duplicate submit, quote expiry, price change, inventory loss, POS rejection, partial provider outage and refund. Live credentials must be supplied through deployment secret management, never committed to this package.
