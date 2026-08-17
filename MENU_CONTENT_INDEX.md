# ST. JUICE — Stage 03 Menu and Content Index

## Stage 03 outcome

This package converts the Stage 01 architecture and Stage 02 brand system into a website-ready launch catalog and copy system.

## Locked launch structure

- 12 customer-facing menu categories.
- 45 primary individual launch items, including two active limited drops.
- 9 group, flight, liter and box formats.
- One canonical Build Your Mood flow with pricing and compatibility rules.
- One party-box and catering structure.
- Shared allergen codes and an explicitly unverified nutrition schema.
- English brand story, page copy, calls to action, empty states and service messages.

## Read first

1. `menu/01_LAUNCH_MENU.md` — customer-facing launch menu.
2. `menu/02_PRICING_SIZES_MODIFIERS.md` — working pricing and modifier rules.
3. `menu/03_BUILD_YOUR_MOOD.md` — customization flow.
4. `menu/04_PARTY_BOXES_CATERING.md` — group-order system.
5. `menu/05_INGREDIENT_ALLERGEN_NUTRITION.md` — safety and data policy.
6. `menu/06_DEFERRED_CATALOG.md` — retained post-launch concepts.
7. `content/01_BRAND_STORY_AND_VOICE.md` — approved narrative and writing system.
8. `content/02_SITE_COPY_DECK.md` — page-by-page website copy.
9. `menu/data/` and `content/site-copy.json` — machine-readable implementation data.

## Data authority

- Product names, descriptions, category assignment and modifier logic are Stage 03 content decisions.
- Every dollar amount is a **working launch price** and carries `priceStatus: working_requires_approval`.
- Ingredient lists are recipe drafts, not public legal ingredient declarations.
- Allergen flags are conservative working flags and require kitchen/supplier review.
- Nutrition fields are intentionally null and unverified.
- Final recipes, supplier labels, portions, tax, fees and operational timing override working values only after verification.

## Canonical files

- `menu/data/catalog.json`
- `menu/data/modifiers.json`
- `menu/data/build-your-mood.json`
- `menu/data/bundles-catering.json`
- `menu/data/allergens.json`
- `menu/data/deferred-catalog.json`
- `content/site-copy.json`
- `menu/data/validate-menu.mjs`

Run `node menu/data/validate-menu.mjs` from the package root to validate references, counts, prices and nutrition safeguards.
