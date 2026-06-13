import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, CheckCircle, Wand2, MessageSquare,
  ThumbsUp, Copy, RefreshCw, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import {
  getRestaurantProduct,
  getRestaurantQuestions,
  generateRestaurantListing,
  refineRestaurantListing,
  approveRestaurantProduct,
  updateRestaurantProduct,
} from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { ProvenanceBadge } from '../../components/ProvenanceBadge';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import type { RestaurantProduct, MissingFieldQuestion, GeneratedListing, FieldEvidence } from '../../types';

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
  const low = field.confidence < 0.6;
  const missing = field.value === null;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${missing ? 'bg-danger/5 border border-danger/10' : low ? 'bg-warning/5 border border-warning/10' : 'bg-background'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
          <ProvenanceBadge source={field.source} />
          <ConfidenceBadge confidence={field.confidence} />
          {field.sourceRef && <span className="text-[10px] text-muted/60">{field.sourceRef}</span>}
        </div>
        {display != null ? (
          <p className="text-sm text-text-primary">{display}</p>
        ) : (
          <p className="text-xs text-danger flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Missing
          </p>
        )}
      </div>
    </div>
  );
}

export default function RestaurantProductEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<RestaurantProduct | null>(null);
  const [questions, setQuestions] = useState<MissingFieldQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQ, setLoadingQ] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showListing, setShowListing] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!id) return;
    getRestaurantProduct(id)
      .then((r) => setProduct(r.product))
      .catch(() => navigate('/restaurant/products'));
  }, [id]);

  async function handleLoadQuestions() {
    if (!id) return;
    setLoadingQ(true);
    try {
      const r = await getRestaurantQuestions(id);
      setQuestions(r.questions);
    } finally {
      setLoadingQ(false);
    }
  }

  async function handleSaveAnswers() {
    if (!id || !product) return;
    const merchantAnswers = { ...(product.merchantAnswers ?? {}), ...answers };
    const r = await updateRestaurantProduct(id, { merchantAnswers });
    setProduct(r.product);
    setAnswers({});
  }

  async function handleGenerate() {
    if (!id) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await generateRestaurantListing(id);
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
      const r = await refineRestaurantListing(id, refineText);
      setProduct(r.product);
      setRefineText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefining(false);
    }
  }

  async function handleApprove() {
    if (!id) return;
    const r = await approveRestaurantProduct(id);
    setProduct(r.product);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  if (!product) return <div className="p-8 text-muted">Loading...</div>;

  const listing: GeneratedListing | undefined = product.generatedListing;

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <button
        onClick={() => navigate('/restaurant/products')}
        className="flex items-center gap-1 text-sm text-muted hover:text-brand-teal mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to products
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-teal">{product.nameEn.value ?? 'Product'}</h1>
          <p className="text-muted text-sm">{product.nameAr.value ?? ''}</p>
        </div>
        <StatusBadge status={product.status} />
      </div>

      {/* Extraction warnings */}
      {product.extractionWarnings.length > 0 && (
        <div className="mb-4 bg-warning/5 border border-warning/20 rounded-lg p-3">
          {product.extractionWarnings.map((w, i) => (
            <p key={i} className="text-xs text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      {/* Product fields */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
        <h2 className="font-semibold text-text-primary mb-4">Extracted Fields</h2>
        <div className="grid grid-cols-1 gap-2">
          <FieldRow label="English Name" field={product.nameEn} />
          <FieldRow label="Arabic Name" field={product.nameAr} />
          <FieldRow label="Category" field={product.category} />
          <FieldRow label="Base Price (SAR)" field={product.basePriceSar} renderValue={(v) => `SAR ${v}`} />
          <FieldRow label="English Description" field={product.descriptionEn} />
          <FieldRow label="Arabic Description" field={product.descriptionAr} />
          <FieldRow label="Ingredients" field={product.ingredients} renderValue={(v) => v.join(', ')} />
          <FieldRow label="Toppings" field={product.toppings} renderValue={(v) => v.join(', ')} />
          <FieldRow label="Sauces" field={product.sauces} renderValue={(v) => v.join(', ')} />
          <FieldRow label="Allergens" field={product.allergens} renderValue={(v) => v.length ? v.join(', ') : 'None listed'} />
          <FieldRow label="Calories" field={product.calories} renderValue={(v) => `${v} kcal`} />
          <FieldRow label="Serving Type" field={product.servingType} />
        </div>

        {product.sizes.length > 0 && (
          <div className="mt-3 p-3 bg-background rounded-lg">
            <p className="text-xs font-medium text-muted mb-2">Sizes</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s, i) => (
                <span key={i} className="px-2 py-1 bg-surface border border-gray-200 rounded text-xs">
                  {s.label}{s.priceSar ? ` — SAR ${s.priceSar}` : ''}
                </span>
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
          <div className="space-y-2">
            {Object.entries(product.merchantAnswers).map(([k, v]) => (
              <div key={k} className="flex gap-3 text-sm">
                <span className="text-muted font-medium w-32 shrink-0">{k}:</span>
                <span className="text-text-primary">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing info assistant */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Missing Information</h2>
          <button
            onClick={handleLoadQuestions}
            disabled={loadingQ}
            className="flex items-center gap-1.5 text-xs text-brand-orange font-medium hover:text-orange-500 disabled:opacity-50"
          >
            {loadingQ ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Info className="w-3 h-3" />}
            Load questions
          </button>
        </div>

        {questions && (
          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-success">No missing required information!</p>
            ) : (
              questions.map((q) => (
                <div key={q.field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-primary">
                    {q.question}
                    {q.required && <span className="text-danger ml-1">*</span>}
                  </label>
                  {q.hint && <p className="text-xs text-muted">{q.hint}</p>}
                  <input
                    type="text"
                    value={answers[q.field] ?? ''}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.field]: e.target.value }))}
                    placeholder={`Enter ${q.field}...`}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
                  />
                </div>
              ))
            )}
            {questions.length > 0 && (
              <button
                onClick={handleSaveAnswers}
                className="mt-2 px-3 py-1.5 bg-brand-teal text-white rounded-lg text-xs font-medium hover:bg-teal-800 transition-colors"
              >
                Save answers
              </button>
            )}
          </div>
        )}
      </div>

      {/* Generate listing */}
      {product.status !== 'needs_review' && (
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Generate Listing</h2>
            {listing && (
              <button
                onClick={() => setShowListing(!showListing)}
                className="flex items-center gap-1 text-xs text-muted hover:text-brand-teal"
              >
                {showListing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showListing ? 'Hide' : 'Show'} listing
              </button>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? 'Generating...' : listing ? 'Regenerate listing' : 'Generate listing'}
          </button>

          {error && (
            <div className="mt-3 bg-danger/10 text-danger rounded-lg p-3 text-sm">{error}</div>
          )}

          {listing && showListing && (
            <div className="mt-4 space-y-4">
              {/* Titles */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-background rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted">English Title</span>
                    <button onClick={() => copy(listing.titleEn, 'titleEn')} className="text-muted hover:text-brand-teal">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-text-primary font-medium">{listing.titleEn}</p>
                  {copied === 'titleEn' && <span className="text-xs text-success">Copied!</span>}
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted">Arabic Title</span>
                    <button onClick={() => copy(listing.titleAr, 'titleAr')} className="text-muted hover:text-brand-teal">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-text-primary font-medium" dir="rtl">{listing.titleAr}</p>
                </div>
              </div>

              {/* Descriptions */}
              <div className="p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted">English Description</span>
                  <button onClick={() => copy(listing.descriptionEn, 'descEn')} className="text-muted hover:text-brand-teal">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{listing.descriptionEn}</p>
              </div>

              <div className="p-3 bg-background rounded-lg" dir="rtl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted" dir="ltr">Arabic Description</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{listing.descriptionAr}</p>
              </div>

              {listing.allergenStatementEn && (
                <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <span className="text-xs font-medium text-warning">Allergen Statement: </span>
                  <span className="text-xs text-text-primary">{listing.allergenStatementEn}</span>
                </div>
              )}

              {/* Provenance */}
              <div className="p-3 bg-background rounded-lg text-xs">
                <p className="font-medium text-muted mb-1">Facts used: {listing.factsUsed.join(', ')}</p>
                {listing.unsupportedFactsAdded.length > 0 ? (
                  <p className="text-danger">⚠️ Unsupported facts: {listing.unsupportedFactsAdded.join(', ')}</p>
                ) : (
                  <p className="text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No unsupported facts added</p>
                )}
                {listing.remainingMissingFields.length > 0 && (
                  <p className="text-warning mt-0.5">Still missing: {listing.remainingMissingFields.join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refinement */}
      {listing && (
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5 mb-5">
          <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Refine Listing
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              placeholder='e.g. "Make it shorter", "Mention jalapeños first", "More premium tone"'
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refineText.trim()}
              className="px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50"
            >
              {refining ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Refine'}
            </button>
          </div>
          <p className="text-xs text-muted mt-2">Refinement preserves verified facts — it only changes wording and structure.</p>
        </div>
      )}

      {/* Approve */}
      {listing && product.status !== 'approved' && (
        <button
          onClick={handleApprove}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
        >
          <ThumbsUp className="w-4 h-4" /> Approve listing
        </button>
      )}

      {product.status === 'approved' && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="font-medium text-success">Listing approved</p>
            <p className="text-xs text-muted">Export from the Exports page.</p>
          </div>
        </div>
      )}
    </div>
  );
}
