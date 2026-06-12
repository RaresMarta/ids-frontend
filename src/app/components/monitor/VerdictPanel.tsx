import { motion } from 'motion/react';
import { ATTACK_CLASSES, ATTACK_COLORS } from '../../data/models';
import type { FlowEvent } from './types';

const LOW_FAMILY_CONFIDENCE = 0.6;

export default function VerdictPanel({ flow }: { flow: FlowEvent | null }) {
  if (!flow) {
    return (
      <div className="bg-card border border-border rounded-md p-5 flex flex-col">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Verdict
        </p>
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <p className="text-xs text-muted-foreground">Waiting for flows…</p>
        </div>
      </div>
    );
  }

  const isBlock = flow.gate === 'block';
  const lowFamily = flow.confidence < LOW_FAMILY_CONFIDENCE;
  const familyColor = ATTACK_COLORS[flow.family] ?? '#6B6E7A';
  // Stacked bar in canonical class order; tiny slivers are kept (they sum to 1).
  const segments = ATTACK_CLASSES.map((cls) => ({
    cls,
    p: flow.probabilities?.[cls] ?? 0,
  }));
  const legend = segments.filter((s) => s.p >= 0.03).sort((a, b) => b.p - a.p);
  const topFeatures = (flow.top_features ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);
  const maxContribution = Math.max(...topFeatures.map((f) => Math.abs(f.contribution)), 1e-9);

  return (
    <div className="bg-card border border-border rounded-md p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verdict</p>
        <span className="font-mono text-xs text-muted-foreground">
          {flow.src} → {flow.dst} · {flow.n_packets} pkts
        </span>
      </div>

      {/* Gate verdict — the reliable signal in both live and simulate mode */}
      <div className="flex items-baseline justify-between">
        <span
          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-medium ${
            isBlock ? 'bg-[#DC4C4C]/10 text-[#DC4C4C]' : 'bg-[#4ADE80]/10 text-[#4ADE80]'
          }`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isBlock ? '#DC4C4C' : '#4ADE80' }}
          />
          {isBlock ? 'Attack — blocked' : 'Benign — allowed'}
        </span>
        <span className="font-mono text-lg text-foreground">
          {(flow.gate_confidence * 100).toFixed(1)}
          <span className="text-xs text-muted-foreground">% gate</span>
        </span>
      </div>

      {/* 8-class probabilities, temperature-calibrated server-side */}
      <div style={lowFamily ? { filter: 'saturate(0.45)', opacity: 0.75 } : undefined}>
        <div className="flex h-3 rounded-sm overflow-hidden bg-muted">
          {segments.map(({ cls, p }) => (
            <motion.div
              key={cls}
              animate={{ width: `${p * 100}%` }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              style={{ backgroundColor: ATTACK_COLORS[cls] ?? '#6B6E7A' }}
              title={`${cls} ${(p * 100).toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {legend.map(({ cls, p }) => (
            <span key={cls} className="inline-flex items-center gap-1.5 text-[11px] text-foreground/70">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: ATTACK_COLORS[cls] ?? '#6B6E7A' }}
              />
              {cls}
              <span className="font-mono text-muted-foreground">{(p * 100).toFixed(0)}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* family is secondary — unreliable in live mode (domain shift) */}
      <div
        className="flex items-center justify-between pt-3 border-t border-border"
        style={lowFamily ? { filter: 'saturate(0.45)', opacity: 0.75 } : undefined}
      >
        <span className="text-xs text-muted-foreground">Suspected family</span>
        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: familyColor }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: familyColor }} />
          {flow.family}
          <span className="font-mono text-muted-foreground">
            {(flow.confidence * 100).toFixed(0)}%{lowFamily ? ' · low confidence' : ''}
          </span>
        </span>
      </div>

      {topFeatures.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">Top contributing features</p>
          {topFeatures.map((f) => (
            <div key={f.feature} className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-foreground/70 w-40 truncate shrink-0">
                {f.feature}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-sm overflow-hidden">
                <motion.div
                  className="h-full rounded-sm"
                  style={{ backgroundColor: f.contribution >= 0 ? '#D97941' : '#5B9BD5' }}
                  animate={{ width: `${(Math.abs(f.contribution) / maxContribution) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground w-12 text-right shrink-0">
                {f.contribution.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
