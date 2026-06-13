# Solution Landscape

## Approaches Compared

### 1. Generic LLM Copy Rewriting

**Description**: Pass an existing product description to an LLM and ask it to rewrite for a specific platform, audience, or tone.

**Strengths**:
- Simple to implement
- Works well when source data is complete and accurate
- Fast iteration on copy style

**Weaknesses**:
- Assumes the source description is complete and factually correct
- LLMs will confidently add plausible-sounding but invented details
- No mechanism to distinguish source-verified facts from generation artifacts
- Produces cosmetically different output from the same underlying data
- Does not address the structural data completeness problem

**Verdict**: Useful as a final polish step, not as an extraction or completion strategy.

---

### 2. Deterministic Schema Mapping

**Description**: Define field mappings between source formats and target platform schemas. Use rule-based transformations.

**Strengths**:
- Fully deterministic, auditable
- Zero hallucination risk
- Fast at scale
- Works well when source data is well-structured

**Weaknesses**:
- Cannot handle unstructured sources (image-based PDFs, inconsistent spreadsheets)
- Does not fill gaps — fields absent in source remain absent in output
- Requires significant schema engineering per source format
- Cannot generate human-readable descriptions from structured data alone

**Verdict**: Essential as a component (used here for price parsing, discount calculation, deduplication, status computation) but insufficient alone.

---

### 3. Multimodal Document Extraction

**Description**: Use vision models to extract structured data from image-based documents. Map extracted data to a schema.

**Strengths**:
- Handles image-based PDFs, scanned documents, and visual layouts
- Preserves bilingual content accurately
- Can extract prices, descriptions, and layout context simultaneously
- Confidence scores reflect actual visual clarity

**Weaknesses**:
- Only extracts what is visibly present — cannot add what is missing
- Requires post-extraction normalization and validation
- Confidence calibration varies by model
- Multiple-page documents require batch processing

**Verdict**: Critical for the restaurant use case. This is the first step, not the full solution.

---

### 4. AI Clarification Assistant (Targeted Merchant Questions)

**Description**: After extraction, analyze the resulting record for missing or low-confidence fields. Generate targeted questions and allow the merchant to provide answers with `merchant_input` provenance.

**Strengths**:
- Gets information that cannot be inferred from any source
- Only asks for what is genuinely unknown (category-aware)
- Merchant answers are authoritative and traceable
- Closes the completeness gap without hallucination

**Weaknesses**:
- Requires merchant time and attention
- Question quality depends on how well missing fields are detected
- Cannot be automated — requires human judgment

**Verdict**: Essential component. This is what makes the difference between a 70%-complete catalog and a 95%-complete catalog.

---

### 5. Performance-Driven Optimization Using Merchant Conversion Data

**Description**: Use historical conversion rates, click-through data, and A/B test results to optimize listing content for performance.

**Strengths**:
- Directly optimizes for business outcomes
- Can identify which attributes drive conversion for specific categories
- Data-driven, not guess-driven

**Weaknesses**:
- Requires significant historical data (not available for new merchants)
- Conversion is influenced by price, position, and reviews — not just content
- Risk of overfitting to one platform's algorithm at the expense of another
- Does not solve the data completeness problem

**Verdict**: A next-layer optimization for established merchants. Not the right starting point.

---

## Why This Prototype Chooses: Multimodal Extraction + Structured Master Catalog + Targeted Clarification + Constrained Generation

The combination addresses the full lifecycle:

1. **Multimodal extraction** handles what AI can do reliably: read images, extract visible text, output structured JSON with confidence scores.

2. **Structured master catalog** creates a single source of truth with provenance for every field. This is the foundation that makes everything else trustworthy.

3. **Targeted clarification** fills the gaps that extraction cannot. It asks only the questions that need asking — not a generic form.

4. **Constrained generation** uses the verified master record to produce platform-ready copy. The constraint that *only verified facts may be expressed* is the core safety mechanism.

The system is allowed to improve expression, but it is not allowed to invent the product.

This approach is not more complex than generic rewriting — it is more useful because it addresses the actual problem merchants face rather than a simplified version of it.
