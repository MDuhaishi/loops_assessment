import { z } from 'zod';
import { fieldEvidence, ProductStatusSchema } from './shared';

const SizeSchema = z.object({
  label: z.string(),
  priceSar: z.number().optional(),
  confidence: z.number().min(0).max(1),
  sourceRef: z.string().optional(),
});

const ModifierOptionSchema = z.object({
  label: z.string(),
  priceDeltaSar: z.number().optional(),
});

const ModifierSchema = z.object({
  name: z.string(),
  options: z.array(ModifierOptionSchema),
});

export const GeneratedListingSchema = z.object({
  titleAr: z.string(),
  titleEn: z.string(),
  descriptionAr: z.string(),
  descriptionEn: z.string(),
  shortDescriptionAr: z.string(),
  shortDescriptionEn: z.string(),
  allergenStatementAr: z.string().nullable().optional(),
  allergenStatementEn: z.string().nullable().optional(),
  factsUsed: z.array(z.string()),
  unsupportedFactsAdded: z.array(z.string()),
  remainingMissingFields: z.array(z.string()),
  explanation: z.array(z.object({ change: z.string(), reason: z.string() })),
});

export type GeneratedListing = z.infer<typeof GeneratedListingSchema>;

export const RestaurantProductSchema = z.object({
  id: z.string(),
  category: fieldEvidence(z.string()),
  nameAr: fieldEvidence(z.string()),
  nameEn: fieldEvidence(z.string()),
  descriptionAr: fieldEvidence(z.string()),
  descriptionEn: fieldEvidence(z.string()),
  basePriceSar: fieldEvidence(z.number()),
  sizes: z.array(SizeSchema),
  modifiers: z.array(ModifierSchema),
  ingredients: fieldEvidence(z.array(z.string())),
  toppings: fieldEvidence(z.array(z.string())),
  sauces: fieldEvidence(z.array(z.string())),
  allergens: fieldEvidence(z.array(z.string())),
  calories: fieldEvidence(z.number()),
  servingType: fieldEvidence(z.string()),
  imageUrl: fieldEvidence(z.string()).optional(),
  sourcePdf: z.string().optional(),
  extractionWarnings: z.array(z.string()),
  status: ProductStatusSchema,
  generatedListing: GeneratedListingSchema.optional(),
  merchantAnswers: z.record(z.string()).optional(),
});

export type RestaurantProduct = z.infer<typeof RestaurantProductSchema>;

export const RestaurantProductListSchema = z.array(RestaurantProductSchema);

export const MissingFieldQuestionSchema = z.object({
  field: z.string(),
  question: z.string(),
  hint: z.string().optional(),
  required: z.boolean(),
});

export type MissingFieldQuestion = z.infer<typeof MissingFieldQuestionSchema>;
