export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.85 ? 'text-success' : confidence >= 0.6 ? 'text-warning' : 'text-danger';
  return (
    <span className={`text-xs font-mono ${color}`} title={`Confidence: ${pct}%`}>
      {pct}%
    </span>
  );
}
