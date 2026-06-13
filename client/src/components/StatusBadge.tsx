import type { ProductStatus } from '../types';

const config: Record<ProductStatus, { label: string; className: string }> = {
  needs_review: { label: 'Needs Review', className: 'bg-danger/10 text-danger' },
  missing_details: { label: 'Missing Details', className: 'bg-warning/10 text-warning' },
  ready_to_generate: { label: 'Ready', className: 'bg-success/10 text-success' },
  approved: { label: 'Approved', className: 'bg-brand-teal/10 text-brand-teal' },
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
