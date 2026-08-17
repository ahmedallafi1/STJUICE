# ST. JUICE — Current Storefront Index

## Routes

| Experience | Hash route | Current behavior |
| --- | --- | --- |
| Home | `#/` | Responsive merchandising and service entry |
| Menu | `#/menu` | Search plus category, mood, occasion and channel filters |
| Product | `#/product/{product-id}` | Sizes, modifiers, live working total and allergen flags |
| Build Your Mood | `#/build` | Eight compatible customization steps |
| Drops | `#/drops` | Active limited products and archive state |
| Party Boxes | `#/boxes` | Direct-order formats and lead-time notices |
| Gift Cards | `#/gift-cards` | Review-ready values with purchasing safely disabled until provider activation |
| Catering | `#/catering` | Validated preview form; no transmission until configured |
| Rewards | `#/rewards` | Prototype rewards with unapproved rules withheld |
| Location | `#/location` | Planned address and clearly pending public details |
| Account | `#/account` | Guest, Regular, Student and Business preview modes |
| Story | `#/about` | Brand story and principles |
| Checkout | `#/checkout` | Server-authoritative safe-test ordering |
| Order status | `#/order/{id}` | Masked confirmation and service-specific state |
| Trust | `#/info/{topic}` | Privacy, Terms, Refunds, Cookies, Accessibility, Allergens and Contact drafts |

## Current boundaries

- The canonical data source remains `menu/data/*.json`; no account-specific menu fork exists.
- Prices, recipes, nutrition, supplier information and concept media require owner approval before public activation.
- Catering, payments, POS, tax, delivery, messaging, authentication, rewards and durable storage remain safely blocked until configured.
- Search indexing stays disabled until the approved origin and production facts are installed.

See `launch/README.md`, `launch/PRODUCTION_INPUTS.md` and `npm run readiness` for activation.
