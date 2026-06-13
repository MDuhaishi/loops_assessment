import type { EvidenceSource } from '../types';

const labels: Record<EvidenceSource, { label: string; className: string }> = {
  source_document: { label: 'Found in PDF', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  scraped_page: { label: 'Scraped', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  merchant_input: { label: 'Merchant input', className: 'bg-green-50 text-green-700 border-green-200' },
  ai_generated: { label: 'AI generated', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  derived_rule: { label: 'Derived', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

export function ProvenanceBadge({ source }: { source: EvidenceSource }) {
  const { label, className } = labels[source];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${className}`}>
      {label}
    </span>
  );
}
