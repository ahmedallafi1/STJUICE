# Stage 09 Launch Candidate

This layer makes the cumulative project operationally handoff-ready without representing missing production systems as connected.

## Commands

```bash
npm test
npm run readiness
npm start
```

`npm run readiness` exits with code 2 while any required launch check is unresolved. This is intentional and should be used as a release gate.

The public API exposes `GET /api/launch-readiness`. It returns check IDs and status only—never secret values.

## Safe activation order

1. Enter approved non-secret business settings in `launch/config/launch-config.json`.
2. Set credentials in the deployment platform from `.env.example`; never commit values.
3. Replace test adapters with reviewed provider adapters.
4. Configure durable account/order data and migrations.
5. Approve commercial, privacy, cookie, refund, catering, allergen, and nutrition content.
6. Run a real low-value end-to-end order in a controlled launch window.
7. Confirm monitoring, backups, ownership, and rollback.
8. Run `npm run readiness`; proceed only at `launchReady: true`.
9. Generate public SEO files with the approved HTTPS origin.
10. Deploy, verify, and monitor.

Until then, the site remains a safe-test launch candidate and search indexing stays blocked.
