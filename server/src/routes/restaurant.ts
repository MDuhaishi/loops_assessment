import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  getRestaurantProducts,
  getRestaurantProductById,
  saveRestaurantProducts,
  updateRestaurantProduct,
  addExtractionRun,
  completeExtractionRun,
  isRestaurantLiveData,
} from '../services/dataStore';
import { extractMenuProducts, findMenuPdf } from '../services/pdfExtractor';
import { isQwenAvailable, runTextCompletion } from '../services/qwen';
import { computeRestaurantStatus, getMissingRestaurantFields } from '../utils/deterministic';
import {
  MISSING_FIELD_QUESTIONS_SYSTEM,
  MISSING_FIELD_QUESTIONS_RESTAURANT_USER,
} from '../prompts/missing-field-questions';
import {
  RESTAURANT_LISTING_GENERATION_SYSTEM,
  RESTAURANT_LISTING_GENERATION_USER,
} from '../prompts/restaurant-listing-generation';
import {
  LISTING_REFINEMENT_SYSTEM,
  LISTING_REFINEMENT_USER,
} from '../prompts/listing-refinement';
import {
  FACT_CONSISTENCY_REVIEW_SYSTEM,
  FACT_CONSISTENCY_REVIEW_USER,
} from '../prompts/fact-consistency-review';
import { GeneratedListingSchema } from '../schemas/restaurant';
import type { RestaurantProduct } from '../schemas/restaurant';
import type { MissingFieldQuestion } from '../schemas/restaurant';

const router = Router();

const ASSETS_DIR = path.resolve(__dirname, '../../../assets');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ASSETS_DIR),
    filename: (_req, file, cb) => cb(null, file.originalname),
  }),
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});

// GET /api/restaurant/pdfs
router.get('/pdfs', (_req, res) => {
  const files = fs.existsSync(ASSETS_DIR)
    ? fs.readdirSync(ASSETS_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'))
    : [];
  res.json({ pdfs: files });
});

// POST /api/restaurant/pdfs/upload
router.post('/pdfs/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file received' });
  res.json({ filename: req.file.filename });
});

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

const ConsistencySchema = z.object({
  passed: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  misrepresentedMissingFields: z.array(z.string()),
  suspiciousNumbers: z.array(z.string()),
  notes: z.string(),
});

// GET /api/restaurant/status
router.get('/status', (_req, res) => {
  const pdfPath = findMenuPdf();
  const products = getRestaurantProducts();
  const isLive = isRestaurantLiveData();

  res.json({
    pdfFound: !!pdfPath,
    pdfName: pdfPath ? require('path').basename(pdfPath) : null,
    productCount: products.length,
    isLive,
    mode: isLive ? 'live' : 'demo',
    qwenAvailable: isQwenAvailable(),
  });
});

