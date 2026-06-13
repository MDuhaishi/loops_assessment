import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Wand2, RefreshCw, MessageSquare,
  ThumbsUp, Copy, Info, Star, Tag, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  getRetailProduct,
  getRetailQuestions,
  generateRetailListing,
  refineRetailListing,
  approveRetailProduct,
  updateRetailProduct,
} from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import type { RetailProduct, MissingFieldQuestion, RetailGeneratedListing, FieldEvidence } from '../../types';

function FieldRow<T>({
  label,
  field,
  renderValue,
}: {
  label: string;
  field: FieldEvidence<T> | undefined;
  renderValue?: (v: T) => string;
}) {
  if (!field) return null;
  const display = field.value != null
    ? renderValue ? renderValue(field.value) : String(field.value)
    : null;
  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-lg ${field.value === null ? 'bg-danger/5 border border-danger/10' : field.confidence < 0.6 ? 'bg-warning/5' : 'bg-background'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-muted">{label}</span>
          <ProvenanceBadge source={field.source} />
          <ConfidenceBadge confidence={field.confidence} />
        </div>
        <p className={`text-sm ${display ? 'text-text-primary' : 'text-danger text-xs'}`}>
          {display ?? '— Missing'}
        </p>
      </div>
    </div>
  );
}

export default function RetailProductEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<RetailProduct | null>(null);
  const [questions, setQuestions] = useState<MissingFieldQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQ, setLoadingQ] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'amazon' | 'noon'>('amazon');
  const [showListing, setShowListing] = useState(false);
  const [_copied, setCopied] = useState('');

  useEffect(() => {
    if (!id) return;
    getRetailProduct(id)
      .then((r) => setProduct(r.product))
      .catch(() => navigate('/retail/products'));
  }, [id]);

  async function handleLoadQuestions() {
    if (!id) return;
    setLoadingQ(true);
    try {
      const r = await getRetailQuestions(id);
      setQuestions(r.questions);
    } finally {
      setLoadingQ(false);
    }
  }

  async function handleSaveAnswers() {
    if (!id || !product) return;
    const merchantAnswers = { ...(product.merchantAnswers ?? {}), ...answers };
    const r = await updateRetailProduct(id, { merchantAnswers });
    setProduct(r.product);
    setAnswers({});
  }

  async function handleGenerate() {
    if (!id) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await generateRetailListing(id);
      setProduct(r.product);
      setShowListing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine() {
    if (!id || !refineText.trim()) return;
    setRefining(true);
    try {
      const r = await refineRetailListing(id, refineText);
      setProduct(r.product);
      setRefineText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefining(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  if (!product) return <div className="p-8 text-muted">Loading...</div>;

  const listing: RetailGeneratedListing | undefined = product.generatedListing;

  return (
    <div className="p-8 max-w-3xl">
      <button
        onClick={() => navigate('/retail/products')}
        className="flex items-center gap-1 text-sm text-muted hover:text-brand-teal mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to products
      </button>

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h1 className="text-lg font-bold text-brand-teal leading-snug">{product.title.value ?? 'Product'}</h1>
          <p className="text-muted text-sm mt-0.5">
            {product.brand.value ?? ''} · {product.category.value ?? ''} · ASIN: {product.asin.value ?? '—'}
          </p>
        </div>
        <StatusBadge status={product.status} />
      </div>

      {/* Product image + quick stats */}
      <div className="flex items-start gap-4 mb-5 bg-surface rounded-xl border border-gray-100 shadow-card p-4">
        {product.imageUrls.value?.[0] ? (
          <img
            src={product.imageUrls.value[0]}
            alt={product.title.value ?? ''}
            className="w-24 h-24 object-contain rounded-lg border border-gray-100 shrink-0 bg-white"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-24 h-24 bg-background rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
            <Tag className="w-8 h-8 text-muted" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-bold text-text-primary">
              {product.currentPriceSar.value != null ? `SAR ${product.currentPriceSar.value}` : '—'}
            </span>
            {product.originalPriceSar.value && (
              <span className="text-sm text-muted line-through">SAR {product.originalPriceSar.value}</span>
            )}
            {product.discountPercent.value && (
              <span className="text-sm font-bold text-success">-{product.discountPercent.value}%</span>
            )}
          </div>
          {product.rating.value != null && (
            <div className="flex items-center gap-1 text-sm text-muted">
              <Star className="w-4 h-4 text-brand-orange fill-brand-orange" />
              {product.rating.value} · {product.reviewCount.value?.toLocaleString() ?? 0} reviews
            </div>
          )}
          {product.badgeText && (
            <span className="mt-2 inline-block text-xs font-medium bg-brand-orange-soft text-brand-orange px-2 py-0.5 rounded-full">
              {product.badgeText}
            </span>
          )}
          {product.extractionWarnings.map((w, i) => (
            <p key={i} className="text-xs text-warning mt-1">{w}</p>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
        <h2 className="font-semibold text-text-primary mb-4">Extracted Attributes</h2>
        <div className="grid grid-cols-1 gap-2">
          <FieldRow label="Title" field={product.title} />
          <FieldRow label="Brand" field={product.brand} />
          <FieldRow label="Model" field={product.model} />
          <FieldRow label="Category" field={product.category} />
          <FieldRow label="Color" field={product.color} />
          <FieldRow label="Size" field={product.size} />
          <FieldRow label="Material" field={product.material} />
          <FieldRow label="Dimensions" field={product.dimensions} />
          <FieldRow label="Weight" field={product.weight} />
          <FieldRow label="Warranty" field={product.warranty} />
          <FieldRow label="Country of Origin" field={product.countryOfOrigin} />
          <FieldRow label="Package Contents" field={product.packageContents} renderValue={(v) => v.join(', ')} />
          <FieldRow label="Compatibility" field={product.compatibility} renderValue={(v) => v.join(', ')} />
        </div>

        {product.technicalSpecifications.value && Object.keys(product.technicalSpecifications.value).length > 0 && (
          <div className="mt-3 p-3 bg-background rounded-lg">
            <p className="text-xs font-medium text-muted mb-2">Technical Specifications</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(product.technicalSpecifications.value).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-muted font-medium">{k}:</span>
                  <span className="text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Merchant answers */}
      {product.merchantAnswers && Object.keys(product.merchantAnswers).length > 0 && (
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
          <h2 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" /> Merchant Answers
          </h2>
          <div className="space-y-1">
            {Object.entries(product.merchantAnswers).map(([k, v]) => (
              <div key={k} className="flex gap-3 text-sm">
                <span className="text-muted font-medium w-32 shrink-0">{k}:</span>
                <span className="text-text-primary">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing info */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Missing Information</h2>
          <button
            onClick={handleLoadQuestions}
            disabled={loadingQ}
            className="flex items-center gap-1.5 text-xs text-brand-teal font-medium hover:text-teal-800 disabled:opacity-50"
          >
            {loadingQ ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Info className="w-3 h-3" />}
            Load questions
          </button>
        </div>
        {questions && (
          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-success">All key fields are present!</p>
            ) : (
              questions.map((q) => (
                <div key={q.field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-primary">
                    {q.question}
                    {q.required && <span className="text-danger ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={answers[q.field] ?? ''}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.field]: e.target.value }))}
                    placeholder={`Enter ${q.field}...`}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                  />
                </div>
              ))
            )}
            {questions.length > 0 && (
              <button
                onClick={handleSaveAnswers}
                className="px-3 py-1.5 bg-brand-teal text-white rounded-lg text-xs font-medium hover:bg-teal-800"
              >
                Save answers
              </button>
            )}
          </div>
        )}
      </div>

      {/* Generate */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Generate Marketplace Listings</h2>
          {listing && (
            <button onClick={() => setShowListing(!showListing)} className="flex items-center gap-1 text-xs text-muted">
              {showListing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showListing ? 'Hide' : 'Show'} listings
            </button>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50"
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {generating ? 'Generating...' : listing ? 'Regenerate' : 'Generate Amazon + Noon listings'}
        </button>

        {error && <div className="mt-3 bg-danger/10 text-danger rounded-lg p-3 text-sm">{error}</div>}

        {listing && showListing && (
          <div className="mt-4">
            {/* Tab selector */}
            <div className="flex border-b border-gray-200 mb-4">
              {(['amazon', 'noon'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-brand-teal text-brand-teal'
                      : 'border-transparent text-muted hover:text-text-primary'
                  }`}
                >
                  {tab === 'amazon' ? 'Amazon Style' : 'Noon Style'}
                </button>
              ))}
            </div>

            {activeTab === 'amazon' && (
              <div className="space-y-3">
                <div className="p-3 bg-background rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted">Title</span>
                    <button onClick={() => copy(listing.amazon.title, 'az-title')} className="text-muted hover:text-brand-teal">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-text-primary">{listing.amazon.title}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs font-medium text-muted mb-2">Bullet Points</p>
                  {listing.amazon.bullets.map((b, i) => (
                    <p key={i} className="text-sm text-text-primary">• {b}</p>
                  ))}
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs font-medium text-muted mb-1">Description</p>
                  <p className="text-sm text-text-primary leading-relaxed">{listing.amazon.description}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs font-medium text-muted mb-1">Search Keywords</p>
                  <p className="text-xs text-text-primary">{listing.amazon.searchKeywords.join(', ')}</p>
                </div>
              </div>
            )}

            {activeTab === 'noon' && (
              <div className="space-y-3">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs font-medium text-muted mb-1">Title</p>
                  <p className="text-sm font-medium text-text-primary">{listing.noon.title}</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs font-medium text-muted mb-2">Highlights</p>
                  {listing.noon.highlights.map((h, i) => (
                    <p key={i} className="text-sm text-text-primary">• {h}</p>
                  ))}
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs font-medium text-muted mb-1">Description</p>
                  <p className="text-sm text-text-primary leading-relaxed">{listing.noon.description}</p>
                </div>
              </div>
            )}

            <div className="mt-3 p-3 bg-background rounded-lg text-xs">
              {listing.unsupportedFactsAdded.length === 0 ? (
                <p className="text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No unsupported facts added</p>
              ) : (
                <p className="text-danger">⚠️ Unsupported: {listing.unsupportedFactsAdded.join(', ')}</p>
              )}
              {listing.remainingMissingFields.length > 0 && (
                <p className="text-warning mt-0.5">Still missing: {listing.remainingMissingFields.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Refine */}
      {listing && (
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
          <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Refine
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              placeholder='e.g. "Make title shorter", "Emphasize the discount"'
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refineText.trim()}
              className="px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {refining ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Refine'}
            </button>
          </div>
        </div>
      )}

      {/* Approve */}
      {listing && product.status !== 'approved' && (
        <button
          onClick={async () => { const r = await approveRetailProduct(id!); setProduct(r.product); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-xl font-semibold hover:bg-green-700"
        >
          <ThumbsUp className="w-4 h-4" /> Approve listing
        </button>
      )}

      {product.status === 'approved' && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <p className="font-medium text-success">Listing approved — export from Exports page.</p>
        </div>
      )}
    </div>
  );
}
