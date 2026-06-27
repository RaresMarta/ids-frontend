import StreamMonitor from '../components/monitor/StreamMonitor';
import { useEventStream } from '../components/monitor/useEventStream';
import { useSupabaseMonitor } from '../components/monitor/useSupabaseMonitor';
import { useMonitors, monitorLabel, type Monitor } from '../../hooks/useMonitors';

const DETECTOR_URL: string = import.meta.env.VITE_DETECTOR_URL ?? 'http://localhost:7870';

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

/** The registered droplet sensor over the Supabase backplane, identified by its victim IP. */
function SupabaseContainer({ monitor }: { monitor: Monitor }) {
  const label = monitorLabel(monitor);
  const feed = useSupabaseMonitor(monitor.id, monitor.name);
  return (
    <StreamMonitor
      feed={feed}
      subtitle={
        <>
          Monitoring <span className="font-mono text-foreground">{label}</span>
          {monitor.name && monitor.name !== label && <span className="text-muted-foreground"> · {monitor.name}</span>}
        </>
      }
    />
  );
}

export default function LiveMonitorPage() {
  const { monitors } = useMonitors();
  // Single-customer: show the one registered sensor (the droplet's victim). No picker.
  const monitor = monitors[0] ?? null;

  return monitor ? <SupabaseContainer monitor={monitor} /> : <SseContainer />;
}
