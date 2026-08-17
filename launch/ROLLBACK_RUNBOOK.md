# Rollback Runbook

Rollback triggers include failed payments, missing/duplicate POS orders, incorrect tax or totals, exposed personal data, widespread checkout failure, or a critical accessibility/security regression.

1. Stop new live ordering or switch the public order CTA to a clear unavailable state.
2. Preserve logs and provider references without copying sensitive payment data.
3. Revert to the last verified release artifact.
4. Confirm the health endpoint and public informational routes.
5. Reconcile ambiguous payments/orders manually with provider dashboards.
6. Notify store and customer-support owners with a single incident status.
7. Fix and test in staging; do not patch production blindly.
8. Re-run full regression, readiness, controlled order, and approval gates before reopening.

Assign a named release owner and rollback owner before launch. Those names are intentionally not invented in this package.
