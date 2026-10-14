# ST. JUICE HQ / 52-page menu source integration

**Source:** St_Juice_HQ_Menu_Catalog.pdf — concept edition 1.2, 30 September 2026.
**All 40 items are proposals, not approved production recipes or consumer nutrition claims.**

## What has been integrated (public-safe)

- A strictly ordered 40-card menu **crosswalk** in public-product-crosswalk.json:
  name, family, intended serving, proposed public price, estimated/unverified calorie count,
  supplier-dependent allergen prompt, PDF page and exact-name mapping to the web catalog.
- Read-only secured operations endpoint: GET /api/admin/hq/menu-review, with explicit
  match, size and price conflict statuses. It does **not** activate draft items or overwrite prices.
- Operations console Catalog section includes the HQ review list.
- Automated crosswalk, privacy and conflict checks. There are 38 name-unmatched cards, one
  exact-name price conflict (Blue Saint), and one size-mapping ambiguity (Loaded Fruit Cup)
  against the existing 54-record web catalog at initial import.
- The existing customer menu, payment, tax and launch approval gates are unchanged.

## Critical confidentiality boundary

**The linked GitHub repository is PUBLIC.** Do not commit the HQ PDF, complete recipes,
batch formulas, ingredient usage, internal cost/profit tables, supplier invoices,
price anchors, trade secrets or operational details to this repository.

The full 52-page source (including photographs and charts) must be held in
an approved access-controlled private document store. The companion importer
allows a local copy of all text, all 40 parsed cards and the original source PDF
under ignored hq/private/, not as an Internet-accessible static asset.

### Local complete private import (not run on Vercel)

Install Poppler on macOS: brew install poppler

    npm run import:hq -- "/path/to/St_Juice_HQ_Menu_Catalog.pdf"

Produces hq/private/hq-catalog-full.json (all 52 page texts, detailed cards,
weights, method, presentation, allergens, unit economics) and
hq/private/hq-catalog-source.pdf (all pages with original concept images).
This directory is gitignored. Back it up **privately** under controlled staff
access; do not publish it or attach it to logs.

Run:

    npm run audit:hq
    npm run audit:hq -- --strict
    npm test

The strict HQ audit will intentionally fail until the mismatches are resolved.
The normal audit validates the contract and reports outstanding decisions.


## 14 October 2026 — Local confidential HQ workspace (implemented)

This repository is still **public** unless the GitHub owner changes its visibility.
No recipe weights, vendor invoices, item COGS, margins, private source PDF, or
source-page body text were committed.

The owner-only private HQ ZIP was assembled from the exact 52-page source.
It contains the original illustrated PDF, a full 52-page text archive, 40 complete
recipe cards, 40 unit-economics rows, 40 sample student discount rows, and
an internal costing CSV. Each data field is marked a development proposal.

### Use the private ZIP with the running app on your own computer

1. Download the **STJUICE_HQ_PRIVATE_MASTER_2026-10-14.zip** attachment from
   the ChatGPT conversation. Store and unpack it in a secure folder **outside**
   your GitHub repo, for example `~/STJUICE_HQ_PRIVATE/`. Its internal JSON file
   is `hq-master-private.json`. Restrict folder/files to your own user account.
2. Run the STJUICE site locally, bound to the loopback interface. Example on macOS:

   ```sh
   export ST_JUICE_ADMIN_TOKEN='REPLACE_WITH_OWN_LONG_RANDOM_SECRET'
   export ST_JUICE_HQ_PRIVATE_LOCAL_ENABLED=true
   export ST_JUICE_HQ_MASTER_PATH="$HOME/STJUICE_HQ_PRIVATE/hq-master-private.json"
   npm start
   ```

3. Visit the **local** Operations console (`http://127.0.0.1:3000/ops/`
   if the app prints port 3000), unlock with your own operations secret and
   choose **HQ Private**. You can inspect:
   - All forty confidential recipe builds, methods and presentation specs.
   - Proposed price, estimated food/packaging cost, estimated gross margin.
   - Cards above 30% base COGS and estimated 10% discount cases above the
     PDF's 45% manager-review threshold.
   - The source text of **every one of the 52 PDF pages**, page-by-page.
   - All figures remain proposals; the site does not publish or write edits.
