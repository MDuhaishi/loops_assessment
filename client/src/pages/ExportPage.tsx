import { useEffect, useState } from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { getRestaurantProducts } from '../api/client';
import type { RestaurantProduct } from '../types';

function toExportItem(p: RestaurantProduct) {
  const l = p.generatedListing;
  return {
    id: p.id,
    nameEn: p.nameEn.value,
    nameAr: p.nameAr.value,
    category: p.category.value,
    priceSar: p.basePriceSar.value,
    sizes: p.sizes.map((s) => ({ label: s.label, priceSar: s.priceSar })),
    ingredients: p.ingredients.value,
    allergens: p.allergens.value,
    calories: p.calories.value,
    listing: l ? {
      titleEn: l.titleEn,
      titleAr: l.titleAr,
      descriptionEn: l.descriptionEn,
      descriptionAr: l.descriptionAr,
      shortDescriptionEn: l.shortDescriptionEn,
      shortDescriptionAr: l.shortDescriptionAr,
      allergenStatementEn: l.allergenStatementEn,
      allergenStatementAr: l.allergenStatementAr,
    } : null,
    approved: p.status === 'approved',
  };
}

export default function ExportPage() {
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurantProducts().then((r) => setProducts(r.products)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-muted">Loading...</div>;

  const approved = products.filter((p) => p.status === 'approved');
  const withListing = products.filter((p) => p.generatedListing);

  function download(items: ReturnType<typeof toExportItem>[], label: string) {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu_${label}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-10 max-w-xl">
      <h1 className="text-2xl font-bold text-brand-teal mb-1">Export</h1>
      <p className="text-sm text-muted mb-8">Download your menu as structured JSON.</p>

      <div className="space-y-4">
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-text-primary">{approved.length} approved products</p>
            <p className="text-xs text-muted mt-0.5">Only approved listings</p>
          </div>
          <button
            onClick={() => download(approved.map(toExportItem), 'approved')}
            disabled={approved.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>

        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-text-primary">{withListing.length} products with listings</p>
            <p className="text-xs text-muted mt-0.5">All generated (approved + pending)</p>
          </div>
          <button
            onClick={() => download(withListing.map(toExportItem), 'all_generated')}
            disabled={withListing.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>

        {approved.length > 0 && (
          <div className="flex items-center gap-2 mt-4 text-sm text-success">
            <CheckCircle className="w-4 h-4" />
            {approved.length} of {products.length} products approved
          </div>
        )}
      </div>
    </div>
  );
}
