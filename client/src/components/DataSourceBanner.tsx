import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  mode: 'live' | 'demo' | 'cached' | string;
  className?: string;
}

export function DataSourceBanner({ mode, className = '' }: Props) {
  if (mode === 'live') {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg text-sm ${className}`}>
        <CheckCircle className="w-4 h-4 shrink-0" />
        Live extracted data
      </div>
    );
  }
  if (mode === 'cached') {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm ${className}`}>
        <Info className="w-4 h-4 shrink-0" />
        Extracted from saved HTML snapshot
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-2 px-4 py-2 bg-warning/10 text-warning rounded-lg text-sm ${className}`}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span><strong>Demo fixture</strong> — Amazon blocked automated access. Place a saved page in <code className="font-mono text-xs">data/raw/amazon_page.html</code> or set <code className="font-mono text-xs">QWEN_API_KEY</code> to attempt live extraction.</span>
    </div>
  );
}
