import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { RestaurantProduct } from '../schemas/restaurant';
import type { RetailProduct } from '../schemas/retail';
import type { ExtractionRun } from '../schemas/shared';

// Resolve data dir relative to this file's location to work regardless of cwd
const DATA_DIR = path.resolve(__dirname, '../../../data');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const DEMO_DIR = path.join(DATA_DIR, 'demo');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Restaurant Products ───────────────────────────────────────────────────

export function getRestaurantProducts(): RestaurantProduct[] {
  const live = readJson<RestaurantProduct[]>(path.join(PROCESSED_DIR, 'restaurant_products.json'));
  if (live && live.length > 0) return live;
  const demo = readJson<RestaurantProduct[]>(path.join(DEMO_DIR, 'restaurant_products.json'));
  return demo ?? [];
}

export function getRestaurantProductById(id: string): RestaurantProduct | null {
  return getRestaurantProducts().find((p) => p.id === id) ?? null;
}

export function saveRestaurantProducts(products: RestaurantProduct[]) {
  writeJson(path.join(PROCESSED_DIR, 'restaurant_products.json'), products);
}

export function updateRestaurantProduct(id: string, patch: Partial<RestaurantProduct>): RestaurantProduct | null {
  const products = getRestaurantProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...products[idx], ...patch };
  products[idx] = updated;
  saveRestaurantProducts(products);
  return updated;
}

export function isRestaurantLiveData(): boolean {
  const live = readJson<RestaurantProduct[]>(path.join(PROCESSED_DIR, 'restaurant_products.json'));
  return !!(live && live.length > 0);
}

// ─── Retail Products ───────────────────────────────────────────────────────

export function getRetailProducts(): RetailProduct[] {
  const live = readJson<RetailProduct[]>(path.join(PROCESSED_DIR, 'retail_products.json'));
  if (live && live.length > 0) return live;
  const demo = readJson<RetailProduct[]>(path.join(DEMO_DIR, 'amazon_products.json'));
  return demo ?? [];
}

export function getRetailProductById(id: string): RetailProduct | null {
  return getRetailProducts().find((p) => p.id === id) ?? null;
}

export function saveRetailProducts(products: RetailProduct[]) {
  writeJson(path.join(PROCESSED_DIR, 'retail_products.json'), products);
}

export function updateRetailProduct(id: string, patch: Partial<RetailProduct>): RetailProduct | null {
  const products = getRetailProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...products[idx], ...patch };
  products[idx] = updated;
  saveRetailProducts(products);
  return updated;
}

export function isRetailLiveData(): boolean {
  const live = readJson<RetailProduct[]>(path.join(PROCESSED_DIR, 'retail_products.json'));
  return !!(live && live.length > 0);
}

// ─── Extraction Runs ───────────────────────────────────────────────────────

export function getExtractionRuns(): ExtractionRun[] {
  return readJson<ExtractionRun[]>(path.join(PROCESSED_DIR, 'extraction_runs.json')) ?? [];
}

export function addExtractionRun(run: Omit<ExtractionRun, 'id'>): ExtractionRun {
  const runs = getExtractionRuns();
  const newRun: ExtractionRun = { id: uuidv4(), ...run };
  runs.unshift(newRun);
  writeJson(path.join(PROCESSED_DIR, 'extraction_runs.json'), runs.slice(0, 50));
  return newRun;
}

export function completeExtractionRun(id: string, patch: Partial<ExtractionRun>) {
  const runs = getExtractionRuns();
  const idx = runs.findIndex((r) => r.id === id);
  if (idx !== -1) {
    runs[idx] = { ...runs[idx], ...patch };
    writeJson(path.join(PROCESSED_DIR, 'extraction_runs.json'), runs);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────

export function saveExport(filename: string, content: string) {
  ensureDir(EXPORTS_DIR);
  fs.writeFileSync(path.join(EXPORTS_DIR, filename), content, 'utf-8');
}

export function getAmazonRawHtml(): string | null {
  const rawPath = path.join(DATA_DIR, 'raw', 'amazon_page.html');
  if (!fs.existsSync(rawPath)) return null;
  return fs.readFileSync(rawPath, 'utf-8');
}

export function saveAmazonRawHtml(html: string) {
  ensureDir(path.join(DATA_DIR, 'raw'));
  fs.writeFileSync(path.join(DATA_DIR, 'raw', 'amazon_page.html'), html, 'utf-8');
}

export function getMenuPagesDir(): string {
  const dir = path.join(DATA_DIR, 'raw', 'menu_pages');
  ensureDir(dir);
  return dir;
}

export function saveMenuPageImage(pageNum: number, buffer: Buffer): string {
  const dir = getMenuPagesDir();
  const filePath = path.join(dir, `page_${pageNum}.png`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getMenuPageImages(): string[] {
  const dir = path.join(DATA_DIR, 'raw', 'menu_pages');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.png') || f.endsWith('.jpg'))
    .sort()
    .map((f) => path.join(dir, f));
}

export function initDataDirs() {
  ensureDir(PROCESSED_DIR);
  ensureDir(DEMO_DIR);
  ensureDir(EXPORTS_DIR);
}

// Generate new UUID for products
export { uuidv4 as newId };
