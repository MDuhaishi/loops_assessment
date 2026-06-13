import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, ChevronRight } from 'lucide-react';
import { getRestaurantProducts } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import type { RestaurantProduct } from '../../types';

function avgConfidence(p: RestaurantProduct): number {
  const fields = [p.nameEn, p.category, p.basePriceSar, p.descriptionEn];
  const vals = fields.map((f) => f.confidence);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function missingCount(p: RestaurantProduct): number {
  const fields = [p.ingredients, p.allergens, p.calories, p.toppings, p.sauces];
  return fields.filter((f) => f.value === null).length;
}

export default function RestaurantProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurantProducts()
      .then((r) => { setProducts(r.products); setIsLive(r.isLive); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nameEn.value?.toLowerCase().includes(q) ||
      p.nameAr.value?.toLowerCase().includes(q) ||
      p.category.value?.toLowerCase().includes(q)
    );
  });

  const counts = {
    total: products.length,
    approved: products.filter((p) => p.status === 'approved').length,
    ready: products.filter((p) => p.status === 'ready_to_generate').length,
    missing: products.filter((p) => p.status === 'missing_details').length,
    review: products.filter((p) => p.status === 'needs_review').length,
    lowConf: products.filter((p) => avgConfidence(p) < 0.6).length,
  };

  if (loading) return <div className="p-8 text-muted">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-teal">Restaurant Products</h1>
          <p className="text-muted text-sm mt-1">
            {isLive ? 'Live extraction results' : 'Demo data — Kudu menu'}
          </p>
        </div>
        {!isLive && (
          <span className="px-3 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Demo fixture
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'text-brand-teal' },
          { label: 'Approved', value: counts.approved, color: 'text-brand-orange' },
          { label: 'Ready', value: counts.ready, color: 'text-success' },
          { label: 'Missing Details', value: counts.missing, color: 'text-warning' },
          { label: 'Needs Review', value: counts.review, color: 'text-danger' },
          { label: 'Low Confidence', value: counts.lowConf, color: 'text-danger' },
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
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
        />
      </div>

      {/* Product table */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-background">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Category</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Price</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Confidence</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Missing</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/restaurant/products/${p.id}`)}
                className="border-b border-gray-50 last:border-0 hover:bg-brand-orange-soft/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-text-primary">{p.nameEn.value ?? '—'}</div>
                  <div className="text-xs text-muted">{p.nameAr.value ?? ''}</div>
                </td>
                <td className="px-4 py-3 text-muted">{p.category.value ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-text-primary">
                  {p.basePriceSar.value != null ? `SAR ${p.basePriceSar.value}` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <ConfidenceBadge confidence={avgConfidence(p)} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${missingCount(p) > 0 ? 'text-warning' : 'text-success'}`}>
                    {missingCount(p)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <ChevronRight className="w-4 h-4 text-muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted text-sm">No products match your search.</div>
        )}
      </div>
    </div>
  );
}
