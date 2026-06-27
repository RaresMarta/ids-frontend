import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Upload, ChevronLeft } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { MODELS } from '../data/models';

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:7860';

/** Nested under /analysis: the upload-and-classify form. Returns to the analysis history on back. */
export default function ClassifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modelId, setModelId] = useState(
    () => (MODELS.find((m) => m.id === searchParams.get('model')) ?? MODELS[0]).id,
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const runAnalysis = async (file: File) => {
    setIsProcessing(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('model_type', modelId);
      form.append('mode', '8');
      form.append('split', 'random');

      const res = await fetch(`${API_URL}/api/classify`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `Server error (${res.status})`);

      navigate('/analysis/results', { state: { result: data } });
    } catch (err: any) {
      setError(err?.message ?? 'Analysis failed. Is the model server running?');
      setIsProcessing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) runAnalysis(picked);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) runAnalysis(dropped);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar active="analysis" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-8 py-5 border-b border-border shrink-0">
          <button
            onClick={() => navigate('/analysis')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Analysis history
          </button>
          <div className="w-px h-4 bg-border" />
          <div>
            <h2 className="font-display text-lg text-foreground">New analysis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload a capture file to classify network traffic</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
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
                      className={`flex-1 flex items-center gap-3 p-4 rounded-md border text-left transition-all ${
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
              accept=".csv,.pcap,.pcapng,.cap"
              onChange={handleFileInput}
              className="hidden"
            />
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-md cursor-pointer transition-all ${
                isProcessing
                  ? 'border-primary/30 bg-primary/5 cursor-default'
                  : dragActive
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border hover:border-border/50 hover:bg-muted/20'
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

            {/* Options */}
            <div className="bg-card border border-border rounded-md p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Advanced options
              </p>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground">Confidence threshold</label>
                    <span className="font-mono text-xs text-foreground">{confidenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${confidenceThreshold}%, var(--border) ${confidenceThreshold}%, var(--border) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground/60">0%</span>
                    <span className="text-xs text-muted-foreground/60">100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Output format</label>
                  <select className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all">
                    <option>Detailed report (JSON)</option>
                    <option>Summary (TXT)</option>
                    <option>Visualization (HTML)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
