import { ATTACK_COLORS } from '../../data/models';
import type { DetectorStats } from './types';

const fmtUptime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${Math.floor(s % 60)}s`;
};

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className="font-mono text-xl" style={{ color: accent ?? 'var(--foreground)' }}>
        {value}
      </p>
    </div>
  );
}

export default function StatCards({ stats }: { stats: DetectorStats | null }) {
  const families = Object.entries(stats?.by_family ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const familyTotal = families.reduce((acc, [, n]) => acc + n, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card label="Flows analysed" value={stats ? String(stats.flows_total) : '—'} />
        <Card
          label="Malicious"
          value={stats ? String(stats.malicious) : '—'}
          accent={stats && stats.malicious > 0 ? '#DC4C4C' : undefined}
        />
        <Card label="Packets dropped" value={stats ? String(stats.dropped) : '—'} />
        <Card
          label="Banned IPs"
          value={stats ? String(stats.banned_count) : '—'}
          accent={stats && stats.banned_count > 0 ? '#DC4C4C' : undefined}
        />
        <Card label="Detector uptime" value={stats ? fmtUptime(stats.uptime_s) : '—'} />
      </div>

      {familyTotal > 0 && (
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
                  backgroundColor: ATTACK_COLORS[family] ?? '#6B6E7A',
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
                  style={{ backgroundColor: ATTACK_COLORS[family] ?? '#6B6E7A' }}
                />
                {family}
                <span className="font-mono text-muted-foreground">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