4. For command-line access without a browser:

   ```sh
   npm run hq:private -- summary
   npm run hq:private -- card 8
   npm run hq:private -- page 42
   ```

**Safety contract:** `/api/admin/hq/private/*` is protected by the admin
credential **and** refuses access unless explicitly opted in from a
loopback-only, non-production Node server. Vercel/cloud production always
denies private HQ access even if environment variables are mis-set.
No private file is copied into `dist-public` or `site/project-data.js`.
This is a **local preview tool**, not production staff RBAC or audited
persistent cloud storage. Owner, manager and staff identities and privileges
must be implemented before remote access or editing.

### Existing direct-PDF importer

`npm run import:hq -- "/private/path/St_Juice_HQ_Menu_Catalog.pdf"`
requires Poppler `pdftotext`. Its default destination is
`~/STJUICE_HQ_PRIVATE/` and may be overridden with
`ST_JUICE_HQ_IMPORT_DIRECTORY`; an in-repository destination is refused.
The original PDF and all page texts are retained. The archive extracted from
the ChatGPT private ZIP already has a richer structured 40-unit-economics
record, so use `hq-master-private.json` from the ZIP when available.

### What is NOT automatically approved or switched on

There is no production payment/POS, verified student or service-worker discount,
live database, staff RBAC, food-safety approval, supplier-cost agreement or
allergen/nutrition validation. The public menu's 54 records are unchanged.
38 draft card names are not exact matches, and Blue Saint price/formula,
Loaded Fruit Cup serving and 10-vs-12 minis require explicit reconciliation.

## Exact scope of the 52-page PDF (source of truth, not public content)

Pages 1-3: brand title, development warnings, usage, launch guide, contents.
Pages 4-23: forty numbered illustrated recipe cards; size, proposed price,
estimated nutrition, ingredient amounts, method, presentation, allergens,
proposed gross profit.
Pages 24-28: calorie/COGS basis, 7% prep-loss methodology, limitations,
40-unit cost and profit tables and sample discount economics.
Pages 29-31: student/group bundles, public-service employee discounts,
60-day pilot, stacking guardrails, ethics and regulatory caveats.
Pages 32-41: ingredient-by-ingredient recipe/quantity/calorie/cost calculations.
Pages 42-44: supplier retail price anchors, indicative packaging quotes and
St. Louis procurement notes.
Pages 45-46: shared bases and batching; fruit/dairy/pistachio/chocolate,
bakery, allergen, packaging and substitution specifications.
Pages 47-48: production stations, process map, temperature/food-safety
controls, date marking, and fresh/packaged juice distinction.
Pages 49-52: costing worksheet, staged launch menu, QC/training logs,
approvals, regulatory links, version notes and imagery limitations.

**No owner approval is assumed** for any recipe, price, benefit, medical claim
or nutritional figure. The existing production readiness checks must remain
blocked until suppliers, equipment, food-safety, payment, database and legal
requirements are independently fulfilled.

## Release and reconciliation checklist

1. Approve *one* authoritative product ID/recipe for each of 40 cards; do not
   silently overwrite the 54 web records (45 current individual + 9 group).
2. Resolve Blue Saint ingredient-and-price conflict; Loaded Fruit Cup size and
   topping configuration; mini-pancake 10-versus-12 serving rule.
3. Weigh actual edible yields and pressing yield; replace indicative food cost,
   packaging freight, trim, and supplier SKU quotes in private HQ ledger.
4. Approve nutrition, allergen matrix/cross-contact, shot claims, juice storage
   and final customer photography before public display.
5. Authorize discounts, student/business/public-service verification rules,
   ethical exclusions for inspectors, rewards liabilities and nonstacking.
6. Integrate production authentication, durable database, payment tokenization,
   POS, tax, delivery, email/SMS, refunds, backups and staff audit history.
7. Execute full end-to-end test in Safari/Chrome mobile and desktop, owner signoff
   and a real payment-to-refund test before switching off safe-test.

Do not equate a data import, a passed unit test or a Vercel preview with a
production launch.
