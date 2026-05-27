import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Shield, BarChart3, FileText, LogOut, AlertTriangle, CheckCircle } from 'lucide-react';
import GlassmorphicCard from '../components/GlassmorphicCard';
import { useAuth } from '../../hooks/useAuth';
import { useAnalyses } from '../../hooks/useAnalyses';

const ATTACK_COLORS: Record<string, string> = {
  benign: '#39FF14', ddos: '#FF0055', dos: '#FF3333', mirai: '#6A0D9F',
  recon: '#00D9FF', spoofing: '#FF00FF', web: '#FF9500', bruteforce: '#FFD700',
  attack: '#FF0055',
};

function labelColor(label: string) {
  return ATTACK_COLORS[label.toLowerCase()] ?? '#00D9FF';
}

export default function ResultsPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { signOut } = useAuth();
  const { saveAnalysis } = useAnalyses();

  const result = location.state?.result;
  const saved  = useRef(false);

  const [scanlinePos, setScanlinePos] = useState(0);

  useEffect(() => {
    if (!result) { navigate('/analysis'); return; }

    // Save to Supabase once
    if (!saved.current) {
      saved.current = true;
      saveAnalysis({
        model_used:          result.model_type ?? 'mlp',
        input_type:          result.input_type ?? 'csv',
        file_name:           result.file_name ?? null,
        result_label:        result.top_label,
        confidence:          result.confidence,
        classification_mode: result.mode ?? '2',
        probabilities:       result.probabilities ?? null,
      }).catch(console.error);
    }
  }, [result]);

  useEffect(() => {
    if (!isBenign) {
      const interval = setInterval(() => setScanlinePos(p => (p + 1) % 100), 50);
      return () => clearInterval(interval);
    }
  }, []);

  if (!result) return null;

  const isBenign    = result.top_label?.toLowerCase() === 'benign';
  const topColor    = labelColor(result.top_label ?? '');
  const confidence  = Math.round(result.confidence * 100 * 10) / 10;

  const probEntries: [string, number][] = Object.entries(result.probabilities ?? {})
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {!isBenign && (
        <div className="absolute inset-x-0 h-0.5 pointer-events-none z-50 transition-all"
          style={{ top: `${scanlinePos}%`, background: `linear-gradient(to bottom, transparent, ${topColor}80, transparent)`, boxShadow: `0 0 20px ${topColor}` }} />
      )}

      <aside className="w-64 bg-sidebar border-r border-sidebar-border p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <Shield className="w-8 h-8" style={{ color: '#00D9FF', filter: 'drop-shadow(0 0 10px rgba(0, 217, 255, 0.5))' }} />
          <h1 className="font-orbitron text-xl" style={{ color: '#00D9FF' }}>NEURAL IDS</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-all">
            <BarChart3 className="w-5 h-5" /><span>Dashboard</span>
          </button>
          <button onClick={() => navigate('/analysis')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-all">
            <FileText className="w-5 h-5" /><span>Analysis</span>
          </button>
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut className="w-5 h-5" /><span>Logout</span>
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Alert banner */}
          {!isBenign && (
            <div className="p-4 rounded-lg border animate-pulse"
              style={{ backgroundColor: `${topColor}10`, borderColor: `${topColor}40`, boxShadow: `0 0 20px ${topColor}30` }}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" style={{ color: topColor }} />
                <span className="font-orbitron text-lg" style={{ color: topColor }}>THREAT DETECTED — IMMEDIATE ACTION REQUIRED</span>
              </div>
            </div>
          )}

          {/* Main verdict */}
          <div className="text-center">
            {isBenign ? (
              <CheckCircle className="w-32 h-32 mx-auto mb-6" style={{ color: '#39FF14', filter: 'drop-shadow(0 0 30px rgba(57, 255, 20, 0.6))' }} />
            ) : (
              <AlertTriangle className="w-32 h-32 mx-auto mb-6" style={{ color: topColor, filter: `drop-shadow(0 0 30px ${topColor}CC)`, animation: 'glitch 0.3s infinite' }} />
            )}
            <h2 className="font-orbitron text-5xl mb-4"
              style={{ color: isBenign ? '#39FF14' : topColor, textShadow: isBenign ? '0 0 30px rgba(57,255,20,0.5)' : `0 0 30px ${topColor}80` }}>
              {isBenign ? 'TRAFFIC BENIGN' : 'ATTACK DETECTED'}
            </h2>
            <span className="inline-block px-4 py-2 rounded-lg font-mono text-lg"
              style={{ backgroundColor: `${topColor}20`, color: topColor, border: `1px solid ${topColor}40`, boxShadow: `0 0 15px ${topColor}40` }}>
              {result.top_label?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Confidence ring */}
            <GlassmorphicCard className="p-8">
              <h3 className="font-orbitron text-2xl mb-6 text-center" style={{ color: '#00D9FF' }}>Confidence Score</h3>
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(26,31,58,0.6)" strokeWidth="12" />
                  <circle cx="96" cy="96" r="80" fill="none" stroke={topColor} strokeWidth="12"
                    strokeDasharray={`${(confidence / 100) * 502.65} 502.65`} strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 10px ${topColor})`, transition: 'stroke-dasharray 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="font-mono text-5xl mb-1" style={{ color: topColor }}>{confidence}%</div>
                    <div className="text-xs text-muted-foreground">CONFIDENCE</div>
                  </div>
                </div>
              </div>
            </GlassmorphicCard>

            {/* Class probabilities */}
            <GlassmorphicCard className="p-8">
              <h3 className="font-orbitron text-2xl mb-6" style={{ color: '#00D9FF' }}>Class Probabilities</h3>
              <div className="space-y-4">
                {probEntries.map(([label, prob]) => {
                  const pct = Math.round((prob as number) * 100 * 10) / 10;
                  const color = labelColor(label);
                  return (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-foreground/80">{label}</span>
                        <span className="font-mono text-sm" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-1000"
                          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassmorphicCard>
          </div>

          {/* Analysis details */}
          <GlassmorphicCard className="p-8">
            <h3 className="font-orbitron text-2xl mb-6" style={{ color: '#00D9FF' }}>Analysis Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-sm">
              {[
                ['Model',       result.model_type?.toUpperCase() ?? '—'],
                ['Mode',        result.mode === '2' ? 'Binary' : '8-Class'],
                ['Flows',       result.flow_count?.toLocaleString() ?? '—'],
                ['Time',        `${result.processing_time_ms ?? '—'}ms`],
                ['File',        result.file_name ?? '—'],
                ['Split',       result.split ?? 'temporal'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-muted-foreground mb-1">{label}</div>
                  <div className="text-foreground truncate">{value}</div>
                </div>
              ))}
            </div>
          </GlassmorphicCard>

          {/* Flow breakdown */}
          {result.breakdown && Object.keys(result.breakdown).length > 1 && (
            <GlassmorphicCard className="p-8">
              <h3 className="font-orbitron text-2xl mb-6" style={{ color: '#00D9FF' }}>Flow Breakdown</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(result.breakdown).sort(([, a], [, b]) => (b as number) - (a as number)).map(([label, count]) => {
                  const color = labelColor(label);
                  return (
                    <span key={label} className="px-3 py-1 rounded-full font-mono text-sm"
                      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
                      {label}: {count as number}
                    </span>
                  );
                })}
              </div>
            </GlassmorphicCard>
          )}

          <div className="flex gap-4">
            <button onClick={() => navigate('/analysis')}
              className="flex-1 py-3 rounded-lg font-orbitron transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #00D9FF, #8B5CF6)', boxShadow: '0 0 20px rgba(0,217,255,0.3)' }}>
              NEW ANALYSIS
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-lg font-orbitron border border-primary/40 text-primary hover:bg-primary/10 transition-all">
              DASHBOARD
            </button>
          </div>
        </div>
      </main>

      {isBenign && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, backgroundColor: '#39FF14', boxShadow: '0 0 10px #39FF14', animation: `float ${3 + Math.random() * 3}s infinite ease-in-out ${Math.random() * 2}s` }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes glitch { 0%,100%{transform:translate(0)} 25%{transform:translate(-2px,2px)} 50%{transform:translate(2px,-2px)} 75%{transform:translate(-2px,-2px)} }
        @keyframes float { 0%,100%{transform:translateY(0) translateX(0);opacity:0} 25%{opacity:1} 50%{transform:translateY(-30px) translateX(10px);opacity:0.8} 75%{opacity:0.5} }
      `}</style>
    </div>
  );
}
