import { describe, it, expect } from 'vitest';
import {
  parsePriceSar,
  calculateDiscountPercent,
  getMissingRestaurantFields,
  computeRestaurantStatus,
  getMissingRetailFields,
  computeRetailStatus,
  deduplicateByAsin,
  validateGeneratedListingFacts,
  formatCsvRow,
  fe,
} from '../utils/deterministic';
import type { RestaurantProduct } from '../schemas/restaurant';
import type { RetailProduct } from '../schemas/retail';

// ─── Price parsing ────────────────────────────────────────────────────────────

describe('parsePriceSar', () => {
  it('parses plain SAR strings', () => {
    expect(parsePriceSar('SAR 49.99')).toBe(49.99);
    expect(parsePriceSar('49.99')).toBe(49.99);
  });

  it('handles comma decimal separator', () => {
    expect(parsePriceSar('49,99')).toBe(49.99);
  });

  it('returns null for empty or null input', () => {
    expect(parsePriceSar(null)).toBeNull();
    expect(parsePriceSar('')).toBeNull();
    expect(parsePriceSar(undefined)).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parsePriceSar('N/A')).toBeNull();
  });
});

// ─── Discount calculation ─────────────────────────────────────────────────────

describe('calculateDiscountPercent', () => {
  it('calculates correct discount', () => {
    expect(calculateDiscountPercent(200, 150)).toBe(25);
    expect(calculateDiscountPercent(100, 80)).toBe(20);
  });

  it('returns null for null inputs', () => {
    expect(calculateDiscountPercent(null, 50)).toBeNull();
    expect(calculateDiscountPercent(50, null)).toBeNull();
  });

  it('returns null when original is zero', () => {
    expect(calculateDiscountPercent(0, 0)).toBeNull();
  });

  it('rounds to nearest integer', () => {
    expect(calculateDiscountPercent(150, 100)).toBe(33);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMinimalRestaurantProduct(overrides: Partial<RestaurantProduct> = {}): RestaurantProduct {
  return {
    id: 'test-001',
    category: fe('Burgers', 0.9, 'source_document'),
    nameAr: fe('برجر', 0.9, 'source_document'),
    nameEn: fe('Burger', 0.9, 'source_document'),
    descriptionAr: fe('وصف', 0.85, 'source_document'),
    descriptionEn: fe('Description', 0.85, 'source_document'),
    basePriceSar: fe(30, 0.95, 'source_document'),
    sizes: [],
    modifiers: [],
    ingredients: fe(['beef', 'cheese'], 0.8, 'source_document'),
    toppings: fe(['lettuce'], 0.8, 'source_document'),
    sauces: fe(['special sauce'], 0.8, 'source_document'),
    allergens: fe(null, 0, 'source_document'),
    calories: fe(null, 0, 'source_document'),
    servingType: fe('burger', 0.9, 'source_document'),
    extractionWarnings: [],
    status: 'missing_details',
    ...overrides,
  };
}

// ─── Missing field detection ──────────────────────────────────────────────────

describe('getMissingRestaurantFields', () => {
  it('detects missing allergens and calories', () => {
    const product = makeMinimalRestaurantProduct();
    const missing = getMissingRestaurantFields(product);
    expect(missing).toContain('allergens');
    expect(missing).toContain('calories');
  });

  it('returns empty array when all fields present', () => {
    const product = makeMinimalRestaurantProduct({
      allergens: fe([], 0.9, 'source_document'),
      calories: fe(450, 0.9, 'source_document'),
    });
    const missing = getMissingRestaurantFields(product);
    expect(missing).toHaveLength(0);
  });

  it('detects missing required name', () => {
    const product = makeMinimalRestaurantProduct({
      nameEn: fe(null, 0, 'source_document'),
    });
    const missing = getMissingRestaurantFields(product);
    expect(missing).toContain('nameEn');
  });
});

// ─── Status calculation ───────────────────────────────────────────────────────

describe('computeRestaurantStatus', () => {
  it('returns needs_review when name is missing', () => {
    const product = makeMinimalRestaurantProduct({
      nameEn: fe(null, 0, 'source_document'),
    });
    expect(computeRestaurantStatus(product)).toBe('needs_review');
  });

  it('returns missing_details when allergens are null', () => {
    const product = makeMinimalRestaurantProduct();
    expect(computeRestaurantStatus(product)).toBe('missing_details');
  });

  it('returns ready_to_generate when all fields present', () => {
    const product = makeMinimalRestaurantProduct({
      allergens: fe([], 0.9, 'source_document'),
      calories: fe(450, 0.9, 'source_document'),
    });
    expect(computeRestaurantStatus(product)).toBe('ready_to_generate');
  });

  it('preserves approved status', () => {
    const product = makeMinimalRestaurantProduct({ status: 'approved' });
    expect(computeRestaurantStatus(product)).toBe('approved');
  });
});

// ─── Retail deduplication ─────────────────────────────────────────────────────

describe('deduplicateByAsin', () => {
  it('removes duplicate ASINs', () => {
    const products = [
      { id: '1', asin: fe('B001', 0.9, 'scraped_page' as const) },
      { id: '2', asin: fe('B001', 0.9, 'scraped_page' as const) },
      { id: '3', asin: fe('B002', 0.9, 'scraped_page' as const) },
    ];
    const result = deduplicateByAsin(products as unknown as RetailProduct[]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('keeps products with null ASIN', () => {
    const products = [
      { id: '1', asin: fe(null, 0, 'scraped_page' as const) },
      { id: '2', asin: fe(null, 0, 'scraped_page' as const) },
    ];
    const result = deduplicateByAsin(products as unknown as RetailProduct[]);
    expect(result).toHaveLength(2);
  });
});

// ─── Listing validation ───────────────────────────────────────────────────────

describe('validateGeneratedListingFacts', () => {
  it('passes a clean listing', () => {
    const result = validateGeneratedListingFacts({
      descriptionEn: 'A delicious burger with cheese and lettuce.',
      unsupportedFactsAdded: [],
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags unsupported facts added', () => {
    const result = validateGeneratedListingFacts({
      descriptionEn: 'A delicious burger.',
      unsupportedFactsAdded: ['invented calories: 650 kcal'],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('flags suspicious calorie claims', () => {
    const result = validateGeneratedListingFacts({
      descriptionEn: 'Only 450 calories per serving.',
      unsupportedFactsAdded: [],
    });
    expect(result.valid).toBe(false);
  });
});

// ─── CSV formatting ───────────────────────────────────────────────────────────

describe('formatCsvRow', () => {
  it('formats a simple row', () => {
    expect(formatCsvRow(['id', 'name', 30])).toBe('id,name,30');
  });

  it('wraps values with commas in quotes', () => {
    expect(formatCsvRow(['hello, world'])).toBe('"hello, world"');
  });

  it('escapes inner quotes', () => {
    expect(formatCsvRow(['say "hello"'])).toBe('"say ""hello"""');
  });

  it('handles null as empty', () => {
    expect(formatCsvRow([null, undefined, ''])).toBe(',,');
  });
});
