# ST. JUICE — Decisions and Placeholders Register

## Stage 06 locked ordering decisions

| Decision | Locked value |
| --- | --- |
| Runtime | Dependency-free Node HTTP API plus browser ES modules |
| Commerce mode | `safe_test`; no live money or POS order |
| Price authority | Server reloads canonical menu IDs and calculates integer cents |
| Quote life | 15 minutes |
| Duplicate protection | Required idempotency key; 60-minute in-memory replay window |
| Payment input | Exact-amount test token only; raw-card-shaped fields rejected |
| Order storage | Memory-only test records; reset on server restart |
| Delivery | Complete-address input plus `manual_review_test`; no real-radius claim |
| Tax | `not_configured`; $0 safe test amount |
| Delivery fee | `not_configured`; $0 safe test amount |
| Service fee | `not_configured`; $0 safe test amount |
| Tips | Optional 0%, 15%, 18% or 20% |
| Promo | `TEST10`, test-only 10% capped at $10 |
| Guest checkout | Required capability; account creation not required |
| Marketing | Optional consent separate from transactional contact |
| Allergen handling | Server returns flags; acknowledgement required before order |
| Public order response | Masked email and phone |
| POS | Replaceable test receipt adapter |

## Stage 06 live-integration placeholders

| Area | Current safe state | Required before live launch |
| --- | --- | --- |
| Payment | In-memory exact-amount token | Selected PCI-compliant hosted/tokenized provider |
| POS | Test reference | Provider item mapping, signed events, retry and reconciliation |
| Tax | Explicit $0 test line | Verified Missouri/local rules or approved tax engine |
| Fees/minimum | Explicit $0 test lines | Owner-approved amounts and disclosure |
| Delivery | Manual-review test token | Address normalization, zone/radius, capacity and fee |
| Scheduling | Hours-derived test slots | Live capacity and reservation/revalidation |
| Inventory | Canonical menu presence | Live product/modifier availability |
| Orders | Process memory | Encrypted durable database, backups and retention |
| Status | Public test advance button | Authenticated staff/provider events |
| Messaging | On-screen confirmation | Approved transactional email/SMS provider and templates |
| Refunds | None | Provider workflow, permissions, terms and audit trail |

The live adapter gates and security controls are detailed in `ordering/SECURITY_AND_LAUNCH.md`.

## Stage 05 locked front-end decisions

| Decision | Locked value |
| --- | --- |
| Front-end architecture | Dependency-free ES modules, CSS and HTML |
| Deployment shape | Static files; hash routes; no rewrite rule required |
| Data source | Canonical Stage 03 JSON loaded directly |
| Account architecture | One site and one catalog with Guest, Regular, Student and Business/Catering modes |
| Cart state | Local prototype only; no submitted order |
| Fulfillment state | Pickup, delivery and dine-in selection; live eligibility deferred |
| Menu coverage | All 12 categories and 54 records |
| Builder coverage | All 8 configured steps |
| Generated-media display | Visible `Concept visual` status badges |
| Product pricing | Working preview; server/integration must validate in Stage 06 |
| Catering form | Validates locally and explicitly does not transmit data |
| Trust/legal routes | Honest structural placeholders until Stage 08 |
| Accessibility baseline | Semantic headings/dialogs/forms, skip link, visible focus, reduced motion and mobile targets |

## Stage 05 integration placeholders

| Area | Current state | Required later |
| --- | --- | --- |
| Checkout | Boundary message | Stage 06 working checkout |
| Payment | None | Tokenized provider/POS layer or safe test mode |
| Tax, fees and tip | Not calculated | Authoritative Stage 06 calculation |
| Delivery address/radius | UI selection only | Eligibility and fee service |
| Scheduling | Copy/structure only | Capacity-backed time slots |
| Inventory | Catalog availability only | Live product/modifier validation |
| Authentication | Mode preview only | Stage 07 identity/session system |
| Student verification | Direction only | Stage 07 approved verification |
| Rewards | Tier preview, no numeric promise | Stage 07 approved earning/redemption rules |
| Legal policies | Structural placeholder route | Stage 08 reviewed text |
| SEO/analytics | Architecture only | Stage 08 implementation and consent review |
| Browser visual automation | Optional test included | Run where a supported browser binary exists |

Stage 06 must treat browser totals as untrusted display values and revalidate price, modifiers, inventory, fulfillment and allergens at the integration boundary.

## Stage 04 locked media decisions

| Decision | Locked value |
| --- | --- |
| Hero composition | 16:9, product tableau on the right, copy-safe negative space on the left |
| Priority products visualized | Pistachio Saint, Saint Sunset, Dubai Strawberry Cup, ST. Crepe, Dragon Cloud Cup |
| Priority group format visualized | Birthday Box |
| Category coverage | One review board plus 12 catalog-ID-mapped square tiles |
| Account art | Regular, Student and Business/Catering triptych |
| Packaging direction | Blank coordinated cup, bottle, dessert cup, pastry box, bag and catering box |
| Motion direction | Six-frame food-action storyboard plus abstract seven-second SVG loop |
| Reduced motion | Static SVG fallback plus CSS media-query freeze |
| Web delivery | Optimized WebP derivatives; PNG source retained for review |
| Generated media status | `concept_placeholder` |
| Competitor/university media | None copied, downloaded, relabeled or rebranded |

## Stage 04 replacement and approval gates

