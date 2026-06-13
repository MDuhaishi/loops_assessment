# Narrative

## The Problem Explored

Loops operates in a market where merchants — restaurants, grocery stores, retailers — need to list products across multiple commerce channels. The bottleneck is not writing the listing. The bottleneck is that the merchant's source data is incomplete, unstructured, or locked in formats that resist extraction.

The assessment framed this as an opportunity to rewrite the same listing for different platform audiences. My research into the actual problem suggested a more specific and operationally useful hypothesis.

---

## The Chosen Hypothesis

> Merchants often begin with incomplete, unstructured source catalogs. The highest-value AI workflow is to extract these sources into a structured master catalog, identify missing facts, ask the merchant only for the information that cannot safely be inferred, then generate complete platform-ready listings without hallucinating product facts.

This shifts the frame from "AI copywriter" to "AI data engineer + targeted assistant." The listing quality problem is downstream of a data completeness problem.

---

## Tools and Why

**Qwen (vision + text)**: Selected for its strong Arabic language support, which is essential for Saudi market merchants. The vision model handles the image-based PDF extraction without relying on OCR alone. Temperature set to 0.1 for extraction tasks (minimal creativity), 0.3 for listing generation (slightly more expressive but still constrained).

**Playwright**: The only reliable tool for JavaScript-rendered pages like Amazon's storefront. The limitation — Amazon blocks automation — was expected and handled with an explicit fallback chain.

**TypeScript + Zod**: Every LLM response is validated against a schema before being used. This catches hallucinated structures, missing fields, and malformed JSON before they enter the product record.

**pdfjs-dist + @napi-rs/canvas**: Pure Node.js PDF page rendering without requiring external tools like Ghostscript. Works on Windows without Visual Studio build tools.

---

## What Was Built

A two-workflow web application:

1. **Restaurant workflow**: Extract the Kudu menu PDF using Qwen Vision, build a structured product record for each item with confidence scores and provenance, identify missing fields (allergens, calories), allow merchant to answer targeted questions, generate bilingual delivery-app listings, refine and approve.

2. **Retail workflow**: Attempt live Amazon SA scraping with Playwright, fall back gracefully to saved HTML or demo fixtures, normalize scraped data into a structured RetailProduct schema, generate Amazon-style and Noon-style listings from verified facts only.

Both workflows share the same core architecture: `FieldEvidence<T>` schema, deterministic status computation, and constrained generation.

---

## Success Cases

- Bilingual name and price extraction worked reliably on the Kudu menu
- The provenance badge system made data lineage immediately visible in the UI
- Generated listings used only verified facts — zero invented ingredients or specifications in any reviewed output
- The demo mode allowed the full workflow to run without API keys or internet access
- Fact consistency checking provided a second layer of hallucination prevention
- The confidence-based status system correctly triaged products needing review

---

## Failures

- Amazon live scraping failed in every test run due to bot detection
- Allergen and calorie data were universally absent from the Kudu menu — correct to leave null, but this creates a significant completion burden on merchants
- PDF rendering with `@napi-rs/canvas` has platform-specific build requirements
- Retail product attributes (dimensions, weight) require product page navigation — this prototype only scrapes the listing page

---

## Surprises

- The Kudu menu has strong Arabic text that extracted reliably. Arabic product names had confidence scores comparable to English.
- Amazon's bot detection was faster than expected — the scraper was blocked before the deals section loaded in most runs
- The missing allergen problem turned out to be a menu design problem, not an extraction problem. Kudu simply does not print allergens on the menu.

---

## Next Experiment

**Allergen inference + verification loop**: Cross-reference extracted ingredients against a lookup table of known allergens, generate a draft allergen statement with provenance `derived_rule`, and ask the merchant to confirm or correct rather than asking them to provide allergens from scratch. This would reduce merchant completion burden significantly.

The second priority would be building a real-time product page crawler for retail (with appropriate rate limiting and permission) to fill the missing attribute gap.
