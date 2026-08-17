# ST. JUICE Stage 05 Front End

## Run locally

From the cumulative package root:

```bash
node site/serve.mjs
```

Open `http://127.0.0.1:4173/site/`.

No dependency install or build step is required. The server exposes the cumulative package so the front end can read the canonical Stage 03 JSON and Stage 04 media directly.

## Test

```bash
cd site && npm test
```

## Architecture

- `index.html` — accessible application shell and dialogs.
- `styles.css` — responsive design system and Default, Student and Business themes.
- `app.js` — hash router, data adapter, page rendering and interactions.
- `serve.mjs` — dependency-free local static server.
- `tests/data-contract.test.mjs` — menu/media/front-end contract checks.

Routes use hashes so every view works on simple static hosting without rewrite rules. Examples: `#/menu`, `#/product/pistachio-saint`, `#/build`, `#/catering`.

## Stage boundary

This is a working design/front-end prototype. Cart state, modes, filters, product customization, Build Your Mood and forms work in the browser. Real authentication, tax, checkout, payments, POS, inventory and fulfillment integrations are intentionally assigned to later stages.
