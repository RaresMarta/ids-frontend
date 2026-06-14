import { useMemo } from 'react';
import {
  Area,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ATTACK_COLORS } from '../../data/models';
import type { RatePoint, TimelineMarker } from './types';

interface BreachRegion {
  from: number;
  to: number;
  ip: string;
  family?: string;
  open: boolean; // still under attack (no `recovered` yet)
}

/** Pair alert/recovered markers per attacker IP into shaded breach regions. */
function breachRegions(markers: TimelineMarker[], now: number): BreachRegion[] {
  const open: Record<string, TimelineMarker> = {};
  const regions: BreachRegion[] = [];
  for (const m of [...markers].sort((a, b) => a.ts - b.ts)) {
    if (m.kind === 'alert') {
      if (!open[m.ip]) open[m.ip] = m;
    } else {
      const o = open[m.ip];
      if (o) {
        regions.push({ from: o.ts, to: m.ts, ip: m.ip, family: o.family, open: false });
        delete open[m.ip];
      }
    }
  }
  for (const o of Object.values(open)) {
    regions.push({ from: o.ts, to: now, ip: o.ip, family: o.family, open: true });
  }
  return regions;
}

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });

function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as RatePoint;
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-mono text-muted-foreground">{fmtTime(label)}</p>
      <p className="text-foreground">{p.flows} flows/s</p>
      {p.blocked > 0 && <p style={{ color: 'var(--threat)' }}>{p.blocked} flagged/s</p>}
    </div>
  );
}

export default function TrafficTimeline({
  rateSeries,
  markers,
}: {
  rateSeries: RatePoint[];
  markers: TimelineMarker[];
}) {
  const now = rateSeries.length ? rateSeries[rateSeries.length - 1].t : Date.now();
  const windowStart = rateSeries.length ? rateSeries[0].t : now - 120_000;

  // "Normal" envelope from calm (no-block) seconds: ~90th percentile with headroom.
  const envelope = useMemo(() => {
    const calm = rateSeries
      .filter((p) => p.blocked === 0)
      .map((p) => p.flows)
      .sort((a, b) => a - b);
    if (!calm.length) return 2;
    return Math.max(2, Math.ceil(calm[Math.floor(calm.length * 0.9)] * 1.5));
  }, [rateSeries]);

  const regions = useMemo(
    () =>
      breachRegions(markers, now)
        .filter((r) => r.to >= windowStart)
        .map((r) => ({ ...r, from: Math.max(r.from, windowStart) })),
    [markers, now, windowStart],
  );

  const visibleMarkers = markers.filter((m) => m.ts >= windowStart && m.ts <= now);

  return (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Traffic rate
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} />
            flows/s
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--threat)' }} />
            flagged/s
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-foreground/10 border border-foreground/20" />
            normal envelope
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={rateSeries} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="t"
            type="number"
            domain={[windowStart, now]}
            tickFormatter={fmtTime}
            stroke="var(--border)"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            stroke="var(--border)"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
          />

          {/* normal envelope */}
          <ReferenceArea y1={0} y2={envelope} fill="var(--foreground)" fillOpacity={0.04} ifOverflow="extendDomain" />
          <ReferenceLine
            y={envelope}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: 'normal', position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 10 }}
          />

          {/* breach shading: alert → recovered (or now) */}
          {regions.map((r) => (
            <ReferenceArea
              key={`${r.ip}-${r.from}`}
              x1={r.from}
              x2={r.to}
              fill="var(--threat)"
              fillOpacity={r.open ? 0.08 : 0.05}
              ifOverflow="hidden"
            />
          ))}

          {visibleMarkers.map((m) => (
            <ReferenceLine
              key={`${m.kind}-${m.ip}-${m.ts}`}
              x={m.ts}
              stroke={m.kind === 'alert' ? 'var(--threat)' : 'var(--safe)'}
              strokeDasharray="3 3"
              label={{
                value: m.kind === 'alert' ? (m.family ?? 'attack') : 'recovered',
                position: 'insideTop',
                fill: m.kind === 'alert' ? (ATTACK_COLORS[m.family ?? ''] ?? 'var(--threat)') : 'var(--safe)',
                fontSize: 10,
              }}
            />
          ))}

          <Area
            type="monotone"
            dataKey="flows"
            stroke="var(--primary)"
            strokeWidth={1.5}
            fill="rgba(217,121,65,0.14)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="blocked"
            stroke="var(--threat)"
            strokeWidth={1.5}
            fill="rgba(220,76,76,0.22)"
            isAnimationActive={false}
          />
          <Tooltip content={<RateTooltip />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
