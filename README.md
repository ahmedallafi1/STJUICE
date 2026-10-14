# ST. JUICE — GitHub & Vercel Release Candidate

Version: 9.0  
Stage: 09 of 09  
Status: **Complete launch-candidate package; live activation is blocked pending real production inputs and approvals.**

This repository contains the cumulative ST. JUICE brand, menu, media, storefront, ordering, account, rewards, QA and launch architecture. It is structured for GitHub and Vercel while preserving a hard boundary between a deployable preview and unconfigured live commerce.

## Start here

1. `GITHUB_VERCEL_HANDOFF.md` — repository and Vercel deployment instructions.
2. `LAUNCH_READY_INDEX.md` — launch architecture overview.
3. `launch/PRODUCTION_INPUTS.md` — information and vendor choices still required.
4. `launch/config/launch-config.json` — non-secret approval/configuration state.
5. `.env.example` — deployment variables; never commit real values.
6. `launch/DEPLOYMENT_CHECKLIST.md` — release process.
7. `RELEASE_AUDIT.md` — final full-repository findings and verification.

## Run

```bash
npm test
npm run audit
npm run validate:vercel
npm start
npm run readiness
```

Open `http://127.0.0.1:4173/site/`.

`npm run readiness` intentionally exits with code 2 while blockers remain. The current archive stays in safe-test mode: no money, live store order, customer database, production account, SMS/email, or public indexing is active.

## Public activation

After every input and approval is complete, run the readiness gate and require `launchReady: true`. Then generate public SEO files using the approved HTTPS origin and follow the controlled deployment checklist. Deploying the current commit is appropriate for private/stakeholder review; enabling real commerce is not.

## Working Vercel ordering preview

**The ordering experience remains interactive on Vercel.** Browse the 54-record
working customer catalog, customize drinks and desserts, add items to the cart,
select pickup/dine-in/delivery, go through checkout, make a simulated test
payment, and view the demo order confirmation and tracking status. Test orders
are volatile and are **not real shop orders**, and test payment tokens never
charge a customer. Cash is available in preview for pickup and dine-in, not
for delivery. Production payment and durable storage are still pending.

**Confidentiality:** Private HQ recipe builds, supplier costs, financial
margins, original 52-page HQ source and local-only private dashboard are NOT
shipped in the Vercel static output. The local operations console remains in
the source tree and requires its admin token for API access. No private
credentials are committed. CI tests enforce a working Vercel preview checkout
and verify private files and dashboards are absent from the public asset build.

For the visual preview, open the latest Vercel deployment from the GitHub
commit status and choose **Visit**. Do not interpret a successful Vercel
preview or a simulated order as approval to collect real money.
