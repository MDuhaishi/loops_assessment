import { Router } from 'express';
import { z } from 'zod';
import {
  getRetailProducts,
  getRetailProductById,
  saveRetailProducts,
  updateRetailProduct,
  addExtractionRun,
  completeExtractionRun,
  isRetailLiveData,
} from '../services/dataStore';
import { extractAmazonProducts } from '../services/amazonScraper';
import { isQwenAvailable, runTextCompletion } from '../services/qwen';
import { computeRetailStatus, getMissingRetailFields } from '../utils/deterministic';
import {
  MISSING_FIELD_QUESTIONS_SYSTEM,
  MISSING_FIELD_QUESTIONS_RETAIL_USER,
} from '../prompts/missing-field-questions';
import {
  RETAIL_LISTING_GENERATION_SYSTEM,
  RETAIL_LISTING_GENERATION_USER,
} from '../prompts/retail-listing-generation';
import {
  LISTING_REFINEMENT_SYSTEM,
  LISTING_REFINEMENT_USER,
} from '../prompts/listing-refinement';
import { RetailGeneratedListingSchema } from '../schemas/retail';
import type { RetailProduct } from '../schemas/retail';

const router = Router();

const QuestionsSchema = z.object({
  questions: z.array(
    z.object({
      field: z.string(),
      question: z.string(),
      hint: z.string().optional(),
      required: z.boolean(),
    }),
  ),
});

// GET /api/retail/status
router.get('/status', (_req, res) => {
  const products = getRetailProducts();
  const isLive = isRetailLiveData();
  res.json({
    productCount: products.length,
    isLive,
    mode: isLive ? 'live' : 'demo',
    qwenAvailable: isQwenAvailable(),
  });
});

