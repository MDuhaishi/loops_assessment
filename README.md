# CatalogPilot

> Turn messy merchant catalogs into verified, platform-ready listings.

---

## 1. Product Overview

CatalogPilot is an AI-powered catalog onboarding assistant that extracts unstructured merchant source data (image-based PDFs, seller pages) into a structured master catalog, identifies missing facts, asks the merchant targeted questions, and generates complete platform-ready listings — without hallucinating product facts.

**Key principle:**
> CatalogPilot treats listing optimization as a data-completion problem before it treats it as a copywriting problem.

---

## 2. Problem Framing

Merchants on platforms like Loops face a consistent challenge: their source product data is incomplete, unstructured, or locked in formats that resist programmatic extraction. Common sources include:

- Image-based menu PDFs (no embedded text)
- Supplier product sheets
- Existing marketplace pages
- Spreadsheets with inconsistent field names

The standard AI approach — "rewrite the same listing for different platform audiences" — skips the harder and more valuable step: **completing the underlying product record** before generating any output.

---

## 3. Hypothesis

> The highest-value AI workflow is to extract these sources into a structured master catalog, identify missing facts, ask the merchant only for the information that cannot safely be inferred, then generate complete platform-ready listings without hallucinating product facts.

This means the system must:
1. Extract what it can from the source document
2. Quantify its confidence in each extracted field
3. Flag genuinely missing fields and generate targeted merchant questions
4. Allow the merchant to provide verified answers
5. Generate listings using **only verified facts**
6. Validate generated content against the verified record before approval

---

## 4. Why This Is More Useful Than Audience-Based Rewriting

Generic audience rewriting (e.g., "write this for a health-conscious audience") assumes the product record is complete and accurate. In practice:

- Allergen information is often missing
- Calorie counts are rarely in source documents
- Product dimensions and compatibility details are absent
- Brand/model identifiers may be inconsistent

Writing compelling copy about missing facts forces the AI to invent them. CatalogPilot refuses to do this.

---

## 5. Architecture

```
/
├── client/          React + Vite + TypeScript + Tailwind
├── server/          Node.js + Express + TypeScript
├── assets/          Logo.png + Kudu menu PDF
├── data/
│   ├── demo/        Fixture data (restaurant + retail)
│   ├── processed/   Live extraction results (gitignored)
│   ├── raw/         Saved Amazon HTML / menu page images (gitignored)
│   └── exports/     Generated CSV/JSON exports (gitignored)
└── docs/            Assessment documents
```

**Backend routes:**
- `GET /api/health` — health check
- `GET /api/config/mode` — mode info, Qwen status
- `POST /api/restaurant/extract` — trigger PDF extraction
- `GET/PATCH /api/restaurant/products/:id` — CRUD
- `POST /api/restaurant/products/:id/questions` — generate targeted questions
- `POST /api/restaurant/products/:id/generate` — generate listing
- `POST /api/restaurant/products/:id/refine` — refine with merchant instruction
- `POST /api/restaurant/products/:id/approve` — approve
- *(retail equivalent endpoints)*
- `GET /api/export/restaurant.csv|json` — export

---

## 6. Restaurant Workflow

1. **Source**: `assets/kudo_menu.pdf` (image-based PDF)
2. **Render**: Pages converted to PNG using `pdfjs-dist` + `@napi-rs/canvas`
3. **Extract**: Qwen Vision processes each page, returns structured JSON
4. **Normalize**: Products deduplicated, confidence computed, status assigned
5. **Review**: Merchant opens each product, sees provenance badges on every field
6. **Complete**: Missing-field assistant generates targeted questions; merchant answers update the record with `merchant_input` provenance
7. **Generate**: Listing generated using **only verified facts**; fact consistency check runs post-generation
8. **Refine**: Merchant can give natural-language instructions (e.g., "Make it shorter")
9. **Approve**: Product approved and ready to export

---

## 7. Retail Workflow

1. **Source**: Amazon SA deals page URL (hardcoded for this prototype)
2. **Extract**: Playwright loads the page, scrapes product cards
3. **Fallback chain**: Live scrape → saved HTML → demo fixture
4. **Normalize**: ASINs extracted, prices parsed, discounts calculated
5. **Review/Complete**: Same pattern as restaurant
6. **Generate**: Two format profiles — Amazon-style (title + 5 bullets + description + keywords) and Noon-style (title + highlights + description + specs)
7. **Approve**: Approved and ready to export

---

## 8. Qwen Configuration

```bash
# Copy and fill in your keys
cp .env.example .env
```

```env
QWEN_API_KEY=your_key_here
QWEN_VISION_MODEL=qwen-vl-plus   # or qwen-vl-max for higher quality
QWEN_TEXT_MODEL=qwen-plus         # or qwen-turbo for faster/cheaper
```

