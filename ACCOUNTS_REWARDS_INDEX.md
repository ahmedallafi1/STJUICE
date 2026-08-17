# ST. JUICE Stage 07 — Accounts & Rewards

Stage 07 adds a complete reviewable personalization layer on top of the preserved Stage 06 ordering package.

## Included

- Guest ordering remains available without an account.
- Regular profiles with device-local favorites, saved mixes, test-order history and rewards preview.
- Student profiles with the royal-blue theme and an explicit pending-verification state.
- Business/Catering profiles with company, role, event and recurring-cadence fields.
- Account dashboard, reward meter, favorite controls, saved Build Your Mood recipes and safe-test receipt history.
- Mode-aware merchandising and messaging continue to use the same canonical catalog.

## Honest boundaries

- Profile data is a browser-local prototype; it is not a production identity system.
- No password is requested or stored.
- Student status never activates a discount until a real verification policy/provider is approved.
- Rewards use working rules only: 10 points per dollar and 100 points per working reward dollar.
- Reorder preserves the action and receipt but waits for final POS/catalog mapping before live activation.
- Birthday rewards, bulk pricing and recurring-order terms remain pending owner approval.

## Run

`node ordering/server.mjs`

Open `http://127.0.0.1:4173/site/` and switch modes from the account control.
