# ST. JUICE — Stage 06 Ordering and Payments Handoff

## Preserve the current front end

Stage 06 should add an integration layer behind the Stage 05 interactions. It must not replace the canonical catalog, fork account-specific menus or silently change price/modifier rules.

## Canonical sources

| Concern | Authority |
| --- | --- |
| Products, sizes and base prices | `menu/data/catalog.json` |
| Modifier groups and price impacts | `menu/data/modifiers.json` |
| Build Your Mood rules | `menu/data/build-your-mood.json` |
| Boxes, catering and lead times | `menu/data/bundles-catering.json` |
| Allergen registry | `menu/data/allergens.json` |
| Site copy | `content/site-copy.json` |
| Media status | `media/manifests/media-manifest.json` |

## Current browser state

The Stage 05 prototype uses local storage only for:

- Experience mode.
- Service method.
- Cart items and quantities.

No identity, verification, address, payment or order data is stored.

Cart item shape:

```json
{
  "key": "stable configuration signature",
  "productId": "catalog id or build-your-mood",
  "name": "display name",
  "image": "placeholder media path",
  "sizeLabel": "selected size/base",
  "modifiers": ["selected display names"],
  "instructions": "optional short note",
  "unitPrice": 9.95,
  "quantity": 1,
  "allergens": ["optional builder allergen set"]
}
```

Stage 06 must re-price and validate on the server/integration boundary. Client totals are display previews, never payment authority.

## Required Stage 06 services

- Store/location availability.
- Pickup/delivery selection and address eligibility.
- ASAP and scheduled time slots.
- Product and modifier availability.
- Authoritative price calculation.
- Tax, fees, tip and promo calculation.
- Cart validation and recovery.
- Guest contact and fulfillment details.
- Payment-provider tokenization/test mode.
- Order creation, confirmation and status mapping.
- POS adapter boundary or documented safe test adapter.

## UI integration points

- `[data-action="add-product"]` — convert the current local add into validated cart mutation.
- `[data-action="builder-add"]` — serialize builder IDs, not only display names.
- `[data-action="checkout-preview"]` — replace with checkout route/flow.
- `[data-action="set-service"]` — connect delivery eligibility and time slots.
- Cart quantity/remove actions — preserve optimistic UI with error rollback.
- Product modifier inputs — show live availability and authoritative re-pricing.

## Required safeguards

- Guest checkout remains available.
- Do not store raw payment credentials in ST. JUICE code.
- Marketing consent remains separate from transactional communication.
- Reconfirm when modifier changes affect allergens.
- Display subtotal, tax, tip, delivery and service fees separately.
- Show fulfillment time before payment.
- Keep cart after a payment or network error.
- Prevent duplicate submission and provide idempotent order creation.
- Treat all current commercial terms as working until approved.

## Stage 06 success path

1. Select service and time.
2. Add or customize products.
3. Validate cart against live availability/pricing.
4. Enter guest or signed-in fulfillment details.
5. Review item totals, tax, fees, tip and promo/rewards state.
6. Tokenize and authorize payment in safe test mode or connected provider.
7. Create one order idempotently.
8. Display confirmation and status.
9. Preserve recovery paths for network/payment/inventory errors.
