import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, ChevronRight, Tag } from 'lucide-react';
import { getRetailProducts } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { DataSourceBanner } from '../../components/DataSourceBanner';
import type { RetailProduct } from '../../types';

function missingCount(p: RetailProduct): number {
  const fields = [p.model, p.color, p.warranty, p.packageContents, p.dimensions];
  return fields.filter((f) => f.value === null).length;
}

export default function RetailProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRetailProducts()
      .then((r) => { setProducts(r.products); setIsLive(r.isLive); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.value?.toLowerCase().includes(q) ||
      p.brand.value?.toLowerCase().includes(q) ||
      p.category.value?.toLowerCase().includes(q) ||
      p.asin.value?.toLowerCase().includes(q)
    );
  });

  const counts = {
    total: products.length,
    approved: products.filter((p) => p.status === 'approved').length,
    ready: products.filter((p) => p.status === 'ready_to_generate').length,
    missing: products.filter((p) => p.status === 'missing_details').length,
    review: products.filter((p) => p.status === 'needs_review').length,
  };

  if (loading) return <div className="p-8 text-muted">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-teal">Retail Products</h1>
          <p className="text-muted text-sm mt-1">Amazon SA deals page products</p>
        </div>
        <DataSourceBanner mode={isLive ? 'live' : 'demo'} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'text-brand-teal' },
          { label: 'Approved', value: counts.approved, color: 'text-brand-orange' },
          { label: 'Ready', value: counts.ready, color: 'text-success' },
          { label: 'Missing Details', value: counts.missing, color: 'text-warning' },
          { label: 'Needs Review', value: counts.review, color: 'text-danger' },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-gray-100 p-3 text-center shadow-card">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by title, brand, ASIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
        />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/retail/products/${p.id}`)}
            className="bg-surface rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover cursor-pointer transition-all p-4"
          >
            <div className="flex items-start gap-4">
              {/* Image */}
              {p.imageUrls.value?.[0] ? (
                <img
                  src={p.imageUrls.value[0]}
                  alt={p.title.value ?? ''}
                  className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-16 h-16 bg-background rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                  <Tag className="w-6 h-6 text-muted" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm leading-snug line-clamp-2">{p.title.value ?? '—'}</p>
                    <p className="text-xs text-muted mt-0.5">{p.brand.value ?? ''} · {p.category.value ?? ''} · ASIN: {p.asin.value ?? '—'}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-sm font-bold text-text-primary">
                      {p.currentPriceSar.value != null ? `SAR ${p.currentPriceSar.value}` : '—'}
                    </span>
                    {p.originalPriceSar.value != null && (
                      <span className="text-xs text-muted line-through ml-2">SAR {p.originalPriceSar.value}</span>
                    )}
                    {p.discountPercent.value != null && (
                      <span className="text-xs font-medium text-success ml-2">-{p.discountPercent.value}%</span>
                    )}
                  </div>

                  {p.rating.value != null && (
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Star className="w-3 h-3 text-brand-orange fill-brand-orange" />
                      {p.rating.value} ({p.reviewCount.value?.toLocaleString() ?? 0})
                    </div>
                  )}

                  {p.badgeText && (
                    <span className="text-xs font-medium bg-brand-orange-soft text-brand-orange px-2 py-0.5 rounded-full">
                      {p.badgeText}
                    </span>
                  )}

                  <span className={`text-xs font-medium ml-auto ${missingCount(p) > 0 ? 'text-warning' : 'text-success'}`}>
                    {missingCount(p)} missing fields
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted text-sm">No products match your search.</div>
      )}
    </div>
  );
}
