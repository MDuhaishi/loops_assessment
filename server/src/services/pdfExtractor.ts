import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { saveMenuPageImage, getMenuPageImages } from './dataStore';
import { isQwenAvailable, runVisionExtraction, runTextCompletion, warmupVisionModel } from './qwen';
import {
  RESTAURANT_MENU_EXTRACTION_SYSTEM,
  RESTAURANT_MENU_EXTRACTION_USER,
} from '../prompts/restaurant-menu-extraction';
import type { RestaurantProduct } from '../schemas/restaurant';
import { fe } from '../utils/deterministic';
import { computeRestaurantStatus } from '../utils/deterministic';

// Resolve assets dir relative to this file's location to work regardless of cwd
const ASSETS_DIR = path.resolve(__dirname, '../../../assets');

export function findMenuPdf(filename?: string): string | null {
  if (!fs.existsSync(ASSETS_DIR)) return null;
  const files = fs.readdirSync(ASSETS_DIR);
  const match = filename
    ? files.find((f) => f.toLowerCase() === filename.toLowerCase())
    : files.find((f) => f.toLowerCase().endsWith('.pdf'));
  return match ? path.join(ASSETS_DIR, match) : null;
}

async function renderPdfPages(pdfPath: string): Promise<Buffer[]> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string);
    const canvas = await import('@napi-rs/canvas');

    // Worker must be a file:// URL on Windows (bare paths not supported by ESM loader)
    const workerPath = path.resolve(
      require.resolve('pdfjs-dist/package.json'),
      '../legacy/build/pdf.worker.mjs',
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data, disableFontFace: true });
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;
    const buffers: Buffer[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const scale = 1.5; // 1.5x keeps images under 4096 Ollama context tokens (~2300 tokens vs ~4150 at 2x)
      const viewport = page.getViewport({ scale });
      const myCanvas = canvas.createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = myCanvas.getContext('2d') as any;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      const buf = myCanvas.toBuffer('image/png');
      buffers.push(buf as unknown as Buffer);
    }

    return buffers;
  } catch (err) {
    console.error('PDF rendering failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// Normalize model output: accept { value, confidence, sourceRef } OR null/scalar shortcuts
function flexScalar<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.preprocess(
    (v) => {
      if (v === null || v === undefined) return { value: null, confidence: 0, sourceRef: undefined };
      if (typeof v !== 'object' || Array.isArray(v)) return { value: v, confidence: 0.8, sourceRef: undefined };
      return v;
    },
    z.object({ value: valueSchema, confidence: z.number().default(0), sourceRef: z.string().optional() }),
  );
}

function flexArray<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.preprocess(
    (v) => {
      if (v === null || v === undefined) return { value: null, confidence: 0, sourceRef: undefined };
      if (Array.isArray(v)) return { value: v, confidence: 0.8, sourceRef: undefined };
      if (typeof v === 'object' && !Array.isArray(v)) return v;
      return { value: null, confidence: 0, sourceRef: undefined };
    },
    z.object({ value: z.array(itemSchema).nullable(), confidence: z.number().default(0), sourceRef: z.string().optional() }),
  );
}

