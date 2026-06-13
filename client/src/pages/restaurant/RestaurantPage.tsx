import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { getRestaurantStatus, extractRestaurant } from '../../api/client';

interface Status {
  pdfFound: boolean;
  pdfName: string | null;
  productCount: number;
  isLive: boolean;
  mode: string;
  qwenAvailable: boolean;
}

export default function RestaurantPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRestaurantStatus().then(setStatus).catch(() => {});
  }, []);

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    setLogs([]);
    try {
      const result = await extractRestaurant();
      setLogs(result.logs ?? []);
      if (result.warnings.length) setLogs((p) => [...p, ...result.warnings.map((w) => '⚠️ ' + w)]);
      getRestaurantStatus().then(setStatus).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-teal">Restaurant Catalog</h1>
        <p className="text-muted text-sm mt-1">Extract the Kudu menu PDF and generate delivery-app-ready product listings.</p>
      </div>

      {/* Source info */}
      <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-6 mb-6">
        <h2 className="font-semibold text-text-primary mb-4">Source Document</h2>
        <div className="flex items-start gap-4">
          <div className="w-12 h-14 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            {status?.pdfFound ? (
              <>
                <p className="font-medium text-text-primary">{status.pdfName}</p>
                <p className="text-xs text-muted mt-1">Image-based PDF menu — pages rendered for vision extraction</p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">PDF not found in <code className="font-mono text-xs">assets/</code></p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Mode:</span>
                <span className={`text-xs font-medium ${status?.isLive ? 'text-success' : 'text-warning'}`}>
                  {status?.isLive ? 'Live extracted' : 'Demo data'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Products:</span>
                <span className="text-xs font-medium text-text-primary">{status?.productCount ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Extraction pipeline */}
        <div className="mt-5 p-3 bg-background rounded-lg">
          <p className="text-xs text-muted font-medium mb-2">Extraction pipeline</p>
          <div className="flex flex-wrap gap-2 items-center text-xs text-muted">
            <span className="px-2 py-1 bg-white border border-gray-200 rounded">Find PDF</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-1 bg-white border border-gray-200 rounded">Render pages → PNG</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-1 bg-white border border-gray-200 rounded">Qwen Vision extraction</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-1 bg-white border border-gray-200 rounded">Normalize + deduplicate</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-1 bg-white border border-gray-200 rounded">Cache to data/</span>
          </div>
        </div>

        {/* Action */}
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={handleExtract}
            disabled={extracting || !status?.pdfFound}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extracting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {extracting ? 'Extracting...' : 'Extract menu products'}
          </button>
          {!status?.qwenAvailable && (
            <p className="text-xs text-muted">
              No API key — will use demo data
            </p>
          )}
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-4 bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
            {logs.map((log, i) => (
              <p key={i} className="text-xs font-mono text-green-400">{log}</p>
            ))}
          </div>
        )}
        {error && (
          <div className="mt-4 bg-danger/10 text-danger rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Go to products */}
      {(status?.productCount ?? 0) > 0 && (
        <div
          className="bg-surface rounded-xl border border-brand-orange/20 shadow-card p-5 flex items-center justify-between cursor-pointer hover:shadow-card-hover transition-shadow"
          onClick={() => navigate('/restaurant/products')}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-success" />
            <div>
              <p className="font-medium text-text-primary">{status?.productCount} products ready</p>
              <p className="text-xs text-muted">Review, complete details, and generate listings</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-brand-orange font-medium text-sm">
            View products <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}
