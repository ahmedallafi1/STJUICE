# ST. JUICE — Stage 06 Validation

Date: 2026-08-17  
Package: `ST-JUICE-06-Ordering-Payments`

## Result

Stage 06 passed the executable menu, ordering-engine, API, rendering, syntax, JSON, CSS and cumulative-preservation checks described below.

## Executed checks

| Check | Result | Evidence |
| --- | --- | --- |
| JavaScript syntax | Pass | Every `.js` and `.mjs` under `site/` and `ordering/` parsed with `node --check` |
| JSON parse | Pass | Every JSON file parsed with `jq` |
| CSS block balance | Pass | Final nesting depth 0; no premature closing block |
| Canonical menu | Pass | 12 categories, 54 products, 28 modifier groups, 2 drops, 29 deferred items |
| Authoritative item price | Pass | Browser price ignored; catalog size and modifier price returned in integer cents |
| Tier/included pricing | Pass | Included fruit/sauce/topping and premium/each-after-included rules tested |
| Repeated group choices | Pass | Duplicate Office Box product references retained and priced after included count |
| Invalid catalog input | Pass | Unknown product/modifier and selection-limit errors returned |
| Build Your Mood | Pass | Base/mood/options, compatibility, included counts, allergens and delivery-quality notice tested |
| Promo/tip/totals | Pass | `TEST10`, allowed tip and separate totals tested |
| Slots | Pass | Service lead times plus later Friday hours tested in `America/Chicago` |
| Delivery | Pass | Incomplete address rejected; complete address returns manual-review test token only |
| Raw-card rejection | Pass | Payment endpoint rejected a card-number-shaped field |
| Payment binding | Pass | Test token bound to quote ID and exact total |
| Pickup order | Pass | Quote → token → idempotent order → masked confirmation → status advance |
| Delivery order | Pass | Delivery token → order → `out_for_delivery` progression |
| Idempotency | Pass | Duplicate key returned the original order rather than creating another |
| Public contact | Pass | Email and phone masked; full phone absent from response |
| Front-end data contract | Pass | Canonical counts, assets, required shell/routes and safe-test markers |
| Deterministic rendering | Pass | 16 route conditions, 8 builder steps, 54 menu cards, 4 modes, checkout and order page |
| Stage 05 preservation | Pass | Complete archived `site/` is byte-identical; 127 prior non-site source files unchanged outside documented evolving roots |

## Browser automation

`site/tests/visual-smoke.test.mjs` was executed and returned a clean skip because this environment did not contain a Playwright browser binary. It is not reported as a visual-browser pass. The deterministic renderer and API lifecycle tests passed; the final manual responsive/assistive-technology review remains required in a browser-enabled launch environment.

## Safety assertions

- No card form exists in the UI.
- No payment or POS provider credential exists in the package.
- No live charge or live store order is claimed.
- API totals identify catalog prices as working values.
- Tax, delivery fee and service fee remain visibly `not_configured` at $0 in safe test mode.
- Real delivery eligibility remains unconfirmed.
- Guest contact/address are not written to local storage.
- Test orders reset when the Node process restarts.

## Launch blockers retained intentionally

Approved prices/recipes/allergens, tax and fee settings, real delivery zone/capacity, merchant/POS accounts, live inventory, durable encrypted storage, staff authorization, rate limiting, verified messaging, refunds, final legal content and production security review are still required. See `ordering/SECURITY_AND_LAUNCH.md`.
