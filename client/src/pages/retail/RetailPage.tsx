import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, CheckCircle, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { getRetailStatus, extractRetail } from '../../api/client';
import { DataSourceBanner } from '../../components/DataSourceBanner';

interface Status {
  productCount: number;
  isLive: boolean;
  mode: string;
  qwenAvailable: boolean;
}

export default function RetailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<{ mode: string; warnings: string[]; logs: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRetailStatus().then(setStatus).catch(() => {});
  }, []);

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    setResult(null);
    try {
      const r = await extractRetail();
      setResult({ mode: r.mode, warnings: r.warnings, logs: r.logs });
      getRetailStatus().then(setStatus).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-teal">Retail Catalog</h1>
        <p className="text-muted text-sm mt-1">Import products from the Amazon SA deals page and generate marketplace listings.</p>
      </div>

      {/* Data source banner */}
      {(status || result) && (
        <DataSourceBanner mode={result?.mode ?? (status?.isLive ? 'live' : 'demo')} className="mb-5" />
      )}

      {/* Source info */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-6 mb-6">
        <h2 className="font-semibold text-text-primary mb-4">Source Page</h2>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-text-primary">Amazon SA Deals Page</p>
            <a
              href="https://www.amazon.sa/stores/page/C70094F1-7970-411E-BEF6-8009746DB248/deals"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-teal hover:underline flex items-center gap-1 mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              amazon.sa/stores/...deals <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-xs text-muted mt-1">Products scraped from this specific deals page only. No crawling of full catalog.</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Products:</span>
                <span className="text-xs font-medium text-text-primary">{status?.productCount ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Mode:</span>
                <span className={`text-xs font-medium ${status?.isLive ? 'text-success' : 'text-warning'}`}>
                  {status?.isLive ? 'Live extracted' : 'Demo data'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Extraction pipeline */}
        <div className="mt-5 p-3 bg-background rounded-lg">
          <p className="text-xs text-muted font-medium mb-2">Extraction + fallback chain</p>
          <div className="flex flex-col gap-1.5 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-brand-teal text-white flex items-center justify-center text-[10px] font-bold">1</span>
              Playwright live scrape → Amazon deals page
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-warning/30 text-warning flex items-center justify-center text-[10px] font-bold">2</span>
              If blocked → read <code>data/raw/amazon_page.html</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-danger/20 text-danger flex items-center justify-center text-[10px] font-bold">3</span>
              If unavailable → use <code>data/demo/amazon_products.json</code>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-50"
          >
            {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
            {extracting ? 'Extracting...' : 'Extract products'}
          </button>
          <p className="text-xs text-muted">Amazon may block automated access — a demo fallback will be used if needed.</p>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${result.mode === 'live' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            {result.mode === 'live' ? (
              <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Live extraction completed</p>
            ) : result.mode === 'cached' ? (
              <p>Using saved HTML snapshot</p>
            ) : (
              <p className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Using demo fixture data</p>
            )}
            {result.warnings.map((w, i) => (
              <p key={i} className="text-xs mt-1">{w}</p>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-danger/10 text-danger rounded-lg p-3 text-sm">{error}</div>
        )}
      </div>

      {/* Go to products */}
      {(status?.productCount ?? 0) > 0 && (
        <div
          className="bg-surface rounded-xl border border-brand-teal/20 shadow-card p-5 flex items-center justify-between cursor-pointer hover:shadow-card-hover transition-shadow"
          onClick={() => navigate('/retail/products')}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-success" />
            <div>
              <p className="font-medium text-text-primary">{status?.productCount} products ready</p>
              <p className="text-xs text-muted">Review extracted data, complete details, generate marketplace listings</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-brand-teal font-medium text-sm">
            View products <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}
