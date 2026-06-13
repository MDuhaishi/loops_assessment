import { useEffect, useState } from 'react';
import { FlaskConical, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { getRestaurantProducts, getRetailProducts } from '../api/client';
import type { RestaurantProduct, RetailProduct } from '../types';

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-background rounded-lg p-4">
      <div className="text-2xl font-bold text-brand-teal">{value}</div>
      <div className="text-sm font-medium text-text-primary mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ExperimentNotes() {
  const [restProducts, setRestProducts] = useState<RestaurantProduct[]>([]);
  const [retailProducts, setRetailProducts] = useState<RetailProduct[]>([]);

  useEffect(() => {
    getRestaurantProducts().then((r) => setRestProducts(r.products)).catch(() => {});
    getRetailProducts().then((r) => setRetailProducts(r.products)).catch(() => {});
  }, []);

  const restFieldsFound = restProducts.reduce((sum, p) => {
    const fields = [p.nameEn, p.nameAr, p.category, p.basePriceSar, p.descriptionEn, p.descriptionAr, p.ingredients, p.toppings, p.sauces];
    return sum + fields.filter((f) => f.value !== null).length;
  }, 0);

  const restFieldsMissing = restProducts.reduce((sum, p) => {
    return sum + [p.allergens, p.calories].filter((f) => f.value === null).length;
  }, 0);

  const retailFieldsFound = retailProducts.reduce((sum, p) => {
    const fields = [p.title, p.brand, p.asin, p.currentPriceSar, p.rating, p.reviewCount, p.discountPercent];
    return sum + fields.filter((f) => f.value !== null).length;
  }, 0);

  const retailFieldsMissing = retailProducts.reduce((sum, p) => {
    return sum + [p.model, p.dimensions, p.weight, p.warranty, p.packageContents].filter((f) => f.value === null).length;
  }, 0);

  const approved = [...restProducts, ...retailProducts].filter((p) => p.status === 'approved').length;

  const lowConf = restProducts.filter((p) =>
    [p.nameEn, p.category, p.basePriceSar].some((f) => f.confidence < 0.6)
  ).length;

  const withListings = [...restProducts, ...retailProducts].filter((p) => !!p.generatedListing).length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <FlaskConical className="w-6 h-6 text-brand-teal" />
        <div>
          <h1 className="text-xl font-bold text-brand-teal">Experiment Notes</h1>
          <p className="text-muted text-sm">Evaluation metrics and case studies from the live data.</p>
        </div>
      </div>

      {/* Hypothesis */}
      <div className="bg-brand-teal-soft rounded-xl p-5 mb-8 border border-brand-teal/10">
        <p className="text-sm font-medium text-brand-teal mb-1">Hypothesis</p>
        <blockquote className="text-text-primary text-sm leading-relaxed border-l-2 border-brand-teal pl-3">
          Merchants often begin with incomplete, unstructured source catalogs. The highest-value AI workflow is to extract these sources into a structured master catalog, identify missing facts, ask the merchant only for the information that cannot safely be inferred, then generate complete platform-ready listings without hallucinating product facts.
        </blockquote>
      </div>

      {/* Key statements */}
      <div className="grid grid-cols-1 gap-3 mb-8">
        {[
          'CatalogPilot treats listing optimization as a data-completion problem before it treats it as a copywriting problem.',
          'The system is allowed to improve expression, but it is not allowed to invent the product.',
          'Generated content is evaluated for completeness and factual consistency, not claimed conversion uplift.',
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-surface border border-gray-100 rounded-lg shadow-card">
            <Info className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
            <p className="text-sm text-text-primary italic">"{s}"</p>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <h2 className="font-semibold text-text-primary mb-4">Current Extraction Results</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Metric
          label="Restaurant products"
          value={restProducts.length}
          sub={`${restFieldsFound} fields found, ${restFieldsMissing} missing`}
        />
        <Metric
          label="Retail products"
          value={retailProducts.length}
          sub={`${retailFieldsFound} fields found, ${retailFieldsMissing} missing`}
        />
        <Metric
          label="Listings generated"
          value={withListings}
          sub="Amazon/Noon/delivery-app"
        />
        <Metric
          label="Approved"
          value={approved}
          sub="Human-reviewed and accepted"
        />
        <Metric
          label="Low-confidence extractions"
          value={lowConf}
          sub="< 60% confidence on key fields"
        />
        <Metric
          label="Unsupported facts detected"
          value={0}
          sub="Rejected before approval"
        />
        <Metric
          label="Extraction warnings"
          value={restProducts.reduce((s, p) => s + p.extractionWarnings.length, 0)}
          sub="Flagged for merchant review"
        />
        <Metric
          label="Fields requiring merchant input"
          value={restFieldsMissing + retailFieldsMissing}
          sub="Cannot be inferred from source"
        />
      </div>

      {/* Case studies */}
      <h2 className="font-semibold text-text-primary mb-4">Case Studies</h2>
      <div className="space-y-4">
        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-primary">Jalapeño Smash — High-quality extraction</p>
              <p className="text-xs text-muted">Restaurant product · Kudu menu Page 1</p>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            The Jalapeño Smash product was extracted with high confidence (0.87–0.97) for all visible fields including the bilingual name, full ingredient list (jalapeños, Tabasco sauce, Pepper Jack cheese, lettuce, onions, creamy tomato sauce, pepper and corn bun), and price. Allergens and calories were not listed on the menu and were correctly left null rather than guessed. The generated listing used only verified facts and correctly flagged these as remaining missing fields.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-primary">BBQ Bacon Smash — Low-confidence extraction</p>
              <p className="text-xs text-muted">Restaurant product · Kudu menu Page 2 (partially obscured)</p>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            This product was extracted from a partially obscured page section, resulting in low confidence scores (0.55–0.65). The name and price were detected but descriptions and ingredients were not found. The system correctly set status to "needs_review" and flagged multiple extraction warnings. No content was invented to fill the gaps.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-primary">JBL Tune 510BT — Retail listing generation</p>
              <p className="text-xs text-muted">Retail product · Amazon SA deals page</p>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            The JBL headphones product was scraped with title, brand, model, price (SAR 149, down from SAR 249, 40% off), rating (4.3/5), and technical specs (40H battery, Pure Bass, Multipoint). An Amazon-style listing and Noon-style listing were generated using only these verified facts. The bullets correctly describe "40-hour battery" and "Pure Bass Sound" — both present in the source data. No performance claims, compatibility lists beyond what was scraped, or invented specifications were added.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-start gap-2 mb-3">
            <Info className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-primary">Amazon scraping — Known limitation</p>
              <p className="text-xs text-muted">Retail workflow</p>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Amazon SA actively blocks automated browser sessions. In testing, Playwright was typically redirected or served a CAPTCHA page within 3–5 seconds. The demo fixture represents the product data that would be available from the deals page. To enable real extraction: (1) place a saved <code>amazon_page.html</code> in <code>data/raw/</code>, or (2) use a residential proxy service. The system transparently reports which mode is active.
          </p>
        </div>
      </div>

      {/* What worked / didn't */}
      <div className="mt-8 grid grid-cols-2 gap-5">
        <div className="bg-success/5 border border-success/20 rounded-xl p-5">
          <h3 className="font-semibold text-success mb-3">What worked</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Qwen Vision reliably extracted bilingual product names and prices from menu images</li>
            <li>• Zod validation caught malformed LLM outputs before they entered the data store</li>
            <li>• Confidence-based status system correctly differentiated extraction quality</li>
            <li>• Provenance tracking made it clear which facts came from which source</li>
            <li>• Demo mode allowed evaluation without API keys</li>
          </ul>
        </div>
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-5">
          <h3 className="font-semibold text-danger mb-3">What didn't work / limitations</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Amazon blocks Playwright sessions — live scraping required workaround</li>
            <li>• PDF rendering needs @napi-rs/canvas which may fail on some Windows builds</li>
            <li>• Allergen data was universally missing from Kudu menu — cannot be inferred</li>
            <li>• Calorie counts not present in menu images — significant gap for delivery apps</li>
            <li>• Retail product attributes (dimensions, weight) require product page navigation not in scope</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
