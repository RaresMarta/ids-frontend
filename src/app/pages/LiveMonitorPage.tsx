import { useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import AttackSignature, { type SignatureKind } from '../components/monitor/AttackSignature';
import DemoControls from '../components/monitor/DemoControls';
import EventFeed from '../components/monitor/EventFeed';
import StatCards from '../components/monitor/StatCards';
import TrafficTimeline from '../components/monitor/TrafficTimeline';
import VerdictPanel from '../components/monitor/VerdictPanel';
import { useEventStream, type ConnectionState } from '../components/monitor/useEventStream';
import { FAMILY_CONFIDENCE_FLOOR, RICH_SIGNATURE_FAMILIES } from '../components/monitor/types';

const DETECTOR_URL: string = import.meta.env.VITE_DETECTOR_URL ?? 'http://localhost:7870';

const CONNECTION_LABEL: Record<ConnectionState, { label: string; color: string }> = {
  connecting: { label: 'connecting', color: '#6B6E7A' },
  open: { label: 'live', color: '#4ADE80' },
  reconnecting: { label: 'reconnecting', color: '#FBBF24' },
};

const MODE_COLOR: Record<string, string> = {
  live: '#4ADE80',
  replay: '#5B9BD5',
  simulate: '#FBBF24',
};

export default function LiveMonitorPage() {
  const {
    events,
    latestFlow,
    latestBlocked,
    rateSeries,
    markers,
    activeAttackers,
    stats,
    health,
    connection,
    inject,
  } = useEventStream(DETECTOR_URL);

  const underAttack = activeAttackers.length > 0;
  const currentAttacker = underAttack
    ? activeAttackers.reduce((a, b) => (b.since > a.since ? b : a))
    : null;

  // Per-type signature only when the family is one of the rich four AND its
  // confidence is high (true in simulate mode). Live mode degrades to the
  // generic pulse — the 8-class head mislabels real tool traffic ("Spoofing"),
  // only the 2-class gate is trusted there.
  const signature: SignatureKind | null = useMemo(() => {
    if (!currentAttacker) return null;
    if (!RICH_SIGNATURE_FAMILIES.has(currentAttacker.family)) return 'generic';
    return currentAttacker.confidence >= FAMILY_CONFIDENCE_FLOOR
      ? (currentAttacker.family as SignatureKind)
      : 'generic';
  }, [currentAttacker]);

  // Blocked-flow rate drives signature animation speed.
  const intensity = Math.min(1, (rateSeries[rateSeries.length - 1]?.blocked ?? 0) / 20);

  // During an attack the verdict panel shows the latest blocked flow.
  const verdictFlow = underAttack && latestBlocked ? latestBlocked : latestFlow;

  const conn = CONNECTION_LABEL[connection];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar active="monitor" />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="px-8 py-5 border-b border-border shrink-0 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-foreground">Live Monitor</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time detection feed · <span className="font-mono">{DETECTOR_URL}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {health && (
              <>
                <span className="font-mono text-xs text-muted-foreground">{health.model}</span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border"
                  style={{
                    color: MODE_COLOR[health.mode] ?? '#6B6E7A',
                    borderColor: `${MODE_COLOR[health.mode] ?? '#6B6E7A'}40`,
                  }}
                >
                  {health.mode}
                </span>
              </>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: conn.color }}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${connection === 'open' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: conn.color }}
              />
              {conn.label}
            </span>
          </div>
        </header>

        {/* threat status strip — red strictly for genuine threat */}
        <div
          className={`px-8 py-2 border-b shrink-0 text-xs transition-colors duration-500 ${
            underAttack
              ? 'border-[#DC4C4C]/30 bg-[#DC4C4C]/10 text-[#DC4C4C]'
              : 'border-border bg-card/40 text-muted-foreground'
          }`}
        >
          {underAttack ? (
            <span>
              Threat detected — {activeAttackers.length} active source
              {activeAttackers.length > 1 ? 's' : ''}:{' '}
              <span className="font-mono">{activeAttackers.map((a) => a.ip).join(', ')}</span>
            </span>
          ) : (
            <span>All clear — no active threats</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-4">
            <StatCards stats={stats} />

            <TrafficTimeline rateSeries={rateSeries} markers={markers} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <AttackSignature signature={signature} attacker={currentAttacker} intensity={intensity} />
              <VerdictPanel flow={verdictFlow} />
            </div>

            <EventFeed items={events} />

            {health?.mode === 'simulate' && <DemoControls baseUrl={DETECTOR_URL} inject={inject} />}
          </div>
        </div>
      </main>
    </div>
  );
}
