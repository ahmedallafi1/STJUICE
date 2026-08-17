# Structured menu data

## Canonical files

- `catalog.json` — categories and every sellable product record.
- `modifiers.json` — reusable modifier groups and prices.
- `build-your-mood.json` — builder steps, pricing and compatibility.
- `bundles-catering.json` — group formats, catering packages, lead times and form schema.
- `allergens.json` — allergen registry, nutrition field list and verification rules.
- `deferred-catalog.json` — retained concepts that are not publicly sellable at launch.
- `catalog.schema.json` — baseline JSON Schema for catalog structure.
- `validate-menu.mjs` — project validator.

## Merge rules

Product records inherit `catalog.json.recordDefaults`. Explicit product fields override defaults. Modifier groups are referenced by `modifierGroupIds`; applications must reject an unknown reference rather than silently hiding it.

## Status rules

- `working_requires_owner_approval` prices are not final.
- `draft_requires_recipe_and_supplier_review` ingredients are not legal ingredient declarations.
- `unverified` nutrition is always displayed as unavailable—not zero.
- A product with `selection_dependent` allergens must calculate flags from the selected components and force review before checkout.

## Validation

From the package root:

```bash
node menu/data/validate-menu.mjs
```
