# ST. JUICE — Stage 06 Site and Ordering QA

## Automated checks included

Run from the package root:

```bash
node site/tests/data-contract.test.mjs
node site/tests/render-contract.test.mjs
node menu/data/validate-menu.mjs
node ordering/tests/order-engine.test.mjs
node ordering/tests/api-smoke.test.mjs
```

The data-contract test confirms:

- 12 categories.
- 54 catalog records: 45 primary items and 9 group formats.
- 28 modifier groups.
- 8 Build Your Mood steps.
- 5 direct-order boxes.
- 4 catering packages.
- Every manifest source and derivative exists.
- Required application shell, routes, reduced-motion and concept-media controls exist.

The render-contract test confirms:

- 16 route conditions, including checkout and confirmation, render meaningful markup.
- All 54 menu cards render in the unfiltered state.
- Search returns matching products.
- All 8 builder steps render.
- All 4 account modes render.
- Empty and populated cart states render and calculate line totals.
- Checkout totals and order status render without raw contact data.
- No route leaks `undefined` or accidental object strings.

## Ordering/API smoke test

The dependency-free server was started and verified for:

- Site document.
- CSS.
- Application JavaScript.
- View module.
- Canonical catalog JSON.
- Hero WebP.
- Animated SVG.
- Health and public configuration.
- Hours-derived pickup slots.
- Authoritative cart quote and test promo.
- Raw-card-shaped field rejection.
- Exact-amount test payment token.
- Idempotent order creation and replay.
- Masked order response and test status advancement.

## Browser automation status

An optional Playwright smoke test is included. The current work environment had the Playwright library but not its browser binary, so browser screenshot automation was honestly skipped rather than reported as passing. The optional test exits cleanly with a skip reason when that binary is absent.

## Manual acceptance list for a browser-enabled environment

- Check home at 390, 768, 1024 and 1440 CSS pixels.
- Switch Guest, Regular, Student and Business modes.
- Select pickup, delivery and dine-in.
- Search and combine menu filters; clear them.
- Open a priority and fallback-media product.
- Change size/modifiers; confirm live total.
- Add, increment, decrement and remove cart items.
- Complete all Build Your Mood steps with drink and dessert bases.
- Confirm incompatible boosts remain unavailable.
- Submit the catering prototype form and verify no transmission claim.
- Check dialogs with mouse, keyboard, Escape and backdrop.
- Enable reduced motion and high contrast.
- Confirm generated images retain visible `Concept visual` labels.
- Confirm checkout opens four working safe-test steps and never presents raw card fields.
