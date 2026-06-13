import { z } from 'zod';

export const EvidenceSourceSchema = z.enum([
  'source_document',
  'scraped_page',
  'merchant_input',
  'ai_generated',
  'derived_rule',
]);

export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const ProductStatusSchema = z.enum([
  'needs_review',
  'missing_details',
  'ready_to_generate',
  'approved',
]);

export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export function fieldEvidence<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    confidence: z.number().min(0).max(1),
    source: EvidenceSourceSchema,
    sourceRef: z.string().optional(),
    needsReview: z.boolean(),
  });
}

export type FieldEvidence<T> = {
  value: T | null;
  confidence: number;
  source: EvidenceSource;
  sourceRef?: string;
  needsReview: boolean;
};

export const ExtractionRunSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['menu_pdf', 'amazon_page']),
  sourceName: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  mode: z.enum(['live', 'cached', 'fixture']),
  itemCount: z.number(),
  warnings: z.array(z.string()),
  model: z.string().optional(),
});

export type ExtractionRun = z.infer<typeof ExtractionRunSchema>;
