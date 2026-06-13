import { useNavigate } from 'react-router';
import {
  Shield,
  Activity,
  FileSearch,
  GitCompare,
  ArrowRight,
  Radio,
  Layers,
  Cpu,
  Ban,
} from 'lucide-react';
import { MODELS, MLP_PER_CLASS_F1, ATTACK_COLORS, DEMO_CLASSES } from '../data/models';

const CAPABILITIES = [
  {
    icon: Activity,
    title: 'Live detection & active response',
    body:
      'Captures real traffic off the wire, classifies each flow inline, and bans the source at the host firewall via nftables — an actual packet drop, not just an alert.',
  },
  {
    icon: FileSearch,
    title: 'Explainable classification',
    body:
      'Upload a capture and get a calibrated per-class probability breakdown plus the SHAP features that drove the verdict — the "why", not only the label.',
  },
  {
    icon: GitCompare,
    title: 'Model comparison',
    body:
      'MLP, Random Forest and XGBoost trained and evaluated on the same temporal split, so the numbers are comparable rather than cherry-picked.',
  },
];

const PIPELINE = [
  { icon: Radio, label: 'Capture', sub: 'AF_PACKET' },
  { icon: Layers, label: '10-packet window', sub: 'per host pair' },
  { icon: Layers, label: '25 features', sub: 'dpkt extractor' },
  { icon: Cpu, label: 'Two-head model', sub: '2-class gate + 8-class family' },
  { icon: Ban, label: 'Verdict & ban', sub: 'nftables drop' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  // Per-class F1, sorted so the "Mirai/DDoS detect well, Web/BruteForce poorly" story is legible.
  const perClass = Object.entries(MLP_PER_CLASS_F1).sort(([, a], [, b]) => b - a);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm tracking-wide">Neural IDS</span>
          </div>
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate('/monitor')}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Live monitor
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign in
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        {/* Hero */}
        <section className="py-20 max-w-2xl">
          <p className="font-mono text-xs text-primary mb-4">Bachelor thesis · CIC-IoT-2023</p>
          <h1 className="font-display text-4xl leading-tight mb-5">
            A machine-learning intrusion detection system for IoT networks.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            Captures live network traffic, classifies each flow with a neural model, and blocks
            attacking hosts at the firewall in real time. Built and evaluated on the CIC-IoT-2023
            dataset.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign in to the dashboard <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/monitor')}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-md text-sm hover:bg-muted/30 transition-colors"
            >
              <Activity className="w-4 h-4 text-primary" /> Watch the live monitor
            </button>
          </div>
        </section>

        {/* Capabilities */}
        <section className="py-12 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-card border border-border rounded-md p-6">
                <Icon className="w-5 h-5 text-primary mb-4" />
                <h3 className="font-display text-sm mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline */}
        <section className="py-12 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-6">
            How a flow is processed
          </p>
          <div className="flex flex-col md:flex-row md:items-stretch gap-2">
            {PIPELINE.map(({ icon: Icon, label, sub }, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex-1 bg-card border border-border rounded-md p-4 h-full">
                  <Icon className="w-4 h-4 text-primary mb-2" />
                  <div className="text-sm font-medium">{label}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5">{sub}</div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0 rotate-90 md:rotate-0" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            The 2-class gate (Benign/Attack) is the reliable signal and drives the ban; the 8-class
            head supplies the attack family label.
          </p>
        </section>

        {/* Metrics */}
        <section className="py-12 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Measured performance
          </p>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            8-class task, temporal split — trained on the earliest traffic and tested on the latest,
            which mirrors deployment and reads lower than the random-split numbers most papers
            report. That gap is the honest generalization result.
          </p>
          <div className="bg-card border border-border rounded-md overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Model</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Macro F1</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Weighted F1</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m, i) => (
                  <tr key={m.id} className={i < MODELS.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-5 py-3 text-sm text-foreground/80">{m.name}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-primary">{m.metrics.testMacroF1.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">{m.metrics.testWeightedF1.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">{m.metrics.testAccuracy.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-class — the honest scope story */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Per-class F1 (MLP) — what flow features can and can't catch
          </p>
          <div className="space-y-2 max-w-2xl">
            {perClass.map(([cls, f1]) => (
              <div key={cls} className="flex items-center gap-3">
                <span className="text-xs text-foreground/70 w-24 shrink-0">{cls}</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${f1 * 100}%`, backgroundColor: ATTACK_COLORS[cls] ?? '#6B6E7A', opacity: 0.8 }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground w-10 text-right">{f1.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 max-w-2xl">
            Mirai and DDoS are highly separable from flow statistics; Web and BruteForce are not —
            their signal lives in application-layer payloads the model never sees. The live demo
            exercises the well-separated families: {DEMO_CLASSES.join(', ')}.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Bachelor thesis demonstration · CIC-IoT-2023 · PyTorch · scikit-learn · FastAPI · React
          </p>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-display text-xs tracking-wide text-muted-foreground">Neural IDS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
