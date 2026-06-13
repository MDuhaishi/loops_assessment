# Loom Demo Script (3 minutes)

---

## [0:00–0:20] Explain the Problem

"Restaurants and retailers joining Loops often start with incomplete source data — image-based PDF menus, supplier documents, or existing marketplace pages. The standard AI approach — rewriting copy for different audiences — skips the harder problem: the product record itself is incomplete.

CatalogPilot's hypothesis is that the highest-value AI workflow is data completion before generation. Let me show you what that looks like."

---

## [0:20–0:50] Extract the Kudu Menu

**[Screen: Overview page]**
"Here's the dashboard. We have two workflows — Restaurant and Retail. Both show the same status: demo fixture mode, since I don't have an API key connected right now."

**[Click: Restaurant → Extract menu products]**
"The PDF is found in the assets folder. This triggers page rendering and Qwen Vision extraction."

*[If live: wait for extraction. If demo: show the status screen briefly and navigate to products.]*

"We see 15 products extracted. Note the summary: 0 approved, 0 ready to generate, and 15 with missing details. That's expected — allergens and calories are never on the menu."

---

## [0:50–1:20] Open an Incomplete Product

**[Click: Jalapeño Smash]**
"This is the Jalapeño Smash. Every field has a provenance badge — 'Found in PDF' — and a confidence percentage. Names and price: 95–97%. Ingredients: 87%. "

"But look: Allergens — Missing. Calories — Missing. These fields are null because they weren't in the source document. The system correctly refuses to guess."

**[Click: Load questions]**
"I trigger the missing-field assistant. It generates questions targeted to this specific product and category — not a generic form."

*[Type an answer, e.g., allergens: gluten, dairy, sesame]*
"I answer. The field updates with source: 'merchant_input' and the product moves from Missing Details to Ready to Generate."

---

## [1:20–1:50] Generate and Refine the Listing

**[Click: Generate listing]**
"Now I have verified facts. The listing generates — bilingual, English and Arabic. Every ingredient in this description is in the verified record. The 'unsupported facts added' array is empty."

**[Show description]**
"'The chicken crunch you love comes together with jalapeños and our signature Tabasco sauce. It's topped with a melted Pepper Jack cheese, fresh lettuce, onions, and a creamy tomato sauce, all served inside our pepper and corn bun.' All real. All sourced."

**[Type in refinement box: 'Make the Arabic more natural']**
"I can refine. Merchant-directed, but the facts stay."

**[Click: Approve]**
"Approved. This product is now ready to export."

---

## [1:50–2:20] Amazon Page Extraction and Fallback

**[Navigate to Retail]**
"Now retail. We're loading from the Amazon SA deals page."

**[Click: Extract products]**
"Playwright attempted a live scrape. Amazon blocked it — as it almost always does with automated access. The system is honest about this."

*[Show the banner: 'Demo fixture — Amazon blocked automated access']*
"We fall back to the demo fixture. You can see the banner clearly labeling this as demo data. The system never pretends a demo scrape was live."

**[Navigate to Retail Products]**
"8 products from the deals page. JBL headphones, Anker power bank, TP-Link router, Samsung SSD, and others. Each has a price, discount, rating, and extracted specs."

---

## [2:20–2:40] Generate a Marketplace Listing

**[Click: JBL Tune 510BT → Generate Amazon + Noon listings]**
"This product already has a demo listing. Let me regenerate."

"Amazon-style: keyword title, 5 structured bullet points, full description, search keywords. Every claim — '40-hour battery', 'Pure Bass' — is in the scraped technical specifications. Nothing invented."

*[Switch to Noon tab]*
"Same verified facts, different format. Catalog title, highlights, description, specification table."

"The fact check: zero unsupported claims added."

---

## [2:40–2:50] Show No-Hallucination Safeguard

**[Show the 'factsUsed' and 'unsupportedFactsAdded' fields in the listing view]**
"Every generated listing carries a record of which facts were used and — critically — which unsupported facts were added. That array must be empty before the merchant can approve."

"The system is allowed to improve expression. It is not allowed to invent the product."

---

## [2:50–3:00] Honest Failure + Next Step

"The real limitation here is allergens and calories. Kudu doesn't print them on the menu. The system correctly leaves them null. In production, I'd add an allergen inference layer — cross-reference extracted ingredients against a database — and present a draft to the merchant for confirmation rather than asking them to type it from memory."

"The Amazon scraping limitation is also real. A saved HTML snapshot or a residential proxy would unblock this for production use."

"Thank you."
