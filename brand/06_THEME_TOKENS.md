# ST. JUICE — Theme Tokens

## Shared structure

All modes share:

- One logo.
- One product catalog.
- One checkout structure.
- One typography system.
- One accessibility standard.
- One set of core components.

Only emphasis, accent, offer content and supporting artwork change.

## Default mode

Purpose: guest and regular browsing, rewards and everyday ordering.

- Background: Soft Cream.
- Surface: white.
- Primary: Saint Pistachio.
- Text: Night Charcoal.
- Premium detail: Chrome.
- Mood: fresh by day, cinematic with charcoal panels at night.

## Student mode

Purpose: value bundles, study-night drops, voting and student rewards.

- Background: Soft Cream.
- Primary: Saint Pistachio.
- Accent: Campus Blue.
- Highlight: Study Yellow, capped at roughly 5% of a view.
- Text: Night Charcoal.
- Do not use official university logos, seals, fonts or the exact appearance of an institutional site.

Student status must always be communicated in text, not blue color alone.

## Business/Catering mode

Purpose: party boxes, scheduled orders, quotes, invoices and gifting.

- Background: Soft Cream.
- Primary: Night Charcoal.
- Accent: Reserve Gold.
- Freshness cue: Saint Pistachio.
- Premium detail: Chrome.
- Layout is calmer, with more whitespace and fewer playful product colors.

## Token switching

Implementation should switch semantic variables such as:

- `--theme-primary`
- `--theme-on-primary`
- `--theme-accent`
- `--theme-accent-soft`
- `--theme-surface`
- `--theme-link`

Do not hard-code account colors into individual components. Theme selection belongs on the root application container using `data-theme="default|student|business"`.
