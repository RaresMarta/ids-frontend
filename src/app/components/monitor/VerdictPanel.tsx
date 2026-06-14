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
  const familyColor = ATTACK_COLORS[flow.family] ?? 'var(--muted-foreground)';
  // Stacked bar in canonical class order; tiny slivers are kept (they sum to 1).
  const segments = ATTACK_CLASSES.map((cls) => ({
    cls,
    p: flow.probabilities?.[cls] ?? 0,
  }));
  const legend = segments.filter((s) => s.p >= 0.03).sort((a, b) => b.p - a.p);

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
            isBlock ? 'bg-threat/10 text-threat' : 'bg-safe/10 text-safe'
          }`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isBlock ? 'var(--threat)' : 'var(--safe)' }}
          />
          {isBlock ? 'Attack — flagged' : 'Benign — clear'}
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
              style={{ backgroundColor: ATTACK_COLORS[cls] ?? 'var(--muted-foreground)' }}
              title={`${cls} ${(p * 100).toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {legend.map(({ cls, p }) => (
            <span key={cls} className="inline-flex items-center gap-1.5 text-[11px] text-foreground/70">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: ATTACK_COLORS[cls] ?? 'var(--muted-foreground)' }}
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
    </div>
  );
}
