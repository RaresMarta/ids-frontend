import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle, AlertTriangle, ChevronLeft } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { ATTACK_COLORS } from '../data/models';
import { useAnalyses } from '../../hooks/useAnalyses';

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveAnalysis } = useAnalyses();

  const result = location.state?.result;
  const saved = useRef(false);

  // Persist the classification once, when we first land here with a real result.
  useEffect(() => {
    if (!result) {
      navigate('/analysis');
      return;
    }
    if (!saved.current) {
      saved.current = true;
      saveAnalysis({
        model_used: result.model_type ?? 'mlp',
        input_type: result.input_type ?? 'csv',
        file_name: result.file_name ?? null,
        result_label: result.top_label,
        confidence: result.confidence,
        classification_mode: result.mode ?? '8',
        probabilities: result.probabilities ?? null,
      }).catch(console.error);
    }
  }, [result, navigate, saveAnalysis]);

  if (!result) return null;

  const isBenign = result.top_label?.toLowerCase() === 'benign';
  const confidence = Math.round((result.confidence ?? 0) * 1000) / 10;
  const topColor = ATTACK_COLORS[result.top_label] ?? '#6B6E7A';
  const circumference = 2 * Math.PI * 72;

  const probabilities = Object.entries(result.probabilities ?? {})
    .map(([label, p]) => ({ label, value: Math.round((p as number) * 1000) / 10, color: ATTACK_COLORS[label] ?? '#6B6E7A' }))
    .sort((a, b) => b.value - a.value);

  const breakdown = Object.entries(result.breakdown ?? {})
    .map(([label, count]) => ({ label, count: count as number, color: ATTACK_COLORS[label] ?? '#6B6E7A' }))
    .sort((a, b) => b.count - a.count);

  const details: [string, string][] = [
    ['Model', (result.model_type ?? '—').toUpperCase()],
    ['Mode', result.mode === '2' ? 'Binary' : '8-Class'],
    ['Flows analyzed', result.flow_count?.toLocaleString() ?? '—'],
    ['Processing time', result.processing_time_ms != null ? `${result.processing_time_ms} ms` : '—'],
  ];

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
            New analysis
          </button>
          <div className="w-px h-4 bg-border" />
          <h2 className="font-display text-lg text-foreground">Classification result</h2>
          {result.file_name && (
            <span className="font-mono text-xs text-muted-foreground/70 ml-1">{result.file_name}</span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8">
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
              <div className="flex items-center gap-3 px-5 py-3.5 bg-[#4ADE80]/8 border border-[#4ADE80]/20 rounded-md">
                <CheckCircle className="w-4 h-4 text-[#4ADE80] shrink-0" />
                <div>
                  <span className="text-sm font-medium text-[#4ADE80]">Traffic classified as benign</span>
                  <span className="text-xs text-muted-foreground ml-3">No anomalous patterns detected in the sample.</span>
                </div>
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
                    <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="80"
                      cy="80"
                      r="72"
                      fill="none"
                      stroke={topColor}
                      strokeWidth="8"
                      strokeDasharray={`${(confidence / 100) * circumference} ${circumference}`}
                      strokeLinecap="round"
                      style={{ opacity: 0.85 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl text-foreground">{confidence}%</span>
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
                        <span className="font-mono text-xs text-muted-foreground">{prob.value}%</span>
                      </div>
                      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${prob.value}%`, backgroundColor: prob.color, opacity: 0.8 }}
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
        </div>
      </main>
    </div>
  );
}
