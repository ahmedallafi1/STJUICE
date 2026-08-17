# ST. JUICE — Stage 05 Website Design and Front End

Version: 5.0  
Stage: 05 of 09  
Status: Complete and ready for Stage 06  
Project: ST. JUICE website and digital ordering system

## Purpose

This cumulative package contains the complete Stage 01 foundation, Stage 02 brand system, Stage 03 menu/content system, Stage 04 media system and the Stage 05 responsive website design/front end. It is the only accepted starting point for Stage 06.

Stage 05 delivers:

- A dependency-free responsive website prototype.
- Home, menu, product, Build Your Mood, drops, boxes, catering, rewards, location, account, story and interface-state routes.
- All 12 categories and all 54 catalog records driven from the canonical Stage 03 JSON.
- Search plus category, mood, occasion and fulfillment filters.
- Product size/modifier controls and live working totals.
- Complete eight-step Build Your Mood interface with compatibility and draft-allergen calculations.
- Persistent prototype cart and pickup/delivery/dine-in selection.
- Guest, Regular, Student and Business/Catering theme and message switching.
- Catering request validation without transmitting personal data.
- Honest generated-media labels and integration boundaries.
- Data, render and server contract tests.
- A documented Stage 06 ordering/payment integration contract.

## Start here

1. `SITE_FRONTEND_INDEX.md` — routes, features and source map.
2. `site/README.md` — run and test instructions.
3. `site/index.html` — application shell.
4. `site/STAGE_06_HANDOFF.md` — ordering/payment integration contract.
5. `site/QA.md` — completed and pending QA.
6. `08_STAGE_STATUS.md` — completion state and Stage 06 scope.

## Run locally

From this package root:

```bash
node site/serve.mjs
```

Open `http://127.0.0.1:4173/site/`.

No dependency install or build step is required.

## Stage boundary

- Cart, filters, product customization, builder, modes and form states work in-browser.
- Checkout does not charge or submit an order.
- Client price totals are previews, not payment authority.
- Real authentication, student verification and rewards are not implemented yet.
- Final policy, SEO, analytics and performance launch audits remain assigned to later stages.
- Generated raster media remains clearly labeled concept imagery.

## Previous-stage preservation

- Stage 01–04 documents, data and assets remain in this cumulative package.
- Exact Stage 04 evolving root documents are preserved under `stage-history/stage-04/`.
- Stage 05 started exclusively from the user-returned `ST-JUICE-04-Images-Videos(1).zip`.

## Handoff rule

Return `ST-JUICE-05-Website-Design.zip` unchanged to begin Stage 06. Stage 06 must integrate ordering and payments behind this front end without duplicating or silently changing the canonical catalog.

Next expected ZIP: `ST-JUICE-06-Ordering-Payments.zip`