// POST /api/retail/extract
router.post('/extract', async (_req, res) => {
  const run = addExtractionRun({
    sourceType: 'amazon_page',
    sourceName: 'Amazon SA Deals Page',
    startedAt: new Date().toISOString(),
    mode: 'live',
    itemCount: 0,
    warnings: [],
  });

  const logs: string[] = [];
  try {
    const result = await extractAmazonProducts((msg) => {
      logs.push(msg);
      console.log('[retail extract]', msg);
    });

    if (result.products.length > 0) {
      saveRetailProducts(result.products);
    }

    completeExtractionRun(run.id, {
      completedAt: new Date().toISOString(),
      mode: result.mode,
      itemCount: result.products.length,
      warnings: result.warnings,
    });

    res.json({
      success: true,
      mode: result.mode,
      productCount: result.products.length,
      warnings: result.warnings,
      logs,
      runId: run.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    completeExtractionRun(run.id, {
      completedAt: new Date().toISOString(),
      mode: 'fixture',
      itemCount: 0,
      warnings: [msg],
    });
    res.status(500).json({ success: false, error: msg, logs });
  }
});

// GET /api/retail/products
router.get('/products', (_req, res) => {
  const products = getRetailProducts();
  const isLive = isRetailLiveData();
  res.json({ products, isLive, mode: isLive ? 'live' : 'demo' });
});

// GET /api/retail/products/:id
router.get('/products/:id', (req, res) => {
  const product = getRetailProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({ product });
});

// PATCH /api/retail/products/:id
router.patch('/products/:id', (req, res) => {
  const updated = updateRetailProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  const withStatus = { ...updated, status: computeRetailStatus(updated) };
  updateRetailProduct(req.params.id, { status: withStatus.status });
  return res.json({ product: withStatus });
});

// POST /api/retail/products/:id/questions
router.post('/products/:id/questions', async (req, res) => {
  const product = getRetailProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const missingFields = getMissingRetailFields(product);

  if (!isQwenAvailable()) {
    const demoQuestions = missingFields.map((f) => ({
      field: f,
      question: `What is the ${f.replace(/([A-Z])/g, ' $1').toLowerCase()} for "${product.title.value ?? 'this product'}"?`,
      hint: undefined,
      required: ['title', 'brand', 'category', 'currentPriceSar'].includes(f),
    }));
    return res.json({ questions: demoQuestions, mode: 'demo' });
  }

  try {
    const productSummary = {
      title: product.title.value,
      brand: product.brand.value,
      category: product.category.value,
      model: product.model.value,
      color: product.color.value,
      warranty: product.warranty.value,
      packageContents: product.packageContents.value,
      missingFields,
    };
    const result = await runTextCompletion(
      QuestionsSchema,
      MISSING_FIELD_QUESTIONS_SYSTEM,
      MISSING_FIELD_QUESTIONS_RETAIL_USER(JSON.stringify(productSummary, null, 2)),
    );
    return res.json({ questions: result.questions, mode: 'live' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/retail/products/:id/generate
router.post('/products/:id/generate', async (req, res) => {
  const product = getRetailProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (!isQwenAvailable()) {
    const demoListing = {
      amazon: {
        title: product.title.value ?? 'Product',
        bullets: [
          product.brand.value ? `Brand: ${product.brand.value}` : 'Quality Product',
          product.category.value ? `Category: ${product.category.value}` : 'Great Value',
          product.currentPriceSar.value ? `Price: SAR ${product.currentPriceSar.value}` : 'Competitive Price',
          product.rating.value ? `Rating: ${product.rating.value}/5 stars` : 'Customer Approved',
          'Demo mode — connect Qwen API for AI-generated listings',
        ],
        description: `${product.title.value ?? 'Product'} - ${product.brand.value ?? 'Quality Brand'}.`,
        searchKeywords: [product.brand.value ?? '', product.category.value ?? ''].filter(Boolean),
        attributes: {
          brand: product.brand.value ?? '',
          category: product.category.value ?? '',
        },
      },
      noon: {
        title: product.title.value ?? 'Product',
        highlights: [
          product.brand.value ? `Brand: ${product.brand.value}` : 'Quality Product',
          product.currentPriceSar.value ? `SAR ${product.currentPriceSar.value}` : 'Great Price',
          'Demo mode',
        ],
        description: `${product.title.value ?? 'Product'}.`,
        specifications: {
          brand: product.brand.value ?? '',
          category: product.category.value ?? '',
        },
      },
      factsUsed: ['title', 'brand', 'category', 'currentPriceSar', 'rating'],
      unsupportedFactsAdded: [],
      remainingMissingFields: getMissingRetailFields(product),
      explanation: [{ change: 'Demo mode', reason: 'No API key available.' }],
    };
    const updated = updateRetailProduct(req.params.id, { generatedListing: demoListing });
    return res.json({ listing: demoListing, product: updated, mode: 'demo' });
  }

  try {
    const productForGen = {
      title: product.title.value,
      brand: product.brand.value,
      model: product.model.value,
      category: product.category.value,
      currentPriceSar: product.currentPriceSar.value,
      originalPriceSar: product.originalPriceSar.value,
      discountPercent: product.discountPercent.value,
      color: product.color.value,
      size: product.size.value,
      material: product.material.value,
      dimensions: product.dimensions.value,
      weight: product.weight.value,
      warranty: product.warranty.value,
      packageContents: product.packageContents.value,
      compatibility: product.compatibility.value,
      technicalSpecifications: product.technicalSpecifications.value,
      merchantAnswers: product.merchantAnswers,
    };

    const listing = await runTextCompletion(
      RetailGeneratedListingSchema,
      RETAIL_LISTING_GENERATION_SYSTEM,
      RETAIL_LISTING_GENERATION_USER(JSON.stringify(productForGen, null, 2)),
      0.3,
    );

    const updated = updateRetailProduct(req.params.id, {
      generatedListing: listing,
      status: 'ready_to_generate',
    });

    return res.json({ listing, product: updated, mode: 'live' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/retail/products/:id/refine
router.post('/products/:id/refine', async (req, res) => {
  const { instruction } = req.body as { instruction: string };
  if (!instruction) return res.status(400).json({ error: 'instruction is required' });

  const product = getRetailProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!product.generatedListing) return res.status(400).json({ error: 'No generated listing to refine' });

  if (!isQwenAvailable()) {
    return res.status(503).json({ error: 'Refinement requires QWEN_API_KEY' });
  }

  try {
    const refined = await runTextCompletion(
      RetailGeneratedListingSchema,
      LISTING_REFINEMENT_SYSTEM,
      LISTING_REFINEMENT_USER(
        JSON.stringify(product.generatedListing),
        instruction,
        JSON.stringify({ title: product.title.value, brand: product.brand.value }),
      ),
      0.4,
    );

    const updated = updateRetailProduct(req.params.id, { generatedListing: refined });
    return res.json({ listing: refined, product: updated });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/retail/products/:id/approve
router.post('/products/:id/approve', (req, res) => {
  const product = getRetailProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const updated = updateRetailProduct(req.params.id, { status: 'approved' });
  return res.json({ product: updated });
});

export default router;
