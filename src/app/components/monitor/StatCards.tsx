import { ATTACK_COLORS } from '../../data/models';
import type { DetectorStats } from './types';

// The summary stat cards (Flows analysed / Malicious / Detection rate / Uptime)
// were removed. This now renders only the per-family breakdown of malicious
// flows, and nothing at all until there is malicious traffic to show.
export default function StatCards({ stats }: { stats: DetectorStats | null }) {
  const families = Object.entries(stats?.by_family ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const familyTotal = families.reduce((acc, [, n]) => acc + n, 0);

  if (familyTotal === 0) return null;

  return (
    <div className="bg-card border border-border rounded-md px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-muted-foreground">Malicious flows by family</p>
        <span className="font-mono text-[10px] text-muted-foreground/60">{familyTotal} total</span>
      </div>
      <div className="flex h-2 rounded-sm overflow-hidden bg-muted">
        {families.map(([family, n]) => (
          <div
            key={family}
            style={{
              width: `${(n / familyTotal) * 100}%`,
              backgroundColor: ATTACK_COLORS[family] ?? 'var(--muted-foreground)',
            }}
            title={`${family}: ${n}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {families.map(([family, n]) => (
          <span key={family} className="inline-flex items-center gap-1.5 text-[11px] text-foreground/70">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: ATTACK_COLORS[family] ?? 'var(--muted-foreground)' }}
            />
            {family}
            <span className="font-mono text-muted-foreground">{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
