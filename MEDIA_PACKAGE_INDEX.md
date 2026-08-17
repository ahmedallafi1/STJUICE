# ST. JUICE — Stage 04 Media Package Index

## Package purpose

This package translates the approved brand, menu and account system into an original first visual direction for Stage 05. It separates review-grade source imagery, web-optimized derivatives, lightweight motion and real-production requirements.

## Recommended review order

1. `media/generated/hero/st-juice-hero-concept-v1.png`
2. `media/generated/products/`
3. `media/generated/categories/category-art-board-concept-v1.png`
4. `media/generated/categories/tiles/`
5. `media/generated/account-modes/account-modes-concept-v1.png`
6. `media/generated/packaging/`
7. `media/motion/hero-loop-storyboard-concept-v1.png`
8. `media/motion/st-juice-hero-loop.svg`
9. `media/manifests/media-manifest.md`

## Inventory

| Class | Review/source files | Optimized WebP files | Total visual files |
| --- | ---: | ---: | ---: |
| Hero | 1 | 2 | 3 |
| Priority products | 5 | 5 | 10 |
| Category board and 12 tiles | 13 | 12 | 25 |
| Account-mode art | 1 | 1 | 2 |
| Packaging and Birthday Box | 2 | 2 | 4 |
| Motion storyboard | 1 | 1 | 2 |
| Animated SVG and fallback | 2 | 0 | 2 |
| **Total** | **25** | **23** | **48** |

## Implementation routing

| Need | Preferred file |
| --- | --- |
| Desktop hero image | `media/optimized/webp/hero/st-juice-hero-1600.webp` |
| Mobile/tablet hero image | `media/optimized/webp/hero/st-juice-hero-960.webp` |
| Product cards | `media/optimized/webp/products/` |
| Category cards | `media/optimized/webp/categories/` |
| Account-mode explainer | `media/optimized/webp/account-modes/account-modes-concept-v1.webp` |
| Packaging section | `media/optimized/webp/packaging/` |
| Decorative hero motion | `media/motion/st-juice-hero-loop.svg` |
| Reduced-motion fallback | `media/motion/st-juice-hero-loop-fallback.svg` |

## Status rule

All generated raster files and all of their derivatives are concept placeholders. Their appearance, quantities and packaging cannot be treated as operational truth. Use `media/manifests/media-manifest.json` as the machine-readable authority.

## Contents

- `media/01_ART_DIRECTION.md` — composition, palette, lighting and mode rules.
- `media/02_PHOTO_VIDEO_SHOTLIST.md` — real photography/video replacement production plan.
- `media/03_PRODUCTION_AND_RIGHTS.md` — provenance, rights and release gates.
- `media/04_GENERATION_PROMPTS.md` — normalized production prompt record.
- `media/manifests/` — status, naming and traceability.
- `media/generated/` — high-resolution review/source concepts.
- `media/optimized/webp/` — stripped web-delivery derivatives.
- `media/motion/` — storyboard and original SVG motion assets.
