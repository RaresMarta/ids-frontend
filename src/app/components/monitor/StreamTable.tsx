import { AnimatePresence, motion } from 'motion/react';
import type { FeedItem, FlowEvent } from './types';

const MAX_ROWS = 120;
const COLS = 'grid grid-cols-[5.5rem_minmax(0,1fr)_7rem_5rem_3.5rem] gap-3';

const fmtClock = (ts: number) =>
  new Date(ts > 1e12 ? ts : ts * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

interface Props {
  items: FeedItem[];
  onSelect: (flow: FlowEvent) => void;
  selectedId?: string | number | null;
}

/** The live, ever-scrolling flow stream. Newest on top, bounded buffer, click a row for detail. */
export default function StreamTable({ items, onSelect, selectedId }: Props) {
  const flows = items.filter((i) => i.evt.type === 'flow').slice(0, MAX_ROWS) as {
    seq: number;
    evt: FlowEvent;
  }[];

  return (
    <div className="bg-card border border-border rounded-md flex flex-col min-h-0 flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Flow stream</p>
        <span className="font-mono text-[10px] text-muted-foreground/60">{flows.length} live</span>
      </div>

      {/* column header */}
      <div className={`${COLS} px-4 py-2 border-b border-border shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70`}>
        <span>Time</span>
        <span>Source → Destination</span>
        <span>Verdict</span>
        <span className="text-right">Conf</span>
        <span className="text-right">Pkts</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {flows.length === 0 ? (
          <div className="h-full flex items-center justify-center py-16">
            <p className="text-xs text-muted-foreground">Waiting for flows…</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {flows.map(({ seq, evt }) => {
              const blocked = evt.gate === 'block';
              const selected = selectedId != null && evt.flow_id === selectedId;
              return (
                <motion.button
                  key={seq}
                  type="button"
                  onClick={() => onSelect(evt)}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`${COLS} w-full items-center px-4 py-2 text-left border-b border-border/50 transition-colors hover:bg-muted/50 ${
                    selected ? 'bg-muted' : ''
                  } ${blocked ? 'bg-threat/[0.04]' : ''}`}
                >
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{fmtClock(evt.ts)}</span>
                  <span className="font-mono text-xs text-foreground/80 truncate">
                    {evt.src} <span className="text-muted-foreground/50">→</span> {evt.dst}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                      blocked ? 'text-threat' : 'text-safe'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: blocked ? 'var(--threat)' : 'var(--safe)' }}
                    />
                    {blocked ? 'Attack' : 'Benign'}
                  </span>
                  <span className="font-mono text-[11px] text-foreground/70 text-right tabular-nums">
                    {(evt.gate_confidence * 100).toFixed(0)}%
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground text-right tabular-nums">
                    {evt.n_packets}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
