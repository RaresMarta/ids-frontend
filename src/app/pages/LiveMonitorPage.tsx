import { useEffect, useState } from 'react';
import StreamMonitor from '../components/monitor/StreamMonitor';
import { useEventStream } from '../components/monitor/useEventStream';
import { useSupabaseMonitor } from '../components/monitor/useSupabaseMonitor';
import { useMonitors, monitorLabel, type Monitor } from '../../hooks/useMonitors';
import { DETECTOR_URL } from '../../lib/classifiers';

/** Local detector over SSE — dev fallback when no monitor has registered in Supabase yet. */
function SseContainer() {
  const feed = useEventStream(DETECTOR_URL);
  return (
    <StreamMonitor
      feed={feed}
      subtitle={
        <>
          Local detector · <span className="font-mono">{DETECTOR_URL}</span>
        </>
      }
    />
  );
}

/** Dropdown to choose which registered sensor to watch. Hidden until ≥2 monitors exist. */
function MonitorPicker({
  monitors,
  selectedId,
  onSelect,
}: {
  monitors: Monitor[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (monitors.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="uppercase tracking-wider">Monitor</span>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="bg-background border border-border rounded-md px-2 py-1 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {monitors.map((m) => (
          <option key={m.id} value={m.id}>
            {monitorLabel(m)}
            {m.status && m.status !== 'online' ? ` (${m.status})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The registered droplet sensor over the Supabase backplane, identified by its victim IP. */
function SupabaseContainer({
  monitor,
  picker,
}: {
  monitor: Monitor;
  picker?: React.ReactNode;
}) {
  const label = monitorLabel(monitor);
  const feed = useSupabaseMonitor(monitor.id);
  return (
    <StreamMonitor
      feed={feed}
      picker={picker}
      subtitle={
        <>
          Monitoring <span className="font-mono text-foreground">{label}</span>
        </>
      }
    />
  );
}

export default function LiveMonitorPage() {
  const { monitors } = useMonitors();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to the most-recently-seen sensor (monitors[0]); keep the selection valid
  // as the registry changes (a row deregisters, a new worker registers, etc.).
  useEffect(() => {
    if (!monitors.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((cur) =>
      cur && monitors.some((m) => m.id === cur) ? cur : monitors[0].id,
    );
  }, [monitors]);

  const monitor = monitors.find((m) => m.id === selectedId) ?? null;

  if (!monitor) return <SseContainer />;

  return (
    <SupabaseContainer
      monitor={monitor}
      picker={
        <MonitorPicker monitors={monitors} selectedId={monitor.id} onSelect={setSelectedId} />
      }
    />
  );
}
