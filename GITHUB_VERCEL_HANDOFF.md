# GitHub & Vercel Handoff

## GitHub

Create an empty repository, then run from this project directory:

```bash
git init
git branch -M main
git add .
git commit -m "Prepare ST. JUICE release candidate"
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

The repository includes:

- `.gitignore` with secrets, local Vercel data, logs, ZIPs and generated folders excluded;
- `.nvmrc` pinned to Node.js 22;
- `package-lock.json` for reproducible `npm ci`;
- `.github/workflows/ci.yml` for clean-install and full-test checks;
- no committed production credentials.

## Vercel preview deployment

1. Import the GitHub repository into Vercel.
2. Use the repository root as the project root.
3. Select “Other” if framework detection asks.
4. Keep the committed build command and output directory. The build publishes only the storefront assets; research, stage history and operational documents are not exposed as public static files.
5. Deploy. `/` redirects to `/site/`; API paths are handled by the Node.js function under `api/`.
6. Verify `/api/health` and `/api/launch-readiness`.

The current deployment is a preview/safe-test candidate. Vercel serverless memory is not durable, so test quotes, payment tokens, accounts and orders may disappear between invocations. That is acceptable only while the site is clearly in safe-test mode.

## Environment variables

Copy only the names from `.env.example` into Vercel. Add real values through Vercel project settings; never commit them. A public origin, phone and email alone do not enable live commerce—the committed readiness approvals and every required provider boundary must also be completed.

## Before a public live-commerce release

- Replace in-memory state with a durable database.
- Replace test payment and POS adapters with reviewed, webhook-aware providers.
- Configure tax, delivery, refunds, inventory/capacity and transactional messaging.
- Approve public contacts, hours, policies, recipes, allergen controls, nutrition, rewards, student verification and final media.
- Configure monitoring, backup/restore and rollback ownership.
- Require `npm run readiness` to return `launchReady: true`.
- Generate public SEO files with the approved HTTPS origin.
- Run one controlled real order and reconcile the website, payment, POS and customer receipt.

## Verification commands

```bash
npm ci
npm test
npm run audit
npm run validate:vercel
```

The GitHub workflow runs the same release checks on pushes to `main` and on pull requests.
