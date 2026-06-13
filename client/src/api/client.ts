const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const getAppMode = () => request<import('../types').AppMode>('/config/mode');

// ─── Restaurant ───────────────────────────────────────────────────────────────

export const getAvailablePdfs = () =>
  request<{ pdfs: string[] }>('/restaurant/pdfs');

export async function uploadPdf(file: File): Promise<{ filename: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/restaurant/pdfs/upload', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export const extractRestaurantPdf = (pdfFile: string) =>
  request<{ success: boolean; productCount: number; warnings: string[]; logs: string[] }>(
    '/restaurant/extract',
    { method: 'POST', body: JSON.stringify({ pdfFile }) },
  );

export const getRestaurantStatus = () => request<{
  pdfFound: boolean;
  pdfName: string | null;
  productCount: number;
  isLive: boolean;
  mode: string;
  qwenAvailable: boolean;
}>('/restaurant/status');

export const extractRestaurant = () =>
  request<{ success: boolean; mode: string; productCount: number; warnings: string[]; logs: string[] }>(
    '/restaurant/extract',
    { method: 'POST' },
  );

export const getRestaurantProducts = () =>
  request<{ products: import('../types').RestaurantProduct[]; isLive: boolean; mode: string }>(
    '/restaurant/products',
  );

export const getRestaurantProduct = (id: string) =>
  request<{ product: import('../types').RestaurantProduct }>(`/restaurant/products/${id}`);

export const updateRestaurantProduct = (id: string, patch: Partial<import('../types').RestaurantProduct>) =>
  request<{ product: import('../types').RestaurantProduct }>(`/restaurant/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const getRestaurantQuestions = (id: string) =>
  request<{ questions: import('../types').MissingFieldQuestion[]; mode: string }>(
    `/restaurant/products/${id}/questions`,
    { method: 'POST' },
  );

export const generateRestaurantListing = (id: string) =>
  request<{ listing: import('../types').GeneratedListing; product: import('../types').RestaurantProduct; mode: string }>(
    `/restaurant/products/${id}/generate`,
    { method: 'POST' },
  );

export const refineRestaurantListing = (id: string, instruction: string) =>
  request<{ listing: import('../types').GeneratedListing; product: import('../types').RestaurantProduct }>(
    `/restaurant/products/${id}/refine`,
    { method: 'POST', body: JSON.stringify({ instruction }) },
  );

export const approveRestaurantProduct = (id: string) =>
  request<{ product: import('../types').RestaurantProduct }>(`/restaurant/products/${id}/approve`, {
    method: 'POST',
  });

// ─── Retail ───────────────────────────────────────────────────────────────────

export const getRetailStatus = () =>
  request<{ productCount: number; isLive: boolean; mode: string; qwenAvailable: boolean }>('/retail/status');

export const extractRetail = () =>
  request<{ success: boolean; mode: string; productCount: number; warnings: string[]; logs: string[] }>(
    '/retail/extract',
    { method: 'POST' },
  );

export const getRetailProducts = () =>
  request<{ products: import('../types').RetailProduct[]; isLive: boolean; mode: string }>(
    '/retail/products',
  );

export const getRetailProduct = (id: string) =>
  request<{ product: import('../types').RetailProduct }>(`/retail/products/${id}`);

export const updateRetailProduct = (id: string, patch: Partial<import('../types').RetailProduct>) =>
  request<{ product: import('../types').RetailProduct }>(`/retail/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const getRetailQuestions = (id: string) =>
  request<{ questions: import('../types').MissingFieldQuestion[]; mode: string }>(
    `/retail/products/${id}/questions`,
    { method: 'POST' },
  );

export const generateRetailListing = (id: string) =>
  request<{ listing: import('../types').RetailGeneratedListing; product: import('../types').RetailProduct; mode: string }>(
    `/retail/products/${id}/generate`,
    { method: 'POST' },
  );

export const refineRetailListing = (id: string, instruction: string) =>
  request<{ listing: import('../types').RetailGeneratedListing; product: import('../types').RetailProduct }>(
    `/retail/products/${id}/refine`,
    { method: 'POST', body: JSON.stringify({ instruction }) },
  );

export const approveRetailProduct = (id: string) =>
  request<{ product: import('../types').RetailProduct }>(`/retail/products/${id}/approve`, {
    method: 'POST',
  });
