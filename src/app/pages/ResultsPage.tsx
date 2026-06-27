import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { AppShell, PageHeader, PageBody } from '../components/AppShell';
import { useAnalyses } from '../../hooks/useAnalyses';
import { attackColor, formatConfidence } from '../../lib/classifiers';

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveAnalysis } = useAnalyses();

  const result = location.state?.result;
  const saved = useRef(false);
  const [saveError, setSaveError] = useState('');
  // Drives the on-mount reveal: ring fills and bars grow from zero on first paint.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Persist the classification once, when we first land here with a real result.
  useEffect(() => {
    if (!result) {
      navigate('/analysis');
      return;
    }
    if (saved.current) return;
    saved.current = true;

    // Only persist a well-formed result — the columns are NOT NULL and typed.
    if (typeof result.top_label !== 'string' || !Number.isFinite(result.confidence)) {
      setSaveError('This result was incomplete, so it was not saved to your history.');
      return;
    }
    saveAnalysis({
      model_used: result.model_type ?? 'mlp',
      input_type: result.input_type ?? 'csv',
      file_name: result.file_name ?? null,
      result_label: result.top_label,
      confidence: result.confidence,
      classification_mode: result.mode ?? '8',
      probabilities: result.probabilities ?? null,
    }).catch(() => setSaveError('Could not save this result to your history.'));
  }, [result, navigate, saveAnalysis]);

  if (!result) return null;

  const isBenign = result.top_label?.toLowerCase() === 'benign';
  const conf = Number.isFinite(result.confidence) ? result.confidence : 0;
  const topColor = attackColor(result.top_label);
  const circumference = 2 * Math.PI * 72;

  const probabilities = Object.entries(result.probabilities ?? {})
    .map(([label, p]) => ({ label, value: p as number, color: attackColor(label) }))
    .sort((a, b) => b.value - a.value);

  const breakdown = Object.entries(result.breakdown ?? {})
    .map(([label, count]) => ({ label, count: count as number, color: attackColor(label) }))
    .sort((a, b) => b.count - a.count);

  // SHAP per-feature explanation (present only when the backend explainer ran).
  // Signed contribution: positive pushes toward the predicted class, negative away.
  const topFeatures: { feature: string; contribution: number }[] = (result.top_features ?? [])
    .slice()
    .sort((a: { contribution: number }, b: { contribution: number }) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const maxContribution = Math.max(...topFeatures.map((f) => Math.abs(f.contribution)), 1e-9);

  const details: [string, string][] = [
    ['Model', (result.model_type ?? '—').toUpperCase()],
    ['Mode', result.mode === '2' ? 'Binary' : '8-Class'],
    ['Flows analyzed', result.flow_count?.toLocaleString() ?? '—'],
    ['Processing time', result.processing_time_ms != null ? `${result.processing_time_ms} ms` : '—'],
  ];

  // Latency decomposition. Server spans come from the backend `timing` block;
  // the client round trip is measured in the browser. network = round trip − server.
  const timing = (result.timing ?? {}) as Record<string, number>;
  const serverTotal = timing.total_server_ms ?? result.processing_time_ms;
  const clientRT = result.client_round_trip_ms as number | undefined;
  const networkMs =
    clientRT != null && serverTotal != null ? Math.max(0, Math.round(clientRT - serverTotal)) : undefined;
  const SPAN_LABELS: [string, string][] = [
    ['read_ms', 'Read upload'],
    ['extract_ms', 'Feature extraction'],
    ['preprocess_ms', 'Preprocess / scale'],
    ['inference_ms', 'Model inference'],
    ['aggregate_ms', 'Aggregate'],
    ['explain_ms', 'SHAP explanation'],
  ];
  const spanRows = SPAN_LABELS
    .filter(([k]) => timing[k] != null)
    .map(([k, label]) => ({ label, ms: timing[k], key: k }));
  const spanMax = Math.max(...spanRows.map((r) => r.ms), 1e-9);
  const hasTiming = spanRows.length > 0 || clientRT != null;

  return (
    <AppShell active="analysis">
      <PageHeader
        title="Classification result"
        subtitle={result.file_name ?? undefined}
        back={{ to: '/analysis', label: 'Analysis history' }}
      />
      <PageBody>
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Status banner */}
          {!isBenign && (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-destructive/8 border border-destructive/25 rounded-md">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <div>
                <span className="text-sm font-medium text-destructive">Threat detected — {result.top_label}</span>
                <span className="text-xs text-muted-foreground ml-3">Review the classification details below and take appropriate action.</span>
              </div>
            </div>
          )}

          {isBenign && (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-safe/8 border border-safe/20 rounded-md">
              <CheckCircle className="w-4 h-4 text-safe shrink-0" />
              <div>
                <span className="text-sm font-medium text-safe">Traffic classified as benign</span>
                <span className="text-xs text-muted-foreground ml-3">No anomalous patterns detected in the sample.</span>
              </div>
            </div>
          )}

          {saveError && (
            <div className="px-4 py-2.5 bg-warn/8 border border-warn/25 rounded-md text-xs text-warn" role="status">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Confidence ring */}
            <div className="lg:col-span-2 bg-card border border-border rounded-md p-6 flex flex-col items-center justify-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-5">
                Confidence score
              </p>
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="72" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    fill="none"
                    stroke={topColor}
                    strokeWidth="8"
                    strokeDasharray={`${(revealed ? conf : 0) * circumference} ${circumference}`}
                    strokeLinecap="round"
                    style={{ opacity: 0.85, transition: 'stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl text-foreground">{formatConfidence(conf)}</span>
                  <span className="font-mono text-xs text-muted-foreground mt-0.5">{result.top_label}</span>
                </div>
              </div>
            </div>

            {/* Probability bars */}
            <div className="lg:col-span-3 bg-card border border-border rounded-md p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Class probabilities
              </p>
              <div className="space-y-4">
                {probabilities.map((prob) => (
                  <div key={prob.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-foreground/70">{prob.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{formatConfidence(prob.value)}</span>
                    </div>
                    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${(revealed ? prob.value : 0) * 100}%`, backgroundColor: prob.color, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis details */}
          <div className="bg-card border border-border rounded-md p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Analysis details
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {details.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-mono text-xs text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Latency breakdown — where the end-to-end time went */}
          {hasTiming && (
            <div className="bg-card border border-border rounded-md p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Latency breakdown
              </p>
              <div className="space-y-2.5">
                {spanRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-foreground/70 w-40 truncate shrink-0">{r.label}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm transition-all duration-700"
                        style={{
                          width: `${(r.ms / spanMax) * 100}%`,
                          backgroundColor: r.key === 'inference_ms' ? 'var(--primary)' : 'var(--info)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground w-20 text-right shrink-0">
                      {r.ms.toFixed(2)} ms
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-5 pt-4 border-t border-border">
                {timing.inference_per_flow_ms != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Inference / flow</p>
                    <p className="font-mono text-xs text-foreground">{timing.inference_per_flow_ms.toFixed(4)} ms</p>
                  </div>
                )}
                {serverTotal != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Server total</p>
                    <p className="font-mono text-xs text-foreground">{Number(serverTotal).toFixed(1)} ms</p>
                  </div>
                )}
                {networkMs != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Network round trip</p>
                    <p className="font-mono text-xs text-foreground">{networkMs} ms</p>
                  </div>
                )}
                {clientRT != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">End-to-end (client)</p>
                    <p className="font-mono text-xs text-foreground">{clientRT} ms</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-4">
                Highlighted bar is the pure model inference; the rest is the work around it.
                Network round trip = client end-to-end − server total.
              </p>
            </div>
          )}

          {/* Top contributing features — SHAP attribution for the dominant verdict */}
          {topFeatures.length > 0 && (
            <div className="bg-card border border-border rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Top contributing features
                </p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} />
                    toward {result.top_label}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--info)' }} />
                    against
                  </span>
                </div>
              </div>
              <div className="space-y-2.5">
                {topFeatures.map((f) => (
                  <div key={f.feature} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-foreground/70 w-48 truncate shrink-0">
                      {f.feature}
                    </span>
                    <div className="flex-1 h-1.5 bg-border rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm transition-all duration-700"
                        style={{
                          width: `${(Math.abs(f.contribution) / maxContribution) * 100}%`,
                          backgroundColor: f.contribution >= 0 ? 'var(--primary)' : 'var(--info)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground w-14 text-right shrink-0">
                      {f.contribution >= 0 ? '+' : ''}{f.contribution.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-4">
                SHAP attribution for the most representative flow in this capture.
              </p>
            </div>
          )}

          {/* Flow breakdown — real per-class counts from the upload */}
          {breakdown.length > 1 && (
            <div className="bg-card border border-border rounded-md p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Flow breakdown
              </p>
              <div className="flex flex-wrap gap-2.5">
                {breakdown.map(({ label, count, color }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs"
                    style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}33` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {label}: {count.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </PageBody>
    </AppShell>
  );
}
