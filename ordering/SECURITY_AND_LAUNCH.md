# Security, Privacy and Live-Launch Gates

## Implemented safety controls

- Canonical server-side product, size, modifier and builder validation.
- Integer-cent arithmetic and explicit line/totals response.
- 1 MB request limit and JSON-only order API.
- Raw-card-shaped field rejection at payment and order endpoints.
- Token bound to quote ID and exact amount.
- Quote expiration and one-use payment capture state.
- Idempotency key requirement for order creation.
- Required guest identity checks and allergen acknowledgement.
- Delivery token requirement for delivery orders.
- Masked email and phone in public order responses.
- Security response headers, path containment and no-store API responses.
- No address/contact/payment details in browser local storage.

These controls demonstrate architecture; they do not make the prototype production-ready.

## Required before public launch

1. Connect a PCI-compliant hosted/tokenized payment provider. ST. JUICE servers must never receive raw PAN/CVV.
2. Connect an approved POS/order provider with signed webhooks, reconciliation and failure queues.
3. Configure verified Missouri/local tax behavior, delivery fee, minimum, service fee, tip policy and refund terms.
4. Replace manual delivery review with an approved zone/radius, address normalization, route availability and capacity service.
5. Add a durable encrypted database, backups, retention/deletion policy and restricted operational access.
6. Add authentication/authorization for staff functions; remove the public status-advance endpoint.
7. Add rate limiting, bot/abuse controls, CSRF/origin protections appropriate to deployment, secret management, logs and alerting.
8. Add live product/modifier inventory and price-version handling at payment and POS submission time.
9. Add transactional email/SMS through approved templates, consent records and suppression controls.
10. Obtain business/legal review for privacy, terms, accessibility, refunds, marketing consent, nutrition and allergen content.
11. Complete threat modeling, dependency/host review, penetration testing and incident-response preparation.

## Never configure by guess

Do not invent a tax rate, delivery radius, delivery charge, minimum order, service fee, refund window, merchant credentials, public phone/email, nutrition value or allergen-free claim. Keep the safe block visible until the accountable owner/provider confirms each value.
