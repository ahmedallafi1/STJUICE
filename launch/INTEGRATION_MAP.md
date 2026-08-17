# Production Integration Map

| Capability | Current boundary | Production replacement |
| --- | --- | --- |
| Payment | Exact-amount token-only test adapter | Hosted/tokenized PCI provider flow, Apple Pay/Google Pay support and authenticated webhooks |
| POS | Test receipt adapter | Provider order API with idempotency and status reconciliation |
| Orders | In-memory maps | Durable transactional database |
| Accounts | Local/memory prototype | Secure identity, sessions, recovery and durable profiles |
| Student verification | Manual-review placeholder | Approved verification process/provider |
| Rewards | Working display state | Approved ledger, earning/redemption rules and liability controls |
| Delivery | Complete-address manual review | Verified zones, fees, minimums and dispatch/provider integration |
| Tax | Explicitly unconfigured $0 | Merchant-approved calculation and reporting |
| Email/SMS | Not connected | Transactional providers with consent and suppression handling |
| Analytics | Not connected | Consent-aware measurement and monitoring |

Provider-specific adapters should preserve the existing authoritative pricing, raw-card rejection, idempotency, masked public responses, and explicit failure states.
