import type { RestaurantProduct } from '../schemas/restaurant';
import type { RetailProduct } from '../schemas/retail';
import type { FieldEvidence, ProductStatus } from '../schemas/shared';

export function fe<T>(
  value: T | null,
  confidence: number,
  source: FieldEvidence<T>['source'],
  sourceRef?: string,
): FieldEvidence<T> {
  return {
    value,
    confidence,
    source,
    sourceRef,
    needsReview: confidence < 0.85,
  };
}

export function parsePriceSar(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\d.,]/g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function calculateDiscountPercent(
  original: number | null,
  current: number | null,
): number | null {
  if (!original || !current || original <= 0) return null;
  return Math.round(((original - current) / original) * 100);
}

export function isHighConfidence(confidence: number): boolean {
  return confidence >= 0.85;
}

export function needsReview(confidence: number): boolean {
  return confidence < 0.85;
}

const REQUIRED_RESTAURANT_FIELDS: (keyof RestaurantProduct)[] = [
  'nameEn',
  'nameAr',
  'category',
  'basePriceSar',
  'descriptionEn',
  'descriptionAr',
];

const IMPORTANT_RESTAURANT_FIELDS: (keyof RestaurantProduct)[] = [
  'ingredients',
  'allergens',
  'calories',
];

export function getMissingRestaurantFields(product: RestaurantProduct): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_RESTAURANT_FIELDS) {
    const ev = product[field] as FieldEvidence<unknown> | undefined;
    if (!ev || ev.value === null) missing.push(field);
  }
  for (const field of IMPORTANT_RESTAURANT_FIELDS) {
    const ev = product[field] as FieldEvidence<unknown> | undefined;
    if (!ev || ev.value === null) missing.push(field);
  }
  return missing;
}

export function computeRestaurantStatus(product: RestaurantProduct): ProductStatus {
  if (product.status === 'approved') return 'approved';
  const missing = getMissingRestaurantFields(product);
  const requiredMissing = REQUIRED_RESTAURANT_FIELDS.filter(
    (f) => {
      const ev = product[f] as FieldEvidence<unknown> | undefined;
      return !ev || ev.value === null;
    },
  );
  if (requiredMissing.length > 0) return 'needs_review';
  if (missing.length > 0) return 'missing_details';
  return 'ready_to_generate';
}

const REQUIRED_RETAIL_FIELDS: (keyof RetailProduct)[] = [
  'title',
  'brand',
  'category',
  'currentPriceSar',
];

const IMPORTANT_RETAIL_FIELDS: (keyof RetailProduct)[] = [
  'model',
  'color',
  'warranty',
  'packageContents',
];

export function getMissingRetailFields(product: RetailProduct): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_RETAIL_FIELDS) {
    const ev = product[field] as FieldEvidence<unknown> | undefined;
    if (!ev || ev.value === null) missing.push(field);
  }
  for (const field of IMPORTANT_RETAIL_FIELDS) {
    const ev = product[field] as FieldEvidence<unknown> | undefined;
    if (!ev || ev.value === null) missing.push(field);
  }
  return missing;
}

export function computeRetailStatus(product: RetailProduct): ProductStatus {
  if (product.status === 'approved') return 'approved';
  const requiredMissing = REQUIRED_RETAIL_FIELDS.filter((f) => {
    const ev = product[f] as FieldEvidence<unknown> | undefined;
    return !ev || ev.value === null;
  });
  if (requiredMissing.length > 0) return 'needs_review';
  const importantMissing = getMissingRetailFields(product);
  if (importantMissing.length > 0) return 'missing_details';
  return 'ready_to_generate';
}

export function deduplicateByAsin<T extends { asin: FieldEvidence<string> }>(
  products: T[],
): T[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const asin = p.asin.value;
    if (!asin) return true;
    if (seen.has(asin)) return false;
    seen.add(asin);
    return true;
  });
}

export function countLowConfidence(fields: FieldEvidence<unknown>[]): number {
  return fields.filter((f) => f.confidence < 0.6).length;
}

export function validateGeneratedListingFacts(
  generated: { descriptionEn: string; unsupportedFactsAdded: string[] },
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const suspiciousPatterns = [
    /\d+\s*(cal|kcal|calories)/i,
    /\d+\s*(mg|g|kg|ml|oz)\b/i,
    /\d+%\s*(fat|protein|carb)/i,
  ];
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(generated.descriptionEn)) {
      issues.push(`Possible unsupported numeric claim detected: ${pattern}`);
    }
  }
  if (generated.unsupportedFactsAdded.length > 0) {
    issues.push(`Unsupported facts were added: ${generated.unsupportedFactsAdded.join(', ')}`);
  }
  return { valid: issues.length === 0, issues };
}

export function formatCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(',');
}

export function getRestaurantCsvRows(products: RestaurantProduct[]): string[] {
  const header = formatCsvRow([
    'id', 'status', 'nameEn', 'nameAr', 'category', 'basePriceSar',
    'descriptionEn', 'descriptionAr', 'allergens', 'calories',
    'titleEn', 'titleAr',
  ]);
  const rows = products.map((p) =>
    formatCsvRow([
      p.id,
      p.status,
      p.nameEn.value,
      p.nameAr.value,
      p.category.value,
      p.basePriceSar.value,
      p.generatedListing?.descriptionEn ?? p.descriptionEn.value,
      p.generatedListing?.descriptionAr ?? p.descriptionAr.value,
      p.allergens.value?.join('; ') ?? '',
      p.calories.value,
      p.generatedListing?.titleEn ?? '',
      p.generatedListing?.titleAr ?? '',
    ]),
  );
  return [header, ...rows];
}

export function getRetailCsvRows(products: RetailProduct[]): string[] {
  const header = formatCsvRow([
    'id', 'status', 'asin', 'title', 'brand', 'category',
    'currentPriceSar', 'originalPriceSar', 'discountPercent',
    'rating', 'reviewCount', 'amazonTitle', 'bullets',
  ]);
  const rows = products.map((p) =>
    formatCsvRow([
      p.id,
      p.status,
      p.asin.value,
      p.title.value,
      p.brand.value,
      p.category.value,
      p.currentPriceSar.value,
      p.originalPriceSar.value,
      p.discountPercent.value,
      p.rating.value,
      p.reviewCount.value,
      p.generatedListing?.amazon.title ?? '',
      p.generatedListing?.amazon.bullets.join(' | ') ?? '',
    ]),
  );
  return [header, ...rows];
}
