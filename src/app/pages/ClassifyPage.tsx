import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload } from 'lucide-react';
import { AppShell, PageHeader, PageBody } from '../components/AppShell';
import { MODELS } from '../data/models';
import { API_URL } from '../../lib/classifiers';

const ACCEPTED = ['.csv', '.pcap', '.pcapng', '.cap'];

const hasAcceptedExtension = (name: string) =>
  ACCEPTED.some((ext) => name.toLowerCase().endsWith(ext));

/** Nested under /analysis: the upload-and-classify form. Returns to the analysis history on back. */
export default function ClassifyPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const runAnalysis = async (file: File) => {
    if (isProcessing) return;
    if (!hasAcceptedExtension(file.name)) {
      setError(`Unsupported file type. Accepted formats: ${ACCEPTED.join(', ')}.`);
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('model_type', modelId);
      form.append('mode', '8');
      form.append('split', 'random');

      // Measure the full client-observed round trip (upload + server compute +
      // download). Subtracting the server's own total isolates the network cost.
      const t0 = performance.now();
      const res = await fetch(`${API_URL}/api/classify`, { method: 'POST', body: form });
      const data = await res.json();
      const clientRoundTripMs = Math.round(performance.now() - t0);
      if (!res.ok || data.error) throw new Error(data.error ?? `Server error (${res.status})`);

      data.client_round_trip_ms = clientRoundTripMs;
      navigate('/analysis/results', { state: { result: data }, replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Analysis failed. Is the model server running?');
      setIsProcessing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    // Clear the value so re-picking the same file fires onChange again.
    e.target.value = '';
    if (picked) runAnalysis(picked);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isProcessing) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) runAnalysis(dropped);
  };

  const openPicker = () => {
    if (!isProcessing) fileRef.current?.click();
  };

  return (
    <AppShell active="analysis">
      <PageHeader
        title="New analysis"
        subtitle="Upload a capture file to classify network traffic"
        back={{ to: '/analysis', label: 'Analysis history' }}
      />
      <PageBody>
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Classifier picker */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Classifier
            </p>
            <div className="flex gap-2">
              {MODELS.map((m) => {
                const Icon = m.icon;
                const isSelected = modelId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setModelId(m.id)}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-md border text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/15'
                        : 'border-border bg-card hover:border-border/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground/70'}`}>
                        {m.name}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">macro F1 {m.metrics.testMacroF1.toFixed(3)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drop zone */}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />
          <div
            role="button"
            tabIndex={isProcessing ? -1 : 0}
            aria-label="Upload a .csv or .pcap capture file to classify"
            aria-disabled={isProcessing}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
            className={`relative flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isProcessing
                ? 'border-primary/30 bg-primary/5 cursor-default'
                : dragActive
                ? 'border-primary/60 bg-primary/5 cursor-pointer'
                : 'border-border hover:border-border/50 hover:bg-muted/20 cursor-pointer'
            }`}
          >
            {isProcessing ? (
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-foreground">Processing file…</p>
                <p className="text-xs text-muted-foreground mt-1">Extracting features and running inference</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm text-foreground">
                  Drop your <span className="font-mono uppercase text-foreground/80">.csv</span> or <span className="font-mono uppercase text-foreground/80">.pcap</span> file here
                </p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 bg-destructive/8 border border-destructive/25 rounded-md text-xs text-destructive" role="alert">
              {error}
            </div>
          )}

        </div>
      </PageBody>
    </AppShell>
  );
}
