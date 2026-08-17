# ST. JUICE — Hero Motion Specification

## Included assets

- `hero-loop-storyboard-concept-v1.png` — six-frame directional storyboard; not a video.
- `st-juice-hero-loop.svg` — original seven-second abstract loop.
- `st-juice-hero-loop-fallback.svg` — static fallback.
- `../optimized/webp/motion/hero-loop-storyboard-concept-v1.webp` — review-optimized storyboard.

## Motion behavior

- Loop length: approximately seven seconds.
- Visual actions: fruit-like forms drift, chrome/seed orbit rotates, pistachio pour appears and liquid rises.
- No audio, text, offer or factual product claim.
- The SVG includes `prefers-reduced-motion: reduce`; animation stops and the composition remains readable.

## Stage 05 implementation

Use the SVG as an `<img>` or CSS background for decorative use. If animated content becomes essential, provide a visible pause control. Use empty alt text when the motion is decorative; use the included descriptive metadata only when the illustration conveys meaningful context.

Recommended fallback order:

1. Animated SVG when supported and motion is permitted.
2. Static SVG when reduced motion is requested or animation fails.
3. Hero WebP when a product-led visual is selected.

Do not layer important text inside the SVG. Keep headline, price, offer and calls to action as accessible HTML.

## Acceptance tests

- No layout shift: declare dimensions or aspect ratio.
- No autoplay audio.
- Reduced-motion mode freezes all animation.
- Text and controls remain legible over any chosen background.
- Animation does not capture pointer events.
- Verify Chrome, Safari, Firefox and current mobile browsers.
- Measure impact on largest-content render and total transfer size.
