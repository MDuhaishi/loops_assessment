# Data Card

## Dataset 1: Kudu Restaurant Menu PDF

| Property | Value |
|---|---|
| Source | `assets/kudo_menu.pdf` (local file) |
| Format | Image-based PDF (no text layer) |
| Pages | 7+ pages |
| Extraction method | Qwen Vision model (live) or demo fixture (offline) |
| Language | Arabic + English (bilingual) |
| Products extracted | 15 (demo fixture) |
| Live extraction | Requires `QWEN_API_KEY` and `@napi-rs/canvas` |

### Fields collected

| Field | Coverage | Confidence range |
|---|---|---|
| Name (EN) | 100% | 0.55–0.97 |
| Name (AR) | 100% | 0.58–0.95 |
| Category | 100% | 0.55–0.95 |
| Base price (SAR) | 93% | 0.65–0.97 |
| Description (EN) | 80% | 0.82–0.9 |
| Description (AR) | 80% | 0.82–0.88 |
| Ingredients | 73% | 0.75–0.9 |
| Toppings | 60% | 0.8–0.9 |
| Sauces | 60% | 0.8–0.88 |
| Allergens | 20% (low confidence) | 0–0.65 |
| Calories | 0% | 0 |
| Sizes | 27% | 0.92 |

### Known limitations

- Allergens are not listed anywhere in the Kudu menu — this is a genuine gap for delivery platform onboarding
- Calories are absent — Kudu does not publish calorie information on the menu
- One product (BBQ Bacon Smash) was partially obscured in the source, resulting in low-confidence extraction
- Page rendering quality affects extraction accuracy — scale set to 2.0x for this prototype

---

## Dataset 2: Amazon SA Seller Deals Page

| Property | Value |
|---|---|
| Source URL | `https://www.amazon.sa/stores/page/C70094F1-7970-411E-BEF6-8009746DB248/deals` |
| Extraction method | Playwright (live attempt) → saved HTML → demo fixture |
| Products in demo fixture | 8 |
| Extraction timestamp | June 2025 (demo fixture) |
| Live extraction status | Amazon SA blocks automated access |

### Fields collected (per product)

| Field | Coverage | Source |
|---|---|---|
| ASIN | 100% | URL /dp/ extraction |
| Title | 100% | DOM element |
| Brand | 88% | Title prefix |
| Current price (SAR) | 100% | Price element |
| Original price (SAR) | 100% | Strikethrough element |
| Discount % | 100% | Calculated |
| Image URL | 100% | img src |
| Rating | 100% | Rating element |
| Review count | 100% | Review element |
| Model number | 75% | Title text |
| Color | 75% | Variation/title |
| Technical specs | 88% | Title parsing |
| Dimensions | 0% | Not on listing page |
| Weight | 0% | Not on listing page |
| Warranty | 0% | Not on listing page |
| Package contents | 0% | Not on listing page |
| Country of origin | 12% (low confidence) | Brand inference |

### Known limitations

- Amazon SA returns CAPTCHA or blocks Playwright within seconds in most test runs
- Product page attributes (dimensions, weight, warranty) would require navigating to each /dp/ page — not in scope for this prototype
- Demo fixture products are representative of what the deals page would contain, not directly scraped
- Image URLs in demo fixture may expire (Amazon CDN)
- Prices reflect demo data, not live pricing

---

## Data Freshness

| Data | Freshness | Notes |
|---|---|---|
| Demo restaurant products | Static | Fixture representing Kudu menu as of June 2025 |
| Demo retail products | Static | Fixture representing typical Amazon SA deals |
| Live restaurant products | Extracted on demand | Cached in `data/processed/` |
| Live retail products | Extracted on demand | Cached in `data/processed/` |
| Extraction run log | Live | Updated on each extraction attempt |