Get your key at [DashScope](https://dashscope.aliyuncs.com).

When `QWEN_API_KEY` is absent, the app runs in **demo mode** using cached extraction results and fixture data. A visible banner distinguishes demo from live data.

---

## 9. Setup Instructions

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env to add your QWEN_API_KEY (optional for demo mode)

# 3. Install Playwright browser (for Amazon scraping)
npm run install:playwright

# 4. Start development server
npm run dev
# → Server: http://localhost:3001
# → Client: http://localhost:5173

# 5. Build for production
npm run build

# 6. Run tests
npm run test
```

---

## 10. Demo Mode

The app works fully without a Qwen API key:

- **Restaurant**: Uses `data/demo/restaurant_products.json` (15 Kudu menu products with realistic extracted data)
- **Retail**: Uses `data/demo/amazon_products.json` (8 Amazon SA products with realistic scraped data)
- **Listings**: One pre-generated listing (JBL Tune 510BT) is included in the demo data

A `⚠️ Demo fixture` banner is shown wherever demo data is active.

---

## 11. Amazon Scraping Limitations

Amazon SA actively blocks automated browser sessions. The Playwright scraper will:

1. Attempt live extraction
2. If blocked (0 products found or CAPTCHA detected), report a warning
3. Fall back to `data/raw/amazon_page.html` if present
4. Otherwise use `data/demo/amazon_products.json`

**To enable scraping with a saved HTML snapshot:**
1. Open the Amazon deals URL in your browser
2. Save the full page HTML
3. Place it at `data/raw/amazon_page.html`
4. Trigger extraction — the server will parse the saved HTML

The extracted product URL is hardcoded and allowlisted:
`https://www.amazon.sa/stores/page/C70094F1-7970-411E-BEF6-8009746DB248/deals`

---

## 12. Data Provenance and Hallucination Safeguards

Every extracted field carries:
- `value` — the extracted value (null if not found)
- `confidence` — 0.0 to 1.0 extraction confidence
- `source` — one of `source_document | scraped_page | merchant_input | ai_generated | derived_rule`
- `sourceRef` — page number, selector, or text snippet
- `needsReview` — true if confidence < 0.85

Safeguards against hallucination:
1. Prompts explicitly prohibit invented facts
2. Post-generation fact consistency check compares output against verified record
3. `unsupportedFactsAdded` array must be empty before approval
4. Generated listing validation rejects obvious numeric claims not in verified data
5. Missing fields remain null — never guessed — until merchant provides them

---

## 13. What Worked

- Qwen Vision reliably extracted bilingual names and prices from menu images
- Zod validation caught malformed LLM outputs before they entered the data store
- The confidence-based status system correctly triaged extraction quality
- Provenance tracking made data lineage transparent
- The two-workflow structure demonstrated the hypothesis clearly

---

## 14. What Did Not Work

- Amazon SA blocks Playwright sessions consistently — live scraping requires a saved HTML fallback
- `@napi-rs/canvas` PDF rendering may fail on some Windows builds without native toolchain
- Calorie counts and allergen information were universally absent from the Kudu menu — a real gap for delivery platforms
- Retail product attribute depth (dimensions, weight, compatibility) requires product page navigation — not in scope for this prototype

---

## 15. What Would Be Built Next

1. **Allergen lookup service** — cross-reference common ingredients against known allergen databases
2. **Batch question collection** — show all products with missing details on one page for efficient bulk completion
3. **Platform schema adapters** — Loops-managed channel schema definitions per platform (Jahez, Hunger Station, Talabat, Noon, Amazon SA)
4. **Image extraction** — extract product images from PDFs or scrape product page images
5. **Confidence drift detection** — flag when re-extraction produces different values
6. **Real Amazon product page crawl** — with permission, navigate into each product page for complete attribute data

---

## 16. Assessment Mapping

| Assessment Criterion | Implementation |
|---|---|
| Problem understanding | `docs/PROBLEM_DEEP_DIVE.md` |
| Solution approach | `docs/SOLUTION_LANDSCAPE.md` |
| AI usage (vision, text) | `server/src/services/qwen.ts` + all prompts |
| No hallucination | `server/src/prompts/fact-consistency-review.ts`, `validateGeneratedListingFacts()` |
| Provenance tracking | `FieldEvidence<T>` schema throughout |
| Arabic + English | All product schemas, generation prompts |
| Structured extraction | Zod schemas, pdfjs-dist pipeline |
| Amazon scraping | `server/src/services/amazonScraper.ts` |
| Honest fallback | `DataSourceBanner`, demo mode |
| Tests | `server/src/__tests__/deterministic.test.ts` |
| Demo-runnable | `data/demo/` fixtures, no API key required |
