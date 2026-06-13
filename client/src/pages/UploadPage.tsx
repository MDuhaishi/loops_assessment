import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { getAvailablePdfs, uploadPdf, extractRestaurantPdf } from '../api/client';

export default function UploadPage() {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAvailablePdfs().then((r) => {
      setPdfs(r.pdfs);
      if (r.pdfs.length === 1) setSelected(r.pdfs[0]);
    });
  }, []);

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) return;
    try {
      const r = await uploadPdf(file);
      setPdfs((p) => [...new Set([...p, r.filename])]);
      setSelected(r.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function handleExtract() {
    if (!selected) return;
    setExtracting(true);
    setError(null);
    setLogs([]);
    setDone(null);
    try {
      const r = await extractRestaurantPdf(selected);
      setLogs(r.logs ?? []);
      setDone({ count: r.productCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-teal mb-1">Upload Menu</h1>
      <p className="text-muted text-sm mb-8">Upload a menu PDF to extract and generate product listings.</p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-6 ${
          dragging ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:border-brand-orange/50'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleUpload(file);
        }}
      >
        <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
        <p className="text-sm font-medium text-text-primary">Drop a PDF here or click to browse</p>
        <p className="text-xs text-muted mt-1">PDF menus only</p>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }} />
      </div>

      {/* Available PDFs */}
      {pdfs.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Available menus</p>
          <div className="space-y-2">
            {pdfs.map((pdf) => (
              <button
                key={pdf}
                onClick={() => setSelected(pdf)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                  selected === pdf
                    ? 'border-brand-orange bg-orange-50 text-brand-orange'
                    : 'border-gray-200 bg-surface hover:border-brand-orange/40'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{pdf}</span>
                {selected === pdf && <CheckCircle className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Extract button */}
      <button
        onClick={handleExtract}
        disabled={!selected || extracting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-orange text-white rounded-xl font-semibold text-sm hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {extracting ? 'Extracting...' : `Extract${selected ? ` "${selected}"` : ''}`}
      </button>

      {/* Progress log */}
      {extracting && logs.length > 0 && (
        <div className="mt-4 bg-gray-900 rounded-xl p-4 max-h-36 overflow-y-auto">
          {logs.map((l, i) => <p key={i} className="text-xs font-mono text-green-400">{l}</p>)}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* Success */}
      {done && (
        <div
          className="mt-6 bg-surface border border-brand-orange/20 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors"
          onClick={() => navigate('/products')}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-success" />
            <div>
              <p className="font-semibold text-text-primary">{done.count} products extracted</p>
              <p className="text-xs text-muted">Review and generate listings</p>
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
