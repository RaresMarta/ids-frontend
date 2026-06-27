import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppShell, PageHeader, PageBody } from '../components/AppShell';
import { MODELS, ATTACK_CLASSES, ATTACK_COLORS, DEMO_CLASSES, MLP_PER_CLASS_F1 } from '../data/models';

const METRIC_ROWS = [
  { key: 'testAccuracy', label: 'Test accuracy' },
  { key: 'testWeightedF1', label: 'Test weighted F1' },
  { key: 'testMacroF1', label: 'Test macro F1' },
  { key: 'valWeightedF1', label: 'Validation weighted F1' },
  { key: 'valMacroF1', label: 'Validation macro F1' },
] as const;

const chartData = ATTACK_CLASSES.map((cls) => ({
  class: cls,
  f1: MLP_PER_CLASS_F1[cls],
  inDemo: DEMO_CLASSES.includes(cls),
}));

export default function ComparisonPage() {
  return (
    <AppShell active="compare">
      <PageHeader
        title="Model Comparison"
        subtitle="CIC-IoT-2023, 8-class task, stratified random 70/15/15 split"
      />
      <PageBody>
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Summary metrics table */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Overall metrics
            </p>
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Metric</th>
                    {MODELS.map((m) => {
                      const Icon = m.icon;
                      return (
                        <th key={m.id} className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                            {m.name}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {METRIC_ROWS.map((row, i) => {
                    const best = Math.max(...MODELS.map((m) => m.metrics[row.key]));
                    return (
                      <tr key={row.key} className={`transition-colors hover:bg-muted/40 ${i < METRIC_ROWS.length - 1 ? 'border-b border-border' : ''}`}>
                        <td className="px-5 py-3 text-xs text-foreground/70">{row.label}</td>
                        {MODELS.map((m) => {
                          const value = m.metrics[row.key];
                          return (
                            <td
                              key={m.id}
                              className={`px-5 py-3 text-right font-mono text-xs ${
                                value === best ? 'text-primary font-medium' : 'text-muted-foreground'
                              }`}
                            >
                              {value.toFixed(3)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Best value per row highlighted. The tree ensemble leads by ~4–7 points across the aggregate
              metrics; the MLP remains the serving model for its portable single-call PyTorch inference. The
              weighted-vs-macro gap reflects that difficulty is concentrated in the minority classes.
            </p>
          </div>

          {/* MLP per-class F1 chart */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Per-class F1 — MLP (test set)
            </p>
            <div className="bg-card border border-border rounded-md p-5">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="class"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--border)' }}
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value.toFixed(3), 'F1']}
                  />
                  <Bar dataKey="f1" maxBarSize={48} radius={[2, 2, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.class}
                        fill={ATTACK_COLORS[entry.class]}
                        fillOpacity={entry.inDemo ? 0.9 : 0.35}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Solid bars mark the classes exercised by the live demo (Benign, DDoS, DoS, Mirai, Recon). The
              faded classes sit outside the live demo: Web and BruteForce carry too little application-layer
              signal in the transport-level flow features (test F1 ≈ 0.19 and 0.14, consistent with the dataset
              paper), and Spoofing is not part of the demo's attack set. Per-class breakdowns for the tree
              baselines were not persisted, so only the MLP is shown.
            </p>
          </div>

        </div>
      </PageBody>
    </AppShell>
  );
}
