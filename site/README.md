# ST. JUICE Storefront

The storefront is a dependency-free, responsive single-page application backed by the canonical menu and the included same-origin ordering API.

## Run locally

From the repository root:

```bash
npm start
```

Open `http://127.0.0.1:4173/site/`.

## Test

```bash
npm test
```

## Architecture

- `index.html` — accessible application shell and dialogs.
- `styles.css` — responsive brand, account, checkout and status UI.
- `app.js` — hash routing, state, cart, builder and checkout behavior.
- `lib/core.js` — data loading, route parsing, icons and shared utilities.
- `lib/api.js` — same-origin API client.
- `lib/account.js` — explicitly local prototype account state.
- `lib/views.js` — route, dialog, checkout and confirmation rendering.

The primary commerce routes are `#/checkout` and `#/order/:id`. Hash routing keeps static hosting simple. API-backed functionality requires the included Node runtime or Vercel function.

## Data boundary

Device storage contains experience mode, service, cart configuration and prototype account preferences. Guest contact, delivery address, quote and payment-token state remain in runtime memory. Raw card input is never accepted.

The committed configuration remains a safe-test release candidate until `npm run readiness` reports `launchReady: true`.
