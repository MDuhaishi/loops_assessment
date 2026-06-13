import { useEffect, useState } from 'react';
import { Download, FileText, FileJson, CheckCircle } from 'lucide-react';
import { getRestaurantProducts, getRetailProducts } from '../api/client';
import type { RestaurantProduct, RetailProduct } from '../types';

function ExportCard({
  title,
  description,
  csvUrl,
  jsonUrl,
  count,
  approvedCount,
}: {
  title: string;
  description: string;
  csvUrl: string;
  jsonUrl: string;
  count: number;
  approvedCount: number;
}) {
  return (
    <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-6">
      <h2 className="font-semibold text-text-primary mb-1">{title}</h2>
      <p className="text-sm text-muted mb-4">{description}</p>

      <div className="flex items-center gap-4 mb-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted">Total:</span>
          <span className="font-medium text-text-primary">{count}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-success" />
          <span className="text-muted">Approved:</span>
          <span className="font-medium text-success">{approvedCount}</span>
        </div>
      </div>

      {count === 0 ? (
        <p className="text-sm text-muted italic">No products loaded yet.</p>
      ) : (
        <div className="flex gap-3">
          <a
            href={csvUrl}
            download
            className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export CSV
          </a>
          <a
            href={jsonUrl}
            download
            className="flex items-center gap-2 px-4 py-2 border border-brand-teal text-brand-teal rounded-lg text-sm font-medium hover:bg-brand-teal-soft transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Export JSON
          </a>
        </div>
      )}
    </div>
  );
}

export default function Exports() {
  const [restProducts, setRestProducts] = useState<RestaurantProduct[]>([]);
  const [retailProducts, setRetailProducts] = useState<RetailProduct[]>([]);

  useEffect(() => {
    getRestaurantProducts().then((r) => setRestProducts(r.products)).catch(() => {});
    getRetailProducts().then((r) => setRetailProducts(r.products)).catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-teal">Exports</h1>
        <p className="text-muted text-sm mt-1">
          Download your approved product catalogs as CSV or JSON. All products are exported (not just approved ones) — filter by status in your downstream tool.
        </p>
      </div>

      <div className="space-y-5">
        <ExportCard
          title="Restaurant Catalog"
          description="All extracted Kudu menu products with bilingual titles, descriptions, and generated listings."
          csvUrl="/api/export/restaurant.csv"
          jsonUrl="/api/export/restaurant.json"
          count={restProducts.length}
          approvedCount={restProducts.filter((p) => p.status === 'approved').length}
        />

        <ExportCard
          title="Retail Catalog"
          description="Amazon SA deals page products with marketplace-ready listings (Amazon + Noon formats)."
          csvUrl="/api/export/retail.csv"
          jsonUrl="/api/export/retail.json"
          count={retailProducts.length}
          approvedCount={retailProducts.filter((p) => p.status === 'approved').length}
        />
      </div>

      <div className="mt-8 p-4 bg-background rounded-xl border border-gray-200 text-sm text-muted">
        <div className="flex items-start gap-2">
          <Download className="w-4 h-4 mt-0.5 shrink-0 text-brand-teal" />
          <div>
            <p className="font-medium text-text-primary mb-1">Export notes</p>
            <ul className="space-y-1 text-xs">
              <li>• CSV exports flatten nested fields. JSON preserves full provenance data.</li>
              <li>• These are catalog exports, not platform submissions. Use official APIs for live listing updates.</li>
              <li>• Products with <code>status: approved</code> have been reviewed and accepted by the merchant.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
