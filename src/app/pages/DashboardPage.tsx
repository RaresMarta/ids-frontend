import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Sidebar from '../components/Sidebar';
import { MODELS, ATTACK_COLORS } from '../data/models';
import { useAuth } from '../../hooks/useAuth';
import { useAnalyses } from '../../hooks/useAnalyses';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { analyses, loading: analysesLoading } = useAnalyses();
  const [filterModel, setFilterModel] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  const filteredHistory = filterModel
    ? analyses.filter((entry) => entry.model_used === filterModel)
    : analyses;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar active="dashboard" />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="px-8 py-5 border-b border-border shrink-0">
          <h2 className="font-display text-lg text-foreground">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Classifier overview and recent analyses</p>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
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
                      {' '}— {MODELS.find((m) => m.id === filterModel)?.name}
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
                {analysesLoading ? (
                  <p className="px-5 py-8 text-center text-xs text-muted-foreground">Loading history…</p>
                ) : filteredHistory.length === 0 ? (
                  <p className="px-5 py-8 text-center text-xs text-muted-foreground">
                    No analyses yet. Run your first analysis from the Analysis page.
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
                        const c = ATTACK_COLORS[entry.result_label] ?? '#6B6E7A';
                        return (
                          <tr
                            key={entry.id}
                            className={`transition-colors ${
                              i < filteredHistory.length - 1 ? 'border-b border-border' : ''
                            }`}
                          >
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-xs text-foreground/70">
                              {MODELS.find((m) => m.id === entry.model_used)?.name ?? entry.model_used}
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground/70">{entry.file_name ?? '—'}</td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: c }}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                                {entry.result_label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">
                              {(entry.confidence * 100).toFixed(1)}%
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
        </div>
      </main>
    </div>
  );
}
