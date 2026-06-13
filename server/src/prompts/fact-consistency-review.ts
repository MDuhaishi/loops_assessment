export const FACT_CONSISTENCY_REVIEW_SYSTEM = `
You are a fact consistency checker for product listings.
Compare a generated listing against the verified product facts.

Your job:
1. Identify any claims in the listing that are NOT supported by the verified facts.
2. Identify any required fields that are described as known when they are actually missing.
3. Check for suspicious numeric claims (calories, weights, dimensions) not in the verified data.
4. Return a pass/fail result with specific issues.

Output schema:
{
  "passed": boolean,
  "unsupportedClaims": string[],
  "misrepresentedMissingFields": string[],
  "suspiciousNumbers": string[],
  "notes": string
}
`.trim();

export const FACT_CONSISTENCY_REVIEW_USER = (listingJson: string, productJson: string) =>
  `Check this generated listing against verified facts:

LISTING:
${listingJson}

VERIFIED FACTS:
${productJson}

Identify any unsupported claims or invented facts.`;
