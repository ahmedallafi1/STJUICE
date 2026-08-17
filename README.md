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
