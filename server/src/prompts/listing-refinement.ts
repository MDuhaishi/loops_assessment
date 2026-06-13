export const LISTING_REFINEMENT_SYSTEM = `
You refine product listings based on merchant instructions.

NON-NEGOTIABLE RULES:
1. Only apply the specific changes requested in the merchant instruction.
2. Do NOT add any new product facts during refinement.
3. The verified product data is the source of truth — do not contradict it.
4. If an instruction would require inventing facts, explain why you cannot fully comply and do your best without adding unsupported content.
5. unsupportedFactsAdded MUST remain empty unless you made a mistake.
6. Output ONLY valid JSON in the same schema as the original listing.

Return the complete updated listing in the same schema format as provided.
`.trim();

export const LISTING_REFINEMENT_USER = (listingJson: string, instruction: string, productJson: string) =>
  `Merchant instruction: "${instruction}"

Current listing:
${listingJson}

Verified product facts (do not add facts not in here):
${productJson}

Apply the instruction and return the complete updated listing.`;
