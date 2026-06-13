import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getAmazonRawHtml, saveAmazonRawHtml, getRetailProducts } from './dataStore';
import { isQwenAvailable, runTextCompletion } from './qwen';
import {
  RETAIL_PAGE_NORMALIZATION_SYSTEM,
  RETAIL_PAGE_NORMALIZATION_USER,
} from '../prompts/retail-page-normalization';
import type { RetailProduct } from '../schemas/retail';
import { fe, calculateDiscountPercent, computeRetailStatus, deduplicateByAsin } from '../utils/deterministic';

const AMAZON_URL =
  'https://www.amazon.sa/stores/page/C70094F1-7970-411E-BEF6-8009746DB248/deals?ingress=0&visitId=4ae9679d-fe03-468a-a27e-cbd5b2fa4358';

interface RawScrapedProduct {
  asin: string | null;
  title: string | null;
  url: string | null;
  imageUrl: string | null;
  currentPrice: string | null;
  originalPrice: string | null;
  discount: string | null;
  rating: string | null;
  reviewCount: string | null;
  badgeText: string | null;
}

async function scrapeWithPlaywright(): Promise<{ products: RawScrapedProduct[]; html: string }> {
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  try {
    await page.goto(AMAZON_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    const html = await page.content();

    const products = await page.evaluate(() => {
      const items: {
        asin: string | null;
        title: string | null;
        url: string | null;
        imageUrl: string | null;
        currentPrice: string | null;
        originalPrice: string | null;
        discount: string | null;
        rating: string | null;
        reviewCount: string | null;
        badgeText: string | null;
      }[] = [];

      const cards = document.querySelectorAll('[data-asin], .s-result-item, .a-section[data-uuid]');
      cards.forEach((card) => {
        const asin = card.getAttribute('data-asin') ?? null;
        if (!asin || asin.length < 5) return;

        const titleEl = card.querySelector('[data-cy="title-recipe"] span, h2 span, .a-size-base-plus, .a-size-mini');
        const title = titleEl?.textContent?.trim() ?? null;

        const link = card.querySelector('a.a-link-normal[href*="/dp/"]');
        const url = link?.getAttribute('href')
          ? 'https://www.amazon.sa' + link.getAttribute('href')
          : null;

        const imgEl = card.querySelector('img.s-image, img[data-image-index]');
        const imageUrl = imgEl?.getAttribute('src') ?? null;

        const priceEl = card.querySelector('.a-price .a-offscreen, .a-price-whole');
        const currentPrice = priceEl?.textContent?.trim() ?? null;

        const origPriceEl = card.querySelector('.a-price[data-a-strike="true"] .a-offscreen, s .a-offscreen');
        const originalPrice = origPriceEl?.textContent?.trim() ?? null;

        const discountEl = card.querySelector('.a-badge-text, [data-a-badge-color] .a-badge-text');
        const discount = discountEl?.textContent?.trim() ?? null;

        const ratingEl = card.querySelector('.a-icon-alt');
        const rating = ratingEl?.textContent?.split(' ')[0] ?? null;

        const reviewEl = card.querySelector('[aria-label*="stars"] + span, .a-size-small .a-link-normal');
        const reviewCount = reviewEl?.textContent?.trim() ?? null;

        const badgeEl = card.querySelector('.a-badge-label, .savingsPercentage');
        const badgeText = badgeEl?.textContent?.trim() ?? null;

        if (title || imageUrl) {
          items.push({ asin, title, url, imageUrl, currentPrice, originalPrice, discount, rating, reviewCount, badgeText });
        }
      });

      return items;
    });

    return { products, html };
  } finally {
    await browser.close();
  }
}

function parseHtmlFallback(html: string): RawScrapedProduct[] {
  // Simple regex-based fallback extraction from saved HTML
  const products: RawScrapedProduct[] = [];
  const asinPattern = /data-asin="([A-Z0-9]{10})"/g;
  const seen = new Set<string>();
  let match;

  while ((match = asinPattern.exec(html)) !== null) {
    const asin = match[1];
    if (seen.has(asin)) continue;
    seen.add(asin);

    // Extract nearby title (simplified)
    const searchStart = Math.max(0, match.index - 100);
    const searchEnd = Math.min(html.length, match.index + 2000);
    const snippet = html.slice(searchStart, searchEnd);

    const titleMatch = snippet.match(/class="[^"]*a-size-[^"]*"[^>]*>([^<]{10,200})</);
    const priceMatch = snippet.match(/(\d+\.\d+)\s*SAR|SAR\s*(\d+\.\d+)/i);

    products.push({
      asin,
      title: titleMatch ? titleMatch[1].trim() : null,
      url: `https://www.amazon.sa/dp/${asin}`,
      imageUrl: null,
      currentPrice: priceMatch ? (priceMatch[1] ?? priceMatch[2]) : null,
      originalPrice: null,
      discount: null,
      rating: null,
      reviewCount: null,
      badgeText: null,
    });
  }

  return products.slice(0, 30);
}

function rawProductToRetailProduct(raw: RawScrapedProduct): RetailProduct {
  const id = uuidv4();

  const parsedCurrentPrice = raw.currentPrice
    ? parseFloat(raw.currentPrice.replace(/[^\d.]/g, ''))
    : null;
  const parsedOriginalPrice = raw.originalPrice
    ? parseFloat(raw.originalPrice.replace(/[^\d.]/g, ''))
    : null;
  const discountValue = calculateDiscountPercent(parsedOriginalPrice, parsedCurrentPrice);

  // Extract ASIN from URL
  const asinFromUrl = raw.url?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? raw.asin;

  const product: RetailProduct = {
    id,
    asin: fe(asinFromUrl ?? null, asinFromUrl ? 0.95 : 0, 'scraped_page', 'url'),
    sourceUrl: fe(raw.url, raw.url ? 0.99 : 0, 'scraped_page', 'href'),
    title: fe(raw.title, raw.title ? 0.85 : 0, 'scraped_page', 'title element'),
    brand: fe(null, 0, 'scraped_page'),
    model: fe(null, 0, 'scraped_page'),
    category: fe(null, 0, 'scraped_page'),
    currentPriceSar: fe(
      isNaN(parsedCurrentPrice ?? NaN) ? null : parsedCurrentPrice,
      parsedCurrentPrice ? 0.9 : 0,
      'scraped_page',
      'price element',
    ),
    originalPriceSar: fe(
      isNaN(parsedOriginalPrice ?? NaN) ? null : parsedOriginalPrice,
      parsedOriginalPrice ? 0.85 : 0,
      'scraped_page',
      'strike price',
    ),
    discountPercent: fe(discountValue, discountValue ? 0.85 : 0, 'derived_rule'),
    imageUrls: fe(raw.imageUrl ? [raw.imageUrl] : null, raw.imageUrl ? 0.9 : 0, 'scraped_page', 'img src'),
    rating: fe(
      raw.rating ? parseFloat(raw.rating) : null,
      raw.rating ? 0.9 : 0,
      'scraped_page',
      'rating element',
    ),
    reviewCount: fe(
      raw.reviewCount ? parseInt(raw.reviewCount.replace(/[^\d]/g, '')) : null,
      raw.reviewCount ? 0.85 : 0,
      'scraped_page',
      'review count',
    ),
    color: fe(null, 0, 'scraped_page'),
    size: fe(null, 0, 'scraped_page'),
    material: fe(null, 0, 'scraped_page'),
    dimensions: fe(null, 0, 'scraped_page'),
    weight: fe(null, 0, 'scraped_page'),
    technicalSpecifications: fe(null, 0, 'scraped_page'),
    packageContents: fe(null, 0, 'scraped_page'),
    compatibility: fe(null, 0, 'scraped_page'),
    warranty: fe(null, 0, 'scraped_page'),
    countryOfOrigin: fe(null, 0, 'scraped_page'),
    searchKeywords: fe(null, 0, 'scraped_page'),
    badgeText: raw.badgeText ?? undefined,
    extractionWarnings: [],
    status: 'needs_review',
  };

  product.status = computeRetailStatus(product);
  return product;
}

export async function extractAmazonProducts(onProgress?: (msg: string) => void): Promise<{
  products: RetailProduct[];
  mode: 'live' | 'cached' | 'fixture';
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Try live Playwright scrape
  onProgress?.('Attempting live Amazon page extraction...');
  try {
    const { products: rawProducts, html } = await scrapeWithPlaywright();

    if (rawProducts.length > 0) {
      saveAmazonRawHtml(html);
      const products = deduplicateByAsin(rawProducts.map(rawProductToRetailProduct));
      onProgress?.(`Live extraction succeeded: ${products.length} products found`);
      return { products, mode: 'live', warnings };
    }

    warnings.push('Live extraction returned 0 products — Amazon may have blocked access');
  } catch (err) {
    const msg = `Live Amazon extraction failed: ${err instanceof Error ? err.message : String(err)}`;
    warnings.push(msg);
    onProgress?.(msg);
  }

  // Fallback: check for saved HTML
  onProgress?.('Checking for saved amazon_page.html...');
  const savedHtml = getAmazonRawHtml();
  if (savedHtml) {
    const rawProducts = parseHtmlFallback(savedHtml);
    if (rawProducts.length > 0) {
      const products = deduplicateByAsin(rawProducts.map(rawProductToRetailProduct));
      onProgress?.(`Using saved HTML: ${products.length} products extracted`);
      return { products, mode: 'cached', warnings };
    }
  }

  // Final fallback: fixture data
  onProgress?.('Using demo fixture data');
  warnings.push('Using demo fixture data — Amazon blocked automated access');
  return { products: [], mode: 'fixture', warnings };
}
