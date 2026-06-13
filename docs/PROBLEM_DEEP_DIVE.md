# Problem Deep Dive

## The Core Problem: Unstructured Merchant Source Data

Merchants joining commerce platforms do not arrive with clean, structured product catalogs. They arrive with:

### 1. Image-based PDF menus
Restaurant menus are almost always PDFs that were designed for print. The text is embedded as image layers — standard PDF text extraction returns nothing. Each page must be treated as an image and processed by a vision model.

**Kudu example**: The menu PDF contains multiple pages with Arabic and English product names, prices, and descriptions laid out in a custom design format. There is no underlying text layer, no metadata, no machine-readable structure.

### 2. Supplier documents and spreadsheets
Retail merchants often receive product data from suppliers in formats designed for supply chain management, not e-commerce. Fields may be labeled differently from platform requirements. Values may be present but in the wrong format (e.g., "W15 x H25 x D10 cm" instead of separate dimension fields).

### 3. Existing marketplace pages
A merchant moving products from one platform to another starts with whatever the previous platform rendered. This is richer than a PDF but still requires normalization — titles optimized for one platform's search algorithm may not work on another, and marketplace-specific fields (ASINs, bullet points, backend keywords) may be entirely absent.

### 4. Manual catalog entry
The worst case: a merchant manually entering products into a platform's backend form. This is slow, error-prone, and duplicates work across platforms.

---

## The Completeness Gap

Even when extraction succeeds, source data is systematically incomplete for platform requirements:

| Field | Presence in source data | Platform requirement |
|---|---|---|
| Product name (EN) | Usually present | Required |
| Product name (AR) | Usually present for Saudi market | Required |
| Price | Usually present | Required |
| Description | Partial | Required |
| Allergens | Rarely listed | Required (food) |
| Calories | Very rarely listed | Required (food, increasingly) |
| Ingredients | Partially listed | Recommended |
| Dimensions | Rarely extracted without product page navigation | Required (retail) |
| Weight | Same as dimensions | Required (retail) |
| Warranty | Not in scraped listing | Required (electronics) |
| Country of origin | Not in scraped listing | Required (Amazon) |

This gap is not random — it's structural. The **sources merchants have** were not created to serve platform requirements. A print menu was designed for customers to choose from, not for a delivery app's schema.

---

## Why Audience-Based Rewriting Is Often Insufficient

The common framing for "AI in catalog management" is: take an existing product description and rewrite it for a specific audience or platform.

This fails in several important ways:

1. **It assumes completeness**: You cannot write an allergen statement if you don't have the allergens. Any system that generates one is hallucinating.

2. **It conflates style with substance**: Changing the tone or structure of a description is cosmetically useful but doesn't fix the underlying data gap.

3. **It creates a dangerous false positive**: Merchants who approve an AI-rewritten description may not notice that facts were invented. These facts then go live to customers.

4. **Within similar channel groups, descriptions don't change much**: A product on Jahez versus Hunger Station serves the same use case. The real differentiation is schema completeness and attribute coverage, not copywriting style.

---

## Platform Schema Differences

Different platforms do require different field structures:

- **Delivery apps** (Jahez, Hunger Station, Talabat): sizes, modifiers/add-ons, serving type, Arabic + English names and descriptions, allergens
- **Amazon SA**: search-optimized title, 5 bullet points, full description, backend keywords, structured attributes (brand, model, color, size)
- **Noon**: catalog title, highlights (short bullets), full description, specification table

But these differences are **schema translation problems**, not **creative rewriting problems**. The master product record is the same; the output format varies.

---

## Hallucination Risk in Catalog AI

Catalog data is factual. Unlike creative writing where plausibility is sufficient, a product listing that contains incorrect:
- Calorie counts → liability for the restaurant
- Allergen information → life-threatening for customers
- Technical specifications → returns and disputes for retailers
- Compatibility claims → damaged trust and negative reviews

A system that invents product facts to complete a listing is actively harmful, not just inaccurate. This is the central design constraint of CatalogPilot.