// Accept any product shape from the model — rawToProduct does the normalization
const ExtractionBatchSchema = z.object({
  products: z.array(z.record(z.unknown())).default([]),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function coerceScalar<T>(v: any): { value: T | null; confidence: number; sourceRef?: string } {
  if (v === null || v === undefined) return { value: null, confidence: 0 };
  if (typeof v === 'object' && !Array.isArray(v) && 'value' in v)
    return { value: v.value ?? null, confidence: typeof v.confidence === 'number' ? v.confidence : 0.8, sourceRef: v.sourceRef };
  return { value: v as T, confidence: 0.8 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function coerceArray<T>(v: any): { value: T[] | null; confidence: number; sourceRef?: string } {
  if (v === null || v === undefined) return { value: null, confidence: 0 };
  if (Array.isArray(v)) return { value: v as T[], confidence: 0.8 };
  if (typeof v === 'object' && 'value' in v) {
    const inner = v.value;
    return { value: Array.isArray(inner) ? inner : null, confidence: typeof v.confidence === 'number' ? v.confidence : 0.8, sourceRef: v.sourceRef };
  }
  return { value: null, confidence: 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawToProduct(raw: any, pageLabel: string, sourcePdf?: string): RestaurantProduct {
  const id = uuidv4();
  const mkFe = <T>(obj: { value: T | null; confidence: number; sourceRef?: string }): import('../schemas/shared').FieldEvidence<T> => ({
    value: obj.value,
    confidence: obj.confidence,
    source: 'source_document',
    sourceRef: obj.sourceRef ?? pageLabel,
    needsReview: obj.confidence < 0.85,
  });

  const product: RestaurantProduct = {
    id,
    category: mkFe(coerceScalar<string>(raw.category)),
    nameAr: mkFe(coerceScalar<string>(raw.nameAr)),
    nameEn: mkFe(coerceScalar<string>(raw.nameEn)),
    descriptionAr: mkFe(coerceScalar<string>(raw.descriptionAr)),
    descriptionEn: mkFe(coerceScalar<string>(raw.descriptionEn)),
    basePriceSar: mkFe(coerceScalar<number>(raw.basePriceSar)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sizes: (Array.isArray(raw.sizes) ? raw.sizes : []).map((s: any) => ({
      label: String(s.label ?? ''),
      priceSar: typeof s.priceSar === 'number' ? s.priceSar : undefined,
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.8,
      sourceRef: pageLabel,
    })),
    modifiers: [],
    ingredients: mkFe(coerceArray<string>(raw.ingredients)),
    toppings: mkFe(coerceArray<string>(raw.toppings)),
    sauces: mkFe(coerceArray<string>(raw.sauces)),
    allergens: mkFe(coerceArray<string>(raw.allergens)),
    calories: mkFe(coerceScalar<number>(raw.calories)),
    servingType: mkFe(coerceScalar<string>(raw.servingType)),
    sourcePdf,
    extractionWarnings: Array.isArray(raw.extractionWarnings) ? raw.extractionWarnings : [],
    status: 'needs_review',
  };
  product.status = computeRestaurantStatus(product);
  return product;
}

async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string);
  const workerPath = path.resolve(require.resolve('pdfjs-dist/package.json'), '../legacy/build/pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, disableFontFace: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map((item: { str: string }) => item.str).filter((s: string) => s.trim()).join(' ');
    if (text.trim()) pages.push(`--- Page ${i} ---\n${text}`);
  }
  return pages.join('\n\n');
}

const TextExtractionSchema = z.object({
  products: z.array(z.object({
    nameEn: z.string().nullable(),
    category: z.string().nullable(),
    basePriceSar: z.number().nullable(),
    descriptionEn: z.string().nullable(),
  })).default([]),
});

export async function extractMenuProducts(onProgress?: (msg: string) => void, pdfFilename?: string): Promise<{
  products: RestaurantProduct[];
  pageCount: number;
  warnings: string[];
  mode: 'live' | 'cached' | 'fixture';
}> {
  const warnings: string[] = [];
  const pdfPath = findMenuPdf(pdfFilename);

  if (!pdfPath) {
    warnings.push('Menu PDF not found in assets/');
    return { products: [], pageCount: 0, warnings, mode: 'fixture' };
  }

  onProgress?.(`Found menu PDF: ${path.basename(pdfPath)}`);

  // Try text extraction first — fast, no vision model needed
  try {
    const rawText = await extractTextFromPdf(pdfPath);
    const meaningfulChars = rawText.replace(/[.\s]/g, '').length;
    if (meaningfulChars > 100) {
      onProgress?.(`PDF has extractable text (${meaningfulChars} chars) — using text extraction`);
      const result = await runTextCompletion(
        TextExtractionSchema,
        `You are a menu parser. Extract all menu items from the raw text. Return JSON: { "products": [{ "nameEn": string|null, "category": string|null, "basePriceSar": number|null, "descriptionEn": string|null }] }. Use the section headers (e.g. SHAWARMA, BURGER, PIES) as category names. If a name is not clear from the text, use null.`,
        `Menu text:\n${rawText}`,
      );
      const products = (result.products ?? []).map((r) => rawToProduct({
        nameEn: r.nameEn, nameAr: null, category: r.category,
        basePriceSar: r.basePriceSar, descriptionEn: r.descriptionEn, descriptionAr: null,
        ingredients: null, toppings: null, sauces: null, allergens: null,
        calories: null, servingType: null, extractionWarnings: [],
      }, 'text-extraction', pdfFilename));
      onProgress?.(`Extracted ${products.length} products via text`);
      return { products, pageCount: 1, warnings, mode: 'live' };
    }
  } catch (err) {
    onProgress?.(`Text extraction failed: ${err instanceof Error ? err.message : err} — falling back to vision`);
  }

  // Check for cached page images
  let pageBuffers: Buffer[] = [];
  const cachedImages = getMenuPageImages();

  if (cachedImages.length > 0) {
    onProgress?.(`Using ${cachedImages.length} cached page images`);
    pageBuffers = cachedImages.map((p) => fs.readFileSync(p));
  } else {
    onProgress?.('Rendering PDF pages to images...');
    pageBuffers = await renderPdfPages(pdfPath);

    if (pageBuffers.length === 0) {
      warnings.push('PDF rendering failed — canvas package may not be available');
      return { products: [], pageCount: 0, warnings, mode: 'fixture' };
    }

    // Cache rendered pages
    for (let i = 0; i < pageBuffers.length; i++) {
      saveMenuPageImage(i + 1, pageBuffers[i]);
    }
    onProgress?.(`Rendered and cached ${pageBuffers.length} pages`);
  }

  if (!isQwenAvailable()) {
    warnings.push('QWEN_API_KEY not set — cannot extract menu products');
    return { products: [], pageCount: pageBuffers.length, warnings, mode: 'fixture' };
  }

  const allProducts: RestaurantProduct[] = [];

  // Warm up the vision model at 16384 context before the first image request.
  // Without this, Ollama races between loading 16384 and serving the first request at default 4096.
  onProgress?.('Warming up vision model (loading 16384-token context)...');
  await warmupVisionModel();

  for (let i = 0; i < pageBuffers.length; i++) {
    const pageLabel = `Page ${i + 1}`;
    onProgress?.(`Extracting products from ${pageLabel}...`);
    const imageBase64 = pageBuffers[i].toString('base64');

    try {
      const result = await runVisionExtraction(
        ExtractionBatchSchema,
        RESTAURANT_MENU_EXTRACTION_SYSTEM,
        RESTAURANT_MENU_EXTRACTION_USER(pageLabel),
        imageBase64,
        'image/png',
      );
      const products = (result.products ?? []).map((r) => rawToProduct(r as Record<string, unknown>, pageLabel, pdfFilename));
      allProducts.push(...products);
      onProgress?.(`  → Found ${products.length} products on ${pageLabel}`);
    } catch (err) {
      const msg = `Failed to extract ${pageLabel}: ${err instanceof Error ? err.message : String(err)}`;
      warnings.push(msg);
      onProgress?.(msg);
    }
  }

  // Deduplicate by English name
  const seen = new Set<string>();
  const deduped = allProducts.filter((p) => {
    const key = p.nameEn.value?.toLowerCase().trim() ?? p.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    products: deduped,
    pageCount: pageBuffers.length,
    warnings,
    mode: 'live',
  };
}
