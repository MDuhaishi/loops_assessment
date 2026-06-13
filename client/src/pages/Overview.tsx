import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingBag,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react';
import { getRestaurantProducts, getRetailProducts, getAppMode } from '../api/client';
import type { RestaurantProduct, RetailProduct, AppMode } from '../types';

function WorkflowStep({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        active ? 'bg-brand-orange text-white' : 'bg-brand-teal-soft text-brand-teal'
      }`}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AppMode | null>(null);
  const [restProducts, setRestProducts] = useState<RestaurantProduct[]>([]);
  const [retailProducts, setRetailProducts] = useState<RetailProduct[]>([]);

  useEffect(() => {
    getAppMode().then(setMode).catch(() => {});
    getRestaurantProducts().then((r) => setRestProducts(r.products)).catch(() => {});
    getRetailProducts().then((r) => setRetailProducts(r.products)).catch(() => {});
  }, []);

  const restStats = {
    total: restProducts.length,
    approved: restProducts.filter((p) => p.status === 'approved').length,
    ready: restProducts.filter((p) => p.status === 'ready_to_generate').length,
    missing: restProducts.filter((p) => p.status === 'missing_details').length,
    review: restProducts.filter((p) => p.status === 'needs_review').length,
  };

  const retailStats = {
    total: retailProducts.length,
    approved: retailProducts.filter((p) => p.status === 'approved').length,
    ready: retailProducts.filter((p) => p.status === 'ready_to_generate').length,
    missing: retailProducts.filter((p) => p.status === 'missing_details').length,
    review: retailProducts.filter((p) => p.status === 'needs_review').length,
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-brand-teal">CatalogPilot</h1>
          {mode && !mode.qwenAvailable && (
            <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs font-medium rounded-full">
              Demo Mode
            </span>
          )}
          {mode?.qwenAvailable && (
            <span className="px-2 py-0.5 bg-success/10 text-success text-xs font-medium rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" /> Qwen Connected
            </span>
          )}
        </div>
        <p className="text-muted text-sm">Turn messy merchant catalogs into verified, platform-ready listings.</p>
      </div>

      {/* Workflow Line */}
      <div className="bg-surface rounded-xl border border-gray-100 p-4 mb-8 shadow-card">
        <p className="text-xs text-muted mb-3 font-medium uppercase tracking-wide">Workflow</p>
        <div className="flex flex-wrap items-center gap-2">
          {['Source', 'Extract', 'Verify', 'Complete', 'Generate', 'Approve', 'Export'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <WorkflowStep label={step} />
              {i < 6 && <ArrowRight className="w-3 h-3 text-muted" />}
            </div>
          ))}
        </div>
      </div>

      {/* Mode Info */}
      {mode && (
        <div className={`rounded-xl p-4 mb-8 border ${mode.demoMode ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'}`}>
          <div className="flex items-start gap-3">
            {mode.demoMode ? (
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {mode.demoMode ? 'Demo Mode Active' : 'Live Mode Active'}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {mode.demoMode
                  ? 'No QWEN_API_KEY detected. Using cached extraction results and demo fixtures. Add your key to .env to enable real AI extraction.'
                  : `Qwen connected. Vision model: ${mode.visionModel}. Text model: ${mode.textModel}.`}
              </p>
              {mode.pdfFound && (
                <p className="text-xs text-muted mt-1">PDF: <code className="font-mono">{mode.pdfName}</code></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Merchant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Restaurant Card */}
        <div
          className="bg-surface rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer group"
          onClick={() => navigate('/restaurant')}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-orange-soft flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">Restaurant Catalog</h2>
                <p className="text-xs text-muted">Kudu menu PDF → delivery-app listings</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-4">
              Extract an image-based menu PDF, complete missing product details, and generate delivery-app-ready listings with bilingual Arabic and English copy.
            </p>

            {restStats.total > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-background rounded-lg">
                <StatCard label="Total" value={restStats.total} color="text-brand-teal" />
                <StatCard label="Ready" value={restStats.ready} color="text-success" />
                <StatCard label="Missing" value={restStats.missing} color="text-warning" />
                <StatCard label="Approved" value={restStats.approved} color="text-brand-orange" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {restStats.total} products loaded
              </span>
              <div className="flex items-center gap-1 text-brand-orange text-sm font-medium group-hover:gap-2 transition-all">
                Open workflow <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Retail Card */}
        <div
          className="bg-surface rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer group"
          onClick={() => navigate('/retail')}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-teal-soft flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-brand-teal" />
              </div>
              <div>
                <h2 className="font-semibold text-text-primary">Retail Catalog</h2>
                <p className="text-xs text-muted">Amazon SA deals → marketplace listings</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-4">
              Import products from an existing seller page, complete marketplace attributes, and generate Amazon/Noon-ready listings from verified product facts only.
            </p>

            {retailStats.total > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-background rounded-lg">
                <StatCard label="Total" value={retailStats.total} color="text-brand-teal" />
                <StatCard label="Ready" value={retailStats.ready} color="text-success" />
                <StatCard label="Missing" value={retailStats.missing} color="text-warning" />
                <StatCard label="Approved" value={retailStats.approved} color="text-brand-orange" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {retailStats.total} products loaded
              </span>
              <div className="flex items-center gap-1 text-brand-teal text-sm font-medium group-hover:gap-2 transition-all">
                Open workflow <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs */}
      {mode?.recentRuns && mode.recentRuns.length > 0 && (
        <div className="mt-8 bg-surface rounded-xl border border-gray-100 shadow-card p-6">
          <h3 className="font-semibold text-text-primary mb-4">Recent Extraction Runs</h3>
          <div className="space-y-2">
            {mode.recentRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <Clock className="w-3.5 h-3.5 text-muted" />
                  <span className="text-text-primary">{run.sourceName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${run.mode === 'live' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {run.mode}
                  </span>
                </div>
                <span className="text-muted">{run.itemCount} items · {new Date(run.startedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
