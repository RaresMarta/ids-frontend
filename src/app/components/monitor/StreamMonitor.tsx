import { useState, type ReactNode } from 'react';
import Sidebar from '../Sidebar';
import FlowDetailDrawer from './FlowDetailDrawer';
import StreamTable from './StreamTable';
import { type ConnectionState, useEventStream } from './useEventStream';
import type { FlowEvent } from './types';

/** Both transports (SSE and Supabase) return this exact shape. */
export type MonitorFeed = ReturnType<typeof useEventStream>;

const CONNECTION_LABEL: Record<ConnectionState, { label: string; color: string }> = {
  connecting: { label: 'connecting', color: 'var(--muted-foreground)' },
  open: { label: 'live', color: 'var(--safe)' },
  reconnecting: { label: 'reconnecting', color: 'var(--warn)' },
};

interface Props {
  feed: MonitorFeed;
  subtitle: ReactNode;
  picker?: ReactNode;
}

/** Minimal streaming monitor: customer picker · aggregation chart · live flow stream · detail drawer. */
export default function StreamMonitor({ feed, subtitle, picker }: Props) {
  const { events, stats, connection } = feed;
  const [selected, setSelected] = useState<FlowEvent | null>(null);

  const conn = CONNECTION_LABEL[connection];
  const total = stats?.flows_total ?? 0;
  const malicious = stats?.malicious ?? 0;
  const rate = total > 0 ? (malicious / total) * 100 : 0;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar active="monitor" />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="px-8 py-5 border-b border-border shrink-0 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg text-foreground">Live Monitor</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            {picker}
            <div className="hidden md:flex items-center gap-4 font-mono text-xs">
              <span className="text-muted-foreground">
                <span className="text-foreground tabular-nums">{total.toLocaleString()}</span> flows
              </span>
              <span style={{ color: malicious > 0 ? 'var(--threat)' : 'var(--muted-foreground)' }}>
                <span className="tabular-nums">{malicious.toLocaleString()}</span> malicious
                <span className="text-muted-foreground/60"> ({rate.toFixed(1)}%)</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs shrink-0" style={{ color: conn.color }}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${connection === 'open' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: conn.color }}
              />
              {conn.label}
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col gap-4 p-6">
          <StreamTable items={events} onSelect={setSelected} selectedId={selected?.flow_id ?? null} />
        </div>
      </main>

      <FlowDetailDrawer flow={selected} open={selected !== null} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
