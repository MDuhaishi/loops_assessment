export type EvidenceSource =
  | 'source_document'
  | 'scraped_page'
  | 'merchant_input'
  | 'ai_generated'
  | 'derived_rule';

export type ProductStatus = 'needs_review' | 'missing_details' | 'ready_to_generate' | 'approved';

export interface FieldEvidence<T> {
  value: T | null;
  confidence: number;
  source: EvidenceSource;
  sourceRef?: string;
  needsReview: boolean;
}

export interface GeneratedListing {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  allergenStatementAr?: string | null;
  allergenStatementEn?: string | null;
  factsUsed: string[];
  unsupportedFactsAdded: string[];
  remainingMissingFields: string[];
  explanation: Array<{ change: string; reason: string }>;
}

export interface RestaurantProduct {
  id: string;
  category: FieldEvidence<string>;
  nameAr: FieldEvidence<string>;
  nameEn: FieldEvidence<string>;
  descriptionAr: FieldEvidence<string>;
  descriptionEn: FieldEvidence<string>;
  basePriceSar: FieldEvidence<number>;
  sizes: Array<{ label: string; priceSar?: number; confidence: number; sourceRef?: string }>;
  modifiers: Array<{ name: string; options: Array<{ label: string; priceDeltaSar?: number }> }>;
  ingredients: FieldEvidence<string[]>;
  toppings: FieldEvidence<string[]>;
  sauces: FieldEvidence<string[]>;
  allergens: FieldEvidence<string[]>;
  calories: FieldEvidence<number>;
  servingType: FieldEvidence<string>;
  imageUrl?: FieldEvidence<string>;
  sourcePdf?: string;
  extractionWarnings: string[];
  status: ProductStatus;
  generatedListing?: GeneratedListing;
  merchantAnswers?: Record<string, string>;
}

export interface RetailGeneratedListing {
  amazon: {
    title: string;
    bullets: string[];
    description: string;
    searchKeywords: string[];
    attributes: Record<string, string>;
  };
  noon: {
    title: string;
    highlights: string[];
    description: string;
    specifications: Record<string, string>;
  };
  factsUsed: string[];
  unsupportedFactsAdded: string[];
  remainingMissingFields: string[];
  explanation: Array<{ change: string; reason: string }>;
}

export interface RetailProduct {
  id: string;
  asin: FieldEvidence<string>;
  sourceUrl: FieldEvidence<string>;
  title: FieldEvidence<string>;
  brand: FieldEvidence<string>;
  model: FieldEvidence<string>;
  category: FieldEvidence<string>;
  currentPriceSar: FieldEvidence<number>;
  originalPriceSar: FieldEvidence<number>;
  discountPercent: FieldEvidence<number>;
  imageUrls: FieldEvidence<string[]>;
  rating: FieldEvidence<number>;
  reviewCount: FieldEvidence<number>;
  color: FieldEvidence<string>;
  size: FieldEvidence<string>;
  material: FieldEvidence<string>;
  dimensions: FieldEvidence<string>;
  weight: FieldEvidence<string>;
  technicalSpecifications: FieldEvidence<Record<string, string>>;
  packageContents: FieldEvidence<string[]>;
  compatibility: FieldEvidence<string[]>;
  warranty: FieldEvidence<string>;
  countryOfOrigin: FieldEvidence<string>;
  searchKeywords: FieldEvidence<string[]>;
  badgeText?: string;
  extractionWarnings: string[];
  status: ProductStatus;
  generatedListing?: RetailGeneratedListing;
  merchantAnswers?: Record<string, string>;
}

export interface MissingFieldQuestion {
  field: string;
  question: string;
  hint?: string;
  required: boolean;
}

export interface ExtractionRun {
  id: string;
  sourceType: 'menu_pdf' | 'amazon_page';
  sourceName: string;
  startedAt: string;
  completedAt?: string;
  mode: 'live' | 'cached' | 'fixture';
  itemCount: number;
  warnings: string[];
  model?: string;
}

export interface AppMode {
  qwenAvailable: boolean;
  visionModel: string;
  textModel: string;
  pdfFound: boolean;
  pdfName: string | null;
  demoMode: boolean;
  recentRuns: ExtractionRun[];
}