// POST /api/restaurant/extract
router.post('/extract', async (req, res) => {
  const pdfFilename: string | undefined = req.body?.pdfFile;
  const run = addExtractionRun({
    sourceType: 'menu_pdf',
    sourceName: findMenuPdf(pdfFilename) ? require('path').basename(findMenuPdf(pdfFilename)!) : 'unknown',
    startedAt: new Date().toISOString(),
    mode: 'live',
    itemCount: 0,
    warnings: [],
  });

  const logs: string[] = [];
  try {
    const result = await extractMenuProducts((msg) => {
      logs.push(msg);
      console.log('[extract]', msg);
    }, pdfFilename);

    if (result.products.length > 0) {
      saveRestaurantProducts(result.products);
    }

    completeExtractionRun(run.id, {
      completedAt: new Date().toISOString(),
      mode: result.mode,
      itemCount: result.products.length,
      warnings: result.warnings,
      model: isQwenAvailable() ? process.env.QWEN_VISION_MODEL ?? 'qwen-vl-plus' : undefined,
    });

    res.json({
      success: true,
      mode: result.mode,
      productCount: result.products.length,
      pageCount: result.pageCount,
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

// GET /api/restaurant/products
router.get('/products', (_req, res) => {
  const products = getRestaurantProducts();
  const isLive = isRestaurantLiveData();
  res.json({ products, isLive, mode: isLive ? 'live' : 'demo' });
});

// GET /api/restaurant/products/:id
router.get('/products/:id', (req, res) => {
  const product = getRestaurantProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({ product });
});

// PATCH /api/restaurant/products/:id
router.patch('/products/:id', (req, res) => {
  const updated = updateRestaurantProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  const withStatus = { ...updated, status: computeRestaurantStatus(updated) };
  updateRestaurantProduct(req.params.id, { status: withStatus.status });
  return res.json({ product: withStatus });
});

// POST /api/restaurant/products/:id/questions
router.post('/products/:id/questions', async (req, res) => {
  const product = getRestaurantProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const missingFields = getMissingRestaurantFields(product);

  if (!isQwenAvailable()) {
    // Return deterministic demo questions
    const demoQuestions: MissingFieldQuestion[] = missingFields.map((f) => ({
      field: f,
      question: `What is the ${f.replace(/([A-Z])/g, ' $1').toLowerCase()} for "${product.nameEn.value ?? 'this product'}"?`,
      hint: undefined,
      required: ['nameEn', 'nameAr', 'category', 'basePriceSar'].includes(f),
    }));
    return res.json({ questions: demoQuestions, mode: 'demo' });
  }

  try {
    const productSummary = {
      nameEn: product.nameEn.value,
      nameAr: product.nameAr.value,
      category: product.category.value,
      basePriceSar: product.basePriceSar.value,
      ingredients: product.ingredients.value,
      toppings: product.toppings.value,
      sauces: product.sauces.value,
      allergens: product.allergens.value,
      calories: product.calories.value,
      missingFields,
    };
    const result = await runTextCompletion(
      QuestionsSchema,
      MISSING_FIELD_QUESTIONS_SYSTEM,
      MISSING_FIELD_QUESTIONS_RESTAURANT_USER(JSON.stringify(productSummary, null, 2)),
    );
    return res.json({ questions: result.questions, mode: 'live' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/restaurant/products/:id/generate
router.post('/products/:id/generate', async (req, res) => {
  const product = getRestaurantProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (!isQwenAvailable()) {
    // Demo mode: return a pre-built listing from demo data
    const demoListing = {
      titleAr: product.nameAr.value ?? 'منتج',
      titleEn: product.nameEn.value ?? 'Product',
      descriptionAr: product.descriptionAr.value ?? 'وصف المنتج غير متاح في وضع العرض التوضيحي.',
      descriptionEn: product.descriptionEn.value ?? 'Product description not available in demo mode.',
      shortDescriptionAr: product.nameAr.value ?? 'منتج',
      shortDescriptionEn: product.nameEn.value ?? 'Product',
      allergenStatementAr: product.allergens.value?.length
        ? `يحتوي على: ${product.allergens.value.join('، ')}`
        : undefined,
      allergenStatementEn: product.allergens.value?.length
        ? `Contains: ${product.allergens.value.join(', ')}`
        : undefined,
      factsUsed: ['nameEn', 'nameAr', 'descriptionEn', 'descriptionAr'],
      unsupportedFactsAdded: [],
      remainingMissingFields: getMissingRestaurantFields(product),
      explanation: [{ change: 'Demo mode', reason: 'No API key available — using existing extracted data.' }],
    };
    const updated = updateRestaurantProduct(req.params.id, { generatedListing: demoListing });
    return res.json({ listing: demoListing, product: updated, mode: 'demo' });
  }

  try {
    const productForGen = {
      nameEn: product.nameEn.value,
      nameAr: product.nameAr.value,
      category: product.category.value,
      basePriceSar: product.basePriceSar.value,
      ingredients: product.ingredients.value,
      toppings: product.toppings.value,
      sauces: product.sauces.value,
      allergens: product.allergens.value,
      calories: product.calories.value,
      servingType: product.servingType.value,
      sizes: product.sizes,
      merchantAnswers: product.merchantAnswers,
    };

    const listing = await runTextCompletion(
      GeneratedListingSchema,
      RESTAURANT_LISTING_GENERATION_SYSTEM,
      RESTAURANT_LISTING_GENERATION_USER(JSON.stringify(productForGen, null, 2)),
      0.3,
    );

    // Fact consistency check
    const consistencyCheck = await runTextCompletion(
      ConsistencySchema,
      FACT_CONSISTENCY_REVIEW_SYSTEM,
      FACT_CONSISTENCY_REVIEW_USER(
        JSON.stringify(listing),
        JSON.stringify(productForGen),
      ),
    );

    if (!consistencyCheck.passed && consistencyCheck.unsupportedClaims.length > 0) {
      return res.status(422).json({
        error: 'Generated listing failed fact consistency check',
        issues: consistencyCheck,
      });
    }

    const updated = updateRestaurantProduct(req.params.id, {
      generatedListing: listing,
      status: 'ready_to_generate',
    });

    return res.json({ listing, consistencyCheck, product: updated, mode: 'live' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/restaurant/products/:id/refine
router.post('/products/:id/refine', async (req, res) => {
  const { instruction } = req.body as { instruction: string };
  if (!instruction) return res.status(400).json({ error: 'instruction is required' });

  const product = getRestaurantProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!product.generatedListing) return res.status(400).json({ error: 'No generated listing to refine' });

  if (!isQwenAvailable()) {
    return res.status(503).json({ error: 'Refinement requires QWEN_API_KEY' });
  }

  try {
    const productSummary = {
      nameEn: product.nameEn.value,
      nameAr: product.nameAr.value,
      ingredients: product.ingredients.value,
      toppings: product.toppings.value,
      sauces: product.sauces.value,
      allergens: product.allergens.value,
    };

    const refined = await runTextCompletion(
      GeneratedListingSchema,
      LISTING_REFINEMENT_SYSTEM,
      LISTING_REFINEMENT_USER(
        JSON.stringify(product.generatedListing),
        instruction,
        JSON.stringify(productSummary),
      ),
      0.4,
    );

    const updated = updateRestaurantProduct(req.params.id, { generatedListing: refined });
    return res.json({ listing: refined, product: updated });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/restaurant/products/:id/approve
router.post('/products/:id/approve', (req, res) => {
  const product = getRestaurantProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const updated = updateRestaurantProduct(req.params.id, { status: 'approved' });
  return res.json({ product: updated });
});

export default router;
