# Deployment Checklist

## Before deployment

- [ ] `npm test` passes.
- [ ] `npm run readiness` returns `launchReady: true`.
- [ ] No credentials exist in the ZIP or repository.
- [ ] Production environment variables are configured through the host.
- [ ] Database migrations and rollback are tested on a staging copy.
- [ ] Payment/POS sandbox tests pass, followed by one controlled live order.
- [ ] Tax, delivery, tips, discounts, refunds and receipts match the merchant configuration.
- [ ] Real-device and assistive-technology acceptance testing is signed off.
- [ ] Final legal, privacy, cookie, allergen, nutrition and marketing content is approved.
- [ ] Final media replaces labeled concept placeholders where required.

## Release

- [ ] Freeze menu/content changes.
- [ ] Record the release version and owner.
- [ ] Deploy during the approved window.
- [ ] Verify home, menu, builder, cart, checkout, payment, confirmation and status.
- [ ] Verify email/SMS receipt and POS arrival.
- [ ] Verify public contacts, hours, map, analytics consent and SEO metadata.
- [ ] Watch errors, payment failures, order acceptance and page performance.

## After release

- [ ] Confirm first orders with store staff.
- [ ] Review logs for personal/payment-data leakage.
- [ ] Reconcile payment, POS and order records.
- [ ] Keep rollback available until the launch owner closes the window.
