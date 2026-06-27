import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { AppShell, PageHeader, PageBody } from '../components/AppShell';
import { MODELS } from '../data/models';
import { useAnalyses } from '../../hooks/useAnalyses';
import { getModelName, attackColor, formatConfidence } from '../../lib/classifiers';

/**
 * Main analysis surface: classifier overview + the history of past classifications.
 * "New analysis" opens the nested /analysis/classify form; each run lands back here.
 */
export default function AnalysisPage() {
  const navigate = useNavigate();
  const { analyses, loading, error } = useAnalyses();
  const [filterModel, setFilterModel] = useState<string | null>(null);

  const filteredHistory = filterModel
    ? analyses.filter((entry) => entry.model_used === filterModel)
    : analyses;

  return (
    <AppShell active="analysis">
      <PageHeader
        title="Analysis"
        subtitle="Classifier overview and analysis history"
        actions={
          <button
            onClick={() => navigate('/analysis/classify')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm rounded-md hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New analysis
          </button>
        }
      />
      <PageBody>
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Model cards */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Classifiers
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MODELS.map((model) => {
                const Icon = model.icon;
                const isSelected = filterModel === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => setFilterModel(isSelected ? null : model.id)}
                    className={`text-left p-5 rounded-md border transition-all ${
                      isSelected
                        ? 'bg-card border-primary/40 ring-1 ring-primary/20'
                        : 'bg-card border-border hover:border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      {isSelected && (
                        <span className="text-xs text-primary font-medium">Filtering</span>
                      )}
                    </div>
                    <h3 className="font-display text-sm text-foreground mb-1">{model.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{model.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="font-mono text-xs text-muted-foreground">{model.params}</span>
                      <span className="font-mono text-xs text-primary">F1 {model.metrics.testMacroF1.toFixed(3)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* History table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent analyses
                {filterModel && (
                  <span className="text-primary normal-case tracking-normal">
                    {' '}— {getModelName(filterModel)}
                  </span>
                )}
              </p>
              {filterModel && (
                <button
                  onClick={() => setFilterModel(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className="bg-card border border-border rounded-md overflow-hidden">
              {loading ? (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">Loading history…</p>
              ) : error ? (
                <p className="px-5 py-8 text-center text-xs text-destructive" role="alert">
                  Couldn't load history: {error}
                </p>
              ) : filteredHistory.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">
                  No analyses yet. Start with “New analysis” above.
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Model</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">File</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Classification</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((entry, i) => {
                      const c = attackColor(entry.result_label);
                      return (
                        <tr
                          key={entry.id}
                          className={`transition-colors hover:bg-muted/40 ${
                            i < filteredHistory.length - 1 ? 'border-b border-border' : ''
                          }`}
                        >
                          <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-xs text-foreground/70">
                            {getModelName(entry.model_used)}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-muted-foreground/70">{entry.file_name ?? '—'}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: c }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                              {entry.result_label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">
                            {formatConfidence(entry.confidence)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </PageBody>
    </AppShell>
  );
}
