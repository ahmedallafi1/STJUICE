# ST. JUICE — Ingredient, Allergen and Nutrition System

## Safety status

Stage 03 creates the data structure and conservative working flags. It does not publish verified nutrition or promise that any item is allergen-free.

## Allergen codes

| Code | Allergen |
| --- | --- |
| `milk` | Milk/dairy |
| `egg` | Egg |
| `wheat` | Wheat/gluten-containing cereal |
| `soy` | Soy |
| `peanut` | Peanut |
| `tree_nut` | Tree nuts, including pistachio |
| `sesame` | Sesame |

Fish, shellfish and crustacean allergens are not intentional menu ingredients in the Stage 03 draft, but supplier and shared-facility review is still required.

## Required product fields

- Draft ingredient list in descending recipe order after recipes are finalized.
- Contains allergens.
- May-contain/cross-contact allergens.
- Supplier source for every compound ingredient.
- Recipe version.
- Portion/size version.
- Verification owner and date.
- Nutrition per sellable size.
- Claims with evidence and approval.

## Product display states

### Draft

Internal only. Recipe and supplier labels incomplete.

### Reviewed

Recipe and labels collected, but not yet approved for public claims.

### Verified

Portion, recipe, supplier label and nutrition calculation reviewed and approved.

Only Verified records may show exact public nutrition numbers or regulated claims.

## Nutrition schema

Each size supports:

- Calories.
- Total fat.
- Saturated fat.
- Trans fat.
- Cholesterol.
- Sodium.
- Total carbohydrate.
- Dietary fiber.
- Total sugars.
- Added sugars.
- Protein.
- Vitamin D.
- Calcium.
- Iron.
- Potassium.

All values remain `null` until verified. Null must display as “Nutrition details coming after recipe verification,” not as zero.

## Cross-contact statement — working copy

> Our kitchen handles milk, eggs, wheat, soy, peanuts, tree nuts and sesame. Cross-contact is possible. Ingredient and allergen information is based on current recipes and supplier labels and may change. Tell our team about allergies before ordering.

This copy requires operational/legal review before launch.

## Claims policy

Do not label an item vegan, gluten-free, organic, halal, high-protein, low-sugar or allergen-free until ingredients, suppliers, preparation procedures and cross-contact controls support the claim.

“Plant-based,” “no added sugar” and similar claims also require recipe-level verification.

## Operational verification workflow

1. Freeze a recipe version.
2. Record exact ingredient weights and yields.
3. Collect current supplier specification/allergen sheets.
4. Map contains and may-contain allergens.
5. Calculate nutrition by sellable size.
6. Review cross-contact procedures.
7. Manager approves public data.
8. Publish the verified version.
9. Reopen review when recipe, supplier, portion or process changes.
