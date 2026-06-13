import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Wand2, Loader2, CheckCircle, RefreshCw, Download } from 'lucide-react';
import {
  getRestaurantProduct,
  getRestaurantProducts,
  updateRestaurantProduct,
  generateRestaurantListing,
  refineRestaurantListing,
  approveRestaurantProduct,
} from '../api/client';
import type { RestaurantProduct } from '../types';

export default function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const menuName = searchParams.get('menu') ?? undefined;

  const [product, setProduct] = useState<RestaurantProduct | null>(null);
  const [menuProducts, setMenuProducts] = useState<RestaurantProduct[]>([]);
  const [fields, setFields] = useState({ nameEn: '', nameAr: '', category: '', price: '', ingredients: '', allergens: '', calories: '' });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load product + sibling list for navigation
  useEffect(() => {
    if (!id) return;
    getRestaurantProduct(id).then((r) => {
      setProduct(r.product);
      setFields({
        nameEn: r.product.nameEn.value ?? '',
        nameAr: r.product.nameAr.value ?? '',
        category: r.product.category.value ?? '',
        price: r.product.basePriceSar.value != null ? String(r.product.basePriceSar.value) : '',
        ingredients: r.product.ingredients.value?.join(', ') ?? '',
        allergens: r.product.allergens.value?.join(', ') ?? '',
        calories: r.product.calories.value != null ? String(r.product.calories.value) : '',
      });
      setDirty(false);
    }).catch(() => navigate('/products'));

    if (menuName) {
      getRestaurantProducts().then((r) => {
        setMenuProducts(r.products.filter(p => p.sourcePdf === menuName));
      });
    }
  }, [id]);

  const currentIdx = menuProducts.findIndex(p => p.id === id);
  const prevProduct = currentIdx > 0 ? menuProducts[currentIdx - 1] : null;
  const nextProduct = currentIdx >= 0 && currentIdx < menuProducts.length - 1 ? menuProducts[currentIdx + 1] : null;
  const allDone = menuProducts.length > 0 && menuProducts.every(p => p.status === 'approved');

  function goTo(p: RestaurantProduct) {
    navigate(`/products/${p.id}?menu=${encodeURIComponent(menuName ?? '')}&idx=${menuProducts.indexOf(p)}`);
  }

  function makeField<T>(value: T | null) {
    return { value, confidence: 1, source: 'merchant_input' as const, sourceRef: 'merchant', needsReview: false };
  }

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      const r = await updateRestaurantProduct(id, {
        nameEn: makeField(fields.nameEn || null),
        nameAr: makeField(fields.nameAr || null),
        category: makeField(fields.category || null),
        basePriceSar: makeField(fields.price ? parseFloat(fields.price) : null),
        ingredients: makeField(fields.ingredients ? fields.ingredients.split(',').map(s => s.trim()).filter(Boolean) : null),
        allergens: makeField(fields.allergens ? fields.allergens.split(',').map(s => s.trim()).filter(Boolean) : null),
        calories: makeField(fields.calories ? parseFloat(fields.calories) : null),
      });
      setProduct(r.product);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!id) return;
    if (dirty) await handleSave();
    setGenerating(true);
    setError(null);
    try {
      const r = await generateRestaurantListing(id);
      setProduct(r.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine() {
    if (!id || !refineText.trim()) return;
    setRefining(true);
    try {
      const r = await refineRestaurantListing(id, refineText);
      setProduct(r.product);
      setRefineText('');
    } finally {
      setRefining(false);
    }
  }

  async function handleApprove(andNext = false) {
    if (!id) return;
    const r = await approveRestaurantProduct(id);
    setProduct(r.product);
    // Update local menu list
    setMenuProducts(prev => prev.map(p => p.id === id ? r.product : p));
    if (andNext && nextProduct) goTo(nextProduct);
  }

  if (!product) return <div className="p-10 text-muted">Loading...</div>;

  const listing = product.generatedListing;
  const approved = product.status === 'approved';
  const total = menuProducts.length;
  const position = currentIdx + 1;

  return (
    <div className="p-8 max-w-2xl">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(menuName ? `/products` : '/products')} className="flex items-center gap-1 text-sm text-muted hover:text-brand-teal transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {menuName ? <span className="truncate max-w-xs">{menuName}</span> : 'Products'}
        </button>

        {total > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{position} of {total}</span>
            <div className="flex gap-1">
              <button
                onClick={() => prevProduct && goTo(prevProduct)}
                disabled={!prevProduct}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-muted" />
              </button>
              <button
                onClick={() => nextProduct && goTo(nextProduct)}
                disabled={!nextProduct}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 text-muted" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* All done banner */}
      {allDone && (
        <div
          onClick={() => navigate('/export')}
          className="mb-5 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-700">All {total} products approved — ready to export</p>
          </div>
          <div className="flex items-center gap-1 text-green-700 font-medium text-sm">
            <Download className="w-4 h-4" /> Export
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-6 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-medium text-muted block mb-1">Name (English) *</label>
            <input
              value={fields.nameEn}
              onChange={(e) => { setFields(f => ({ ...f, nameEn: e.target.value })); setDirty(true); }}
              placeholder="e.g. Chicken Burger"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-medium text-muted block mb-1">Name (Arabic)</label>
            <input
              value={fields.nameAr}
              onChange={(e) => { setFields(f => ({ ...f, nameAr: e.target.value })); setDirty(true); }}
              placeholder="الاسم بالعربي"
              dir="rtl"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Category</label>
            <input
              value={fields.category}
              onChange={(e) => { setFields(f => ({ ...f, category: e.target.value })); setDirty(true); }}
              placeholder="e.g. Burgers"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Price (SAR) *</label>
            <input
              type="number"
              value={fields.price}
              onChange={(e) => { setFields(f => ({ ...f, price: e.target.value })); setDirty(true); }}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Used for better descriptions</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={`text-xs font-medium block mb-1 ${!fields.ingredients ? 'text-amber-500' : 'text-muted'}`}>
                Ingredients {!fields.ingredients && <span className="font-normal">(not extracted — add for better listing)</span>}
              </label>
              <input
                value={fields.ingredients}
                onChange={(e) => { setFields(f => ({ ...f, ingredients: e.target.value })); setDirty(true); }}
                placeholder="e.g. chicken, lettuce, tomato, sauce (comma-separated)"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange ${!fields.ingredients ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200'}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${!fields.allergens ? 'text-amber-500' : 'text-muted'}`}>
                  Allergens
                </label>
                <input
                  value={fields.allergens}
                  onChange={(e) => { setFields(f => ({ ...f, allergens: e.target.value })); setDirty(true); }}
                  placeholder="e.g. gluten, dairy"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange ${!fields.allergens ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200'}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1 ${!fields.calories ? 'text-amber-500' : 'text-muted'}`}>
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  value={fields.calories}
                  onChange={(e) => { setFields(f => ({ ...f, calories: e.target.value })); setDirty(true); }}
                  placeholder="e.g. 450"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange ${!fields.calories ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200'}`}
                />
              </div>
            </div>
          </div>
        </div>

        {dirty && (
          <button onClick={handleSave} disabled={saving} className="mt-4 px-4 py-1.5 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        )}
      </div>

      {/* Generate */}
      {!approved && (
        <button
          onClick={handleGenerate}
          disabled={generating || !fields.nameEn || !fields.price}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-orange text-white rounded-xl font-semibold text-sm hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-5"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            : <><Wand2 className="w-4 h-4" /> {listing ? 'Regenerate Listing' : 'Generate Listing'}</>}
        </button>
      )}

      {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

      {/* Generated output */}
      {listing && (
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-6 mb-5">
          <h2 className="font-semibold text-text-primary mb-4">Generated Listing</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-muted mb-1">Title (English)</p>
              <p className="text-sm font-semibold">{listing.titleEn}</p>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-muted mb-1">Title (Arabic)</p>
              <p className="text-sm font-semibold" dir="rtl">{listing.titleAr}</p>
            </div>
          </div>
          <div className="bg-background rounded-lg p-3 mb-3">
            <p className="text-xs text-muted mb-1">Description (English)</p>
            <p className="text-sm leading-relaxed">{listing.descriptionEn}</p>
          </div>
          <div className="bg-background rounded-lg p-3" dir="rtl">
            <p className="text-xs text-muted mb-1" dir="ltr">Description (Arabic)</p>
            <p className="text-sm leading-relaxed">{listing.descriptionAr}</p>
          </div>
        </div>
      )}

      {/* Refine */}
      {listing && !approved && (
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
          <h2 className="font-semibold text-text-primary mb-3">Refine</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              placeholder='e.g. "Make it shorter", "More premium tone"'
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refineText.trim()}
              className="px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
            >
              {refining ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Refine'}
            </button>
          </div>
        </div>
      )}

      {/* Approve actions */}
      {listing && !approved && (
        <div className="flex gap-3">
          <button
            onClick={() => handleApprove(false)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
          {nextProduct && (
            <button
              onClick={() => handleApprove(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-orange text-white rounded-xl font-semibold text-sm hover:bg-orange-400 transition-colors"
            >
              Approve & Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {approved && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-medium text-green-700">Approved</p>
          </div>
          {nextProduct && (
            <button
              onClick={() => goTo(nextProduct)}
              className="flex items-center gap-1 text-sm text-brand-orange font-medium hover:text-orange-500 transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
