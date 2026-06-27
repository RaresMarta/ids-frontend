import { useMemo } from 'react';
import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AggPoint } from './types';

const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
const round1 = (n: number) => Math.round(n * 10) / 10;

interface RatePoint {
  t: number;
  flows: number; // flows/sec over the interval
  malicious: number; // malicious/sec over the interval
  pct: number; // malicious share of the interval (%)
}

function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as RatePoint;
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-mono text-muted-foreground">{fmtTime(label)}</p>
      <p className="text-foreground">{round1(p.flows)} flows/s</p>
      <p style={{ color: 'var(--threat)' }}>
        {round1(p.malicious)} malicious/s · {round1(p.pct)}%
      </p>
    </div>
  );
}

/**
 * Traffic *rate* over time, derived from the persisted cumulative snapshots: each point is
 * the per-second delta between consecutive snapshots, so bursts show as spikes instead of a
 * meaningless ever-rising total. Cumulative resets (worker restart) clamp to zero.
 */
export default function AggregationChart({ data }: { data: AggPoint[] }) {
  const rates = useMemo<RatePoint[]>(() => {
    const out: RatePoint[] = [];
    for (let i = 1; i < data.length; i++) {
      const dt = (data[i].t - data[i - 1].t) / 1000;
      if (dt <= 0) continue;
      const df = Math.max(0, data[i].flows_total - data[i - 1].flows_total);
      const dm = Math.max(0, data[i].malicious - data[i - 1].malicious);
      out.push({ t: data[i].t, flows: df / dt, malicious: dm / dt, pct: df > 0 ? (dm / df) * 100 : 0 });
    }
    return out;
  }, [data]);

  const peak = useMemo(() => rates.reduce((m, r) => Math.max(m, r.flows), 0), [rates]);

  return (
    <div className="bg-card border border-border rounded-md p-5 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Traffic rate over time</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {peak > 0 && <span className="font-mono text-[10px] text-muted-foreground/60">peak {round1(peak)}/s</span>}
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} />
            flows/s
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--threat)' }} />
            malicious/s
          </span>
        </div>
      </div>

      {rates.length < 2 ? (
        <div className="h-[180px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Accumulating history…</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={rates} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={fmtTime}
              stroke="var(--border)"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
            />
            <YAxis
              width={40}
              stroke="var(--border)"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              tickFormatter={(v) => `${round1(v)}`}
            />
            <Area type="monotone" dataKey="flows" stroke="var(--primary)" strokeWidth={1.5} fill="color-mix(in srgb, var(--primary) 14%, transparent)" isAnimationActive={false} />
            <Area type="monotone" dataKey="malicious" stroke="var(--threat)" strokeWidth={1.5} fill="color-mix(in srgb, var(--threat) 22%, transparent)" isAnimationActive={false} />
            <Tooltip content={<RateTooltip />} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
