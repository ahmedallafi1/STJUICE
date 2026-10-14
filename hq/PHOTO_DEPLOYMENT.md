# ST. JUICE | Publish the 40 exact HQ product photographs

The website menu uses **only** products #01–#40 from the owner's
`St_Juice_HQ_Menu_Catalog.pdf` (pages 4–23).
The matching WebP image for each number was extracted from that product's
original card without using the image of an unrelated catalog item.

## Assets

ChatGPT delivers one downloadable **STJUICE_HQ_40_PRODUCT_WEB_ASSETS.zip**
containing all 40 WebP photographs already named and organized under:

    media/optimized/webp/hq-catalog/hq-01-citrus-sunrise.webp
    ...
    media/optimized/webp/hq-catalog/hq-40-golden-turmeric-shot.webp

The archive also contains `public-photo-manifest.json` with exact card numbers,
PDF pages, product names, prices and public photo paths. All 40 pictures are
concept visualizations; real products still need a test-kitchen photo review.

## One-time publish step

1. Unzip the **photo-only** archive from the user's ChatGPT conversation.
2. In GitHub open `media/optimized/webp/hq-catalog/` on `main` and use
   **Add file → Upload files**. Drag all **40 WebP files** from the extracted
   subdirectory, then **Commit changes**.
3. Let Vercel redeploy `main`. The build automatically detects uploaded
   WebP assets and replaces the temporary category fallback with each exact
   product's HQ picture. No product data or code edit is needed after upload.
4. Inspect `/menu`, a drink detail, a dessert detail and the cart on mobile.

**Never upload** the original 52-page PDF, the HQ private ZIP, recipes,
ingredient weights, supplier invoices, food costs or profit worksheets
to this public GitHub repository.

The photo-only ZIP is not yet present in GitHub as of this code revision.
Until the assets are uploaded, category fallback visuals are shown instead of
broken image links. This is a deliberate safe staging gate.

## Published scope

Exactly 40 numbered HQ products, one serving each, the PDF's working suggested
price per item, no old products, no buy-now boxes that were not among the forty.
The checkout stays functional in safe-test mode with **no live charge**.
