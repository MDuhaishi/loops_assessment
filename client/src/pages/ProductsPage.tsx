import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileText, AlertCircle, CheckCircle, Circle } from 'lucide-react';
import { getRestaurantProducts } from '../api/client';
import type { RestaurantProduct } from '../types';

function productStatus(p: RestaurantProduct): 'approved' | 'generated' | 'incomplete' | 'ready' {
  if (p.status === 'approved') return 'approved';
  if (p.generatedListing) return 'generated';
  if (!p.nameEn.value || p.basePriceSar.value == null) return 'incomplete';
  return 'ready';
}

function StatusDot({ s }: { s: ReturnType<typeof productStatus> }) {
  if (s === 'approved') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  if (s === 'generated') return <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />;
  if (s === 'incomplete') return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />;
  return <Circle className="w-4 h-4 text-gray-300 shrink-0" />;
}

interface MenuGroup {
  name: string;
  products: RestaurantProduct[];
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurantProducts().then((r) => {
      const map: Record<string, RestaurantProduct[]> = {};
      for (const p of r.products) {
        const key = p.sourcePdf ?? 'Unknown menu';
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
      const g = Object.entries(map).map(([name, products]) => ({ name, products }));
      setGroups(g);
      // open all by default
      const o: Record<string, boolean> = {};
      g.forEach(({ name }) => { o[name] = true; });
      setOpen(o);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-muted">Loading...</div>;

  if (groups.length === 0) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-lg font-semibold text-text-primary mb-2">No products yet</p>
        <p className="text-muted text-sm">Upload and extract a menu first.</p>
        <button onClick={() => navigate('/')} className="mt-4 px-5 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium">
          Upload Menu
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-bold text-brand-teal mb-6">Products</h1>

      <div className="space-y-4">
        {groups.map(({ name, products }) => {
          const approved = products.filter(p => productStatus(p) === 'approved').length;
          const generated = products.filter(p => productStatus(p) === 'generated').length;
          const incomplete = products.filter(p => productStatus(p) === 'incomplete').length;
          const done = approved + generated;
          const pct = Math.round((done / products.length) * 100);
          const isOpen = open[name];

          // First incomplete or non-approved product for "Start" button
          const firstIncomplete = products.find(p => productStatus(p) !== 'approved');

          return (
            <div key={name} className="bg-surface rounded-xl border border-gray-100 shadow-card overflow-hidden">
              {/* Folder header */}
              <button
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setOpen(o => ({ ...o, [name]: !o[name] }))}
              >
                <FileText className="w-5 h-5 text-brand-orange shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-primary truncate">{name}</span>
                    <span className="text-xs text-muted shrink-0">{products.length} products</span>
                    {incomplete > 0 && (
                      <span className="text-xs text-amber-600 flex items-center gap-1 shrink-0">
                        <AlertCircle className="w-3 h-3" /> {incomplete} need info
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-orange rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted shrink-0">{done}/{products.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {firstIncomplete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${firstIncomplete.id}?menu=${encodeURIComponent(name)}`);
                      }}
                      className="px-3 py-1 bg-brand-orange text-white rounded-lg text-xs font-medium hover:bg-orange-400 transition-colors"
                    >
                      {done === 0 ? 'Start →' : 'Continue →'}
                    </button>
                  )}
                  {approved === products.length && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/export'); }}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      Export ↓
                    </button>
                  )}
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
                </div>
              </button>

              {/* Product list */}
              {isOpen && (
                <div className="border-t border-gray-100">
                  {products.map((p, idx) => {
                    const s = productStatus(p);
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/products/${p.id}?menu=${encodeURIComponent(name)}&idx=${idx}`)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-orange-50/40 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <StatusDot s={s} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-text-primary truncate block">
                            {p.nameEn.value ?? <span className="text-muted italic">Unnamed</span>}
                          </span>
                          {p.nameAr.value && (
                            <span className="text-xs text-muted" dir="rtl">{p.nameAr.value}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted shrink-0">{p.category.value ?? ''}</span>
                        <span className="text-xs font-mono text-muted shrink-0">
                          {p.basePriceSar.value != null ? `SAR ${p.basePriceSar.value}` : '—'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
