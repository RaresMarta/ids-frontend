import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Shield, BarChart3, FileText, LogOut, Cpu, Brain, TreeDeciduous } from 'lucide-react';
import GlassmorphicCard from '../components/GlassmorphicCard';
import { useAuth } from '../../hooks/useAuth';
import { useAnalyses } from '../../hooks/useAnalyses';

const RESULT_COLORS: Record<string, string> = {
  benign: '#39FF14', ddos: '#FF0055', dos: '#FF3333', mirai: '#6A0D9F',
  recon: '#00D9FF', spoofing: '#FF00FF', web: '#FF9500', bruteforce: '#FFD700',
  attack: '#FF0055',
};

function resultColor(label: string) {
  return RESULT_COLORS[label.toLowerCase()] ?? '#00D9FF';
}

const models = [
  { id: 'mlp', name: 'MLP Neural Network', icon: Brain, description: 'Deep learning classifier' },
  { id: 'rf',  name: 'Random Forest',      icon: TreeDeciduous, description: 'Ensemble decision trees' },
  { id: 'xgb', name: 'XGBoost',            icon: Cpu, description: 'Gradient boosting' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { analyses, loading: analysesLoading } = useAnalyses();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const username = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'analyst';

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <Shield className="w-8 h-8" style={{ color: '#00D9FF', filter: 'drop-shadow(0 0 10px rgba(0, 217, 255, 0.5))' }} />
          <h1 className="font-orbitron text-xl" style={{ color: '#00D9FF' }}>NEURAL IDS</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
            <BarChart3 className="w-5 h-5" /> <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/analysis')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-all"
          >
            <FileText className="w-5 h-5" /> <span>Analysis</span>
          </button>
        </nav>

        <div className="border-t border-sidebar-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-1 font-mono">Logged in as</p>
          <p className="text-sm font-mono mb-3" style={{ color: '#00D9FF' }}>{username}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-5 h-5" /> <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-orbitron text-4xl mb-8" style={{ color: '#00D9FF', textShadow: '0 0 20px rgba(0, 217, 255, 0.3)' }}>
            Model Selection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {models.map((model) => {
              const Icon = model.icon;
              const isSelected = selectedModel === model.id;
              return (
                <button key={model.id} onClick={() => setSelectedModel(model.id)} className="text-left transition-all">
                  <GlassmorphicCard
                    className={`p-6 h-full ${isSelected ? 'border-primary' : ''}`}
                    style={{ boxShadow: isSelected ? '0 0 30px rgba(0, 217, 255, 0.4), 0 0 60px rgba(0, 217, 255, 0.2)' : '0 0 20px rgba(0, 217, 255, 0.1)' }}
                  >
                    <Icon className="w-12 h-12 mb-4" style={{ color: isSelected ? '#00D9FF' : '#8B5CF6', filter: isSelected ? 'drop-shadow(0 0 10px rgba(0, 217, 255, 0.6))' : 'none' }} />
                    <h3 className="font-orbitron text-xl mb-2" style={{ color: isSelected ? '#00D9FF' : '#E0E7FF' }}>{model.name}</h3>
                    <p className="text-muted-foreground">{model.description}</p>
                  </GlassmorphicCard>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-6">
            <h3 className="font-orbitron text-2xl" style={{ color: '#00D9FF' }}>Analysis History</h3>
            <button
              onClick={() => navigate('/analysis')}
              className="px-6 py-2 rounded-lg font-orbitron text-sm transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #00D9FF, #8B5CF6)', boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)' }}
            >
              + NEW ANALYSIS
            </button>
          </div>

          <GlassmorphicCard className="overflow-hidden">
            {analysesLoading ? (
              <p className="px-6 py-8 text-center font-mono text-muted-foreground">Loading history...</p>
            ) : analyses.length === 0 ? (
              <p className="px-6 py-8 text-center font-mono text-muted-foreground">No analyses yet. Run your first analysis above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary/20">
                      <th className="px-6 py-4 text-left font-mono text-sm text-muted-foreground">TIMESTAMP</th>
                      <th className="px-6 py-4 text-left font-mono text-sm text-muted-foreground">MODEL</th>
                      <th className="px-6 py-4 text-left font-mono text-sm text-muted-foreground">FILE</th>
                      <th className="px-6 py-4 text-left font-mono text-sm text-muted-foreground">RESULT</th>
                      <th className="px-6 py-4 text-left font-mono text-sm text-muted-foreground">CONFIDENCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((entry) => {
                      const color = resultColor(entry.result_label);
                      return (
                        <tr key={entry.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-sm text-foreground/80">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground/80">{entry.model_used}</td>
                          <td className="px-6 py-4 font-mono text-xs text-foreground/60">{entry.file_name ?? '—'}</td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-3 py-1 rounded-full text-sm font-mono"
                              style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40`, boxShadow: `0 0 10px ${color}30` }}>
                              {entry.result_label}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm" style={{ color }}>
                            {(entry.confidence * 100).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassmorphicCard>
        </div>
      </main>
    </div>
  );
}
