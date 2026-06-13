import { z } from 'zod';
import { fieldEvidence, ProductStatusSchema } from './shared';

export const RetailGeneratedListingSchema = z.object({
  amazon: z.object({
    title: z.string(),
    bullets: z.array(z.string()),
    description: z.string(),
    searchKeywords: z.array(z.string()),
    attributes: z.record(z.string()),
  }),
  noon: z.object({
    title: z.string(),
    highlights: z.array(z.string()),
    description: z.string(),
    specifications: z.record(z.string()),
  }),
  factsUsed: z.array(z.string()),
  unsupportedFactsAdded: z.array(z.string()),
  remainingMissingFields: z.array(z.string()),
  explanation: z.array(z.object({ change: z.string(), reason: z.string() })),
});

export type RetailGeneratedListing = z.infer<typeof RetailGeneratedListingSchema>;

export const RetailProductSchema = z.object({
  id: z.string(),
  asin: fieldEvidence(z.string()),
  sourceUrl: fieldEvidence(z.string()),
  title: fieldEvidence(z.string()),
  brand: fieldEvidence(z.string()),
  model: fieldEvidence(z.string()),
  category: fieldEvidence(z.string()),
  currentPriceSar: fieldEvidence(z.number()),
  originalPriceSar: fieldEvidence(z.number()),
  discountPercent: fieldEvidence(z.number()),
  imageUrls: fieldEvidence(z.array(z.string())),
  rating: fieldEvidence(z.number()),
  reviewCount: fieldEvidence(z.number()),
  color: fieldEvidence(z.string()),
  size: fieldEvidence(z.string()),
  material: fieldEvidence(z.string()),
  dimensions: fieldEvidence(z.string()),
  weight: fieldEvidence(z.string()),
  technicalSpecifications: fieldEvidence(z.record(z.string())),
  packageContents: fieldEvidence(z.array(z.string())),
  compatibility: fieldEvidence(z.array(z.string())),
  warranty: fieldEvidence(z.string()),
  countryOfOrigin: fieldEvidence(z.string()),
  searchKeywords: fieldEvidence(z.array(z.string())),
  badgeText: z.string().optional(),
  extractionWarnings: z.array(z.string()),
  status: ProductStatusSchema,
  generatedListing: RetailGeneratedListingSchema.optional(),
  merchantAnswers: z.record(z.string()).optional(),
});

export type RetailProduct = z.infer<typeof RetailProductSchema>;

export const RetailProductListSchema = z.array(RetailProductSchema);
