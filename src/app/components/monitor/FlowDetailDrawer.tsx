import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ATTACK_COLORS } from '../../data/models';
import type { FlowEvent } from './types';

const fmtClock = (ts: number) =>
  new Date(ts > 1e12 ? ts : ts * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/** Class colour: families from the palette; the 2-class labels map to safe/threat. */
function classColor(label: string): string {
  if (label === 'Benign') return 'var(--safe)';
  if (label === 'Attack') return 'var(--threat)';
  return ATTACK_COLORS[label] ?? 'var(--muted-foreground)';
}

interface Props {
  flow: FlowEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Per-flow detail: gate verdict, class probabilities, and the saliency attribution. */
export default function FlowDetailDrawer({ flow, open, onOpenChange }: Props) {
  const blocked = flow?.gate === 'block';
  const probs = flow
    ? Object.entries(flow.probabilities ?? {})
        .filter(([, p]) => p > 0)
        .sort((a, b) => b[1] - a[1])
    : [];
  const features = flow?.top_features ?? [];

  // Per-window latency spans from the detector. inference_ms is the pure model
  // call; detect_ms is the total from dequeue to publish.
  const timing = flow?.timing ?? {};
  const TIMING_LABELS: [string, string][] = [
    ['queue_wait_ms', 'Queue wait'],
    ['preprocess_ms', 'Preprocess'],
    ['inference_ms', 'Inference'],
    ['detect_ms', 'Detect total'],
  ];
  const timingRows = TIMING_LABELS.filter(([k]) => timing[k] != null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Flow detail</SheetTitle>
        </SheetHeader>

        {flow && (
          <div className="px-4 pb-8 space-y-6">
            {/* verdict */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-medium ${
                  blocked ? 'bg-threat/10 text-threat' : 'bg-safe/10 text-safe'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: blocked ? 'var(--threat)' : 'var(--safe)' }} />
                {blocked ? 'Attack — flagged' : 'Benign — clear'}
              </span>
              <span className="font-mono text-lg text-foreground">
                {(flow.gate_confidence * 100).toFixed(1)}
                <span className="text-xs text-muted-foreground">% gate</span>
              </span>
            </div>

            {/* metadata */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-mono text-foreground text-right">{flow.src}</dd>
              <dt className="text-muted-foreground">Destination</dt>
              <dd className="font-mono text-foreground text-right">{flow.dst}</dd>
              <dt className="text-muted-foreground">Packets</dt>
              <dd className="font-mono text-foreground text-right">{flow.n_packets}</dd>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-mono text-foreground text-right">{fmtClock(flow.ts)}</dd>
              <dt className="text-muted-foreground">Flow ID</dt>
              <dd className="font-mono text-muted-foreground text-right">{flow.flow_id}</dd>
            </dl>

            {/* latency — server-side per-window timing */}
            {timingRows.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Latency</p>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-xs">
                  {timingRows.map(([k, label]) => (
                    <div key={k} className="contents">
                      <dt className={k === 'inference_ms' ? 'text-foreground' : 'text-muted-foreground'}>{label}</dt>
                      <dd className="font-mono text-right tabular-nums text-foreground">{timing[k].toFixed(3)} ms</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  Inference is the pure model call; the rest is queueing and feature handling.
                </p>
              </div>
            )}

            {/* class probabilities */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Class probabilities</p>
              <div className="space-y-1.5">
                {probs.map(([cls, p]) => (
                  <div key={cls} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] text-foreground/80">{cls}</span>
                    <div className="flex-1 h-2 rounded-sm bg-muted overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${p * 100}%`, backgroundColor: classColor(cls) }} />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                      {(p * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* feature attribution */}
            {features.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Top features</p>
                <div className="space-y-1.5">
                  {features.slice(0, 8).map((f) => (
                    <div key={f.feature} className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 text-foreground/80">
                        {f.direction && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: f.direction === 'attack' ? 'var(--threat)' : 'var(--safe)' }}
                          />
                        )}
                        {f.feature}
                      </span>
                      <span className="font-mono text-muted-foreground tabular-nums">{f.contribution.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