| Asset or claim | Current handling | Required before public launch |
| --- | --- | --- |
| Generated product images | Design-review placeholder | Approved real recipe, portion, vessel and production photography |
| Generated category tiles | Design-review placeholder | Replace with approved category photography or explicit owner art approval |
| Generated account scenes | Directional lifestyle placeholder | Model/property releases or properly licensed final imagery |
| Generated packaging | Structural/style concept only | Vendor dielines, materials, dimensions, print proofs and regulatory review |
| Birthday Box image | Format concept only | Real SKU contents, counts, food safety and packaging confirmation |
| Motion storyboard | Production direction only | Real footage, edit, grading, captions/controls and owner approval |
| Abstract animated SVG | Original decorative prototype | Cross-browser, performance, reduced-motion and final brand approval |
| Optimized WebP files | Derivatives | Inherit the status and replacement requirement of their source |

The authoritative status for individual files is `media/manifests/media-manifest.json`. A filename never upgrades an asset from placeholder to final.

## Stage 03 locked content decisions

| Decision | Locked value |
| --- | --- |
| Launch categories | 12 |
| Primary items | 45 |
| Group formats | 9 |
| Active drops | 2 |
| Drop 01 | Dragon Cloud Cup |
| Drop 02 | Midnight Crunch Cookie |
| Public story line | Your mood, made fresh. |
| Build Your Mood promise | Pick your base. Set the mood. |
| Build Your Mood bases | Fresh juice, smoothie, yogurt shake, fruit cup, crepe, waffle, mini pancakes, soft serve |
| Menu data authority | `menu/data/catalog.json` |
| Modifier data authority | `menu/data/modifiers.json` |
| Nutrition state | Unverified; values remain null |

## Stage 03 working values requiring approval

| Item | Required verification |
| --- | --- |
| Product and modifier prices | Food cost, packaging, labor, margin and owner approval |
| Ingredients and portions | Tested recipe version and supplier labels |
| Allergens | Supplier documentation and kitchen cross-contact review |
| Nutrition | Verified recipe, yield, portion and calculation |
| Preparation times | In-store timing and capacity tests |
| Delivery suitability | Packaging and route-hold tests |
| Catering rates and lead times | Manager capacity and commercial-term approval |
| Drop dates | Launch calendar |
| Rewards rules | Final program terms |

## Stage 02 locked visual decisions

| Decision | Locked value |
| --- | --- |
| Master color | Saint Pistachio `#B7D86C` |
| Core light | Soft Cream `#FFF8E7` |
| Core dark | Night Charcoal `#171B18` |
| Premium neutral | Chrome `#C9CDD0` |
| Student accent | Campus Blue `#1747B5` |
| Student highlight | Study Yellow `#F4C84A` |
| Business accent | Reserve Gold `#A67C36` |
| Display font | Fraunces |
| Interface/body font | Manrope |
| Final fruit-icon direction | Saint Slice, an original abstract dragon-fruit cross-section |
| Support pattern | Seed Orbit |
| Base theme modes | Default, Student, Business/Catering |
| Packaging concept | Quiet outside, mood inside |

These values may be changed only by an explicit user decision recorded in a later changelog.

## Stage 02 items that remain conditional

| Item | Status |
| --- | --- |
| Trademark availability of ST. JUICE and Saint Slice | Requires professional clearance/search |
| Wordmark production outlines | Required before large-format print or filing |
| Font files and license notices | Bundle during front-end implementation |
| Pantone/CMYK production matches | Confirm with physical printer proofs |
| Packaging dimensions and dielines | Confirm with selected vendors |
| Sustainability/recyclability claims | Verify by material and local rules |

## Locked facts

| Field | Approved value |
|---|---|
| Brand | ST. JUICE |
| Business concept | Juice Bar + Desserts + Chocolate Experience |
| First branch | 11 S Vandeventer Ave, St. Louis, Missouri |
| Branch status in site | Confirmed and open |
| Branch count | One initially |
| Service | Dine-in, Pickup, Delivery |
| Dedicated parking claim | None |
| Sunday–Thursday hours | 6:30 AM–9:00 PM |
| Friday–Saturday hours | 6:30 AM–11:00 PM |
| Launch language | English |
| Primary color | Pistachio green |
| Account types | Guest, Regular, Student, Business/Catering |
| Ordering | Full cart, checkout, pickup, delivery and scheduling |
| Personalization | Theme, offers and merchandising change by account type |

## Temporary professional placeholders

| Field | Temporary handling |
|---|---|
| Phone | Use a clearly replaceable professional placeholder |
| General email | Use a clearly replaceable professional placeholder |
| Catering email | Use a clearly replaceable professional placeholder |
| Social URLs | Use labeled placeholders until official handles are confirmed |
| Domain | Prepare for a custom domain; do not claim ownership of an unverified domain |
| POS/payment provider | Implement an integration-ready layer or test mode |
| Delivery radius | Placeholder until operations confirm miles and zones |
| Delivery fee/minimum | Placeholder until approved |
| Taxes and service fees | Configure only when verified |
| Product pricing | Stage 03 working prices, subject to approval |
| Preparation times | Stage 03 estimates, subject to operations |
| Nutrition numbers | Do not invent; publish only after recipe verification |
| Halal/vegan/gluten-free/organic claims | Publish only after operational confirmation |

## Intellectual-property guardrails

- Do not copy Juice Time or Chocolate DIP names, copy, recipes, photographs or videos.
- Do not remove third-party logos from images and substitute the ST. JUICE logo.
- Do not copy Chrome Hearts marks, crosses, typography or protected trade dress.
- Do not use official Saint Louis University marks or imply sponsorship.
- Use original, licensed, user-provided or custom-generated assets.

## Operational launch dependencies

- Real public phone and email.
- Real domain ownership and connection.
- Merchant/payment or POS account.
- Verified tax, fee, tip and refund configuration.
- Delivery zone and fulfillment rules.
- Final product pricing.
- Final recipes, portions, ingredients and allergen review.
- Final social handles.
- Final legal-policy review appropriate to the operating business.
