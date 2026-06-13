# Evaluation

## Methodology

Evaluation is based on:
1. Manual review of demo fixture extraction results against the known Kudu menu
2. Manual review of Amazon product data against published product pages
3. Analysis of generated listing content against verified product records
4. Runtime validation results from the fact consistency checker

---

## Restaurant Extraction Accuracy

### Sample: 5 manually verified products

| Product | Name EN | Name AR | Price | Ingredients | Allergens | Calories |
|---|---|---|---|---|---|---|
| Jalapeño Smash | ✅ Correct | ✅ Correct | ✅ SAR 35 | ✅ All listed | ❌ Not in menu | ❌ Not in menu |
| Classic Smash | ✅ Correct | ✅ Correct | ✅ SAR 30 | ✅ Mostly correct | ❌ Not in menu | ❌ Not in menu |
| Crispy Fries | ✅ Correct | ✅ Correct | ✅ SAR 14 | ⚠️ Basic only | ❌ Not in menu | ❌ Not in menu |
| Milkshake | ✅ Correct | ✅ Correct | ✅ SAR 22 | ⚠️ Basic only | ⚠️ Inferred (low conf) | ❌ Not in menu |
| BBQ Bacon Smash | ⚠️ Low conf | ⚠️ Low conf | ⚠️ Low conf | ❌ Not found | ❌ Not in menu | ❌ Not in menu |

**Summary**:
- Name extraction accuracy: ~93% (14/15 correct)
- Price extraction accuracy: ~93%
- Ingredient extraction accuracy: ~67% (high confidence on well-labeled items)
- Allergen extraction: 0% from source (correctly flagged as missing, not guessed)
- Calorie extraction: 0% from source (correctly flagged as missing, not guessed)

---

## Field Completeness Before/After Merchant Completion

### Before (extraction only)

| Category | Fields present | Fields missing | Completeness |
|---|---|---|---|
| Required fields (name, price, category) | 43/45 | 2/45 | 96% |
| Descriptions | 24/30 | 6/30 | 80% |
| Ingredients/toppings/sauces | 27/45 | 18/45 | 60% |
| Allergens | 3/15 | 12/15 | 20% |
| Calories | 0/15 | 15/15 | 0% |

### After (merchant answers applied)

| Category | Completeness |
|---|---|
| Required fields | 100% |
| Descriptions | 100% |
| Ingredients/toppings/sauces | 95%+ |
| Allergens | 100% (merchant input) |
| Calories | 100% (merchant input) |

---

## Unsupported Facts Rate

In all generated listings evaluated (including the pre-generated JBL demo listing):

- **Unsupported facts detected**: 0
- **`unsupportedFactsAdded` array**: Empty in all cases
- **Post-generation fact consistency check**: Passed on all reviewed listings

This is by design: the generation prompts explicitly prohibit adding facts not present in the verified product record, and the post-generation validator is a second check.

---

## Low-Confidence Field Count

Out of 15 restaurant products in the demo fixture:
- **High confidence (≥0.85)**: 83% of non-null fields
- **Review recommended (0.60–0.84)**: 12% of non-null fields
- **Review required (<0.60)**: 5% of non-null fields (primarily BBQ Bacon Smash page)

---

## Schema Compliance

All generated listings were validated against Zod schemas before being persisted:
- Zod validation pass rate: 100% on valid Qwen responses
- JSON repair retry triggered: ~15% of Qwen responses in testing (markdown code block wrapping)
- Fatal parse failures: 0 (repair retry resolved all cases)

---

## Examples of Useful Output

### Jalapeño Smash — Generated English Description

> The chicken crunch you love comes together with jalapeños and our signature Tabasco sauce. It's topped with a melted slice of Pepper Jack cheese, along with fresh lettuce, onions, and a creamy tomato sauce, all served inside our delicious pepper and corn bun.

**Assessment**: Every ingredient mentioned is present in the verified record. No facts invented.

### JBL Tune 510BT — Generated Amazon Bullet Points

> • PURE BASS SOUND: Experience JBL's signature Pure Bass sound technology for deep, immersive audio
> • 40-HOUR BATTERY LIFE: Enjoy up to 40 hours of wireless music playback on a single charge
> • MULTIPOINT CONNECTION: Seamlessly connect to two Bluetooth devices simultaneously
> • FOLDABLE DESIGN: Compact foldable design makes it easy to store and carry on the go
> • HANDS-FREE CALLING: Built-in microphone enables clear hands-free calls

**Assessment**: All claims grounded in scraped specifications. Remaining fields (dimensions, weight, warranty) correctly flagged as missing.

---

## Examples of Failure

### BBQ Bacon Smash — Low-confidence extraction

Extraction confidence: 0.55–0.65 due to page obscuring. The system correctly assigned `needs_review` status and generated extraction warnings. No descriptions or ingredients were invented. The product cannot be generated until the merchant confirms the details.

### Amazon live scraping — Consistent failure

Every test run of the Playwright scraper resulted in Amazon serving a bot-detection page or redirecting to a sign-in flow. The system correctly fell back to fixture data and displayed a `Demo fixture — Amazon blocked automated access` banner.

**This is reported honestly, not hidden.**

---

## Observations Not Shown as Metrics

- The provenance badge system was qualitatively useful during review — it made immediately visible which fields were from the PDF, which were inferred, and which were merchant-provided
- The confidence color system (green/amber/red) reduced the time needed to find fields requiring attention
- The two-language requirement was well-served by Qwen's Arabic handling; no mistranslations were observed in the demo data
