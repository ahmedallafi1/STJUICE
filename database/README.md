# ST. JUICE database contract

Phase 2 defines PostgreSQL as the production persistence target for member accounts, benefits and reservations.

## Current runtime boundary

The current preview runtime still uses the in-memory account store. This is intentional until a real database connection is provisioned and migrations are applied. The launch readiness check must continue to report the database blocker while the runtime is memory-only.

Do not switch `launch/config/launch-config.json -> customerData.database` away from `memory_only_test` merely because this schema exists. The runtime adapter, migration execution, backup/restore plan and deployed `ST_JUICE_DATABASE_URL` must all be present first.

## Schema responsibilities

`schema.sql` persists:

- accounts and password hash material;
- hashed session-token / CSRF-token records;
- favorites, saved mixes and addresses;
- student verification and business approval state;
- rewards enrollment;
- append-style reward ledger transactions with idempotent source keys;
- reward/birthday grants;
- reservation requests and lifecycle state;
- member-to-order links;
- account audit events.

Reward proposal economics do not belong in the database schema. Active earning, redemption, account-discount and birthday rules remain config-driven and require owner approval before activation.

## Production adapter requirements

The production repository adapter must:

1. hash session and CSRF tokens before persistence;
2. run account + ledger mutations transactionally;
3. enforce the unique ledger/grant idempotency indexes;
4. lock or serialize reward redemptions so concurrent requests cannot overspend a balance;
5. persist reservation status changes and reviewer references;
6. preserve account/order linkage across deploys;
7. support account export/deletion while retaining only legally required audit records;
8. expose health/readiness separately from ordinary account requests;
9. never fall back silently to memory when production mode expects PostgreSQL;
10. have tested backup and restore before launch.

## Activation order

1. Provision PostgreSQL and store `ST_JUICE_DATABASE_URL` only in the deployment secret store.
2. Apply `database/schema.sql`.
3. Connect the repository adapter and run account/reward/reservation integration tests against an isolated database.
4. Migrate or discard preview-memory data intentionally; never mix it into production by accident.
5. Test restart/deploy persistence and backup restore.
6. Only then change launch configuration away from `memory_only_test`.
